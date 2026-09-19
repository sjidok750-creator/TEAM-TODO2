// Google 캘린더 자동 동기화
//
// 동작 방식
//  - 최초 1회만 Google 동의 창이 뜬다 (브라우저가 권한을 받는 건 원리상 생략 불가)
//  - 그 뒤로는 앱을 열 때마다 조용히(prompt:'') 토큰을 재발급받아 버튼 없이 자동 동기화
//  - VITE_GOOGLE_CLIENT_ID 가 없으면 이 모듈은 아무것도 하지 않는다
//
// 중복 방지
//  - 이벤트 ID 를 (투두ID + 날짜) 로부터 결정적으로 만든다 → 같은 투두는 항상 같은 ID
//    두 기기에서 동시에 올려도 두 번째는 409 를 받고 PATCH 로 흘러간다. 중복이 생길 수 없다
//  - Firestore 에는 아무것도 쓰지 않는다 (동기화 상태를 앱 데이터에 남기지 않음)

import { extractTodoDates, summarizeTodoText, nextLocalISODate, toLocalISODate } from './todoDates'

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3'
const APP_TAG = 'team-todo2'
const GRANTED_KEY = 'team-todo-gcal-granted'

// 동기화 대상 기간: 지난달 ~ 6개월 뒤. 재조정(삭제 판단)도 이 창 안에서만 한다.
const WINDOW_BACK_DAYS = 31
const WINDOW_FWD_DAYS = 186

export function isConfigured() {
  return CLIENT_ID.length > 0
}

// 한 번이라도 동의한 적이 있는지 (조용한 재발급을 시도해도 되는지 판단용)
export function hasGranted() {
  try { return localStorage.getItem(GRANTED_KEY) === '1' } catch { return false }
}
function markGranted() {
  try { localStorage.setItem(GRANTED_KEY, '1') } catch { /* 사파리 프라이빗 모드 등 */ }
}

let gisPromise = null
function loadGis() {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google)
    const s = document.createElement('script')
    // base 경로와 무관하게 절대 URL 이어야 한다
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve(window.google)
    s.onerror = () => reject(new Error('GIS 스크립트 로드 실패'))
    document.head.appendChild(s)
  })
  return gisPromise
}

let tokenClient = null
let accessToken = null
let tokenExpiresAt = 0

// silent=true 면 동의 창을 띄우지 않는다. 실패하면 null 을 돌려준다.
async function getToken({ silent }) {
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) return accessToken
  const google = await loadGis()

  return new Promise((resolve) => {
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: () => {},
      })
    }
    tokenClient.callback = (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token
        tokenExpiresAt = Date.now() + (resp.expires_in ?? 3600) * 1000
        markGranted()
        resolve(accessToken)
      } else {
        resolve(null)
      }
    }
    tokenClient.error_callback = () => resolve(null)
    try {
      tokenClient.requestAccessToken({ prompt: silent ? '' : 'consent' })
    } catch {
      resolve(null)
    }
  })
}

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

// Google 이벤트 ID 규칙: base32hex(a-v, 0-9) 5~1024자. hex 는 부분집합이라 항상 유효하다.
// (투두ID, 날짜) 조합 → 한 투두에 날짜가 여러 개여도 각각 독립된 이벤트가 된다.
function eventIdFor(todoId, ymd) {
  const raw = `${todoId}@${ymd}`
  let out = 'tt'
  for (let i = 0; i < raw.length; i++) {
    out += raw.charCodeAt(i).toString(16).padStart(4, '0')
  }
  return out
}

function buildEvent(todo, ymd, projectName) {
  const summary = summarizeTodoText(todo.text, 40)
  const lines = [projectName || '', todo.author ? `작성: ${todo.author}` : '', todo.text]
  return {
    summary: todo.done ? `✓ ${summary}` : summary,
    description: lines.filter(Boolean).join('\n'),
    start: { date: ymd },
    end: { date: nextLocalISODate(ymd) }, // end.date 는 배타적 — 하루 일정이면 +1일
    transparency: 'transparent',
    extendedProperties: { private: { app: APP_TAG, todoId: todo.id, ymd } },
  }
}

function windowRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WINDOW_BACK_DAYS)
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + WINDOW_FWD_DAYS)
  return {
    fromYmd: toLocalISODate(from.getFullYear(), from.getMonth() + 1, from.getDate()),
    toYmd: toLocalISODate(to.getFullYear(), to.getMonth() + 1, to.getDate()),
    timeMin: from.toISOString(), // events.list 는 RFC3339 datetime 을 요구 — 여기선 toISOString 이 맞다
    timeMax: to.toISOString(),
  }
}

async function listAppEvents(token, { timeMin, timeMax }) {
  const out = new Map()
  let pageToken = ''
  do {
    const url = new URL(`${API}/calendars/primary/events`)
    url.searchParams.set('privateExtendedProperty', `app=${APP_TAG}`)
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('showDeleted', 'false')
    url.searchParams.set('maxResults', '2500')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const r = await fetch(url, { headers: authHeaders(token) })
    if (!r.ok) throw new Error(`이벤트 조회 실패 (${r.status})`)
    const j = await r.json()
    for (const e of j.items || []) out.set(e.id, e)
    pageToken = j.nextPageToken || ''
  } while (pageToken)
  return out
}

async function upsert(token, id, body) {
  let r = await fetch(`${API}/calendars/primary/events`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id, ...body }),
  })
  if (r.status === 409) {
    // 이미 존재 → 내용만 맞춘다. status 는 절대 보내지 않는다:
    // 사용자가 캘린더에서 직접 지운 일정을 되살리지 않기 위해서.
    r = await fetch(`${API}/calendars/primary/events/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    })
    if (r.status === 404 || r.status === 410) return 'gone'
    return r.ok ? 'updated' : 'error'
  }
  return r.ok ? 'created' : 'error'
}

async function remove(token, id) {
  const r = await fetch(`${API}/calendars/primary/events/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  return r.ok || r.status === 404 || r.status === 410
}

// 동시 요청 수 제한 (Calendar API 분당 쿼터 보호)
async function pooled(items, worker, size = 5) {
  const queue = [...items]
  const runners = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift())
  })
  await Promise.all(runners)
}

/**
 * 날짜가 적힌 투두를 Google 캘린더에 맞춘다.
 * 추가·수정·날짜변경·삭제가 모두 이 한 번의 재조정으로 처리된다.
 * silent=true 면 동의 창을 띄우지 않고, 조용히 안 되면 그냥 포기한다.
 */
export async function syncCalendar(todos, projects, { silent = true } = {}) {
  if (!isConfigured()) return { ok: false, reason: 'not-configured' }
  if (silent && !hasGranted()) return { ok: false, reason: 'not-connected' }

  const token = await getToken({ silent })
  if (!token) return { ok: false, reason: silent ? 'not-connected' : 'denied' }

  const range = windowRange()
  const projectById = new Map(projects.map((p) => [p.id, p]))

  // 있어야 할 이벤트
  const desired = new Map()
  for (const t of todos) {
    const project = projectById.get(t.projectId)
    for (const d of extractTodoDates(t, project)) {
      if (d.ymd < range.fromYmd || d.ymd > range.toYmd) continue
      desired.set(eventIdFor(t.id, d.ymd), buildEvent(t, d.ymd, project?.name))
    }
  }

  const actual = await listAppEvents(token, range)

  let created = 0, updated = 0, deleted = 0, failed = 0
  await pooled([...desired.entries()], async ([id, body]) => {
    const res = await upsert(token, id, body)
    if (res === 'created') created++
    else if (res === 'updated') updated++
    else if (res === 'error') failed++
  })

  const stale = [...actual.keys()].filter((id) => !desired.has(id))
  await pooled(stale, async (id) => {
    if (await remove(token, id)) deleted++
    else failed++
  })

  return { ok: true, created, updated, deleted, failed, total: desired.size }
}

// 최초 1회 연결 (동의 창을 띄운다). 이후에는 syncCalendar 가 알아서 조용히 처리한다.
export async function connectCalendar() {
  if (!isConfigured()) return false
  const token = await getToken({ silent: false })
  return !!token
}

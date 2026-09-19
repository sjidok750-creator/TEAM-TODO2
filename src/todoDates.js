// 투두 텍스트 속 날짜 인식 유틸
//
// 하도급신고현황(SubcontractText)과 달력은 서로 다른 정규식을 쓴다:
//  - DATE_RE     : 기존 하도신고용. 점만 찍은 "4.2" 도 날짜로 본다 (동작 유지)
//  - CAL_DATE_RE : 달력/캘린더용. 점 형식은 괄호로 감싼 "(4.2)" 만 허용한다
//                  → "폭 1.5m", "단가 3.5배" 가 1월 5일 / 3월 5일로 오탐되는 것을 막는다

// 기존 하도신고용 (동작 변경 없음)
export const DATE_RE = /([(\[（【]?\d{1,2}[./]\d{1,2}[)\]）】]?|[(\[（【]?\d{1,2}월\s*\d{1,2}일?[)\]）】]?)/g

// 달력용: 괄호형 M.D / M/D / M월D일 만 허용. 벌거벗은 M.D 는 제외.
// lookbehind 미사용 — iOS Safari 16.4 미만 호환. 날짜 토큰은 match[2] 에 들어온다.
export const CAL_DATE_RE =
  /(^|[^\d./])([(\[（【]\s*\d{1,2}\s*[./]\s*\d{1,2}\s*[)\]）】]|\d{1,2}\/\d{1,2}|\d{1,2}월\s*\d{1,2}일?)(?![\d./])/g

// 날짜 파싱: 괄호 포함 "(4.2)", "(4/2)", "4월2일" 등 → { month, day } or null
export function parseDate(token) {
  // 괄호 제거 후 파싱
  const t = token.replace(/^[(\[（【]/, '').replace(/[)\]）】]$/, '').trim()
  let m, d
  let r = t.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/)
  if (r) { m = parseInt(r[1]); d = parseInt(r[2]) }
  if (!m) {
    r = t.match(/^(\d{1,2})\s*[./]\s*(\d{1,2})$/)
    if (r) { m = parseInt(r[1]); d = parseInt(r[2]) }
  }
  if (!m || m < 1 || m > 12 || d < 1 || d > 31) return null
  return { month: m, day: d }
}

export function isPastDate(month, day) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return new Date(now.getFullYear(), month - 1, day) < today
}

// 실제로 존재하는 날짜인지 (parseDate 는 2/30, 4/31 을 통과시킨다)
export function isRealDate(year, month, day) {
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

// 'YYYY-MM-DD'. toISOString() 을 쓰면 KST(UTC+9) 에서 하루 앞으로 밀리므로 절대 쓰지 않는다.
export function toLocalISODate(year, month /* 1-based */, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 다음 날 (월말/연말 이월 자동 처리)
export function nextLocalISODate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return toLocalISODate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}

function createdAtMillis(todo) {
  const ts = todo?.createdAt
  if (!ts) return null
  if (typeof ts.toDate === 'function') return ts.toDate().getTime()
  if (ts.seconds) return ts.seconds * 1000
  return null
}

// 연도 결정 규칙 (단일·예측가능):
//  1) 기준 연도 = 소속 용역의 year   (홈 화면 연도 선택기와 일치 → 사용자 기대와 일치)
//  2) 용역에 year 가 없으면 작성일(createdAt) 의 연도
//  3) 둘 다 없으면 올해
//  4) 결정된 날짜가 작성일보다 6개월 이상 과거면 +1년
//     → 12월에 적은 "1/5" 는 그해 1월이 아니라 이듬해 1월 5일
export function resolveYear(month, day, todo, project) {
  const createdMs = createdAtMillis(todo)
  let year = project?.year
    ?? (createdMs ? new Date(createdMs).getFullYear() : new Date().getFullYear())

  if (createdMs) {
    const candidate = new Date(year, month - 1, day).getTime()
    const SIX_MONTHS = 183 * 24 * 60 * 60 * 1000
    if (createdMs - candidate > SIX_MONTHS) year += 1
  }
  return year
}

// 투두 텍스트에서 날짜를 모두 뽑는다. 한 투두에 여러 날짜가 있을 수 있다.
// ("9/25 측량, 9/27 보고" → 2건)
// 반환: [{ ymd, year, month, day, token }]
export function extractTodoDates(todo, project) {
  const out = []
  if (!todo?.text) return out
  for (const m of todo.text.matchAll(CAL_DATE_RE)) {
    const token = m[2]
    const parsed = parseDate(token)
    if (!parsed) continue
    const year = resolveYear(parsed.month, parsed.day, todo, project)
    if (!isRealDate(year, parsed.month, parsed.day)) continue
    const ymd = toLocalISODate(year, parsed.month, parsed.day)
    if (!out.some((o) => o.ymd === ymd)) {
      out.push({ ymd, year, month: parsed.month, day: parsed.day, token })
    }
  }
  return out
}

// 달력/캘린더에 올릴 축약 요약. 날짜 토큰을 빼야 "9/25 현장측량" 이 "현장측량" 으로 읽힌다.
// max 를 넘기면 말줄임. 달력 칸에서는 CSS truncate 를 쓰므로 max 를 크게 두고 호출한다.
export function summarizeTodoText(text, max = 20) {
  const bare = (text || '')
    .replace(CAL_DATE_RE, ' ')
    .replace(/[\s,·]+/g, ' ')
    .trim()
  if (!bare) return '(내용 없음)'
  const chars = [...bare] // 이모지 서로게이트 페어 안전
  return chars.length > max ? chars.slice(0, max).join('') + '…' : bare
}

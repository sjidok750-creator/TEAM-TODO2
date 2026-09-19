import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { isHoliday } from './holidays'
import { extractTodoDates, summarizeTodoText, toLocalISODate, parseCompletionDate } from './todoDates'
import { ENTRY_TYPES, LEGEND_ORDER, styleOf, typeOf, stripProjectNumber } from './calendarTypes'

// 홈 화면 아이콘으로 바로 열리는 전체 화면 달력.
// 투두에 적힌 날짜와 용역 준공일을 한 화면에 모아 보여준다.
// 데이터는 Firestore 를 직접 구독하므로 메인 앱과 따로 떠 있어도 실시간으로 맞는다.

const BASE = import.meta.env.BASE_URL
const MONO = { fontFamily: "'JetBrains Mono', monospace" }
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']
const MAX_PILLS = 3
const UPCOMING_DAYS = 14

function dowColor(dow, { holiday = false, today = false } = {}) {
  if (today) return '#ffffff'
  if (holiday || dow === 0) return '#ef4444'
  if (dow === 6) return '#3b82f6'
  return '#E8694A'
}

function pillText(entry) {
  if (entry.kind === 'due') return stripProjectNumber(entry.project.name)
  return summarizeTodoText(entry.todo.text, 60)
}

function Pill({ entry }) {
  const s = styleOf(entry)
  const done = entry.kind === 'todo' && entry.todo.done
  return (
    <span
      className={`block w-full truncate rounded px-1 text-[9.5px] leading-[14px] font-medium ${s.pill} ${
        done ? 'opacity-40 line-through' : ''
      }`}
    >
      {pillText(entry)}
    </span>
  )
}

function EntryCard({ entry, projectById }) {
  const s = styleOf(entry)
  if (entry.kind === 'due') {
    return (
      <div className="flex items-start gap-2.5 bg-white rounded-xl border border-orange-100 px-3 py-2.5">
        <span className={`shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${s.pill}`}>{s.label}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 break-words leading-snug">{entry.project.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5" style={MONO}>SCD {entry.project.completionDate}</p>
        </div>
      </div>
    )
  }
  const t = entry.todo
  const proj = projectById.get(t.projectId)
  return (
    <div className="flex items-start gap-2.5 bg-white rounded-xl border border-orange-100 px-3 py-2.5">
      <span className={`shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${s.pill} ${t.done ? 'opacity-50' : ''}`}>
        {s.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm break-words leading-snug ${t.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {t.text}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
          {proj ? stripProjectNumber(proj.name) : '(용역 없음)'}
          {t.author ? ` · ${t.author}` : ''}
        </p>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [todos, setTodos] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let gotTodos = false, gotProjects = false
    const done = () => { if (gotTodos && gotProjects) setLoading(false) }
    const u1 = onSnapshot(collection(db, 'todos'), (snap) => {
      setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      gotTodos = true; done()
    })
    const u2 = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      gotProjects = true; done()
    })
    return () => { u1(); u2() }
  }, [])

  const today = new Date()
  const todayYmd = toLocalISODate(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedYmd, setSelectedYmd] = useState(null)

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  // 'YYYY-MM-DD' → 항목 배열 (준공일 → 현안 → 중요 → … 순으로 정렬)
  const byDate = useMemo(() => {
    const m = new Map()
    const push = (ymd, e) => { if (!m.has(ymd)) m.set(ymd, []); m.get(ymd).push(e) }
    for (const p of projects) {
      const ymd = parseCompletionDate(p.completionDate)
      if (ymd) push(ymd, { kind: 'due', id: `due-${p.id}`, project: p })
    }
    for (const t of todos) {
      for (const d of extractTodoDates(t, projectById.get(t.projectId))) {
        push(d.ymd, { kind: 'todo', id: `${t.id}-${d.ymd}`, todo: t })
      }
    }
    for (const list of m.values()) {
      list.sort((a, b) => {
        const pa = ENTRY_TYPES[typeOf(a)].priority, pb = ENTRY_TYPES[typeOf(b)].priority
        if (pa !== pb) return pa - pb
        const da = a.kind === 'todo' && a.todo.done ? 1 : 0
        const dbb = b.kind === 'todo' && b.todo.done ? 1 : 0
        return da - dbb // 완료된 건은 뒤로
      })
    }
    return m
  }, [todos, projects, projectById])

  // 앞으로 2주간 일정 (오늘 포함)
  const upcoming = useMemo(() => {
    const out = []
    for (let i = 0; i < UPCOMING_DAYS; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      const ymd = toLocalISODate(d.getFullYear(), d.getMonth() + 1, d.getDate())
      const list = byDate.get(ymd)
      if (list?.length) out.push({ ymd, date: d, list })
    }
    return out
  }, [byDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)

  function prevMonth() {
    setSelectedYmd(null)
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) } else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    setSelectedYmd(null)
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) } else setViewMonth((m) => m + 1)
  }
  function goToday() {
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedYmd(todayYmd)
  }

  const fmtHeader = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number)
    const dow = new Date(y, m - 1, d).getDay()
    return { label: `${m}/${d} (${DOW_KO[dow]})`, dow }
  }

  const selectedList = selectedYmd ? (byDate.get(selectedYmd) ?? []) : null

  return (
    <div className="min-h-screen bg-[#fff7f5] text-gray-800 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
         style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>

      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-orange-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-3 py-2">
          <a
            href={BASE}
            className="flex items-center gap-1 text-orange-500 hover:text-orange-700 transition active:scale-95 -ml-1 pr-1"
            title="팀투두로"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[11px] font-bold tracking-tight" style={MONO}>TODO</span>
          </a>

          <div className="flex-1 flex items-center justify-center gap-1">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-orange-50 transition active:scale-95" aria-label="이전 달">
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-[8.5rem] text-center text-base font-bold text-orange-600" style={MONO}>
              {viewYear} {MONTH_NAMES[viewMonth]}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-orange-50 transition active:scale-95" aria-label="다음 달">
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-lg border border-orange-300 bg-orange-50 text-orange-600 text-[11px] font-bold hover:bg-orange-100 transition active:scale-95"
            style={MONO}
          >
            TODAY
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-2 sm:px-4 pt-3 space-y-3">

        {/* 요일 */}
        <div className="grid grid-cols-7">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d, i) => (
            <div key={d} className="text-center text-[10px] font-bold py-1"
                 style={{ ...MONO, color: dowColor(i) }}>{d}</div>
          ))}
        </div>

        {/* 월 그리드 — gap-px + 배경색으로 얇은 격자선 */}
        <div className="grid grid-cols-7 gap-px bg-orange-100 rounded-xl overflow-hidden border border-orange-100">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="bg-[#fffaf8] min-h-[76px]" />
            const ymd = toLocalISODate(viewYear, viewMonth + 1, day)
            const list = byDate.get(ymd) ?? []
            const dow = i % 7
            const isToday = ymd === todayYmd
            const holiday = isHoliday(viewYear, viewMonth, day)
            const selected = selectedYmd === ymd
            const shown = list.slice(0, MAX_PILLS)
            const extra = list.length - shown.length
            return (
              <button
                key={ymd}
                onClick={() => setSelectedYmd(selected ? null : ymd)}
                className={`relative flex flex-col items-stretch gap-[3px] min-h-[76px] p-1 text-left transition active:bg-orange-100 ${
                  selected ? 'bg-orange-50' : 'bg-white hover:bg-[#fffaf8]'
                }`}
              >
                <span
                  className={`self-start w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold ${
                    isToday ? 'bg-[#E8694A]' : ''
                  }`}
                  style={{ ...MONO, color: dowColor(dow, { holiday, today: isToday }) }}
                >
                  {day}
                </span>
                {shown.map((e) => <Pill key={e.id} entry={e} />)}
                {extra > 0 && (
                  <span className="text-[9px] leading-[12px] text-gray-400 pl-1" style={MONO}>+{extra}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          {LEGEND_ORDER.map((k) => (
            <span key={k} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-sm ${ENTRY_TYPES[k].dot}`} />
              {ENTRY_TYPES[k].label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8694A]" /> 오늘
          </span>
        </div>

        {/* 하단 패널: 선택한 날 / 다가오는 일정 */}
        <section className="pt-1">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
          ) : selectedList ? (
            <>
              <div className="flex items-baseline justify-between px-1 mb-2">
                <h2 className="text-sm font-bold text-orange-600" style={MONO}>{selectedYmd}</h2>
                <button onClick={() => setSelectedYmd(null)} className="text-[11px] text-gray-400 hover:text-gray-600">
                  다가오는 일정 보기
                </button>
              </div>
              {selectedList.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8 bg-white rounded-xl border border-orange-100">
                  이 날은 등록된 일정이 없습니다
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedList.map((e) => <EntryCard key={e.id} entry={e} projectById={projectById} />)}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-orange-600 px-1 mb-2">
                다가오는 일정 <span className="text-[11px] font-normal text-gray-400">· {UPCOMING_DAYS}일</span>
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8 bg-white rounded-xl border border-orange-100">
                  앞으로 {UPCOMING_DAYS}일간 예정된 일정이 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(({ ymd, list }) => {
                    const { label, dow } = fmtHeader(ymd)
                    const isToday = ymd === todayYmd
                    return (
                      <div key={ymd}>
                        <button
                          onClick={() => {
                            const [y, m] = ymd.split('-').map(Number)
                            setViewYear(y); setViewMonth(m - 1); setSelectedYmd(ymd)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="flex items-center gap-2 px-1 mb-1.5 text-[12px] font-bold"
                          style={{ ...MONO, color: dowColor(dow) }}
                        >
                          {label}
                          {isToday && (
                            <span className="rounded-full bg-[#E8694A] text-white text-[9px] px-1.5 py-px" style={MONO}>TODAY</span>
                          )}
                        </button>
                        <div className="space-y-1.5">
                          {list.map((e) => <EntryCard key={e.id} entry={e} projectById={projectById} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

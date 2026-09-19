import { useState, useMemo } from 'react'
import { isHoliday } from './holidays'
import { extractTodoDates, summarizeTodoText, toLocalISODate, parseCompletionDate } from './todoDates'

// 달력 라벨용 카테고리 색. ProjectList 가 이 모듈을 import 하므로 역참조는 순환이 되어 불가.
const CAT_COLOR = {
  '외업': 'text-blue-600',
  '내업': 'text-lime-600',
  '중요': 'text-amber-500',
  '현안': 'text-red-600',
  '기타': 'text-gray-600',
}

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONO = { fontFamily: "'JetBrains Mono', monospace", color: '#E8694A' }

export default function MonthCalendarModal({
  todos = [],
  projects = [],
  onClose,
  gcalConfigured = false,
  gcalConnected = false,
  gcalStatus = '',
  gcalNeedsReconnect = false,
  onGcalConnect,
  onGcalSync,
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedYmd, setSelectedYmd] = useState(null)

  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  // 'YYYY-MM-DD' → 항목 배열.
  // 항목은 투두({kind:'todo'}) 또는 용역 준공일({kind:'due'}) 이다.
  // 준공일은 그날의 대표 일정이므로 항상 맨 앞에 둔다 (칸에 보이는 라벨 한 줄을 차지).
  const byDate = useMemo(() => {
    const m = new Map()
    const push = (ymd, item) => {
      if (!m.has(ymd)) m.set(ymd, [])
      m.get(ymd).push(item)
    }
    for (const p of projects) {
      const ymd = parseCompletionDate(p.completionDate)
      if (ymd) push(ymd, { kind: 'due', id: `due-${p.id}`, project: p })
    }
    for (const t of todos) {
      for (const d of extractTodoDates(t, projectById.get(t.projectId))) {
        push(d.ymd, { kind: 'todo', id: t.id, todo: t })
      }
    }
    for (const list of m.values()) {
      list.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'due' ? -1 : 1))
    }
    return m
  }, [todos, projects, projectById])

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startDow = firstDay.getDay()

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)

  function prevMonth() {
    setSelectedYmd(null)
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    setSelectedYmd(null)
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const selectedTodos = selectedYmd ? (byDate.get(selectedYmd) ?? []) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-3 sm:p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-orange-50 transition active:scale-95">
            <svg className="w-4 h-4" style={{ color: '#E8694A' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold" style={MONO}>{viewYear} {MONTH_NAMES[viewMonth]}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-orange-50 transition active:scale-95">
            <svg className="w-4 h-4" style={{ color: '#E8694A' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d, i) => (
            <div
              key={d}
              className="text-center text-[9px] font-semibold py-1"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#E8694A' }}
            >{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const ymd = toLocalISODate(viewYear, viewMonth + 1, day)
            const dayItems = byDate.get(ymd) ?? []
            const first = dayItems[0]
            const extra = dayItems.length - 1
            const isDue = first?.kind === 'due'
            const label = !first
              ? ''
              : isDue
                ? `준공 ${first.project.name}`
                : summarizeTodoText(first.todo.text, 40)
            const labelClass = !first
              ? ''
              : isDue
                ? 'font-bold'
                : first.todo.done
                  ? 'text-gray-300 line-through'
                  : (CAT_COLOR[first.todo.category] || CAT_COLOR['기타'])
            const dow = new Date(viewYear, viewMonth, day).getDay()
            const isToday =
              viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
            const holiday = isHoliday(viewYear, viewMonth, day)
            let txtColor = '#E8694A'
            if (isToday) txtColor = 'white'
            else if (holiday || dow === 0) txtColor = '#ef4444'
            else if (dow === 6) txtColor = '#3b82f6'

            return (
              <button
                key={i}
                onClick={() => setSelectedYmd(selectedYmd === ymd ? null : ymd)}
                className={`flex flex-col items-center min-w-0 w-full py-0.5 rounded-lg transition active:scale-95 ${
                  selectedYmd === ymd ? 'bg-orange-50 ring-1 ring-orange-200' : ''
                }`}
              >
                <span
                  className={`relative w-7 h-7 flex items-center justify-center rounded-full text-[11px] ${isToday ? 'font-bold' : 'font-medium'}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: txtColor, backgroundColor: isToday ? '#E8694A' : 'transparent' }}
                >
                  {day}
                  {extra > 0 && (
                    <span className="absolute -top-0.5 -right-1.5 px-1 rounded-full bg-orange-400 text-white text-[8px] font-bold leading-[12px]">
                      +{extra}
                    </span>
                  )}
                </span>
                {/* 라벨 슬롯은 비어 있어도 자리를 지킨다 — 행 높이를 고르게 유지 */}
                <span
                  className={`w-full px-0.5 truncate text-center text-[9px] leading-[11px] h-[11px] ${labelClass}`}
                  style={isDue ? { color: '#E8694A' } : undefined}
                >
                  {label || ' '}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-orange-100 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px]" style={MONO}>
            <span className="font-bold text-red-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>17</span> HOLIDAY
          </span>
          <span className="flex items-center gap-1 text-[11px]" style={MONO}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#E8694A' }} /> TODAY
          </span>
        </div>

        {/* Google 캘린더 — 최초 1회만 연결하면 이후로는 자동 반영된다.
            VITE_GOOGLE_CLIENT_ID 가 없으면 이 영역 자체가 나타나지 않는다. */}
        {gcalConfigured && (
          <div className="mt-2 pt-2 border-t border-orange-100 space-y-1.5">
            {!gcalConnected || gcalNeedsReconnect ? (
              <>
                <button
                  onClick={onGcalConnect}
                  className="w-full py-2 rounded-lg border text-[11px] transition active:scale-95 hover:bg-orange-50"
                  style={{ ...MONO, borderColor: '#E8694A' }}
                >
                  {gcalNeedsReconnect ? 'Google 캘린더 다시 연결' : 'Google 캘린더 연결 (최초 1회)'}
                </button>
                {gcalNeedsReconnect && (
                  <p className="text-[10px] text-gray-400">
                    연결이 만료되면 자동 반영이 멈춥니다. 다시 연결하면 그대로 이어집니다.
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[10px] text-gray-400 truncate">
                  Google 캘린더 자동 반영{gcalStatus ? ` · ${gcalStatus}` : ''}
                </p>
                <button
                  onClick={onGcalSync}
                  className="shrink-0 px-2 py-1 rounded border text-[10px] transition active:scale-95 hover:bg-orange-50"
                  style={{ ...MONO, borderColor: '#E8694A' }}
                >
                  지금 동기화
                </button>
              </div>
            )}
          </div>
        )}

        {selectedYmd && (
          <div className="mt-3 pt-3 border-t border-orange-100">
            <p className="text-[11px] font-bold mb-2" style={MONO}>{selectedYmd}</p>
            {selectedTodos.length === 0 ? (
              <p className="text-xs text-gray-400">등록된 일정이 없습니다</p>
            ) : (
              <div className="space-y-1.5">
                {selectedTodos.map((item) =>
                  item.kind === 'due' ? (
                    <div key={item.id} className="flex items-start gap-1.5">
                      <span className="text-[11px] font-bold shrink-0" style={{ color: '#E8694A' }}>
                        (준공)
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs break-words leading-snug font-semibold text-gray-700">
                          {item.project.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          SCD {item.project.completionDate}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="flex items-start gap-1.5">
                      <span className={`text-[11px] font-bold shrink-0 ${CAT_COLOR[item.todo.category] || CAT_COLOR['기타']}`}>
                        ({item.todo.category || '기타'})
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs break-words leading-snug ${item.todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.todo.text}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                          {projectById.get(item.todo.projectId)?.name || '(용역 없음)'}
                          {item.todo.author ? ` · ${item.todo.author}` : ''}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

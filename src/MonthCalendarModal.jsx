import { useState, useMemo } from 'react'
import { isHoliday } from './holidays'
import { extractTodoDates, summarizeTodoText, toLocalISODate } from './todoDates'

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

export default function MonthCalendarModal({ todos = [], projects = [], onClose }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedYmd, setSelectedYmd] = useState(null)

  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  // 'YYYY-MM-DD' → 투두 배열. 한 투두에 날짜가 여러 개면 각 날짜에 모두 들어간다.
  const byDate = useMemo(() => {
    const m = new Map()
    for (const t of todos) {
      for (const d of extractTodoDates(t, projectById.get(t.projectId))) {
        if (!m.has(d.ymd)) m.set(d.ymd, [])
        m.get(d.ymd).push(t)
      }
    }
    return m
  }, [todos, projectById])

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
            const dayTodos = byDate.get(ymd) ?? []
            const first = dayTodos[0]
            const extra = dayTodos.length - 1
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
                  className={`w-full px-0.5 truncate text-center text-[9px] leading-[11px] h-[11px] ${
                    !first ? '' : first.done ? 'text-gray-300 line-through' : (CAT_COLOR[first.category] || CAT_COLOR['기타'])
                  }`}
                >
                  {first ? summarizeTodoText(first.text, 40) : ' '}
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

        {selectedYmd && (
          <div className="mt-3 pt-3 border-t border-orange-100">
            <p className="text-[11px] font-bold mb-2" style={MONO}>{selectedYmd}</p>
            {selectedTodos.length === 0 ? (
              <p className="text-xs text-gray-400">등록된 일정이 없습니다</p>
            ) : (
              <div className="space-y-1.5">
                {selectedTodos.map((t) => (
                  <div key={t.id} className="flex items-start gap-1.5">
                    <span className={`text-[11px] font-bold shrink-0 ${CAT_COLOR[t.category] || CAT_COLOR['기타']}`}>
                      ({t.category || '기타'})
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs break-words leading-snug ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {t.text}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {projectById.get(t.projectId)?.name || '(용역 없음)'}
                        {t.author ? ` · ${t.author}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

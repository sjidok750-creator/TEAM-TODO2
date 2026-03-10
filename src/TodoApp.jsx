import { useState, useEffect, useRef } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'

const COLLECTION = 'todos'

function formatTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Avatar({ name }) {
  const colors = [
    'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-green-400',
    'bg-teal-400', 'bg-cyan-400', 'bg-blue-400', 'bg-violet-400',
    'bg-pink-400', 'bg-rose-400',
  ]
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold shrink-0 ${colors[idx]}`}>
      {name[0].toUpperCase()}
    </span>
  )
}

const WORK_TYPES = [
  { key: '외업', label: '외업', color: 'bg-blue-100 text-blue-700' },
  { key: '내업', label: '내업', color: 'bg-lime-100 text-lime-700' },
  { key: '중요', label: '중요', color: 'bg-amber-100 text-amber-600' },
  { key: '현안', label: '현안', color: 'bg-red-100 text-red-600' },
  { key: '기타', label: '기타', color: 'bg-gray-200 text-gray-800' },
]

// 한국 공휴일 (고정)
const FIXED_HOLIDAYS = {
  '01-01': '신정', '03-01': '삼일절', '05-05': '어린이날',
  '06-06': '현충일', '08-15': '광복절', '10-03': '개천절',
  '10-09': '한글날', '12-25': '크리스마스',
}
// 음력 공휴일 (연도별 양력 날짜)
const LUNAR_HOLIDAYS = {
  2025: new Set(['2025-01-28','2025-01-29','2025-01-30','2025-05-06','2025-10-05','2025-10-06','2025-10-07','2025-10-08']),
  2026: new Set(['2026-02-15','2026-02-16','2026-02-17','2026-02-18','2026-09-23','2026-09-24','2026-09-25','2026-09-26']),
}

function isHoliday(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const ymd = `${date.getFullYear()}-${mm}-${dd}`
  if (FIXED_HOLIDAYS[`${mm}-${dd}`]) return true
  const lunar = LUNAR_HOLIDAYS[date.getFullYear()]
  if (lunar && lunar.has(ymd)) return true
  return false
}

function MonthCalendarModal({ onClose }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)

  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition active:scale-95">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold text-gray-800">{viewYear}년 {monthNames[viewMonth]}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition active:scale-95">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['일','월','화','수','목','금','토'].map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>{d}</div>
          ))}
        </div>
        {/* Dates */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const date = new Date(viewYear, viewMonth, d)
            const dow = date.getDay()
            const isToday = date.toDateString() === today.toDateString()
            const holiday = isHoliday(date)
            const isSun = dow === 0
            const isSat = dow === 6
            const textColor = isToday ? 'text-white' : holiday || isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'
            return (
              <div key={i} className="flex flex-col items-center py-0.5">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium ${isToday ? 'font-bold' : ''} ${textColor} ${isToday ? 'bg-orange-500' : 'hover:bg-gray-100'}`}
                  style={isToday ? { backgroundColor: '#E8694A' } : {}}
                >
                  {d}
                </span>
                {holiday && !isToday && (
                  <span className="w-1 h-1 rounded-full bg-red-400 mt-0.5" />
                )}
              </div>
            )
          })}
        </div>
        {/* 범례 */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/> 공휴일</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{backgroundColor:'#E8694A'}}/> 오늘</span>
        </div>
      </div>
    </div>
  )
}

export default function TodoApp({ nickname, onChangeNickname }) {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [workType, setWorkType] = useState('기타')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [editingTodo, setEditingTodo] = useState(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  async function addTodo() {
    const text = input.trim()
    if (!text) return
    setInput('')
    await addDoc(collection(db, COLLECTION), {
      text, done: false, author: nickname, workType, createdAt: serverTimestamp(),
    })
    inputRef.current?.focus()
  }

  async function toggleDone(todo) {
    await updateDoc(doc(db, COLLECTION, todo.id), { done: !todo.done })
  }

  async function deleteTodo(id) {
    await deleteDoc(doc(db, COLLECTION, id))
    setEditingTodo(null)
  }

  async function saveTodo() {
    const text = editingTodo.text.trim()
    if (!text) return
    await updateDoc(doc(db, COLLECTION, editingTodo.id), { text })
    setEditingTodo(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addTodo()
  }

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const doneCount = todos.filter((t) => t.done).length
  const totalCount = todos.length

  // 오늘 날짜 표기
  const todayD = new Date()
  const mm = String(todayD.getMonth() + 1).padStart(2, '0')
  const dd = String(todayD.getDate()).padStart(2, '0')
  const dayNames = ['일','월','화','수','목','금','토']
  const todayStr = `${mm}/${dd}(${dayNames[todayD.getDay()]})`

  const monoOrange = { fontFamily: "'JetBrains Mono', monospace", color: '#E8694A' }
  const isModified = editingTodo && editingTodo.text.trim() !== editingTodo.origText

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">

      {/* 전체 달력 모달 */}
      {showCalendar && <MonthCalendarModal onClose={() => setShowCalendar(false)} />}

      {/* Todo 편집 팝업 */}
      {editingTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingTodo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-80 max-w-sm flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold" style={monoOrange}>Edit</p>
            <textarea
              autoFocus
              value={editingTodo.text}
              onChange={(e) => setEditingTodo(prev => ({ ...prev, text: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 resize-none leading-relaxed"
            />
            <div className="flex gap-2">
              <button
                onClick={() => deleteTodo(editingTodo.id)}
                className="flex-1 py-2.5 rounded-xl text-sm border border-current transition active:scale-95 hover:bg-orange-50"
                style={monoOrange}
              >
                Delete
              </button>
              {isModified ? (
                <button
                  onClick={saveTodo}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white transition active:scale-95"
                  style={{ backgroundColor: '#E8694A', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => setEditingTodo(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-current transition active:scale-95 hover:bg-orange-50"
                  style={monoOrange}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={monoOrange}>{todayStr}</span>
            <button
              onClick={() => setShowCalendar(true)}
              className="text-lg leading-none hover:scale-110 transition active:scale-95"
              title="달력 보기"
            >
              📅
            </button>
          </div>
          <button
            onClick={onChangeNickname}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition"
            title="닉네임 변경"
          >
            <Avatar name={nickname} />
            <span className="font-medium">{nickname}</span>
            <span className="text-xs text-gray-400">변경</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* Progress */}
        {totalCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>진행률</span>
              <span className="font-semibold text-indigo-600">{doneCount} / {totalCount}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
          <div className="flex gap-1">
            {WORK_TYPES.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setWorkType(key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition ${
                  workType === key ? `${color} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
              >
                {key === '중요' && '★ '}{key === '현안' && <span style={{ color: '#e53e3e', fontSize: '9px', marginRight: '2px' }}>▲</span>}{label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="새 할 일을 입력하세요..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              maxLength={200}
            />
            <button
              onClick={addTodo}
              disabled={!input.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition active:scale-95 shrink-0"
            >
              추가
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        {totalCount > 0 && (
          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1">
            {[
              { key: 'all', label: `전체 ${totalCount}` },
              { key: 'active', label: `진행중 ${totalCount - doneCount}` },
              { key: 'done', label: `완료 ${doneCount}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === key ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Todo list */}
        <div className="space-y-2">
          {loading && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2 animate-pulse">⏳</div>
              <p className="text-sm">불러오는 중...</p>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">{filter === 'done' ? '🎉' : '📝'}</div>
              <p className="text-sm">
                {filter === 'done' ? '완료된 항목이 없어요' : filter === 'active' ? '모두 완료했어요!' : '할 일을 추가해보세요'}
              </p>
            </div>
          )}
          {filtered.map((todo) => (
            <div
              key={todo.id}
              onClick={() => setEditingTodo({ id: todo.id, text: todo.text, origText: todo.text, workType: todo.workType })}
              className={`bg-white rounded-xl shadow-sm px-4 py-3 flex items-start gap-3 transition cursor-pointer hover:shadow-md ${todo.done ? 'opacity-60' : ''}`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleDone(todo) }}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  todo.done ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                {todo.done && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm break-words leading-snug ${todo.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {todo.workType === '중요' && <span className="text-amber-400 font-bold mr-1">★</span>}
                  {todo.workType === '현안' && <span style={{ color: '#e53e3e', fontSize: '11px', marginRight: '3px', fontWeight: 'bold' }}>▲</span>}
                  {todo.text}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {todo.workType && (() => {
                    const wt = WORK_TYPES.find((w) => w.key === todo.workType)
                    return wt ? <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${wt.color}`}>{todo.workType}</span> : null
                  })()}
                  <Avatar name={todo.author || '?'} />
                  <span className="text-xs text-gray-400">{todo.author}</span>
                  {todo.createdAt && <span className="text-xs text-gray-300">· {formatTime(todo.createdAt)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          링크를 공유하면 팀원들과 실시간으로 함께 볼 수 있어요
        </p>
      </main>
    </div>
  )
}

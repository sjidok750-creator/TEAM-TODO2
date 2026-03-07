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
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold shrink-0 ${colors[idx]}`}
    >
      {name[0].toUpperCase()}
    </span>
  )
}

const WORK_TYPES = [
  { key: '외업', label: '외업', color: 'bg-blue-100 text-blue-700' },
  { key: '내업', label: '내업', color: 'bg-green-100 text-green-700' },
  { key: '중요', label: '중요', color: 'bg-red-100 text-red-700' },
  { key: '기타', label: '기타', color: 'bg-gray-100 text-gray-600' },
]

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DOT_COLORS = {
  '외업': 'bg-blue-500',
  '내업': 'bg-green-500',
  '중요': 'bg-red-500',
  '기타': 'bg-gray-400',
}

function WeekCalendar({ todos, selectedDate, onSelectDate }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const todosByDate = {}
  todos.forEach((todo) => {
    if (!todo.createdAt) return
    const d = todo.createdAt.toDate ? todo.createdAt.toDate() : new Date(todo.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!todosByDate[key]) todosByDate[key] = []
    todosByDate[key].push(todo)
  })

  const weekNum = Math.ceil(
    (today.getDate() + new Date(today.getFullYear(), today.getMonth(), 1).getDay()) / 7
  )
  const monthNum = today.getMonth() + 1

  return (
    <div className="bg-white rounded-2xl shadow-sm px-4 pt-3 pb-4">
      <div className="flex items-center justify-center mb-4">
        <span className="text-sm font-semibold text-gray-700">{monthNum}월 {weekNum}주차</span>
        <svg className="w-3.5 h-3.5 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime()
          const isSelected = selectedDate && day.getTime() === selectedDate.getTime()
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
          const dayTodos = todosByDate[key] || []
          const dotTypes = [...new Set(dayTodos.map((t) => t.workType || '기타'))].slice(0, 3)

          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1 cursor-pointer"
              onClick={() => onSelectDate(isSelected ? null : day)}
            >
              <span className="text-[11px] font-medium text-gray-400 tracking-wide">{DAY_LABELS[i]}</span>
              <div
                className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  isToday
                    ? 'bg-gray-900 text-white'
                    : isSelected
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {day.getDate()}
              </div>
              <div className="flex gap-0.5 h-2 items-center">
                {dotTypes.map((type, j) => (
                  <span key={j} className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[type] || 'bg-gray-400'}`} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TodoApp({ nickname, onChangeNickname }) {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [workType, setWorkType] = useState('기타')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | active | done
  const [selectedDate, setSelectedDate] = useState(null)
  const inputRef = useRef(null)

  // Firestore real-time listener
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
      text,
      done: false,
      author: nickname,
      workType,
      createdAt: serverTimestamp(),
    })
    inputRef.current?.focus()
  }

  async function toggleDone(todo) {
    await updateDoc(doc(db, COLLECTION, todo.id), { done: !todo.done })
  }

  async function deleteTodo(id) {
    await deleteDoc(doc(db, COLLECTION, id))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addTodo()
  }

  const filtered = todos.filter((t) => {
    if (selectedDate) {
      if (!t.createdAt) return false
      const d = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt)
      const tDate = new Date(d)
      tDate.setHours(0, 0, 0, 0)
      if (tDate.getTime() !== selectedDate.getTime()) return false
    }
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const doneCount = todos.filter((t) => t.done).length
  const totalCount = todos.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <h1 className="text-lg font-bold text-gray-800">팀 투두</h1>
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
        {/* Week Calendar */}
        <WeekCalendar todos={todos} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Progress */}
        {totalCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>진행률</span>
              <span className="font-semibold text-indigo-600">
                {doneCount} / {totalCount}
              </span>
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
                  workType === key
                    ? `${color} border-current`
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
              >
                {key === '중요' && '★ '}{label}
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
                  filter === key
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
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
              <div className="text-4xl mb-2">
                {filter === 'done' ? '🎉' : '📝'}
              </div>
              <p className="text-sm">
                {filter === 'done'
                  ? '완료된 항목이 없어요'
                  : filter === 'active'
                  ? '모두 완료했어요!'
                  : '할 일을 추가해보세요'}
              </p>
            </div>
          )}

          {filtered.map((todo) => (
            <div
              key={todo.id}
              className={`bg-white rounded-xl shadow-sm px-4 py-3 flex items-start gap-3 transition group ${
                todo.done ? 'opacity-60' : ''
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleDone(todo)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  todo.done
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                {todo.done && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm break-words leading-snug ${
                    todo.done ? 'line-through text-gray-400' : 'text-gray-800'
                  }`}
                >
                  {todo.workType === '중요' && (
                    <span className="text-amber-400 font-bold mr-1">★</span>
                  )}
                  {todo.text}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {todo.workType && (() => {
                    const wt = WORK_TYPES.find((w) => w.key === todo.workType)
                    return wt ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${wt.color}`}>
                        {todo.workType}
                      </span>
                    ) : null
                  })()}
                  <Avatar name={todo.author || '?'} />
                  <span className="text-xs text-gray-400">{todo.author}</span>
                  {todo.createdAt && (
                    <span className="text-xs text-gray-300">· {formatTime(todo.createdAt)}</span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                title="삭제"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-400 pb-4">
          링크를 공유하면 팀원들과 실시간으로 함께 볼 수 있어요
        </p>
      </main>
    </div>
  )
}

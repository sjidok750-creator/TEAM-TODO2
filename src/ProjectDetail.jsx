import { useState, useEffect, useRef } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const CATEGORY_CONFIG = {
  '외업': {
    color: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    borderClass: 'border-l-red-400',
  },
  '내업': {
    color: 'text-blue-600',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    borderClass: 'border-l-blue-400',
  },
  '기타': {
    color: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    borderClass: 'border-l-green-400',
  },
}

function Avatar({ name }) {
  const colors = [
    'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-green-400',
    'bg-teal-400', 'bg-cyan-400', 'bg-blue-400', 'bg-violet-400',
    'bg-pink-400', 'bg-rose-400',
  ]
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold shrink-0 ${colors[idx]}`}>
      {name[0].toUpperCase()}
    </span>
  )
}

export default function ProjectDetail({ project, onBack }) {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [author, setAuthor] = useState(() => localStorage.getItem('team-todo-author') || '')
  const [category, setCategory] = useState('외업')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  // Load all todos and filter client-side (avoids composite index requirement)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'todos'), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const projectTodos = all
        .filter((t) => t.projectId === project.id)
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0
          const bTime = b.createdAt?.toMillis?.() ?? 0
          return aTime - bTime
        })
      setTodos(projectTodos)
      setLoading(false)
    })
    return unsub
  }, [project.id])

  async function addTodo() {
    const text = input.trim()
    if (!text) return
    setInput('')
    localStorage.setItem('team-todo-author', author)
    await addDoc(collection(db, 'todos'), {
      projectId: project.id,
      text,
      done: false,
      category,
      author: author.trim() || '익명',
      createdAt: serverTimestamp(),
    })
    inputRef.current?.focus()
  }

  async function toggleDone(todo) {
    await updateDoc(doc(db, 'todos', todo.id), { done: !todo.done })
  }

  async function deleteTodo(id) {
    await deleteDoc(doc(db, 'todos', id))
  }

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const doneCount = todos.filter((t) => t.done).length
  const totalCount = todos.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-indigo-600 transition p-1 -ml-1"
            title="목록으로"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-base font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-2.5 py-1">todo list</span>
            <h1 className="text-sm font-bold text-gray-800 leading-snug break-words mt-0.5">
              {project.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Progress */}
        {totalCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">TODO 진행률</span>
              <span className="font-bold text-indigo-600">{doneCount} / {totalCount}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            {/* Category legend */}
            <div className="flex gap-3 mt-3">
              {['외업', '내업', '기타'].map((cat) => {
                const count = todos.filter((t) => t.category === cat).length
                const cfg = CATEGORY_CONFIG[cat]
                return (
                  <span key={cat} className={`text-xs font-semibold ${cfg.color}`}>
                    {cat} {count}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          {/* Category selector */}
          <div className="flex gap-2">
            {['외업', '내업', '기타'].map((cat) => {
              const cfg = CATEGORY_CONFIG[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition active:scale-95 ${
                    category === cat
                      ? cfg.badgeClass
                      : 'text-gray-400 border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
          {/* Author + Text input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="작성자"
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition font-mono shrink-0"
              maxLength={20}
            />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="할 일을 입력하세요..."
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
                  : '위에서 구분을 선택하고 할 일을 추가해보세요'}
              </p>
            </div>
          )}

          {filtered.map((todo) => {
            const cfg = CATEGORY_CONFIG[todo.category] || CATEGORY_CONFIG['기타']
            return (
              <div
                key={todo.id}
                className={`bg-white rounded-xl shadow-sm px-4 py-3 flex items-start gap-3 transition group border-l-4 ${cfg.borderClass} ${
                  todo.done ? 'opacity-60' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleDone(todo)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
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
                  <div className="flex items-start gap-1.5 flex-wrap">
                    {todo.author && (
                      <span className="font-mono text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 shrink-0">
                        {todo.author}
                      </span>
                    )}
                    <span className={`text-xs font-bold shrink-0 mt-0.5 ${cfg.color}`}>
                      ({todo.category || '기타'})
                    </span>
                    <p
                      className={`text-sm break-words leading-snug ${
                        todo.done ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {todo.text}
                    </p>
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
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          링크를 공유하면 팀원들과 실시간으로 함께 볼 수 있어요
        </p>
      </main>
    </div>
  )
}

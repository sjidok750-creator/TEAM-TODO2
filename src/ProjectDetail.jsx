import { useState, useEffect, useRef } from 'react'
import { AUTHORS, getAuthorClass } from './authorConfig'
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
import { useToast } from './Toast'


const CATEGORY_CONFIG = {
  '외업': {
    color: 'text-red-600',
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
  },
  '내업': {
    color: 'text-blue-600',
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  '기타': {
    color: 'text-green-600',
    badgeClass: 'bg-green-50 text-green-600 border-green-200',
  },
}

export default function ProjectDetail({ project, onBack }) {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [author, setAuthor] = useState(() => localStorage.getItem('team-todo-author') || '')
  const [category, setCategory] = useState('외업')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingTodoId, setEditingTodoId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const inputRef = useRef(null)
  const editTodoRef = useRef(null)
  const prevTodoIdsRef = useRef(null)
  const { addToast, ToastContainer } = useToast()

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
      // 알림: 초기 로드 이후 타인이 추가한 항목 감지
      if (prevTodoIdsRef.current !== null) {
        const prevIds = prevTodoIdsRef.current
        const newItems = projectTodos.filter((t) => !prevIds.has(t.id))
        newItems.forEach((t) => {
          if (t.author !== (localStorage.getItem('team-todo-author') || '')) {
            const cat = t.category || '기타'
            addToast(`${t.author}님이 (${cat}) ${t.text}`, { icon: '🔔' })
          }
        })
      }
      prevTodoIdsRef.current = new Set(projectTodos.map((t) => t.id))
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

  function startEditTodo(todo) {
    setEditingTodoId(todo.id)
    setEditingText(todo.text)
    setTimeout(() => editTodoRef.current?.focus(), 0)
  }

  async function saveTodoEdit(todo) {
    const text = editingText.trim()
    if (text && text !== todo.text) {
      await updateDoc(doc(db, 'todos', todo.id), { text })
    }
    setEditingTodoId(null)
  }

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const doneCount = todos.filter((t) => t.done).length
  const totalCount = todos.length

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-4 py-2.5">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-700 transition p-1.5 -ml-1.5 rounded-lg active:bg-gray-100"
            title="목록으로"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-2 py-0.5">todo list</span>
            <p className="text-xs font-semibold text-gray-700 mt-0.5 truncate">{project.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-3 space-y-3">
        {/* Progress */}
        {totalCount > 0 && (
          <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>TODO 진행률</span>
              <span className="font-bold text-indigo-600">{doneCount} / {totalCount}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <div className="flex gap-3 mt-2">
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
        <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 space-y-2.5">
          {/* Category */}
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
                      : 'text-gray-400 border-gray-200 bg-white'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
          {/* Author 선택 */}
          <div className="flex flex-wrap gap-1.5">
            {AUTHORS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setAuthor(author === name ? '' : name)}
                className={`text-xs font-semibold rounded-full px-2.5 py-1 border transition active:scale-95 ${
                  author === name
                    ? getAuthorClass(name)
                    : 'text-gray-400 bg-white border-gray-200 hover:border-gray-400'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {/* Content + Submit */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="할 일을 입력하세요..."
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              maxLength={200}
            />
            <button
              onClick={addTodo}
              disabled={!input.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition active:scale-95 shrink-0"
            >
              추가
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        {totalCount > 0 && (
          <div className="flex gap-1 bg-white rounded-lg border border-gray-100 p-1">
            {[
              { key: 'all', label: `전체 ${totalCount}` },
              { key: 'active', label: `진행중 ${totalCount - doneCount}` },
              { key: 'done', label: `완료 ${doneCount}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                  filter === key
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Todo list */}
        <div className="bg-white rounded-lg border border-gray-100">
          {loading && (
            <div className="text-center py-10 text-gray-400 text-sm">불러오는 중...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              {filter === 'done'
                ? '완료된 항목이 없어요'
                : filter === 'active'
                ? '모두 완료했어요!'
                : '위에서 할 일을 추가해보세요'}
            </div>
          )}

          {filtered.map((todo, i) => {
            const cfg = CATEGORY_CONFIG[todo.category] || CATEGORY_CONFIG['기타']
            const isEditing = editingTodoId === todo.id
            return (
              <div
                key={todo.id}
                className={`flex items-center gap-2.5 px-4 py-3 group ${
                  i < filtered.length - 1 ? 'border-b border-gray-100' : ''
                } ${todo.done && !isEditing ? 'opacity-50' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => !isEditing && toggleDone(todo)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
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

                {/* Category */}
                {!isEditing && (
                  <span className={`text-xs font-bold shrink-0 ${cfg.color}`}>
                    {todo.category || '기타'}
                  </span>
                )}

                {/* Text or Edit input */}
                {isEditing ? (
                  <input
                    ref={editTodoRef}
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTodoEdit(todo)
                      if (e.key === 'Escape') setEditingTodoId(null)
                    }}
                    className="flex-1 px-2 py-1 border border-indigo-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    maxLength={200}
                  />
                ) : (
                  <p className={`flex-1 text-sm leading-snug break-all ${
                    todo.done ? 'line-through text-gray-400' : 'text-gray-800'
                  }`}>
                    {todo.text}
                  </p>
                )}

                {/* Author — far right */}
                {todo.author && !isEditing && (
                  <span className={`shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 border ${getAuthorClass(todo.author)}`}>
                    {todo.author}
                  </span>
                )}

                {/* Edit / Delete — hover 시에만 공간 차지 */}
                {isEditing ? (
                  <button
                    onClick={() => saveTodoEdit(todo)}
                    className="text-indigo-500 hover:text-indigo-700 transition shrink-0 p-0.5"
                    title="저장"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                ) : (
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEditTodo(todo)}
                      className="text-gray-300 hover:text-indigo-400 transition"
                      title="수정"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.93l-3 1 1-3a4 4 0 01.93-1.414z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="text-gray-300 hover:text-red-400 transition"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
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

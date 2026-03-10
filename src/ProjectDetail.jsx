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
  '중요': {
    color: 'text-amber-500',
    badgeClass: 'bg-amber-50 text-amber-600 border-amber-200',
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
  const [editingCategory, setEditingCategory] = useState('외업')
  const [editingAuthor, setEditingAuthor] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null) // { message, onConfirm }
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
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
          const aOrder = a.order ?? a.createdAt?.toMillis?.() ?? 0
          const bOrder = b.order ?? b.createdAt?.toMillis?.() ?? 0
          return aOrder - bOrder
        })
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
    const nextOrder = todos.length > 0
      ? Math.max(...todos.map(t => t.order ?? t.createdAt?.toMillis?.() ?? 0)) + 1000
      : 0
    await addDoc(collection(db, 'todos'), {
      projectId: project.id,
      text,
      done: false,
      category,
      author: author.trim() || '익명',
      createdAt: serverTimestamp(),
      order: nextOrder,
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
    setEditingCategory(todo.category || '외업')
    setEditingAuthor(todo.author || '')
    setTimeout(() => editTodoRef.current?.focus(), 0)
  }

  async function saveTodoEdit(todo) {
    const text = editingText.trim()
    if (text) {
      const updates = {}
      if (text !== todo.text) updates.text = text
      if (editingCategory !== todo.category) updates.category = editingCategory
      if (editingAuthor && editingAuthor !== todo.author) updates.author = editingAuthor
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'todos', todo.id), updates)
      }
    }
    setEditingTodoId(null)
  }

  function resetDrag() {
    setDraggedId(null)
    setDragOverId(null)
  }

  async function handleDrop(targetId) {
    if (!draggedId || draggedId === targetId) { resetDrag(); return }
    const fromIdx = todos.findIndex(t => t.id === draggedId)
    const toIdx = todos.findIndex(t => t.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { resetDrag(); return }
    const newArr = [...todos]
    const [moved] = newArr.splice(fromIdx, 1)
    newArr.splice(toIdx, 0, moved)
    await Promise.all(newArr.map((t, i) =>
      updateDoc(doc(db, 'todos', t.id), { order: i * 1000 })
    ))
    resetDrag()
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

      {/* 삭제 확인 모달 */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#E8694A', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: '1rem' }}>
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}
                className="flex-1 py-2 rounded-xl text-white text-sm"
                style={{ backgroundColor: '#E8694A', fontFamily: "'JetBrains Mono', monospace" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`, backgroundColor: '#E8694A' }}
              />
            </div>
            <div className="flex gap-3 mt-2">
              {['외업', '내업', '중요', '기타'].map((cat) => {
                const count = todos.filter((t) => t.category === cat).length
                const cfg = CATEGORY_CONFIG[cat]
                return (
                  <span key={cat} className={`text-xs font-semibold ${cfg.color}`}>
                    {cat === '중요' && '★ '}{cat} {count}
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
            {['외업', '내업', '중요', '기타'].map((cat) => {
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
                  {cat === '중요' && '★ '}{cat}
                </button>
              )
            })}
          </div>
          {/* Author */}
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
        <div
          className="bg-white rounded-lg border border-gray-100"
          onDragOver={(e) => e.preventDefault()}
        >
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
            const isDragging = draggedId === todo.id
            const isDragOver = dragOverId === todo.id && draggedId !== todo.id
            return (
              <div
                key={todo.id}
                draggable={!isEditing}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(todo.id) }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(todo.id) }}
                onDrop={(e) => { e.preventDefault(); handleDrop(todo.id) }}
                onDragEnd={resetDrag}
                className={`flex gap-2.5 px-4 py-3 group transition ${
                  isEditing ? 'items-start' : 'items-center'
                } ${i < filtered.length - 1 ? 'border-b border-gray-100' : ''} ${
                  todo.done && !isEditing ? 'opacity-50' : ''
                } ${isDragging ? 'opacity-30 bg-gray-50' : ''} ${
                  isDragOver ? 'border-t-2 border-indigo-400' : ''
                }`}
              >
                {/* Drag handle */}
                <div
                  className="shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing select-none mt-0.5"
                  title="드래그하여 순서 변경"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zM8 16h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                  </svg>
                </div>

                {/* Checkbox */}
                <button
                  onClick={() => !isEditing && toggleDone(todo)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition mt-0.5 ${
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

                {isEditing ? (
                  /* ── 수정 모드: 카테고리 + 작성자 + 텍스트 세로 배열 ── */
                  <div className="flex-1 flex flex-col gap-2">
                    {/* Category */}
                    <div className="flex gap-1.5 flex-wrap">
                      {['외업', '내업', '중요', '기타'].map((cat) => {
                        const c = CATEGORY_CONFIG[cat]
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEditingCategory(cat)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition active:scale-95 ${
                              editingCategory === cat ? c.badgeClass : 'text-gray-400 border-gray-200 bg-white'
                            }`}
                          >
                            {cat === '중요' && '★ '}{cat}
                          </button>
                        )
                      })}
                    </div>
                    {/* Author */}
                    <div className="flex flex-wrap gap-1">
                      {AUTHORS.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setEditingAuthor(editingAuthor === name ? '' : name)}
                          className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border transition active:scale-95 ${
                            editingAuthor === name
                              ? getAuthorClass(name)
                              : 'text-gray-400 bg-white border-gray-200'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    {/* Text input */}
                    <input
                      ref={editTodoRef}
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTodoEdit(todo)
                        if (e.key === 'Escape') setEditingTodoId(null)
                      }}
                      className="px-2 py-1.5 border border-indigo-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                      maxLength={200}
                    />
                  </div>
                ) : (
                  /* ── 일반 모드 ── */
                  <>
                    <span className={`text-xs font-bold shrink-0 ${cfg.color}`}>
                      {todo.category || '기타'}
                    </span>
                    <p className={`flex-1 text-sm leading-snug break-all ${
                      todo.done ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}>
                      {todo.category === '중요' && <span className="text-amber-400 font-bold mr-1">★</span>}
                      {todo.text}
                    </p>
                    {todo.author && (
                      <span className={`shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 border ${getAuthorClass(todo.author)}`}>
                        {todo.author}
                      </span>
                    )}
                  </>
                )}

                {/* Edit / Delete / Save */}
                {isEditing ? (
                  <button
                    onClick={() => saveTodoEdit(todo)}
                    className="text-indigo-500 hover:text-indigo-700 transition shrink-0 p-0.5 mt-0.5"
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
                      onClick={() => setConfirmDialog({ message: 'Delete this item?', onConfirm: () => deleteTodo(todo.id) })}
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

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
  const [editingPopup, setEditingPopup] = useState(null) // { id, text, origText, category, origCategory, author, origAuthor }
  const [confirmDialog, setConfirmDialog] = useState(null) // { message, onConfirm }
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const touchDragRef = useRef({ id: null, overId: null, startX: 0, startY: 0, dragging: false })
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

  function openEditPopup(todo) {
    setEditingPopup({
      id: todo.id,
      text: todo.text, origText: todo.text,
      category: todo.category || '외업', origCategory: todo.category || '외업',
      author: todo.author || '', origAuthor: todo.author || '',
    })
  }

  async function saveEditPopup() {
    const text = editingPopup.text.trim()
    if (!text) return
    const updates = {}
    if (text !== editingPopup.origText) updates.text = text
    if (editingPopup.category !== editingPopup.origCategory) updates.category = editingPopup.category
    if (editingPopup.author !== editingPopup.origAuthor) updates.author = editingPopup.author
    if (Object.keys(updates).length > 0) await updateDoc(doc(db, 'todos', editingPopup.id), updates)
    setEditingPopup(null)
  }

  function resetDrag() {
    setDraggedId(null)
    setDragOverId(null)
  }

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    function onTouchMove(e) {
      if (!touchDragRef.current.id) return
      const touch = e.touches[0]
      const dx = Math.abs(touch.clientX - touchDragRef.current.startX)
      const dy = Math.abs(touch.clientY - touchDragRef.current.startY)
      if (!touchDragRef.current.dragging && dx < 6 && dy < 6) return
      e.preventDefault()
      if (!touchDragRef.current.dragging) {
        touchDragRef.current.dragging = true
        setDraggedId(touchDragRef.current.id)
      }
      const items = el.querySelectorAll('[data-todoid]')
      let found = null
      for (const item of items) {
        const rect = item.getBoundingClientRect()
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          const id = item.dataset.todoid
          if (id !== touchDragRef.current.id) found = id
          break
        }
      }
      if (found !== touchDragRef.current.overId) {
        touchDragRef.current.overId = found
        setDragOverId(found)
      }
    }
    function onTouchEnd() {
      const { id: fromId, overId: toId, dragging } = touchDragRef.current
      touchDragRef.current = { id: null, overId: null, startX: 0, startY: 0, dragging: false }
      setDraggedId(null)
      setDragOverId(null)
      if (!dragging || !fromId || !toId || fromId === toId) return
      setTodos(prev => {
        const fromIdx = prev.findIndex(t => t.id === fromId)
        const toIdx = prev.findIndex(t => t.id === toId)
        if (fromIdx === -1 || toIdx === -1) return prev
        const arr = [...prev]
        const [moved] = arr.splice(fromIdx, 1)
        arr.splice(toIdx, 0, moved)
        Promise.all(arr.map((t, i) => updateDoc(doc(db, 'todos', t.id), { order: i * 1000 })))
        return arr
      })
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

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

  const pullRef = useRef({ startY: 0, pulling: false })
  const [pullDist, setPullDist] = useState(0)

  function onPullStart(e) {
    if (window.scrollY === 0) {
      pullRef.current = { startY: e.touches[0].clientY, pulling: true }
    }
  }
  function onPullMove(e) {
    if (!pullRef.current.pulling) return
    const dist = e.touches[0].clientY - pullRef.current.startY
    if (dist > 0) setPullDist(Math.min(dist, 70))
  }
  function onPullEnd() {
    if (pullDist >= 55) window.location.reload()
    setPullDist(0)
    pullRef.current.pulling = false
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      onTouchStart={onPullStart}
      onTouchMove={onPullMove}
      onTouchEnd={onPullEnd}
    >
      <ToastContainer />

      {/* Pull-to-refresh 인디케이터 */}
      {pullDist > 10 && (
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-50 transition-all"
          style={{ transform: `translateX(-50%) translateY(${pullDist - 20}px)` }}
        >
          <div className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center ${pullDist >= 55 ? 'text-orange-500' : 'text-gray-400'}`}>
            <svg className={`w-5 h-5 ${pullDist >= 55 ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )}

      {/* Todo 편집 팝업 */}
      {editingPopup && (() => {
        const monoOrange = { fontFamily: "'JetBrains Mono', monospace", color: '#E8694A' }
        const isModified =
          editingPopup.text.trim() !== editingPopup.origText ||
          editingPopup.category !== editingPopup.origCategory ||
          editingPopup.author !== editingPopup.origAuthor
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingPopup(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-80 max-w-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-bold" style={monoOrange}>Edit</p>
              {/* Category */}
              <div className="flex gap-1.5 flex-wrap">
                {['외업','내업','중요','기타'].map((cat) => {
                  const c = CATEGORY_CONFIG[cat]
                  return (
                    <button key={cat} type="button"
                      onClick={() => setEditingPopup(p => ({ ...p, category: cat }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition active:scale-95 ${editingPopup.category === cat ? c.badgeClass : 'text-gray-400 border-gray-200 bg-white'}`}
                    >
                      {cat === '중요' && '★ '}{cat}
                    </button>
                  )
                })}
              </div>
              {/* Author */}
              <div className="flex flex-wrap gap-1">
                {AUTHORS.map((name) => (
                  <button key={name} type="button"
                    onClick={() => setEditingPopup(p => ({ ...p, author: p.author === name ? '' : name }))}
                    className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border transition active:scale-95 ${editingPopup.author === name ? getAuthorClass(name) : 'text-gray-400 bg-white border-gray-200'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {/* Text */}
              <textarea
                autoFocus
                value={editingPopup.text}
                onChange={(e) => setEditingPopup(p => ({ ...p, text: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 resize-none leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingPopup(null); setConfirmDialog({ message: 'Delete this item?', onConfirm: () => deleteTodo(editingPopup.id) }) }}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-current transition active:scale-95 hover:bg-orange-50"
                  style={monoOrange}
                >
                  Delete
                </button>
                {isModified ? (
                  <button onClick={saveEditPopup}
                    className="flex-1 py-2.5 rounded-xl text-sm text-white transition active:scale-95"
                    style={{ backgroundColor: '#E8694A', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Save
                  </button>
                ) : (
                  <button onClick={() => setEditingPopup(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm border border-current transition active:scale-95 hover:bg-orange-50"
                    style={monoOrange}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
          ref={listRef}
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
            const isDragging = draggedId === todo.id
            const isDragOver = dragOverId === todo.id && draggedId !== todo.id
            return (
              <div
                key={todo.id}
                data-todoid={todo.id}
                onClick={() => openEditPopup(todo)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(todo.id) }}
                onDrop={(e) => { e.preventDefault(); handleDrop(todo.id) }}
                onDragEnd={resetDrag}
                className={`flex gap-2.5 px-4 py-3 items-center cursor-pointer hover:bg-gray-50 transition ${
                  i < filtered.length - 1 ? 'border-b border-gray-100' : ''
                } ${todo.done ? 'opacity-50' : ''} ${isDragging ? 'opacity-30 bg-gray-50' : ''} ${
                  isDragOver ? 'border-t-2 border-indigo-400' : ''
                }`}
              >
                {/* 드래그 핸들 + 체크박스 + 카테고리 */}
                <div
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(todo.id) }}
                  onTouchStart={(e) => {
                    touchDragRef.current = { id: todo.id, overId: null, startX: e.touches[0].clientX, startY: e.touches[0].clientY, dragging: false }
                  }}
                  className="flex items-center gap-2 shrink-0 cursor-grab active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleDone(todo) }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition mt-0.5 ${
                      todo.done ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {todo.done && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-xs font-bold shrink-0 ${cfg.color}`}>{todo.category || '기타'}</span>
                </div>

                <p className={`flex-1 text-sm leading-snug break-all ${todo.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {todo.category === '중요' && <span className="text-amber-400 font-bold mr-1">★</span>}
                  {todo.text}
                </p>
                {todo.author && (
                  <span className={`shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 border ${getAuthorClass(todo.author)}`}>
                    {todo.author}
                  </span>
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

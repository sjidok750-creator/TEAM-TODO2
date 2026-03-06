import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuthorClass } from './authorConfig'
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

const CATEGORY_CONFIG = {
  '외업': { color: 'text-red-600' },
  '내업': { color: 'text-blue-600' },
  '기타': { color: 'text-green-600' },
}

export default function ProjectList({ onSelectProject }) {
  const [projects, setProjects] = useState([])
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const editNameRef = useRef(null)

  const closeMenu = useCallback(() => setOpenMenuId(null), [])
  useEffect(() => {
    if (!openMenuId) return
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [openMenuId, closeMenu])

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'todos'), (snap) => {
      setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (editingProjectId) editNameRef.current?.focus()
  }, [editingProjectId])

  async function addProject() {
    const name = input.trim()
    if (!name) return
    setInput('')
    await addDoc(collection(db, 'projects'), {
      name,
      createdAt: serverTimestamp(),
    })
  }

  async function deleteProject(e, project) {
    e.stopPropagation()
    if (!window.confirm(`"${project.name}" 용역을 삭제하면 모든 투두가 함께 삭제됩니다.\n계속하시겠습니까?`)) return
    const projectTodos = todos.filter((t) => t.projectId === project.id)
    await Promise.all(projectTodos.map((t) => deleteDoc(doc(db, 'todos', t.id))))
    await deleteDoc(doc(db, 'projects', project.id))
  }

  function startEditProject(e, project) {
    e.stopPropagation()
    setEditingProjectId(project.id)
    setEditingName(project.name)
  }

  async function saveProjectName(e, project) {
    e.stopPropagation()
    const name = editingName.trim()
    if (name && name !== project.name) {
      await updateDoc(doc(db, 'projects', project.id), { name })
    }
    setEditingProjectId(null)
  }

  function getProjectTodos(projectId) {
    return todos
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-2.5 max-w-2xl mx-auto flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-2 py-0.5">todo list</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Add project input */}
        <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500">새 용역 추가</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addProject()}
              placeholder="용역명을 입력하세요..."
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              maxLength={150}
            />
            <button
              onClick={addProject}
              disabled={!input.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition active:scale-95 shrink-0"
            >
              추가
            </button>
          </div>
        </div>

        {/* Project list */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 mb-2 px-1">현재 작업 중인 용역</h2>
          <div className="space-y-2">
            {loading && (
              <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
            )}
            {!loading && projects.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">용역을 추가하면 여기에 표시됩니다</p>
              </div>
            )}
            {projects.map((project) => {
              const projectTodos = getProjectTodos(project.id)
              const total = projectTodos.length
              const done = projectTodos.filter((t) => t.done).length
              const pct = total ? Math.round((done / total) * 100) : 0
              const isEditing = editingProjectId === project.id

              return (
                <div
                  key={project.id}
                  onClick={() => !isEditing && onSelectProject(project)}
                  className={`w-full bg-white rounded-lg border border-gray-100 px-4 py-3 text-left transition ${isEditing ? '' : 'hover:border-indigo-200 cursor-pointer active:bg-gray-50'}`}
                >
                  {/* 용역명 */}
                  {isEditing ? (
                    <input
                      ref={editNameRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveProjectName(e, project)
                        if (e.key === 'Escape') { e.stopPropagation(); setEditingProjectId(null) }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 border border-indigo-400 rounded text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      maxLength={150}
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-800 leading-snug break-words">
                      용역명 : {project.name}
                    </p>
                  )}

                  {/* TODO 목록 */}
                  <div className="mt-1.5 space-y-0.5">
                    {/* todo list 라벨 + ··· 버튼 */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-block font-mono text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-1.5 py-0.5">todo list</span>
                      <div className="relative">
                        {isEditing ? (
                          <button
                            onClick={(e) => saveProjectName(e, project)}
                            className="text-indigo-500 hover:text-indigo-700 transition p-1 rounded active:bg-indigo-50"
                            title="저장"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                            className="text-gray-400 hover:text-gray-600 transition px-1 py-0.5 rounded active:bg-gray-100 text-base leading-none font-bold tracking-tighter"
                            title="메뉴"
                          >
                            ···
                          </button>
                        )}
                        {openMenuId === project.id && (
                          <div className="absolute left-0 top-7 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[100px]">
                            <button
                              onClick={(e) => { startEditProject(e, project); setOpenMenuId(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.93l-3 1 1-3a4 4 0 01.93-1.414z" />
                              </svg>
                              수정
                            </button>
                            <button
                              onClick={(e) => { deleteProject(e, project); setOpenMenuId(null) }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 active:bg-red-100"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 투두 항목들 */}
                    {total === 0 && (
                      <p className="text-xs text-gray-400 ml-1">할 일을 추가해보세요</p>
                    )}
                    {projectTodos.map((todo) => {
                      const cfg = CATEGORY_CONFIG[todo.category] || CATEGORY_CONFIG['기타']
                      return (
                        <div key={todo.id} className="flex items-center gap-1">
                          <span className={`text-xs font-bold shrink-0 ${cfg.color}`}>
                            ({todo.category || '기타'})
                          </span>
                          <p className={`flex-1 text-xs break-all leading-snug ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {todo.text}
                          </p>
                          {todo.author && (
                            <span className={`shrink-0 ml-1 text-xs font-semibold rounded-full px-2 py-0.5 border ${getAuthorClass(todo.author)}`}>
                              {todo.author}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* 진행률 바 */}
                  {total > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{done} / {total} 완료</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

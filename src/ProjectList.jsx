import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'

const CATEGORY_CONFIG = {
  '외업': {
    color: 'text-red-600',
    borderClass: 'border-l-red-400',
  },
  '내업': {
    color: 'text-blue-600',
    borderClass: 'border-l-blue-400',
  },
  '기타': {
    color: 'text-green-600',
    borderClass: 'border-l-green-400',
  },
}

export default function ProjectList({ onSelectProject }) {
  const [projects, setProjects] = useState([])
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

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

  async function addProject() {
    const name = input.trim()
    if (!name) return
    setInput('')
    await addDoc(collection(db, 'projects'), {
      name,
      createdAt: serverTimestamp(),
    })
  }

  function getProjectTodos(projectId) {
    return todos
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-xl">📋</span>
          <h1 className="text-lg font-bold text-gray-800">팀 투두</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Add project input */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-500 mb-2">새 용역 추가</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addProject()}
              placeholder="용역명을 입력하세요... (예: [한국도로공사] 2026년 구조물 점검 용역)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              maxLength={150}
            />
            <button
              onClick={addProject}
              disabled={!input.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition active:scale-95 shrink-0"
            >
              추가
            </button>
          </div>
        </div>

        {/* Project list */}
        <div>
          <h2 className="text-sm font-bold text-gray-600 mb-3 px-1">현재 작업 중인 용역</h2>
          <div className="space-y-3">
            {loading && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-3xl mb-2 animate-pulse">⏳</div>
                <p className="text-sm">불러오는 중...</p>
              </div>
            )}
            {!loading && projects.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📁</div>
                <p className="text-sm">용역을 추가하면 여기에 표시됩니다</p>
              </div>
            )}
            {projects.map((project) => {
              const projectTodos = getProjectTodos(project.id)
              const total = projectTodos.length
              const done = projectTodos.filter((t) => t.done).length
              const pct = total ? Math.round((done / total) * 100) : 0
              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="w-full bg-white rounded-xl shadow-sm px-5 py-4 text-left hover:shadow-md hover:border-indigo-200 border border-transparent transition group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 용역명 */}
                      <p className="text-sm font-bold text-gray-800 leading-snug break-words">
                        용역명 : {project.name}
                      </p>

                      {/* TODO 목록 */}
                      <div className="mt-2 space-y-1">
                        <span className="inline-block font-mono text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-1.5 py-0.5">todo list</span>
                        {total === 0 && (
                          <p className="text-xs text-gray-400 ml-1">할 일을 추가해보세요</p>
                        )}
                        {projectTodos.map((todo) => {
                          const cfg = CATEGORY_CONFIG[todo.category] || CATEGORY_CONFIG['기타']
                          return (
                            <div key={todo.id} className="flex items-start gap-1.5 ml-1 flex-wrap">
                              {todo.author && (
                                <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 shrink-0">
                                  {todo.author}
                                </span>
                              )}
                              <span className={`text-xs font-bold shrink-0 ${cfg.color}`}>
                                ({todo.category || '기타'})
                              </span>
                              <p className={`text-xs break-words leading-snug ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {todo.text}
                              </p>
                            </div>
                          )
                        })}
                      </div>

                      {/* 진행률 바 */}
                      {total > 0 && (
                        <div className="mt-3 space-y-1">
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
                    <svg
                      className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition shrink-0 mt-1"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

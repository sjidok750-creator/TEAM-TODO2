import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuthorClass } from './authorConfig'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function MonthCalendarModal({ onClose }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

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
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
            return (
              <div
                key={i}
                className={`flex items-center justify-center w-8 h-8 mx-auto rounded-full text-sm font-medium transition ${
                  isToday ? 'bg-gray-900 text-white font-bold' : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                }`}
              >
                {day}
              </div>
            )
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition">닫기</button>
      </div>
    </div>
  )
}

function WeekCalendar() {
  const getToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => getToday())
  const [showMonthCal, setShowMonthCal] = useState(false)

  const today = getToday()

  const baseMonday = (() => {
    const dow = today.getDay()
    const offset = dow === 0 ? -6 : 1 - dow
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    return d
  })()

  const monday = new Date(baseMonday)
  monday.setDate(baseMonday.getDate() + weekOffset * 7)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const monthNum = monday.getMonth() + 1
  const endMonth = days[6].getMonth() + 1
  const monthLabel = monthNum === endMonth ? `${monthNum}월` : `${monthNum}-${endMonth}월`

  const weekNum = Math.ceil(
    (monday.getDate() + new Date(monday.getFullYear(), monday.getMonth(), 1).getDay()) / 7
  )

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-100 px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition active:scale-95"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{monthLabel} {weekNum}주차</span>
            <button
              onClick={() => setShowMonthCal(true)}
              className="text-lg leading-none hover:scale-110 transition active:scale-95"
              title="월 달력 보기"
            >
              📅
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => { setWeekOffset(0); setSelectedDate(today) }}
                className="text-[10px] font-semibold text-indigo-500 border border-indigo-300 rounded px-1.5 py-0.5 hover:bg-indigo-50 transition"
              >
                오늘
              </button>
            )}
          </div>

          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition active:scale-95"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const isToday = day.getTime() === today.getTime()
            const isSelected = !isToday && day.getTime() === selectedDate.getTime()

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(new Date(day))}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <span className="text-[11px] font-medium text-gray-400 tracking-wide">{DAY_LABELS[i]}</span>
                <div
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition ${
                    isToday
                      ? 'bg-gray-900 text-white'
                      : isSelected
                      ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {showMonthCal && <MonthCalendarModal onClose={() => setShowMonthCal(false)} />}
    </>
  )
}

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
  '중요': { color: 'text-amber-500' },
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
  const [showAddModal, setShowAddModal] = useState(false)
  const editNameRef = useRef(null)
  const addInputRef = useRef(null)

  const closeMenu = useCallback(() => setOpenMenuId(null), [])
  useEffect(() => {
    if (!openMenuId) return
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [openMenuId, closeMenu])

  useEffect(() => {
    if (showAddModal) setTimeout(() => addInputRef.current?.focus(), 50)
  }, [showAddModal])

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
    setShowAddModal(false)
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
        <div className="px-4 py-2.5 max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-2 py-0.5">
            todo list
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm transition active:scale-95"
            title="새 용역 추가"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Add Project Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setShowAddModal(false); setInput('') }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800 mb-3">새 용역 추가</p>
            <input
              ref={addInputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addProject()
                if (e.key === 'Escape') { setShowAddModal(false); setInput('') }
              }}
              placeholder="용역명을 입력하세요..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition mb-3"
              maxLength={150}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddModal(false); setInput('') }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition active:scale-95"
              >
                취소
              </button>
              <button
                onClick={addProject}
                disabled={!input.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed transition active:scale-95"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Week Calendar */}
        <WeekCalendar />

        {/* Project list */}
        <div>
          <div className="mb-2 px-1">
            <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 border border-orange-300 rounded px-2 py-0.5">
              W.I.P
            </span>
          </div>
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
                            {todo.category === '중요' && <span className="text-amber-400 font-bold mr-0.5">★</span>}
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

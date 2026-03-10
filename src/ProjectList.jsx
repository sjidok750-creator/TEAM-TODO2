import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuthorClass, getAuthorPhone } from './authorConfig'
import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'

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
      {/* 전화 확인 모달 */}
      {callTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setCallTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[260px]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#E8694A', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
              Call this number?
            </p>
            <p style={{ color: '#E8694A', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: '1rem' }}>
              {callTarget.name}
            </p>
            <p style={{ color: '#E8694A', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: '1.05rem', letterSpacing: '0.05em' }}>
              {callTarget.phone}
            </p>
            <div className="flex gap-3 mt-1 w-full">
              <button
                onClick={() => setCallTarget(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Cancel
              </button>
              <a
                href={`tel:${callTarget.phone.replace(/-/g, '')}`}
                onClick={() => setCallTarget(null)}
                className="flex-1 py-2 rounded-xl text-white text-sm text-center"
                style={{ backgroundColor: '#E8694A', fontFamily: "'JetBrains Mono', monospace" }}
              >
                Call
              </a>
            </div>
          </div>
        </div>
      )}
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

const CATEGORY_CONFIG = {
  '외업': { color: 'text-red-600' },
  '내업': { color: 'text-blue-600' },
  '중요': { color: 'text-amber-500' },
  '기타': { color: 'text-green-600' },
}

function formatFileName(name) {
  const lastDot = name.lastIndexOf('.')
  if (lastDot === -1) {
    return name.length > 4 ? name.slice(0, 4) + '...' : name
  }
  const base = name.slice(0, lastDot)
  const ext = name.slice(lastDot + 1)
  return base.slice(0, 4) + '...' + ext
}

export default function ProjectList({ onSelectProject }) {
  const [callTarget, setCallTarget] = useState(null) // { name, phone }
  const [projects, setProjects] = useState([])
  const [todos, setTodos] = useState([])
  const [notices, setNotices] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [input, setInput] = useState('')
  const [completionDate, setCompletionDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [noticeText, setNoticeText] = useState('')
  const [viewNotice, setViewNotice] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [downloadingId, setDownloadingId] = useState(null)
  const [viewingFile, setViewingFile] = useState(null)
  const [viewingFileId, setViewingFileId] = useState(null)
  const [editingDate, setEditingDate] = useState('')
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
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'sharedFiles'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setSharedFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
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
    setCompletionDate('')
    setShowAddModal(false)
    await addDoc(collection(db, 'projects'), {
      name,
      completionDate: completionDate.trim() || null,
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
    setEditingDate(project.completionDate || '')
  }

  async function saveProjectName(e, project) {
    e.stopPropagation()
    const name = editingName.trim()
    if (!name) { setEditingProjectId(null); return }
    await updateDoc(doc(db, 'projects', project.id), {
      name,
      completionDate: editingDate.trim() || null,
    })
    setEditingProjectId(null)
  }

  function getProjectTodos(projectId) {
    return todos
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => {
        const aOrder = a.order ?? a.createdAt?.toMillis?.() ?? 0
        const bOrder = b.order ?? b.createdAt?.toMillis?.() ?? 0
        return aOrder - bOrder
      })
  }

  async function addNotice() {
    const text = noticeText.trim()
    if (!text) return
    setNoticeText('')
    setShowNoticeModal(false)
    await addDoc(collection(db, 'notices'), { text, createdAt: serverTimestamp() })
  }

  async function deleteNotice(notice) {
    await deleteDoc(doc(db, 'notices', notice.id))
    setViewNotice(null)
  }

  // base64 청크 하나당 700,000자 ≈ Firestore 문서 ~700KB (한도 1MB 이내)
  const CHUNK_B64 = 700_000

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하만 업로드할 수 있습니다.')
      setFileInputKey(k => k + 1)
      return
    }
    setUploading(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const commaIdx = dataUrl.indexOf(',')
      const prefix = dataUrl.slice(0, commaIdx + 1)
      const b64 = dataUrl.slice(commaIdx + 1)

      if (b64.length <= CHUNK_B64) {
        // 소용량: 기존처럼 단일 문서에 저장
        await addDoc(collection(db, 'sharedFiles'), {
          name: file.name,
          data: dataUrl,
          size: file.size,
          type: file.type,
          createdAt: serverTimestamp(),
        })
      } else {
        // 대용량: 서브컬렉션 청크로 분할 저장
        const chunks = []
        for (let i = 0; i < b64.length; i += CHUNK_B64) {
          chunks.push(b64.slice(i, i + CHUNK_B64))
        }
        const metaRef = await addDoc(collection(db, 'sharedFiles'), {
          name: file.name,
          prefix,
          chunkCount: chunks.length,
          size: file.size,
          type: file.type,
          createdAt: serverTimestamp(),
        })
        await Promise.all(
          chunks.map((chunk, i) =>
            addDoc(collection(db, 'sharedFiles', metaRef.id, 'chunks'), {
              index: i,
              data: chunk,
            })
          )
        )
      }
    } catch (err) {
      console.error('파일 업로드 실패:', err)
      alert('파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      setFileInputKey(k => k + 1)
    }
  }

  async function downloadFile(file) {
    if (downloadingId) return
    // 단일 문서 형식
    if (file.data) {
      const a = document.createElement('a')
      a.href = file.data
      a.download = file.name
      a.click()
      return
    }
    // 구버전 Storage URL
    if (file.url) {
      window.open(file.url, '_blank')
      return
    }
    // 청크 재조합
    setDownloadingId(file.id)
    try {
      const snap = await getDocs(
        query(collection(db, 'sharedFiles', file.id, 'chunks'), orderBy('index'))
      )
      const b64 = snap.docs.map(d => d.data().data).join('')
      const dataUrl = file.prefix + b64
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = file.name
      a.click()
    } catch (err) {
      console.error('다운로드 실패:', err)
      alert('다운로드에 실패했습니다.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function deleteSharedFile(file) {
    if (file.chunkCount) {
      const snap = await getDocs(collection(db, 'sharedFiles', file.id, 'chunks'))
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
    }
    await deleteDoc(doc(db, 'sharedFiles', file.id))
  }

  async function viewFile(file) {
    if (viewingFileId) return
    // 구버전 Storage URL — 새 탭으로 열기
    if (file.url) { window.open(file.url, '_blank'); return }
    // 단일 문서
    if (file.data) {
      setViewingFile({ dataUrl: file.data, name: file.name, type: file.type || '' })
      return
    }
    // 청크 재조합
    setViewingFileId(file.id)
    try {
      const snap = await getDocs(
        query(collection(db, 'sharedFiles', file.id, 'chunks'), orderBy('index'))
      )
      const b64 = snap.docs.map(d => d.data().data).join('')
      setViewingFile({ dataUrl: file.prefix + b64, name: file.name, type: file.type || '' })
    } catch (err) {
      console.error('파일 로드 실패:', err)
      alert('파일을 불러오는데 실패했습니다.')
    } finally {
      setViewingFileId(null)
    }
  }

  function downloadCurrentFile() {
    if (!viewingFile?.dataUrl) return
    const a = document.createElement('a')
    a.href = viewingFile.dataUrl
    a.download = viewingFile.name
    a.click()
  }

  function handleExportPDF() {
    const now = new Date()
    const month = now.getMonth() + 1
    const dateStr = `${now.getFullYear()}-${String(month).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

    const catColors = {
      '외업': { text: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
      '내업': { text: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
      '중요': { text: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
      '기타': { text: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
    }
    const authorColors = {
      '이상국': { text: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
      '문남곤': { text: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
      '김종민': { text: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
      '나원진': { text: '#9333ea', bg: '#faf5ff', border: '#d8b4fe' },
      '하태욱': { text: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
      '김태현': { text: '#0d9488', bg: '#f0fdfa', border: '#5eead4' },
      '신창민': { text: '#4f46e5', bg: '#eef2ff', border: '#a5b4fc' },
      '권여린': { text: '#db2777', bg: '#fdf2f8', border: '#f9a8d4' },
    }

    const projectBlocks = projects.map((project, idx) => {
      const ptodos = getProjectTodos(project.id)
      const total = ptodos.length
      const done = ptodos.filter(t => t.done).length
      const pct = total ? Math.round((done / total) * 100) : 0

      const todoRows = ptodos.map(todo => {
        const cat = todo.category || '기타'
        const cc = catColors[cat] || catColors['기타']
        const ac = todo.author ? (authorColors[todo.author] || { text: '#6b7280', bg: '#f9fafb', border: '#d1d5db' }) : null
        const doneStyle = todo.done ? 'text-decoration:line-through;color:#9ca3af;' : ''
        return `<tr style="border-bottom:1px solid #f3f4f6;${todo.done ? 'opacity:0.6;' : ''}">
          <td style="width:46px;padding:2px 6px;vertical-align:middle;">
            <span style="display:inline-block;font-size:7.5pt;font-weight:700;padding:1px 5px;border-radius:3px;white-space:nowrap;color:${cc.text};background:${cc.bg};border:1px solid ${cc.border};">${cat === '중요' ? '★ ' : ''}${cat}</span>
          </td>
          <td style="padding:2px 6px;font-size:8.5pt;word-break:break-all;${doneStyle}">${todo.text}</td>
          <td style="width:42px;padding:2px 6px;text-align:right;vertical-align:middle;">
            ${ac ? `<span style="display:inline-block;font-size:7pt;font-weight:600;padding:1px 5px;border-radius:10px;white-space:nowrap;color:${ac.text};background:${ac.bg};border:1px solid ${ac.border};">${todo.author}</span>` : ''}
          </td>
        </tr>`
      }).join('')

      const progressBar = total > 0 ? `
        <div style="display:flex;align-items:center;gap:8px;padding:3px 8px;background:#fafafa;border-bottom:1px solid #e5e7eb;">
          <div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:#4f46e5;border-radius:2px;"></div>
          </div>
          <span style="font-size:7.5pt;color:#9ca3af;white-space:nowrap;">${done} / ${total} 완료</span>
        </div>` : ''

      return `<div style="margin-bottom:8px;border:1px solid #d1d5db;border-radius:3px;overflow:hidden;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:8px;background:#f3f4f6;padding:5px 8px;border-bottom:1px solid #d1d5db;">
          <span style="font-weight:700;font-size:9pt;color:#374151;min-width:18px;">${idx + 1}</span>
          <span style="font-weight:700;font-size:9pt;flex:1;">${project.name}</span>
          ${project.completionDate ? `<span style="font-size:8pt;color:#6b7280;white-space:nowrap;">준공 ${project.completionDate}</span>` : ''}
          <span style="font-size:8pt;font-weight:700;color:#4f46e5;white-space:nowrap;min-width:32px;text-align:right;">${pct}%</span>
        </div>
        ${progressBar}
        ${ptodos.length > 0
          ? `<table style="width:100%;border-collapse:collapse;"><tbody>${todoRows}</tbody></table>`
          : `<p style="font-size:8pt;color:#9ca3af;padding:4px 8px;">등록된 투두가 없습니다</p>`}
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>${month}월 과업진행현황(W.I.P)</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic','Apple SD Gothic Neo','Nanum Gothic',sans-serif; font-size: 9pt; color: #111; background: white; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #toolbar { display: none; }
    #content { margin-top: 0; }
  }
  #toolbar {
    position: fixed; top: 0; left: 0; right: 0; height: 46px;
    background: white; border-bottom: 1px solid #e5e7eb;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; z-index: 100; gap: 8px;
  }
  #toolbar .title { font-weight: 700; font-size: 10pt; color: #111; flex: 1; }
  #toolbar button {
    padding: 5px 14px; border-radius: 6px; font-size: 9pt; font-weight: 600;
    cursor: pointer; border: none; transition: opacity 0.1s;
  }
  #toolbar button:active { opacity: 0.7; }
  #btn-print { background: #4f46e5; color: white; }
  #btn-close { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
  #content { margin-top: 54px; }
</style></head><body>
<div id="toolbar">
  <span class="title">${month}월 과업진행현황(W.I.P)</span>
  <button id="btn-print" onclick="window.print()">인쇄</button>
  <button id="btn-close" onclick="window.close()">✕ 닫기</button>
</div>
<div id="content">
<div style="text-align:center;padding-bottom:10px;border-bottom:2.5px solid #111;margin-bottom:12px;">
  <div style="font-size:14pt;font-weight:700;letter-spacing:1px;margin-bottom:3px;">${month}월 과업진행현황(W.I.P)</div>
  <div style="font-size:8pt;color:#666;">출력일: ${dateStr} &nbsp;|&nbsp; 총 ${projects.length}건</div>
</div>
${projectBlocks}
<div style="margin-top:14px;padding-top:6px;border-top:1px solid #d1d5db;font-size:7.5pt;color:#9ca3af;text-align:right;">* 본 문서는 팀 투두 시스템에서 자동 생성되었습니다</div>
</div>
</body></html>`

    const win = window.open('', '_blank')
    if (!win) { alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
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

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
            <span className="text-white text-sm font-medium truncate max-w-xs">{viewingFile.name}</span>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={downloadCurrentFile}
                className="text-xs text-gray-300 border border-gray-500 rounded px-3 py-1.5 hover:bg-gray-700 transition"
              >
                다운로드
              </button>
              <button
                onClick={() => setViewingFile(null)}
                className="w-8 h-8 flex items-center justify-center text-white text-lg rounded hover:bg-gray-700 transition"
                title="닫기"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            {viewingFile.type.startsWith('image/') ? (
              <img
                src={viewingFile.dataUrl}
                alt={viewingFile.name}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            ) : viewingFile.type === 'application/pdf' ? (
              <iframe
                src={viewingFile.dataUrl}
                className="w-full h-full rounded"
                title={viewingFile.name}
              />
            ) : (
              <div className="text-center text-white">
                <p className="text-gray-400 mb-5 text-sm">이 파일 형식은 미리보기를 지원하지 않습니다.</p>
                <button
                  onClick={downloadCurrentFile}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition active:scale-95"
                >
                  다운로드
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setShowAddModal(false); setInput(''); setCompletionDate('') }}
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
                if (e.key === 'Escape') { setShowAddModal(false); setInput(''); setCompletionDate('') }
              }}
              placeholder="용역명을 입력하세요..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition mb-3"
              maxLength={150}
            />
            <label className="block text-xs font-medium text-gray-500 mb-1">준공일 (YY/MM/DD)</label>
            <input
              type="text"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addProject()
                if (e.key === 'Escape') { setShowAddModal(false); setInput(''); setCompletionDate('') }
              }}
              placeholder="예: 26/12/31"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition mb-4"
              maxLength={8}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddModal(false); setInput(''); setCompletionDate('') }}
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

      {/* Add Notice Modal */}
      {showNoticeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setShowNoticeModal(false); setNoticeText('') }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800 mb-3">공지사항 추가</p>
            <textarea
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowNoticeModal(false); setNoticeText('') }
              }}
              placeholder="공지사항을 입력하세요..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none h-28 transition mb-3"
              autoFocus
              maxLength={500}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNoticeModal(false); setNoticeText('') }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition active:scale-95"
              >
                취소
              </button>
              <button
                onClick={addNotice}
                disabled={!noticeText.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:cursor-not-allowed transition active:scale-95"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Notice Modal */}
      {viewNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setViewNotice(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 w-80 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L22 21H2L12 3Z" fill="#E8694A"/>
                <path d="M12 9.5V15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="18" r="1.1" fill="white"/>
              </svg>
              <p className="text-sm font-bold text-gray-800">공지사항</p>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-5">{viewNotice.text}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setViewNotice(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition active:scale-95"
              >
                닫기
              </button>
              <button
                onClick={() => deleteNotice(viewNotice)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition active:scale-95"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Week Calendar */}
        <WeekCalendar />

        {/* 공지사항 + 공유파일 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* 공지사항 row */}
          <div className="flex items-start gap-2 px-3 py-2 border-b border-gray-100">
            <button
              onClick={() => setShowNoticeModal(true)}
              className="shrink-0 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-200 transition whitespace-nowrap mt-0.5"
            >
              공지사항
            </button>
            <div className="flex-1 min-w-0 space-y-0.5">
              {notices.length === 0 && (
                <p className="text-xs text-gray-400 py-0.5">+추가를 클릭하세요</p>
              )}
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => setViewNotice(notice)}
                  className="cursor-pointer flex items-center gap-1 leading-5 hover:text-indigo-600 transition min-w-0"
                  title={notice.text}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3L22 21H2L12 3Z" fill="#E8694A"/>
                    <path d="M12 9.5V15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="18" r="1.1" fill="white"/>
                  </svg>
                  <span className="text-xs text-gray-700 truncate">{notice.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 공유파일 row */}
          <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
            <label
              className={`shrink-0 text-xs font-bold text-gray-700 bg-gray-100 border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-200 transition whitespace-nowrap cursor-pointer select-none ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploading ? '업로드중...' : '공유파일'}
              <input
                key={fileInputKey}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            {sharedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-xs"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); viewFile(file) }}
                  disabled={viewingFileId === file.id}
                  className="text-gray-700 hover:text-indigo-600 transition disabled:opacity-50"
                  title={file.name}
                >
                  {viewingFileId === file.id ? '로딩중...' : formatFileName(file.name)}
                </button>
                <button
                  onClick={() => deleteSharedFile(file)}
                  className="text-gray-300 hover:text-red-400 transition shrink-0 leading-none"
                  title="삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

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
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={editNameRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveProjectName(e, project)
                          if (e.key === 'Escape') { e.stopPropagation(); setEditingProjectId(null) }
                        }}
                        placeholder="용역명"
                        className="w-full px-2 py-1 border border-indigo-400 rounded text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        maxLength={150}
                      />
                      <input
                        type="text"
                        value={editingDate}
                        onChange={(e) => setEditingDate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveProjectName(e, project)
                          if (e.key === 'Escape') { e.stopPropagation(); setEditingProjectId(null) }
                        }}
                        placeholder="준공일 YY/MM/DD (예: 26/12/31)"
                        className="mt-1.5 w-full px-2 py-1 border border-indigo-200 rounded text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        maxLength={8}
                      />
                    </div>
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
                      {project.completionDate && (
                        <span
                          className="inline-block text-xs font-normal text-orange-500 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          SCD {project.completionDate}
                        </span>
                      )}
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
                          {todo.author && (() => {
                            const phone = getAuthorPhone(todo.author)
                            return phone ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCallTarget({ name: todo.author, phone })
                                }}
                                className={`shrink-0 ml-1 text-xs font-semibold rounded-full px-2 py-0.5 border ${getAuthorClass(todo.author)} active:opacity-70 transition`}
                                title={`${todo.author} 에게 전화`}
                              >
                                {todo.author}
                              </button>
                            ) : (
                              <span className={`shrink-0 ml-1 text-xs font-semibold rounded-full px-2 py-0.5 border ${getAuthorClass(todo.author)}`}>
                                {todo.author}
                              </span>
                            )
                          })()}
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
          {/* PDF 내보내기 버튼 */}
          <div className="flex justify-end mt-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-2.5 py-1 hover:bg-orange-100 transition active:scale-95"
              title="WIP 현황을 PDF로 내보내기"
            >
              W.I.P PDF
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

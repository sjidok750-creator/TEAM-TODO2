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

// 한국 공휴일 (고정)
const FIXED_HOLIDAYS = {
  '01-01': '신정', '03-01': '삼일절', '05-05': '어린이날',
  '06-06': '현충일', '08-15': '광복절', '10-03': '개천절',
  '10-09': '한글날', '12-25': '크리스마스',
}
// 음력 공휴일 (연도별 양력)
const LUNAR_HOLIDAYS = {
  2025: new Set(['2025-01-28','2025-01-29','2025-01-30','2025-05-06','2025-10-05','2025-10-06','2025-10-07','2025-10-08']),
  2026: new Set(['2026-02-15','2026-02-16','2026-02-17','2026-02-18','2026-09-23','2026-09-24','2026-09-25','2026-09-26']),
}
function isHoliday(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  if (FIXED_HOLIDAYS[`${mm}-${dd}`]) return true
  const ymd = `${year}-${mm}-${dd}`
  return LUNAR_HOLIDAYS[year]?.has(ymd) ?? false
}

function MonthCalendarModal({ onClose }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startDow = firstDay.getDay()

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)

  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const mono = { fontFamily: "'JetBrains Mono', monospace", color: '#E8694A' }

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
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-orange-50 transition active:scale-95">
            <svg className="w-4 h-4" style={{ color: '#E8694A' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold" style={mono}>{viewYear} {monthNames[viewMonth]}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-orange-50 transition active:scale-95">
            <svg className="w-4 h-4" style={{ color: '#E8694A' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d, i) => (
            <div
              key={d}
              className="text-center text-[9px] font-semibold py-1"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#E8694A' }}
            >{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dow = new Date(viewYear, viewMonth, day).getDay()
            const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
            const holiday = isHoliday(viewYear, viewMonth, day)
            const isSun = dow === 0
            const isSat = dow === 6
            let txtColor = '#E8694A'
            if (isToday) txtColor = 'white'
            else if (holiday || isSun) txtColor = '#ef4444'
            else if (isSat) txtColor = '#3b82f6'
            return (
              <div key={i} className="flex flex-col items-center py-0.5">
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-xs ${isToday ? 'font-bold' : 'font-medium'}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: txtColor, backgroundColor: isToday ? '#E8694A' : 'transparent' }}
                >
                  {day}
                </span>
                {holiday && !isToday && <span className="w-1 h-1 rounded-full bg-red-400 mt-0.5" />}
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-orange-100 flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px]" style={mono}>
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block"/> HOLIDAY
          </span>
          <span className="flex items-center gap-1 text-[11px]" style={mono}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#E8694A' }}/> TODAY
          </span>
        </div>
      </div>
    </div>
  )
}

const CATEGORY_CONFIG = {
  '외업': { color: 'text-red-600' },
  '내업': { color: 'text-blue-600' },
  '중요': { color: 'text-amber-500' },
  '기타': { color: 'text-green-600' },
}

function getItemYear(item) {
  if (item.year) return item.year
  const ts = item.createdAt
  if (!ts) return new Date().getFullYear()
  if (typeof ts.toDate === 'function') return ts.toDate().getFullYear()
  if (ts.seconds) return new Date(ts.seconds * 1000).getFullYear()
  return new Date().getFullYear()
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
  const [confirmDialog, setConfirmDialog] = useState(null) // { message, onConfirm }
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
  const [showMonthCal, setShowMonthCal] = useState(false)
  const [noticeText, setNoticeText] = useState('')
  const [viewNotice, setViewNotice] = useState(null)
  const [editNoticeText, setEditNoticeText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [downloadingId, setDownloadingId] = useState(null)
  const [viewingFile, setViewingFile] = useState(null)
  const [viewingFileId, setViewingFileId] = useState(null)
  const [editingDate, setEditingDate] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showYearPicker, setShowYearPicker] = useState(false)
  const editNameRef = useRef(null)
  const addInputRef = useRef(null)
  const pullRef = useRef({ startY: 0, pulling: false })
  const [pullDist, setPullDist] = useState(0)

  function onPullStart(e) {
    if (window.scrollY === 0) pullRef.current = { startY: e.touches[0].clientY, pulling: true }
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

  const closeMenu = useCallback(() => setOpenMenuId(null), [])
  useEffect(() => {
    if (!openMenuId) return
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [openMenuId, closeMenu])

  const closeYearPicker = useCallback(() => setShowYearPicker(false), [])
  useEffect(() => {
    if (!showYearPicker) return
    document.addEventListener('click', closeYearPicker)
    return () => document.removeEventListener('click', closeYearPicker)
  }, [showYearPicker, closeYearPicker])

  useEffect(() => {
    if (showAddModal) setTimeout(() => addInputRef.current?.focus(), 50)
  }, [showAddModal])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      all.sort((a, b) => {
        if (!!a.closed !== !!b.closed) return a.closed ? 1 : -1
        const aO = a.order ?? a.createdAt?.toMillis?.() ?? 0
        const bO = b.order ?? b.createdAt?.toMillis?.() ?? 0
        return aO - bO
      })
      setProjects(all)
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
      year: selectedYear,
      createdAt: serverTimestamp(),
    })
  }

  async function moveProject(project, direction) {
    const active = projects.filter(p => !p.closed)
    const idx = active.findIndex(p => p.id === project.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= active.length) return
    const newArr = [...active]
    ;[newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]]
    await Promise.all(newArr.map((p, i) => updateDoc(doc(db, 'projects', p.id), { order: i * 1000 })))
  }

  async function closeProject(e, project) {
    e.stopPropagation()
    await updateDoc(doc(db, 'projects', project.id), { closed: true })
  }

  async function continueProject(e, project) {
    e.stopPropagation()
    await updateDoc(doc(db, 'projects', project.id), { closed: false })
  }

  function deleteProject(e, project) {
    e.stopPropagation()
    setConfirmDialog({
      message: `"${project.name}" 삭제하시겠습니까?`,
      onConfirm: () => {
        setConfirmDialog({
          message: `Are you sure? This will permanently delete the project and all its tasks.`,
          onConfirm: async () => {
            const projectTodos = todos.filter((t) => t.projectId === project.id)
            await Promise.all(projectTodos.map((t) => deleteDoc(doc(db, 'todos', t.id))))
            await deleteDoc(doc(db, 'projects', project.id))
          },
        })
      },
    })
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
    await addDoc(collection(db, 'notices'), { text, year: selectedYear, createdAt: serverTimestamp() })
  }

  async function deleteNotice(notice) {
    await deleteDoc(doc(db, 'notices', notice.id))
    setViewNotice(null)
  }

  async function saveNotice() {
    const text = editNoticeText.trim()
    if (!text) return
    await updateDoc(doc(db, 'notices', viewNotice.id), { text })
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
          year: selectedYear,
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
          year: selectedYear,
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

  const filteredProjects = projects.filter(p => getItemYear(p) === selectedYear)
  const filteredNotices = notices.filter(n => getItemYear(n) === selectedYear)
  const filteredFiles = sharedFiles.filter(f => getItemYear(f) === selectedYear)

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

    const projectBlocks = filteredProjects.map((project, idx) => {
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

      return `<div style="margin-bottom:8px;border:1px solid #d1d5db;border-radius:3px;overflow:hidden;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:8px;background:#f3f4f6;padding:5px 8px;border-bottom:1px solid #d1d5db;">
          <span style="font-weight:700;font-size:9pt;color:#374151;min-width:18px;">${idx + 1}</span>
          <span style="font-weight:700;font-size:9pt;flex:1;">${project.name}${project.completionDate ? `<span style="font-weight:400;font-size:8pt;color:#6b7280;margin-left:6px;">(준공 ${project.completionDate})</span>` : ''}</span>
          <span style="font-size:8pt;font-weight:700;color:#E8694A;white-space:nowrap;min-width:32px;text-align:right;">${pct}%</span>
        </div>
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
  <div style="font-size:8pt;color:#666;">출력일: ${dateStr} &nbsp;|&nbsp; 총 ${filteredProjects.length}건</div>
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
    <div
      className="min-h-screen bg-gray-50"
      onTouchStart={onPullStart}
      onTouchMove={onPullMove}
      onTouchEnd={onPullEnd}
    >
      {/* Pull-to-refresh 인디케이터 */}
      {pullDist > 10 && (
        <div
          className="fixed top-0 left-1/2 z-50 flex items-center justify-center transition-all"
          style={{ transform: `translateX(-50%) translateY(${pullDist - 20}px)` }}
        >
          <div className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center ${pullDist >= 55 ? 'text-orange-500' : 'text-gray-400'}`}>
            <svg className={`w-5 h-5 ${pullDist >= 55 ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )}
      {/* 전화 확인 모달 */}
      {callTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setCallTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: '#E8694A', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: '1.15rem' }}>
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
            <p style={{ color: '#E8694A', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: '1rem', textAlign: 'center' }}>
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {confirmDialog.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}
                className="flex-1 py-2 rounded-xl text-white text-sm"
                style={{ backgroundColor: '#E8694A', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {confirmDialog.confirmLabel ?? 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 달력 모달 */}
      {showMonthCal && <MonthCalendarModal onClose={() => setShowMonthCal(false)} />}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-2.5 max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-2.5 py-1 leading-tight">
              TODO LIST
            </span>
            {(() => {
              const d = new Date()
              const mm = String(d.getMonth() + 1).padStart(2, '0')
              const dd = String(d.getDate()).padStart(2, '0')
              const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT']
              return (
                <span className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E8694A' }}>
                  {mm}/{dd}({dayNames[d.getDay()]})
                </span>
              )
            })()}
            <button
              onClick={() => setShowMonthCal(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition active:scale-95"
              title="달력 보기"
            >
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
              </svg>
            </button>
            {/* 년도 선택기 */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowYearPicker(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition active:scale-95"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E8694A', fontSize: '0.8rem', fontWeight: 700 }}
                title="년도 선택"
              >
                {selectedYear}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showYearPicker && (
                <div className="absolute left-0 top-9 bg-white border border-orange-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[72px]">
                  {Array.from({ length: 5 }, (_, i) => 2026 + i).map(yr => (
                    <button
                      key={yr}
                      onClick={() => { setSelectedYear(yr); setShowYearPicker(false) }}
                      className="w-full text-center px-4 py-2 text-sm hover:bg-orange-50 transition active:bg-orange-100"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#E8694A',
                        fontWeight: yr === selectedYear ? 700 : 400,
                        background: yr === selectedYear ? '#fff7ed' : undefined,
                      }}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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

      {/* View / Edit Notice Modal */}
      {viewNotice && (() => {
        const noticeModified = editNoticeText.trim() !== viewNotice.text
        const monoOrange = { fontFamily: "'JetBrains Mono', monospace", color: '#E8694A' }
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setViewNotice(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl p-5 w-80 max-w-sm flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L22 21H2L12 3Z" fill="#E8694A"/>
                  <path d="M12 9.5V15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="18" r="1.1" fill="white"/>
                </svg>
                <p className="text-sm font-bold" style={monoOrange}>Notice</p>
              </div>
              <textarea
                autoFocus
                value={editNoticeText}
                onChange={(e) => setEditNoticeText(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 resize-none leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDialog({ message: 'Delete this notice?', cancelLabel: 'No', confirmLabel: 'Yes', onConfirm: () => deleteNotice(viewNotice) })}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-current transition active:scale-95 hover:bg-orange-50"
                  style={monoOrange}
                >
                  Delete
                </button>
                {noticeModified ? (
                  <button
                    onClick={saveNotice}
                    className="flex-1 py-2.5 rounded-xl text-sm text-white transition active:scale-95"
                    style={{ backgroundColor: '#E8694A', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => setViewNotice(null)}
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

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
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
              {filteredNotices.length === 0 && (
                <p className="text-xs text-gray-400 py-0.5">+추가를 클릭하세요</p>
              )}
              {filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => { setViewNotice(notice); setEditNoticeText(notice.text) }}
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
            {filteredFiles.map((file) => (
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
                  onClick={() => setConfirmDialog({ message: `"${file.name}" 파일을 삭제하시겠습니까?`, onConfirm: () => deleteSharedFile(file) })}
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
            {!loading && filteredProjects.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">{selectedYear}년 용역을 추가하면 여기에 표시됩니다</p>
              </div>
            )}
            {filteredProjects.map((project) => {
              const projectTodos = getProjectTodos(project.id)
              const total = projectTodos.length
              const done = projectTodos.filter((t) => t.done).length
              const pct = total ? Math.round((done / total) * 100) : 0
              const isEditing = editingProjectId === project.id
              const isClosed = !!project.closed
              const activeProjects = filteredProjects.filter(p => !p.closed)
              const projIdx = activeProjects.findIndex(p => p.id === project.id)

              const menuStyle = { fontFamily: "'JetBrains Mono', monospace", color: '#E8694A' }
              const menuBtn = 'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-orange-50 active:bg-orange-100 whitespace-nowrap'

              return (
                <div key={project.id} className="relative">
                  {/* 카드 본문 — closed 시 blur + pointer-events 차단 */}
                  <div
                    onClick={() => !isEditing && !isClosed && onSelectProject(project)}
                    className={`w-full bg-white rounded-lg border border-gray-100 px-4 py-3 text-left transition ${
                      isClosed ? 'blur-[1.5px] opacity-40 pointer-events-none select-none' :
                      isEditing ? '' : 'hover:border-indigo-200 cursor-pointer active:bg-gray-50'
                    }`}
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
                      {/* todo list 라벨 + SCD + ··· 버튼 */}
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block font-mono text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-300 rounded px-1.5 py-0.5">todo list</span>
                        {project.completionDate && (
                          <span
                            className="inline-block text-xs font-normal text-orange-500 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            SCD {project.completionDate}
                          </span>
                        )}
                        {/* ··· 버튼 */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
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
                            <div className="absolute left-0 top-7 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                              <button
                                disabled={projIdx === 0}
                                onClick={(e) => { e.stopPropagation(); moveProject(project, 'up'); setOpenMenuId(null) }}
                                style={menuStyle}
                                className={`${menuBtn} disabled:opacity-30 disabled:pointer-events-none`}
                              >
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                                UP ↑
                              </button>
                              <button
                                disabled={projIdx === activeProjects.length - 1}
                                onClick={(e) => { e.stopPropagation(); moveProject(project, 'down'); setOpenMenuId(null) }}
                                style={menuStyle}
                                className={`${menuBtn} disabled:opacity-30 disabled:pointer-events-none`}
                              >
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                                DOWN ↓
                              </button>
                              <div className="border-t border-orange-100" />
                              <button
                                onClick={(e) => { startEditProject(e, project); setOpenMenuId(null) }}
                                style={menuStyle}
                                className={menuBtn}
                              >
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.93l-3 1 1-3a4 4 0 01.93-1.414z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={(e) => { deleteProject(e, project); setOpenMenuId(null) }}
                                style={menuStyle}
                                className={menuBtn}
                              >
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                              <div className="border-t border-orange-100" />
                              <button
                                onClick={(e) => { closeProject(e, project); setOpenMenuId(null) }}
                                style={menuStyle}
                                className={menuBtn}
                              >
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Close (END)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

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
                                  onClick={(e) => { e.stopPropagation(); setCallTarget({ name: todo.author, phone }) }}
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
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: '#E8694A' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* END 오버레이 — closed 시 클릭 가능 */}
                  {isClosed && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                      <button
                        onClick={() => setConfirmDialog({
                          message: 'Continue?',
                          cancelLabel: 'NO',
                          confirmLabel: 'YES',
                          onConfirm: () => continueProject({ stopPropagation: () => {} }, project),
                        })}
                        className="text-5xl font-bold tracking-[0.3em] opacity-60 hover:opacity-90 transition active:scale-95"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: '#E8694A', background: 'none', border: 'none' }}
                      >
                        END
                      </button>
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

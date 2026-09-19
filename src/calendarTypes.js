// 일정 종류별 색·우선순위.
// 달력 칸의 알약, 상세 목록의 배지, 하단 범례가 전부 이 표 하나를 본다.
// 같은 날에 여러 건이 있으면 priority 가 낮은 것(준공→현안→중요…)이 먼저 보인다.
export const ENTRY_TYPES = {
  due:    { label: '준공', priority: 0, pill: 'bg-[#E8694A] text-white', dot: 'bg-[#E8694A]', text: 'text-[#E8694A]' },
  '현안': { label: '현안', priority: 1, pill: 'bg-red-500 text-white',       dot: 'bg-red-500',     text: 'text-red-600' },
  '중요': { label: '중요', priority: 2, pill: 'bg-amber-400 text-amber-950', dot: 'bg-amber-400',   text: 'text-amber-600' },
  '외업': { label: '외업', priority: 3, pill: 'bg-blue-500 text-white',      dot: 'bg-blue-500',    text: 'text-blue-600' },
  '내업': { label: '내업', priority: 4, pill: 'bg-emerald-500 text-white',   dot: 'bg-emerald-500', text: 'text-emerald-600' },
  '기타': { label: '기타', priority: 5, pill: 'bg-slate-400 text-white',     dot: 'bg-slate-400',   text: 'text-slate-500' },
}

export const LEGEND_ORDER = ['due', '현안', '중요', '외업', '내업', '기타']

// 달력 항목({kind:'due'} | {kind:'todo'}) → 종류 키
export function typeOf(entry) {
  if (entry.kind === 'due') return 'due'
  const c = entry.todo?.category
  return c && ENTRY_TYPES[c] ? c : '기타'
}

export function styleOf(entry) {
  return ENTRY_TYPES[typeOf(entry)]
}

// 용역명 앞의 번호("08. ")와 연도("2026년 ") 접두를 뗀다.
// 용역명이 "NN. YYYY년 이름" 꼴이라, 좁은 달력 칸에서는 두 접두가 실제 이름을 밀어낸다.
// 정식 명칭이 필요한 곳(준공 카드 제목)은 원본 name 을 그대로 쓴다.
export function stripProjectNumber(name) {
  return (name || '')
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/^\s*(?:19|20)\d{2}\s*년\s*/, '')
    .trim()
}

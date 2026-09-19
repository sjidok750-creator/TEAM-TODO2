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

// month 는 0-based (Date.getMonth() 와 동일)
export function isHoliday(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  if (FIXED_HOLIDAYS[`${mm}-${dd}`]) return true
  const ymd = `${year}-${mm}-${dd}`
  return LUNAR_HOLIDAYS[year]?.has(ymd) ?? false
}

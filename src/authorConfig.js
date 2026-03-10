export const AUTHOR_CONFIG = {
  '이상국': { class: 'text-red-600 bg-red-50 border-red-300',     phone: '010-3356-4603' },
  '문남곤': { class: 'text-blue-600 bg-blue-50 border-blue-300',   phone: '010-4918-2624' },
  '김종민': { class: 'text-emerald-600 bg-emerald-50 border-emerald-300', phone: '010-2999-5062' },
  '나원진': { class: 'text-purple-600 bg-purple-50 border-purple-300', phone: '010-2756-1149' },
  '하태욱': { class: 'text-orange-600 bg-orange-50 border-orange-300', phone: '010-9788-1135' },
  '김태현': { class: 'text-teal-600 bg-teal-50 border-teal-300',   phone: '010-9281-6741' },
  '신창민': { class: 'text-indigo-600 bg-indigo-50 border-indigo-300', phone: '010-5531-4908' },
  '권여린': { class: 'text-pink-600 bg-pink-50 border-pink-300',   phone: null },
}

export const AUTHORS = Object.keys(AUTHOR_CONFIG)

export function getAuthorClass(author) {
  return AUTHOR_CONFIG[author]?.class ?? 'text-gray-600 bg-gray-50 border-gray-300'
}

export function getAuthorPhone(author) {
  return AUTHOR_CONFIG[author]?.phone ?? null
}

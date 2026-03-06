export const AUTHOR_CONFIG = {
  '이상국': 'text-red-600 bg-red-50 border-red-300',
  '문남곤': 'text-blue-600 bg-blue-50 border-blue-300',
  '김종민': 'text-emerald-600 bg-emerald-50 border-emerald-300',
  '나원진': 'text-purple-600 bg-purple-50 border-purple-300',
  '하태욱': 'text-orange-600 bg-orange-50 border-orange-300',
  '김태현': 'text-teal-600 bg-teal-50 border-teal-300',
  '신창민': 'text-indigo-600 bg-indigo-50 border-indigo-300',
  '권여린': 'text-pink-600 bg-pink-50 border-pink-300',
}

export const AUTHORS = Object.keys(AUTHOR_CONFIG)

export function getAuthorClass(author) {
  return AUTHOR_CONFIG[author] ?? 'text-gray-600 bg-gray-50 border-gray-300'
}

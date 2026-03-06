import { useState } from 'react'

export default function NicknameGate({ onEnter }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('닉네임을 입력해주세요.')
      return
    }
    if (trimmed.length > 20) {
      setError('닉네임은 20자 이내로 입력해주세요.')
      return
    }
    onEnter(trimmed)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-gray-800">팀 투두</h1>
          <p className="text-sm text-gray-500 mt-1">팀원들과 실시간으로 할 일을 공유하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              placeholder="사용할 닉네임을 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              autoFocus
              maxLength={20}
            />
            {error && (
              <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-lg transition active:scale-95"
          >
            시작하기
          </button>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import NicknameGate from './NicknameGate'
import TodoApp from './TodoApp'

const STORAGE_KEY = 'team-todo-nickname'

export default function App() {
  const [nickname, setNickname] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

  function handleEnter(name) {
    localStorage.setItem(STORAGE_KEY, name)
    setNickname(name)
  }

  function handleChangeNickname() {
    localStorage.removeItem(STORAGE_KEY)
    setNickname('')
  }

  if (!nickname) {
    return <NicknameGate onEnter={handleEnter} />
  }

  return <TodoApp nickname={nickname} onChangeNickname={handleChangeNickname} />
}

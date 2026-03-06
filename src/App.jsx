import { useState } from 'react'
import NicknameGate from './NicknameGate'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'

const STORAGE_KEY = 'team-todo-nickname'

export default function App() {
  const [nickname, setNickname] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [currentProject, setCurrentProject] = useState(null)

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

  if (currentProject) {
    return (
      <ProjectDetail
        project={currentProject}
        nickname={nickname}
        onBack={() => setCurrentProject(null)}
      />
    )
  }

  return (
    <ProjectList
      nickname={nickname}
      onChangeNickname={handleChangeNickname}
      onSelectProject={setCurrentProject}
    />
  )
}

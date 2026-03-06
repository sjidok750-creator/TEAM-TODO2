import { useState } from 'react'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'

export default function App() {
  const [currentProject, setCurrentProject] = useState(null)

  if (currentProject) {
    return (
      <ProjectDetail
        project={currentProject}
        onBack={() => setCurrentProject(null)}
      />
    )
  }

  return (
    <ProjectList
      onSelectProject={setCurrentProject}
    />
  )
}

import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [projectId, setProjectId] = useState(() => {
    const saved = window.localStorage.getItem('projectId')
    const parsed = saved ? parseInt(saved, 10) : 1001
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1001
  })
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(() => window.localStorage.getItem('direction') === 'rtl' ? 'rtl' : 'ltr')

  const handleProjectIdChange = (id: number) => {
    if (Number.isInteger(id) && id > 0) {
      setProjectId(id)
      localStorage.setItem('projectId', id.toString())
    }
  }

  useEffect(() => {
    document.documentElement.dir = direction
    window.localStorage.setItem('direction', direction)
  }, [direction])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-shell min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ps-64">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          projectId={projectId}
          onProjectIdChange={handleProjectIdChange}
        />
        
        <main className="app-main p-4 sm:p-6 lg:p-8">
          <Outlet context={{ projectId, onProjectIdChange: handleProjectIdChange, direction, onDirectionChange: setDirection }} />
        </main>
      </div>
    </div>
  )
}

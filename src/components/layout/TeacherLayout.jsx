import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

const TITLES = {
  '/teacher':           'Dashboard',
  '/teacher/classes':   'My Classes',
  '/teacher/grades':    'Grade Book',
  '/teacher/schedule':  'Schedule',
  '/teacher/messages':      'Messages',
  '/teacher/calendar':      'Academic Calendar',
  '/teacher/meetings':      'My Meetings',
  '/teacher/conduct':       'Student Conduct',
}

export default function TeacherLayout() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'BLE Worldwide'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}
      <div className="main-content">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(o => !o)} />
        <div className="page-content"><Outlet /></div>
      </div>
    </div>
  )
}

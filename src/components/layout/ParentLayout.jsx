import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

const TITLES = {
  '/parent':           'Dashboard',
  '/parent/progress':  'Progress Report',
  '/parent/schedule':  'Class Schedule',
  '/parent/messages':  'Messages',
  '/parent/billing':    'Billing & Enrollment',
  '/parent/calendar':   'School Calendar',
  '/parent/meetings':   'Meetings & Conferences',
}

export default function ParentLayout() {
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

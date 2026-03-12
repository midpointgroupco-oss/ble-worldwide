import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

const TITLES = {
  '/admin':           'Dashboard',
  '/admin/students':  'Students',
  '/admin/staff':     'Staff Management',
  '/admin/schedule':  'Schedule',
  '/admin/grades':    'Grade Book',
  '/admin/messages':  'Messages',
  '/admin/calendar':  'Academic Calendar',
  '/admin/meetings':  'Class Meetings',
  '/admin/conduct':      'Student Conduct',
  '/admin/conferences':  'Parent-Teacher Conferences',
  '/admin/id-cards':     'Student ID Cards',
  '/admin/reports':   'Reports & Analytics',
  '/admin/settings':  'Settings',
}

export default function AdminLayout() {
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

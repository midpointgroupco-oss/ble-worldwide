import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'

const ROLE_CONFIG = {
  admin: {
    badge: 'Admin', color: 'av-1',
    nav: [
      { section: 'Main', items: [
        { to: '/admin',               icon: '🏠', label: 'Dashboard',        exact: true },
        { to: '/admin/students',      icon: '👥', label: 'Students' },
        { to: '/admin/schedule',      icon: '📅', label: 'Schedule' },
        { to: '/admin/grades',        icon: '📊', label: 'Grade Book' },
        { to: '/admin/messages',      icon: '💬', label: 'Messages', badge: true },
        { to: '/admin/billing',       icon: '💳', label: 'Billing' },
      ]},
      { section: 'Management', items: [
        { to: '/admin/staff',         icon: '👨‍💼', label: 'Staff' },
        { to: '/admin/courses',       icon: '📚', label: 'Courses' },
        { to: '/admin/announcements', icon: '📣', label: 'Announcements' },
        { to: '/admin/report-cards',  icon: '📋', label: 'Report Cards' },
        { to: '/admin/school-year',   icon: '🗓', label: 'School Year' },
        { to: '/admin/applications',  icon: '📥', label: 'Applications' },
        { to: '/admin/calendar',      icon: '📅', label: 'Calendar' },
        { to: '/admin/meetings',      icon: '🎥', label: 'Meetings' },
        { to: '/admin/conduct',       icon: '🧠', label: 'Conduct' },
        { to: '/admin/reports',       icon: '📈', label: 'Reports' },
        { to: '/admin/documents',    icon: '📁', label: 'Documents' },
        { to: '/admin/handbooks',    icon: '📚', label: 'Handbooks' },
        { to: '/admin/incidents',    icon: '🚨', label: 'Incidents' },
        { to: '/admin/evaluations',  icon: '⭐', label: 'Evaluations' },
        { to: '/admin/fees',         icon: '💰', label: 'Fees' },
        { to: '/admin/alumni',       icon: '🎓', label: 'Alumni' },
        { to: '/admin/hr',           icon: '👥', label: 'HR & Staff' },
        { to: '/admin/settings',      icon: '⚙️', label: 'Settings' },
        { to: '/admin/ai',            icon: '🤖', label: 'AI Assistant' },
      ]}
    ]
  },
  super_admin: {
    badge: 'Super Admin', color: 'av-5',
    nav: [
      { section: 'Main', items: [
        { to: '/admin',               icon: '🏠', label: 'Dashboard',        exact: true },
        { to: '/admin/students',      icon: '👥', label: 'Students' },
        { to: '/admin/schedule',      icon: '📅', label: 'Schedule' },
        { to: '/admin/grades',        icon: '📊', label: 'Grade Book' },
        { to: '/admin/messages',      icon: '💬', label: 'Messages', badge: true },
        { to: '/admin/billing',       icon: '💳', label: 'Billing' },
      ]},
      { section: 'Management', items: [
        { to: '/admin/staff',         icon: '👨‍💼', label: 'Staff' },
        { to: '/admin/courses',       icon: '📚', label: 'Courses' },
        { to: '/admin/announcements', icon: '📣', label: 'Announcements' },
        { to: '/admin/report-cards',  icon: '📋', label: 'Report Cards' },
        { to: '/admin/school-year',   icon: '🗓', label: 'School Year' },
        { to: '/admin/applications',  icon: '📥', label: 'Applications' },
        { to: '/admin/calendar',      icon: '📅', label: 'Calendar' },
        { to: '/admin/meetings',      icon: '🎥', label: 'Meetings' },
        { to: '/admin/conduct',       icon: '🧠', label: 'Conduct' },
        { to: '/admin/reports',       icon: '📈', label: 'Reports' },
        { to: '/admin/documents',    icon: '📁', label: 'Documents' },
        { to: '/admin/handbooks',    icon: '📚', label: 'Handbooks' },
        { to: '/admin/incidents',    icon: '🚨', label: 'Incidents' },
        { to: '/admin/evaluations',  icon: '⭐', label: 'Evaluations' },
        { to: '/admin/fees',         icon: '💰', label: 'Fees' },
        { to: '/admin/alumni',       icon: '🎓', label: 'Alumni' },
        { to: '/admin/hr',           icon: '👥', label: 'HR & Staff' },
        { to: '/admin/settings',      icon: '⚙️', label: 'Settings' },
        { to: '/admin/ai',            icon: '🤖', label: 'AI Assistant' },
      ]},
      { section: '👑 Super Admin', items: [
        { to: '/super-admin',         icon: '👑', label: 'Super Admin Panel' },
      ]}
    ]
  },
  teacher: {
    badge: 'Teacher', color: 'av-2',
    nav: [
      { section: 'My Workspace', items: [
        { to: '/teacher',             icon: '🏠', label: 'Dashboard',   exact: true },
        { to: '/teacher/classes',     icon: '🏫', label: 'My Classes' },
        { to: '/teacher/grades',      icon: '📊', label: 'Gradebook & Assignments' },
        { to: '/teacher/schedule',    icon: '📅', label: 'Schedule' },
        { to: '/teacher/messages',      icon: '💬', label: 'Messages', badge: true },
        { to: '/teacher/announcements', icon: '📢', label: 'Announcements' },
        { to: '/teacher/calendar',      icon: '📅', label: 'Calendar'      },
        { to: '/teacher/meetings',      icon: '🎥', label: 'Meetings'      },
        { to: '/teacher/conduct',       icon: '🧠', label: 'Conduct'       },
        { to: '/teacher/lesson-plans',  icon: '📖', label: 'Lesson Plans' },
        { to: '/teacher/time-off',      icon: '🏖️', label: 'Time Off' },
        { to: '/teacher/handbooks',     icon: '📚', label: 'Handbooks' },
        { to: '/teacher/ai',            icon: '🤖', label: 'AI Assistant'  },
      ]}
    ]
  },
  parent: {
    badge: 'Parent', color: 'av-4',
    nav: [
      { section: 'My Child', items: [
        { to: '/parent',              icon: '🏠', label: 'Dashboard',      exact: true },
        { to: '/parent/progress',     icon: '📈', label: 'Progress Report' },
        { to: '/parent/attendance',   icon: '📅', label: 'Attendance' },
        { to: '/parent/homework',     icon: '📝', label: 'Homework' },
        { to: '/parent/schedule',     icon: '📅', label: 'Class Schedule' },
        { to: '/parent/messages',     icon: '💬', label: 'Messages', badge: true },
        { to: '/parent/billing',      icon: '💳', label: 'Billing' },
        { to: '/parent/announcements', icon: '📢', label: 'Announcements' },
        { to: '/parent/calendar',     icon: '📅', label: 'Calendar'       },
        { to: '/parent/handbooks',    icon: '📚', label: 'Handbooks'      },
        { to: '/parent/meetings',     icon: '🎥', label: 'Meetings'       },
        { to: '/parent/settings',     icon: '⚙️', label: 'Settings' },
        { to: '/parent/ai',           icon: '🤖', label: 'AI Assistant' },
      ]}
    ]
  },
  student: {
    badge: 'Student', color: 'av-5',
    nav: [
      { section: 'My School', items: [
        { to: '/student',             icon: '🏠', label: 'Dashboard',     exact: true },
        { to: '/student/homework',    icon: '📝', label: 'Homework' },
        { to: '/student/grades',      icon: '📊', label: 'My Grades' },
        { to: '/student/announcements', icon: '📣', label: 'Announcements' },
        { to: '/student/handbooks',   icon: '📚', label: 'Handbooks'    },
        { to: '/student/messages',    icon: '💬', label: 'Messages', badge: true },
        { to: '/student/settings',    icon: '⚙️', label: 'Settings' },
        { to: '/student/ai',          icon: '🤖', label: 'AI Tutor'    },
      ]}
    ]
  }
}

export default function Sidebar({ open, onClose }) {
  const { profile, signOut, canSwitchToAdmin, switchRole, activeRole, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  // Use activeRole for nav config so role-switching shows correct nav instantly
  const displayRole = activeRole || profile?.role || 'student'
  const cfg = ROLE_CONFIG[displayRole] || ROLE_CONFIG['student']

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  function handleSwitchRole(newRole) {
    switchRole(newRole)
    navigate(newRole === 'admin' ? '/admin' : '/teacher')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <nav style={{
      width: 230, background: 'var(--side)', color: 'white',
      display: 'flex', flexDirection: 'column',
      padding: '24px 0 16px', position: 'fixed',
      top: 0, left: 0, height: '100vh', zIndex: 100,
      boxShadow: '4px 0 24px rgba(18,16,58,.2)'
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'0 18px 22px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div style={{ width:36, height:36, background:'linear-gradient(135deg,var(--teal),var(--sky))', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌐</div>
        <div style={{ fontFamily:'Nunito,sans-serif', fontWeight:900, fontSize:16, lineHeight:1.15 }}>
          BLE<br/><span style={{ color:'var(--gold)' }}>Worldwide</span>
        </div>
        <div style={{ marginLeft:'auto', fontSize:9, fontWeight:800, letterSpacing:'.7px', textTransform:'uppercase', background:'rgba(255,200,69,.18)', color:'var(--gold)', borderRadius:5, padding:'2px 6px' }}>
          {cfg.badge}
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 9px 0' }}>
        {cfg.nav.map(section => (
          <div key={section.section}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'1.5px', color:'rgba(255,255,255,.28)', textTransform:'uppercase', padding:'0 9px 6px', marginTop:8 }}>
              {section.section}
            </div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:9,
                  padding:'8px 11px', borderRadius:11,
                  cursor:'pointer', fontSize:13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'white' : 'rgba(255,255,255,.55)',
                  background: isActive ? 'linear-gradient(90deg,var(--teal),var(--sky))' : 'transparent',
                  marginBottom:1, textDecoration:'none', transition:'all .18s'
                })}
              >
                <span style={{ fontSize:15, width:20, textAlign:'center' }}>{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span style={{ marginLeft:'auto', background:'var(--coral)', color:'#fff', fontSize:9, fontWeight:800, borderRadius:20, padding:'1px 6px' }}>•</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Role switcher — only visible for teacher+admin dual-role users */}
      {canSwitchToAdmin && (
        <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Switch Portal</div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => handleSwitchRole('teacher')} style={{
              flex:1, padding:'5px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
              background: displayRole === 'teacher' ? 'var(--teal)' : 'rgba(255,255,255,.1)',
              color:      displayRole === 'teacher' ? 'white'       : 'rgba(255,255,255,.6)'
            }}>👩‍🏫 Teacher</button>
            <button onClick={() => handleSwitchRole('admin')} style={{
              flex:1, padding:'5px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
              background: displayRole === 'admin' ? '#f72585'          : 'rgba(255,255,255,.1)',
              color:      displayRole === 'admin' ? 'white'            : 'rgba(255,255,255,.6)'
            }}>🛡 Admin</button>
          </div>
        </div>
      )}

      {/* User footer */}
      <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:9 }}>
        <div className={`avatar avatar-sm ${cfg.color}`} style={{ width:34, height:34, fontSize:12 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{profile?.full_name || 'User'}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.38)', textTransform:'capitalize' }}>{displayRole}</div>
        </div>
        <button
          onClick={handleSignOut}
          style={{ marginLeft:'auto', background:'none', border:'none', fontSize:11, color:'rgba(255,255,255,.28)', cursor:'pointer', padding:0 }}
          onMouseEnter={e => e.target.style.color = 'var(--coral)'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.28)'}
        >⏻</button>
      </div>
    </nav>
  )
}

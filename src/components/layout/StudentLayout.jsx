import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function StudentLayout() {

  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  return (
    <div className="app-shell">
      <Sidebar role="student" />
      <div className="main-area">
        <Topbar />
        <div className="page-content"><Outlet /></div>
      </div>
    </div>
  )
}

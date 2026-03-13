import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LandingPage from './pages/LandingPage'
import EnrollmentForm from './pages/EnrollmentForm'
import AdminLayout from './components/layout/AdminLayout'
import TeacherLayout from './components/layout/TeacherLayout'
import ParentLayout from './components/layout/ParentLayout'
import StudentLayout from './components/layout/StudentLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminStudents from './pages/admin/Students'
import AdminStaff from './pages/admin/Staff'
import AdminCourses from './pages/admin/Courses'
import AdminSchedule from './pages/admin/Schedule'
import AdminGrades from './pages/admin/Grades'
import AdminMessages from './pages/admin/Messages'
import AdminReports from './pages/admin/Reports'
import AdminSettings from './pages/admin/Settings'
import AdminBilling from './pages/admin/Billing'
import AdminAnnouncements from './pages/admin/Announcements'
import AdminSchoolYear from './pages/admin/SchoolYear'
import AdminApplications from './pages/admin/Applications'
import AdminReportCards from './pages/admin/ReportCards'
import AdminCalendar from './pages/admin/Calendar'
import AdminMeetings from './pages/admin/Meetings'
import AdminConduct from './pages/admin/Conduct'
import AdminConferences from './pages/admin/Conferences'
import AdminIDCards from './pages/admin/IDCards'
import StudentDetail from './pages/admin/StudentDetail'
import AdminDocuments from './pages/admin/Documents'
import AdminHandbooks from './pages/admin/Handbooks'
import HandbooksViewer from './pages/shared/HandbooksViewer'
import AdminEvaluations from './pages/admin/Evaluations'
import AdminIncidents from './pages/admin/Incidents'
import AdminFees from './pages/admin/Fees'
import AdminHR from './pages/admin/HR'
import AdminLedger from './pages/admin/Ledger'
import AdminAlumni from './pages/admin/Alumni'
import TeacherLessonPlans from './pages/teacher/LessonPlans'
import SuperAdminDashboard from './pages/admin/SuperAdmin'
import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherClasses from './pages/teacher/Classes'
import TeacherGrades from './pages/teacher/Grades'
import TeacherSchedule from './pages/teacher/Schedule'
import TeacherMessages from './pages/teacher/Messages'
import ParentDashboard from './pages/parent/Dashboard'
import ParentProgress from './pages/parent/Progress'
import ParentSchedule from './pages/parent/Schedule'
import ParentMessages from './pages/parent/Messages'
import ParentBilling from './pages/parent/Billing'
import { ParentSettings, ParentAnnouncements, ParentCalendar, ParentMeetings, ParentAttendance, ParentHomework } from './pages/parent/_pages'
import { TeacherAnnouncements, TeacherCalendar, TeacherMeetings, TeacherConduct } from './pages/teacher/_pages'
import { TeacherTimeOff } from './pages/teacher/TeacherTimeOff'
import { StudentDashboard, StudentHomework, StudentGrades, StudentAnnouncements, StudentMessages, StudentSettings, StudentCalendar } from './pages/student/_pages'

const AdminAI   = lazy(() => import('./pages/admin/AIAdmin'))
const TeacherAI = lazy(() => import('./pages/teacher/AITeacher'))
const ParentAI  = lazy(() => import('./pages/parent/AIParent'))
const StudentAI = lazy(() => import('./pages/student/AIStudent'))

const AI_FB = <div style={{padding:60,textAlign:'center',color:'#999',fontSize:14}}>Loading AI Assistant...</div>

function LoadingScreen() {
  return <div className="loading-screen"><div className="spinner"/></div>
}

function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading, activeRole } = useAuth()
  if (loading) return <LoadingScreen/>
  if (!user) return <Navigate to="/login" replace/>
  if (!allowedRole) return children
  const role = activeRole || profile?.role
  if (allowedRole === 'admin' && role === 'super_admin') return children
  if (role === allowedRole) return children
  if (role === 'super_admin') return <Navigate to="/admin" replace/>
  if (role === 'admin')       return <Navigate to="/admin" replace/>
  if (role === 'teacher')     return <Navigate to="/teacher" replace/>
  if (role === 'parent')      return <Navigate to="/parent" replace/>
  if (role === 'student')     return <Navigate to="/student" replace/>
  return <Navigate to="/login" replace/>
}

export default function App() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen/>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${profile?.role||'login'}`} replace/> : <LoginPage/>}/>
      <Route path="/reset-password" element={<ResetPasswordPage/>}/>
      <Route path="/apply" element={<EnrollmentForm/>}/>

      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout/></ProtectedRoute>}>
        <Route index element={<AdminDashboard/>}/>
        <Route path="students"     element={<AdminStudents/>}/>
        <Route path="staff"        element={<AdminStaff/>}/>
        <Route path="courses"      element={<AdminCourses/>}/>
        <Route path="schedule"     element={<AdminSchedule/>}/>
        <Route path="grades"       element={<AdminGrades/>}/>
        <Route path="messages"     element={<AdminMessages/>}/>
        <Route path="billing"      element={<AdminBilling/>}/>
        <Route path="announcements" element={<AdminAnnouncements/>}/>
        <Route path="report-cards" element={<AdminReportCards/>}/>
        <Route path="school-year"  element={<AdminSchoolYear/>}/>
        <Route path="applications" element={<AdminApplications/>}/>
        <Route path="reports"      element={<AdminReports/>}/>
        <Route path="calendar"     element={<AdminCalendar/>}/>
        <Route path="meetings"     element={<AdminMeetings/>}/>
        <Route path="conduct"      element={<AdminConduct/>}/>
        <Route path="conferences"  element={<AdminConferences/>}/>
        <Route path="id-cards"     element={<AdminIDCards/>}/>
        <Route path="settings"     element={<AdminSettings/>}/>
        <Route path="students/:id" element={<StudentDetail/>}/>
        <Route path="documents"    element={<AdminDocuments/>}/>
        <Route path="handbooks"    element={<AdminHandbooks/>}/>
        <Route path="evaluations"  element={<AdminEvaluations/>}/>
        <Route path="incidents"    element={<AdminIncidents/>}/>
        <Route path="fees"         element={<AdminFees/>}/>
        <Route path="alumni"       element={<AdminAlumni/>}/>
        <Route path="hr"           element={<AdminHR/>}/>
        <Route path="ledger"       element={<AdminLedger/>}/>
        <Route path="ai" element={<Suspense fallback={AI_FB}><AdminAI/></Suspense>}/>
      </Route>

      <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherLayout/></ProtectedRoute>}>
        <Route index element={<TeacherDashboard/>}/>
        <Route path="classes"       element={<TeacherClasses/>}/>
        <Route path="grades"        element={<TeacherGrades/>}/>
        <Route path="schedule"      element={<TeacherSchedule/>}/>
        <Route path="messages"      element={<TeacherMessages/>}/>
        <Route path="announcements" element={<TeacherAnnouncements/>}/>
        <Route path="calendar"      element={<TeacherCalendar/>}/>
        <Route path="meetings"      element={<TeacherMeetings/>}/>
        <Route path="conduct"       element={<TeacherConduct/>}/>
        <Route path="lesson-plans"  element={<TeacherLessonPlans/>}/>
        <Route path="time-off"     element={<TeacherTimeOff/>}/>
        <Route path="handbooks"     element={<HandbooksViewer/>}/>
        <Route path="ai" element={<Suspense fallback={AI_FB}><TeacherAI/></Suspense>}/>
      </Route>

      <Route path="/parent" element={<ProtectedRoute allowedRole="parent"><ParentLayout/></ProtectedRoute>}>
        <Route index element={<ParentDashboard/>}/>
        <Route path="progress"      element={<ParentProgress/>}/>
        <Route path="handbooks"     element={<HandbooksViewer/>}/>
        <Route path="schedule"      element={<ParentSchedule/>}/>
        <Route path="messages"      element={<ParentMessages/>}/>
        <Route path="billing"       element={<ParentBilling/>}/>
        <Route path="announcements" element={<ParentAnnouncements/>}/>
        <Route path="settings"      element={<ParentSettings/>}/>
        <Route path="calendar"      element={<ParentCalendar/>}/>
        <Route path="meetings"      element={<ParentMeetings/>}/>
        <Route path="attendance"    element={<ParentAttendance/>}/>
        <Route path="homework"      element={<ParentHomework/>}/>
        <Route path="ai" element={<Suspense fallback={AI_FB}><ParentAI/></Suspense>}/>
      </Route>

      <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentLayout/></ProtectedRoute>}>
        <Route index element={<StudentDashboard/>}/>
        <Route path="homework"      element={<StudentHomework/>}/>
        <Route path="grades"        element={<StudentGrades/>}/>
        <Route path="announcements" element={<StudentAnnouncements/>}/>
        <Route path="messages"      element={<StudentMessages/>}/>
        <Route path="settings"      element={<StudentSettings/>}/>
        <Route path="calendar"      element={<StudentCalendar/>}/>
        <Route path="handbooks"     element={<HandbooksViewer/>}/>
        <Route path="ai" element={<Suspense fallback={AI_FB}><StudentAI/></Suspense>}/>
      </Route>

      <Route path="/super-admin" element={<ProtectedRoute allowedRole="super_admin"><AdminLayout/></ProtectedRoute>}>
        <Route index element={<SuperAdminDashboard/>}/>
      </Route>

      <Route path="/" element={user ? <Navigate to={`/${profile?.role==='super_admin'?'admin':profile?.role||'login'}`} replace/> : <Navigate to="/login" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  )
}

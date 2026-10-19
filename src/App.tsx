import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Layouts
import CandidateLayout from '@/components/layouts/CandidateLayout'
import AdminLayout from '@/components/layouts/AdminLayout'

// Auth guards
import {
  RequireAuth,
  RequireAdmin,
  GuestOnly,
} from '@/features/auth/route-guards'

// Candidate pages
import Landing from '@/pages/candidate/Landing'
import Register from '@/pages/candidate/Register'
import Login from '@/pages/candidate/Login'
import UploadCV from '@/pages/candidate/UploadCV'
import Setup from '@/pages/candidate/Setup'
import PreCheck from '@/pages/candidate/PreCheck'
import Interview from '@/pages/candidate/Interview'
import Result from '@/pages/candidate/Result'
import History from '@/pages/candidate/History'
import HistoryReport from '@/pages/candidate/HistoryReport'

// Admin pages
import Dashboard from '@/pages/admin/Dashboard'
import Candidates from '@/pages/admin/Candidates'
import Reports from '@/pages/admin/Reports'
import Report from '@/pages/admin/Report'
import ReportDetail from '@/pages/admin/ReportDetail'
import Settings from '@/pages/admin/Settings'
import Users from '@/pages/admin/Users'
import Weights from '@/pages/admin/Weights'

function App() {
  return (
    <BrowserRouter basename="/Ai-use-interview-using-c-">
      <Routes>
        {/* ── Candidate routes (top navbar layout) ────────── */}
        <Route element={<CandidateLayout />}>
          <Route path="/" element={<Landing />} />

          <Route
            path="/register"
            element={
              <GuestOnly>
                <Register />
              </GuestOnly>
            }
          />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Login />
              </GuestOnly>
            }
          />

          <Route
            path="/upload-cv"
            element={
              <RequireAuth>
                <UploadCV />
              </RequireAuth>
            }
          />
          <Route
            path="/setup"
            element={
              <RequireAuth>
                <Setup />
              </RequireAuth>
            }
          />
          <Route
            path="/pre-check"
            element={
              <RequireAuth>
                <PreCheck />
              </RequireAuth>
            }
          />
          <Route
            path="/interview"
            element={
              <RequireAuth>
                <Interview />
              </RequireAuth>
            }
          />
          <Route
            path="/result"
            element={
              <RequireAuth>
                <Result />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />
          <Route
            path="/history/:id"
            element={
              <RequireAuth>
                <HistoryReport />
              </RequireAuth>
            }
          />

          {/* ── Fallback (renders within candidate shell) ─── */}
          <Route path="*" element={<Landing />} />
        </Route>

        {/* ── Admin routes (sidebar layout) ───────────────── */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="reports" element={<Reports />} />
          <Route path="report" element={<Report />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="weights" element={<Weights />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

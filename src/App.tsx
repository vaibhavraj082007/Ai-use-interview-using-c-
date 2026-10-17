import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Layouts
import CandidateLayout from '@/layouts/CandidateLayout'
import AdminLayout from '@/layouts/AdminLayout'

// Candidate pages
import Landing from '@/pages/candidate/Landing'
import Register from '@/pages/candidate/Register'
import Login from '@/pages/candidate/Login'
import UploadCV from '@/pages/candidate/UploadCV'
import Setup from '@/pages/candidate/Setup'
import PreCheck from '@/pages/candidate/PreCheck'
import Interview from '@/pages/candidate/Interview'
import Result from '@/pages/candidate/Result'

// Admin pages
import Dashboard from '@/pages/admin/Dashboard'
import Candidates from '@/pages/admin/Candidates'
import Reports from '@/pages/admin/Reports'
import Settings from '@/pages/admin/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Candidate routes (top navbar layout) ────────── */}
        <Route element={<CandidateLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/upload-cv" element={<UploadCV />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/pre-check" element={<PreCheck />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/result" element={<Result />} />
        </Route>

        {/* ── Admin routes (sidebar layout) ───────────────── */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectEdit from './pages/ProjectEdit'
import Payment from './pages/Payment'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ProfileV2 from './pages/ProfileV2'
import ProjetsDashboard from './pages/ProjetsDashboard'
import NewProjetPage from './pages/NewProjetPage'
import EditProjetPage from './pages/EditProjetPage'
import AnalyseRentabilite from './pages/AnalyseRentabilite'
import StructuresPage from './pages/StructuresPage'
import PatrimoinePage from './pages/PatrimoinePage'
import StructureDetail from './pages/StructureDetail'
import UpdateHoldings from './pages/UpdateHoldings'
import HistoryPage from './pages/HistoryPage'
import MonCompte from './pages/MonCompte'
import MainLayout from './components/layout/MainLayout'
import { AuthProvider } from './hooks/useAuth'
import { StructuresProvider } from './contexts/StructuresContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/ui/Toast'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <StructuresProvider>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/profile" element={<ProfileV2 />} />
                <Route path="/update-holdings" element={<UpdateHoldings />} />

                {/* Old SCI routes - kept for backward compatibility */}
                <Route path="/project/:id" element={<ProjectEdit />} />
                <Route path="/project/new" element={<ProjectEdit />} />

                {/* New multi-structure routes */}
                <Route path="/structures" element={<StructuresPage />} />
                <Route path="/structure/:id" element={<StructureDetail />} />
                <Route path="/patrimoine" element={<PatrimoinePage />} />
                <Route path="/projets" element={<ProjetsDashboard />} />
                <Route path="/projets/nouveau" element={<NewProjetPage />} />
                <Route path="/projets/:id/edit" element={<EditProjetPage />} />
                <Route path="/projets/:projetId" element={<AnalyseRentabilite />} />
                <Route path="/projets/:projetId/analyse" element={<AnalyseRentabilite />} />

                {/* History/Audit */}
                <Route path="/historique" element={<HistoryPage />} />

                {/* Mon Compte */}
                <Route path="/mon-compte" element={<MonCompte />} />
              </Routes>
            </MainLayout>
            <ToastContainer />
          </StructuresProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App 
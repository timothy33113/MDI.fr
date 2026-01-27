import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProjectEdit from './pages/ProjectEdit'
import Payment from './pages/Payment'
import Login from './pages/Login'
import Register from './pages/Register'
import ProfileV2 from './pages/ProfileV2'
import ProjetsDashboard from './pages/ProjetsDashboard'
import NewProjetPage from './pages/NewProjetPage'
import EditProjetPage from './pages/EditProjetPage'
import AnalyseRentabilite from './pages/AnalyseRentabilite'
import StructuresPage from './pages/StructuresPage'
import PatrimoinePage from './pages/PatrimoinePage'
import StructureDetail from './pages/StructureDetail'
import UpdateHoldings from './pages/UpdateHoldings'
import MainLayout from './components/layout/MainLayout'
import { AuthProvider } from './hooks/useAuth'
import { StructuresProvider } from './contexts/StructuresContext'

function App() {
  return (
    <AuthProvider>
      <StructuresProvider>
        <MainLayout>
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </Routes>
        </MainLayout>
      </StructuresProvider>
    </AuthProvider>
  )
}

export default App 
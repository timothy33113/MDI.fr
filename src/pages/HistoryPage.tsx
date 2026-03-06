import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import AuditLog from '@/components/audit/AuditLog'

const HistoryPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F7F7F7] transition-colors">
      {/* Page title */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Historique
                </h1>
                <p className="text-sm text-gray-500">
                  Suivez toutes les modifications apportees a vos structures et projets
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuditLog />
      </main>
    </div>
  )
}

export default HistoryPage

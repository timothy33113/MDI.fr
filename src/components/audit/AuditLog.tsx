import React, { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import api from '@/services/api'

interface AuditLogEntry {
  id: string
  userId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entityType: 'structure' | 'projet'
  entityId: string
  oldData: any
  newData: any
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface AuditLogProps {
  entityType?: 'structure' | 'projet'
  entityId?: string
}

const AuditLog: React.FC<AuditLogProps> = ({ entityType, entityId }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Filters
  const [filterEntityType, setFilterEntityType] = useState<string>(entityType || '')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (entityType || filterEntityType) params.append('entity_type', entityType || filterEntityType)
      if (entityId) params.append('entity_id', entityId)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      params.append('page', page.toString())
      params.append('limit', '20')

      const response = await api.get(`/audit-logs?${params.toString()}`)

      if (response.data.success) {
        setLogs(response.data.data.logs)
        setPagination(response.data.data.pagination)
      } else {
        setError(response.data.error || 'Erreur lors du chargement')
      }
    } catch (err: any) {
      console.error('Error fetching audit logs:', err)
      setError(err.response?.data?.error || 'Erreur lors du chargement des logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [entityType, entityId, filterEntityType, startDate, endDate, page])

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="h-4 w-4 text-green-500" />
      case 'UPDATE':
        return <Pencil className="h-4 w-4 text-blue-500" />
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'Creation'
      case 'UPDATE':
        return 'Modification'
      case 'DELETE':
        return 'Suppression'
      default:
        return action
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-700'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-700'
      case 'DELETE':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'structure':
        return <Building2 className="h-4 w-4" />
      case 'projet':
        return <Briefcase className="h-4 w-4" />
      default:
        return null
    }
  }

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'structure':
        return 'Structure'
      case 'projet':
        return 'Projet'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEntityName = (log: AuditLogEntry): string => {
    const data = log.newData || log.oldData
    return data?.nom || data?.name || 'Element inconnu'
  }

  // Simple diff component for showing changes
  const renderDiff = (log: AuditLogEntry) => {
    if (log.action === 'CREATE') {
      return (
        <div className="mt-3 p-3 bg-green-50 rounded-xl">
          <p className="text-sm font-medium text-green-700 mb-2">Donnees creees:</p>
          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(log.newData, null, 2)}
          </pre>
        </div>
      )
    }

    if (log.action === 'DELETE') {
      return (
        <div className="mt-3 p-3 bg-red-50 rounded-xl">
          <p className="text-sm font-medium text-red-700 mb-2">Donnees supprimees:</p>
          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(log.oldData, null, 2)}
          </pre>
        </div>
      )
    }

    // For UPDATE, show a simple diff
    if (log.action === 'UPDATE' && log.oldData && log.newData) {
      const changes: { field: string; oldValue: any; newValue: any }[] = []

      // Find changed fields (top-level only for simplicity)
      const allKeys = new Set([...Object.keys(log.oldData || {}), ...Object.keys(log.newData || {})])

      allKeys.forEach(key => {
        const oldVal = log.oldData?.[key]
        const newVal = log.newData?.[key]

        // Skip certain fields
        if (['updatedAt', 'createdAt', 'id', 'userId'].includes(key)) return

        const oldStr = JSON.stringify(oldVal)
        const newStr = JSON.stringify(newVal)

        if (oldStr !== newStr) {
          changes.push({
            field: key,
            oldValue: oldVal,
            newValue: newVal
          })
        }
      })

      if (changes.length === 0) {
        return (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Aucune modification visible</p>
          </div>
        )
      }

      return (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Modifications:</p>
          {changes.map((change, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-600 mb-1">
                {change.field}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-red-50 rounded-xl text-xs">
                  <span className="text-red-600">- </span>
                  <span className="text-gray-700">
                    {typeof change.oldValue === 'object'
                      ? JSON.stringify(change.oldValue, null, 2).substring(0, 100)
                      : String(change.oldValue ?? '(vide)')}
                  </span>
                </div>
                <div className="p-2 bg-green-50 rounded-xl text-xs">
                  <span className="text-green-600">+ </span>
                  <span className="text-gray-700">
                    {typeof change.newValue === 'object'
                      ? JSON.stringify(change.newValue, null, 2).substring(0, 100)
                      : String(change.newValue ?? '(vide)')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  const clearFilters = () => {
    setFilterEntityType('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  if (loading && logs.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Chargement de l'historique...</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      {!entityId && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Historique des modifications
          </h2>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtres
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && !entityId && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d'entite
              </label>
              <select
                value={filterEntityType}
                onChange={(e) => { setFilterEntityType(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tous</option>
                <option value="structure">Structures</option>
                <option value="projet">Projets</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date debut
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {(filterEntityType || startDate || endDate) && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" onClick={clearFilters} className="text-sm">
                Effacer les filtres
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Error message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-700">{error}</p>
        </Card>
      )}

      {/* Timeline */}
      {logs.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun historique disponible</p>
          </div>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Log entries */}
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-14">
                {/* Timeline dot */}
                <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                  {getActionIcon(log.action)}
                </div>

                <Card className="p-4 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {getEntityIcon(log.entityType)}
                          {getEntityLabel(log.entityType)}
                        </span>
                      </div>
                      <h4 className="mt-2 font-medium text-gray-900">
                        {getEntityName(log)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </span>
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {expandedLogs.has(log.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedLogs.has(log.id) && renderDiff(log)}
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-600">
            Page {pagination.page} sur {pagination.totalPages} ({pagination.total} entrees)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Precedent
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLog

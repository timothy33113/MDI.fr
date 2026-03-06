import React from 'react'
import { Link } from 'react-router-dom'
import { ProjectCard as ProjectCardType } from '@/types'
import { MapPin, Euro, Users, FileText, Edit, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'

interface ProjectCardProps {
  project: ProjectCardType
  onDelete?: (id: string) => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Brouillon':
        return 'bg-honey-50 text-honey-700 border border-honey-200'
      case 'Complete':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'PDF_Genere':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }

  return (
    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="relative">
        {/* Image */}
        <div className="aspect-video bg-gray-100 rounded-xl mb-4 overflow-hidden">
          <img
            src={project.photo}
            alt={project.nom}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgOTBDMTc3LjY4OSA5MCAxOTIgNzUuNjg5IDE5MiA2MEMxOTIgNDQuMzExIDE3Ny42ODkgMzAgMTYwIDMwQzE0Mi4zMTEgMzAgMTI4IDQ0LjMxMSAxMjggNjBDMTI4IDc1LjY4OSAxNDIuMzExIDkwIDE2MCA5MFoiIGZpbGw9IiNEMTQ3RjAiLz4KPHBhdGggZD0iTTE2MCAxNTBDMTc3LjY4OSAxNTAgMTkyIDEzNS42ODkgMTkyIDEyMEMxOTIgMTA0LjMxMSAxNzcuNjg5IDkwIDE2MCA5MEMxNDIuMzExIDkwIDEyOCAxMDQuMzExIDEyOCAxMjBDMTI4IDEzNS42ODkgMTQyLjMxMSAxNTAgMTYwIDE1MFoiIGZpbGw9IiNEMTQ3RjAiLz4KPC9zdmc+'
            }}
          />
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusStyle(project.status)}`}>
            {project.status}
          </span>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {project.nom}
          </h3>

          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span className="truncate">{project.adresse}</span>
            </div>

            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-2 text-gray-400" />
              <span>{project.prix.toLocaleString('fr-FR')} EUR</span>
            </div>

            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span>{project.nombreAssocies} associe{(project.nombreAssocies ?? 0) > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-3 border-t border-gray-100">
            <Link
              to={`/project/${project.id}`}
              className="flex-1 inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-3 rounded-xl transition-all text-sm"
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Modifier
            </Link>

            {project.status === 'Complete' && (
              <button className="flex-1 inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 font-medium py-2 px-3 rounded-xl border border-gray-200 transition-all text-sm">
                <FileText className="h-4 w-4 mr-1.5" />
                Generer PDF
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Supprimer le projet"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ProjectCard

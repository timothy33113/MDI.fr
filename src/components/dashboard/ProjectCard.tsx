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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Brouillon':
        return 'bg-yellow-100 text-yellow-800'
      case 'Complete':
        return 'bg-blue-100 text-blue-800'
      case 'PDF_Genere':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Brouillon':
        return '📝'
      case 'Complete':
        return '✅'
      case 'PDF_Genere':
        return '📄'
      default:
        return '📋'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="relative">
        {/* Image du projet */}
        <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden">
          <img
            src={project.photo}
            alt={project.nom}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgOTBDMTc3LjY4OSA5MCAxOTIgNzUuNjg5IDE5MiA2MEMxOTIgNDQuMzExIDE3Ny42ODkgMzAgMTYwIDMwQzE0Mi4zMTEgMzAgMTI4IDQ0LjMxMSAxMjggNjBDMTI4IDc1LjY4OSAxNDIuMzExIDkwIDE2MCA5MFoiIGZpbGw9IiNEMTQ3RjAiLz4KPHBhdGggZD0iTTE2MCAxNTBDMTc3LjY4OSAxNTAgMTkyIDEzNS42ODkgMTkyIDEyMEMxOTIgMTA0LjMxMSAxNzcuNjg5IDkwIDE2MCA5MEMxNDIuMzExIDkwIDEyOCAxMDQuMzExIDEyOCAxMjBDMTI4IDEzNS42ODkgMTQyLjMxMSAxNTAgMTYwIDE1MFoiIGZpbGw9IiNEMTQ3RjAiLz4KPC9zdmc+'
            }}
          />
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {getStatusIcon(project.status)} {project.status}
          </span>
        </div>

        {/* Informations du projet */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {project.nom}
          </h3>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span className="truncate">{project.adresse}</span>
            </div>

            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-2 text-gray-400" />
              <span>{project.prix.toLocaleString('fr-FR')} €</span>
            </div>

            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span>{project.nombreAssocies} associé{project.nombreAssocies > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Link
              to={`/project/${project.id}`}
              className="flex-1 btn-primary text-center text-sm"
            >
              <Edit className="h-4 w-4 mr-1 inline" />
              Modifier
            </Link>
            
            {project.status === 'Complete' && (
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 text-sm">
                <FileText className="h-4 w-4 mr-1 inline" />
                Générer PDF
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
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
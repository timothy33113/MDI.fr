import { useState, useEffect } from 'react'
import { DossierSCI, ProjectCard } from '@/types'

export const useProject = () => {
  const [projects, setProjects] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Charger les projets depuis le localStorage
    const savedProjects = localStorage.getItem('projects')
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects))
    }
    setLoading(false)
  }, [])

  const createProject = (project: Omit<DossierSCI, 'id' | 'dateCreation' | 'dateModification'>) => {
    const newProject: DossierSCI = {
      ...project,
      id: Date.now().toString(),
      dateCreation: new Date(),
      dateModification: new Date()
    }

    const projectCard: ProjectCard = {
      id: newProject.id,
      nom: newProject.nomSCI,
      adresse: newProject.localisation,
      prix: newProject.prixAcquisition,
      photo: '/placeholder-property.jpg',
      status: 'Brouillon',
      nombreAssocies: newProject.associes.length
    }

    const updatedProjects = [...projects, projectCard]
    setProjects(updatedProjects)
    localStorage.setItem('projects', JSON.stringify(updatedProjects))
    localStorage.setItem(`project_${newProject.id}`, JSON.stringify(newProject))

    return newProject.id
  }

  const updateProject = (id: string, updates: Partial<DossierSCI>) => {
    const projectData = localStorage.getItem(`project_${id}`)
    if (!projectData) return

    const project: DossierSCI = JSON.parse(projectData)
    const updatedProject: DossierSCI = {
      ...project,
      ...updates,
      dateModification: new Date()
    }

    localStorage.setItem(`project_${id}`, JSON.stringify(updatedProject))

    // Mettre à jour la liste des projets
    const updatedProjects = projects.map(p => 
      p.id === id 
        ? {
            ...p,
            nom: updatedProject.nomSCI,
            adresse: updatedProject.localisation,
            prix: updatedProject.prixAcquisition,
            status: (updatedProject.status === 'Genere' ? 'PDF_Genere' : updatedProject.status) as 'Brouillon' | 'Complete' | 'PDF_Genere',
            nombreAssocies: updatedProject.associes.length
          }
        : p
    )
    setProjects(updatedProjects)
    localStorage.setItem('projects', JSON.stringify(updatedProjects))
  }

  const getProject = (id: string): DossierSCI | null => {
    const projectData = localStorage.getItem(`project_${id}`)
    return projectData ? JSON.parse(projectData) : null
  }

  const deleteProject = (id: string) => {
    const updatedProjects = projects.filter(p => p.id !== id)
    setProjects(updatedProjects)
    localStorage.setItem('projects', JSON.stringify(updatedProjects))
    localStorage.removeItem(`project_${id}`)
  }

  return {
    projects,
    loading,
    createProject,
    updateProject,
    getProject,
    deleteProject
  }
} 
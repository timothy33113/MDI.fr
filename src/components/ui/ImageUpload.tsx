import React, { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ImageUploadProps {
  value?: string // URL actuelle de l'image
  onChange: (url: string) => void
  maxSize?: number // Taille max en bytes (default: 5MB)
  accept?: string // Types MIME acceptes (default: image/jpeg,image/png,image/webp)
  className?: string
  placeholder?: string
  label?: string
  helperText?: string
  disabled?: boolean
  showPreview?: boolean
  previewSize?: 'sm' | 'md' | 'lg'
}

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  success: boolean
}

const PREVIEW_SIZES = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
}

export default function ImageUpload({
  value,
  onChange,
  maxSize = 5 * 1024 * 1024, // 5MB par defaut
  accept = 'image/jpeg,image/png,image/webp',
  className,
  placeholder = 'Glissez une image ou cliquez pour selectionner',
  label,
  helperText,
  disabled = false,
  showPreview = true,
  previewSize = 'md',
}: ImageUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
  })
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Recuperer le token d'authentification
  const getAuthToken = useCallback((): string | null => {
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        return parsed.token || null
      }
    } catch {
      console.error('Error reading auth token')
    }
    return null
  }, [])

  // Valider le fichier
  const validateFile = useCallback(
    (file: File): string | null => {
      // Verifier le type
      const acceptedTypes = accept.split(',').map((t) => t.trim())
      if (!acceptedTypes.includes(file.type)) {
        return `Type de fichier non accepte. Formats acceptes: ${acceptedTypes
          .map((t) => t.split('/')[1]?.toUpperCase())
          .join(', ')}`
      }

      // Verifier la taille
      if (file.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1)
        return `Le fichier est trop volumineux. Taille maximale: ${maxSizeMB}MB`
      }

      return null
    },
    [accept, maxSize]
  )

  // Upload du fichier
  const uploadFile = useCallback(
    async (file: File) => {
      const token = getAuthToken()
      if (!token) {
        setUploadState({
          isUploading: false,
          progress: 0,
          error: 'Vous devez etre connecte pour uploader une image',
          success: false,
        })
        return
      }

      // Valider le fichier
      const validationError = validateFile(file)
      if (validationError) {
        setUploadState({
          isUploading: false,
          progress: 0,
          error: validationError,
          success: false,
        })
        return
      }

      setUploadState({
        isUploading: true,
        progress: 0,
        error: null,
        success: false,
      })

      try {
        // Creer le FormData
        const formData = new FormData()
        formData.append('file', file)

        // Simuler la progression (puisque fetch ne supporte pas le progress natif)
        const progressInterval = setInterval(() => {
          setUploadState((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }))
        }, 200)

        // Faire la requete
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        clearInterval(progressInterval)

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || data.details || 'Erreur lors de l\'upload')
        }

        setUploadState({
          isUploading: false,
          progress: 100,
          error: null,
          success: true,
        })

        // Appeler le callback avec la nouvelle URL
        onChange(data.url)

        // Reset le success apres 2 secondes
        setTimeout(() => {
          setUploadState((prev) => ({ ...prev, success: false, progress: 0 }))
        }, 2000)
      } catch (error) {
        console.error('Upload error:', error)
        setUploadState({
          isUploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Erreur lors de l\'upload',
          success: false,
        })
      }
    },
    [getAuthToken, validateFile, onChange]
  )

  // Supprimer l'image
  const handleDelete = useCallback(async () => {
    if (!value) return

    const token = getAuthToken()
    if (!token) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: 'Vous devez etre connecte pour supprimer une image',
        success: false,
      })
      return
    }

    try {
      // Optionnel: supprimer du serveur (uniquement si c'est une URL Vercel Blob)
      if (value.includes('vercel-storage.com') || value.includes('blob.vercel-storage.com')) {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: value }),
        })
      }

      // Reset l'URL
      onChange('')
      setUploadState({
        isUploading: false,
        progress: 0,
        error: null,
        success: false,
      })
    } catch (error) {
      console.error('Delete error:', error)
      // On reset quand meme l'URL localement meme si la suppression serveur echoue
      onChange('')
    }
  }, [value, getAuthToken, onChange])

  // Gestionnaires de drag & drop
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        uploadFile(files[0])
      }
    },
    [disabled, uploadFile]
  )

  // Gestionnaire de selection de fichier
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        uploadFile(files[0])
      }
      // Reset l'input pour permettre de selectionner le meme fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [uploadFile]
  )

  // Ouvrir le selecteur de fichier
  const openFileSelector = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="flex items-start gap-4">
        {/* Preview de l'image actuelle */}
        {showPreview && value && (
          <div className="relative flex-shrink-0">
            <img
              src={value}
              alt="Preview"
              className={cn(
                PREVIEW_SIZES[previewSize],
                'rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700 shadow-sm'
              )}
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleDelete}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                title="Supprimer l'image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Zone de drop */}
        <div className="flex-1">
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileSelector}
            className={cn(
              'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
              disabled && 'opacity-50 cursor-not-allowed',
              uploadState.error && 'border-red-300 bg-red-50 dark:bg-red-900/20',
              uploadState.success && 'border-green-300 bg-green-50 dark:bg-green-900/20'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              disabled={disabled}
              className="hidden"
            />

            {/* Contenu de la zone */}
            <div className="space-y-2">
              {uploadState.isUploading ? (
                <>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload en cours...
                  </p>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs mx-auto">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{uploadState.progress}%</p>
                </>
              ) : uploadState.error ? (
                <>
                  <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {uploadState.error}
                  </p>
                  <p className="text-xs text-gray-500">Cliquez pour reessayer</p>
                </>
              ) : uploadState.success ? (
                <>
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Image uploadee avec succes!
                  </p>
                </>
              ) : (
                <>
                  {isDragging ? (
                    <Upload className="h-8 w-8 mx-auto text-blue-500" />
                  ) : (
                    <ImageIcon className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500" />
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{placeholder}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {accept
                      .split(',')
                      .map((t) => t.split('/')[1]?.toUpperCase())
                      .join(', ')}{' '}
                    - Max {(maxSize / 1024 / 1024).toFixed(0)}MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {helperText && !uploadState.error && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
}

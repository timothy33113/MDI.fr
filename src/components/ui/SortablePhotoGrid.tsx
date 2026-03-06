import React, { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Star, Upload, Loader2, ImageIcon } from 'lucide-react'
import { useUploadPhoto } from '@/hooks/useUploadPhoto'

export interface PhotoItem {
  id: string
  url: string
  filename: string
  description?: string
  type: string
  position: number
  isUploading?: boolean
}

interface SortablePhotoGridProps {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  coverPhotoUrl: string | null
  onCoverPhotoChange: (url: string | null) => void
}

// Individual sortable photo card
function SortablePhotoCard({
  photo,
  isCover,
  onDelete,
  onSetCover,
}: {
  photo: PhotoItem
  isCover: boolean
  onDelete: () => void
  onSetCover: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-xl overflow-hidden border-2 aspect-[4/3] bg-gray-100 ${
        isCover ? 'border-amber-400' : 'border-gray-200'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      {photo.isUploading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <img
          src={photo.url}
          alt={photo.filename}
          className="w-full h-full object-cover"
        />
      )}

      {/* Overlay on hover */}
      {!photo.isUploading && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
          {/* Drag handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 p-1 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-gray-600" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute top-2 right-2 p-1 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>

          {/* Cover photo button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSetCover() }}
            className={`absolute bottom-2 left-2 p-1 rounded-lg transition-opacity ${
              isCover
                ? 'bg-amber-400 opacity-100'
                : 'bg-white/90 opacity-0 group-hover:opacity-100 hover:bg-amber-50'
            }`}
          >
            <Star className={`h-4 w-4 ${isCover ? 'text-white fill-white' : 'text-amber-500'}`} />
          </button>

          {/* Position number */}
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {photo.position + 1}
          </span>
        </div>
      )}

      {/* Cover badge (always visible) */}
      {isCover && !photo.isUploading && (
        <span className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-400 text-white text-[10px] font-medium rounded-full">
          Couverture
        </span>
      )}
    </div>
  )
}

const SortablePhotoGrid: React.FC<SortablePhotoGridProps> = ({
  photos,
  onChange,
  coverPhotoUrl,
  onCoverPhotoChange,
}) => {
  const { uploadPhoto, deletePhoto } = useUploadPhoto()
  const photosRef = useRef(photos)
  photosRef.current = photos
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const tempId = `uploading-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const placeholder: PhotoItem = {
        id: tempId,
        url: '',
        filename: file.name,
        type: 'Autre',
        position: photos.length,
        isUploading: true,
      }

      // Add placeholder
      onChange([...photos, placeholder])

      try {
        const result = await uploadPhoto(file)
        // Replace placeholder with real photo
        onChange(photosRef.current.map(p =>
          p.id === tempId
            ? { ...p, id: `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`, url: result.url, filename: result.filename, isUploading: false }
            : p
        ))
      } catch (err) {
        console.error('Upload failed:', err)
        // Remove failed placeholder
        onChange(photosRef.current.filter(p => p.id !== tempId))
      }
    }
  }, [photos, onChange, uploadPhoto])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: true,
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex(p => p.id === active.id)
      const newIndex = photos.findIndex(p => p.id === over.id)
      const reordered = arrayMove(photos, oldIndex, newIndex)
      onChange(reordered.map((p, i) => ({ ...p, position: i })))
    }
  }

  const handleDelete = async (photo: PhotoItem) => {
    if (coverPhotoUrl === photo.url) {
      onCoverPhotoChange(null)
    }
    await deletePhoto(photo.url).catch(() => {})
    const remaining = photos.filter(p => p.id !== photo.id)
    onChange(remaining.map((p, i) => ({ ...p, position: i })))
  }

  const handleSetCover = (photo: PhotoItem) => {
    onCoverPhotoChange(coverPhotoUrl === photo.url ? null : photo.url)
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-coral-400 bg-coral-50'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <Upload className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {isDragActive ? 'Déposez les photos ici' : 'Glissez vos photos ou cliquez pour sélectionner'}
          </p>
          <p className="text-xs text-gray-400">JPG, PNG, WebP — 5 Mo max par photo</p>
        </div>
      </div>

      {/* Sortable grid */}
      {photos.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {photos.filter(p => !p.isUploading).length} photo{photos.filter(p => !p.isUploading).length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">Glissez pour réordonner</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={photos.map(p => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <SortablePhotoCard
                    key={photo.id}
                    photo={photo}
                    isCover={coverPhotoUrl === photo.url}
                    onDelete={() => handleDelete(photo)}
                    onSetCover={() => handleSetCover(photo)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="text-center py-4">
          <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Aucune photo ajoutée</p>
        </div>
      )}
    </div>
  )
}

export default SortablePhotoGrid

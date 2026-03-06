import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { useUploadPhoto } from '@/hooks/useUploadPhoto'

interface BienPhotoUploadProps {
  photos: string[]
  onChange: (photos: string[]) => void
}

const BienPhotoUpload: React.FC<BienPhotoUploadProps> = ({ photos, onChange }) => {
  const { uploadPhoto, deletePhoto } = useUploadPhoto()
  const [uploading, setUploading] = useState(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(acceptedFiles.length)
    const newPhotos = [...photos]

    for (const file of acceptedFiles) {
      try {
        const result = await uploadPhoto(file)
        newPhotos.push(result.url)
        onChange([...newPhotos])
      } catch (err) {
        console.error('Upload failed:', err)
      }
      setUploading(prev => prev - 1)
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

  const handleRemove = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = photos[index]
    await deletePhoto(url).catch(() => {})
    onChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
        }`}
      >
        <input {...getInputProps()} />
        {photos.length === 0 && uploading === 0 ? (
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <Upload className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-gray-600">
                {isDragActive ? 'Déposez ici' : 'Glissez des photos ou cliquez'}
              </p>
              <p className="text-[10px] text-gray-400">JPG, PNG, WebP — 5 Mo max</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap justify-center">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    className="h-16 w-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleRemove(idx, e)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div key={`loading-${i}`} className="h-16 w-20 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">
              {isDragActive ? 'Déposez pour ajouter' : `${photos.length} photo${photos.length > 1 ? 's' : ''} — glissez pour en ajouter`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BienPhotoUpload

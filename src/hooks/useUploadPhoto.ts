async function convertHeicIfNeeded(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
    || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
  if (!isHeic) return file

  const heic2anyModule = await import('heic2any')
  const heic2any = heic2anyModule.default || heic2anyModule
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  // heic2any can return Blob | Blob[] depending on the file
  const blob = Array.isArray(result) ? result[0] : result
  const name = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
  return new File([blob], name, { type: 'image/jpeg' })
}

export function useUploadPhoto() {
  const uploadPhoto = async (
    file: File
  ): Promise<{ url: string; filename: string; size: number; contentType: string }> => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Non authentifié')

    const converted = await convertHeicIfNeeded(file)
    const formData = new FormData()
    formData.append('file', converted)

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Erreur upload')
    return data
  }

  const deletePhoto = async (url: string): Promise<void> => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Non authentifié')

    if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      })
    }
  }

  return { uploadPhoto, deletePhoto }
}

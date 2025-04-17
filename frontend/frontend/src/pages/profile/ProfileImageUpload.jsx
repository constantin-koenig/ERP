// frontend/frontend/src/pages/profile/ProfileImageUpload.jsx
import { useState, useRef } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { uploadProfileImage } from '../../services/authService'
import { getFullImageUrl } from '../../services/axiosInstance' // Importiere die Hilfsfunktion
import { UserCircleIcon, PhotographIcon } from '@heroicons/react/outline'

const ProfileImageUpload = () => {
  const { user, updateSession } = useAuth()
  const [uploading, setUploading] = useState(false)
  
  // Verwende getFullImageUrl für die initial angezeigte URL
  const [previewUrl, setPreviewUrl] = useState(() => {
    return user?.profileImage ? getFullImageUrl(user.profileImage) : '';
  })
  
  const fileInputRef = useRef(null)

  const handleFileSelect = () => {
    fileInputRef.current.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Überprüfe den Dateityp
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!validImageTypes.includes(file.type)) {
      toast.error('Bitte wählen Sie ein gültiges Bildformat (JPEG, PNG, GIF)')
      return
    }
    
    // Überprüfe die Dateigröße (max. 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('Das Bild darf nicht größer als 5MB sein')
      return
    }
    
    // Erstelle eine Vorschau des Bildes (temporär vor dem Upload)
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)
    
    // Lade das Bild hoch
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('profileImage', file)
      
      const response = await uploadProfileImage(formData)
      
      // Wenn der Upload erfolgreich war, aktualisiere den Benutzer
      if (response.data && response.data.success) {
        const imageUrl = response.data.data
        
        // Vollständige URL für die Vorschau setzen
        const fullImageUrl = getFullImageUrl(imageUrl)
        setPreviewUrl(fullImageUrl)
        
        console.log('Profilbild URL:', imageUrl)
        console.log('Vollständige URL:', fullImageUrl)
        
        // Aktualisiere den Benutzer im Auth-Kontext mit dem Bild-Pfad vom Server
        if (updateSession) {
          updateSession({
            ...user,
            profileImage: imageUrl // Speichere den originalen Pfad
          })
        }
        
        toast.success('Profilbild erfolgreich hochgeladen')
      }
    } catch (error) {
      console.error('Fehler beim Hochladen des Profilbilds:', error)
      
      if (error.response) {
        console.error('Server-Antwort:', error.response.data)
        
        if (error.response.data && error.response.data.message) {
          toast.error(`Fehler: ${error.response.data.message}`)
        } else {
          toast.error(`Fehler beim Hochladen (Status: ${error.response.status})`)
        }
      } else {
        toast.error('Fehler beim Hochladen des Profilbilds')
      }
      
      // Setze die Vorschau zurück
      setPreviewUrl(user?.profileImage ? getFullImageUrl(user.profileImage) : '')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="text-center">
      <div className="space-y-1">
        <div className="mx-auto h-40 w-40 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profilbild"
              className="h-full w-full object-cover"
            />
          ) : (
            <UserCircleIcon className="h-full w-full text-gray-300" />
          )}
        </div>
        
        <div className="flex flex-col items-center text-sm">
          <span className="text-gray-500">
            {user?.name || 'Benutzer'}
          </span>
          <span className="text-gray-400 text-xs">
            {user?.role === 'admin' ? 'Administrator' : 
             user?.role === 'manager' ? 'Manager' : 'Benutzer'}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={handleFileSelect}
          disabled={uploading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PhotographIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
          {uploading ? 'Wird hochgeladen...' : 'Bild ändern'}
        </button>
        
        {/* Verstecktes File-Input-Element */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/gif"
          className="hidden"
        />
        
        <p className="mt-2 text-xs text-gray-500">
          PNG, JPG oder GIF, maximal 5MB
        </p>
      </div>
    </div>
  )
}

export default ProfileImageUpload
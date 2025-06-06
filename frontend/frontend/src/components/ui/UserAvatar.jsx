// frontend/frontend/src/components/ui/UserAvatar.jsx
import React, { useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/outline';
import { getFullImageUrl } from '../../services/axiosInstance';
import { useTheme } from '../../context/ThemeContext';

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const { isDarkMode } = useTheme();
  
  // Definiere Größen-Klassen für verschiedene Größen
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-40 w-40'
  };
  
  // Wähle die passende Größenklasse oder die Standard-Größe
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Konvertiere die Profilbild-URL nur, wenn ein Profilbild vorhanden ist und kein Fehler aufgetreten ist
  const profileImage = !imageError && user?.profileImage ? getFullImageUrl(user.profileImage) : null;

  const handleImageError = () => {
    console.warn('Profilbild konnte nicht geladen werden:', profileImage);
    setImageError(true);
  };

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center ${className}`}>
      {profileImage && !imageError ? (
        <img
          src={profileImage}
          alt={user?.name || 'Benutzer'}
          className="h-full w-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <UserCircleIcon className={`h-full w-full ${isDarkMode ? 'text-gray-500' : 'text-gray-300'}`} />
      )}
    </div>
  );
};

export default UserAvatar;
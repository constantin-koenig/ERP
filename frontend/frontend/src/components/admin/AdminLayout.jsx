// frontend/frontend/src/components/admin/AdminLayout.jsx
import { useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { 
  UserGroupIcon, 
  CogIcon, 
  ShieldCheckIcon,
  ChartPieIcon
} from '@heroicons/react/outline';

const AdminLayout = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Überprüfung der Berechtigungen
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Keine Berechtigung für den Admin-Bereich');
      navigate('/');
      return;
    }
  }, [user, navigate]);
  
  // Admin-Menüpunkte (Dokumentvorlagen entfernt)
  const adminMenuItems = [
    { 
      path: '/admin/users', 
      name: 'Benutzerverwaltung', 
      icon: UserGroupIcon,
      description: 'Benutzer verwalten, einladen und bearbeiten'
    },
    { 
      path: '/admin/settings', 
      name: 'Systemeinstellungen', 
      icon: CogIcon,
      description: 'Allgemeine Einstellungen, Finanzen, Rechtliches'
    },
    { 
      path: '/admin/logs', 
      name: 'Systemlogs', 
      icon: ShieldCheckIcon,
      description: 'Systemereignisse und Protokolle einsehen'
    },
    { 
      path: '/admin/statistics', 
      name: 'Systemstatistiken', 
      icon: ChartPieIcon,
      description: 'Systemauslastung und Nutzungsstatistiken'
    }
  ];

  // Aktuelle Route finden
  const currentPath = location.pathname;
  const activeItem = adminMenuItems.find(item => 
    currentPath === item.path || currentPath.startsWith(`${item.path}/`)
  ) || adminMenuItems[0];
  
  // Falls kein Benutzer oder kein Admin, dann nichts rendern
  if (!user || user.role !== 'admin') {
    return null;
  }
  
  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header mit Tabs */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Administration</h1>
            
            {/* Tabs Navigation */}
            <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <nav className="-mb-px flex space-x-8">
                {adminMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${currentPath === item.path || currentPath.startsWith(`${item.path}/`) 
                        ? isDarkMode 
                          ? 'border-blue-500 text-blue-400' 
                          : 'border-blue-500 text-blue-600'
                        : isDarkMode
                          ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <item.icon className="h-5 w-5 mr-2" />
                      {item.name}
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hauptinhalt */}
      <div className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Aktuelle Tab-Beschreibung */}
          {activeItem && (
            <div className="mb-6">
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeItem.name}</h2>
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{activeItem.description}</p>
            </div>
          )}
          
          {/* Outlet für die jeweilige Unterseite */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
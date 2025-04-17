// frontend/frontend/src/context/DashboardContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

// Dashboard Context erstellen
const DashboardContext = createContext();

// Hook für den einfachen Zugriff auf den DashboardContext
export const useDashboard = () => {
  return useContext(DashboardContext);
};

// Verfügbare Dashboard-Layouts
export const DASHBOARD_LAYOUTS = {
  DEFAULT: 'default',
  COMPACT: 'compact',
  DETAILED: 'detailed'
};

// DashboardProvider-Komponente
export const DashboardProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Dashboard-Layout-Status initialisieren
  const [layout, setLayout] = useState(DASHBOARD_LAYOUTS.DEFAULT);
  
  // Effekt, der auf Änderungen der Benutzereinstellungen reagiert
  useEffect(() => {
    if (user && user.settings && user.settings.dashboardLayout) {
      // Layout aus Benutzereinstellungen setzen
      if (Object.values(DASHBOARD_LAYOUTS).includes(user.settings.dashboardLayout)) {
        setLayout(user.settings.dashboardLayout);
      }
    }
  }, [user]);
  
  // Manuelle Layout-Änderung ermöglichen
  const changeLayout = (newLayout) => {
    if (Object.values(DASHBOARD_LAYOUTS).includes(newLayout)) {
      setLayout(newLayout);
    }
  };
  
  // Context-Wert
  const value = {
    layout,
    changeLayout,
    isDefault: layout === DASHBOARD_LAYOUTS.DEFAULT,
    isCompact: layout === DASHBOARD_LAYOUTS.COMPACT,
    isDetailed: layout === DASHBOARD_LAYOUTS.DETAILED
  };
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardProvider;
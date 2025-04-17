// frontend/frontend/src/context/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

// Theme Context erstellen
const ThemeContext = createContext();

// Hook für den einfachen Zugriff auf den ThemeContext
export const useTheme = () => {
  return useContext(ThemeContext);
};

// ThemeProvider-Komponente
export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Theme-Status initialisieren
  const [theme, setTheme] = useState('light'); // Standard ist Light Mode
  
  // Effekt, der auf Änderungen der Benutzereinstellungen reagiert
  useEffect(() => {
    const updateThemeFromUserSettings = () => {
      if (user && user.settings && user.settings.theme) {
        // Wenn der Benutzer "system" gewählt hat, lese die Systemeinstellung aus
        if (user.settings.theme === 'system') {
          const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDarkMode ? 'dark' : 'light');
        } else {
          // Ansonsten verwende die explizite Benutzereinstellung
          setTheme(user.settings.theme);
        }
      } else {
        // Fallback zu Light Mode, wenn keine Einstellungen vorhanden sind
        setTheme('light');
      }
    };
    
    // Initialer Aufruf
    updateThemeFromUserSettings();
    
    // Event-Listener für Änderungen der Systemeinstellung hinzufügen
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Nur aktualisieren, wenn der Benutzer "system" gewählt hat
      if (user?.settings?.theme === 'system') {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    // MediaQueryList-Event-Listener hinzufügen
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback für ältere Browser
      mediaQuery.addListener(handleChange);
    }
    
    // Cleanup beim Unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [user]);
  
  // Anwenden des Themes auf das HTML-Element
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
  
  // Manuelle Theme-Änderung ermöglichen
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  // Context-Wert
  const value = {
    theme,
    toggleTheme,
    isDarkMode: theme === 'dark'
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
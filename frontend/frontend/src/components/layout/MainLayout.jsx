// src/components/layout/MainLayout.jsx - Mit Theme-Support
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useTheme } from '../../context/ThemeContext'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} overflow-hidden transition-colors duration-200`}>
      {/* Sidebar für desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <Sidebar sidebarOpen={false} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Mobile Sidebar (off-canvas) */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className={`relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          </div>
        </div>
      )}

      {/* Hauptinhalt */}
      <div className="flex flex-col flex-1 md:pl-64">
        <Navbar setSidebarOpen={setSidebarOpen} />

        {/* Hauptinhalt */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isDarkMode ? 'text-white' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
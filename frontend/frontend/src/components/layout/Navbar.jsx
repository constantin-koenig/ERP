// frontend/frontend/src/components/layout/Navbar.jsx - Mit Theme-Support
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Transition } from '@headlessui/react'
import { 
  MenuIcon, 
  BellIcon, 
  CogIcon, 
  LogoutIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/outline'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useDashboard, DASHBOARD_LAYOUTS } from '../../context/DashboardContext'
import UserAvatar from '../ui/UserAvatar'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const Navbar = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, isDarkMode } = useTheme()
  const { layout, changeLayout } = useDashboard()

  return (
    <header className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm z-10 transition-colors duration-200`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button
              type="button"
              className={`md:hidden inline-flex items-center justify-center p-2 rounded-md ${
                isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              } focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500`}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <span className="sr-only">Menü öffnen</span>
              <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex-shrink-0 flex items-center">
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>ERP System</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1 rounded-full ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white' 
                  : 'text-gray-400 hover:text-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              title={isDarkMode ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
            >
              <span className="sr-only">Design wechseln</span>
              {isDarkMode ? (
                <SunIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <MoonIcon className="h-6 w-6" aria-hidden="true" />
              )}
            </button>

            {/* Dashboard Layout Selector */}
            <Menu as="div" className="relative">
              {({ open }) => (
                <>
                  <Menu.Button 
                    className={`flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'
                    }`}
                    title="Dashboard-Ansicht wechseln"
                  >
                    <span className="sr-only">Dashboard-Ansicht wechseln</span>
                    <CogIcon className="h-6 w-6" aria-hidden="true" />
                  </Menu.Button>
                  <Transition
                    show={open}
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items 
                      static 
                      className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ${
                        isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-700 ring-1 ring-black ring-opacity-5'
                      } focus:outline-none z-50`}
                    >
                      <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p>Dashboard-Ansicht</p>
                      </div>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`w-full text-left px-4 py-2 text-sm ${
                              layout === DASHBOARD_LAYOUTS.DEFAULT 
                                ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                : active 
                                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                  : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                            }`}
                            onClick={() => changeLayout(DASHBOARD_LAYOUTS.DEFAULT)}
                          >
                            Standard
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`w-full text-left px-4 py-2 text-sm ${
                              layout === DASHBOARD_LAYOUTS.COMPACT 
                                ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                : active 
                                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                  : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                            }`}
                            onClick={() => changeLayout(DASHBOARD_LAYOUTS.COMPACT)}
                          >
                            Kompakt
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`w-full text-left px-4 py-2 text-sm ${
                              layout === DASHBOARD_LAYOUTS.DETAILED 
                                ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                : active 
                                  ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900')
                                  : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                            }`}
                            onClick={() => changeLayout(DASHBOARD_LAYOUTS.DETAILED)}
                          >
                            Detailliert
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </>
              )}
            </Menu>

            {/* Benachrichtigungen */}
            <button
              type="button"
              className={`p-1 rounded-full ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white' 
                  : 'text-gray-400 hover:text-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <span className="sr-only">Benachrichtigungen anzeigen</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Profilmenü */}
            <Menu as="div" className="relative">
              {({ open }) => (
                <>
                  <div>
                    <Menu.Button className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <span className="sr-only">Benutzermenü öffnen</span>
                      <UserAvatar user={user} size="sm" />
                    </Menu.Button>
                  </div>
                  <Transition
                    show={open}
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items 
                      static 
                      className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ${
                        isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-700 ring-1 ring-black ring-opacity-5'
                      } focus:outline-none z-50`}
                    >
                      <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'} border-b`}>
                        <p>Angemeldet als</p>
                        <p className="font-medium">{user?.name || 'Benutzer'}</p>
                      </div>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`block px-4 py-2 text-sm ${
                              active
                                ? isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            <div className="flex items-center">
                              <UserAvatar user={user} size="sm" className="mr-3 h-5 w-5" />
                              Profil & Einstellungen
                            </div>
                          </Link>
                        )}
                      </Menu.Item>
                      
                      {/* Admin-Menüpunkt, nur für Admins anzeigen */}
                      {user?.role === 'admin' && (
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/admin/users"
                              className={`block px-4 py-2 text-sm ${
                                active
                                  ? isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center">
                                <CogIcon className={`mr-3 h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                                Administration
                              </div>
                            </Link>
                          )}
                        </Menu.Item>
                      )}
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={logout}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              active
                                ? isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            <div className="flex items-center">
                              <LogoutIcon className={`mr-3 h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                              Abmelden
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </>
              )}
            </Menu>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
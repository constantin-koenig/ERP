// frontend/frontend/src/pages/admin/SystemLogs.jsx (aktualisiert)
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import { getSystemLogs, exportSystemLogs } from '../../services/systemLogsService';
import { SearchIcon, FilterIcon, DownloadIcon, XIcon } from '@heroicons/react/outline';

const SystemLogs = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    level: '',
    user: '',
    startDate: '',
    endDate: ''
  });
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]); // Neu laden, wenn sich Seite oder Filter ändern

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Bereite Filter-Parameter vor
      const queryParams = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      // Wenn ein Suchbegriff existiert, suche in der Nachricht und im Benutzernamen
      if (searchTerm) {
        queryParams.search = searchTerm;
      }
      
      const response = await getSystemLogs(queryParams);
      
      if (response.data.success) {
        setLogs(response.data.data);
        setPagination(response.data.pagination);
      } else {
        toast.error('Fehler beim Laden der Logs');
        
        // Demo-Daten anzeigen, wenn das Backend nicht antwortet
        setDemoData();
      }
    } catch (error) {
      console.error('Fehler beim Laden der Systemlogs:', error);
      toast.error('Fehler beim Laden der Systemlogs');
      
      // Demo-Daten anzeigen bei einem Fehler
      setDemoData();
    } finally {
      setLoading(false);
    }
  };

  const setDemoData = () => {
    // Demo-Logs für die UI-Entwicklung
    const demoLogs = [
      { _id: 1, timestamp: new Date().toISOString(), level: 'info', message: 'System gestartet', userName: 'System' },
      { _id: 2, timestamp: new Date().toISOString(), level: 'warning', message: 'Fehlerhafte Anmeldeversuche erkannt', userName: 'admin' },
      { _id: 3, timestamp: new Date().toISOString(), level: 'error', message: 'Datenbankverbindung unterbrochen', userName: 'System' },
      { _id: 4, timestamp: new Date().toISOString(), level: 'info', message: 'Benutzer hat sich angemeldet', userName: 'max.mustermann' },
      { _id: 5, timestamp: new Date().toISOString(), level: 'info', message: 'Systemeinstellungen geändert', userName: 'admin' }
    ];
    setLogs(demoLogs);
    setPagination({
      page: 1,
      limit: 50,
      total: demoLogs.length,
      pages: 1
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      level: '',
      user: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
  };

  const handleExport = async () => {
    try {
      await exportSystemLogs(filters);
      toast.success('Export der Logs wurde gestartet');
    } catch (error) {
      console.error('Fehler beim Exportieren der Logs:', error);
      toast.error('Fehler beim Exportieren der Logs');
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      fetchLogs();
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'info':
        return isDarkMode 
          ? 'bg-blue-900 text-blue-100' 
          : 'bg-blue-100 text-blue-800';
      case 'warning':
        return isDarkMode 
          ? 'bg-yellow-900 text-yellow-100' 
          : 'bg-yellow-100 text-yellow-800';
      case 'error':
        return isDarkMode 
          ? 'bg-red-900 text-red-100' 
          : 'bg-red-100 text-red-800';
      default:
        return isDarkMode 
          ? 'bg-gray-700 text-gray-100' 
          : 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Systemlogs</h1>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DownloadIcon className="h-5 w-5 mr-2" />
          Logs exportieren
        </button>
      </div>

      {/* Such- und Filterbereich */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Suchfeld */}
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="text"
              placeholder="Nach Nachricht oder Benutzer suchen..."
              className={`pl-10 pr-3 py-2 border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } rounded-md w-full focus:ring-blue-500 focus:border-blue-500`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>

          {/* Filter-Button */}
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`inline-flex items-center px-4 py-2 border ${
              isDarkMode 
                ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600' 
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              } rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            <FilterIcon className="h-5 w-5 mr-2" />
            Filter {isFilterVisible ? 'ausblenden' : 'anzeigen'}
          </button>
        </div>

        {/* Erweiterter Filterbereich */}
        {isFilterVisible && (
          <div className={`mt-4 p-4 rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Log-Level
                </label>
                <select
                  name="level"
                  value={filters.level}
                  onChange={handleFilterChange}
                  className={`block w-full rounded-md shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900 bg-white'
                    } focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                >
                  <option value="">Alle Level</option>
                  <option value="info">Info</option>
                  <option value="warning">Warnung</option>
                  <option value="error">Fehler</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Benutzer
                </label>
                <input
                  type="text"
                  name="user"
                  value={filters.user}
                  onChange={handleFilterChange}
                  placeholder="Benutzer"
                  className={`block w-full rounded-md shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900 bg-white'
                    } focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Von Datum
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className={`block w-full rounded-md shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900 bg-white'
                    } focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Bis Datum
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className={`block w-full rounded-md shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900 bg-white'
                    } focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClearFilters}
                className={`inline-flex items-center px-3 py-1.5 border ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  } rounded-md text-sm`}
              >
                <XIcon className="h-4 w-4 mr-1" />
                Filter zurücksetzen
              </button>
              <button
                onClick={fetchLogs}
                className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Anwenden
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logs-Tabelle */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
          <p className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Logs werden geladen...</p>
        </div>
      ) : (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden sm:rounded-lg`}>
          {logs.length === 0 ? (
            <div className={`p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Keine Logs gefunden. Versuchen Sie es mit anderen Filtereinstellungen.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Zeitstempel
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Level
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Nachricht
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Benutzer
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200 dark:divide-gray-700`}>
                    {logs.map((log) => (
                      <tr key={log._id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelBadge(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-pre-wrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {log.message}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {log.userName || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginierung */}
              {pagination.pages > 1 && (
                <div className={`px-4 py-3 flex items-center justify-between border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} sm:px-6`}>
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-700'
                        } text-sm font-medium rounded-md ${
                        pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      Zurück
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-700'
                        } text-sm font-medium rounded-md ${
                        pagination.page === pagination.pages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      Weiter
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                        Zeige <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> bis <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span> von <span className="font-medium">{pagination.total}</span> Ergebnissen
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                            isDarkMode 
                              ? 'border-gray-600 bg-gray-700 text-white' 
                              : 'border-gray-300 bg-white text-gray-500'
                            } ${
                            pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Vorherige</span>
                          {/* Zurück-Icon */}
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Seitenzahlen dynamisch generieren */}
                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                          // Berechne die Seitenzahlen für eine Paginierung mit 5 Elementen
                          let pageNum;
                          if (pagination.pages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.pages - 2) {
                            pageNum = pagination.pages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={i}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border ${
                                isDarkMode 
                                  ? 'border-gray-600' 
                                  : 'border-gray-300'
                                } ${
                                pageNum === pagination.page
                                  ? isDarkMode 
                                    ? 'bg-gray-600 text-white' 
                                    : 'bg-blue-50 text-blue-600 border-blue-500'
                                  : isDarkMode 
                                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                              } text-sm font-medium`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.pages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                            isDarkMode 
                              ? 'border-gray-600 bg-gray-700 text-white' 
                              : 'border-gray-300 bg-white text-gray-500'
                            } ${
                            pagination.page === pagination.pages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Nächste</span>
                          {/* Weiter-Icon */}
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
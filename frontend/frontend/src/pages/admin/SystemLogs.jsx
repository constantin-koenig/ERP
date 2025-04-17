// frontend/frontend/src/pages/admin/SystemLogs.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const SystemLogs = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Demo-Logs laden
    setTimeout(() => {
      const demoLogs = [
        { id: 1, timestamp: new Date().toISOString(), level: 'info', message: 'System gestartet', user: 'System' },
        { id: 2, timestamp: new Date().toISOString(), level: 'warning', message: 'Fehlerhafte Anmeldeversuche erkannt', user: 'admin' },
        { id: 3, timestamp: new Date().toISOString(), level: 'error', message: 'Datenbankverbindung unterbrochen', user: 'System' },
        { id: 4, timestamp: new Date().toISOString(), level: 'info', message: 'Benutzer hat sich angemeldet', user: 'max.mustermann' },
        { id: 5, timestamp: new Date().toISOString(), level: 'info', message: 'Systemeinstellungen geändert', user: 'admin' }
      ];
      setLogs(demoLogs);
      setLoading(false);
    }, 800);
  }, []);

  const getLevelBadge = (level) => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Systemlogs</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
          <p className="ml-2 text-gray-600">Logs werden geladen...</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Systemereignisse</h2>
            <button
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Logs exportieren
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zeitstempel
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nachricht
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benutzer
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelBadge(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
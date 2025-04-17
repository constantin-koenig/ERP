// frontend/frontend/src/components/ui/ResponsiveTable.jsx - Mit Dark Mode Support
import React from 'react';

/**
 * Ein responsives Tabellen-Komponent, das für verschiedene Bildschirmgrößen optimiert ist
 * 
 * @param {Object} props
 * @param {Array} props.columns - Array mit Spaltenobjekten [{ header: 'Name', accessor: 'name', className: 'optional-class' }]
 * @param {Array} props.data - Array mit Datenobjekten [{ id: 1, name: 'Test', ... }]
 * @param {Function} props.renderMobileRow - Optional: Funktion zum Rendern des mobilen Layouts pro Zeile
 * @param {boolean} props.isLoading - Optional: Ladestatus
 * @param {React.ReactNode} props.emptyState - Optional: Komponente für leere Tabelle
 * @param {boolean} props.darkMode - Optional: Dark Mode aktiviert
 */
const ResponsiveTable = ({ 
  columns, 
  data, 
  renderMobileRow,
  isLoading = false,
  emptyState = <div className="text-center py-10 text-gray-500 dark:text-gray-400">Keine Daten vorhanden</div>,
  darkMode = false
}) => {
  // Wenn keine Daten vorhanden sind
  if (!isLoading && (!data || data.length === 0)) {
    return emptyState;
  }

  // Ladezustand
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Daten werden geladen...</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Version der Tabelle (versteckt auf mobilen Geräten) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {data.map((row, rowIdx) => (
              <tr key={row.id || rowIdx} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                {columns.map((column, colIdx) => (
                  <td key={colIdx} className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}>
                    {column.cell ? column.cell(row) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Version der Tabelle (nur auf mobilen Geräten sichtbar) */}
      <div className="md:hidden">
        <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {data.map((row, idx) => (
            <div key={row.id || idx} className={`py-4 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
              {renderMobileRow ? (
                renderMobileRow(row)
              ) : (
                <div className="space-y-2">
                  {columns.map((column, colIdx) => (
                    <div key={colIdx} className="px-4 py-1">
                      <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>
                        {column.header}
                      </div>
                      <div className="mt-1">
                        {column.cell ? column.cell(row) : row[column.accessor]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ResponsiveTable;
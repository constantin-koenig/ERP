// src/components/ui/SearchAndFilter.jsx
import React, { useState, useEffect } from 'react';
import { SearchIcon, FilterIcon, XIcon } from '@heroicons/react/outline';

/**
 * Reusable search and filter component
 * 
 * @param {Object} props
 * @param {Function} props.onSearch - Function to call when search text changes
 * @param {Function} props.onSort - Function to call when sort option changes
 * @param {Array} props.sortOptions - Array of sort options [{value: 'name_asc', label: 'Name (A-Z)'}, ...]
 * @param {Object} props.filters - Additional filters config {label: 'Status', options: [{value: 'active', label: 'Active'}], onFilter: (value) => {}}
 * @param {boolean} props.darkMode - Whether dark mode is active
 */
const SearchAndFilter = ({ 
  onSearch, 
  onSort, 
  sortOptions = [], 
  filters = null, 
  darkMode = false,
  searchPlaceholder = "Suchen..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(sortOptions.length > 0 ? sortOptions[0].value : '');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  useEffect(() => {
    // When sortOptions change, update sortBy if needed
    if (sortOptions.length > 0 && !sortOptions.find(option => option.value === sortBy)) {
      setSortBy(sortOptions[0].value);
    }
  }, [sortOptions, sortBy]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Delay search by 300ms to avoid too many searches while typing
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortBy(value);
    onSort(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="mb-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col md:flex-row gap-3 mb-3">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <input
            type="text"
            className={`pl-10 pr-10 py-2 border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } rounded-md w-full focus:ring-blue-500 focus:border-blue-500`}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={handleClearSearch}
            >
              <XIcon className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          )}
        </div>

        {sortOptions.length > 0 && (
          <div className="min-w-[200px]">
            <select
              className={`block w-full py-2 px-3 border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } rounded-md focus:ring-blue-500 focus:border-blue-500`}
              value={sortBy}
              onChange={handleSortChange}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {filters && (
          <button
            className={`inline-flex items-center px-4 py-2 border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            <FilterIcon className="-ml-1 mr-2 h-5 w-5" />
            Filter
            {isFilterExpanded ? (
              <XIcon className="ml-2 h-4 w-4" />
            ) : (
              <span className="ml-1">›</span>
            )}
          </button>
        )}
      </div>

      {/* Filters Row (expandable) */}
      {filters && isFilterExpanded && (
        <div className={`p-4 mb-4 rounded-md ${
          darkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(filters).map((filterKey) => {
              const filter = filters[filterKey];
              return (
                <div key={filterKey}>
                  <label className={`block text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  } mb-1`}>
                    {filter.label}
                  </label>
                  <select
                    className={`block w-full py-2 px-3 border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } rounded-md focus:ring-blue-500 focus:border-blue-500`}
                    value={filter.value || ''}
                    onChange={(e) => filter.onFilter(filterKey, e.target.value)}
                  >
                    <option value="">{filter.allLabel || 'Alle'}</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
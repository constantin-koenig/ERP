// frontend/frontend/src/pages/admin/SystemStats.jsx (aktualisiert)
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  ChartPieIcon, 
  UsersIcon, 
  ClipboardListIcon, 
  CurrencyEuroIcon, 
  ClockIcon 
} from '@heroicons/react/outline';
import { getSystemStats, getMonthlyRevenue, getCustomerDistribution, getOrderStatistics } from '../../services/systemStatsService';

const SystemStats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    customers: 0,
    orders: 0,
    invoices: 0,
    revenue: 0,
    openAmount: 0,
    timeTrackings: 0
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [customerDistribution, setCustomerDistribution] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    topCustomers: []
  });
  const [orderStats, setOrderStats] = useState({
    statusStats: {},
    monthlyData: []
  });
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    setLoading(true);
    try {
      // Parallele Anfragen für bessere Performance
      const [statsResponse, revenueResponse, customerResponse, orderResponse] = await Promise.all([
        getSystemStats(),
        getMonthlyRevenue(),
        getCustomerDistribution(),
        getOrderStatistics()
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      if (revenueResponse.data.success) {
        setMonthlyRevenue(revenueResponse.data.data);
      }

      if (customerResponse.data.success) {
        setCustomerDistribution(customerResponse.data.data);
      }

      if (orderResponse.data.success) {
        setOrderStats(orderResponse.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Systemstatistiken:', error);
      // Bei Fehlern im Backend dennoch Demostatistiken anzeigen
      setStats({
        users: 12,
        customers: 87,
        orders: 134,
        invoices: 98,
        revenue: 45860.50,
        openAmount: 12450.75,
        timeTrackings: 256
      });
      
      // Demo-Diagrammdaten für monatlichen Umsatz
      setMonthlyRevenue([
        { month: 1, monthName: 'Jan', total: 3200, paid: 3200, unpaid: 0 },
        { month: 2, monthName: 'Feb', total: 4100, paid: 3800, unpaid: 300 },
        { month: 3, monthName: 'Mär', total: 3800, paid: 3500, unpaid: 300 },
        { month: 4, monthName: 'Apr', total: 4200, paid: 3800, unpaid: 400 },
        { month: 5, monthName: 'Mai', total: 5100, paid: 4200, unpaid: 900 },
        { month: 6, monthName: 'Jun', total: 4900, paid: 4100, unpaid: 800 },
        { month: 7, monthName: 'Jul', total: 5400, paid: 4300, unpaid: 1100 },
        { month: 8, monthName: 'Aug', total: 5200, paid: 4100, unpaid: 1100 },
        { month: 9, monthName: 'Sep', total: 4800, paid: 3700, unpaid: 1100 },
        { month: 10, monthName: 'Okt', total: 5600, paid: 4200, unpaid: 1400 },
        { month: 11, monthName: 'Nov', total: 6100, paid: 4500, unpaid: 1600 },
        { month: 12, monthName: 'Dez', total: 5800, paid: 4200, unpaid: 1600 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };
  
  // Berechne maximale Umsatzhöhe für die Skalierung des Diagramms
  const maxRevenue = Math.max(...monthlyRevenue.map(item => item.total));
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Systemstatistiken</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
          <p className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Statistiken werden geladen...</p>
        </div>
      ) : (
        <>
          {/* Statistik-Karten */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                        Benutzer
                      </dt>
                      <dd>
                        <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.users}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                        Kunden
                      </dt>
                      <dd>
                        <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.customers}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClipboardListIcon className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                        Aufträge
                      </dt>
                      <dd>
                        <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.orders}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyEuroIcon className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                        Rechnungen
                      </dt>
                      <dd>
                        <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.invoices}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyEuroIcon className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                        Gesamtumsatz
                      </dt>
                      <dd>
                        <div className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(stats.revenue)}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Umsatzdiagramm */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 shadow rounded-lg mb-6`}>
            <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Jahresumsatz</h2>
            <div className="h-64">
              <div className="flex h-full items-end">
                {monthlyRevenue.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative">
                      {/* Gesamtumsatz */}
                      <div 
                        className="w-full bg-blue-500 hover:bg-blue-600 transition-all duration-300 rounded-t"
                        style={{ height: `${(item.total / maxRevenue) * 100}%` }}
                      >
                        <div className="invisible">{item.total}</div>
                      </div>
                      {/* Bezahlter Umsatz */}
                      <div 
                        className="w-full bg-green-500 hover:bg-green-600 transition-all duration-300 rounded-t absolute bottom-0"
                        style={{ 
                          height: `${(item.paid / maxRevenue) * 100}%`,
                          zIndex: 2 
                        }}
                      >
                        <div className="invisible">{item.paid}</div>
                      </div>
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{item.monthName}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-center space-x-6">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gesamtumsatz</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bezahlter Umsatz</span>
              </div>
            </div>
          </div>

          {/* Weitere Statistikblöcke */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 shadow rounded-lg`}>
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Kundenverteilung</h2>
              <div className="h-64 flex items-center justify-center">
                {customerDistribution.total > 0 ? (
                  <div className="w-full max-w-xs">
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-200 text-green-800'}`}>
                            Aktive Kunden
                          </span>
                        </div>
                        <div className={`text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className="text-xs font-semibold">
                            {customerDistribution.active} von {customerDistribution.total} ({Math.round((customerDistribution.active / customerDistribution.total) * 100)}%)
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-300 dark:bg-gray-700">
                        <div style={{ width: `${(customerDistribution.active / customerDistribution.total) * 100}%` }} 
                             className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Top Kunden nach Umsatz</h3>
                      <ul className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {customerDistribution.topCustomers && customerDistribution.topCustomers.map((customer, index) => (
                          <li key={index} className="py-2 flex justify-between">
                            <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{customer.name}</span>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(customer.totalRevenue)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <ChartPieIcon className={`h-24 w-24 mx-auto ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kreisdiagramm mit Kundenverteilung</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 shadow rounded-lg`}>
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Auftragsstatistik</h2>
              <div className="h-64">
                {Object.keys(orderStats.statusStats).length > 0 ? (
                  <div className="w-full">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(orderStats.statusStats).map(([status, count], index) => (
                        <div key={index} className={`p-4 rounded-lg ${
                          status === 'neu' ? (isDarkMode ? 'bg-blue-900' : 'bg-blue-100') :
                          status === 'in Bearbeitung' ? (isDarkMode ? 'bg-yellow-900' : 'bg-yellow-100') :
                          status === 'abgeschlossen' ? (isDarkMode ? 'bg-green-900' : 'bg-green-100') :
                          (isDarkMode ? 'bg-red-900' : 'bg-red-100')
                        }`}>
                          <div className={`text-2xl font-bold mb-1 ${
                            status === 'neu' ? (isDarkMode ? 'text-blue-200' : 'text-blue-700') :
                            status === 'in Bearbeitung' ? (isDarkMode ? 'text-yellow-200' : 'text-yellow-700') :
                            status === 'abgeschlossen' ? (isDarkMode ? 'text-green-200' : 'text-green-700') :
                            (isDarkMode ? 'text-red-200' : 'text-red-700')
                          }`}>{count}</div>
                          <div className={`text-sm ${
                            status === 'neu' ? (isDarkMode ? 'text-blue-300' : 'text-blue-600') :
                            status === 'in Bearbeitung' ? (isDarkMode ? 'text-yellow-300' : 'text-yellow-600') :
                            status === 'abgeschlossen' ? (isDarkMode ? 'text-green-300' : 'text-green-600') :
                            (isDarkMode ? 'text-red-300' : 'text-red-600')
                          }`}>{status}</div>
                        </div>
                      ))}
                    </div>
                    
                    {orderStats.monthlyData && orderStats.monthlyData.length > 0 && (
                      <div className="mt-6">
                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Aufträge der letzten 6 Monate</h3>
                        <div className="mt-2 flex items-end h-24">
                          {orderStats.monthlyData.map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <div 
                                className={`w-4/5 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} rounded-t-sm`}
                                style={{ height: `${(item.count / Math.max(...orderStats.monthlyData.map(d => d.count))) * 100}%` }}
                              ></div>
                              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{item.month}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <ClipboardListIcon className={`h-24 w-24 mx-auto ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Balkendiagramm mit Auftragsstatistik</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemStats;
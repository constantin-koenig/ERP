// frontend/frontend/src/pages/admin/SystemStats.jsx
import React, { useState, useEffect } from 'react';
import { 
  ChartPieIcon, 
  UsersIcon, 
  ClipboardListIcon, 
  CurrencyEuroIcon, 
  ClockIcon 
} from '@heroicons/react/outline';

const SystemStats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    customers: 0,
    orders: 0,
    invoices: 0,
    revenue: 0
  });

  useEffect(() => {
    // Demo-Statistiken laden
    setTimeout(() => {
      setStats({
        users: 12,
        customers: 87,
        orders: 134,
        invoices: 98,
        revenue: 45860.50
      });
      setLoading(false);
    }, 800);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Demo-Diagrammdaten
  const revenueData = [
    { month: 'Jan', amount: 3200 },
    { month: 'Feb', amount: 4100 },
    { month: 'Mär', amount: 3800 },
    { month: 'Apr', amount: 4200 },
    { month: 'Mai', amount: 5100 },
    { month: 'Jun', amount: 4900 },
    { month: 'Jul', amount: 5400 },
    { month: 'Aug', amount: 5200 },
    { month: 'Sep', amount: 4800 },
    { month: 'Okt', amount: 5600 },
    { month: 'Nov', amount: 6100 },
    { month: 'Dez', amount: 5800 }
  ];

  // Berechne maximale Umsatzhöhe für die Skalierung des Diagramms
  const maxRevenue = Math.max(...revenueData.map(item => item.amount));
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Systemstatistiken</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
          <p className="ml-2 text-gray-600">Statistiken werden geladen...</p>
        </div>
      ) : (
        <>
          {/* Statistik-Karten */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Benutzer
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{stats.users}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Kunden
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{stats.customers}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClipboardListIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Aufträge
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{stats.orders}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyEuroIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Rechnungen
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{stats.invoices}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyEuroIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Gesamtumsatz
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{formatCurrency(stats.revenue)}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Umsatzdiagramm */}
          <div className="bg-white p-6 shadow rounded-lg mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Jahresumsatz</h2>
            <div className="h-64">
              <div className="flex h-full items-end">
                {revenueData.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 hover:bg-blue-600 transition-all duration-300 rounded-t"
                      style={{ height: `${(item.amount / maxRevenue) * 100}%` }}
                    >
                      <div className="invisible">{item.amount}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.month}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weitere Statistikblöcke */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">
            <div className="bg-white p-6 shadow rounded-lg">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Kundenverteilung</h2>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <ChartPieIcon className="h-24 w-24 mx-auto text-gray-300" />
                  <p className="mt-2">Kreisdiagramm mit Kundenverteilung</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 shadow rounded-lg">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Auftragsstatistik</h2>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <ClipboardListIcon className="h-24 w-24 mx-auto text-gray-300" />
                  <p className="mt-2">Balkendiagramm mit Auftragsstatistik</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemStats;
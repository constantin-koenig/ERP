// frontend/frontend/src/pages/dashboard/Dashboard.jsx - Mit Theme- und Layout-Support
import { useState, useEffect } from 'react';
import { getCustomers } from '../../services/customerService';
import { getOrders } from '../../services/orderService';
import { getInvoices } from '../../services/invoiceService';
import { getTimeTrackings } from '../../services/timeTrackingService';
import { DashboardContent } from '../../components/dashboard/DashboardLayouts';
import { useDashboard } from '../../context/DashboardContext';
import { useTheme } from '../../context/ThemeContext';

const Dashboard = () => {
  const { layout } = useDashboard();
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    customers: { count: 0, loading: true },
    orders: { count: 0, loading: true },
    invoices: { count: 0, loading: true, data: [] },
    timeTracking: { count: 0, loading: true }
  });
  const [recentItems, setRecentItems] = useState({
    orders: { loading: true, data: [] },
    invoices: { loading: true, data: [] }
  });
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({
    totalOpen: 0,
    totalPaid: 0,
    loading: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Kunden laden
        const customersResponse = await getCustomers();
        setStats(prev => ({
          ...prev,
          customers: { count: customersResponse.data.count, loading: false }
        }));

        // Aufträge laden
        const ordersResponse = await getOrders();
        setStats(prev => ({
          ...prev,
          orders: { count: ordersResponse.data.count, loading: false }
        }));
        setRecentItems(prev => ({
          ...prev,
          orders: { 
            loading: false, 
            data: ordersResponse.data.data
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5) 
          }
        }));

        // Rechnungen laden
        const invoicesResponse = await getInvoices();
        const invoices = invoicesResponse.data.data || [];
        const openInvoices = invoices.filter(inv => inv.status !== 'bezahlt');
        const paidInvoices = invoices.filter(inv => inv.status === 'bezahlt');
        
        setStats(prev => ({
          ...prev,
          invoices: { 
            count: invoicesResponse.data.count, 
            loading: false, 
            data: invoices
          }
        }));
        setRecentItems(prev => ({
          ...prev,
          invoices: { 
            loading: false, 
            data: invoices
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5) 
          }
        }));

        // Finanzdaten berechnen
        const totalOpen = openInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        
        setFinancials({
          totalOpen,
          totalPaid,
          loading: false
        });

        // Arbeitszeiten laden
        const timeResponse = await getTimeTrackings();
        setStats(prev => ({
          ...prev,
          timeTracking: { count: timeResponse.data.count, loading: false }
        }));
        
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Dashboard-Daten:', error);
        // Fehlerbehandlung für jede Datenquelle einzeln
        setStats({
          customers: { count: 0, loading: false },
          orders: { count: 0, loading: false },
          invoices: { count: 0, loading: false, data: [] },
          timeTracking: { count: 0, loading: false }
        });
        setRecentItems({
          orders: { loading: false, data: [] },
          invoices: { loading: false, data: [] }
        });
        setFinancials({
          totalOpen: 0,
          totalPaid: 0,
          loading: false
        });
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className={`container mx-auto px-2 sm:px-4 lg:px-6 ${isDarkMode ? 'text-white' : ''}`}>
      <div className="py-4 sm:py-6 lg:py-8">
        <div className="mb-6">
          <h1 className={`text-xl sm:text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Dashboard
          </h1>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Willkommen im ERP-System. Hier siehst du eine Übersicht deiner Daten.
          </p>
        </div>

        {/* Dynamisches Dashboard-Layout basierend auf Benutzereinstellungen */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="spinner"></div>
            <p className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Daten werden geladen...</p>
          </div>
        ) : (
          <DashboardContent 
            stats={stats}
            recentOrders={recentItems.orders}
            recentInvoices={recentItems.invoices}
            financials={financials}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
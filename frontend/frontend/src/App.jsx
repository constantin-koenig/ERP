import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { DashboardProvider } from './context/DashboardContext'

// Layouts
import MainLayout from './components/layout/MainLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard'

// Customer Pages
import Customers from './pages/customers/Customers'
import CustomerDetail from './pages/customers/CustomerDetail'
import CustomerForm from './pages/customers/CustomerForm'

// Order Pages
import Orders from './pages/orders/Orders'
import OrderDetail from './pages/orders/OrderDetail'
import OrderForm from './pages/orders/OrderForm'

// Time Tracking Pages
import TimeTracking from './pages/time/TimeTracking'
import TimeTrackingForm from './pages/time/TimeTrackingForm'

// Invoice Pages
import Invoices from './pages/invoices/Invoices'
import InvoiceDetail from './pages/invoices/InvoiceDetail'
import InvoiceForm from './pages/invoices/InvoiceForm'

// System Settings Pages
import AdminLayout from './components/admin/AdminLayout'
import UserManagement from './pages/admin/UserManagement'
import SystemSettings from './pages/admin/SystemSettings'
import SystemLogs from './pages/admin/SystemLogs'
import SystemStats from './pages/admin/SystemStats'

// User Settings Pages
import UserProfile from './pages/profile/UserProfile'

// Error Pages
import NotFound from './pages/NotFound'

// ProtectedRoute Komponente, um Route-Zustand zu erhalten
const ProtectedRoute = ({ children }) => {
  const { user, initialized } = useAuth();
  const location = useLocation();

  // Warte auf die Initialisierung des Auth-Kontexts
  if (!initialized) {
    return <div className="flex justify-center items-center h-screen">
      <div className="spinner"></div>
      <p className="ml-2 text-gray-600 dark:text-gray-300">Lädt...</p>
    </div>;
  }

  // Wenn der Benutzer nicht angemeldet ist, speichere aktuelle Route und navigiere zum Login
  if (!user) {
    // Speichere den aktuellen Pfad, aber nur wenn es keine Login- oder Register-Route ist
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      sessionStorage.setItem('redirectPath', location.pathname + location.search);
    }
    return <Navigate to="/login" />;
  }

  // Benutzer ist angemeldet, zeige die Komponente
  return children;
};

// LoginRedirect Komponente, um nach Login zur vorherigen Route zurückzukehren
const LoginRedirect = ({ children }) => {
  const { user } = useAuth();
  
  if (user) {
    // Prüfen, ob ein gespeicherter Pfad existiert
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      // Pfad aus dem Storage entfernen
      sessionStorage.removeItem('redirectPath');
      return <Navigate to={redirectPath} />;
    }
    
    // Kein gespeicherter Pfad, zum Dashboard navigieren
    return <Navigate to="/" />;
  }
  
  // Benutzer ist nicht angemeldet, zeige Login/Register
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <DashboardProvider>
        <Routes>
          {/* Public Routes mit Login-Weiterleitung */}
          <Route path="/login" element={
            <LoginRedirect>
              <Login />
            </LoginRedirect>
          } />
          <Route path="/register" element={
            <LoginRedirect>
              <Register />
            </LoginRedirect>
          } />

          {/* Protected Routes mit MainLayout */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            
            {/* Customer Routes */}
            <Route path="customers">
              <Route index element={<Customers />} />
              <Route path="new" element={<CustomerForm />} />
              <Route path=":id" element={<CustomerDetail />} />
              <Route path=":id/edit" element={<CustomerForm />} />
            </Route>
            
            {/* Order Routes */}
            <Route path="orders">
              <Route index element={<Orders />} />
              <Route path="new" element={<OrderForm />} />
              <Route path=":id" element={<OrderDetail />} />
              <Route path=":id/edit" element={<OrderForm />} />
            </Route>
            
            {/* Time Tracking Routes */}
            <Route path="time-tracking">
              <Route index element={<TimeTracking />} />
              <Route path="new" element={<TimeTrackingForm />} />
              <Route path=":id/edit" element={<TimeTrackingForm />} />
            </Route>
            
            {/* Invoice Routes */}
            <Route path="invoices">
              <Route index element={<Invoices />} />
              <Route path="new" element={<InvoiceForm />} />
              <Route path=":id" element={<InvoiceDetail />} />
              <Route path=":id/edit" element={<InvoiceForm />} />
            </Route>
            
            {/* User Profile Route */}
            <Route path="profile" element={<UserProfile />} />

            {/* Admin Routes mit Layout */}
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/users" />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="logs" element={<SystemLogs />} />
              <Route path="statistics" element={<SystemStats />} />
            </Route>
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DashboardProvider>
    </ThemeProvider>
  )
}

export default App
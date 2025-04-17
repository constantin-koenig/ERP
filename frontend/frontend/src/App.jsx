import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

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
import TemplateEditor from './pages/admin/TemplateEditor'
import SystemStats from './pages/admin/SystemStats'


// User Settings Pages
import UserProfile from './pages/profile/UserProfile'

// Error Pages
import NotFound from './pages/NotFound'

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

      {/* Protected Routes */}
      <Route path="/" element={user ? <MainLayout /> : <Navigate to="/login" />}>
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
          <Route path="templates" element={<TemplateEditor />} />
          <Route path="statistics" element={<SystemStats />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
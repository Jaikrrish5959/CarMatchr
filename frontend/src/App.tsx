import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';

const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const BuyerDashboard = React.lazy(() => import('./pages/Dashboard/BuyerDashboard'));
const BrokerDashboard = React.lazy(() => import('./pages/Dashboard/BrokerDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));
const NewCarDealers = React.lazy(() => import('./pages/Dealers/NewCarDealers'));
const UsedCarDealers = React.lazy(() => import('./pages/Dealers/UsedCarDealers'));
const DealerProfile = React.lazy(() => import('./pages/Dealers/DealerProfile'));

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'buyer' | 'broker' | 'admin' }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-gray-200)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="dealers/new" element={<NewCarDealers />} />
            <Route path="dealers/used" element={<UsedCarDealers />} />
            <Route path="dealers/:id" element={<DealerProfile />} />
            
            <Route path="buyer-dashboard" element={
              <ProtectedRoute allowedRole="buyer">
                <BuyerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="broker-dashboard" element={
              <ProtectedRoute allowedRole="broker">
                <BrokerDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BuyersPage from './pages/Buyers';
import SellersPage from './pages/Sellers';
import RequirementsPage from './pages/Requirements';
import OffersPage from './pages/Offers';
import ListingsPage from './pages/Listings';
import LogsPage from './pages/Logs';

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public: Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected: everything under Layout (redirects to /login if not authed) */}
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="buyers" element={<BuyersPage />} />
            <Route path="sellers" element={<SellersPage />} />
            <Route path="requirements" element={<RequirementsPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="logs" element={<LogsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

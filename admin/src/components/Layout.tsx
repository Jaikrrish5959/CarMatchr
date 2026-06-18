import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export default function Layout() {
  const { isAuthenticated } = useAdminAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        padding: '32px 36px',
        minHeight: '100vh',
        background: 'var(--bg-base)',
      }}>
        <Outlet />
      </main>
    </div>
  );
}

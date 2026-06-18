import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DashboardStats } from '../api';
import { Users, Building2, FileText, MessageSquare, Car, TrendingUp, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color }}>
        {icon}
      </div>
      <div className="stat-value">{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Platform-wide overview at a glance</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} color="var(--green)" />
          <span style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 600 }}>Live data</span>
        </div>
      </div>

      {loading && (
        <div className="loading-center">
          <div className="spinner" />
          <span>Loading stats…</span>
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
          borderRadius: 10, padding: '14px 18px', color: 'var(--accent)',
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Main stat cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <StatCard
              label="Total Buyers"
              value={stats.totalUsers}
              icon={<Users size={18} color="#3b82f6" />}
              color="var(--blue-dim)"
              sub={`${stats.activeUsers} active · ${stats.suspendedUsers} suspended`}
            />
            <StatCard
              label="Total Sellers"
              value={stats.totalBrokers}
              icon={<Building2 size={18} color="#10b981" />}
              color="var(--green-dim)"
              sub={`${stats.activeBrokers} active · ${stats.suspendedBrokers} suspended`}
            />
            <StatCard
              label="Requirements"
              value={stats.totalRequirements}
              icon={<FileText size={18} color="#f59e0b" />}
              color="var(--yellow-dim)"
              sub={`${stats.openRequirements} open · ${stats.closedRequirements} closed`}
            />
            <StatCard
              label="Total Offers"
              value={stats.totalOffers}
              icon={<MessageSquare size={18} color="#e53935" />}
              color="var(--accent-dim)"
            />
            <StatCard
              label="Active Listings"
              value={stats.totalListings}
              icon={<Car size={18} color="#8b5cf6" />}
              color="rgba(139,92,246,0.12)"
            />
          </div>

          {/* Secondary breakdown table */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Breakdown Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                { label: 'Active Buyers', val: stats.activeUsers, ok: true },
                { label: 'Suspended Buyers', val: stats.suspendedUsers, ok: stats.suspendedUsers === 0 },
                { label: 'Active Sellers', val: stats.activeBrokers, ok: true },
                { label: 'Suspended Sellers', val: stats.suspendedBrokers, ok: stats.suspendedBrokers === 0 },
                { label: 'Open Requirements', val: stats.openRequirements, ok: true },
                { label: 'Closed Requirements', val: stats.closedRequirements, ok: true },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                  borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{
                    fontWeight: 700,
                    color: item.ok ? 'var(--text-primary)' : 'var(--accent)',
                  }}>
                    {item.val.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

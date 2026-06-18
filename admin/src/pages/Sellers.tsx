import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, ShieldOff, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import type { Broker } from '../api';
import { DataTable } from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';

export default function SellersPage() {
  const [sellers, setSellers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmSeller, setConfirmSeller] = useState<Broker | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBrokers();
      setSellers(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sellers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? sellers.filter(s =>
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.businessName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.city ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : sellers;

  async function handleToggleSuspend(seller: Broker) {
    const isSuspended = seller.status === 'pending';
    const action = isSuspended ? 'unsuspend' : 'suspend';
    try {
      await api.suspendBroker(seller.id, !isSuspended);
      toast.success(`Seller ${action}ed successfully.`);
      setSellers(prev => prev.map(s => s.id === seller.id
        ? { ...s, status: isSuspended ? 'active' : 'pending' }
        : s
      ));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} seller.`);
    }
    setConfirmSeller(null);
  }

  const dealerTypeLabel = (type: string | null) => {
    if (type === 'new') return 'New Cars';
    if (type === 'used') return 'Used Cars';
    if (type === 'both') return 'New & Used';
    return '—';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sellers</h1>
          <p className="page-subtitle">All registered dealers and sellers</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} color="var(--green)" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sellers.length} total</span>
        </div>
      </div>

      <DataTable
        data={filtered}
        loading={loading}
        searchPlaceholder="Search by email, business name, or city…"
        onSearch={setSearch}
        emptyText="No sellers found"
        columns={[
          { key: 'id', label: 'ID', width: '60px' },
          { key: 'email', label: 'Email' },
          { key: 'businessName', label: 'Business', render: r => r.businessName ?? '—' },
          { key: 'city', label: 'City', render: r => r.city ?? '—' },
          { key: 'dealerType', label: 'Type', width: '110px', render: r => dealerTypeLabel(r.dealerType) },
          { key: 'listingCount', label: 'Listings', width: '80px', render: r => (
            <span style={{ fontWeight: 600, color: r.listingCount > 0 ? 'var(--blue)' : 'var(--text-muted)' }}>
              {r.listingCount}
            </span>
          )},
          {
            key: 'status', label: 'Status', width: '100px',
            render: r => (
              <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                {r.status === 'active' ? 'Active' : 'Suspended'}
              </span>
            ),
          },
          {
            key: 'createdAt', label: 'Joined', width: '110px',
            render: r => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        actions={row => (
          <button
            className={row.status === 'active' ? 'btn-danger' : 'btn-success'}
            onClick={() => setConfirmSeller(row)}
          >
            {row.status === 'active'
              ? <><ShieldOff size={12} /> Suspend</>
              : <><ShieldCheck size={12} /> Restore</>
            }
          </button>
        )}
      />

      {confirmSeller && (
        <ConfirmModal
          title={confirmSeller.status === 'active' ? 'Suspend Seller?' : 'Restore Seller?'}
          message={
            confirmSeller.status === 'active'
              ? `Suspend ${confirmSeller.businessName ?? confirmSeller.email}? They won't be visible to buyers.`
              : `Restore ${confirmSeller.businessName ?? confirmSeller.email}? They will be visible again.`
          }
          confirmLabel={confirmSeller.status === 'active' ? 'Suspend' : 'Restore'}
          danger={confirmSeller.status === 'active'}
          onConfirm={() => handleToggleSuspend(confirmSeller)}
          onCancel={() => setConfirmSeller(null)}
        />
      )}
    </div>
  );
}

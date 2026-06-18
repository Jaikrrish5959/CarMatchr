import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Users, ShieldOff, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import type { User } from '../api';
import { DataTable } from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmBuyer, setConfirmBuyer] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setBuyers(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load buyers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? buyers.filter(b =>
        b.email.toLowerCase().includes(search.toLowerCase()) ||
        (b.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (b.city ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : buyers;

  async function handleToggleSuspend(buyer: User) {
    const isSuspended = buyer.status === 'pending';
    const action = isSuspended ? 'unsuspend' : 'suspend';
    try {
      await api.suspendUser(buyer.id, !isSuspended);
      toast.success(`Buyer ${action}ed successfully.`);
      setBuyers(prev => prev.map(b => b.id === buyer.id
        ? { ...b, status: isSuspended ? 'active' : 'pending' }
        : b
      ));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} buyer.`);
    }
    setConfirmBuyer(null);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Buyers</h1>
          <p className="page-subtitle">All registered buyers on the platform</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} color="var(--blue)" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{buyers.length} total</span>
        </div>
      </div>

      <DataTable
        data={filtered}
        loading={loading}
        searchPlaceholder="Search by email, name, or city…"
        onSearch={setSearch}
        emptyText="No buyers found"
        columns={[
          { key: 'id', label: 'ID', width: '60px' },
          { key: 'email', label: 'Email' },
          { key: 'name', label: 'Name', render: r => r.name ?? '—' },
          { key: 'city', label: 'City', render: r => r.city ?? '—' },
          {
            key: 'status', label: 'Status', width: '100px',
            render: r => (
              <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                {r.status === 'active' ? 'Active' : 'Suspended'}
              </span>
            ),
          },
          {
            key: 'createdAt', label: 'Joined', width: '120px',
            render: r => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        actions={row => (
          <button
            className={row.status === 'active' ? 'btn-danger' : 'btn-success'}
            onClick={() => setConfirmBuyer(row)}
            title={row.status === 'active' ? 'Suspend buyer' : 'Unsuspend buyer'}
          >
            {row.status === 'active'
              ? <><ShieldOff size={12} /> Suspend</>
              : <><ShieldCheck size={12} /> Restore</>
            }
          </button>
        )}
      />

      {confirmBuyer && (
        <ConfirmModal
          title={confirmBuyer.status === 'active' ? 'Suspend Buyer?' : 'Restore Buyer?'}
          message={
            confirmBuyer.status === 'active'
              ? `Suspend ${confirmBuyer.email}? They will lose access to the platform.`
              : `Restore ${confirmBuyer.email}? They will regain access to the platform.`
          }
          confirmLabel={confirmBuyer.status === 'active' ? 'Suspend' : 'Restore'}
          danger={confirmBuyer.status === 'active'}
          onConfirm={() => handleToggleSuspend(confirmBuyer)}
          onCancel={() => setConfirmBuyer(null)}
        />
      )}
    </div>
  );
}

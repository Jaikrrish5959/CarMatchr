import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { MessageSquare, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Offer } from '../api';
import { DataTable } from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';

function formatPrice(val: string | null): string {
  if (!val) return '—';
  const n = Number(val);
  if (isNaN(n)) return val;
  return `₹${n.toLocaleString('en-IN')}`;
}

const statusBadge: Record<string, string> = {
  pending:  'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmOffer, setConfirmOffer] = useState<Offer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getOffers();
      setOffers(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load offers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? offers.filter(o =>
        (o.buyerEmail ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.brokerEmail ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.brokerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.brandName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (o.modelName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : offers;

  async function handleDelete(offer: Offer) {
    try {
      await api.deleteOffer(offer.id);
      toast.success('Offer deleted.');
      setOffers(prev => prev.filter(o => o.id !== offer.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete offer.');
    }
    setConfirmOffer(null);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Offers</h1>
          <p className="page-subtitle">All broker offers submitted on the platform</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{offers.length} total</span>
        </div>
      </div>

      <DataTable
        data={filtered}
        loading={loading}
        searchPlaceholder="Search by buyer, broker, brand, or model…"
        onSearch={setSearch}
        emptyText="No offers found"
        columns={[
          { key: 'id', label: 'ID', width: '60px' },
          { key: 'buyerEmail', label: 'Buyer', render: r => r.buyerEmail ?? '—' },
          { key: 'brokerName', label: 'Broker', render: r => r.brokerName ?? r.brokerEmail ?? '—' },
          {
            key: 'vehicle', label: 'Vehicle',
            render: r => [r.brandName, r.modelName, r.variant].filter(Boolean).join(' ') || '—',
          },
          {
            key: 'price', label: 'Price', width: '110px',
            render: r => <span style={{ fontWeight: 600, color: 'var(--green)' }}>{formatPrice(r.price)}</span>,
          },
          {
            key: 'status', label: 'Status', width: '100px',
            render: r => (
              <span className={`badge ${statusBadge[r.status] ?? 'badge-yellow'}`}>
                {r.status}
              </span>
            ),
          },
          {
            key: 'createdAt', label: 'Date', width: '110px',
            render: r => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        actions={row => (
          <button className="btn-danger" onClick={() => setConfirmOffer(row)} title="Delete offer">
            <Trash2 size={12} /> Delete
          </button>
        )}
      />

      {confirmOffer && (
        <ConfirmModal
          title="Delete Offer?"
          message={`Permanently delete offer #${confirmOffer.id} from ${confirmOffer.brokerName ?? confirmOffer.brokerEmail ?? 'unknown broker'}?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(confirmOffer)}
          onCancel={() => setConfirmOffer(null)}
        />
      )}
    </div>
  );
}

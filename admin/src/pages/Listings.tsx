import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Car, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Listing } from '../api';
import { DataTable } from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmListing, setConfirmListing] = useState<Listing | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getListings();
      setListings(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? listings.filter(l =>
        (l.brokerEmail ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.brokerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.brandName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.modelName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.city ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  async function handleDelete(listing: Listing) {
    try {
      await api.deleteListing(listing.id);
      toast.success('Listing deleted.');
      setListings(prev => prev.filter(l => l.id !== listing.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete listing.');
    }
    setConfirmListing(null);
  }

  function formatPrice(val: string | number | null): string {
    if (!val) return '—';
    const n = Number(val);
    if (isNaN(n)) return String(val);
    return `₹${n.toLocaleString('en-IN')}`;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Listings</h1>
          <p className="page-subtitle">All broker-posted vehicle listings</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Car size={16} color="var(--blue)" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{listings.length} total</span>
        </div>
      </div>

      <DataTable
        data={filtered}
        loading={loading}
        searchPlaceholder="Search by broker, brand, model, or city…"
        onSearch={setSearch}
        emptyText="No listings found"
        columns={[
          { key: 'id', label: 'ID', width: '60px' },
          { key: 'brokerName', label: 'Broker', render: r => r.brokerName ?? r.brokerEmail ?? '—' },
          {
            key: 'vehicle', label: 'Vehicle',
            render: r => [r.brandName, r.modelName].filter(Boolean).join(' ') || '—',
          },
          { key: 'year', label: 'Year', width: '70px' },
          {
            key: 'price', label: 'Price', width: '120px',
            render: r => <span style={{ fontWeight: 600, color: 'var(--green)' }}>{formatPrice(r.price)}</span>,
          },
          { key: 'city', label: 'City', render: r => r.city ?? '—', width: '100px' },
          { key: 'fuelType', label: 'Fuel', render: r => r.fuelType ?? '—', width: '80px' },
          {
            key: 'kmDriven', label: 'KM', width: '90px',
            render: r => r.kmDriven != null ? `${r.kmDriven.toLocaleString()} km` : '—',
          },
          {
            key: 'status', label: 'Status', width: '90px',
            render: r => (
              <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                {r.status}
              </span>
            ),
          },
          {
            key: 'createdAt', label: 'Posted', width: '110px',
            render: r => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
        actions={row => (
          <button className="btn-danger" onClick={() => setConfirmListing(row)} title="Delete listing">
            <Trash2 size={12} /> Delete
          </button>
        )}
      />

      {confirmListing && (
        <ConfirmModal
          title="Delete Listing?"
          message={`Permanently delete the ${confirmListing.year} ${confirmListing.brandName ?? ''} ${confirmListing.modelName ?? ''} listing by ${confirmListing.brokerName ?? 'unknown'}?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(confirmListing)}
          onCancel={() => setConfirmListing(null)}
        />
      )}
    </div>
  );
}

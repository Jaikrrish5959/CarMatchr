import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Requirement } from '../api';
import { DataTable } from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';

export default function RequirementsPage() {
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmReq, setConfirmReq] = useState<Requirement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRequirements();
      setReqs(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load requirements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? reqs.filter(r =>
        (r.buyerEmail ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.brandName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.modelName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
      )
    : reqs;

  async function handleDelete(req: Requirement) {
    try {
      await api.deleteRequirement(req.id);
      toast.success('Requirement deleted.');
      setReqs(prev => prev.filter(r => r.id !== req.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete requirement.');
    }
    setConfirmReq(null);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Requirements</h1>
          <p className="page-subtitle">All buyer car requirements posted on the platform</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="var(--yellow)" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{reqs.length} total</span>
        </div>
      </div>

      <DataTable
        data={filtered}
        loading={loading}
        searchPlaceholder="Search by buyer, brand, model, or city…"
        onSearch={setSearch}
        emptyText="No requirements found"
        columns={[
          { key: 'id', label: 'ID', width: '60px' },
          { key: 'buyerEmail', label: 'Buyer', render: r => r.buyerEmail ?? '—' },
          {
            key: 'vehicle', label: 'Vehicle',
            render: r => [r.brandName, r.modelName].filter(Boolean).join(' ') || '—',
          },
          {
            key: 'vehicleType', label: 'Type', width: '80px',
            render: r => (
              <span className={`badge ${r.vehicleType === 'new' ? 'badge-blue' : 'badge-yellow'}`}>
                {r.vehicleType === 'new' ? 'New' : 'Used'}
              </span>
            ),
          },
          { key: 'city', label: 'City', render: r => r.city ?? '—', width: '100px' },
          {
            key: 'status', label: 'Status', width: '90px',
            render: r => (
              <span className={`badge ${r.status === 'open' ? 'badge-green' : 'badge-red'}`}>
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
          <button className="btn-danger" onClick={() => setConfirmReq(row)} title="Delete requirement">
            <Trash2 size={12} /> Delete
          </button>
        )}
      />

      {confirmReq && (
        <ConfirmModal
          title="Delete Requirement?"
          message={`Permanently delete requirement #${confirmReq.id} by ${confirmReq.buyerEmail ?? 'unknown'}? All associated offers will also be deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(confirmReq)}
          onCancel={() => setConfirmReq(null)}
        />
      )}
    </div>
  );
}

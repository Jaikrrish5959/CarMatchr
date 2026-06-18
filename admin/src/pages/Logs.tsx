import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ScrollText } from 'lucide-react';
import { api } from '../api';
import type { AdminLog } from '../api';
import { DataTable } from '../components/DataTable';

const actionColors: Record<string, string> = {
  suspend_user:        'badge-red',
  unsuspend_user:      'badge-green',
  suspend_broker:      'badge-red',
  unsuspend_broker:    'badge-green',
  delete_requirement:  'badge-yellow',
  delete_offer:        'badge-yellow',
  delete_listing:      'badge-yellow',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLogs();
      setLogs(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.targetType.toLowerCase().includes(search.toLowerCase()) ||
        l.targetId.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Record of all admin actions performed on the platform</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScrollText size={16} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Last 500 actions</span>
        </div>
      </div>

      <DataTable
        data={filtered}
        loading={loading}
        searchPlaceholder="Search by action or target type…"
        onSearch={setSearch}
        emptyText="No admin actions recorded yet"
        columns={[
          { key: 'id', label: 'ID', width: '60px' },
          {
            key: 'action', label: 'Action',
            render: r => (
              <span className={`badge ${actionColors[r.action] ?? 'badge-blue'}`}>
                {r.action.replace(/_/g, ' ')}
              </span>
            ),
          },
          { key: 'targetType', label: 'Entity', width: '110px' },
          { key: 'targetId',   label: 'Target ID', width: '90px' },
          {
            key: 'createdAt', label: 'Timestamp',
            render: r => new Date(r.createdAt).toLocaleString(),
          },
        ]}
      />
    </div>
  );
}

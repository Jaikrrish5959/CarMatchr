import { useState } from 'react';
import { Search, Inbox } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  emptyText?: string;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  loading,
  onSearch,
  searchPlaceholder = 'Search…',
  searchValue = '',
  emptyText = 'No records found',
  actions,
}: DataTableProps<T>) {
  const [localQ, setLocalQ] = useState(searchValue);

  function handleSearch(val: string) {
    setLocalQ(val);
    onSearch?.(val);
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      {onSearch && (
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div className="search-bar" style={{ width: 300 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localQ}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {data.length} record{data.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <Inbox size={40} />
          <p>{emptyText}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={String(col.key)} style={col.width ? { width: col.width } : {}}>
                    {col.label}
                  </th>
                ))}
                {actions && <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id} className="fade-in">
                  {columns.map(col => (
                    <td key={String(col.key)}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key as string] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

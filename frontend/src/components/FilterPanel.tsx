import React from 'react';
import { X } from 'lucide-react';
import { budgetRanges, bodyTypes, fuelTypes, transmissions, type Filters } from '../data/carDatabase';
import { useLanguage } from '../hooks/useLanguage';
import { useCatalog } from '../hooks/useCatalog';
import tnLocations from '../data/tn-locations.json';

interface FilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  resultCount: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onChange, onClose, resultCount }) => {
  const { t } = useLanguage();
  const { brands } = useCatalog();

  const set = (key: keyof Filters, value: string | number) => {
    onChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onChange({ city: filters.city, make: '', bodyType: '', fuelType: '', transmission: '', budgetMin: 0, budgetMax: Infinity, search: '' });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 'var(--radius-xl)', width: '100%',
        maxWidth: '480px', maxHeight: '85vh', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>{t('filters')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Budget */}
          <div className="form-group">
            <label className="form-label">{t('budget')}</label>
            <select className="form-control" value={filters.budgetMin === 0 && filters.budgetMax === Infinity ? '' : `${filters.budgetMin}-${filters.budgetMax}`}
              onChange={e => {
                if (!e.target.value) { set('budgetMin', 0); onChange({ ...filters, budgetMin: 0, budgetMax: Infinity }); return; }
                const [min, max] = e.target.value.split('-').map(Number);
                onChange({ ...filters, budgetMin: min, budgetMax: max || Infinity });
              }}>
              <option value="">All Budgets</option>
              {budgetRanges.map(b => <option key={b.label} value={`${b.min}-${b.max}`}>{b.label}</option>)}
            </select>
          </div>

          {/* Location — District */}
          <div className="form-group">
            <label className="form-label">Location (District)</label>
            <select className="form-control" value={filters.city}
              onChange={e => set('city', e.target.value)}>
              <option value="">All Districts</option>
              {((tnLocations as { districts: { id: string; name: string }[] }).districts).map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Body Type */}
          <div className="form-group">
            <label className="form-label">{t('bodyType')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {bodyTypes.map(bt => (
                <button key={bt} onClick={() => set('bodyType', filters.bodyType === bt ? '' : bt)}
                  className={`btn btn-sm ${filters.bodyType === bt ? 'btn-primary' : 'btn-secondary'}`}>
                  {bt}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div className="form-group">
            <label className="form-label">{t('fuelType')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {fuelTypes.map(ft => (
                <button key={ft} onClick={() => set('fuelType', filters.fuelType === ft ? '' : ft)}
                  className={`btn btn-sm ${filters.fuelType === ft ? 'btn-primary' : 'btn-secondary'}`}>
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Transmission */}
          <div className="form-group">
            <label className="form-label">{t('transmission')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {transmissions.map(tr => (
                <button key={tr} onClick={() => set('transmission', filters.transmission === tr ? '' : tr)}
                  className={`btn btn-sm ${filters.transmission === tr ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}>
                  {tr}
                </button>
              ))}
            </div>
          </div>

          {/* Make */}
          <div className="form-group">
            <label className="form-label">Make</label>
            <select className="form-control" value={filters.make} onChange={e => set('make', e.target.value)}>
              <option value="">All Brands</option>
              {brands.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--color-gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={clearAll} style={{
            background: 'none', border: 'none', color: 'var(--color-primary)',
            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font)',
          }}>{t('clearAll')}</button>
          <button onClick={onClose} className="btn btn-primary">
            Show {resultCount} {t('carsFound')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;

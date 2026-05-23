import React, { useState } from 'react';
import { X, Search, MapPin } from 'lucide-react';
import { cities } from '../data/carDatabase';
import { useLanguage } from '../contexts/useLanguage';

interface CitySelectorProps {
  onSelect: (city: string) => void;
  onClose: () => void;
}

const CitySelector: React.FC<CitySelectorProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const { t } = useLanguage();

  const filtered = search
    ? cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.state.toLowerCase().includes(search.toLowerCase()))
    : cities;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 'var(--radius-xl)', width: '100%',
        maxWidth: '520px', maxHeight: '80vh', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>{t('selectCity')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
            <input
              type="text" className="form-control" style={{ paddingLeft: '40px' }}
              placeholder="Type your Pincode or City"
              value={search} onChange={e => setSearch(e.target.value)} autoFocus
            />
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px',
            background: 'none', border: 'none', color: 'var(--color-primary)',
            fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font)',
          }}>
            <MapPin size={14} /> {t('detectLocation')}
          </button>
        </div>

        {/* City Grid */}
        <div style={{ padding: '0 24px 24px', overflowY: 'auto', maxHeight: '50vh' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            {t('popularCities')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {filtered.map(city => (
              <button key={city.name} onClick={() => { onSelect(city.name); onClose(); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '16px 8px', background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font)',
                }}>
                <span style={{ fontSize: '1.5rem' }}>{city.icon}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-700)' }}>{city.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitySelector;

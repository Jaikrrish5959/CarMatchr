/**
 * LocationSelector.tsx
 * Cascading 3-level dropdown: District → Taluk → Area
 * Data source: tn-locations.json
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import tnLocations from '../data/tn-locations.json';

// ─── Types ────────────────────────────────────────────────────
export interface LocationValue {
  district: string;
  taluk: string;
  area: string;
}

export const EMPTY_LOCATION: LocationValue = { district: '', taluk: '', area: '' };

interface District {
  id: string;
  name: string;
  taluks: { id: string; name: string; areas: string[] }[];
}

const districts: District[] = (tnLocations as { districts: District[] }).districts;

// ─── Helper to derive display label ───────────────────────────
export function locationLabel(loc: LocationValue): string {
  if (loc.area)     return `${loc.area}, ${loc.taluk}, ${loc.district}`;
  if (loc.taluk)    return `${loc.taluk}, ${loc.district}`;
  if (loc.district) return loc.district;
  return '';
}

// ─── Shared select style ──────────────────────────────────────
const selectStyle = (hasValue: boolean, disabled = false): React.CSSProperties => ({
  width: '100%',
  padding: '11px 36px 11px 14px',
  borderRadius: '10px',
  border: '2px solid #e2e8f0',
  fontFamily: 'var(--font)',
  fontSize: '0.9rem',
  color: hasValue ? '#0f172a' : '#94a3b8',
  background: disabled ? '#f8fafc' : '#fff',
  appearance: 'none' as const,
  cursor: disabled ? 'not-allowed' : 'pointer',
  outline: 'none',
  transition: 'border-color 0.2s',
  opacity: disabled ? 0.6 : 1,
});

// ─── Single-select (inline) ───────────────────────────────────
interface LocationSelectorProps {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  required?: boolean;
  /** Override column layout; default is 3 equal columns */
  columns?: string;
  gap?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  value, onChange, required = false, columns = '1fr 1fr 1fr', gap = '16px',
}) => {
  const selectedDistrict = districts.find(d => d.name === value.district);
  const taluks = selectedDistrict?.taluks ?? [];
  const selectedTaluk = taluks.find(t => t.name === value.taluk);
  const areas = selectedTaluk?.areas ?? [];

  const onDistrict = (district: string) => onChange({ district, taluk: '', area: '' });
  const onTaluk    = (taluk: string)    => onChange({ ...value, taluk, area: '' });
  const onArea     = (area: string)     => onChange({ ...value, area });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, gap }}>
      {/* District */}
      <div style={{ position: 'relative' }}>
        <select
          required={required}
          value={value.district}
          onChange={e => onDistrict(e.target.value)}
          style={selectStyle(!!value.district)}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
        >
          <option value="">Select District</option>
          {districts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
      </div>

      {/* Taluk */}
      <div style={{ position: 'relative' }}>
        <select
          value={value.taluk}
          disabled={!value.district}
          onChange={e => onTaluk(e.target.value)}
          style={selectStyle(!!value.taluk, !value.district)}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
        >
          <option value="">Select Taluk</option>
          {taluks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
      </div>

      {/* Area */}
      <div style={{ position: 'relative' }}>
        <select
          value={value.area}
          disabled={!value.taluk}
          onChange={e => onArea(e.target.value)}
          style={selectStyle(!!value.area, !value.taluk)}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
        >
          <option value="">Select Area</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
      </div>
    </div>
  );
};

// ─── Multi-district picker (for broker service area) ──────────
interface MultiDistrictPickerProps {
  selectedDistricts: string[];
  onChange: (districts: string[]) => void;
}

export const MultiDistrictPicker: React.FC<MultiDistrictPickerProps> = ({ selectedDistricts, onChange }) => {
  const toggle = (name: string) =>
    onChange(
      selectedDistricts.includes(name)
        ? selectedDistricts.filter(d => d !== name)
        : [...selectedDistricts, name]
    );

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {districts.map(d => {
          const active = selectedDistricts.includes(d.name);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggle(d.name)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: active ? '1.5px solid var(--color-primary)' : '1.5px solid #e2e8f0',
                background: active ? 'rgba(230,57,70,0.08)' : '#f8fafc',
                color: active ? 'var(--color-primary)' : '#475569',
                fontFamily: 'var(--font)',
                fontSize: '0.8125rem',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {active ? '✓ ' : ''}{d.name}
            </button>
          );
        })}
      </div>
      {selectedDistricts.length > 0 && (
        <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '8px' }}>
          {selectedDistricts.length} district{selectedDistricts.length > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
};

export default LocationSelector;

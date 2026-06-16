/**
 * CitySelector.tsx  (updated)
 * Now uses TN cascading dropdowns: District → Taluk → Area
 * The selected value is surfaced as a city string for backward compatibility.
 */
import React, { useState } from 'react';
import { X, MapPin, ChevronRight } from 'lucide-react';
import tnLocations from '../data/tn-locations.json';

interface CitySelectorProps {
  onSelect: (city: string) => void;
  onClose: () => void;
}

interface District {
  id: string;
  name: string;
  taluks: { id: string; name: string; areas: string[] }[];
}

const districts: District[] = (tnLocations as { districts: District[] }).districts;

const CitySelector: React.FC<CitySelectorProps> = ({ onSelect, onClose }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedTaluk, setSelectedTaluk] = useState<{ id: string; name: string; areas: string[] } | null>(null);
  const [step, setStep] = useState<'district' | 'taluk' | 'area'>('district');

  const pickDistrict = (d: District) => {
    setSelectedDistrict(d);
    setSelectedTaluk(null);
    setStep('taluk');
  };

  const pickTaluk = (t: { id: string; name: string; areas: string[] }) => {
    setSelectedTaluk(t);
    setStep('area');
  };

  const pickArea = (area: string) => {
    onSelect(`${area}, ${selectedTaluk!.name}, ${selectedDistrict!.name}`);
    onClose();
  };

  const pickDistrictOnly = () => {
    onSelect(selectedDistrict!.name);
    onClose();
  };

  const pickTalukOnly = () => {
    onSelect(`${selectedTaluk!.name}, ${selectedDistrict!.name}`);
    onClose();
  };

  const goBack = () => {
    if (step === 'area') setStep('taluk');
    else if (step === 'taluk') { setStep('district'); setSelectedDistrict(null); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 'var(--radius-xl)', width: '100%',
        maxWidth: '540px', maxHeight: '82vh', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--color-gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {step !== 'district' && (
              <button
                onClick={goBack}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font)', fontSize: '0.875rem' }}
              >
                ← Back
              </button>
            )}
            <div>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 800 }}>
                {step === 'district' ? 'Select District' : step === 'taluk' ? `${selectedDistrict?.name} — Select Taluk` : `${selectedTaluk?.name} — Select Area`}
              </h2>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
                <span style={{ color: step === 'district' ? 'var(--color-primary)' : '#94a3b8', fontWeight: step === 'district' ? 700 : 500 }}>District</span>
                <ChevronRight size={10} />
                <span style={{ color: step === 'taluk' ? 'var(--color-primary)' : step === 'area' ? '#94a3b8' : '#cbd5e1', fontWeight: step === 'taluk' ? 700 : 500 }}>Taluk</span>
                <ChevronRight size={10} />
                <span style={{ color: step === 'area' ? 'var(--color-primary)' : '#cbd5e1', fontWeight: step === 'area' ? 700 : 500 }}>Area</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
            <X size={20} />
          </button>
        </div>

        {/* "Use entire District / Taluk" shortcut */}
        {step !== 'district' && (
          <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>
            {step === 'taluk' && (
              <button onClick={pickDistrictOnly} style={{
                background: 'rgba(230,57,70,0.06)', border: '1px dashed rgba(230,57,70,0.3)',
                color: 'var(--color-primary)', padding: '8px 14px', borderRadius: '8px',
                fontFamily: 'var(--font)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <MapPin size={13} /> Use entire {selectedDistrict?.name} district
              </button>
            )}
            {step === 'area' && (
              <button onClick={pickTalukOnly} style={{
                background: 'rgba(230,57,70,0.06)', border: '1px dashed rgba(230,57,70,0.3)',
                color: 'var(--color-primary)', padding: '8px 14px', borderRadius: '8px',
                fontFamily: 'var(--font)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <MapPin size={13} /> Use entire {selectedTaluk?.name} taluk
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {step === 'district' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {districts.map(d => (
                <button key={d.id} onClick={() => pickDistrict(d)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '14px 10px', background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-200)', borderRadius: '12px',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(230,57,70,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.background = 'var(--color-gray-50)'; }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(230,57,70,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={14} color="var(--color-primary)" />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-700)', textAlign: 'center', lineHeight: 1.3 }}>{d.name}</span>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{d.taluks.length} taluks</span>
                </button>
              ))}
            </div>
          )}

          {step === 'taluk' && selectedDistrict && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDistrict.taluks.map(tk => (
                <button key={tk.id} onClick={() => pickTaluk(tk)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-200)', borderRadius: '10px',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(230,57,70,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.background = 'var(--color-gray-50)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={15} color="var(--color-primary)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-dark)', fontSize: '0.9375rem' }}>{tk.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{tk.areas.length} areas</span>
                    <ChevronRight size={14} color="#94a3b8" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'area' && selectedTaluk && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {selectedTaluk.areas.map(area => (
                <button key={area} onClick={() => pickArea(area)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 14px', background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-200)', borderRadius: '10px',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(230,57,70,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.background = 'var(--color-gray-50)'; }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, color: 'var(--color-dark)', fontSize: '0.875rem' }}>{area}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitySelector;

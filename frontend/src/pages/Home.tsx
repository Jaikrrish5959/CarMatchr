import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Award, ArrowRight, Star,
  MapPin, Fuel,
  Shield, Clock, BadgeDollarSign, Lock, Send,
  Car, Wrench, Cpu, Settings, Users, ClipboardList, Leaf,
  Building2, BadgeCheck, Phone, X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLanguage } from '../hooks/useLanguage';
import { useCatalog } from '../hooks/useCatalog';
import { tamilNaduDealers } from '../data/tamilNaduDealers';
import { useLocation } from '../contexts/LocationContext';
import toast from 'react-hot-toast';


const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const;
const TRANSMISSION_TYPES = ['Manual', 'Automatic', 'Any'] as const;

const FUEL_ICONS: Record<string, React.ReactNode> = {
  Petrol: <Fuel size={14} />, Diesel: <Fuel size={14} />, Hybrid: <Leaf size={14} />, Electric: <Zap size={14} />,
};
const TRANS_ICONS: Record<string, React.ReactNode> = {
  Manual: <Wrench size={14} />, Automatic: <Cpu size={14} />, Any: <Settings size={14} />,
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { addRequirement } = useData();
  const { t } = useLanguage();
  const { brands } = useCatalog();
  const { user } = useAuth();
  const { location: selectedLocation, setLocation } = useLocation();
  const [heroMake, setHeroMake] = useState('');
  const [heroModel, setHeroModel] = useState('');
  const [heroBudget, setHeroBudget] = useState('');
  const [heroMinYear] = useState('');
  const [heroMaxYear] = useState('');
  const [heroDescription] = useState('');
  const [heroFuel, setHeroFuel] = useState('');
  const [heroTransmission, setHeroTransmission] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedBrand = brands.find((b) => b.name === heroMake);

  // Derived filtered dealer lists
  const isFiltered = selectedLocation !== 'Tamil Nadu';
  const allNewDealers = tamilNaduDealers.filter(d => d.type === 'new');
  const allUsedDealers = tamilNaduDealers.filter(d => d.type === 'used');
  const newDealers = isFiltered
    ? allNewDealers.filter(d => d.city === selectedLocation)
    : allNewDealers;
  const usedDealers = isFiltered
    ? allUsedDealers.filter(d => d.city === selectedLocation)
    : allUsedDealers;

  const handlePostRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroMake) { toast.error('Please select a car brand.'); return; }
    if (!heroModel) { toast.error('Please select a car model.'); return; }
    if (!heroBudget.trim()) { toast.error('Please specify your budget.'); return; }

    const yearRange = heroMinYear && heroMaxYear ? `${heroMinYear}-${heroMaxYear}` : heroMinYear || heroMaxYear;
    const descParts: string[] = [];
    if (heroFuel) descParts.push(`Fuel: ${heroFuel}`);
    if (heroTransmission && heroTransmission !== 'Any') descParts.push(`Transmission: ${heroTransmission}`);
    if (heroDescription) descParts.push(heroDescription);
    const fullDesc = descParts.join('. ') || 'Looking for a clean vehicle in good condition.';

    if (user) {
      if (user.role !== 'buyer') { toast.error('Only buyers can post requirements.'); return; }
      setSubmitting(true);
      try {
        await addRequirement({
          buyerId: user.id,
          make: heroMake,
          model: heroModel,
          yearRange: yearRange || '2020-2024',
          budget: heroBudget,
          preferredFeature: '',
          description: fullDesc,
          vehicleType: yearRange ? 'used' : 'new',
          state: 'Tamil Nadu',
          city: 'Chennai',
          budgetMin: '0',
          budgetMax: heroBudget.replace(/[^\d.]/g, ''),
          fuelType: heroFuel || 'Any',
          transmission: heroTransmission || 'Any',
        });
        toast.success('Requirement posted successfully!');
        navigate('/buyer-dashboard');
      } catch {
        toast.error('Failed to post requirement.');
      } finally {
        setSubmitting(false);
      }
    } else {
      sessionStorage.setItem('pending_requirement', JSON.stringify({
        make: heroMake, model: heroModel, budget: heroBudget,
        yearRange: yearRange || '2020-2024', description: fullDesc,
      }));
      toast.success('Please log in to complete posting!');
      navigate('/login');
    }
  };






  const getDealerLogoInfo = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('khivraj') || n.includes('maruti')) {
      return { bg: '#eef2ff', text: '#3b82f6', initials: 'MS', border: '#dbeafe' };
    }
    if (n.includes('susee')) {
      return { bg: '#eff6ff', text: '#1d4ed8', initials: 'SA', border: '#dbeafe' };
    }
    if (n.includes('tata')) {
      return { bg: '#f0fdfa', text: '#0d9488', initials: 'TM', border: '#ccfbf1' };
    }
    if (n.includes('hyundai')) {
      return { bg: '#eff6ff', text: '#1e3a8a', initials: 'HT', border: '#dbeafe' };
    }
    if (n.includes('ambal') || n.includes('acme')) {
      return { bg: '#fef2f2', text: '#ef4444', initials: 'AA', border: '#fee2e2' };
    }
    if (n.includes('vst') || n.includes('volvo')) {
      return { bg: '#faf5ff', text: '#7c3aed', initials: 'VM', border: '#f3e8ff' };
    }
    
    const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
    return { bg: '#f8fafc', text: '#475569', initials: initials || 'DL', border: '#e2e8f0' };
  };

  const renderDealerCard = (dealer: typeof tamilNaduDealers[0], idx: number) => {
    const logoInfo = getDealerLogoInfo(dealer.name);
    const isTopRated = dealer.rating >= 4.8;

    return (
      <div
        key={`${dealer.id}-${idx}`}
        onClick={() => navigate(`/dealers/${dealer.id}`)}
        title={`View profile of ${dealer.name}`}
        style={{
          flexShrink: 0,
          width: '200px',
          padding: '14px 16px',
          background: '#FFFFFF',
          border: '1px solid #EEEEEE',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Badge — 9px font, positioned top-left */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          background: isTopRated ? '#fef3c7' : '#dcfce7',
          color: isTopRated ? '#d97706' : '#15803d',
          padding: '2px 6px', borderRadius: '4px',
          fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: '3px', zIndex: 2,
          marginBottom: '8px',
        }}>
          {isTopRated ? <Star size={7} fill="currentColor" /> : <Zap size={7} />}
          {isTopRated ? 'TOP RATED' : 'FAST RESPONSE'}
        </div>

        {/* Avatar — 44px with border-radius 10px per spec */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '10px',
          background: logoInfo.bg, border: `1px solid ${logoInfo.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: logoInfo.text,
          marginTop: '20px', marginBottom: '8px', flexShrink: 0,
        }}>
          {logoInfo.initials}
        </div>

        {/* Dealer name — 13px fw600 */}
        <h3 style={{
          fontSize: '13px', fontWeight: 600, color: '#1A1A1A',
          display: 'flex', alignItems: 'center', gap: '3px',
          marginBottom: '3px', justifyContent: 'center', lineHeight: 1.3,
        }}>
          {dealer.name}
          {dealer.verified && <BadgeCheck size={10} color="#E53935" />}
        </h3>

        {/* Location — 11px #888 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#888', fontSize: '11px', marginBottom: '4px' }}>
          <MapPin size={9} /> {dealer.city}
        </div>

        {/* Stars — 11px */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fbbf24', fontSize: '11px', fontWeight: 600 }}>
          <Star size={9} fill="currentColor" /> {dealer.rating.toFixed(1)}
          <span style={{ fontWeight: 400, color: '#aaa', marginLeft: '2px' }}>({dealer.reviews})</span>
        </div>

        {/* Meta row — 11px #666, margin-top 10px, gap 10px */}
        <div style={{ display: 'flex', gap: '10px', color: '#666', fontSize: '11px', marginTop: '10px', width: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <BadgeDollarSign size={9} color="#E53935" /> {dealer.vehicles}+ Offers
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={9} color="#E53935" /> {dealer.yearsInBusiness}yr Exp
          </div>
        </div>

        {/* Actions — gap 8px, margin-top 12px, View Profile flex:1, Call 34x34px */}
        <div style={{
          display: 'flex', width: '100%', gap: '8px',
          marginTop: '12px', flexShrink: 0,
        }}>
          <button
            onClick={e => { e.stopPropagation(); navigate(`/dealers/${dealer.id}`); }}
            style={{
              flex: 1, padding: '7px 6px',
              border: '1px solid #DDD', borderRadius: '6px',
              background: '#fff', color: '#333',
              fontFamily: 'var(--font)', fontWeight: 500, fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            View Profile
          </button>
          <a
            href={`tel:${dealer.phone || '9876543210'}`}
            onClick={e => e.stopPropagation()}
            style={{ textDecoration: 'none' }}
          >
            <button style={{
              width: '34px', height: '34px',
              border: '1px solid #DDD', borderRadius: '6px',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <Phone size={12} color="#E53935" />
            </button>
          </a>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ===== HERO SECTION ===== */}
      <section style={{
        backgroundImage: "url('/05b81056-78f2-401f-861c-f5bb72d9f887.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderBottom: '1px solid #EEEEEE',
        position: 'relative',
        paddingBottom: '28px',
      }}>
        {/* Subtle overlay for text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          zIndex: 0,
        }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-unified-grid">

            {/* ---- COLUMN 1: Headline & Stats ---- */}
            <div className="hero-grid-left-col">
              {/* Content group — top */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '11px', fontWeight: 600, letterSpacing: '1px',
                  textTransform: 'uppercase', color: '#555',
                  marginBottom: '16px',
                }}>
                  <Star size={10} color="#E53935" fill="#E53935" /> India's #1 Reverse Car Marketplace
                </div>

                {/* H1 */}
                <h1 style={{
                  fontSize: 'clamp(26px, 6vw, 40px)', fontWeight: 800, color: '#1A1A1A',
                  lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '20px',
                }}>
                  You tell us what you want <br></br>
                  <span style={{ color: '#E53935' }}>We'll find your<br />perfect deal.</span>
                </h1>

                {/* Subtitle */}
                <p style={{
                  fontSize: '14px', color: '#555', lineHeight: 1.6,
                  marginBottom: '8px',
                }}>
                  Post your car requirements and get verified brokers competing to bring you the best offers.
                </p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A', marginBottom: '24px' }}>
                  No searching. No calling. No hassle.
                </p>
              </div>

              {/* Stats row — pushed down */}
              <div style={{ display: 'flex', gap: '16px 20px', flexWrap: 'wrap', marginTop: '28px' }}>
                {[
                  { icon: <Users size={14} color="#E53935" />, value: '10,000+', label: 'Active Buyers' },
                  { icon: <Shield size={14} color="#E53935" />, value: '2,500+', label: 'Verified Brokers' },
                  { icon: <ClipboardList size={14} color="#E53935" />, value: '50,000+', label: 'Deals Done' },
                  { icon: <Star size={14} color="#E53935" fill="#E53935" />, value: '4.8 ★', label: 'Rating' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- COLUMN 2: Form Card ---- */}
            <div className="hero-grid-form-col" style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #EEEEEE',
            }}>
              {/* Card Header */}
              <div style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #F0F0F0',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: 'rgba(229,57,53,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Car size={18} color="#E53935" />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A', marginBottom: '2px' }}>Post Your Requirement</h2>
                  <p style={{ fontSize: '12px', color: '#888' }}>It's quick, easy and free</p>
                </div>
              </div>

              <form onSubmit={handlePostRequirement} style={{ padding: '20px 24px' }}>

                {/* Brand + Model */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#444', marginBottom: '6px' }}>Select Brand *</label>
                    <select required value={heroMake}
                      onChange={e => { setHeroMake(e.target.value); setHeroModel(''); }}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #DDD', fontFamily: 'var(--font)', fontSize: '13px', color: '#333', background: '#fff', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                      onFocus={e => { e.target.style.borderColor = '#E53935'; e.target.style.boxShadow = '0 0 0 2px rgba(229,57,53,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = '#DDD'; e.target.style.boxShadow = 'none'; }}>
                      <option value="">Select Brand</option>
                      {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#444', marginBottom: '6px' }}>Select Model *</label>
                    <select required value={heroModel}
                      onChange={e => setHeroModel(e.target.value)}
                      disabled={!heroMake}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #DDD', fontFamily: 'var(--font)', fontSize: '13px', color: '#333', background: '#fff', outline: 'none', appearance: 'none', cursor: heroMake ? 'pointer' : 'not-allowed', opacity: heroMake ? 1 : 0.6 }}
                      onFocus={e => { e.target.style.borderColor = '#E53935'; e.target.style.boxShadow = '0 0 0 2px rgba(229,57,53,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = '#DDD'; e.target.style.boxShadow = 'none'; }}>
                      <option value="">Select Model</option>
                      {selectedBrand?.models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Budget */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#444', marginBottom: '6px' }}>Your Budget *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999', fontWeight: 600, fontSize: '14px' }}>₹</span>
                    <input
                      required type="number" min="0" step="0.5"
                      value={heroBudget} onChange={e => setHeroBudget(e.target.value)}
                      placeholder="e.g. 10-15 Lakh"
                      style={{ width: '100%', height: '38px', paddingLeft: '26px', paddingRight: '10px', borderRadius: '6px', border: '1px solid #DDD', fontFamily: 'var(--font)', fontSize: '13px', color: '#333', background: '#fff', outline: 'none' }}
                      onFocus={e => { e.target.style.borderColor = '#E53935'; e.target.style.boxShadow = '0 0 0 2px rgba(229,57,53,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = '#DDD'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                {/* Fuel Type Pills */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#444', marginBottom: '6px' }}>Fuel Type</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                    {FUEL_TYPES.map(f => (
                      <button key={f} type="button"
                        onClick={() => setHeroFuel(heroFuel === f ? '' : f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '5px 12px', borderRadius: '6px',
                          border: `1px solid ${heroFuel === f ? '#E53935' : '#DDD'}`,
                          background: heroFuel === f ? 'rgba(229,57,53,0.08)' : '#fff',
                          color: heroFuel === f ? '#E53935' : '#555',
                          fontFamily: 'var(--font)', fontWeight: 500, fontSize: '12px',
                          cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}>
                        <span style={{ display: 'flex' }}>{FUEL_ICONS[f]}</span> {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transmission Pills */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#444', marginBottom: '6px' }}>Transmission</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {TRANSMISSION_TYPES.map(tr => (
                      <button key={tr} type="button"
                        onClick={() => setHeroTransmission(heroTransmission === tr ? '' : tr)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '5px 12px', borderRadius: '6px',
                          border: `1px solid ${heroTransmission === tr ? '#E53935' : '#DDD'}`,
                          background: heroTransmission === tr ? 'rgba(229,57,53,0.08)' : '#fff',
                          color: heroTransmission === tr ? '#E53935' : '#555',
                          fontFamily: 'var(--font)', fontWeight: 500, fontSize: '12px',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <span style={{ display: 'flex' }}>{TRANS_ICONS[tr]}</span> {tr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={submitting} style={{
                  width: '100%', height: '44px', marginTop: '16px',
                  background: submitting ? '#ccc' : '#E53935',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  fontFamily: 'var(--font)', fontWeight: 600, fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'opacity 0.2s',
                }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = '0.88'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Send size={14} /> {submitting ? 'Posting...' : 'Post Requirement'}
                </button>

                {/* Privacy */}
                <div style={{ textAlign: 'center', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', color: '#999' }}>
                  <Lock size={10} /> Your details are secure and private
                </div>
              </form>
            </div>


          </div>
        </div>
      </section>

      {/* ===== ALL CONTENT — single unified section ===== */}
      <section style={{ position: 'relative', background: '#f8fafc', paddingTop: '40px' }}>

        {/* ── Trusted Dealers strip — normal flow ── */}
        <div style={{ width: '100%', marginBottom: '40px' }}>
          {/* Label row */}
          <div className="container" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Building2 size={14} color="#ff6b7a" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff6b7a', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Tamil Nadu</span>
              <span style={{ width: '1px', height: '12px', background: 'var(--color-gray-300)', margin: '0 4px' }} />
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>
                {isFiltered ? `Dealers in ${selectedLocation}` : 'Trusted Dealers Across Tamil Nadu'}
              </span>
              {/* Active location badge */}
              {isFiltered && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(229,57,53,0.1)', color: '#E53935',
                  padding: '3px 10px 3px 8px', borderRadius: '20px',
                  fontSize: '0.75rem', fontWeight: 700,
                }}>
                  <MapPin size={11} />
                  {selectedLocation}
                  <button
                    onClick={() => setLocation('Tamil Nadu')}
                    title="Clear location filter"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53935', padding: 0, display: 'flex', alignItems: 'center', marginLeft: '2px' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
            {isFiltered ? (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#ff6b7a', lineHeight: 1 }}>{newDealers.length}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>New Car</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{usedDealers.length}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>Pre-Owned</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#ff6b7a', lineHeight: 1 }}>{newDealers.length + usedDealers.length}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>Total</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ value: '500+', label: 'Dealers' }, { value: '36', label: 'Districts' }, { value: '15', label: 'Brands' }].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#ff6b7a', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Car Dealers row */}
          <div style={{ marginBottom: '16px' }}>
            <div className="container" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 800, color: '#ff6b7a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff6b7a' }} />
                New Car Showrooms
              </div>
              {isFiltered && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{newDealers.length} found</span>}
            </div>

            {/* Auto-scroll (all TN) vs. static horizontal scroll (filtered) */}
            {!isFiltered ? (
              <div className="dealer-scroll-wrapper">
                <div className="dealer-track">
                  {[...allNewDealers, ...allNewDealers].map((dealer, idx) => renderDealerCard(dealer, idx))}
                </div>
              </div>
            ) : newDealers.length > 0 ? (
              <div style={{ overflowX: 'auto', paddingLeft: '24px', paddingRight: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', paddingBottom: '12px' }}>
                  {newDealers.map((dealer, idx) => renderDealerCard(dealer, idx))}
                </div>
              </div>
            ) : (
              <div className="container">
                <div style={{
                  padding: '32px', background: '#fff', borderRadius: '12px',
                  border: '1px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8',
                }}>
                  <Building2 size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>No new car showrooms in {selectedLocation}</p>
                  <button
                    onClick={() => setLocation('Tamil Nadu')}
                    style={{ marginTop: '10px', background: 'none', border: 'none', color: '#E53935', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8125rem' }}
                  >
                    View all Tamil Nadu →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pre-Owned Dealers row */}
          <div>
            <div className="container" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                Pre-Owned Car Dealers
              </div>
              {isFiltered && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{usedDealers.length} found</span>}
            </div>

            {!isFiltered ? (
              <div className="dealer-scroll-wrapper">
                <div className="dealer-track-reverse">
                  {[...allUsedDealers, ...allUsedDealers].map((dealer, idx) => renderDealerCard(dealer, idx))}
                </div>
              </div>
            ) : usedDealers.length > 0 ? (
              <div style={{ overflowX: 'auto', paddingLeft: '24px', paddingRight: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', paddingBottom: '12px' }}>
                  {usedDealers.map((dealer, idx) => renderDealerCard(dealer, idx))}
                </div>
              </div>
            ) : (
              <div className="container">
                <div style={{
                  padding: '32px', background: '#fff', borderRadius: '12px',
                  border: '1px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8',
                }}>
                  <Car size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>No pre-owned dealers in {selectedLocation}</p>
                  <button
                    onClick={() => setLocation('Tamil Nadu')}
                    style={{ marginTop: '10px', background: 'none', border: 'none', color: '#E53935', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8125rem' }}
                  >
                    View all Tamil Nadu →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* glass divider */}
        <div className="container">
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(15, 23, 42, 0.08), transparent)', marginBottom: '40px' }} />
        </div>

        <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

          {/* — Why Buyers Love CarMatchr — */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-gray-900)', flexShrink: 0 }}>
              Why Buyers Love CarMatchr
            </span>
            {/* thin separator */}
            <div style={{ width: '1px', height: '32px', background: 'rgba(15, 23, 42, 0.12)', flexShrink: 0 }} />
            {[
              { icon: <Clock size={15} color="#ff6b7a" />, title: 'Save Time', desc: 'No more endless searching' },
              { icon: <BadgeDollarSign size={15} color="#ff6b7a" />, title: 'Best Prices', desc: 'Brokers compete for you' },
              { icon: <Shield size={15} color="#ff6b7a" />, title: 'Verified Brokers', desc: 'Trusted & experienced' },
              { icon: <Lock size={15} color="#ff6b7a" />, title: 'Secure & Private', desc: '100% safe & confidential' },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                borderRadius: '12px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(230,57,70,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-gray-600)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* glass divider */}
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(15, 23, 42, 0.08), transparent)', marginBottom: '64px' }} />

          {/* — How It Works — */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '8px', letterSpacing: '-0.02em' }}>{t('howItWorks')}</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-gray-600)', maxWidth: '480px', margin: '0 auto' }}>A reverse marketplace that flips the used-car buying experience.</p>
          </div>
          <div className="grid grid-3" style={{ marginBottom: '72px' }}>
            {[
              { icon: <Search size={24} />, step: '01', title: t('step1Title'), desc: t('step1Desc') },
              { icon: <Zap size={24} />, step: '02', title: t('step2Title'), desc: t('step2Desc') },
              { icon: <Award size={24} />, step: '03', title: t('step3Title'), desc: t('step3Desc') },
            ].map((item, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '36px 24px', position: 'relative',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(18px) saturate(160%)',
                WebkitBackdropFilter: 'blur(18px) saturate(160%)',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 32px rgba(15, 23, 42, 0.05)',
                transition: 'transform 0.25s, box-shadow 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(15, 23, 42, 0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(15, 23, 42, 0.05)'; }}
              >
                <div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '0.625rem', fontWeight: 800, color: 'rgba(15, 23, 42, 0.15)' }}>STEP {item.step}</div>
                <div style={{
                  width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
                  background: 'rgba(230,57,70,0.12)',
                  border: '1px solid rgba(230,57,70,0.22)',
                  color: '#ff6b7a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 20px rgba(230,57,70,0.12)',
                }}>{item.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-gray-900)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* — CTA — */}
          <div style={{
            textAlign: 'center',
            padding: '52px 40px',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '24px',
            boxShadow: 'var(--glass-shadow-lg)',
            position: 'relative', overflow: 'hidden',
            maxWidth: '640px', margin: '0 auto',
          }}>
            {/* dot pattern overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(230,57,70,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '12px', color: 'var(--color-gray-900)', letterSpacing: '-0.02em' }}>{t('readyCTA')}</h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-600)', marginBottom: '28px', lineHeight: 1.7 }}>{t('ctaDesc')}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => navigate('/register')} className="btn btn-primary btn-lg"
                  style={{ boxShadow: '0 4px 20px rgba(230,57,70,0.4)' }}>
                  {t('postRequirement')} <ArrowRight size={15} />
                </button>
                <button onClick={() => navigate('/register?role=broker')} className="btn btn-secondary btn-lg">
                  {t('joinBroker')}
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};


export default Home;


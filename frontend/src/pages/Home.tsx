import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Award, ArrowRight, Star,
  MapPin, Heart, Fuel, Gauge, ChevronLeft, ChevronRight,
  Shield, Clock, BadgeDollarSign, Lock, Send,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLanguage } from '../hooks/useLanguage';
import { carListings } from '../data/carDatabase';
import { useCatalog } from '../hooks/useCatalog';
import toast from 'react-hot-toast';

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const;
const TRANSMISSION_TYPES = ['Manual', 'Automatic', 'Any'] as const;

const FUEL_ICONS: Record<string, string> = {
  Petrol: '⛽', Diesel: '🔵', Hybrid: '🌿', Electric: '⚡',
};
const TRANS_ICONS: Record<string, string> = {
  Manual: '🔧', Automatic: '🤖', Any: '⚙️',
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { addRequirement } = useData();
  const { t } = useLanguage();
  const { brands } = useCatalog();
  const { user } = useAuth();

  const [heroMake, setHeroMake] = useState('');
  const [heroModel, setHeroModel] = useState('');
  const [heroBudget, setHeroBudget] = useState('');
  const [heroMinYear, setHeroMinYear] = useState('');
  const [heroMaxYear, setHeroMaxYear] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [heroFuel, setHeroFuel] = useState('');
  const [heroTransmission, setHeroTransmission] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('carmatchr_wishlist'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [activeImage, setActiveImage] = useState<Record<string, number>>({});

  const selectedBrand = brands.find((b) => b.name === heroMake);
  const featuredCars = useMemo(() => carListings.filter(c => c.isFeatured).slice(0, 4), []);

  const toggleWish = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      localStorage.setItem('carmatchr_wishlist', JSON.stringify([...next]));
      return next;
    });
  };

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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0', fontFamily: 'var(--font)',
    fontSize: '0.9rem', color: '#0f172a', background: '#fff',
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 700,
    color: '#374151', marginBottom: '5px',
  };

  // Car card renderer
  const renderCarCard = (car: typeof carListings[0], showWish = true) => {
    const hasMultipleImages = car.images && car.images.length > 1;
    const hasImages = car.images && car.images.length > 0;
    const currentIndex = activeImage[car.id] || 0;
    const currentImageUrl = hasImages ? car.images![currentIndex] : car.image;

    const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasMultipleImages) return;
      setActiveImage(prev => ({ ...prev, [car.id]: (currentIndex + 1) % car.images!.length }));
    };
    const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasMultipleImages) return;
      setActiveImage(prev => ({ ...prev, [car.id]: (currentIndex - 1 + car.images!.length) % car.images!.length }));
    };

    return (
      <div key={car.id} onClick={() => navigate('/marketplace')} className="card card-hoverable" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
          <img src={currentImageUrl} alt={`${car.make} ${car.model}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')} />
          {hasMultipleImages && (
            <>
              <button onClick={prevImage} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextImage} style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                <ChevronRight size={16} />
              </button>
            </>
          )}
          {car.isFeatured && <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Featured</span>}
          {showWish && (
            <button onClick={e => { e.stopPropagation(); toggleWish(car.id); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={15} fill={wishlist.has(car.id) ? '#e63946' : 'none'} color={wishlist.has(car.id) ? '#e63946' : '#64748b'} />
            </button>
          )}
        </div>
        <div style={{ padding: '14px 16px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-dark)' }}>{car.year} {car.make} {car.model}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: '1px' }}>{car.variant}</p>
          <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-primary)', margin: '8px 0' }}>₹{car.price} Lakh</p>
          <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderTop: '1px solid var(--color-gray-100)', fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Gauge size={11} /> {car.kmDriven.toLocaleString()} km</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Fuel size={11} /> {car.fuelType}</span>
            <span>{car.transmission === 'Automatic' ? 'AT' : 'MT'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.6875rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-gray-500)' }}><MapPin size={10} /> {car.city}</span>
            <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>★ {car.sellerRating}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ===== HERO ===== */}
      <section style={{
        background: '#f8fafc',
        position: 'relative', overflow: 'hidden', minHeight: '560px',
      }}>
        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '28px 28px', opacity: 0.45,
        }} />
        {/* Red accent blob */}
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,57,70,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '48px 24px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '48px', alignItems: 'flex-start' }}>

            {/* ---- LEFT ---- */}
            <div className="animate-in">
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(230,57,70,0.1)', color: '#e63946',
                padding: '5px 14px', borderRadius: '20px',
                fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.05em',
                marginBottom: '22px', textTransform: 'uppercase',
                border: '1px solid rgba(230,57,70,0.2)',
              }}>
                <Star size={11} fill="#e63946" /> India's #1 Reverse Car Marketplace
              </div>

              {/* Heading */}
              <h1 style={{
                fontSize: '2.6rem', fontWeight: 900, color: '#0f172a',
                lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '16px',
              }}>
                You tell us what<br />you want,<br />
                <span style={{ color: '#e63946' }}>We'll find your perfect deal.</span>
              </h1>

              {/* Sub-text */}
              <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.7, marginBottom: '32px', maxWidth: '420px' }}>
                Post your car requirements and get verified brokers<br />
                competing to bring you the best offers.<br />
                <strong style={{ color: '#475569' }}>No searching. No calling. No hassle.</strong>
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[
                  { icon: '👥', value: '10,000+', label: 'Active Buyers' },
                  { icon: '🛡️', value: '2,500+', label: 'Verified Brokers' },
                  { icon: '📋', value: '50,000+', label: 'Deals Completed' },
                  { icon: '⭐', value: '4.8 ★', label: 'Average Rating' },
                ].map(s => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', background: '#fff',
                    borderRadius: '10px', border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
                  }}>
                    <span style={{ fontSize: '1.125rem' }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hero Car image */}
              <div style={{ position: 'relative', marginLeft: '-16px' }}>
                <div style={{
                  position: 'absolute', bottom: '10px', left: '40px',
                  width: '260px', height: '60px',
                  background: 'rgba(230,57,70,0.08)', borderRadius: '50%',
                  filter: 'blur(24px)',
                }} />
                <img
                  src="/hero-car.png"
                  alt="Featured car"
                  style={{ width: '500px', maxWidth: '100%', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.15))' }}
                />
              </div>
            </div>

            {/* ---- RIGHT: Form card ---- */}
            <div className="animate-in animate-delay-1" style={{
              background: '#fff', borderRadius: '20px',
              boxShadow: '0 8px 40px rgba(15,23,42,0.12)',
              border: '1px solid #e2e8f0',
              marginTop: '8px',
            }}>
              {/* Card Header */}
              <div style={{
                padding: '18px 22px 14px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'rgba(230,57,70,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '1.25rem' }}>🚗</span>
                </div>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1px' }}>Post Your Requirement</h2>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>It's quick, easy and free</p>
                </div>
              </div>

              <form onSubmit={handlePostRequirement} style={{ padding: '18px 22px 20px' }}>

                {/* Brand + Model */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Select Brand *</label>
                    <div style={{ position: 'relative' }}>
                      <select required style={inputStyle} value={heroMake}
                        onChange={e => { setHeroMake(e.target.value); setHeroModel(''); }}
                        onFocus={e => e.target.style.borderColor = '#e63946'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Select Model *</label>
                    <div style={{ position: 'relative' }}>
                      <select required style={{ ...inputStyle, background: heroMake ? '#fff' : '#f8fafc' }}
                        value={heroModel}
                        onChange={e => setHeroModel(e.target.value)}
                        disabled={!heroMake}
                        onFocus={e => e.target.style.borderColor = '#e63946'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                        <option value="">Select Model</option>
                        {selectedBrand?.models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Budget + Year Range */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Your Budget *</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700, fontSize: '0.9rem' }}>₹</span>
                      <input
                        required type="number" min="0" step="0.5"
                        value={heroBudget} onChange={e => setHeroBudget(e.target.value)}
                        placeholder="e.g. 10-15 Lakh"
                        style={{ ...inputStyle, paddingLeft: '24px' }}
                        onFocus={e => e.target.style.borderColor = '#e63946'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Year Range</label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <select style={inputStyle} value={heroMinYear} onChange={e => setHeroMinYear(e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#e63946'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                        <option value="">Min</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>–</span>
                      <select style={inputStyle} value={heroMaxYear} onChange={e => setHeroMaxYear(e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#e63946'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                        <option value="">Max</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fuel Type Pills */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Preferred Fuel Type</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {FUEL_TYPES.map(f => (
                      <button key={f} type="button"
                        onClick={() => setHeroFuel(heroFuel === f ? '' : f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '6px 14px', borderRadius: '8px',
                          border: `1.5px solid ${heroFuel === f ? '#e63946' : '#e2e8f0'}`,
                          background: heroFuel === f ? 'rgba(230,57,70,0.06)' : '#f8fafc',
                          color: heroFuel === f ? '#e63946' : '#64748b',
                          fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.8125rem',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <span>{FUEL_ICONS[f]}</span> {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transmission Pills */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Transmission</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {TRANSMISSION_TYPES.map(tr => (
                      <button key={tr} type="button"
                        onClick={() => setHeroTransmission(heroTransmission === tr ? '' : tr)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '6px 14px', borderRadius: '8px',
                          border: `1.5px solid ${heroTransmission === tr ? '#e63946' : '#e2e8f0'}`,
                          background: heroTransmission === tr ? 'rgba(230,57,70,0.06)' : '#f8fafc',
                          color: heroTransmission === tr ? '#e63946' : '#64748b',
                          fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.8125rem',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        <span>{TRANS_ICONS[tr]}</span> {tr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Details */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Additional Details <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</span></label>
                  <textarea
                    rows={3}
                    value={heroDescription}
                    onChange={e => setHeroDescription(e.target.value.slice(0, 250))}
                    placeholder="Condition, color, features, mileage, urgency, budget flexibility..."
                    style={{
                      ...inputStyle, resize: 'vertical', lineHeight: 1.6,
                      minHeight: '76px',
                    }}
                    onFocus={e => e.target.style.borderColor = '#e63946'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.6875rem', color: '#94a3b8', marginTop: '3px' }}>
                    {heroDescription.length}/250
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={submitting} style={{
                  width: '100%', padding: '13px',
                  background: submitting ? '#94a3b8' : '#e63946',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontFamily: 'var(--font)', fontWeight: 800, fontSize: '1rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#c1121f'; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#e63946'; }}
                >
                  <Send size={16} /> {submitting ? 'Posting...' : 'Post Requirement'}
                </button>

                {/* Trust signal */}
                <div style={{ textAlign: 'center', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.6875rem', color: '#94a3b8' }}>
                  <Lock size={11} /> Your details are secure and private
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY BUYERS LOVE CARMATCHR ===== */}
      <section style={{ background: '#fff', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div className="container" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>
              Why Buyers Love CarMatchr
            </span>
            {[
              { icon: <Clock size={16} color="#e63946" />, title: 'Save Time', desc: 'No more endless searching' },
              { icon: <BadgeDollarSign size={16} color="#e63946" />, title: 'Best Prices', desc: 'Brokers compete for you' },
              { icon: <Shield size={16} color="#e63946" />, title: 'Verified Brokers', desc: 'Trusted & experienced' },
              { icon: <Lock size={16} color="#e63946" />, title: 'Secure & Private', desc: '100% safe & confidential' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(230,57,70,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POPULAR BRANDS ===== */}
      <section style={{ background: '#fff', paddingTop: '36px', paddingBottom: '36px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Popular Brands
            </h3>
            <button onClick={() => navigate('/marketplace')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.8125rem', color: '#e63946', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all brands <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {brands.slice(0, 12).map((b) => (
              <button key={b.id} onClick={() => navigate('/marketplace')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 16px', background: '#f8fafc',
                  border: '1.5px solid #e2e8f0', borderRadius: '12px',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                  minWidth: '80px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e63946'; e.currentTarget.style.background = 'rgba(230,57,70,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name || 'Brand'} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 800, color: '#64748b' }}>
                    {(b.name || 'NA').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{b.name || 'Unknown'}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED CARS ===== */}
      <section className="section" style={{ paddingBottom: '32px', borderTop: '1px solid #f1f5f9' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-dark)' }}>{t('popularCars')}</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{t('mostSearched')}</p>
            </div>
            <button onClick={() => navigate('/marketplace')} className="btn btn-outline btn-sm">View Marketplace</button>
          </div>
          <div className="grid grid-4">{featuredCars.map(c => renderCarCard(c))}</div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section" style={{ borderTop: '1px solid var(--color-gray-200)', background: '#f8fafc' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('howItWorks')}</h2>
            <p className="section-desc">A reverse marketplace that flips the used-car buying experience.</p>
          </div>
          <div className="grid grid-3">
            {[
              { icon: <Search size={24} />, step: '01', title: t('step1Title'), desc: t('step1Desc') },
              { icon: <Zap size={24} />, step: '02', title: t('step2Title'), desc: t('step2Desc') },
              { icon: <Award size={24} />, step: '03', title: t('step3Title'), desc: t('step3Desc') },
            ].map((item, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '36px 24px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '0.625rem', fontWeight: 800, color: 'var(--color-gray-300)' }}>STEP {item.step}</div>
                <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-dark)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="section" style={{ textAlign: 'center', borderTop: '1px solid var(--color-gray-200)' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-dark)', letterSpacing: '-0.02em' }}>{t('readyCTA')}</h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-500)', marginBottom: '24px', lineHeight: 1.7 }}>{t('ctaDesc')}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/register')} className="btn btn-primary btn-lg">
              {t('postRequirement')} <ArrowRight size={15} />
            </button>
            <button onClick={() => navigate('/register?role=broker')} className="btn btn-outline btn-lg">{t('joinBroker')}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

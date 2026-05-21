import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Award, ArrowRight, Star,
  MapPin, Heart, Fuel, Gauge, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { useData } from '../contexts/useData';
import { useLanguage } from '../contexts/useLanguage';
import {
  carListings
} from '../data/carDatabase';
import { useCatalog } from '../contexts/useCatalog';
import toast from 'react-hot-toast';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { addRequirement } = useData();
  const { t } = useLanguage();
  const { brands } = useCatalog();
  const { user } = useAuth();

  // --- State ---
  const [activeHeroTab, setActiveHeroTab] = useState<'buy' | 'sell'>('buy');
  const [heroMake, setHeroMake] = useState('');
  const [heroModel, setHeroModel] = useState('');
  const [heroBudget, setHeroBudget] = useState('');
  const [heroYearRange, setHeroYearRange] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('carmatchr_wishlist'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [activeImage, setActiveImage] = useState<Record<string, number>>({});

  const selectedBrand = brands.find((b) => b.name === heroMake);

  // --- Merge seed + broker listings ---
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
    if (!heroBudget.trim()) { toast.error('Please specify your budget range.'); return; }

    if (user) {
      if (user.role !== 'buyer') {
        toast.error('Only buyers can post requirements.');
        return;
      }
      setSubmitting(true);
      try {
        await addRequirement({
          buyerId: user.id,
          make: heroMake,
          model: heroModel,
          yearRange: heroYearRange || '2020-2024',
          budget: heroBudget,
          preferredFeature: '',
          description: heroDescription || 'Looking for a clean vehicle in good condition.'
        });
        toast.success('Requirement posted successfully!');
        navigate('/buyer-dashboard');
      } catch {
        toast.error('Failed to post requirement.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Not logged in: Save draft in sessionStorage and redirect to login
      const reqDraft = {
        make: heroMake,
        model: heroModel,
        budget: heroBudget,
        yearRange: heroYearRange || '2020-2024',
        description: heroDescription || 'Looking for a clean vehicle in good condition.'
      };
      sessionStorage.setItem('pending_requirement', JSON.stringify(reqDraft));
      toast.success('Please log in or register to complete posting your requirement!');
      navigate('/login');
    }
  };

  const stats = [
    { value: '10,000+', label: 'Active Buyers' },
    { value: '2,500+',  label: 'Verified Brokers' },
    { value: '50,000+', label: 'Deals Completed' },
    { value: '4.8 ★',   label: 'Average Rating' },
  ];

  // --- CAR CARD RENDERER ---
  const renderCarCard = (car: typeof carListings[0], showWish = true) => {
    const hasMultipleImages = car.images && car.images.length > 1;
    const hasImages = car.images && car.images.length > 0;
    const currentIndex = activeImage[car.id] || 0;
    const currentImageUrl = hasImages ? car.images![currentIndex] : car.image;

    const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasMultipleImages) return;
      setActiveImage(prev => ({
        ...prev,
        [car.id]: (currentIndex + 1) % car.images!.length
      }));
    };

    const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasMultipleImages) return;
      setActiveImage(prev => ({
        ...prev,
        [car.id]: (currentIndex - 1 + car.images!.length) % car.images!.length
      }));
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
              <button onClick={prevImage} style={{
                position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%',
                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10,
              }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextImage} style={{
                position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%',
                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10,
              }}>
                <ChevronRight size={16} />
              </button>
              <div style={{
                position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '4px', zIndex: 10, background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '10px'
              }}>
                {car.images!.map((_, idx) => (
                  <div key={idx} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)'
                  }} />
                ))}
              </div>
            </>
          )}

          {car.isFeatured && (
            <span style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: '0.625rem', fontWeight: 700,
              padding: '3px 8px', borderRadius: 'var(--radius-full)',
              letterSpacing: '0.03em', textTransform: 'uppercase',
            }}>Featured</span>
          )}
          {car.id.startsWith('bl-') && (
            <span style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(230,57,70,0.9)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: '0.625rem', fontWeight: 700,
              padding: '3px 8px', borderRadius: 'var(--radius-full)',
              letterSpacing: '0.03em', textTransform: 'uppercase',
            }}>🏪 Broker Listed</span>
          )}
          {showWish && (
            <button onClick={e => { e.stopPropagation(); toggleWish(car.id); }}
              style={{
                position: 'absolute', top: '10px', right: '10px',
                background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.2s',
              }}>
              <Heart size={15} fill={wishlist.has(car.id) ? '#e63946' : 'none'} color={wishlist.has(car.id) ? '#e63946' : '#64748b'} />
            </button>
          )}
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-dark)', lineHeight: 1.3 }}>
                {car.year} {car.make} {car.model}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: '1px' }}>{car.variant}</p>
            </div>
          </div>

          <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-primary)', margin: '8px 0' }}>
            ₹{car.price} Lakh
          </p>

          {/* Specs row */}
          <div style={{
            display: 'flex', gap: '12px', padding: '8px 0',
            borderTop: '1px solid var(--color-gray-100)', marginTop: '4px',
            fontSize: '0.6875rem', color: 'var(--color-gray-500)', fontWeight: 500,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Gauge size={11} /> {car.kmDriven.toLocaleString()} km
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Fuel size={11} /> {car.fuelType}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {car.transmission === 'Automatic' ? 'AT' : 'MT'}
            </span>
          </div>

          {/* Location + Seller */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '8px', fontSize: '0.6875rem',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-gray-500)' }}>
              <MapPin size={10} /> {car.city}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--color-warning)', fontWeight: 700 }}>
              ★ {car.sellerRating}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ===== HERO ===== */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '56px 24px 72px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '56px', alignItems: 'center' }}>

            {/* Left */}
            <div className="animate-in">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(230,57,70,0.15)', color: '#f87171',
                padding: '5px 14px', borderRadius: 'var(--radius-full)',
                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
                marginBottom: '20px', textTransform: 'uppercase',
              }}>
                <Star size={11} fill="#f87171" /> India's #1 Reverse Car Marketplace
              </div>
              <h1 style={{
                fontSize: '2.5rem', fontWeight: 800, color: '#fff',
                lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '14px',
              }}>
                {t('heroTitle1')}<br />
                <span style={{ color: 'var(--color-primary)' }}>{t('heroTitle2')}</span>
              </h1>
              <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '28px', maxWidth: '460px' }}>
                {t('heroDesc')}
              </p>
              <div style={{ display: 'flex', gap: '28px' }}>
                {stats.map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>{s.value}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Search/Post Widget */}
            <div className="animate-in animate-delay-1" style={{
              background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-gray-200)' }}>
                {(['buy', 'sell'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveHeroTab(tab)} style={{
                    flex: 1, padding: '14px', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.875rem',
                    background: activeHeroTab === tab ? '#fff' : 'var(--color-gray-50)',
                    color: activeHeroTab === tab ? 'var(--color-primary)' : 'var(--color-gray-500)',
                    borderBottom: activeHeroTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}>
                    {tab === 'buy' ? t('postRequirement') : t('becomeBroker')}
                  </button>
                ))}
              </div>

              <div style={{ padding: '24px' }}>
                {activeHeroTab === 'buy' ? (
                  <form onSubmit={handlePostRequirement}>
                    <div className="form-group">
                      <label className="form-label">{t('selectBrand')} *</label>
                      <select required className="form-control" value={heroMake} onChange={e => { setHeroMake(e.target.value); setHeroModel(''); }}>
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Select Model *</label>
                      <select required className="form-control" value={heroModel} onChange={e => setHeroModel(e.target.value)} disabled={!heroMake}>
                        <option value="">Select Model</option>
                        {selectedBrand?.models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">{t('yourBudget')} *</label>
                        <input required className="form-control" value={heroBudget} onChange={e => setHeroBudget(e.target.value)} placeholder="e.g. ₹10-15 Lakh" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Year Range</label>
                        <input className="form-control" value={heroYearRange} onChange={e => setHeroYearRange(e.target.value)} placeholder="e.g. 2020-2024" />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Additional Details</label>
                      <input className="form-control" value={heroDescription} onChange={e => setHeroDescription(e.target.value)} placeholder="Condition, urgency, color..." />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '4px' }} disabled={submitting}>
                      <Zap size={17} /> {submitting ? 'Posting...' : 'Post Requirement'}
                    </button>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '8px' }}>{t('growDealership')}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.7 }}>
                      {t('growDesc')}
                    </p>
                    <button onClick={() => navigate('/register?role=broker')} className="btn btn-outline btn-lg btn-block">
                      {t('becomeBroker')} <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BRANDS BAR ===== */}
      <section style={{ background: '#fff', borderBottom: '1px solid var(--color-gray-200)' }}>
        <div className="container" style={{ padding: '28px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
            <h3 style={{
              fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-gray-400)',
              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
            }}>{t('exploreByBrand')}</h3>
            {brands.slice(0, 24).map(b => (
              <button key={b.name} onClick={() => navigate(`/marketplace`)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '8px 14px', background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-200)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font)',
                  minWidth: '72px', flexShrink: 0, transition: 'all 0.15s',
                }}>
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{b.name.slice(0, 2).toUpperCase()}</span>
                )}
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED CARS ===== */}
      <section className="section" style={{ paddingBottom: '32px' }}>
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

      {/* ===== MARKETPLACE TEASER ===== */}
      <section className="section" style={{ background: '#fff', borderTop: '1px solid var(--color-gray-200)', paddingTop: '56px', paddingBottom: '56px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-dark)', marginBottom: '12px' }}>
            Explore Our Car Marketplace
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-500)', lineHeight: 1.7, marginBottom: '28px' }}>
            Browse through hundreds of quality used cars listed by verified brokers across India. Filter by budget, brand, body type, fuel type, and more to find your dream car.
          </p>
          <button onClick={() => navigate('/marketplace')} className="btn btn-primary btn-lg">
            Explore All Cars in Marketplace <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section" style={{ borderTop: '1px solid var(--color-gray-200)' }}>
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
                <div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '0.625rem', fontWeight: 800, color: 'var(--color-gray-300)' }}>
                  STEP {item.step}
                </div>
                <div style={{
                  width: '52px', height: '52px', borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>{item.icon}</div>
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-dark)', letterSpacing: '-0.02em' }}>
            {t('readyCTA')}
          </h2>
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

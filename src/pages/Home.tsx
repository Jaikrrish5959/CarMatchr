import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Award, ArrowRight, Star,
  MapPin, SlidersHorizontal, Heart, Fuel, Gauge,
  Phone, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { useData } from '../contexts/useData';
import { useLanguage } from '../contexts/useLanguage';
import {
  carListings, filterListings, sortListings,
  defaultFilters, type Filters, type SortOption, type CarListing
} from '../data/carDatabase';
import CitySelector from '../components/CitySelector';
import FilterPanel from '../components/FilterPanel';
import { useCatalog } from '../contexts/useCatalog';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { brokerListings } = useData();
  const { t } = useLanguage();
  const { brands } = useCatalog();

  // --- State ---
  const [activeHeroTab, setActiveHeroTab] = useState<'buy' | 'sell'>('buy');
  const [heroMake, setHeroMake] = useState('');
  const [heroBudget, setHeroBudget] = useState('');
  const [showCity, setShowCity] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortOption>('relevance');
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('carmatchr_wishlist'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [contactModal, setContactModal] = useState<{ brokerName: string; phone: string; email: string; listingId: string } | null>(null);
  const [activeImage, setActiveImage] = useState<Record<string, number>>({});
  const { user } = useAuth();

  // --- Convert broker listings to CarListing format ---
  const brokerCarsAsListings: CarListing[] = useMemo(() =>
    brokerListings.filter(l => l.status === 'active').map(l => ({
      id: l.id,
      make: l.make,
      model: l.model,
      variant: l.variant || '',
      year: l.year,
      price: l.price,
      mileage: 0,
      fuelType: l.fuelType,
      transmission: l.transmission,
      bodyType: l.bodyType,
      seatingCapacity: 5,
      color: l.color || 'N/A',
      city: l.city,
      image: (
        brands.find((b) => b.name === l.make)?.models.find((m) => m.name === l.model)?.imageUrl ||
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=480&q=80'
      ),
      sellerRating: 4.5,
      sellerName: l.brokerName,
      features: [],
      listed: l.createdAt,
      isFeatured: false,
      kmDriven: l.kmDriven,
      owners: l.owners,
      images: l.images,
    }))
  , [brokerListings, brands]);

  // --- Merge seed + broker listings ---
  const allListings = useMemo(() => [...brokerCarsAsListings, ...carListings], [brokerCarsAsListings]);

  // --- Derived ---
  const filtered = useMemo(() => sortListings(filterListings(allListings, filters), sort), [allListings, filters, sort]);
  const featuredCars = useMemo(() => carListings.filter(c => c.isFeatured).slice(0, 4), []);
  const locationCars = useMemo(() =>
    filters.city ? allListings.filter(c => c.city === filters.city).slice(0, 4) : []
  , [filters.city, allListings]);

  const toggleWish = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      localStorage.setItem('carmatchr_wishlist', JSON.stringify([...next]));
      return next;
    });
  };

  const handleContactBroker = (car: CarListing) => {
    const bl = brokerListings.find(l => l.id === car.id);
    if (!bl) return;
    setContactModal({ brokerName: bl.brokerName, phone: bl.brokerName, email: '', listingId: bl.id });
    // Also get broker user info for phone/email
    fetch(`/api/listings/${bl.id}/contact`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName: user?.name || 'Anonymous', buyerEmail: user?.email || '', buyerPhone: user?.phone || '' }),
    }).catch(console.error);
    // Show broker contact details from the listing
    setContactModal({ brokerName: bl.brokerName, phone: user?.phone || 'N/A', email: '', listingId: bl.id });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const f = { ...filters };
    if (heroMake) f.make = heroMake;
    if (heroBudget) {
      const [min, max] = heroBudget.split('-').map(Number);
      f.budgetMin = min; f.budgetMax = max || Infinity;
    }
    setFilters(f);
    // Scroll to marketplace
    document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' });
  };

  const stats = [
    { value: '10,000+', label: 'Active Buyers' },
    { value: '2,500+',  label: 'Verified Brokers' },
    { value: '50,000+', label: 'Deals Completed' },
    { value: '4.8 ★',   label: 'Average Rating' },
  ];

  const activeFilterCount = [filters.make, filters.bodyType, filters.fuelType, filters.transmission].filter(Boolean).length
    + (filters.budgetMin > 0 || filters.budgetMax < Infinity ? 1 : 0);
  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price-low', label: 'Price Low-High' },
    { value: 'price-high', label: 'Price High-Low' },
    { value: 'newest', label: 'Newest' },
    { value: 'km-low', label: 'Lowest KM' },
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
      <div key={car.id} className="card card-hoverable" style={{ padding: 0, overflow: 'hidden' }}>
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

        {/* Contact Broker button for broker-listed cars */}
        {car.id.startsWith('bl-') && (
          <button
            onClick={e => { e.stopPropagation(); handleContactBroker(car); }}
            className="btn btn-primary btn-sm btn-block"
            style={{ marginTop: '10px', fontSize: '0.75rem', gap: '4px' }}
          >
            <Phone size={12} /> Contact Broker
          </button>
        )}
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

            {/* Right — Search Widget */}
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
                  <form onSubmit={handleSearch}>
                    {/* City Selector Button */}
                    <button type="button" onClick={() => setShowCity(true)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 14px', background: 'var(--color-gray-50)',
                        border: '1.5px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.875rem',
                        color: filters.city ? 'var(--color-dark)' : 'var(--color-gray-400)',
                        fontWeight: filters.city ? 600 : 400, marginBottom: '14px',
                      }}>
                      <MapPin size={15} color="var(--color-primary)" />
                      {filters.city || t('selectCity')}
                    </button>

                    <div className="form-group">
                      <label className="form-label">{t('selectBrand')}</label>
                      <select className="form-control" value={heroMake} onChange={e => setHeroMake(e.target.value)}>
                        <option value="">All Brands</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('yourBudget')}</label>
                      <select className="form-control" value={heroBudget} onChange={e => setHeroBudget(e.target.value)}>
                        <option value="">All Budgets</option>
                        <option value="0-5">Under ₹5 Lakh</option>
                        <option value="5-10">₹5 - 10 Lakh</option>
                        <option value="10-15">₹10 - 15 Lakh</option>
                        <option value="15-25">₹15 - 25 Lakh</option>
                        <option value="25-50">₹25 - 50 Lakh</option>
                        <option value="50-Infinity">₹50 Lakh+</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '4px' }}>
                      <Search size={17} /> {t('findMyCar')}
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
              <button key={b.name} onClick={() => { setFilters({...filters, make: b.name}); document.getElementById('marketplace')?.scrollIntoView({behavior:'smooth'}); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '8px 14px', background: filters.make === b.name ? 'var(--color-primary-light)' : 'var(--color-gray-50)',
                  border: `1px solid ${filters.make === b.name ? 'var(--color-primary)' :'var(--color-gray-200)'}`,
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

      {/* ===== LOCATION SUGGESTIONS ===== */}
      {filters.city && locationCars.length > 0 && (
        <section className="section" style={{ paddingBottom: '32px' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-dark)' }}>
                  <MapPin size={18} style={{ display: 'inline', verticalAlign: '-3px', color: 'var(--color-primary)' }} /> Cars in {filters.city}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>Location-based suggestions near you</p>
              </div>
            </div>
            <div className="grid grid-4">{locationCars.map(c => renderCarCard(c))}</div>
          </div>
        </section>
      )}

      {/* ===== FEATURED CARS ===== */}
      <section className="section" style={{ paddingBottom: '32px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-dark)' }}>{t('popularCars')}</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{t('mostSearched')}</p>
            </div>
          </div>
          <div className="grid grid-4">{featuredCars.map(c => renderCarCard(c))}</div>
        </div>
      </section>

      {/* ===== MARKETPLACE ===== */}
      <section id="marketplace" className="section" style={{ background: '#fff', borderTop: '1px solid var(--color-gray-200)', paddingTop: '48px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showMarketplace ? '24px' : 0 }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-dark)' }}>{t('marketplace')}</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowMarketplace(prev => !prev)}
            >
              {showMarketplace ? 'Hide Marketplace' : 'Show Marketplace'}
            </button>
          </div>

          {showMarketplace && (
            <>
              {/* Toolbar */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
              }}>
                <div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
                    {filtered.length} {t('carsFound')}
                    {filters.city && <> in <strong>{filters.city}</strong></>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Search */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                    <input className="form-control" style={{ paddingLeft: '34px', width: '220px', fontSize: '0.8125rem' }}
                      placeholder="Search cars..."
                      value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                  </div>

                  {/* Filter button */}
                  <button onClick={() => setShowFilter(true)} className="btn btn-secondary btn-sm" style={{ position: 'relative' }}>
                    <SlidersHorizontal size={14} /> {t('filters')}
                    {activeFilterCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '-6px', right: '-6px',
                        background: 'var(--color-primary)', color: '#fff',
                        fontSize: '0.625rem', fontWeight: 800, width: '18px', height: '18px',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{activeFilterCount}</span>
                    )}
                  </button>

                  {/* Sort chips */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSort(option.value)}
                        style={{
                          border: sort === option.value ? '1px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
                          background: sort === option.value ? 'var(--color-primary-light)' : '#fff',
                          color: sort === option.value ? 'var(--color-primary)' : 'var(--color-gray-600)',
                          borderRadius: 'var(--radius-full)',
                          padding: '7px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'var(--font)',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Filters Chips */}
              {activeFilterCount > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {filters.make && (
                    <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => setFilters({...filters, make: ''})}>{filters.make} ×</span>
                  )}
                  {filters.bodyType && (
                    <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => setFilters({...filters, bodyType: ''})}>{filters.bodyType} ×</span>
                  )}
                  {filters.fuelType && (
                    <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => setFilters({...filters, fuelType: ''})}>{filters.fuelType} ×</span>
                  )}
                  {filters.transmission && (
                    <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => setFilters({...filters, transmission: ''})}>{filters.transmission} ×</span>
                  )}
                  {(filters.budgetMin > 0 || filters.budgetMax < Infinity) && (
                    <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => setFilters({...filters, budgetMin: 0, budgetMax: Infinity})}>Budget ×</span>
                  )}
                  <button onClick={() => setFilters({...defaultFilters, city: filters.city})}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    {t('clearAll')}
                  </button>
                </div>
              )}

              {/* Car Grid */}
              {filtered.length === 0 ? (
                <div className="empty-state" style={{ margin: '40px 0' }}>
                  <div className="empty-state-icon"><Search size={24} /></div>
                  <p className="empty-state-title">{t('noResults')}</p>
                </div>
              ) : (
                <div className="grid grid-4">{filtered.map(c => renderCarCard(c))}</div>
              )}
            </>
          )}
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

      {/* ===== MODALS ===== */}
      {showCity && <CitySelector onSelect={city => setFilters({...filters, city})} onClose={() => setShowCity(false)} />}
      {showFilter && <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} resultCount={filtered.length} />}

      {/* Contact Broker Modal */}
      {contactModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setContactModal(null)}>
          <div className="card animate-in" style={{ maxWidth: '420px', width: '90%', padding: '32px', position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setContactModal(null)} style={{
              position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--color-gray-400)',
            }}><X size={18} /></button>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '16px', color: 'var(--color-dark)' }}>
              Contact Broker
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{contactModal.brokerName}</p>
                {(() => {
                  const bl = brokerListings.find(l => l.id === contactModal.listingId);
                  return bl ? (
                    <>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-gray-600)', marginTop: '8px' }}>
                        <Phone size={14} color="var(--color-primary)" />
                        <a href={`tel:${bl.brokerName}`} style={{ fontWeight: 600 }}>Contact via Platform</a>
                      </p>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-gray-600)', marginTop: '6px' }}>
                        <MapPin size={14} color="var(--color-primary)" />
                        {bl.city}
                      </p>
                    </>
                  ) : null;
                })()}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
                ✓ Your contact request has been logged. The broker will be notified.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

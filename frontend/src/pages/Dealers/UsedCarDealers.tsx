import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Car, BadgeCheck, LayoutGrid, List,
  Phone, Shield, Zap, Clock, Search, ChevronRight,
  Award, TrendingUp, Users, CheckCircle, X,
} from 'lucide-react';
import { API_BASE } from '../../services/api';
import { tamilNaduDealers } from '../../data/tamilNaduDealers';

interface Dealer {
  id: string | number;
  businessName: string;
  city: string;
  phone: string;
  dealerType: 'new' | 'used' | 'both';
  createdAt: string;
  activeListings: number;
  rating: string;
  reviews: number;
  yearsInBusiness: number;
  verified: boolean;
  brand?: string;
  initials?: string;
  accentColor?: string;
}

const BRAND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Maruti Suzuki': { bg: '#eef9ff', text: '#0284c7', border: '#bae6fd' },
  'Hyundai':       { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'Tata Motors':   { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4' },
  'Mahindra':      { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  'Toyota':        { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  'Honda':         { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'Kia':           { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'MG':            { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  'Skoda':         { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' },
  'Ford':          { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  'Volkswagen':    { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  'Multi-brand':   { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' },
};

const getLogoInfo = (name: string, brand?: string) => {
  const b = brand || '';
  const colorKey = Object.keys(BRAND_COLORS).find(k => b.includes(k));
  const colors = colorKey ? BRAND_COLORS[colorKey] : { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
  const inits = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return { ...colors, initials: inits || 'DL' };
};

const CITIES = ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thanjavur'];

const UsedCarDealers = () => {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => { fetchDealers(); }, []);

  const fetchDealers = async () => {
    setLoading(true);
    try {
      const url = new URL(API_BASE ? `${API_BASE}/api/dealers` : '/api/dealers', window.location.origin);
      url.searchParams.append('type', 'used');
      const res = await fetch(url.toString());
      let apiDealers: Dealer[] = [];
      if (res.ok) apiDealers = await res.json();

      const staticDealers = tamilNaduDealers
        .filter(d => ['used', 'multi'].includes(d.type))
        .map(d => ({
          id: d.id,
          businessName: d.name,
          city: d.city,
          phone: d.phone || '9876543210',
          dealerType: (d.type === 'multi' ? 'both' : d.type) as 'used' | 'both',
          createdAt: new Date().toISOString(),
          activeListings: d.vehicles,
          rating: d.rating.toFixed(1),
          reviews: d.reviews,
          yearsInBusiness: d.yearsInBusiness,
          verified: d.verified,
          brand: d.brand,
          initials: d.initials,
          accentColor: d.accentColor,
        }));

      setDealers([...apiDealers, ...staticDealers]);
    } catch (err) {
      console.error('Error fetching used car dealers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...dealers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.businessName.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        (d.brand || '').toLowerCase().includes(q)
      );
    }
    if (cityFilter) list = list.filter(d => d.city.toLowerCase() === cityFilter.toLowerCase());
    if (brandFilter) list = list.filter(d => (d.brand || '').toLowerCase().includes(brandFilter.toLowerCase()));
    if (ratingFilter) list = list.filter(d => parseFloat(d.rating) >= parseFloat(ratingFilter));
    if (verifiedFilter) list = list.filter(d => d.verified);

    if (sortOrder === 'rating') list.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    else if (sortOrder === 'listings') list.sort((a, b) => b.activeListings - a.activeListings);
    else if (sortOrder === 'experience') list.sort((a, b) => b.yearsInBusiness - a.yearsInBusiness);
    else list.sort((a, b) => a.businessName.localeCompare(b.businessName));

    return list;
  }, [dealers, search, cityFilter, brandFilter, ratingFilter, verifiedFilter, sortOrder]);

  const stats = useMemo(() => {
    const verified = dealers.filter(d => d.verified).length;
    const cities = new Set(dealers.map(d => d.city)).size;
    const brands = new Set(dealers.map(d => d.brand).filter(Boolean)).size;
    const totalDeals = dealers.reduce((acc, d) => acc + d.reviews, 0);
    return { verified, cities, brands, totalDeals };
  }, [dealers]);

  const featured = useMemo(() =>
    [...dealers]
      .filter(d => parseFloat(d.rating) >= 4.7 && d.verified)
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 4),
    [dealers]
  );

  const hasFilters = search || cityFilter || brandFilter || ratingFilter || verifiedFilter;
  const clearAll = () => { setSearch(''); setCityFilter(''); setBrandFilter(''); setRatingFilter(''); setVerifiedFilter(false); };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>

      {/* ── HERO HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '56px 0 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle at 25% 50%, #e63946 0%, transparent 55%), radial-gradient(circle at 75% 20%, #4f8ef7 0%, transparent 45%)',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Link to="/dealers/new" onClick={() => navigate('/dealers/new')} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', textDecoration: 'none' }}>New Car Dealers</Link>
            <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8125rem', fontWeight: 600 }}>Used Car Dealers</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ background: '#e63946', color: '#fff', borderRadius: '20px', padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🚗 Pre-Owned Marketplace
            </span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Trusted Used Car Dealers<br />
            <span style={{ color: '#e63946' }}>in Tamil Nadu</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', marginBottom: '32px', maxWidth: '560px' }}>
            Connect with verified dealers and get the best deals on quality used cars.
          </p>

          {/* Search Bar */}
          <div style={{
            display: 'flex', gap: '10px', maxWidth: '640px',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '14px',
            padding: '8px 8px 8px 16px',
            alignItems: 'center',
          }}>
            <Search size={18} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search dealer name, city or brand…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: '#fff', fontSize: '0.9375rem', outline: 'none',
                fontFamily: 'var(--font)',
              }}
            />
            <button
              style={{
                background: '#e63946', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '9px 18px',
                fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* ── TRUST STATS BAR ── */}
      {!loading && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0',
            }}>
              {[
                { icon: <CheckCircle size={22} color="#16a34a" />, value: stats.verified, label: 'Verified Dealers', suffix: '+' },
                { icon: <Award size={22} color="#e63946" />, value: stats.totalDeals.toLocaleString(), label: 'Deals Closed', suffix: '' },
                { icon: <MapPin size={22} color="#7c3aed" />, value: stats.cities, label: 'Cities Covered', suffix: '+' },
                { icon: <Car size={22} color="#0284c7" />, value: stats.brands, label: 'Brands Available', suffix: '+' },
              ].map((stat, i) => (
                <div key={i} style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  borderRight: i < 3 ? '1px solid var(--color-gray-100)' : 'none',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {stat.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-gray-900)', lineHeight: 1 }}>
                      {stat.value}{stat.suffix}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600, marginTop: '2px' }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '32px 20px 64px' }}>

        {/* ── FEATURED DEALERS ── */}
        {!loading && featured.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <TrendingUp size={20} color="#e63946" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Featured Dealers</h2>
              <span style={{ background: '#fef2f2', color: '#e63946', borderRadius: '20px', padding: '2px 10px', fontSize: '0.6875rem', fontWeight: 700 }}>TOP RATED</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {featured.map(dealer => {
                const logo = getLogoInfo(dealer.businessName, dealer.brand);
                return (
                  <div key={dealer.id} style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    borderRadius: '18px',
                    padding: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)'; }}
                    onClick={() => navigate(`/dealers/${dealer.id}`)}
                  >
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(230,57,70,0.12)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-30px', left: '-10px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(79,142,247,0.08)', pointerEvents: 'none' }} />

                    {/* Verified Badge */}
                    {dealer.verified && (
                      <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '8px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BadgeCheck size={11} color="#4ade80" />
                        <span style={{ color: '#4ade80', fontSize: '0.625rem', fontWeight: 700 }}>VERIFIED</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{
                        width: '52px', height: '52px', borderRadius: '14px',
                        background: logo.bg, border: `2px solid ${logo.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.125rem', fontWeight: 800, color: logo.text, flexShrink: 0,
                      }}>
                        {logo.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '4px', lineHeight: 1.2 }}>{dealer.businessName}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem' }}>
                          <MapPin size={11} /> {dealer.city}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      {[
                        { label: 'Rating', value: `⭐ ${dealer.rating}` },
                        { label: 'Vehicles', value: `${dealer.activeListings}+` },
                        { label: 'Experience', value: `${dealer.yearsInBusiness}y` },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{m.value}</div>
                          <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/dealers/${dealer.id}`} style={{ textDecoration: 'none', flex: 1 }}
                        onClick={e => e.stopPropagation()}>
                        <button style={{
                          width: '100%', padding: '9px', border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px', background: 'rgba(255,255,255,0.08)',
                          color: '#fff', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                          fontFamily: 'var(--font)',
                        }}>
                          View Profile
                        </button>
                      </Link>
                      <a href={`tel:${dealer.phone}`} style={{ textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}>
                        <button style={{
                          padding: '9px 14px', border: 'none', borderRadius: '8px',
                          background: '#e63946', color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Phone size={15} />
                        </button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FILTER & CONTROLS BAR ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', border: '1px solid var(--color-gray-200)', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
              <button onClick={() => navigate('/dealers/new')} style={{
                padding: '8px 18px', border: 'none', background: 'transparent',
                fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-500)',
                cursor: 'pointer', borderRight: '1px solid var(--color-gray-200)',
              }}>
                New Cars
              </button>
              <button style={{
                padding: '8px 18px', border: 'none', background: 'var(--color-primary)',
                fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: 'default',
              }}>
                Used Cars
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setViewMode('grid')} style={{
                padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-gray-200)',
                background: viewMode === 'grid' ? 'var(--color-primary-light)' : '#fff',
                color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-gray-500)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', fontWeight: 600,
              }}>
                <LayoutGrid size={14} /> Grid
              </button>
              <button onClick={() => setViewMode('list')} style={{
                padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-gray-200)',
                background: viewMode === 'list' ? 'var(--color-primary-light)' : '#fff',
                color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-gray-500)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', fontWeight: 600,
              }}>
                <List size={14} /> List
              </button>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                style={{
                  border: '1px solid var(--color-gray-200)', borderRadius: '8px',
                  padding: '7px 12px', fontSize: '0.8125rem', fontWeight: 600,
                  background: '#fff', outline: 'none', cursor: 'pointer', color: 'var(--color-gray-700)',
                }}
              >
                <option value="rating">Highest Rated</option>
                <option value="listings">Most Vehicles</option>
                <option value="experience">Most Experienced</option>
                <option value="alphabetical">A → Z</option>
              </select>
            </div>
          </div>

          {/* Filter Chips Row */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{
              border: cityFilter ? '1.5px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
              background: cityFilter ? 'var(--color-primary-light)' : '#fff',
              color: cityFilter ? 'var(--color-primary)' : 'var(--color-gray-600)',
              outline: 'none', cursor: 'pointer',
            }}>
              <option value="">📍 All Cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{
              border: brandFilter ? '1.5px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
              background: brandFilter ? 'var(--color-primary-light)' : '#fff',
              color: brandFilter ? 'var(--color-primary)' : 'var(--color-gray-600)',
              outline: 'none', cursor: 'pointer',
            }}>
              <option value="">🚗 All Brands</option>
              {Object.keys(BRAND_COLORS).map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={{
              border: ratingFilter ? '1.5px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
              background: ratingFilter ? 'var(--color-primary-light)' : '#fff',
              color: ratingFilter ? 'var(--color-primary)' : 'var(--color-gray-600)',
              outline: 'none', cursor: 'pointer',
            }}>
              <option value="">⭐ Any Rating</option>
              <option value="4.8">4.8+ Stars</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4.0">4.0+ Stars</option>
            </select>

            <button
              onClick={() => setVerifiedFilter(v => !v)}
              style={{
                border: verifiedFilter ? '1.5px solid #16a34a' : '1px solid var(--color-gray-200)',
                borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
                background: verifiedFilter ? '#dcfce7' : '#fff',
                color: verifiedFilter ? '#16a34a' : 'var(--color-gray-600)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              <BadgeCheck size={14} /> Verified Only
            </button>

            {hasFilters && (
              <button onClick={clearAll} style={{
                border: 'none', borderRadius: '20px', padding: '5px 14px',
                fontSize: '0.8125rem', fontWeight: 700, background: '#fef2f2',
                color: '#e63946', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <X size={12} /> Clear All
              </button>
            )}

            <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>
              {filtered.length} dealer{filtered.length !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>

        {/* ── ALL DEALERS GRID / LIST ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-gray-400)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #f0f0f0', borderTop: '3px solid #e63946', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading dealers…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem', background: '#fff',
            borderRadius: '16px', border: '1px solid var(--color-gray-200)',
          }}>
            <Car size={40} color="var(--color-gray-300)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '6px' }}>No dealers found</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Try adjusting your search or filters.</p>
            <button onClick={clearAll} style={{
              marginTop: '16px', padding: '9px 20px', border: 'none', borderRadius: '10px',
              background: 'var(--color-primary)', color: '#fff', fontWeight: 700,
              fontSize: '0.875rem', cursor: 'pointer',
            }}>Clear Filters</button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
            gap: '16px',
          }}>
            {filtered.map(dealer => {
              const logo = getLogoInfo(dealer.businessName, dealer.brand);
              const isTopRated = parseFloat(dealer.rating) >= 4.8;

              if (viewMode === 'list') {
                return (
                  <div key={dealer.id} style={{
                    background: '#fff', borderRadius: '14px',
                    border: '1px solid var(--color-gray-200)',
                    padding: '18px 20px',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '14px',
                      background: logo.bg, border: `2px solid ${logo.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.125rem', fontWeight: 800, color: logo.text, flexShrink: 0,
                    }}>
                      {logo.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{dealer.businessName}</h3>
                        {dealer.verified && <BadgeCheck size={15} color="#16a34a" />}
                        {isTopRated && <span style={{ background: '#fef3c7', color: '#b45309', borderRadius: '6px', padding: '1px 6px', fontSize: '0.5625rem', fontWeight: 800 }}>TOP RATED</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {dealer.city}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Star size={11} fill="currentColor" /> {dealer.rating} <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>({dealer.reviews})</span>
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Car size={11} /> {dealer.activeListings}+ vehicles
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Shield size={11} /> {dealer.yearsInBusiness} yrs
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <Link to={`/dealers/${dealer.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '8px 14px', border: '1.5px solid var(--color-primary)', borderRadius: '8px', background: '#fff', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>
                          View Profile
                        </button>
                      </Link>
                      <a href={`tel:${dealer.phone}`} style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '8px 10px', border: 'none', borderRadius: '8px', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Phone size={14} />
                        </button>
                      </a>
                    </div>
                  </div>
                );
              }

              return (
                <div key={dealer.id} style={{
                  background: '#fff', borderRadius: '16px',
                  border: '1px solid var(--color-gray-200)',
                  padding: '20px', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex', flexDirection: 'column',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)'; }}
                >
                  {/* Badges */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                    {isTopRated ? (
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '8px', fontSize: '0.5625rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Star size={9} fill="currentColor" /> TOP RATED
                      </span>
                    ) : (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: '8px', fontSize: '0.5625rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Zap size={9} /> FAST REPLY
                      </span>
                    )}
                  </div>

                  {/* Logo */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', marginBottom: '12px' }}>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '18px',
                      background: logo.bg, border: `2px solid ${logo.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', fontWeight: 800, color: logo.text,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    }}>
                      {logo.initials}
                    </div>
                  </div>

                  {/* Name & Location */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{dealer.businessName}</h3>
                      {dealer.verified && <BadgeCheck size={15} color="#16a34a" />}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                      <MapPin size={11} /> {dealer.city}
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                      <Star size={13} fill="currentColor" /> {dealer.rating}
                      <span style={{ color: 'var(--color-gray-400)', fontWeight: 400, fontSize: '0.75rem' }}>({dealer.reviews} reviews)</span>
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '8px', marginBottom: '14px',
                    padding: '12px', background: '#f8fafc', borderRadius: '10px',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{dealer.activeListings}+</div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Vehicles</div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid var(--color-gray-200)' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{dealer.yearsInBusiness}y</div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Experience</div>
                    </div>
                  </div>

                  {/* Brand tag */}
                  {dealer.brand && (
                    <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                      <span style={{
                        background: logo.bg, border: `1px solid ${logo.border}`,
                        borderRadius: '6px', padding: '3px 10px',
                        fontSize: '0.6875rem', fontWeight: 700, color: logo.text,
                      }}>
                        {dealer.brand}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <Link to={`/dealers/${dealer.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button style={{
                        width: '100%', padding: '9px', border: '1.5px solid var(--color-primary)',
                        borderRadius: '9px', background: '#fff', color: 'var(--color-primary)',
                        fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font)',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        View Profile
                      </button>
                    </Link>
                    <a href={`tel:${dealer.phone}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        padding: '9px 12px', border: 'none', borderRadius: '9px',
                        background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Phone size={15} />
                      </button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FEATURES BANNER ── */}
        <div style={{
          marginTop: '56px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          padding: '36px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          textAlign: 'center',
        }}>
          {[
            { icon: <Shield size={20} color="#4ade80" />, title: '100% Verified', desc: 'All dealers are inspected & trusted' },
            { icon: <Users size={20} color="#60a5fa" />, title: 'Buyer Protected', desc: 'Transparent deals, no hidden charges' },
            { icon: <Car size={20} color="#f472b6" />, title: 'Wide Inventory', desc: 'All major brands & models available' },
            { icon: <Clock size={20} color="#fb923c" />, title: 'Quick Response', desc: 'Dealers respond within 24 hours' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {f.icon}
              </div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#fff' }}>{f.title}</h4>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default UsedCarDealers;

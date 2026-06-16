import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Car, BadgeCheck, LayoutGrid, List,
  Phone, Shield, Zap, Clock, Search, ChevronRight,
  Award, TrendingUp, Users, CheckCircle, X, Sparkles,
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
  'Volkswagen':    { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  'Ford':          { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  'Nissan':        { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  'Datsun':        { bg: '#f0fdf4', text: '#065f46', border: '#a7f3d0' },
  'Jaguar Land Rover': { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
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
const ALL_BRANDS = ['Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Toyota', 'Honda', 'Kia', 'MG', 'Nissan', 'Volkswagen', 'Skoda', 'Jaguar Land Rover'];

const TOP_BRANDS = [
  { name: 'Maruti Suzuki', emoji: '🚗' },
  { name: 'Hyundai', emoji: '🚙' },
  { name: 'Tata Motors', emoji: '🚐' },
  { name: 'Mahindra', emoji: '🛻' },
  { name: 'Toyota', emoji: '🚕' },
  { name: 'Honda', emoji: '🏎️' },
  { name: 'Kia', emoji: '🚘' },
  { name: 'MG', emoji: '🚖' },
];

const NewCarDealers = () => {
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
      url.searchParams.append('type', 'new');
      const res = await fetch(url.toString());
      let apiDealers: Dealer[] = [];
      if (res.ok) apiDealers = await res.json();

      const staticDealers = tamilNaduDealers
        .filter(d => ['new', 'multi'].includes(d.type))
        .map(d => ({
          id: d.id,
          businessName: d.name,
          city: d.city,
          phone: d.phone || '9876543210',
          dealerType: (d.type === 'multi' ? 'both' : d.type) as 'new' | 'both',
          createdAt: new Date().toISOString(),
          activeListings: d.vehicles,
          rating: d.rating.toFixed(1),
          reviews: d.reviews,
          yearsInBusiness: d.yearsInBusiness,
          verified: d.verified,
          brand: d.brand,
          initials: d.initials,
        }));

      setDealers([...apiDealers, ...staticDealers]);
    } catch (err) {
      console.error('Error fetching new car dealers:', err);
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
    const totalVehicles = dealers.reduce((acc, d) => acc + d.activeListings, 0);
    return { verified, cities, brands, totalVehicles };
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
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        padding: '56px 0 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'radial-gradient(circle at 20% 60%, #e63946 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 45%)',
          pointerEvents: 'none',
        }} />
        {/* Decorative grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8125rem', fontWeight: 600 }}>New Car Dealers</span>
            <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
            <Link to="/dealers/used" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', textDecoration: 'none' }}>Used Car Dealers</Link>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ background: '#6366f1', color: '#fff', borderRadius: '20px', padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={10} /> Authorized Dealerships
            </span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Authorized New Car Dealers<br />
            <span style={{ background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>in Tamil Nadu</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '32px', maxWidth: '560px' }}>
            Find official dealerships, compare offers, and drive home your dream car.
          </p>

          {/* Search Bar */}
          <div style={{
            display: 'flex', gap: '10px', maxWidth: '640px',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            padding: '8px 8px 8px 16px',
            alignItems: 'center',
          }}>
            <Search size={18} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search dealer, city or brand…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: '#fff', fontSize: '0.9375rem', outline: 'none',
                fontFamily: 'var(--font)',
              }}
            />
            <button style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none',
              borderRadius: '10px', padding: '9px 18px',
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', flexShrink: 0,
            }}>
              Search
            </button>
          </div>
        </div>
      </div>

      {/* ── TRUST STATS BAR ── */}
      {!loading && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { icon: <CheckCircle size={22} color="#6366f1" />, value: stats.verified, label: 'Authorized Dealers', suffix: '+' },
                { icon: <Car size={22} color="#e63946" />, value: stats.totalVehicles.toLocaleString(), label: 'Total Vehicles', suffix: '+' },
                { icon: <MapPin size={22} color="#f59e0b" />, value: stats.cities, label: 'Cities Covered', suffix: '+' },
                { icon: <Award size={22} color="#10b981" />, value: stats.brands, label: 'Brands Covered', suffix: '+' },
              ].map((stat, i) => (
                <div key={i} style={{
                  padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '14px',
                  borderRight: i < 3 ? '1px solid var(--color-gray-100)' : 'none',
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

        {/* ── BROWSE BY BRAND ── */}
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '14px' }}>Browse by Brand</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {TOP_BRANDS.map(b => {
              const isActive = brandFilter === b.name;
              const colors = BRAND_COLORS[b.name] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
              return (
                <button
                  key={b.name}
                  onClick={() => setBrandFilter(isActive ? '' : b.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '8px 16px', borderRadius: '10px',
                    border: isActive ? `1.5px solid ${colors.text}` : '1px solid var(--color-gray-200)',
                    background: isActive ? colors.bg : '#fff',
                    color: isActive ? colors.text : 'var(--color-gray-700)',
                    fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? `0 0 0 3px ${colors.bg}` : 'none',
                  }}
                >
                  <span>{b.emoji}</span> {b.name}
                  {isActive && <X size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── FEATURED DEALERS ── */}
        {!loading && featured.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <TrendingUp size={20} color="#6366f1" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Featured Dealerships</h2>
              <span style={{ background: '#eef2ff', color: '#4f46e5', borderRadius: '20px', padding: '2px 10px', fontSize: '0.6875rem', fontWeight: 700 }}>AUTHORIZED</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {featured.map(dealer => {
                const logo = getLogoInfo(dealer.businessName, dealer.brand);
                return (
                  <div key={dealer.id} style={{
                    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
                    borderRadius: '18px', padding: '24px',
                    position: 'relative', overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)'; }}
                    onClick={() => navigate(`/dealers/${dealer.id}`)}
                  >
                    <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />

                    {/* Authorized Badge */}
                    <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(129,140,248,0.4)', borderRadius: '8px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BadgeCheck size={11} color="#818cf8" />
                      <span style={{ color: '#818cf8', fontSize: '0.625rem', fontWeight: 700 }}>AUTHORIZED</span>
                    </div>

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
                          <MapPin size={11} /> {dealer.city}
                        </div>
                      </div>
                    </div>

                    {/* Brand chip */}
                    {dealer.brand && (
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ background: logo.bg, border: `1px solid ${logo.border}`, borderRadius: '6px', padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700, color: logo.text }}>
                          {dealer.brand}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      {[
                        { label: 'Rating', value: `⭐ ${dealer.rating}` },
                        { label: 'Vehicles', value: `${dealer.activeListings}+` },
                        { label: 'Years', value: `${dealer.yearsInBusiness}y` },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{m.value}</div>
                          <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link to={`/dealers/${dealer.id}`} style={{ textDecoration: 'none', flex: 1 }} onClick={e => e.stopPropagation()}>
                        <button style={{
                          width: '100%', padding: '9px', border: '1px solid rgba(129,140,248,0.4)',
                          borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
                          color: '#fff', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font)',
                        }}>
                          View Profile
                        </button>
                      </Link>
                      <a href={`tel:${dealer.phone}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                        <button style={{
                          padding: '9px 14px', border: 'none', borderRadius: '8px',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
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
              <button style={{
                padding: '8px 18px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                fontSize: '0.875rem', fontWeight: 700, color: '#fff', cursor: 'default',
                borderRight: '1px solid rgba(255,255,255,0.2)',
              }}>
                New Cars
              </button>
              <button onClick={() => navigate('/dealers/used')} style={{
                padding: '8px 18px', border: 'none', background: 'transparent',
                fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-500)', cursor: 'pointer',
              }}>
                Used Cars
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setViewMode('grid')} style={{
                padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-gray-200)',
                background: viewMode === 'grid' ? '#eef2ff' : '#fff',
                color: viewMode === 'grid' ? '#4f46e5' : 'var(--color-gray-500)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', fontWeight: 600,
              }}>
                <LayoutGrid size={14} /> Grid
              </button>
              <button onClick={() => setViewMode('list')} style={{
                padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--color-gray-200)',
                background: viewMode === 'list' ? '#eef2ff' : '#fff',
                color: viewMode === 'list' ? '#4f46e5' : 'var(--color-gray-500)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', fontWeight: 600,
              }}>
                <List size={14} /> List
              </button>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{
                border: '1px solid var(--color-gray-200)', borderRadius: '8px',
                padding: '7px 12px', fontSize: '0.8125rem', fontWeight: 600,
                background: '#fff', outline: 'none', cursor: 'pointer', color: 'var(--color-gray-700)',
              }}>
                <option value="rating">Highest Rated</option>
                <option value="listings">Most Vehicles</option>
                <option value="experience">Most Experienced</option>
                <option value="alphabetical">A → Z</option>
              </select>
            </div>
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{
              border: cityFilter ? '1.5px solid #6366f1' : '1px solid var(--color-gray-200)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
              background: cityFilter ? '#eef2ff' : '#fff',
              color: cityFilter ? '#4f46e5' : 'var(--color-gray-600)',
              outline: 'none', cursor: 'pointer',
            }}>
              <option value="">📍 All Cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{
              border: brandFilter ? '1.5px solid #6366f1' : '1px solid var(--color-gray-200)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
              background: brandFilter ? '#eef2ff' : '#fff',
              color: brandFilter ? '#4f46e5' : 'var(--color-gray-600)',
              outline: 'none', cursor: 'pointer',
            }}>
              <option value="">🚗 All Brands</option>
              {ALL_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={{
              border: ratingFilter ? '1.5px solid #6366f1' : '1px solid var(--color-gray-200)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
              background: ratingFilter ? '#eef2ff' : '#fff',
              color: ratingFilter ? '#4f46e5' : 'var(--color-gray-600)',
              outline: 'none', cursor: 'pointer',
            }}>
              <option value="">⭐ Any Rating</option>
              <option value="4.8">4.8+ Stars</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4.0">4.0+ Stars</option>
            </select>

            <button onClick={() => setVerifiedFilter(v => !v)} style={{
              border: verifiedFilter ? '1.5px solid #6366f1' : '1px solid var(--color-gray-200)',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.8125rem', fontWeight: 600,
              background: verifiedFilter ? '#eef2ff' : '#fff',
              color: verifiedFilter ? '#4f46e5' : 'var(--color-gray-600)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <BadgeCheck size={14} /> Authorized Only
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
            <div style={{ width: '36px', height: '36px', border: '3px solid #f0f0f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading dealerships…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--color-gray-200)' }}>
            <Car size={40} color="var(--color-gray-300)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '6px' }}>No dealers found</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Try adjusting your filters.</p>
            <button onClick={clearAll} style={{
              marginTop: '16px', padding: '9px 20px', border: 'none', borderRadius: '10px',
              background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
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
                    padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px',
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
                        {dealer.verified && <BadgeCheck size={15} color="#6366f1" />}
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
                        {dealer.brand && (
                          <span style={{ background: logo.bg, border: `1px solid ${logo.border}`, borderRadius: '5px', padding: '1px 7px', fontSize: '0.6875rem', fontWeight: 700, color: logo.text }}>
                            {dealer.brand}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <Link to={`/dealers/${dealer.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '8px 14px', border: '1.5px solid #6366f1', borderRadius: '8px', background: '#fff', color: '#4f46e5', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>
                          View Profile
                        </button>
                      </Link>
                      <a href={`tel:${dealer.phone}`} style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '8px 10px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)'; }}
                >
                  {/* Badges */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                    {isTopRated ? (
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '8px', fontSize: '0.5625rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Star size={9} fill="currentColor" /> TOP RATED
                      </span>
                    ) : (
                      <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 7px', borderRadius: '8px', fontSize: '0.5625rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                      {dealer.verified && <BadgeCheck size={15} color="#6366f1" />}
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
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                    marginBottom: '14px', padding: '12px', background: '#f8fafc', borderRadius: '10px',
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
                      <span style={{ background: logo.bg, border: `1px solid ${logo.border}`, borderRadius: '6px', padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700, color: logo.text }}>
                        {dealer.brand}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <Link to={`/dealers/${dealer.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button style={{
                        width: '100%', padding: '9px', border: '1.5px solid #6366f1',
                        borderRadius: '9px', background: '#fff', color: '#4f46e5',
                        fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font)',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        View Profile
                      </button>
                    </Link>
                    <a href={`tel:${dealer.phone}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        padding: '9px 12px', border: 'none', borderRadius: '9px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
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
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
          borderRadius: '20px',
          padding: '36px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          textAlign: 'center',
        }}>
          {[
            { icon: <BadgeCheck size={20} color="#818cf8" />, title: 'Authorized Only', desc: 'Official manufacturer-certified dealers' },
            { icon: <Users size={20} color="#60a5fa" />, title: 'Expert Staff', desc: 'Trained sales & service professionals' },
            { icon: <Car size={20} color="#f472b6" />, title: 'Latest Models', desc: 'Full lineup of current-year vehicles' },
            { icon: <Clock size={20} color="#fb923c" />, title: 'Test Drive Ready', desc: 'Book a test drive at any dealership' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {f.icon}
              </div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#fff' }}>{f.title}</h4>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default NewCarDealers;

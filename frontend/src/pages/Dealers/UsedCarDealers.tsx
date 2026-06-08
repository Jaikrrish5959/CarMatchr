import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Car, BadgeCheck, LayoutGrid, List, Phone, Shield, Zap, BadgeDollarSign, Clock } from 'lucide-react';
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
}

const UsedCarDealers = () => {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Filter states
  const [cityFilter, setCityFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');

  const [sortOrder, setSortOrder] = useState('rating'); // rating, listings, alphabetical, newest
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchDealers();
  }, [cityFilter, sortOrder, brandFilter, budgetFilter, ratingFilter, verifiedFilter, experienceFilter, vehicleTypeFilter]);

  const fetchDealers = async () => {
    setLoading(true);
    try {
      const url = new URL(API_BASE ? `${API_BASE}/api/dealers` : '/api/dealers', window.location.origin);
      url.searchParams.append('type', 'used');
      if (cityFilter) url.searchParams.append('city', cityFilter);
      if (sortOrder) url.searchParams.append('sort', sortOrder);

      const res = await fetch(url.toString());
      let apiDealers: Dealer[] = [];
      if (res.ok) {
        apiDealers = await res.json();
      }

      // Merge with static data
      let staticDealers = tamilNaduDealers.filter(d => ['used', 'multi'].includes(d.type));
      
      const mappedStaticDealers: Dealer[] = staticDealers.map(d => ({
        id: d.id,
        businessName: d.name,
        city: d.city,
        phone: d.phone || '9876543210',
        dealerType: d.type === 'multi' ? 'both' : d.type,
        createdAt: new Date().toISOString(),
        activeListings: d.vehicles,
        rating: d.rating.toFixed(1),
        reviews: d.reviews,
        yearsInBusiness: d.yearsInBusiness,
        verified: d.verified,
        brand: d.brand,
      }));

      let combinedDealers = [...apiDealers, ...mappedStaticDealers];

      // Perform frontend filters
      if (cityFilter) {
        combinedDealers = combinedDealers.filter(d => d.city.toLowerCase() === cityFilter.toLowerCase());
      }
      if (brandFilter) {
        combinedDealers = combinedDealers.filter(d => d.brand && d.brand.toLowerCase().includes(brandFilter.toLowerCase()));
      }
      if (budgetFilter) {
        if (budgetFilter === 'under10') {
          combinedDealers = combinedDealers.filter(d => d.activeListings < 20);
        } else if (budgetFilter === '10to20') {
          combinedDealers = combinedDealers.filter(d => d.activeListings >= 20 && d.activeListings < 40);
        } else if (budgetFilter === '20to50') {
          combinedDealers = combinedDealers.filter(d => d.activeListings >= 40 && d.activeListings < 80);
        } else if (budgetFilter === '50plus') {
          combinedDealers = combinedDealers.filter(d => d.activeListings >= 80);
        }
      }
      if (ratingFilter) {
        const minRating = parseFloat(ratingFilter);
        combinedDealers = combinedDealers.filter(d => parseFloat(d.rating) >= minRating);
      }
      if (verifiedFilter === 'verified') {
        combinedDealers = combinedDealers.filter(d => d.verified);
      }
      if (experienceFilter) {
        const minExp = parseInt(experienceFilter, 10);
        combinedDealers = combinedDealers.filter(d => d.yearsInBusiness >= minExp);
      }
      if (vehicleTypeFilter) {
        // Mock matching logic: filter based on brand
        if (vehicleTypeFilter === 'ev') {
          combinedDealers = combinedDealers.filter(d => d.brand && (d.brand.includes('Tata') || d.brand.includes('Hyundai') || d.brand.includes('MG')));
        } else if (vehicleTypeFilter === 'suv') {
          combinedDealers = combinedDealers.filter(d => d.brand && (d.brand.includes('Mahindra') || d.brand.includes('Toyota') || d.brand.includes('Tata')));
        }
      }

      // Sort combined dealers
      if (sortOrder === 'listings') {
        combinedDealers.sort((a, b) => b.activeListings - a.activeListings);
      } else if (sortOrder === 'rating') {
        combinedDealers.sort((a, b) => Number(b.rating) - Number(a.rating));
      } else if (sortOrder === 'newest') {
        combinedDealers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        combinedDealers.sort((a, b) => a.businessName.localeCompare(b.businessName));
      }

      setDealers(combinedDealers);
    } catch (err) {
      console.error('Error fetching used car dealers:', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="section" style={{ background: '#f8fafc', minHeight: '100vh', padding: '36px 0 64px' }}>
      <div className="container">
        
        {/* Header Title Area */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Pre-Owned Car Dealers
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-600)' }}>
            Discover trusted used car dealers and pre-owned vehicle sellers in your area.
          </p>
        </div>

        {/* ── 1. PREMIUM HORIZONTAL FILTERS BAR ── */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--color-gray-200)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Location Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRight: '1px solid var(--color-gray-100)', flex: '1 1 120px', minWidth: '130px' }}>
            <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Location</span>
              <select 
                value={cityFilter} 
                onChange={e => setCityFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', outline: 'none', cursor: 'pointer', padding: 0 }}
              >
                <option value="">All Locations</option>
                <option value="Chennai">Chennai</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Madurai">Madurai</option>
                <option value="Trichy">Trichy</option>
                <option value="Salem">Salem</option>
              </select>
            </div>
          </div>

          {/* Brands Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRight: '1px solid var(--color-gray-100)', flex: '1 1 120px', minWidth: '130px' }}>
            <Car size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Brands</span>
              <select 
                value={brandFilter} 
                onChange={e => setBrandFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', outline: 'none', cursor: 'pointer', padding: 0 }}
              >
                <option value="">All Brands</option>
                <option value="Maruti Suzuki">Maruti Suzuki</option>
                <option value="Hyundai">Hyundai</option>
                <option value="Tata">Tata</option>
                <option value="Mahindra">Mahindra</option>
                <option value="Toyota">Toyota</option>
                <option value="Kia">Kia</option>
                <option value="Honda">Honda</option>
                <option value="MG">MG</option>
                <option value="Skoda">Skoda</option>
                <option value="Volkswagen">Volkswagen</option>
              </select>
            </div>
          </div>

          {/* Budget Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRight: '1px solid var(--color-gray-100)', flex: '1 1 120px', minWidth: '130px' }}>
            <BadgeDollarSign size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Budget Range</span>
              <select 
                value={budgetFilter} 
                onChange={e => setBudgetFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', outline: 'none', cursor: 'pointer', padding: 0 }}
              >
                <option value="">All Budgets</option>
                <option value="under10">Under 10 Lakh</option>
                <option value="10to20">10 - 20 Lakh</option>
                <option value="20to50">20 - 50 Lakh</option>
                <option value="50plus">50 Lakh+</option>
              </select>
            </div>
          </div>

          {/* Rating Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRight: '1px solid var(--color-gray-100)', flex: '1 1 120px', minWidth: '130px' }}>
            <Star size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Rating</span>
              <select 
                value={ratingFilter} 
                onChange={e => setRatingFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', outline: 'none', cursor: 'pointer', padding: 0 }}
              >
                <option value="">All Ratings</option>
                <option value="4.8">4.8+ ★</option>
                <option value="4.5">4.5+ ★</option>
                <option value="4.0">4.0+ ★</option>
              </select>
            </div>
          </div>

          {/* Verification Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRight: '1px solid var(--color-gray-100)', flex: '1 1 120px', minWidth: '130px' }}>
            <BadgeCheck size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Verification</span>
              <select 
                value={verifiedFilter} 
                onChange={e => setVerifiedFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', outline: 'none', cursor: 'pointer', padding: 0 }}
              >
                <option value="">All</option>
                <option value="verified">Verified Only</option>
              </select>
            </div>
          </div>

          {/* Experience Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRight: '1px solid var(--color-gray-100)', flex: '1 1 120px', minWidth: '130px' }}>
            <Shield size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Experience</span>
              <select 
                value={experienceFilter} 
                onChange={e => setExperienceFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', outline: 'none', cursor: 'pointer', padding: 0 }}
              >
                <option value="">All Experience</option>
                <option value="5">5+ Years</option>
                <option value="10">10+ Years</option>
                <option value="20">20+ Years</option>
              </select>
            </div>
          </div>

          {/* Vehicle Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', flex: '1 1 120px', minWidth: '130px' }}>
            <Car size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', fontWeight: 700, textTransform: 'uppercase' }}>Vehicle Type</span>
              <select 
                value={vehicleTypeFilter} 
                onChange={e => setVehicleTypeFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', outline: 'none', cursor: 'pointer', padding: 0 }}
              >
                <option value="">All Types</option>
                <option value="suv">SUVs Only</option>
                <option value="ev">EVs / Hybrids</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(cityFilter || brandFilter || budgetFilter || ratingFilter || verifiedFilter || experienceFilter || vehicleTypeFilter) && (
            <button 
              onClick={() => {
                setCityFilter(''); setBrandFilter(''); setBudgetFilter('');
                setRatingFilter(''); setVerifiedFilter(''); setExperienceFilter(''); setVehicleTypeFilter('');
              }}
              style={{ padding: '6px 12px', border: 'none', background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', marginLeft: 'auto' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* ── 3. DIRECTORY TABS & CONTROLS ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--color-gray-200)', gap: '16px' }}>
            <button 
              onClick={() => navigate('/dealers/new')}
              style={{
                background: 'transparent', border: 'none', padding: '8px 12px 10px',
                fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-gray-500)',
                borderBottom: '3px solid transparent', cursor: 'pointer'
              }}
            >
              New Car Dealers
            </button>
            <button 
              style={{
                background: 'transparent', border: 'none', padding: '8px 12px 10px',
                fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-primary)',
                borderBottom: '3px solid var(--color-primary)', cursor: 'default'
              }}
            >
              Used Car Dealers
            </button>
          </div>

          {/* List/Grid View & Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ 
                padding: '7px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                border: '1px solid var(--color-gray-200)',
                background: viewMode === 'grid' ? 'var(--color-primary-light)' : 'white',
                color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-gray-500)',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <LayoutGrid size={15} /> Grid
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ 
                padding: '7px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                border: '1px solid var(--color-gray-200)',
                background: viewMode === 'list' ? 'var(--color-primary-light)' : 'white',
                color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-gray-500)',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <List size={15} /> List
            </button>

            {/* Sort Order Select */}
            <select 
              className="form-control" 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value)}
              style={{ background: 'white', padding: '6px 28px 6px 12px', fontSize: '0.8125rem', fontWeight: 600, width: 'auto', borderRadius: '8px', cursor: 'pointer' }}
            >
              <option value="rating">Sort By: Highest Rated</option>
              <option value="listings">Sort By: Most Active</option>
              <option value="alphabetical">Sort By: Alphabetical</option>
              <option value="newest">Sort By: Newest First</option>
            </select>
          </div>
        </div>

        {/* ── 4. DEALERS LIST/GRID ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-gray-500)' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-gray-200)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading dealers...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : dealers.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: '#fff' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '0.5rem' }}>No dealers found</h3>
            <p style={{ color: 'var(--color-gray-500)' }}>Try adjusting your search filters to see more results.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr', 
            gap: '1.5rem' 
          }}>
            {dealers.map(dealer => {
              const logoInfo = getDealerLogoInfo(dealer.businessName);
              const isTopRated = parseFloat(dealer.rating) >= 4.8;

              return (
                <div key={dealer.id} className="card" style={{ 
                  padding: '24px 20px', 
                  background: '#fff',
                  border: '1px solid var(--color-gray-200)',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: viewMode === 'grid' ? 'column' : 'row',
                  alignItems: 'center',
                  textAlign: viewMode === 'grid' ? 'center' : 'left',
                  gap: viewMode === 'list' ? '24px' : '0px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  {/* Top rated / Fast response badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: isTopRated ? '#fef3c7' : '#dcfce7',
                    color: isTopRated ? '#d97706' : '#15803d',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 2,
                  }}>
                    {isTopRated ? <Star size={10} fill="currentColor" /> : <Zap size={10} />}
                    {isTopRated ? 'TOP RATED' : 'FAST RESPONSE'}
                  </div>

                  {/* Logo Icon */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: logoInfo.bg,
                    border: `2px solid ${logoInfo.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: logoInfo.text,
                    marginTop: viewMode === 'grid' ? '12px' : '0px',
                    marginBottom: viewMode === 'grid' ? '12px' : '0px',
                    boxShadow: 'var(--shadow-xs)',
                    flexShrink: 0,
                  }}>
                    {logoInfo.initials}
                  </div>

                  {/* Main Details */}
                  <div style={{ flex: 1, width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: viewMode === 'grid' ? 'center' : 'flex-start' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px', marginTop: viewMode === 'grid' ? '4px' : '0px' }}>
                        {dealer.businessName}
                        {dealer.verified && <BadgeCheck size={18} color="var(--color-primary)" />}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-gray-500)', fontSize: '0.8125rem', marginBottom: '6px' }}>
                        <MapPin size={12} /> {dealer.city}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '12px' }}>
                        <Star size={12} fill="currentColor" /> {dealer.rating} <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', marginLeft: '2px' }}>({dealer.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Metrics and Brands */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: viewMode === 'grid' ? 'center' : 'flex-start',
                    width: viewMode === 'grid' ? '100%' : 'auto',
                    minWidth: viewMode === 'list' ? '200px' : 'none',
                    borderTop: viewMode === 'grid' ? '1px solid var(--color-gray-100)' : 'none',
                    paddingTop: viewMode === 'grid' ? '12px' : '0px',
                    marginBottom: viewMode === 'grid' ? '12px' : '0px',
                  }}>
                    <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--color-gray-600)', fontSize: '0.8125rem', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Car size={14} color="var(--color-primary)" /> {dealer.activeListings}+ Vehicles
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={14} color="var(--color-primary)" /> {dealer.yearsInBusiness} yrs exp
                      </div>
                    </div>
                    {/* Brands list tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                      <span>Brands:</span>
                      {(dealer.brand || 'Maruti Suzuki, Hyundai').split(',').slice(0, 3).map((brandName, idx) => (
                        <span key={idx} style={{ background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-gray-600)' }}>
                          {brandName.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{ 
                    display: 'flex', 
                    width: viewMode === 'grid' ? '100%' : 'auto', 
                    gap: '8px', 
                    marginTop: viewMode === 'grid' ? 'auto' : '0px',
                    marginLeft: viewMode === 'list' ? 'auto' : '0px',
                    flexShrink: 0,
                  }}>
                    <Link to={`/dealers/${dealer.id}`} style={{ textDecoration: 'none', flex: viewMode === 'grid' ? 1 : 'none' }}>
                      <button className="btn btn-outline btn-sm" style={{ border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700, width: viewMode === 'grid' ? '100%' : '110px' }}>
                        View Profile
                      </button>
                    </Link>
                    <a href={`tel:${dealer.phone}`} style={{ textDecoration: 'none' }}>
                      <button className="btn btn-primary btn-sm" style={{ background: 'var(--color-primary)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Phone size={14} />
                      </button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 5. BOTTOM FEATURES BANNER ── */}
        <div style={{
          marginTop: '48px',
          background: 'rgba(230, 57, 70, 0.03)',
          borderRadius: '16px',
          padding: '28px 24px',
          border: '1px dashed rgba(230, 57, 70, 0.15)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {[
            { icon: <Shield size={18} color="var(--color-primary)" />, title: '100% Verified Dealers', desc: 'All dealers are verified & trusted' },
            { icon: <BadgeDollarSign size={18} color="var(--color-primary)" />, title: 'Best Price Guarantee', desc: 'Get the best deals & offers' },
            { icon: <Car size={18} color="var(--color-primary)" />, title: 'Wide Range of Brands', desc: 'All major brands available' },
            { icon: <Clock size={18} color="var(--color-primary)" />, title: 'Quick & Easy Process', desc: 'Hassle-free car buying' }
          ].map(feature => (
            <div key={feature.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'rgba(230, 57, 70, 0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: '4px'
              }}>
                {feature.icon}
              </div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{feature.title}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default UsedCarDealers;

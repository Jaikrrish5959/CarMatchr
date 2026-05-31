import React, { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, Heart, Fuel, Gauge,
  MapPin, Phone, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLanguage } from '../hooks/useLanguage';
import {
  carListings, filterListings, sortListings,
  defaultFilters, type Filters, type SortOption, type CarListing
} from '../data/carDatabase';
import CitySelector from '../components/CitySelector';
import FilterPanel from '../components/FilterPanel';
import { useCatalog } from '../hooks/useCatalog';

const Marketplace: React.FC = () => {
  const { brokerListings } = useData();
  const { t } = useLanguage();
  const { brands } = useCatalog();
  const { user } = useAuth();

  // --- State ---
  const [showCity, setShowCity] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortOption>('relevance');
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('carmatchr_wishlist'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [contactModal, setContactModal] = useState<{ brokerName: string; phone: string; email: string; listingId: string } | null>(null);
  const [activeImage, setActiveImage] = useState<Record<string, number>>({});

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
    
    fetch(`/api/listings/${bl.id}/contact`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName: user?.name || 'Anonymous', buyerEmail: user?.email || '', buyerPhone: user?.phone || '' }),
    }).catch(console.error);

    setContactModal({ brokerName: bl.brokerName, phone: user?.phone || 'N/A', email: '', listingId: bl.id });
  };

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
    <section className="section" style={{ background: '#f8fafc', minHeight: '100vh', paddingTop: '40px' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: '8px', fontSize: '2rem', fontWeight: 800 }}>{t('marketplace')}</h1>
            <p className="page-subtitle" style={{ color: 'var(--color-gray-500)' }}>Explore, filter and find premium pre-owned vehicles verified by local brokers</p>
          </div>
          
          <button type="button" onClick={() => setShowCity(true)}
            className="btn btn-secondary"
            style={{ gap: '8px', fontSize: '0.875rem' }}>
            <MapPin size={16} color="var(--color-primary)" />
            {filters.city || 'All Cities'}
          </button>
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '24px', flexWrap: 'wrap', gap: '12px', background: '#fff',
          padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', fontWeight: 500 }}>
              <strong>{filtered.length}</strong> {t('carsFound')}
              {filters.city && <> in <strong>{filters.city}</strong></>}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
              <input className="form-control" style={{ paddingLeft: '34px', width: '220px', fontSize: '0.8125rem' }}
                placeholder="Search cars..."
                value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
            </div>

            {/* Filter button */}
            <button onClick={() => setShowFilter(true)} className="btn btn-secondary btn-sm" style={{ position: 'relative', height: '38px' }}>
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
                    padding: '7px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    height: '38px',
                    transition: 'all 0.15s'
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
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            {filters.make && (
              <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '8px' }}
                onClick={() => setFilters({...filters, make: ''})}>{filters.make} ×</span>
            )}
            {filters.bodyType && (
              <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '8px' }}
                onClick={() => setFilters({...filters, bodyType: ''})}>{filters.bodyType} ×</span>
            )}
            {filters.fuelType && (
              <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '8px' }}
                onClick={() => setFilters({...filters, fuelType: ''})}>{filters.fuelType} ×</span>
            )}
            {filters.transmission && (
              <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '8px' }}
                onClick={() => setFilters({...filters, transmission: ''})}>{filters.transmission} ×</span>
            )}
            {(filters.budgetMin > 0 || filters.budgetMax < Infinity) && (
              <span className="badge badge-info" style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '8px' }}
                onClick={() => setFilters({...filters, budgetMin: 0, budgetMax: Infinity})}>Budget ×</span>
            )}
            <button onClick={() => setFilters({...defaultFilters, city: filters.city})}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font)', marginLeft: '8px' }}>
              {t('clearAll')}
            </button>
          </div>
        )}

        {/* Car Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ margin: '60px 0', background: '#fff', padding: '60px', borderRadius: 'var(--radius-xl)' }}>
            <div className="empty-state-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Search size={28} /></div>
            <p className="empty-state-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('noResults')}</p>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginTop: '6px' }}>Try resetting your filters or adjusting your budget limits.</p>
          </div>
        ) : (
          <div className="grid grid-4">{filtered.map(c => renderCarCard(c))}</div>
        )}
      </div>

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
    </section>
  );
};

export default Marketplace;

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Star, Car, BadgeCheck, CheckCircle2,
  Globe, ExternalLink, Building2, Tag, Calendar, MessageSquare,
  ArrowLeft, Fuel, Settings, Navigation,
} from 'lucide-react';
import { API_BASE } from '../../services/api';
import { tamilNaduDealers } from '../../data/tamilNaduDealers';

interface Listing {
  id: number;
  make: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  fuelType: string;
  transmission: string;
  kmDriven: number;
  city: string;
  images: string[];
}

interface DealerProfileData {
  id: string | number;
  businessName: string;
  ownerName?: string;
  city: string;
  state?: string;
  address?: string;
  phone: string;
  email: string;
  dealerType: 'new' | 'used' | 'both';
  businessType?: string;
  createdAt: string;
  license: string;
  rating: string;
  reviews: number;
  yearsInBusiness: number;
  verified: boolean;
  description?: string;
  website?: string;
  mapsLink?: string;
  authorizedBrands?: string;
  showroomAddress?: string;
  listings: Listing[];
}

const DealerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<DealerProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (id && id.startsWith('tn-')) {
          const staticDealer = tamilNaduDealers.find(d => d.id === id);
          if (staticDealer) {
            setProfile({
              id: staticDealer.id,
              businessName: staticDealer.name,
              city: staticDealer.city,
              phone: staticDealer.phone || 'Contact for details',
              email: 'dealer@example.com',
              dealerType: staticDealer.type === 'multi' ? 'both' : staticDealer.type,
              createdAt: new Date(new Date().setFullYear(new Date().getFullYear() - staticDealer.yearsInBusiness)).toISOString(),
              license: 'Verified',
              rating: staticDealer.rating.toFixed(1),
              reviews: staticDealer.reviews,
              yearsInBusiness: staticDealer.yearsInBusiness,
              verified: staticDealer.verified,
              listings: [],
            });
          }
        } else {
          const res = await fetch(`${API_BASE}/api/dealers/${id}`);
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('Error fetching dealer profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: 'var(--color-gray-500)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--color-gray-200)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontWeight: 600 }}>Loading dealer profile…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Car size={56} color="var(--color-gray-300)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>Dealer not found.</h2>
        <Link to="/dealers" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', marginTop: '0.5rem', display: 'inline-block' }}>← Browse all dealers</Link>
      </div>
    );
  }

  // Derive initials from business name
  const initials = (profile.businessName ?? '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  // Parse authorized brands
  const brands = profile.authorizedBrands
    ? profile.authorizedBrands.split(/[,;]+/).map(b => b.trim()).filter(Boolean)
    : [];

  const fullLocation = [profile.city, profile.state].filter(Boolean).join(', ');
  const fullAddress = profile.showroomAddress || profile.address || fullLocation;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '5rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dealer-listing-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important; }
        .dealer-listing-card { transition: transform 0.2s, box-shadow 0.2s; }
        .contact-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .contact-btn { transition: all 0.18s; }
        .brand-tag:hover { background: var(--color-primary-light) !important; color: var(--color-primary) !important; }
        .brand-tag { transition: all 0.15s; }
      `}</style>

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f3460 100%)',
        padding: '0 0 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(230,57,70,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Back button */}
        <div className="container" style={{ paddingTop: '1.5rem' }}>
          <Link
            to="/dealers"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
              fontSize: '0.8125rem', fontWeight: 600,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            <ArrowLeft size={14} /> Back to Dealers
          </Link>
        </div>

        <div className="container" style={{ padding: '2rem 0 3rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: 88, height: 88, borderRadius: 20,
              background: 'linear-gradient(135deg, var(--color-primary), #c62a36)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 900, color: '#fff',
              boxShadow: '0 8px 32px rgba(230,57,70,0.35)',
              flexShrink: 0,
            }}>{initials}</div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  {profile.businessName}
                </h1>
                {profile.verified && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'rgba(16,185,129,0.15)', color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 999, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    <BadgeCheck size={13} /> Verified
                  </span>
                )}
              </div>

              {profile.ownerName && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: '4px', fontWeight: 500 }}>
                  Owner: {profile.ownerName}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '12px', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                {fullLocation && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} /> {fullLocation}
                  </span>
                )}
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>
                    <Phone size={14} /> {profile.phone}
                  </a>
                )}
                {profile.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={14} /> {profile.email}
                  </span>
                )}
              </div>

              {/* Dealer type badges */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
                }}>
                  <Car size={11} style={{ marginRight: 4 }} />{profile.dealerType} Cars
                </span>
                {profile.businessType && (
                  <span style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.8)', borderRadius: 8, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                  }}>
                    {profile.businessType}
                  </span>
                )}
              </div>
            </div>

            {/* Rating chip (top right) */}
            <div style={{
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 16, padding: '14px 20px', textAlign: 'center', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                <Star size={18} fill="#fbbf24" color="#fbbf24" />
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{profile.rating}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '2px' }}>{profile.reviews} reviews</div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ background: 'rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { label: 'Listings', value: profile.listings.length, icon: <Car size={16} /> },
                { label: 'Years Active', value: profile.yearsInBusiness, icon: <Calendar size={16} /> },
                { label: 'Member Since', value: new Date(profile.createdAt).getFullYear(), icon: <CheckCircle2 size={16} /> },
                { label: 'Reviews', value: profile.reviews, icon: <Star size={16} fill="rgba(255,255,255,0.7)" /> },
              ].map((stat, i) => (
                <div key={i} style={{
                  flex: 1, padding: '14px 0', textAlign: 'center',
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '2px' }}>
                    {stat.icon} {stat.label}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.125rem', color: '#fff' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Body ────────────────────────────────────────────── */}
      <div className="container" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>

          {/* ── Left Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* About Card */}
            {(profile.description || profile.website || profile.mapsLink || brands.length > 0 || fullAddress) && (
              <div style={{ background: '#fff', borderRadius: 20, padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} color="var(--color-primary)" /> About {profile.businessName}
                </h2>

                {profile.description && (
                  <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7, marginBottom: '1.25rem', borderLeft: '3px solid var(--color-primary)', paddingLeft: '1rem' }}>
                    {profile.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {fullAddress && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: '#334155' }}>
                      <MapPin size={15} color="var(--color-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{fullAddress}</span>
                    </div>
                  )}

                  {profile.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                      <Globe size={15} color="#3b82f6" style={{ flexShrink: 0 }} />
                      <a
                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {profile.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {profile.mapsLink && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                      <Navigation size={15} color="#10b981" style={{ flexShrink: 0 }} />
                      <a
                        href={profile.mapsLink}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        View on Google Maps <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Authorized brands */}
                {brands.length > 0 && (
                  <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={13} /> Authorized Brands
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {brands.map(b => (
                        <span
                          key={b}
                          className="brand-tag"
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: 8, padding: '4px 12px',
                            fontSize: '0.8125rem', fontWeight: 700, color: '#374151', cursor: 'default',
                          }}
                        >{b}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Inventory */}
            <div>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={18} color="var(--color-primary)" /> Current Inventory
                <span style={{ marginLeft: 4, background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 999, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 800 }}>
                  {profile.listings.length}
                </span>
              </h2>

              {profile.listings.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <Car size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.125rem', color: '#374151', fontWeight: 700 }}>No active listings</h3>
                  <p style={{ color: '#94a3b8', marginTop: '4px' }}>This dealer hasn't posted any cars yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {profile.listings.map(listing => (
                    <div key={listing.id} className="dealer-listing-card" style={{
                      background: '#fff', borderRadius: 16, overflow: 'hidden',
                      border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    }}>
                      {/* Image */}
                      <div style={{ height: 160, background: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
                        {listing.images && listing.images.length > 0 ? (
                          <img src={listing.images[0]} alt={listing.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                            <Car size={40} />
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
                          color: '#fff', borderRadius: 8, padding: '3px 8px',
                          fontSize: '0.75rem', fontWeight: 700,
                        }}>{listing.year}</div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '2px' }}>
                          {listing.make} {listing.model}
                        </div>
                        {listing.variant && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>{listing.variant}</div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#64748b', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Fuel size={11} /> {listing.fuelType}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Settings size={11} /> {listing.transmission}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} /> {listing.city || fullLocation}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                            {listing.kmDriven.toLocaleString()} km
                          </div>
                          <div style={{ fontSize: '1.0625rem', fontWeight: 900, color: 'var(--color-primary)' }}>
                            ₹{listing.price.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1.5rem' }}>

            {/* Contact Card */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Contact Dealer</h3>

              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="contact-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: 'var(--color-primary)', color: '#fff',
                    fontWeight: 800, fontSize: '0.9375rem', textDecoration: 'none',
                    boxSizing: 'border-box', marginBottom: '10px',
                  }}
                >
                  <Phone size={16} /> Call Now
                </a>
              )}

              {profile.phone && (
                <a
                  href={`https://wa.me/${profile.phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="contact-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: '#25d366', color: '#fff',
                    fontWeight: 800, fontSize: '0.9375rem', textDecoration: 'none',
                    boxSizing: 'border-box', marginBottom: '10px',
                  }}
                >
                  <MessageSquare size={16} /> WhatsApp
                </a>
              )}

              {profile.mapsLink && (
                <a
                  href={profile.mapsLink}
                  target="_blank" rel="noopener noreferrer"
                  className="contact-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: '#f1f5f9', color: '#334155',
                    fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <Navigation size={15} /> Get Directions
                </a>
              )}
            </div>

            {/* About Dealership Card */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>At a Glance</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { icon: <CheckCircle2 size={16} color="#10b981" />, label: 'Verified Business License', show: true },
                  { icon: <Calendar size={16} color="#3b82f6" />, label: `${profile.yearsInBusiness}+ Years Experience`, show: true },
                  { icon: <CheckCircle2 size={16} color="#10b981" />, label: `Member since ${new Date(profile.createdAt).getFullYear()}`, show: true },
                  { icon: <Car size={16} color="var(--color-primary)" />, label: `${profile.dealerType.charAt(0).toUpperCase() + profile.dealerType.slice(1)} Car Dealer`, show: true },
                  { icon: <Globe size={16} color="#8b5cf6" />, label: 'Website available', show: !!profile.website },
                  { icon: <Navigation size={16} color="#10b981" />, label: 'Location on Maps', show: !!profile.mapsLink },
                ].filter(i => i.show).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <hr style={{ margin: '1.25rem 0', borderColor: '#f1f5f9' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: '#d97706' }}>
                <Star size={14} fill="#d97706" color="#d97706" />
                {profile.rating} rating · {profile.reviews} reviews
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DealerProfile;

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Star, Car, BadgeCheck, CheckCircle2 } from 'lucide-react';
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

interface DealerProfile {
  id: string | number;
  businessName: string;
  city: string;
  phone: string;
  email: string;
  dealerType: 'new' | 'used' | 'both';
  createdAt: string;
  license: string;
  rating: string;
  reviews: number;
  yearsInBusiness: number;
  verified: boolean;
  listings: Listing[];
}

const DealerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<DealerProfile | null>(null);
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
              listings: [] // We don't have mock listings for static dealers yet
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
    return <div style={{ textAlign: 'center', padding: '4rem 0' }}>Loading dealer profile...</div>;
  }

  if (!profile) {
    return <div style={{ textAlign: 'center', padding: '4rem 0' }}>Dealer not found.</div>;
  }

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Cover / Header */}
      <div style={{ background: 'linear-gradient(to right, var(--color-primary-dark), var(--color-primary))', padding: '3rem 0', color: 'white' }}>
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {profile.businessName}
              {profile.verified && <BadgeCheck size={32} color="#10b981" />}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', opacity: 0.9 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={18} /> {profile.city}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={18} /> {profile.phone}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={18} /> {profile.email}</span>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
               <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Star fill="currentColor" size={18} color="#fbbf24" /> {profile.rating} ({profile.reviews} reviews)
               </div>
               <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  <Car size={18} /> {profile.dealerType} Car Dealer
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Main Content (Inventory) */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Current Inventory ({profile.listings.length})
            </h2>
            
            {profile.listings.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Car size={48} color="var(--color-gray-300)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-gray-900)', fontWeight: 600 }}>No active listings</h3>
                <p style={{ color: 'var(--color-gray-500)' }}>This dealer hasn't posted any cars yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {profile.listings.map(listing => (
                  <div key={listing.id} className="card" style={{ display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: '250px', height: '200px', background: 'var(--color-gray-200)', flexShrink: 0 }}>
                      {listing.images && listing.images.length > 0 ? (
                        <img src={listing.images[0]} alt={listing.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)' }}>
                          <Car size={40} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                            {listing.year} {listing.make} {listing.model}
                          </h3>
                          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>{listing.variant}</p>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                          ₹{listing.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{listing.kmDriven.toLocaleString()} km</span>
                          <span>Driven</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{listing.fuelType}</span>
                          <span>Fuel</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{listing.transmission}</span>
                          <span>Transmission</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar (About Dealer) */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>About Dealership</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-gray-700)' }}>
                <CheckCircle2 size={18} color="var(--color-primary)" />
                <span>Verified Business License</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-gray-700)' }}>
                <CheckCircle2 size={18} color="var(--color-primary)" />
                <span>{profile.yearsInBusiness} Years Experience</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-gray-700)' }}>
                <CheckCircle2 size={18} color="var(--color-primary)" />
                <span>Member since {new Date(profile.createdAt).getFullYear()}</span>
              </div>
            </div>

            <hr style={{ margin: '1.5rem 0', borderColor: 'var(--color-gray-200)' }} />

            <button className="btn btn-primary btn-block">
              Contact Dealer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DealerProfile;

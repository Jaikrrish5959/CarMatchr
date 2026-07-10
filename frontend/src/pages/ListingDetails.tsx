import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Shield, Car, Calendar,
  Fuel, Gauge, User, Sparkles, ChevronLeft, ChevronRight,
  Info, Eye, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useCatalog } from '../hooks/useCatalog';
import { carListings } from '../data/carDatabase';
import { API_BASE } from '../services/api';
import OtpModal from '../components/OtpModal';
import toast from 'react-hot-toast';

const ListingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { brokerListings } = useData();
  const { brands } = useCatalog();
  const { user } = useAuth();

  // --- Search for standard/broker listing ---
  const car = useMemo(() => {
    if (!id) return null;
    if (id.startsWith('bl-')) {
      const numericId = parseInt(id.replace('bl-', ''), 10);
      const bl = brokerListings.find(l => l.id === numericId);
      if (!bl) return null;
      return {
        id,
        make: bl.make,
        model: bl.model,
        variant: bl.variant || '',
        year: bl.year,
        price: bl.price,
        mileage: 0,
        fuelType: bl.fuelType,
        transmission: bl.transmission,
        bodyType: bl.bodyType,
        seatingCapacity: 5,
        color: bl.color || 'N/A',
        city: bl.city,
        image: (
          brands.find((b) => b.name === bl.make)?.models.find((m) => m.name === bl.model)?.imageUrl ||
          'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=480&q=80'
        ),
        sellerRating: 4.5,
        sellerName: bl.brokerName,
        phone: bl.brokerPhone || '9876543210',
        features: [],
        listed: bl.createdAt,
        isFeatured: false,
        kmDriven: bl.kmDriven,
        owners: bl.owners,
        images: bl.images,
        description: bl.description || '',
        isBroker: true,
      };
    } else {
      const match = carListings.find(c => c.id === id);
      if (!match) return null;
      return {
        ...match,
        phone: '9876543210', // Seed phone number for standard listings
        description: `This premium pre-owned ${match.make} ${match.model} is certified with full history, multi-point check, and is in showroom condition.`,
        isBroker: false,
      };
    }
  }, [id, brokerListings, brands]);

  // --- States ---
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const [leadForm, setLeadForm] = useState({
    buyerName: user?.name || '',
    buyerEmail: user?.email || '',
    buyerPhone: (user?.phone && user.phone.startsWith('+91')) ? user.phone.slice(3) : (user?.phone || ''),
  });

  if (!car) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: '#f8fafc', minHeight: '100vh' }}>
        <Info size={48} color="var(--color-gray-400)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-dark)' }}>Listing Not Found</h2>
        <p style={{ color: 'var(--color-gray-500)', marginTop: '8px', marginBottom: '24px' }}>The listing you are looking for does not exist or has been removed.</p>
        <Link to="/marketplace" className="btn btn-primary">Back to Marketplace</Link>
      </div>
    );
  }

  const images = car.images && car.images.length > 0 ? car.images : [car.image];

  const checkOtpBypass = (phoneNum: string) => {
    const cleanPhone = phoneNum.trim();
    const fullPhone = `+91${cleanPhone}`;
    if (user && user.phone === fullPhone && user.phoneVerified) {
      return true;
    }
    const cachedTime = sessionStorage.getItem(`verified_phone_${cleanPhone}`);
    if (cachedTime) {
      const parsedTime = parseInt(cachedTime, 10);
      if (!isNaN(parsedTime) && (Date.now() - parsedTime < 24 * 60 * 60 * 1000)) {
        return true;
      }
    }
    return false;
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.buyerName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!leadForm.buyerPhone.trim() || !/^\d{10}$/.test(leadForm.buyerPhone.trim())) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    
    const cleanPhone = leadForm.buyerPhone.trim();
    if (checkOtpBypass(cleanPhone)) {
      verifyAndSubmitLead('BYPASS');
    } else {
      // Open OTP code verification
      setShowOtpModal(true);
    }
  };

  const verifyAndSubmitLead = async (otp: string) => {
    try {
      const token = localStorage.getItem('carmatchr_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/listings/${car.id}/contact`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          buyerName: leadForm.buyerName.trim(),
          buyerEmail: leadForm.buyerEmail.trim(),
          buyerPhone: `+91${leadForm.buyerPhone.trim()}`,
          phoneOtp: otp,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (otp === 'BYPASS') {
          sessionStorage.removeItem(`verified_phone_${leadForm.buyerPhone.trim()}`);
        }
        toast.error(data.error || 'OTP verification failed. Please try again.');
        return;
      }
      toast.success('Inquiry logged successfully!');
      
      sessionStorage.setItem(`verified_phone_${leadForm.buyerPhone.trim()}`, Date.now().toString());

      setIsPhoneRevealed(true);
      setShowInquiryModal(false);
      setShowOtpModal(false);
    } catch (error) {
      toast.error('Failed to submit inquiry. Please try again.');
    }
  };

  const getMaskedPhone = (phoneNum: string) => {
    const clean = phoneNum.replace(/\D/g, '');
    if (clean.length >= 10) {
      return `+91 ${clean.slice(0, 5)} XXXXX`;
    }
    return '+91 XXXXX XXXXX';
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 0 80px' }}>
      <div className="container">
        
        {/* Back navigation */}
        <button onClick={() => navigate('/marketplace')} style={{
          background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--color-gray-600)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
          marginBottom: '24px', fontFamily: 'var(--font)'
        }}>
          <ArrowLeft size={16} /> Back to Marketplace
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'start'
        }}>
          
          {/* LEFT: Image Carousel and Gallery */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              position: 'relative', height: '400px', background: '#000', borderRadius: '20px',
              overflow: 'hidden', boxShadow: 'var(--shadow-md)'
            }}>
              <img
                src={images[currentImgIndex]}
                alt={`${car.make} ${car.model}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length)} style={{
                    position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.85)', color: 'var(--color-dark)', border: 'none', borderRadius: '50%',
                    width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10, transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentImgIndex((prev) => (prev + 1) % images.length)} style={{
                    position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.85)', color: 'var(--color-dark)', border: 'none', borderRadius: '50%',
                    width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10, transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    <ChevronRight size={20} />
                  </button>
                  <div style={{
                    position: 'absolute', bottom: '16px', right: '16px',
                    background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.75rem',
                    fontWeight: 700, padding: '4px 10px', borderRadius: '20px'
                  }}>
                    {currentImgIndex + 1} / {images.length}
                  </div>
                </>
              )}

              {car.isBroker && (
                <span style={{
                  position: 'absolute', top: '16px', left: '16px',
                  background: 'rgba(230,57,70,0.95)', color: '#fff', fontSize: '0.6875rem',
                  fontWeight: 800, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>🏪 Broker Listed</span>
              )}
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImgIndex(idx)}
                    style={{
                      width: '80px', height: '60px', borderRadius: '10px', overflow: 'hidden',
                      border: idx === currentImgIndex ? '2.5px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
                      background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s'
                    }}
                  >
                    <img src={img} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Car Description */}
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid var(--color-gray-200)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-dark)', marginBottom: '10px' }}>Description</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', lineHeight: 1.6, margin: 0 }}>
                {car.description}
              </p>
            </div>
          </div>

          {/* RIGHT: Specs, Price, Lead capture CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Main Header Card */}
            <div style={{
              background: '#fff', borderRadius: '20px', padding: '32px',
              border: '1px solid var(--color-gray-200)', boxShadow: 'var(--shadow-sm)'
            }}>
              <span style={{
                background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                fontSize: '0.6875rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block', marginBottom: '12px'
              }}>
                {car.year} Model
              </span>
              
              <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-dark)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                {car.make} {car.model}
              </h1>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-500)', marginBottom: '20px' }}>{car.variant}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary)' }}>
                  ₹{car.price} Lakh
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>
                  Estimated On-Road Price
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.875rem', color: 'var(--color-gray-600)', marginBottom: '12px' }}>
                <MapPin size={16} color="var(--color-primary)" />
                <span>Available at <strong>{car.city}</strong></span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                <Shield size={16} color="#16a34a" />
                <span>Dealer Rating: <strong>⭐ {car.sellerRating} / 5.0</strong></span>
              </div>
            </div>

            {/* Specifications Grid */}
            <div style={{
              background: '#fff', borderRadius: '20px', padding: '28px',
              border: '1px solid var(--color-gray-200)', boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-dark)', marginBottom: '20px' }}>Vehicle Specifications</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { icon: <Gauge size={16} color="var(--color-primary)" />, label: 'Kilometers Driven', value: `${car.kmDriven.toLocaleString()} km` },
                  { icon: <Fuel size={16} color="var(--color-primary)" />, label: 'Fuel Type', value: car.fuelType },
                  { icon: <Car size={16} color="var(--color-primary)" />, label: 'Transmission', value: car.transmission },
                  { icon: <Calendar size={16} color="var(--color-primary)" />, label: 'Year of Manufacture', value: car.year },
                  { icon: <User size={16} color="var(--color-primary)" />, label: 'No. of Owners', value: `${car.owners} ${car.owners === 1 ? 'Owner' : 'Owners'}` },
                  { icon: <Sparkles size={16} color="var(--color-primary)" />, label: 'Exterior Color', value: car.color },
                ].map((spec, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {spec.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>{spec.label}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-dark)', marginTop: '1px' }}>{spec.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead capture Call to Action */}
            <div style={{
              background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
              borderRadius: '20px', padding: '32px', color: '#fff',
              boxShadow: '0 8px 32px rgba(48,43,99,0.25)', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={20} color="#818cf8" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#818cf8', textTransform: 'uppercase' }}>Verified Dealership</span>
              </div>
              
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>Interested in this Car?</h3>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: '24px' }}>
                Request dealer callback or unlock contact numbers. Verification required to secure spam protection.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Phone details display */}
                <div style={{
                  background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dealer Contact</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px', color: '#fff' }}>
                      {isPhoneRevealed ? car.phone : getMaskedPhone(car.phone)}
                    </div>
                  </div>
                  {isPhoneRevealed ? (
                    <a href={`tel:${car.phone}`} className="btn btn-primary" style={{ height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <Phone size={14} />
                    </a>
                  ) : (
                    <button onClick={() => setShowInquiryModal(true)} style={{
                      background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px',
                      padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px', borderStyle: 'solid', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.15)'
                    }}>
                      <Eye size={12} /> Unlock
                    </button>
                  )}
                </div>

                <button onClick={() => setShowInquiryModal(true)} className="btn btn-primary btn-lg btn-block" style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none'
                }}>
                  Request Instant Callback
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ===== Lead capture Form Modal ===== */}
      {showInquiryModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowInquiryModal(false)}>
          <div className="card animate-in" style={{ maxWidth: '420px', width: '90%', padding: '32px', position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowInquiryModal(false)} style={{
              position: 'absolute', top: '16px', right: '16px', background: 'var(--color-gray-100)', border: 'none',
              cursor: 'pointer', color: 'var(--color-gray-500)', width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>×</button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-dark)' }}>
              Inquire Details
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginBottom: '20px' }}>
              Confirm your contact details to connect with the dealer.
            </p>

            <form onSubmit={handleInquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Your Name *</label>
                <input
                  type="text" className="form-control" placeholder="John Doe" required
                  value={leadForm.buyerName}
                  onChange={e => setLeadForm({ ...leadForm, buyerName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Your Email</label>
                <input
                  type="email" className="form-control" placeholder="you@example.com"
                  value={leadForm.buyerEmail}
                  onChange={e => setLeadForm({ ...leadForm, buyerEmail: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Your Mobile Number *</label>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <select
                    style={{
                      padding: '10px 12px', border: '1px solid var(--color-gray-200)',
                      borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
                      background: '#f8fafc', color: 'var(--color-gray-700)', fontWeight: 600,
                      width: '100px', pointerEvents: 'none'
                    }}
                    tabIndex={-1}
                  >
                    <option>+91 (IN)</option>
                  </select>
                  <input
                    type="tel" className="form-control" placeholder="Enter 10-digit mobile" required
                    value={leadForm.buyerPhone}
                    onChange={e => setLeadForm({ ...leadForm, buyerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }}>
                Verify & Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OTP verification for Callback */}
      {showOtpModal && (
        <OtpModal
          phone={`+91${leadForm.buyerPhone.trim()}`}
          title="Verify Mobile Number"
          subtitle="Confirm your identity to unlock direct contact numbers with the dealer."
          onVerified={(otp) => {
            verifyAndSubmitLead(otp);
          }}
          onClose={() => setShowOtpModal(false)}
        />
      )}

    </div>
  );
};

export default ListingDetails;

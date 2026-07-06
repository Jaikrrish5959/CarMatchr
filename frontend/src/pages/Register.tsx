import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../contexts/AuthContext';
import { UserPlus, Loader2, AlertCircle, Phone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cities } from '../data/carDatabase';
import OtpModal from '../components/OtpModal';

const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole: UserRole = searchParams.get('role') === 'broker' ? 'broker' : 'buyer';
  const [role, setRole] = useState<UserRole>(initialRole);
  const { register, loginWithGoogle, registerBrokerWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<{name: string, businessName: string, license: string, phone: string, city: string, email: string, password: string, dealerType: 'new' | 'used' | 'both' | ''}>({ name: '', businessName: '', license: '', phone: '', city: '', email: '', password: '', dealerType: '' });

  // Phone OTP verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [phoneVerifiedOtp, setPhoneVerifiedOtp] = useState<string | null>(null);  // otp code confirmed
  const [brokerPhoneVerifiedOtp, setBrokerPhoneVerifiedOtp] = useState<string | null>(null);
  const [showBrokerOtpModal, setShowBrokerOtpModal] = useState(false);

  // Google OAuth specific states
  const [googleProfileData, setGoogleProfileData] = useState<{
    email: string;
    name: string;
    credential: string;
  } | null>(null);

  const [brokerForm, setBrokerForm] = useState<{businessName: string, license: string, city: string, phone: string, dealerType: 'new' | 'used' | 'both' | ''}>({
    businessName: '',
    license: '',
    city: '',
    phone: '',
    dealerType: '',
  });

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Google script initialization
  useEffect(() => {
    if (!googleClientId || role === 'admin' || googleProfileData) return;

    const initGoogle = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        const btnElement = document.getElementById('google-register-btn');
        if (btnElement) {
          (window as any).google.accounts.id.renderButton(
            btnElement,
            {
              theme: 'outline',
              size: 'large',
              text: 'signup_with',
              shape: 'rectangular',
              width: 368, // width in pixels
            }
          );
        }
      }
    };

    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGoogle();
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [role, googleClientId, googleProfileData]);

  const handleGoogleCredentialResponse = async (response: any) => {
    const credential = response.credential;
    setLoading(true);
    setError('');

    try {
      const result = await loginWithGoogle(credential, role);
      if (!result.ok) {
        const msg = result.error ?? 'Google authentication failed.';
        setError(msg);
        toast.error(msg);
        return;
      }

      if (result.isNewUser) {
        setGoogleProfileData({
          email: result.email || '',
          name: result.name || '',
          credential: result.credential || '',
        });
        toast.success('Authenticated! Please complete your dealership details to register.');
        return;
      }

      if (result.user) {
        toast.success(`Welcome back, ${result.user.name || result.user.email}!`);
        if (!result.user.phone) {
          navigate('/settings');
        } else if (result.user.role === 'broker') {
          navigate('/broker-dashboard');
        } else {
          navigate('/buyer-dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleBrokerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleProfileData) return;

    if (!brokerForm.businessName.trim()) {
      toast.error('Dealership Name is required.');
      return;
    }
    if (!brokerForm.license.trim()) {
      toast.error('License Number is required.');
      return;
    }
    if (!brokerForm.city) {
      toast.error('Please select your city.');
      return;
    }
    if (!brokerForm.phone.trim()) {
      toast.error('Mobile number is required.');
      return;
    }
    if (!/^\d{10}$/.test(brokerForm.phone.trim())) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!brokerForm.dealerType) {
      toast.error('Please select your Dealer Type.');
      return;
    }
    if (!brokerPhoneVerifiedOtp) {
      toast.error('Please verify your phone number before completing registration.');
      setShowBrokerOtpModal(true);
      return;
    }

    setLoading(true);
    try {
      const result = await registerBrokerWithGoogle({
        email: googleProfileData.email,
        businessName: brokerForm.businessName.trim(),
        license: brokerForm.license.trim(),
        city: brokerForm.city,
        phone: `+91${brokerForm.phone.trim()}`,
        credential: googleProfileData.credential,
        dealerType: brokerForm.dealerType as 'new' | 'used' | 'both',
        phoneOtp: brokerPhoneVerifiedOtp,
      });

      if (!result.ok) {
        const msg = result.error ?? 'Failed to complete dealer registration.';
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success('Broker registration completed successfully!');
      navigate('/broker-dashboard');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = (): string | null => {
    if (role === 'buyer' && !form.name.trim()) return 'Please enter your full name.';
    if (role === 'broker') {
      if (!form.businessName.trim()) return 'Please enter your dealership name.';
      if (!form.license.trim()) return 'Please enter your license number.';
      if (!form.city) return 'Please select your city.';
      if (!form.dealerType) return 'Please select your Dealer Type.';
    }
    if (!form.phone.trim()) return 'Mobile number is required.';
    if (!/^\d{10}$/.test(form.phone.trim())) return 'Please enter a valid 10-digit mobile number.';
    if (!phoneVerifiedOtp) return 'Please verify your mobile number before creating your account.';

    if (!form.email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.password) return 'Please enter a password.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }
    setLoading(true);
    setError('');
      try {
        const result = await register({
          email: form.email.trim().toLowerCase(),
        password: form.password,
        role,
        status: 'active',
        name: role === 'buyer' ? form.name.trim() : undefined,
        businessName: role === 'broker' ? form.businessName.trim() : undefined,
        phone: form.phone.trim() ? `+91${form.phone.trim()}` : undefined,
        license: role === 'broker' ? form.license.trim() : undefined,
        city: form.city || undefined,
        dealerType: role === 'broker' ? (form.dealerType as 'new' | 'used' | 'both') : undefined,
        // @ts-ignore — phoneOtp passed to backend
        phoneOtp: phoneVerifiedOtp || undefined,
      });
      if (!result.ok) {
        const message = result.error ?? 'Unable to create account.';
        setError(message);
        toast.error(message);
        return;
      }
      setError('');
      if (role === 'broker') {
        toast.success('Account created successfully! Welcome to CarMatchr!');
      } else {
        toast.success('Account created successfully! Welcome to CarMatchr!');
      }
      navigate(role === 'buyer' ? '/buyer-dashboard' : '/broker-dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '480px' }}>
        <div className="card" style={{ padding: '36px' }}>
          {googleProfileData ? (
            /* Google OAuth Completion Form */
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <UserPlus size={22} />
                </div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>Dealer Details</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Complete registration details below</p>
              </div>

              <form onSubmit={handleBrokerSubmit}>
                <div className="form-group">
                  <label className="form-label">Google Email</label>
                  <input
                    type="text" className="form-control"
                    value={googleProfileData.email} disabled
                    style={{ background: 'var(--color-gray-50)', color: 'var(--color-gray-500)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dealership / Business Name *</label>
                  <input
                    type="text" className="form-control" required
                    placeholder="e.g. Acme Auto Group"
                    value={brokerForm.businessName}
                    onChange={e => setBrokerForm({ ...brokerForm, businessName: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">License Number *</label>
                    <input
                      type="text" className="form-control" required
                      placeholder="DL-12345"
                      value={brokerForm.license}
                      onChange={e => setBrokerForm({ ...brokerForm, license: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <select
                      className="form-control" required
                      value={brokerForm.city}
                      onChange={e => setBrokerForm({ ...brokerForm, city: e.target.value })}
                    >
                      <option value="">Select city</option>
                      {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dealer Type *</label>
                  <select
                    className="form-control" required
                    value={brokerForm.dealerType}
                    onChange={e => setBrokerForm({ ...brokerForm, dealerType: e.target.value as any })}
                  >
                    <option value="">Select dealer type</option>
                    <option value="new">New Car Dealer</option>
                    <option value="used">Used Car Dealer</option>
                    <option value="both">Both (New & Used)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      style={{
                        padding: '10px 12px', border: '1px solid var(--color-gray-200)',
                        borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
                        background: '#f8fafc', color: 'var(--color-gray-700)', fontWeight: 600,
                        width: '120px', pointerEvents: 'none'
                      }}
                      tabIndex={-1}
                    >
                      <option>+91 (IN)</option>
                    </select>
                    <input
                      type="tel" className="form-control" required
                      placeholder="Enter your 10-digit mobile number"
                      value={brokerForm.phone}
                      onChange={e => {
                        const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setBrokerForm({ ...brokerForm, phone: cleanVal });
                        setBrokerPhoneVerifiedOtp(null);
                      }}
                      style={{ flex: 1 }}
                    />
                    {brokerForm.phone.length === 10 && (
                      brokerPhoneVerifiedOtp ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                          borderRadius: '10px', color: '#16a34a', fontWeight: 700, fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                        }}>
                          <CheckCircle2 size={15} /> Verified
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowBrokerOtpModal(true)}
                          style={{
                            padding: '8px 16px', background: 'var(--color-primary)',
                            color: '#fff', border: 'none', borderRadius: '10px',
                            fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <Phone size={13} /> Verify
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                  <button
                    type="button" className="btn btn-outline btn-block"
                    onClick={() => { setGoogleProfileData(null); setError(''); }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Complete Registration'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Standard Registration Form */
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <UserPlus size={22} />
                </div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>Create your account</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Join the reverse marketplace</p>
              </div>

              {/* Role Tabs */}
              <div className="tab-group" style={{ marginBottom: '24px' }}>
                <button className={`tab-btn ${role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
                  Buyer
                </button>
                <button className={`tab-btn ${role === 'broker' ? 'active' : ''}`} onClick={() => setRole('broker')}>
                  Broker / Dealer
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {role === 'buyer' ? (
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input type="text" name="name" className="form-control" placeholder="John Doe" value={form.name} onChange={handleChange} required />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Dealership / Business Name *</label>
                      <input type="text" name="businessName" className="form-control" placeholder="ABC Motors" value={form.businessName} onChange={handleChange} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">License Number *</label>
                        <input type="text" name="license" className="form-control" placeholder="DL-12345" value={form.license} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">City *</label>
                        <select name="city" className="form-control" value={form.city} onChange={handleChange} required>
                          <option value="">Select your city</option>
                          {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dealer Type *</label>
                      <select name="dealerType" className="form-control" value={form.dealerType} onChange={handleChange} required>
                        <option value="">Select dealer type</option>
                        <option value="new">New Car Dealer</option>
                        <option value="used">Used Car Dealer</option>
                        <option value="both">Both (New & Used)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      style={{
                        padding: '10px 12px', border: '1px solid var(--color-gray-200)',
                        borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
                        background: '#f8fafc', color: 'var(--color-gray-700)', fontWeight: 600,
                        width: '120px', pointerEvents: 'none'
                      }}
                      tabIndex={-1}
                    >
                      <option>+91 (IN)</option>
                    </select>
                    <input
                      type="tel" name="phone" className="form-control"
                      placeholder="Enter your 10-digit mobile number"
                      value={form.phone}
                      onChange={e => {
                        const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setForm({ ...form, phone: cleanVal });
                        setPhoneVerifiedOtp(null);
                        setError('');
                      }}
                      required
                      style={{ flex: 1 }}
                    />
                    {form.phone.length === 10 && (
                      phoneVerifiedOtp ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                          borderRadius: '10px', color: '#16a34a', fontWeight: 700, fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                        }}>
                          <CheckCircle2 size={15} /> Verified
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowOtpModal(true)}
                          style={{
                            padding: '8px 16px', background: 'var(--color-primary)',
                            color: '#fff', border: 'none', borderRadius: '10px',
                            fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <Phone size={13} /> Verify
                        </button>
                      )
                    )}
                  </div>
                  {!phoneVerifiedOtp && form.phone.length === 10 && (
                    <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
                      ⚠ Mobile verification is required before registration.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" name="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password * <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-400)', fontWeight: 400 }}>(min. 6 characters)</span></label>
                  <input type="password" name="password" className="form-control" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required />
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating Account…</> : 'Create Account'}
                </button>
                {error && (
                  <div style={{
                    marginTop: '12px', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                    fontSize: '0.8125rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <AlertCircle size={15} /> {error}
                  </div>
                )}
              </form>

              {googleClientId && (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '22px 0 16px',
                    color: 'var(--color-gray-400)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }}></div>
                    <span style={{ padding: '0 12px' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '40px' }}>
                    <div id="google-register-btn"></div>
                  </div>
                </>
              )}

              <p style={{
                textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-gray-500)',
                marginTop: '24px',
              }}>
                Already have an account?{' '}
                <Link to="/login" style={{ fontWeight: 600 }}>Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* OTP Modal for standard broker registration */}
      {showOtpModal && (
        <OtpModal
          phone={`+91${form.phone.trim()}`}
          title="Verify Mobile Number"
          subtitle="Enter the 6-digit code sent to your phone to confirm your identity."
          onVerified={(otp) => {
            setPhoneVerifiedOtp(otp);
            setShowOtpModal(false);
            toast.success('Mobile number verified successfully!');
          }}
          onClose={() => setShowOtpModal(false)}
        />
      )}

      {/* OTP Modal for Google broker registration */}
      {showBrokerOtpModal && (
        <OtpModal
          phone={`+91${brokerForm.phone.trim()}`}
          title="Verify Mobile Number"
          subtitle="Enter the 6-digit code sent to your phone to confirm your identity."
          onVerified={(otp) => {
            setBrokerPhoneVerifiedOtp(otp);
            setShowBrokerOtpModal(false);
            toast.success('Mobile number verified successfully!');
          }}
          onClose={() => setShowBrokerOtpModal(false)}
        />
      )}
    </section>
  );
};

export default Register;

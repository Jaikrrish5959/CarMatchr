import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import type { UserRole } from '../contexts/AuthContext';
import { UserPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cities } from '../data/carDatabase';

const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole: UserRole = searchParams.get('role') === 'broker' ? 'broker' : 'buyer';
  const [role, setRole] = useState<UserRole>(initialRole);
  const { register, loginWithGoogle, registerBrokerWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: '', businessName: '', license: '', phone: '', city: '', email: '', password: '' });

  // Google OAuth specific states
  const [googleProfileData, setGoogleProfileData] = useState<{
    email: string;
    name: string;
    credential: string;
  } | null>(null);

  const [brokerForm, setBrokerForm] = useState({
    businessName: '',
    license: '',
    city: '',
    phone: '',
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
      toast.error('Phone number is required.');
      return;
    }
    if (!/^[\d\s\+\-()]{7,15}$/.test(brokerForm.phone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerBrokerWithGoogle({
        email: googleProfileData.email,
        businessName: brokerForm.businessName.trim(),
        license: brokerForm.license.trim(),
        city: brokerForm.city,
        phone: brokerForm.phone.trim(),
        credential: googleProfileData.credential,
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
      if (!form.phone.trim()) return 'Phone number is required for broker accounts.';
    }
    if (!form.email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.password) return 'Please enter a password.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.phone && !/^[\d\s\+\-()]{7,15}$/.test(form.phone)) return 'Please enter a valid phone number.';
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
        id: `${role}-${Date.now()}`,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role,
        status: 'active',
        name: role === 'buyer' ? form.name.trim() : undefined,
        businessName: role === 'broker' ? form.businessName.trim() : undefined,
        phone: form.phone.trim() || undefined,
        license: role === 'broker' ? form.license.trim() : undefined,
        city: form.city || undefined,
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
                      {cities.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel" className="form-control" required
                    placeholder="+91 9876543210"
                    value={brokerForm.phone}
                    onChange={e => setBrokerForm({ ...brokerForm, phone: e.target.value })}
                  />
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
                          {cities.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Phone Number {role === 'broker' ? '*' : ''}</label>
                  <input type="tel" name="phone" className="form-control" placeholder="+91 9876543210" value={form.phone} onChange={handleChange} required={role === 'broker'} />
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
                    fontSize: '0.8125rem', fontWeight: 500,
                  }}>
                    ⚠️ {error}
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
    </section>
  );
};

export default Register;

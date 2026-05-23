import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { cities } from '../data/carDatabase';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [role, setRole] = useState<'buyer' | 'broker' | 'admin'>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const { login, loginWithGoogle, registerBrokerWithGoogle } = useAuth();
  const navigate = useNavigate();

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

        const btnElement = document.getElementById('google-login-btn');
        if (btnElement) {
          (window as any).google.accounts.id.renderButton(
            btnElement,
            {
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
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
        toast.success('Authenticated! Please complete your dealership profile.');
        return;
      }

      if (result.user) {
        toast.success(`Welcome back, ${result.user.name || result.user.email}!`);
        if (!result.user.phone) {
          navigate('/settings');
        } else if (result.user.role === 'broker') {
          navigate('/broker-dashboard');
        } else if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/buyer-dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in.');
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

      toast.success('Broker registration submitted! Account is pending admin approval.', { duration: 5000 });
      navigate('/broker-dashboard');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): string | null => {
    if (!email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
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
      const result = await login(email.trim().toLowerCase(), password, role);
      if (!result.ok || !result.user) {
        const msg = result.error ?? 'Unable to log in. Please try again.';
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Welcome back, ${result.user.name || result.user.email}!`);
      if (!result.user.phone) {
        navigate('/settings');
      } else if (result.user.role === 'broker') {
        navigate('/broker-dashboard');
      } else if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/buyer-dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '440px' }}>
        <div className="card" style={{ padding: '36px' }}>
          {googleProfileData ? (
            /* Google OAuth: Finish Broker Profile Form */
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <LogIn size={22} />
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
            /* Standard Login Form */
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <LogIn size={22} />
                </div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>Welcome back</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Log in to your CarMatchr account</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="tab-group" style={{ marginBottom: '16px' }}>
                  <button type="button" className={`tab-btn ${role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
                    Buyer
                  </button>
                  <button type="button" className={`tab-btn ${role === 'broker' ? 'active' : ''}`} onClick={() => setRole('broker')}>
                    Broker / Dealer
                  </button>
                  <button type="button" className={`tab-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>
                    Admin
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email" className="form-control"
                    value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com" required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password" className="form-control"
                    value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••" required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Logging in…</> : 'Log In'}
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

              {role !== 'admin' && googleClientId && (
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
                    <div id="google-login-btn"></div>
                  </div>
                </>
              )}

              <p style={{
                textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-gray-500)',
                marginTop: '24px',
              }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ fontWeight: 600 }}>Create one</Link>
              </p>

              <div style={{
                marginTop: '20px', padding: '12px 16px',
                background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-200)',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', fontWeight: 600, marginBottom: '4px' }}>
                  DEMO TIP
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
                  Select Buyer or Broker, then log in with that account's email and password, or use Google login above.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as 'buyer' | 'broker' | 'admin') || 'buyer';
  const [role, setRole] = useState<'buyer' | 'broker' | 'admin'>(initialRole);

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'buyer' || r === 'broker' || r === 'admin') {
      setRole(r);
    }
  }, [searchParams]);

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
    state: 'Tamil Nadu',
    city: '',
    phone: '',
    dealerType: 'new' as 'new' | 'used' | 'both',
  });

  const [googleTermsAccepted, setGoogleTermsAccepted] = useState(false);
  const [googleMarketingConsent, setGoogleMarketingConsent] = useState(false);

  const [citiesList, setCitiesList] = useState<{ id: number; name: string; state: string }[]>([]);

  useEffect(() => {
    fetch('/api/locations/cities')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCitiesList(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load cities:', err);
        setCitiesList([
          { id: 1, name: 'Chennai', state: 'Tamil Nadu' },
          { id: 2, name: 'Coimbatore', state: 'Tamil Nadu' },
          { id: 3, name: 'Madurai', state: 'Tamil Nadu' },
          { id: 4, name: 'Tiruchirappalli', state: 'Tamil Nadu' },
          { id: 5, name: 'Salem', state: 'Tamil Nadu' },
          { id: 6, name: 'Thanjavur', state: 'Tamil Nadu' },
          { id: 7, name: 'Vellore', state: 'Tamil Nadu' },
          { id: 8, name: 'Tirunelveli', state: 'Tamil Nadu' },
          { id: 9, name: 'Erode', state: 'Tamil Nadu' },
          { id: 10, name: 'Dindigul', state: 'Tamil Nadu' },
          { id: 11, name: 'Kanchipuram', state: 'Tamil Nadu' },
          { id: 12, name: 'Tiruppur', state: 'Tamil Nadu' },
          { id: 13, name: 'Krishnagiri', state: 'Tamil Nadu' },
          { id: 14, name: 'Dharmapuri', state: 'Tamil Nadu' },
          { id: 15, name: 'Villupuram', state: 'Tamil Nadu' }
        ]);
      });
  }, []);

  const googleAvailableStates = React.useMemo(() => {
    const states = new Set(citiesList.map((c) => c.state));
    if (states.size === 0) states.add('Tamil Nadu');
    return Array.from(states).sort();
  }, [citiesList]);

  const googleFilteredCities = React.useMemo(() => {
    return citiesList.filter((c) => c.state === brokerForm.state);
  }, [citiesList, brokerForm.state]);

  const [loginMode, setLoginMode] = useState<'email' | 'phone' | 'forgot' | 'reset'>('email');
  const [phone, setPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const {
    login,
    verifyLogin,
    loginWithGoogle,
    registerBrokerWithGoogle,
    sendPhoneLoginOtp,
    verifyPhoneLoginOtp,
    forgotPassword,
    resetPassword
  } = useAuth();
  const navigate = useNavigate();

  // Verification flow states
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationRole, setVerificationRole] = useState<'buyer' | 'broker' | 'admin'>('buyer');
  const [otp, setOtp] = useState('');

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
    if (!brokerForm.state) {
      toast.error('Please select your state.');
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

    if (!googleTermsAccepted) {
      toast.error('You must accept the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
       const result = await registerBrokerWithGoogle({
        email: googleProfileData.email,
        businessName: brokerForm.businessName.trim(),
        license: brokerForm.license.trim(),
        city: brokerForm.city,
        state: brokerForm.state,
        phone: brokerForm.phone.trim(),
        credential: googleProfileData.credential,
        dealerType: brokerForm.dealerType,
        termsAccepted: googleTermsAccepted,
        privacyAccepted: googleTermsAccepted,
        marketingConsent: googleMarketingConsent,
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

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Please enter your phone number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await sendPhoneLoginOtp(phone.trim(), role);
      if (!result.ok) {
        setError(result.error || 'Failed to send OTP.');
        toast.error(result.error || 'Failed to send OTP.');
        return;
      }
      setPhoneOtpSent(true);
      toast.success('SMS verification code sent!');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtp.trim() || phoneOtp.length < 6) {
      toast.error('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyPhoneLoginOtp(phone.trim(), role, phoneOtp.trim());
      if (!result.ok || !result.user) {
        setError(result.error || 'Verification failed.');
        toast.error(result.error || 'Verification failed.');
        return;
      }
      toast.success('Welcome back!');
      if (result.user.role === 'broker') {
        navigate('/broker-dashboard');
      } else if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/buyer-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await forgotPassword(resetEmail.trim(), role);
      if (!result.ok) {
        setError(result.error || 'Failed to send reset code.');
        toast.error(result.error || 'Failed to send reset code.');
        return;
      }
      setLoginMode('reset');
      toast.success('Reset code sent to your email!');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp.trim() || resetOtp.length < 6) {
      toast.error('Please enter a valid 6-digit code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await resetPassword(resetEmail.trim(), role, resetOtp.trim(), newPassword);
      if (!result.ok) {
        setError(result.error || 'Failed to reset password.');
        toast.error(result.error || 'Failed to reset password.');
        return;
      }
      setLoginMode('email');
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password reset successful! You can now log in.');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
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
      const normalizedEmail = email.trim().toLowerCase();
      const roleForLogin = normalizedEmail === 'admin@carmatchr.com' ? 'admin' : role;
      const result = await login(normalizedEmail, password, roleForLogin);
      if (!result.ok) {
        const msg = result.error ?? 'Unable to log in. Please try again.';
        setError(msg);
        toast.error(msg);
        return;
      }

      if (result.requiresVerification) {
        setVerificationEmail(result.email || normalizedEmail);
        setVerificationRole(roleForLogin);
        setVerificationPending(true);
        toast.success('Verification code sent to your email!');
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
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 6) {
      toast.error('Please enter a valid 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyLogin(verificationEmail, verificationRole, otp.trim());
      if (!result.ok || !result.user) {
        const msg = result.error ?? 'Verification failed. Please try again.';
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
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '440px' }}>
        <div className="card" style={{ padding: '36px' }}>
          {verificationPending ? (
            /* OTP Verification Form */
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
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>Verify Your Email</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', lineHeight: 1.5 }}>
                  We sent a 6-digit verification code to <br/>
                  <strong style={{ color: 'var(--color-gray-800)' }}>{verificationEmail}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} noValidate>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', textAlign: 'center', marginBottom: '10px' }}>
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control"
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      letterSpacing: '10px',
                      textAlign: 'center',
                      padding: '12px',
                    }}
                    value={otp}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtp(val);
                      setError('');
                    }}
                    placeholder="000000"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '16px' }} disabled={loading}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying…</> : 'Verify & Log In'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  style={{ marginTop: '10px' }}
                  onClick={() => {
                    setVerificationPending(false);
                    setOtp('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  Back to Login
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
            </>
          ) : googleProfileData ? (
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
                    <label className="form-label">Dealer Type *</label>
                    <select
                      className="form-control" required
                      value={brokerForm.dealerType}
                      onChange={e => setBrokerForm({ ...brokerForm, dealerType: e.target.value as any })}
                    >
                      <option value="new">New Car Dealer</option>
                      <option value="used">Used Car Dealer</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <select
                      className="form-control" required
                      value={brokerForm.state}
                      onChange={e => setBrokerForm({ ...brokerForm, state: e.target.value, city: '' })}
                    >
                      {googleAvailableStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <select
                      className="form-control" required
                      disabled={!brokerForm.state}
                      value={brokerForm.city}
                      onChange={e => setBrokerForm({ ...brokerForm, city: e.target.value })}
                      style={{ opacity: brokerForm.state ? 1 : 0.6, cursor: brokerForm.state ? 'pointer' : 'not-allowed' }}
                    >
                      <option value="">Select city</option>
                      {googleFilteredCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px', marginTop: '14px' }}>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-gray-600)' }}>
                    <input
                      type="checkbox"
                      checked={googleTermsAccepted}
                      onChange={e => { setGoogleTermsAccepted(e.target.checked); setError(''); }}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <span>I agree to the <a href="/terms" target="_blank" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Terms of Service</a> & <a href="/privacy" target="_blank" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Privacy Policy</a> *</span>
                  </label>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-gray-600)' }}>
                    <input
                      type="checkbox"
                      checked={googleMarketingConsent}
                      onChange={e => setGoogleMarketingConsent(e.target.checked)}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <span>I consent to receive marketing updates & promotions (optional)</span>
                  </label>
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
            /* Standard Login & Reset Forms */
            <>
              {/* Tab Selector for Login Mode */}
              {loginMode !== 'reset' && (
                <div className="tab-group" style={{ marginBottom: '24px' }}>
                  <button
                    type="button"
                    className={`tab-btn ${loginMode === 'email' ? 'active' : ''}`}
                    onClick={() => { setLoginMode('email'); setError(''); }}
                  >
                    Email Login
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${loginMode === 'phone' ? 'active' : ''}`}
                    onClick={() => { setLoginMode('phone'); setError(''); }}
                  >
                    Phone OTP Login
                  </button>
                </div>
              )}

              {loginMode === 'email' && (
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                        <button
                          type="button"
                          onClick={() => { setLoginMode('forgot'); setError(''); }}
                          style={{
                            background: 'none', border: 'none', padding: 0,
                            color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font)'
                          }}
                        >
                          Forgot Password?
                        </button>
                      </div>
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
                        fontSize: '0.8125rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <AlertCircle size={15} /> {error}
                      </div>
                    )}
                  </form>
                </>
              )}

              {loginMode === 'phone' && (
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
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>Phone OTP Login</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Log in using your registered mobile number</p>
                  </div>

                  <form onSubmit={phoneOtpSent ? handleVerifyPhoneOtp : handleSendPhoneOtp} noValidate>
                    <div className="tab-group" style={{ marginBottom: '16px' }}>
                      <button type="button" className={`tab-btn ${role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
                        Buyer
                      </button>
                      <button type="button" className={`tab-btn ${role === 'broker' ? 'active' : ''}`} onClick={() => setRole('broker')}>
                        Broker / Dealer
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel" className="form-control"
                        value={phone} onChange={e => { setPhone(e.target.value); setError(''); }}
                        placeholder="+91 9876543210" required
                        disabled={phoneOtpSent}
                        style={phoneOtpSent ? { background: '#f5f5f5', color: '#888', cursor: 'not-allowed' } : {}}
                      />
                    </div>

                    {phoneOtpSent && (
                      <div className="form-group">
                        <label className="form-label">Enter 6-Digit OTP Code</label>
                        <input
                          type="text" maxLength={6} className="form-control"
                          value={phoneOtp} onChange={e => { setPhoneOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                          placeholder="000000" required
                          style={{
                            fontSize: '1.25rem', letterSpacing: '6px', textAlign: 'center'
                          }}
                        />
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
                      {loading ? (
                        <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading…</>
                      ) : phoneOtpSent ? (
                        'Verify & Log In'
                      ) : (
                        'Send OTP'
                      )}
                    </button>

                    {phoneOtpSent && (
                      <button
                        type="button"
                        className="btn btn-outline btn-block"
                        style={{ marginTop: '10px' }}
                        onClick={() => { setPhoneOtpSent(false); setPhoneOtp(''); setError(''); }}
                        disabled={loading}
                      >
                        Change Phone Number
                      </button>
                    )}

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
                </>
              )}

              {loginMode === 'forgot' && (
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
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>Forgot Password</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Enter your email to receive a password reset code</p>
                  </div>

                  <form onSubmit={handleForgotPasswordSubmit} noValidate>
                    <div className="tab-group" style={{ marginBottom: '16px' }}>
                      <button type="button" className={`tab-btn ${role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
                        Buyer
                      </button>
                      <button type="button" className={`tab-btn ${role === 'broker' ? 'active' : ''}`} onClick={() => setRole('broker')}>
                        Broker / Dealer
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email" className="form-control"
                        value={resetEmail} onChange={e => { setResetEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com" required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
                      {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending Code…</> : 'Send Reset Code'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-block"
                      style={{ marginTop: '10px' }}
                      onClick={() => { setLoginMode('email'); setError(''); }}
                      disabled={loading}
                    >
                      Back to Login
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
                </>
              )}

              {loginMode === 'reset' && (
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
                    <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>Reset Password</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Enter the code sent to your email and set your new password</p>
                  </div>

                  <form onSubmit={handleResetPasswordSubmit} noValidate>
                    <div className="form-group">
                      <label className="form-label">Reset Code</label>
                      <input
                        type="text" maxLength={6} className="form-control"
                        value={resetOtp} onChange={e => { setResetOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                        placeholder="000000" required
                        style={{
                          fontSize: '1.25rem', letterSpacing: '6px', textAlign: 'center'
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type="password" className="form-control"
                        value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(''); }}
                        placeholder="Min 6 characters" required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password" className="form-control"
                        value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                        placeholder="••••••••" required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
                      {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Resetting…</> : 'Reset Password'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-block"
                      style={{ marginTop: '10px' }}
                      onClick={() => { setLoginMode('forgot'); setError(''); }}
                      disabled={loading}
                    >
                      Back
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
                </>
              )}

              {loginMode !== 'forgot' && loginMode !== 'reset' && role !== 'admin' && googleClientId && (
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

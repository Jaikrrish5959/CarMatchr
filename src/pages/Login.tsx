import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [role, setRole] = useState<'buyer' | 'broker' | 'admin'>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      if (result.user.role === 'broker') navigate('/broker-dashboard');
      else if (result.user.role === 'admin') navigate('/admin');
      else navigate('/buyer-dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '440px' }}>
        <div className="card" style={{ padding: '36px' }}>
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
              Select Buyer or Broker, then log in with that account's email and password.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;

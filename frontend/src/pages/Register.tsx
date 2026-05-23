import React, { useState } from 'react';
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
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: '', businessName: '', license: '', phone: '', city: '', email: '', password: '' });

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
        status: role === 'broker' ? 'pending' : 'active',
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
        toast.success('Account created! Your broker account is pending admin approval.', { duration: 5000 });
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
                      {cities.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}, {c.state}</option>)}
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

          <p style={{
            textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-gray-500)',
            marginTop: '24px',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Log in</Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Register;

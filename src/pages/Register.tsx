import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import type { UserRole } from '../contexts/AuthContext';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { cities } from '../data/carDatabase';

const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole: UserRole = searchParams.get('role') === 'broker' ? 'broker' : 'buyer';
  const [role, setRole] = useState<UserRole>(initialRole);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', businessName: '', license: '', phone: '', city: '', email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await register({
      id: `${role}-${Date.now()}`,
      email: form.email,
      password: form.password,
      role,
      status: role === 'broker' ? 'pending' : 'active',
      name: role === 'buyer' ? form.name : undefined,
      businessName: role === 'broker' ? form.businessName : undefined,
      phone: form.phone || undefined,
      license: role === 'broker' ? form.license : undefined,
      city: form.city || undefined,
    });
    if (!result.ok) {
      const message = result.error ?? 'Unable to create account.';
      setError(message);
      toast.error(message);
      return;
    }
    setError('');
    navigate(role === 'buyer' ? '/buyer-dashboard' : '/broker-dashboard');
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

          <form onSubmit={handleSubmit}>
            {role === 'buyer' ? (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" name="name" className="form-control" placeholder="John Doe" onChange={handleChange} required />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Dealership / Business Name</label>
                  <input type="text" name="businessName" className="form-control" placeholder="ABC Motors" onChange={handleChange} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">License Number</label>
                    <input type="text" name="license" className="form-control" placeholder="DL-12345" onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <select name="city" className="form-control" value={form.city} onChange={handleChange} required>
                      <option value="">Select your city</option>
                      {cities.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}, {c.state}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" className="form-control" placeholder="+91 9876543210" onChange={handleChange} required={role === 'broker'} />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-control" placeholder="you@example.com" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-control" placeholder="Min. 8 characters" onChange={handleChange} required />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }}>
              Create Account
            </button>
            {error && (
              <p style={{ marginTop: '10px', color: 'var(--color-primary)', fontSize: '0.8125rem' }}>
                {error}
              </p>
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

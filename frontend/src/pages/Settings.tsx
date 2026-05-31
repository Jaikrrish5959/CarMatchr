import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Phone, User, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    phone: user?.phone ?? '',
    name: user?.name ?? user?.businessName ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const validate = (): string | null => {
    if (form.phone && !/^[\d\s\+\-()\u00a0]{7,15}$/.test(form.phone)) {
      return 'Please enter a valid phone number.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setLoading(true);
    try {
      // Persist to backend
      const token = localStorage.getItem('carmatchr_token');
      const res = await fetch(`/api/users/${user!.id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phone: form.phone.trim() || null,
          name: form.name.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Could not save settings.');
        return;
      }

      // Update local context
      updateUser({
        phone: form.phone.trim() || undefined,
        ...(user?.role === 'buyer' ? { name: form.name.trim() || undefined } : { businessName: form.name.trim() || undefined }),
      });

      setSaved(true);
      toast.success('Settings saved!');

      // After saving, redirect to the appropriate dashboard
      setTimeout(() => {
        if (user?.role === 'broker') navigate('/broker-dashboard');
        else if (user?.role === 'admin') navigate('/admin');
        else navigate('/buyer-dashboard');
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (user?.role === 'broker') navigate('/broker-dashboard');
    else if (user?.role === 'admin') navigate('/admin');
    else navigate('/buyer-dashboard');
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '480px' }}>
        <div className="card" style={{ padding: '36px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary-light)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <SettingsIcon size={24} />
            </div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>
              Complete your profile
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              Add a phone number so brokers can reach you — takes 10 seconds!
            </p>
          </div>

          {/* Logged-in as banner */}
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)',
              marginBottom: '24px',
            }}>
              <User size={16} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)' }}>
                Logged in as <strong>{user.email}</strong>{' '}
                <span style={{
                  display: 'inline-block', padding: '1px 8px', borderRadius: '999px',
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                }}>
                  {user.role}
                </span>
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Display name */}
            <div className="form-group">
              <label className="form-label">
                {user?.role === 'buyer' ? 'Full Name' : 'Business Name'}
              </label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder={user?.role === 'buyer' ? 'John Doe' : 'ABC Motors'}
                value={form.name}
                onChange={handleChange}
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                className="form-control"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={handleChange}
                autoFocus
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                Used so brokers can contact you directly about listings.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '8px' }}
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                : saved
                  ? <><CheckCircle size={16} /> Saved — redirecting…</>
                  : 'Save & Continue'
              }
            </button>
          </form>

          <button
            onClick={handleSkip}
            style={{
              display: 'block', width: '100%', marginTop: '12px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', color: 'var(--color-gray-400)',
              textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
          >
            Skip for now →
          </button>
        </div>
      </div>
    </section>
  );
};

export default Settings;

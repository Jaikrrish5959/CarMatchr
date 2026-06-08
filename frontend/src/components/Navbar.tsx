import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, LogOut, User as UserIcon, Globe, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLanguage } from '../hooks/useLanguage';
import { languageNames, type Language } from '../data/carDatabase';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { requirements, offers } = useData();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [showLang, setShowLang] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); navigate('/', { replace: true }); setMobileOpen(false); };

  // Close language dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Shared nav action items (reused in desktop & mobile)
  const unreadCount = offers.filter(
    o => !o.isRead && requirements.find(r => r.id === o.requirementId)?.buyerId === user?.id
  ).length;

  const langPicker = (
    <div ref={langRef} style={{ position: 'relative' }}>
      <button onClick={() => setShowLang(!showLang)} className="btn btn-ghost btn-sm"
        style={{ gap: '4px', fontSize: '0.8125rem' }} title="Change language">
        <Globe size={15} />
        <span style={{ fontSize: '0.75rem' }}>{languageNames[lang].slice(0, 3)}</span>
      </button>
      {showLang && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: '#fff', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-gray-200)',
          minWidth: '140px', zIndex: 200, overflow: 'hidden',
        }}>
          {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
            <button key={code} onClick={() => { setLang(code); setShowLang(false); }}
              style={{
                display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                background: lang === code ? 'var(--color-primary-light)' : '#fff',
                color: lang === code ? 'var(--color-primary)' : 'var(--color-gray-700)',
                fontWeight: lang === code ? 700 : 500, fontSize: '0.8125rem',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (lang !== code) e.currentTarget.style.background = 'var(--color-gray-50)'; }}
              onMouseLeave={e => { if (lang !== code) e.currentTarget.style.background = '#fff'; }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <nav className="navbar">
      <div className="container">
        {/* ── Top bar ── */}
        <div className="navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link to="/" className="navbar-brand" style={{ marginRight: 0 }}>
              <Car size={24} strokeWidth={2.5} />
              CarMatchr
            </Link>
            {/* Marketplace link hidden on very small screens — shown in mobile menu */}
            <Link to="/marketplace" style={{
              fontSize: '0.875rem', fontWeight: 700,
              color: 'var(--color-gray-600)', textDecoration: 'none', transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-gray-600)'}>
              Marketplace
            </Link>
          </div>

          {/* Desktop actions */}
          <div className="navbar-actions">
            {langPicker}
            {user ? (
              <>
                {user.role === 'buyer' && (
                  <div style={{ position: 'relative', marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                    <Bell size={18} color="var(--color-gray-500)" />
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        background: 'var(--color-primary)', color: '#fff',
                        fontSize: '0.625rem', fontWeight: 800, width: '16px', height: '16px',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{unreadCount}</span>
                    )}
                  </div>
                )}
                <div className="navbar-user">
                  <UserIcon size={14} color="var(--color-gray-500)" />
                  <span className="navbar-user-name">{user.name || user.businessName}</span>
                  <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-pending'}`}>{user.status}</span>
                </div>
                <Link to={user.role === 'buyer' ? '/buyer-dashboard' : user.role === 'broker' ? '/broker-dashboard' : '/admin'} className="btn btn-primary btn-sm">
                  {t('dashboard')}
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                  <LogOut size={14} /> {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">{t('login')}</Link>
                <Link to="/register" className="btn btn-primary btn-sm">{t('getStarted')}</Link>
              </>
            )}
          </div>

          {/* Hamburger — visible only on mobile (CSS: display:none by default, flex on ≤640px) */}
          <button
            className="hamburger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {mobileOpen && (
          <div className="navbar-mobile-menu open">
            <Link to="/marketplace" className="btn btn-ghost" onClick={() => setMobileOpen(false)}>Marketplace</Link>
            {user ? (
              <>
                <Link
                  to={user.role === 'buyer' ? '/buyer-dashboard' : user.role === 'broker' ? '/broker-dashboard' : '/admin'}
                  className="btn btn-primary btn-block"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('dashboard')}
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-block">
                  <LogOut size={14} /> {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-block" onClick={() => setMobileOpen(false)}>{t('login')}</Link>
                <Link to="/register" className="btn btn-primary btn-block" onClick={() => setMobileOpen(false)}>{t('getStarted')}</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

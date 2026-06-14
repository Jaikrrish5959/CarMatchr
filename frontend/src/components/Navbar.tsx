import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, LogOut, User as UserIcon, Globe, MapPin, Bell, Menu, X } from 'lucide-react';
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
  const [showLoc, setShowLoc] = useState(false);
  const [loc, setLoc] = useState('India');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const locRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); navigate('/', { replace: true }); setMobileOpen(false); };

  // Scroll-aware glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
      if (locRef.current && !locRef.current.contains(e.target as Node)) setShowLoc(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Shared nav action items (reused in desktop & mobile)
  const unreadCount = offers.filter(
    o => !o.isRead && requirements.find(r => r.id === o.requirementId)?.buyerId === user?.id
  ).length;

  const locations = [
    'India',
    'Tamil Nadu',
    'Karnataka',
    'Maharashtra',
    'Delhi NCR',
    'Telangana',
    'Gujarat',
    'Kerala'
  ];

  const locPicker = (
    <div ref={locRef} style={{ position: 'relative' }}>
      <button onClick={() => setShowLoc(!showLoc)} className="btn btn-ghost btn-sm"
        style={{
          gap: '6px', fontSize: '0.8125rem',
          color: 'var(--color-gray-700)',
          display: 'flex', alignItems: 'center'
        }} title="Select location">
        <MapPin size={15} color="var(--color-primary)" />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{loc}</span>
      </button>
      {showLoc && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          minWidth: '140px', zIndex: 200, overflow: 'hidden',
        }}>
          {locations.map((name) => (
            <button key={name} onClick={() => { setLoc(name); setShowLoc(false); }}
              style={{
                display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                background: loc === name ? 'rgba(230,57,70,0.08)' : 'transparent',
                color: loc === name ? 'var(--color-primary)' : 'var(--color-gray-700)',
                fontWeight: loc === name ? 700 : 500, fontSize: '0.8125rem',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (loc !== name) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }}
              onMouseLeave={e => { if (loc !== name) e.currentTarget.style.background = 'transparent'; }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const langPicker = (
    <div ref={langRef} style={{ position: 'relative' }}>
      <button onClick={() => setShowLang(!showLang)} className="btn btn-ghost btn-sm"
        style={{
          gap: '4px', fontSize: '0.8125rem',
          color: 'var(--color-gray-700)',
        }} title="Change language">
        <Globe size={15} />
        <span style={{ fontSize: '0.75rem' }}>{languageNames[lang].slice(0, 3)}</span>
      </button>
      {showLang && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          minWidth: '140px', zIndex: 200, overflow: 'hidden',
        }}>
          {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
            <button key={code} onClick={() => { setLang(code); setShowLang(false); }}
              style={{
                display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                background: lang === code ? 'rgba(230,57,70,0.08)' : 'transparent',
                color: lang === code ? 'var(--color-primary)' : 'var(--color-gray-700)',
                fontWeight: lang === code ? 700 : 500, fontSize: '0.8125rem',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (lang !== code) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }}
              onMouseLeave={e => { if (lang !== code) e.currentTarget.style.background = 'transparent'; }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <nav ref={navRef} className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="container">
        {/* ── Top bar ── */}
        <div className="navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link to="/" className="navbar-brand" style={{ marginRight: 0 }}>
              <Car size={24} strokeWidth={2.5} />
              CarMatchr
            </Link>
            <div style={{ display: 'flex', gap: '16px' }} className="desktop-links">
              <Link to="/dealers/new" style={{ color: 'var(--color-gray-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-gray-700)'}>
                New Car Dealers
              </Link>
              <Link to="/dealers/used" style={{ color: 'var(--color-gray-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-gray-700)'}>
                Used Car Dealers
              </Link>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="navbar-actions">
            {locPicker}
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
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-gray-700)' }}>
                  <LogOut size={14} /> {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-gray-700)' }}>{t('login')}</Link>
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
            <Link to="/dealers/new" style={{ padding: '12px 16px', color: 'var(--color-gray-700)', textDecoration: 'none', fontWeight: 600 }} onClick={() => setMobileOpen(false)}>New Car Dealers</Link>
            <Link to="/dealers/used" style={{ padding: '12px 16px', color: 'var(--color-gray-700)', textDecoration: 'none', fontWeight: 600 }} onClick={() => setMobileOpen(false)}>Used Car Dealers</Link>
            
            {/* Mobile Location Selector */}
            <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(15, 23, 42, 0.04)' }}>
              <MapPin size={15} color="var(--color-primary)" />
              <select
                value={loc}
                onChange={e => setLoc(e.target.value)}
                style={{
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-gray-700)',
                  outline: 'none',
                  flex: 1,
                  fontFamily: 'var(--font)',
                }}
              >
                {locations.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <hr style={{ margin: '8px 0', borderColor: 'rgba(15, 23, 42, 0.08)' }} />
            {user ? (
              <>
                <Link
                  to={user.role === 'buyer' ? '/buyer-dashboard' : user.role === 'broker' ? '/broker-dashboard' : '/admin'}
                  className="btn btn-primary btn-block"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('dashboard')}
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-block" style={{ color: 'var(--color-gray-700)' }}>
                  <LogOut size={14} /> {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-block" style={{ color: 'var(--color-gray-700)' }} onClick={() => setMobileOpen(false)}>{t('login')}</Link>
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

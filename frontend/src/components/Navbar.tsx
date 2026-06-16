import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Globe, MapPin, Bell, Menu, X, ChevronDown } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLanguage } from '../hooks/useLanguage';
import { languageNames, type Language } from '../data/carDatabase';
import { useLocation, TN_DISTRICTS, type LocationSelection } from '../contexts/LocationContext';

// ─── Self-contained Location Picker Component ─────────────────────────────────
// Must be a proper component (not a JSX variable) so each instance gets its own
// ref. Using a JSX variable rendered twice causes the ref to point only to the
// last DOM node, breaking the outside-click detection for the first instance.
const LocationPicker: React.FC = () => {
  const { location: loc, setLocation: setLoc } = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = TN_DISTRICTS.filter(d =>
    d.toLowerCase().includes(search.toLowerCase())
  );

  const select = (name: LocationSelection) => {
    setLoc(name);
    setOpen(false);
    setSearch('');
  };

  const showTN = !search || 'Tamil Nadu'.toLowerCase().includes(search.toLowerCase());

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn btn-ghost btn-sm"
        style={{
          gap: '5px',
          fontSize: '0.8125rem',
          color: 'var(--color-gray-700)',
          display: 'flex',
          alignItems: 'center',
          border: open ? '1px solid rgba(229,57,53,0.3)' : '1px solid transparent',
          borderRadius: '8px',
          padding: '5px 10px',
          background: open ? 'rgba(229,57,53,0.04)' : 'transparent',
          transition: 'all 0.15s',
        }}
        title="Filter by Tamil Nadu district"
      >
        <MapPin size={14} color="#E53935" />
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          maxWidth: '90px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {loc}
        </span>
        <ChevronDown
          size={12}
          style={{
            opacity: 0.5,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(15,23,42,0.13)',
          border: '1px solid rgba(15,23,42,0.08)',
          width: '220px',
          zIndex: 300,
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              type="text"
              placeholder="Search district…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '6px 10px',
                fontSize: '0.8125rem',
                border: '1px solid #e2e8f0',
                borderRadius: '7px',
                fontFamily: 'var(--font)',
                outline: 'none',
                color: '#333',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#E53935')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {/* Tamil Nadu (All) — pinned */}
            {showTN && (
              <button
                type="button"
                onClick={() => select('Tamil Nadu')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '10px 14px', border: 'none',
                  background: loc === 'Tamil Nadu' ? 'rgba(229,57,53,0.08)' : 'transparent',
                  color: loc === 'Tamil Nadu' ? '#E53935' : '#1A1A1A',
                  fontWeight: loc === 'Tamil Nadu' ? 800 : 700,
                  fontSize: '0.8125rem', textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'var(--font)', transition: 'background 0.1s',
                  borderBottom: '1px solid #f5f5f5',
                }}
                onMouseEnter={e => { if (loc !== 'Tamil Nadu') e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                onMouseLeave={e => { if (loc !== 'Tamil Nadu') e.currentTarget.style.background = 'transparent'; }}
              >
                <MapPin size={13} color="#E53935" />
                Tamil Nadu
                <span style={{ marginLeft: 'auto', fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500 }}>
                  {loc === 'Tamil Nadu' ? '✓ All' : 'All Districts'}
                </span>
              </button>
            )}

            {/* Section header */}
            {filtered.length > 0 && (
              <div style={{
                padding: '6px 14px 4px',
                fontSize: '0.625rem', fontWeight: 800,
                color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                Districts
              </div>
            )}

            {/* District list */}
            {filtered.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => select(name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '8px 14px', border: 'none',
                  background: loc === name ? 'rgba(229,57,53,0.08)' : 'transparent',
                  color: loc === name ? '#E53935' : '#374151',
                  fontWeight: loc === name ? 700 : 400,
                  fontSize: '0.8125rem', textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'var(--font)', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (loc !== name) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                onMouseLeave={e => { if (loc !== name) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: loc === name ? '#E53935' : '#cbd5e1',
                  flexShrink: 0,
                }} />
                {name}
                {loc === name && (
                  <span style={{ marginLeft: 'auto', color: '#E53935', fontSize: '0.75rem' }}>✓</span>
                )}
              </button>
            ))}

            {filtered.length === 0 && search && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8' }}>
                No districts match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Navbar ──────────────────────────────────────────────────────────────
const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { requirements, offers } = useData();
  const { lang, setLang, t } = useLanguage();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showLang, setShowLang] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); navigate('/', { replace: true }); setMobileOpen(false); };

  // Scroll-aware glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Legacy calculation no longer needed - using NotificationContext
  void requirements; void offers;

  const langPicker = (
    <div ref={langRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowLang(!showLang)}
        className="btn btn-ghost btn-sm"
        style={{ gap: '4px', fontSize: '0.8125rem', color: 'var(--color-gray-700)' }}
        title="Change language"
      >
        <Globe size={15} />
        <span style={{ fontSize: '0.75rem' }}>{languageNames[lang].slice(0, 3)}</span>
      </button>
      {showLang && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(15,23,42,0.08)',
          border: '1px solid rgba(15,23,42,0.08)',
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
              onMouseEnter={e => { if (lang !== code) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
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
            <Link to="/" className="navbar-brand" style={{ marginRight: 0, gap: '10px' }}>
              <img src="/logo.png" alt="CarMatchr" className="navbar-logo" style={{ height: '75px', width: 'auto', display: 'block', margin: '-24px 0' }} />
              <span>
                <span style={{ color: '#000000' }}>Car</span><span>Matchr</span>
              </span>
            </Link>
            <div style={{ display: 'flex', gap: '16px' }} className="desktop-links">
              <Link to="/dealers/new"
                style={{ color: 'var(--color-gray-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-gray-700)'}>
                New Car Dealers
              </Link>
              <Link to="/dealers/used"
                style={{ color: 'var(--color-gray-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-gray-700)'}>
                Used Car Dealers
              </Link>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="navbar-actions">
            <LocationPicker />
            {langPicker}
            {user ? (
              <>
                {(user.role === 'buyer' || user.role === 'broker') && (
                  <div ref={notifRef} style={{ position: 'relative', marginRight: '4px' }}>
                    <button
                      onClick={() => setShowNotif(v => !v)}
                      style={{
                        background: showNotif ? 'var(--color-primary-light)' : 'transparent',
                        border: showNotif ? '1px solid rgba(230,57,70,0.2)' : '1px solid transparent',
                        borderRadius: '10px', padding: '6px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', position: 'relative',
                        transition: 'all 0.15s',
                      }}
                      title="Notifications"
                    >
                      <Bell size={18} color={showNotif ? 'var(--color-primary)' : 'var(--color-gray-500)'} />
                      {unreadCount > 0 && (
                        <span style={{
                          position: 'absolute', top: '2px', right: '2px',
                          background: 'var(--color-primary)', color: '#fff',
                          fontSize: '0.5625rem', fontWeight: 800, minWidth: '16px', height: '16px',
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1, padding: '0 3px',
                        }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                      )}
                    </button>
                    {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} />}
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

          {/* Mobile: Dashboard quick-access in top bar */}
          {user && (
            <Link
              to={user.role === 'buyer' ? '/buyer-dashboard' : user.role === 'broker' ? '/broker-dashboard' : '/admin'}
              className="mobile-dash-btn"
            >
              Dashboard
            </Link>
          )}

          {/* Hamburger */}
          <button
            className="hamburger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ── Mobile compact floating menu ── */}
        {mobileOpen && (
          <>
            <div className="mobile-menu-backdrop" onClick={() => setMobileOpen(false)} />
            <div className="mobile-menu-card">
              {/* Location + Language */}
              <div className="mobile-menu-toprow">
                <LocationPicker />
                {langPicker}
              </div>

              {/* Nav links */}
              <div className="mobile-menu-links">
                <Link to="/dealers/new" className="mobile-menu-link" onClick={() => setMobileOpen(false)}>
                  New Car Dealers
                </Link>
                <Link to="/dealers/used" className="mobile-menu-link" onClick={() => setMobileOpen(false)}>
                  Used Car Dealers
                </Link>
              </div>

              {/* Auth footer */}
              <div className="mobile-menu-auth">
                {user ? (
                  <button onClick={handleLogout} className="mobile-menu-logout">
                    <LogOut size={13} /> {t('logout')}
                  </button>
                ) : (
                  <>
                    <Link to="/login" className="mobile-menu-logout" style={{ textDecoration: 'none', justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
                      {t('login')}
                    </Link>
                    <Link to="/register" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }} onClick={() => setMobileOpen(false)}>
                      {t('getStarted')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

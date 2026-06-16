import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Globe, MapPin, Bell, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLanguage } from '../hooks/useLanguage';
import { languageNames, type Language } from '../data/carDatabase';
import { useLocation, TN_DISTRICTS, type LocationSelection } from '../contexts/LocationContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { requirements, offers } = useData();
  const { lang, setLang, t } = useLanguage();
  const { location: loc, setLocation: setLoc } = useLocation();
  const navigate = useNavigate();
  const [showLang, setShowLang] = useState(false);
  const [showLoc, setShowLoc] = useState(false);
  const [locSearch, setLocSearch] = useState('');
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

  const filteredDistricts = TN_DISTRICTS.filter(d =>
    d.toLowerCase().includes(locSearch.toLowerCase())
  );

  const handleSelectLoc = (name: LocationSelection) => {
    setLoc(name);
    setShowLoc(false);
    setLocSearch('');
  };

  const locPicker = (
    <div ref={locRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowLoc(!showLoc)}
        className="btn btn-ghost btn-sm"
        style={{
          gap: '5px', fontSize: '0.8125rem',
          color: 'var(--color-gray-700)',
          display: 'flex', alignItems: 'center',
          border: showLoc ? '1px solid rgba(229,57,53,0.3)' : '1px solid transparent',
          borderRadius: '8px', padding: '5px 10px',
          background: showLoc ? 'rgba(229,57,53,0.04)' : 'transparent',
          transition: 'all 0.15s',
        }}
        title="Filter by location"
      >
        <MapPin size={14} color="#E53935" />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loc}
        </span>
        <ChevronDown size={12} style={{ opacity: 0.5, transition: 'transform 0.2s', transform: showLoc ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {showLoc && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '12px',
          boxShadow: '0 12px 40px rgba(15,23,42,0.13)',
          border: '1px solid rgba(15,23,42,0.08)',
          width: '220px', zIndex: 300, overflow: 'hidden',
        }}>
          {/* Search box */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              type="text"
              placeholder="Search district…"
              value={locSearch}
              onChange={e => setLocSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.8125rem',
                border: '1px solid #e2e8f0', borderRadius: '7px',
                fontFamily: 'var(--font)', outline: 'none', color: '#333',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#E53935')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {/* Scrollable list */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {/* Tamil Nadu (All) — pinned */}
            {(!locSearch || 'Tamil Nadu'.toLowerCase().includes(locSearch.toLowerCase())) && (
              <button
                onClick={() => handleSelectLoc('Tamil Nadu')}
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
                Tamil Nadu{loc === 'Tamil Nadu' && ' ✓'}
                <span style={{ marginLeft: 'auto', fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500 }}>All Districts</span>
              </button>
            )}

            {/* Districts header */}
            {filteredDistricts.length > 0 && (
              <div style={{
                padding: '6px 14px 4px',
                fontSize: '0.625rem', fontWeight: 800, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                Districts
              </div>
            )}

            {filteredDistricts.map(name => (
              <button
                key={name}
                onClick={() => handleSelectLoc(name)}
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
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: loc === name ? '#E53935' : '#cbd5e1', flexShrink: 0 }} />
                {name}
                {loc === name && <span style={{ marginLeft: 'auto', color: '#E53935' }}>✓</span>}
              </button>
            ))}

            {filteredDistricts.length === 0 && locSearch && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8' }}>
                No districts match
              </div>
            )}
          </div>
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
            <Link to="/" className="navbar-brand" style={{ marginRight: 0, gap: '10px' }}>
              <img src="/logo.png" alt="CarMatchr" style={{ height: '75px', width: 'auto', display: 'block', margin: '-24px 0' }} />
              <span>
                <span style={{ color: '#000000' }}>Car</span><span>Matchr</span>
              </span>
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

          {/* Mobile Header Actions (visible on <= 640px) */}
          <div className="mobile-header-actions">
            {locPicker}
            {langPicker}
            {!user && (
              <Link to="/login" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-gray-700)', padding: '6px 12px', fontSize: '0.8125rem' }}>
                {t('login')}
              </Link>
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
            <hr style={{ margin: '8px 0', borderColor: 'rgba(15, 23, 42, 0.08)' }} />
            {user ? (
              <>
                {/* User Profile Info Card inside dropdown */}
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.03)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>Logged in as</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{user.name || user.businessName}</div>
                  <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-pending'}`} style={{ alignSelf: 'flex-start', marginTop: '4px' }}>{user.status}</span>
                </div>
                <Link
                  to={user.role === 'buyer' ? '/buyer-dashboard' : user.role === 'broker' ? '/broker-dashboard' : '/admin'}
                  className="btn btn-primary btn-block"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('dashboard')}
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-block" style={{ color: 'var(--color-gray-700)', marginTop: '8px' }}>
                  <LogOut size={14} /> {t('logout')}
                </button>
              </>
            ) : (
              <>
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

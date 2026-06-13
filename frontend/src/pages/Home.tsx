import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Award, ArrowRight, Star,
  MapPin, Fuel,
  Shield, Clock, BadgeDollarSign, Lock, Send,
  Car, Wrench, Cpu, Settings, Users, ClipboardList, Leaf,
  Building2, BadgeCheck, Phone,
  Trophy, TrendingUp, Activity, ChevronRight, ChevronLeft, ExternalLink, Flame,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLanguage } from '../hooks/useLanguage';
import { useCatalog } from '../hooks/useCatalog';
import { tamilNaduDealers } from '../data/tamilNaduDealers';
import toast from 'react-hot-toast';

const TOTAL_FRAMES = 240;
const FRAME_PATH = (n: number) => `/frames/frame_${String(n).padStart(4, '0')}.jpg`;

// Preloads all frames and returns a ref-stable array
function useVideoFrames() {
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let count = 0;
    const imgs: HTMLImageElement[] = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = () => { count++; setLoaded(count); };
      img.onerror = () => { count++; setLoaded(count); };
      imgs.push(img);
    }
    framesRef.current = imgs;
  }, []);

  return { frames: framesRef, loaded };
}

// Scroll-synced canvas hero component
const VideoScrollCanvas: React.FC<{ frames: React.MutableRefObject<HTMLImageElement[]>; loaded: number }> = ({ frames, loaded }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const currentFrameRef = useRef(0);

  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = frames.current[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Cover fill
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const ox = (cw - sw) / 2;
    const oy = (ch - sh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, ox, oy, sw, sh);
  }, [frames]);

  useEffect(() => {
    const container = document.getElementById('scroll-hero-container');
    if (!container) return;

    const onScroll = () => {
      const canvas = canvasRef.current;
      const rect = container.getBoundingClientRect();
      const containerHeight = container.offsetHeight;
      const viewportHeight = window.innerHeight;
      // Scroll progress: 0 when top of container is at top, 1 when bottom reaches top
      const scrolled = -rect.top;
      const scrollable = containerHeight - viewportHeight;
      const progress = Math.min(1, Math.max(0, scrolled / scrollable));
      const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * (TOTAL_FRAMES - 1)));

      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => draw(frameIndex));
      }

      if (canvas) {
        const fadeStart = 0.8;
        if (progress > fadeStart) {
          canvas.style.opacity = String((1 - progress) / (1 - fadeStart));
        } else {
          canvas.style.opacity = '1';
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // draw initial frame
    return () => window.removeEventListener('scroll', onScroll);
  }, [draw, loaded]);

  // Resize canvas to fill viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw(currentFrameRef.current);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  // Redraw when frames finish loading
  useEffect(() => {
    draw(currentFrameRef.current);
  }, [loaded, draw]);

  const pct = Math.round((loaded / TOTAL_FRAMES) * 100);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          display: 'block',
          zIndex: 0,
        }}
      />
      {loaded < TOTAL_FRAMES && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
          color: '#fff', padding: '8px 20px', borderRadius: '20px',
          fontSize: '0.8rem', fontWeight: 700, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#e63946', borderRadius: '2px', transition: 'width 0.1s' }} />
          </div>
          Loading {pct}%
        </div>
      )}
    </>
  );
};

const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const;
const TRANSMISSION_TYPES = ['Manual', 'Automatic', 'Any'] as const;

const FUEL_ICONS: Record<string, React.ReactNode> = {
  Petrol: <Fuel size={14} />, Diesel: <Fuel size={14} />, Hybrid: <Leaf size={14} />, Electric: <Zap size={14} />,
};
const TRANS_ICONS: Record<string, React.ReactNode> = {
  Manual: <Wrench size={14} />, Automatic: <Cpu size={14} />, Any: <Settings size={14} />,
};

// ── Static data for right-panel widgets ─────────────────────────────────────
const TOP_DEALERS = [
  { rank: 1, name: 'Tata Motors Trichy', avgResponse: '6 min', rating: 4.8, color: '#0d9488' },
  { rank: 2, name: 'Sree Hyundai', avgResponse: '8 min', rating: 4.7, color: '#1e3a8a' },
  { rank: 3, name: 'VST Motors Cuddalore', avgResponse: '9 min', rating: 4.7, color: '#7c3aed' },
];

const MOST_REQUESTED = [
  { rank: 1, model: 'Hyundai Creta', count: 482 },
  { rank: 2, model: 'Tata Nexon', count: 391 },
  { rank: 3, model: 'Mahindra XUV700', count: 318 },
  { rank: 4, model: 'Maruti Brezza', count: 271 },
];

const LIVE_FEED_INITIAL = [
  { id: 1, type: 'offer', actor: 'Dealer from Chennai', action: 'submitted an offer', time: '2 mins ago', color: '#0d9488' },
  { id: 2, type: 'quote', actor: 'Buyer from Coimbatore', action: 'received 9 quotes', time: '4 mins ago', color: '#7c3aed' },
  { id: 3, type: 'offer', actor: 'Dealer from Madurai', action: 'submitted an offer', time: '5 mins ago', color: '#e63946' },
  { id: 4, type: 'quote', actor: 'Buyer from Trichy', action: 'received 6 quotes', time: '7 mins ago', color: '#d97706' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { addRequirement } = useData();
  const { t } = useLanguage();
  const { brands } = useCatalog();
  const { user } = useAuth();
  const { frames, loaded } = useVideoFrames();

  // Refs for scroll container fading
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const container = document.getElementById('scroll-hero-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const containerHeight = container.offsetHeight;
        const viewportHeight = window.innerHeight;
        const scrolled = -rect.top;
        const scrollable = containerHeight - viewportHeight;
        const progress = Math.min(1, Math.max(0, scrolled / scrollable));

        const fadeStart = 0.8;
        if (progress > fadeStart) {
          const opacity = String((1 - progress) / (1 - fadeStart));
          if (overlayRef.current) overlayRef.current.style.opacity = opacity;
          if (contentOverlayRef.current) contentOverlayRef.current.style.opacity = opacity;
        } else {
          if (overlayRef.current) overlayRef.current.style.opacity = '1';
          if (contentOverlayRef.current) contentOverlayRef.current.style.opacity = '1';
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [heroMake, setHeroMake] = useState('');
  const [heroModel, setHeroModel] = useState('');
  const [heroBudget, setHeroBudget] = useState('');
  const [heroMinYear] = useState('');
  const [heroMaxYear] = useState('');
  const [heroDescription] = useState('');
  const [heroFuel, setHeroFuel] = useState('');
  const [heroTransmission, setHeroTransmission] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedBrand = brands.find((b) => b.name === heroMake);

  const handlePostRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroMake) { toast.error('Please select a car brand.'); return; }
    if (!heroModel) { toast.error('Please select a car model.'); return; }
    if (!heroBudget.trim()) { toast.error('Please specify your budget.'); return; }

    const yearRange = heroMinYear && heroMaxYear ? `${heroMinYear}-${heroMaxYear}` : heroMinYear || heroMaxYear;
    const descParts: string[] = [];
    if (heroFuel) descParts.push(`Fuel: ${heroFuel}`);
    if (heroTransmission && heroTransmission !== 'Any') descParts.push(`Transmission: ${heroTransmission}`);
    if (heroDescription) descParts.push(heroDescription);
    const fullDesc = descParts.join('. ') || 'Looking for a clean vehicle in good condition.';

    if (user) {
      if (user.role !== 'buyer') { toast.error('Only buyers can post requirements.'); return; }
      setSubmitting(true);
      try {
        await addRequirement({
          buyerId: user.id,
          make: heroMake,
          model: heroModel,
          yearRange: yearRange || '2020-2024',
          budget: heroBudget,
          preferredFeature: '',
          description: fullDesc,
        });
        toast.success('Requirement posted successfully!');
        navigate('/buyer-dashboard');
      } catch {
        toast.error('Failed to post requirement.');
      } finally {
        setSubmitting(false);
      }
    } else {
      sessionStorage.setItem('pending_requirement', JSON.stringify({
        make: heroMake, model: heroModel, budget: heroBudget,
        yearRange: yearRange || '2020-2024', description: fullDesc,
      }));
      toast.success('Please log in to complete posting!');
      navigate('/login');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 8px', borderRadius: '6px',
    border: '1.5px solid var(--color-gray-200)', fontFamily: 'var(--font)',
    fontSize: '0.75rem', color: 'var(--color-gray-900)', background: 'var(--color-white)',
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.625rem', fontWeight: 700,
    color: 'var(--color-gray-600)', marginBottom: '2px', letterSpacing: '0.01em',
  };



  const newDealers = tamilNaduDealers.filter(d => d.type === 'new');
  const usedDealers = tamilNaduDealers.filter(d => d.type === 'used');

  const getDealerLogoInfo = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('khivraj') || n.includes('maruti')) {
      return { bg: '#eef2ff', text: '#3b82f6', initials: 'MS', border: '#dbeafe' };
    }
    if (n.includes('susee')) {
      return { bg: '#eff6ff', text: '#1d4ed8', initials: 'SA', border: '#dbeafe' };
    }
    if (n.includes('tata')) {
      return { bg: '#f0fdfa', text: '#0d9488', initials: 'TM', border: '#ccfbf1' };
    }
    if (n.includes('hyundai')) {
      return { bg: '#eff6ff', text: '#1e3a8a', initials: 'HT', border: '#dbeafe' };
    }
    if (n.includes('ambal') || n.includes('acme')) {
      return { bg: '#fef2f2', text: '#ef4444', initials: 'AA', border: '#fee2e2' };
    }
    if (n.includes('vst') || n.includes('volvo')) {
      return { bg: '#faf5ff', text: '#7c3aed', initials: 'VM', border: '#f3e8ff' };
    }
    
    const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
    return { bg: '#f8fafc', text: '#475569', initials: initials || 'DL', border: '#e2e8f0' };
  };

  const renderDealerCard = (dealer: typeof tamilNaduDealers[0], idx: number) => {
    const logoInfo = getDealerLogoInfo(dealer.name);
    const isTopRated = dealer.rating >= 4.8;

    return (
      <div
        key={`${dealer.id}-${idx}`}
        onClick={() => navigate(`/dealers/${dealer.id}`)}
        title={`View profile of ${dealer.name}`}
        style={{
          flexShrink: 0,
          width: '200px',
          padding: '14px 14px 12px',
          background: '#fff',
          border: '1px solid var(--color-gray-200)',
          borderRadius: '14px',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = 'var(--color-primary-light)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--color-gray-200)';
        }}
      >
        {/* Top rated / Fast response badge */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: isTopRated ? '#fef3c7' : '#dcfce7',
          color: isTopRated ? '#d97706' : '#15803d',
          padding: '1px 6px',
          borderRadius: '8px',
          fontSize: '0.5rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          zIndex: 2,
        }}>
          {isTopRated ? <Star size={8} fill="currentColor" /> : <Zap size={8} />}
          {isTopRated ? 'TOP RATED' : 'FAST RESPONSE'}
        </div>

        {/* Logo Icon */}
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: logoInfo.bg,
          border: `2px solid ${logoInfo.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: 800,
          color: logoInfo.text,
          marginTop: '18px',
          marginBottom: '8px',
          boxShadow: 'var(--shadow-xs)',
          flexShrink: 0,
        }}>
          {logoInfo.initials}
        </div>

        {/* Main Details */}
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: 'var(--color-gray-900)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginBottom: '2px',
              marginTop: '2px',
              justifyContent: 'center',
              lineHeight: 1.3,
            }}>
              {dealer.name}
              {dealer.verified && <BadgeCheck size={11} color="var(--color-primary)" />}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--color-gray-500)', fontSize: '0.6875rem', marginBottom: '4px' }}>
              <MapPin size={9} /> {dealer.city}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#fbbf24', fontSize: '0.6875rem', fontWeight: 700, marginBottom: '8px' }}>
              <Star size={9} fill="currentColor" /> {dealer.rating.toFixed(1)} <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', marginLeft: '2px' }}>({dealer.reviews})</span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          borderTop: '1px solid var(--color-gray-100)',
          paddingTop: '8px',
          marginBottom: '8px',
          gap: '4px',
        }}>
          <div style={{ display: 'flex', gap: '10px', color: 'var(--color-gray-600)', fontSize: '0.6875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <BadgeDollarSign size={10} color="var(--color-primary)" /> {dealer.vehicles}+ Offers
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} color="var(--color-primary)" /> {dealer.yearsInBusiness}yr Exp
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          gap: '6px', 
          marginTop: 'auto',
          flexShrink: 0,
        }}>
          <button 
            className="btn btn-outline btn-sm" 
            onClick={(e) => { e.stopPropagation(); navigate(`/dealers/${dealer.id}`); }}
            style={{ border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700, flex: 1, fontSize: '0.625rem', padding: '5px 8px' }}
          >
            View Profile
          </button>
          <a 
            href={`tel:${dealer.phone || '9876543210'}`} 
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: 'none' }}
          >
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--color-primary)', padding: '5px 7px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={11} />
            </button>
          </a>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ===== SCROLL-VIDEO HERO ===== */}
      {/* Tall container — 400vh gives ~40s of scroll to traverse 240 frames */}
      <div id="scroll-hero-container" style={{ height: '400vh', position: 'relative' }}>

        {/* Canvas renders frames as you scroll — sticky keeps it in viewport */}
        <VideoScrollCanvas frames={frames} loaded={loaded} />

        {/* Dark gradient overlay so text is legible */}
         <div ref={overlayRef} style={{
          position: 'sticky', top: 0, height: '100vh',
          marginTop: '-100vh', // pulls back up to overlap canvas
          background: 'linear-gradient(to right, rgba(255,255,255,0.76) 0%, rgba(255,255,255,0.48) 60%, rgba(255,255,255,0.22) 100%), rgba(255,255,255,0.20)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Content overlay — sticky so it stays centred while canvas animates */}
        <div ref={contentOverlayRef} style={{
          position: 'sticky', top: 0, height: '100vh',
          marginTop: '-100vh',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          zIndex: 2, pointerEvents: 'none',
          paddingTop: '48px', paddingBottom: '12px', boxSizing: 'border-box',
        }}>
          {/* Top: Unified Hero Grid */}
          <div className="container" style={{ pointerEvents: 'auto' }}>
            <div className="hero-unified-grid">

              {/* ---- COLUMN 1: Headline & Stats ---- */}
              <div className="hero-grid-left-col animate-in">
                {/* Badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', color: 'var(--color-gray-700)',
                  padding: '4px 12px', borderRadius: '20px',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
                  marginBottom: '0px', textTransform: 'uppercase',
                  border: '1px solid var(--color-gray-300)',
                  alignSelf: 'flex-start',
                }}>
                  <Star size={10} color="#ff6b7a" fill="#ff6b7a" /> India's #1 Reverse Car Marketplace
                </div>

                {/* Heading */}
                <h1 style={{
                  fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)', fontWeight: 900, color: 'var(--color-gray-900)',
                  lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '0px',
                }}>
                  You tell us what<br />you want,<br />
                  <span style={{ color: '#ff6b7a' }}>We'll find your<br />perfect deal.</span>
                </h1>

                {/* Sub-text */}
                <p style={{
                  fontSize: '0.875rem', color: 'var(--color-gray-600)',
                  lineHeight: 1.5, marginBottom: '0px', maxWidth: '440px',
                }}>
                  Post your car requirements and get verified brokers<br />
                  competing to bring you the best offers.<br />
                  <strong style={{ color: 'var(--color-gray-900)' }}>No searching. No calling. No hassle.</strong>
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px', width: '100%' }}>
                  {[
                    { icon: <Users size={11} color="#ff6b7a" />, value: '10,000+', label: 'Active Buyers' },
                    { icon: <Shield size={11} color="#ff6b7a" />, value: '2,500+', label: 'Verified Brokers' },
                    { icon: <ClipboardList size={11} color="#ff6b7a" />, value: '50,000+', label: 'Deals Done' },
                    { icon: <Star size={11} color="#ff6b7a" fill="#ff6b7a" />, value: '4.8 ★', label: 'Rating' },
                  ].map(s => (
                    <div key={s.label} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 9px',
                      background: 'rgba(255,255,255,0.72)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '9px', border: '1px solid var(--color-gray-200)',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gray-900)', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: '0.5rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- COLUMN 2: Form Card ---- */}
              <div className="hero-grid-form-col animate-in animate-delay-1" style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                borderRadius: '14px',
                boxShadow: '0 20px 60px rgba(15, 23, 42, 0.10)',
                border: '1px solid rgba(15, 23, 42, 0.08)',
              }}>
                {/* Card Header */}
                <div style={{
                  padding: '8px 12px 6px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '8px',
                    background: 'rgba(230,57,70,0.15)',
                    border: '1px solid rgba(230,57,70,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Car size={13} color="#ff6b7a" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '0px' }}>Post Your Requirement</h2>
                    <p style={{ fontSize: '0.5625rem', color: 'var(--color-gray-500)' }}>It's quick, easy and free</p>
                  </div>
                </div>

                <form onSubmit={handlePostRequirement} style={{ padding: '8px 12px 10px' }}>

                  {/* Brand + Model */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                    <div>
                      <label style={labelStyle}>Select Brand *</label>
                      <select required style={inputStyle} value={heroMake}
                        onChange={e => { setHeroMake(e.target.value); setHeroModel(''); }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}>
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Select Model *</label>
                      <select required style={inputStyle} value={heroModel}
                        onChange={e => setHeroModel(e.target.value)}
                        disabled={!heroMake}
                        onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}>
                        <option value="">Select Model</option>
                        {selectedBrand?.models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Budget */}
                  <div style={{ marginBottom: '6px' }}>
                    <label style={labelStyle}>Your Budget *</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', fontWeight: 700, fontSize: '0.75rem' }}>₹</span>
                      <input
                        required type="number" min="0" step="0.5"
                        value={heroBudget} onChange={e => setHeroBudget(e.target.value)}
                        placeholder="e.g. 10-15 Lakh"
                        style={{ ...inputStyle, paddingLeft: '18px' }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Fuel Type Pills */}
                  <div style={{ marginBottom: '6px' }}>
                    <label style={labelStyle}>Fuel Type</label>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                      {FUEL_TYPES.map(f => (
                        <button key={f} type="button"
                          onClick={() => setHeroFuel(heroFuel === f ? '' : f)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '2px',
                            padding: '2px 5px', borderRadius: '6px',
                            border: `1.5px solid ${heroFuel === f ? 'rgba(230,57,70,0.8)' : 'var(--color-gray-200)'}`,
                            background: heroFuel === f ? 'rgba(230,57,70,0.15)' : 'var(--color-gray-50)',
                            color: heroFuel === f ? '#ff6b7a' : 'var(--color-gray-600)',
                            fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.5625rem',
                            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}>
                          <span>{FUEL_ICONS[f]}</span> {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transmission Pills */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={labelStyle}>Transmission</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {TRANSMISSION_TYPES.map(tr => (
                        <button key={tr} type="button"
                          onClick={() => setHeroTransmission(heroTransmission === tr ? '' : tr)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '2px',
                            padding: '2px 6px', borderRadius: '6px',
                            border: `1.5px solid ${heroTransmission === tr ? 'rgba(230,57,70,0.8)' : 'var(--color-gray-200)'}`,
                            background: heroTransmission === tr ? 'rgba(230,57,70,0.15)' : 'var(--color-gray-50)',
                            color: heroTransmission === tr ? '#ff6b7a' : 'var(--color-gray-600)',
                            fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.5625rem',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                          <span>{TRANS_ICONS[tr]}</span> {tr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={submitting} style={{
                    width: '100%', padding: '6px 12px',
                    background: submitting ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg, #e63946 0%, #c1121f 100%)',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontFamily: 'var(--font)', fontWeight: 800, fontSize: '0.75rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'opacity 0.2s, transform 0.15s',
                    boxShadow: submitting ? 'none' : '0 4px 20px rgba(230,57,70,0.4)',
                    letterSpacing: '0.02em',
                  }}
                    onMouseEnter={e => { if (!submitting) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Send size={11} /> {submitting ? 'Posting...' : 'Post Requirement'}
                  </button>

                  {/* Trust signal */}
                  <div style={{ textAlign: 'center', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.5625rem', color: 'var(--color-gray-400)' }}>
                    <Lock size={8} /> Your details are secure and private
                  </div>
                </form>
              </div>

              {/* ---- ROW 2: Sponsored Banner spans Col 1 & 2 ---- */}
              <div className="hero-grid-banner">
                <SponsoredBanner />
              </div>

              {/* ---- COLUMN 3: Widgets Top Stack ---- */}
              <div className="hero-grid-widgets-top">

                {/* 🏆 Top Responsive Dealers */}
                <div style={{
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 12px 8px',
                    borderBottom: '1px solid rgba(15,23,42,0.06)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <Trophy size={14} color="#f59e0b" fill="#f59e0b" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Top Responsive Dealers</span>
                  </div>
                  <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {TOP_DEALERS.map((dealer) => (
                      <div key={dealer.rank} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 8px', borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid transparent',
                      }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                          background: dealer.rank === 1 ? '#ffedd5' : dealer.rank === 2 ? '#eff6ff' : '#f3e8ff',
                          color: dealer.rank === 1 ? '#c2410c' : dealer.rank === 2 ? '#1d4ed8' : '#7c3aed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6875rem', fontWeight: 800,
                        }}>{dealer.rank}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dealer.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                            <TrendingUp size={9} color="#059669" />
                            <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)' }}>Avg Response: <strong style={{ color: '#059669', fontWeight: 700 }}>{dealer.avgResponse}</strong></span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
                          <Star size={10} color="#f59e0b" fill="#f59e0b" />
                          <span>{dealer.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px', textAlign: 'center', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
                    <a href="#" onClick={e => { e.preventDefault(); }} style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                      View Full Leaderboard <ArrowRight size={10} />
                    </a>
                  </div>
                </div>

                {/* 🔥 Most Requested Today */}
                <div style={{
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 12px 8px',
                    borderBottom: '1px solid rgba(15,23,42,0.06)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <Flame size={14} color="#e63946" fill="#e63946" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Most Requested Today</span>
                  </div>
                  <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {MOST_REQUESTED.map((item, idx) => (
                      <div key={item.rank} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '4px 6px', borderRadius: '6px',
                      }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                          background: idx === 0 ? '#fee2e2' : idx === 1 ? '#ffedd5' : idx === 2 ? '#fef9c3' : '#eff6ff',
                          color: idx === 0 ? '#ef4444' : idx === 1 ? '#ea580c' : idx === 2 ? '#ca8a04' : '#2563eb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.625rem', fontWeight: 800,
                        }}>{item.rank}</div>
                        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-800)' }}>{item.model}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{item.count} Requests</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px', textAlign: 'center', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
                    <a href="#" onClick={e => { e.preventDefault(); }} style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                      View All Popular Cars <ArrowRight size={10} />
                    </a>
                  </div>
                </div>

              </div>

              {/* ---- COLUMN 3: Live Activity Widget ---- */}
              <div className="hero-grid-widgets-bottom">
                {/* ⚡ Live Activity Feed */}
                <LiveActivityFeed />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ===== ALL CONTENT — single unified section ===== */}
      <section style={{ position: 'relative', background: '#f8fafc', paddingTop: '40px' }}>

        {/* ── Trusted Dealers strip — normal flow ── */}
        <div style={{ width: '100%', marginBottom: '40px' }}>
          {/* Label row */}
          <div className="container" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={14} color="#ff6b7a" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ff6b7a', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Tamil Nadu</span>
              <span style={{ width: '1px', height: '12px', background: 'var(--color-gray-300)', margin: '0 4px' }} />
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Trusted Dealers Across Tamil Nadu</span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[{ value: '500+', label: 'Dealers' }, { value: '32', label: 'Cities' }, { value: '15', label: 'Brands' }].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#ff6b7a', lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* New Car Dealers row */}
          <div style={{ marginBottom: '16px' }}>
            <div className="container" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 800, color: '#ff6b7a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff6b7a' }} />
                New Car Showrooms
              </div>
            </div>
            <div className="dealer-scroll-wrapper">
              <div className="dealer-track">
                {[...newDealers, ...newDealers].map((dealer, idx) => renderDealerCard(dealer, idx))}
              </div>
            </div>
          </div>

          {/* Pre-Owned Dealers row */}
          <div>
            <div className="container" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                Pre-Owned Car Dealers
              </div>
            </div>
            <div className="dealer-scroll-wrapper">
              <div className="dealer-track-reverse">
                {[...usedDealers, ...usedDealers].map((dealer, idx) => renderDealerCard(dealer, idx))}
              </div>
            </div>
          </div>
        </div>

        {/* glass divider */}
        <div className="container">
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(15, 23, 42, 0.08), transparent)', marginBottom: '40px' }} />
        </div>

        <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

          {/* — Why Buyers Love CarMatchr — */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-gray-900)', flexShrink: 0 }}>
              Why Buyers Love CarMatchr
            </span>
            {/* thin separator */}
            <div style={{ width: '1px', height: '32px', background: 'rgba(15, 23, 42, 0.12)', flexShrink: 0 }} />
            {[
              { icon: <Clock size={15} color="#ff6b7a" />, title: 'Save Time', desc: 'No more endless searching' },
              { icon: <BadgeDollarSign size={15} color="#ff6b7a" />, title: 'Best Prices', desc: 'Brokers compete for you' },
              { icon: <Shield size={15} color="#ff6b7a" />, title: 'Verified Brokers', desc: 'Trusted & experienced' },
              { icon: <Lock size={15} color="#ff6b7a" />, title: 'Secure & Private', desc: '100% safe & confidential' },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                borderRadius: '12px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(230,57,70,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-gray-600)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* glass divider */}
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(15, 23, 42, 0.08), transparent)', marginBottom: '64px' }} />

          {/* — How It Works — */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '8px', letterSpacing: '-0.02em' }}>{t('howItWorks')}</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-gray-600)', maxWidth: '480px', margin: '0 auto' }}>A reverse marketplace that flips the used-car buying experience.</p>
          </div>
          <div className="grid grid-3" style={{ marginBottom: '72px' }}>
            {[
              { icon: <Search size={24} />, step: '01', title: t('step1Title'), desc: t('step1Desc') },
              { icon: <Zap size={24} />, step: '02', title: t('step2Title'), desc: t('step2Desc') },
              { icon: <Award size={24} />, step: '03', title: t('step3Title'), desc: t('step3Desc') },
            ].map((item, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '36px 24px', position: 'relative',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(18px) saturate(160%)',
                WebkitBackdropFilter: 'blur(18px) saturate(160%)',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 32px rgba(15, 23, 42, 0.05)',
                transition: 'transform 0.25s, box-shadow 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(15, 23, 42, 0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(15, 23, 42, 0.05)'; }}
              >
                <div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '0.625rem', fontWeight: 800, color: 'rgba(15, 23, 42, 0.15)' }}>STEP {item.step}</div>
                <div style={{
                  width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
                  background: 'rgba(230,57,70,0.12)',
                  border: '1px solid rgba(230,57,70,0.22)',
                  color: '#ff6b7a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 20px rgba(230,57,70,0.12)',
                }}>{item.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-gray-900)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* — CTA — */}
          <div style={{
            textAlign: 'center',
            padding: '52px 40px',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '24px',
            boxShadow: 'var(--glass-shadow-lg)',
            position: 'relative', overflow: 'hidden',
            maxWidth: '640px', margin: '0 auto',
          }}>
            {/* dot pattern overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(230,57,70,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '12px', color: 'var(--color-gray-900)', letterSpacing: '-0.02em' }}>{t('readyCTA')}</h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-600)', marginBottom: '28px', lineHeight: 1.7 }}>{t('ctaDesc')}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => navigate('/register')} className="btn btn-primary btn-lg"
                  style={{ boxShadow: '0 4px 20px rgba(230,57,70,0.4)' }}>
                  {t('postRequirement')} <ArrowRight size={15} />
                </button>
                <button onClick={() => navigate('/register?role=broker')} className="btn btn-secondary btn-lg">
                  {t('joinBroker')}
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

// ── Live Activity Feed Component ────────────────────────────────────────────
const LiveActivityFeed: React.FC = () => {
  const [feed, setFeed] = useState(LIVE_FEED_INITIAL);
  const [newEntryId, setNewEntryId] = useState<number | null>(null);

  useEffect(() => {
    const cities = ['Salem', 'Erode', 'Vellore', 'Tirunelveli', 'Thanjavur', 'Pondicherry', 'Hosur', 'Dindigul'];
    const actions = [
      { type: 'offer', action: 'submitted an offer', color: '#0d9488' },
      { type: 'quote', action: 'received 5 quotes', color: '#7c3aed' },
      { type: 'offer', action: 'submitted an offer', color: '#e63946' },
      { type: 'quote', action: 'received 8 quotes', color: '#d97706' },
    ];
    let nextId = 100;
    const interval = setInterval(() => {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const act = actions[Math.floor(Math.random() * actions.length)];
      const isDealer = act.type === 'offer';
      const newEntry = {
        id: nextId++,
        type: act.type,
        actor: `${isDealer ? 'Dealer' : 'Buyer'} from ${city}`,
        action: act.action,
        time: 'just now',
        color: act.color,
      };
      setFeed(prev => [newEntry, ...prev.slice(0, 3)]);
      setNewEntryId(newEntry.id);
      setTimeout(() => setNewEntryId(null), 600);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.90)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderRadius: '12px',
      border: '1px solid rgba(15,23,42,0.08)',
      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={13} color="#059669" />
          <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Live Activity</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#059669' }}>LIVE</span>
        </div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {feed.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '8px 10px', borderRadius: '8px',
              background: newEntryId === item.id ? 'rgba(5,150,105,0.06)' : 'transparent',
              border: newEntryId === item.id ? '1px solid rgba(5,150,105,0.15)' : '1px solid transparent',
              transition: 'background 0.4s, border-color 0.4s',
            }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: item.type === 'offer' ? '#dcfce7' : '#eff6ff',
              border: `1px solid ${item.type === 'offer' ? '#bbf7d0' : '#bfdbfe'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: item.type === 'offer' ? '#15803d' : '#1d4ed8',
            }}>
              {item.type === 'offer'
                ? <Send size={12} />
                : <Users size={12} />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{item.actor}</span>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)' }}>{item.time}</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>
                {item.action}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px', textAlign: 'center', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
        <a href="#" onClick={e => { e.preventDefault(); }} style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
          View All <ChevronRight size={10} />
        </a>
      </div>
    </div>
  );
};

// ── Sponsored Dealer Banner ──────────────────────────────────────────────────
const SponsoredBanner: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      brand: 'Tata Motors Trichy',
      headline: 'Get Exclusive June Offers',
      subheadline: 'from Tata Motors Trichy',
      cta: 'View Offers',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0d4f7c 100%)',
      accentColor: '#38bdf8',
      badgeColor: '#f59e0b',
    },
    {
      id: 2,
      brand: 'Sree Hyundai Chennai',
      headline: 'Zero Down Payment This Month',
      subheadline: 'at Sree Hyundai Chennai',
      cta: 'Check Deals',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
      accentColor: '#a78bfa',
      badgeColor: '#818cf8',
    },
    {
      id: 3,
      brand: 'VST Motors Coimbatore',
      headline: 'Best Exchange Bonuses',
      subheadline: 'at VST Motors Coimbatore',
      cta: 'Get Quote',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #14532d 40%, #166534 100%)',
      accentColor: '#4ade80',
      badgeColor: '#86efac',
    },
  ];

  const handleNext = () => setCurrentSlide(p => (p + 1) % slides.length);
  const handlePrev = () => setCurrentSlide(p => (p - 1 + slides.length) % slides.length);

  useEffect(() => {
    const timer = setInterval(handleNext, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[currentSlide];

  return (
    <div style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundImage: slide.id === 1 ? `url('/tata_showroom.png')` : 'none',
      backgroundColor: slide.id !== 1 ? '#0f172a' : 'transparent',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      boxShadow: '0 8px 32px rgba(15,23,42,0.20)',
      transition: 'all 0.6s ease',
      minHeight: '76px',
    }}>
      {/* Background pattern */}
      {slide.id !== 1 && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(${slide.accentColor}18 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      {/* Glow orb */}
      <div style={{
        position: 'absolute', right: '-40px', top: '-40px',
        width: '200px', height: '200px', borderRadius: '50%',
        background: `radial-gradient(circle, ${slide.accentColor}25 0%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      {/* Dark gradient overlay to ensure readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: slide.id === 1
          ? 'linear-gradient(90deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 50%, rgba(15,23,42,0.3) 100%)'
          : slide.gradient,
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* Left: Badge + Text */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
          <Star size={9} color={slide.badgeColor} fill={slide.badgeColor} />
          <span style={{ fontSize: '0.5rem', fontWeight: 800, color: slide.badgeColor, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sponsored Dealer</span>
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '2px' }}>{slide.headline}</h3>
        <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>{slide.subheadline}</p>
      </div>

      {/* Center: Brand Tag */}
      <div style={{
        position: 'relative', zIndex: 1, flexShrink: 0,
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.08)',
        border: `1px solid ${slide.accentColor}40`,
        borderRadius: '8px',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>Authorized Dealer</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>{slide.brand}</div>
      </div>

      {/* Right: CTA + Nav */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
        <button style={{
          padding: '6px 14px',
          background: '#e63946',
          color: '#fff', border: 'none', borderRadius: '8px',
          fontFamily: 'var(--font)', fontWeight: 800, fontSize: '0.75rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
          boxShadow: '0 3px 12px rgba(230,57,70,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(230,57,70,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(230,57,70,0.45)'; }}
        >
          {slide.cta} <ExternalLink size={11} />
        </button>
        {/* Slide indicators */}
        <div style={{ display: 'flex', gap: '5px' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: i === currentSlide ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button onClick={handlePrev} style={{
        position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 2,
        opacity: 0.7, padding: '4px',
      }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
        <ChevronLeft size={20} />
      </button>
      <button onClick={handleNext} style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 2,
        opacity: 0.7, padding: '4px',
      }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default Home;


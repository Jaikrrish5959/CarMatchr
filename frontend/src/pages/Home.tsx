import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Award, ArrowRight, Star,
  MapPin, Fuel,
  Shield, Clock, BadgeDollarSign, Lock, Send,
  Car, Wrench, Cpu, Settings, Users, ClipboardList, Leaf,
  Building2, BadgeCheck, Phone,
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

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const;
const TRANSMISSION_TYPES = ['Manual', 'Automatic', 'Any'] as const;

const FUEL_ICONS: Record<string, React.ReactNode> = {
  Petrol: <Fuel size={14} />, Diesel: <Fuel size={14} />, Hybrid: <Leaf size={14} />, Electric: <Zap size={14} />,
};
const TRANS_ICONS: Record<string, React.ReactNode> = {
  Manual: <Wrench size={14} />, Automatic: <Cpu size={14} />, Any: <Settings size={14} />,
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { addRequirement } = useData();
  const { t } = useLanguage();
  const { brands } = useCatalog();
  const { user } = useAuth();
  const { frames, loaded } = useVideoFrames();

  // ── Parallax refs (direct DOM mutation, no re-renders) ──────────────────
  const badgeRef    = useRef<HTMLDivElement>(null);
  const headingRef  = useRef<HTMLHeadingElement>(null);
  const subTextRef  = useRef<HTMLParagraphElement>(null);
  const statsRef    = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const sy = window.scrollY;
      const vh = window.innerHeight;

      // Each layer drifts upward at a different rate → depth illusion
      if (badgeRef.current) {
        const t = sy * -0.22;
        const o = Math.max(0, 1 - sy / (vh * 1.2));
        badgeRef.current.style.transform = `translateY(${t}px)`;
        badgeRef.current.style.opacity   = String(o);
      }
      if (headingRef.current) {
        const t = sy * -0.16;
        const o = Math.max(0, 1 - sy / (vh * 1.5));
        headingRef.current.style.transform = `translateY(${t}px)`;
        headingRef.current.style.opacity   = String(o);
      }
      if (subTextRef.current) {
        const t = sy * -0.10;
        const o = Math.max(0, 1 - sy / (vh * 1.8));
        subTextRef.current.style.transform = `translateY(${t}px)`;
        subTextRef.current.style.opacity   = String(o);
      }
      if (statsRef.current) {
        const t = sy * -0.06;
        const o = Math.max(0, 1 - sy / (vh * 2.2));
        statsRef.current.style.transform = `translateY(${t}px)`;
        statsRef.current.style.opacity   = String(o);
      }
      // Form card: parallax drift and fade out
      if (formCardRef.current) {
        const t = sy * -0.08;
        const o = Math.max(0, 1 - sy / (vh * 2.2));
        formCardRef.current.style.transform = `translateY(${t}px)`;
        formCardRef.current.style.opacity   = String(o);
      }
      // Scroll hint fades out once user starts scrolling
      if (scrollHintRef.current) {
        const o = Math.max(0, 1 - sy / (vh * 0.3));
        scrollHintRef.current.style.opacity = String(o);
      }

      // Fade out overlay and content near the end of scroll
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
  const [heroMinYear, setHeroMinYear] = useState('');
  const [heroMaxYear, setHeroMaxYear] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
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
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid var(--color-gray-200)', fontFamily: 'var(--font)',
    fontSize: '0.875rem', color: 'var(--color-gray-900)', background: 'var(--color-white)',
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 700,
    color: 'var(--color-gray-600)', marginBottom: '5px', letterSpacing: '0.01em',
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
          width: '320px',
          padding: '24px 20px',
          background: '#fff',
          border: '1px solid var(--color-gray-200)',
          borderRadius: '16px',
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
          e.currentTarget.style.transform = 'translateY(-6px)';
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
          top: '12px',
          left: '12px',
          background: isTopRated ? '#fef3c7' : '#dcfce7',
          color: isTopRated ? '#d97706' : '#15803d',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.625rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 2,
        }}>
          {isTopRated ? <Star size={10} fill="currentColor" /> : <Zap size={10} />}
          {isTopRated ? 'TOP RATED' : 'FAST RESPONSE'}
        </div>

        {/* Logo Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: logoInfo.bg,
          border: `2px solid ${logoInfo.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          fontWeight: 800,
          color: logoInfo.text,
          marginTop: '12px',
          marginBottom: '12px',
          boxShadow: 'var(--shadow-xs)',
          flexShrink: 0,
        }}>
          {logoInfo.initials}
        </div>

        {/* Main Details */}
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{
              fontSize: '1.0625rem',
              fontWeight: 800,
              color: 'var(--color-gray-900)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              marginBottom: '4px',
              marginTop: '4px',
              justifyContent: 'center'
            }}>
              {dealer.name}
              {dealer.verified && <BadgeCheck size={16} color="var(--color-primary)" />}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-gray-500)', fontSize: '0.8125rem', marginBottom: '6px' }}>
              <MapPin size={12} /> {dealer.city}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '12px' }}>
              <Star size={12} fill="currentColor" /> {dealer.rating.toFixed(1)} <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', marginLeft: '2px' }}>({dealer.reviews} reviews)</span>
            </div>
          </div>
        </div>

        {/* Metrics and Brands */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          borderTop: '1px solid var(--color-gray-100)',
          paddingTop: '12px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--color-gray-600)', fontSize: '0.8125rem', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Car size={14} color="var(--color-primary)" /> {dealer.vehicles}+ Vehicles
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={14} color="var(--color-primary)" /> {dealer.yearsInBusiness} yrs exp
            </div>
          </div>
          {/* Brands list tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
            <span>Brands:</span>
            {(dealer.brand || 'Maruti Suzuki, Hyundai').split(',').slice(0, 2).map((brandName, idx) => (
              <span key={idx} style={{ background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-gray-600)' }}>
                {brandName.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Actions Column */}
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          gap: '8px', 
          marginTop: 'auto',
          flexShrink: 0,
        }}>
          <button 
            className="btn btn-outline btn-sm" 
            onClick={(e) => { e.stopPropagation(); navigate(`/dealers/${dealer.id}`); }}
            style={{ border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700, flex: 1 }}
          >
            View Profile
          </button>
          <a 
            href={`tel:${dealer.phone || '9876543210'}`} 
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: 'none' }}
          >
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--color-primary)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={14} />
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
          display: 'flex', alignItems: 'center',
          zIndex: 2, pointerEvents: 'none',
        }}>
          <div className="container" style={{ padding: '0 32px', pointerEvents: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 430px', gap: '52px', alignItems: 'center' }}>

              {/* ---- LEFT: Headline ---- */}
              <div className="animate-in">
                {/* Badge */}
                <div ref={badgeRef} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', color: 'var(--color-gray-700)',
                  padding: '5px 14px', borderRadius: '20px',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
                  marginBottom: '22px', textTransform: 'uppercase',
                  border: '1px solid var(--color-gray-300)',
                  willChange: 'transform, opacity',
                }}>
                  <Star size={10} color="#ff6b7a" fill="#ff6b7a" /> India's #1 Reverse Car Marketplace
                </div>

                {/* Heading */}
                <h1 ref={headingRef} style={{
                  fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 900, color: 'var(--color-gray-900)',
                  lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '18px',
                  willChange: 'transform, opacity',
                }}>
                  You tell us what<br />you want,<br />
                  <span style={{ color: '#ff6b7a' }}>We'll find your<br />perfect deal.</span>
                </h1>

                {/* Sub-text */}
                <p ref={subTextRef} style={{
                  fontSize: '1.05rem', color: 'var(--color-gray-600)',
                  lineHeight: 1.7, marginBottom: '32px', maxWidth: '460px',
                  willChange: 'transform, opacity',
                }}>
                  Post your car requirements and get verified brokers<br />
                  competing to bring you the best offers.<br />
                  <strong style={{ color: 'var(--color-gray-900)' }}>No searching. No calling. No hassle.</strong>
                </p>

                {/* Stats */}
                <div ref={statsRef} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', willChange: 'transform, opacity' }}>
                  {[
                    { icon: <Users size={15} color="#ff6b7a" />, value: '10,000+', label: 'Active Buyers' },
                    { icon: <Shield size={15} color="#ff6b7a" />, value: '2,500+', label: 'Verified Brokers' },
                    { icon: <ClipboardList size={15} color="#ff6b7a" />, value: '50,000+', label: 'Deals Done' },
                    { icon: <Star size={15} color="#ff6b7a" fill="#ff6b7a" />, value: '4.8 ★', label: 'Rating' },
                  ].map(s => (
                    <div key={s.label} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '9px 14px',
                      background: 'rgba(255,255,255,0.72)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '10px', border: '1px solid var(--color-gray-200)',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--color-gray-900)', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- RIGHT: Form card ---- */}
              <div ref={formCardRef} className="animate-in animate-delay-1" style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                borderRadius: '20px',
                boxShadow: '0 24px 80px rgba(15, 23, 42, 0.08)',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                maxHeight: '90vh', overflowY: 'auto',
                willChange: 'transform, opacity',
              }}>
                {/* Card Header */}
                <div style={{
                  padding: '18px 22px 14px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: 'rgba(230,57,70,0.2)',
                    border: '1px solid rgba(230,57,70,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Car size={20} color="#ff6b7a" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '1px' }}>Post Your Requirement</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>It's quick, easy and free</p>
                  </div>
                </div>

                <form onSubmit={handlePostRequirement} style={{ padding: '18px 22px 20px' }}>

                  {/* Brand + Model */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={labelStyle}>Select Brand *</label>
                      <div style={{ position: 'relative' }}>
                        <select required style={inputStyle} value={heroMake}
                          onChange={e => { setHeroMake(e.target.value); setHeroModel(''); }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}>
                          <option value="">Select Brand</option>
                          {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Select Model *</label>
                      <div style={{ position: 'relative' }}>
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
                  </div>

                  {/* Budget + Year Range */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={labelStyle}>Your Budget *</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', fontWeight: 700, fontSize: '0.9rem' }}>₹</span>
                        <input
                          required type="number" min="0" step="0.5"
                          value={heroBudget} onChange={e => setHeroBudget(e.target.value)}
                          placeholder="e.g. 10-15 Lakh"
                          style={{ ...inputStyle, paddingLeft: '24px' }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Year Range</label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select style={inputStyle} value={heroMinYear} onChange={e => setHeroMinYear(e.target.value)}
                          onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}>
                          <option value="">Min</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <span style={{ color: 'var(--color-gray-300)', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>–</span>
                        <select style={inputStyle} value={heroMaxYear} onChange={e => setHeroMaxYear(e.target.value)}
                          onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}>
                          <option value="">Max</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Fuel Type Pills */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Preferred Fuel Type</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {FUEL_TYPES.map(f => (
                        <button key={f} type="button"
                          onClick={() => setHeroFuel(heroFuel === f ? '' : f)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '7px 14px', borderRadius: '8px',
                            border: `1.5px solid ${heroFuel === f ? 'rgba(230,57,70,0.8)' : 'var(--color-gray-200)'}`,
                            background: heroFuel === f ? 'rgba(230,57,70,0.18)' : 'var(--color-gray-50)',
                            color: heroFuel === f ? '#ff6b7a' : 'var(--color-gray-600)',
                            fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.8125rem',
                            cursor: 'pointer', transition: 'all 0.15s',
                            boxShadow: heroFuel === f ? '0 0 12px rgba(230,57,70,0.25)' : 'none',
                          }}>
                          <span>{FUEL_ICONS[f]}</span> {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transmission Pills */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Transmission</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {TRANSMISSION_TYPES.map(tr => (
                        <button key={tr} type="button"
                          onClick={() => setHeroTransmission(heroTransmission === tr ? '' : tr)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '7px 14px', borderRadius: '8px',
                            border: `1.5px solid ${heroTransmission === tr ? 'rgba(230,57,70,0.8)' : 'var(--color-gray-200)'}`,
                            background: heroTransmission === tr ? 'rgba(230,57,70,0.18)' : 'var(--color-gray-50)',
                            color: heroTransmission === tr ? '#ff6b7a' : 'var(--color-gray-600)',
                            fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.8125rem',
                            cursor: 'pointer', transition: 'all 0.15s',
                            boxShadow: heroTransmission === tr ? '0 0 12px rgba(230,57,70,0.25)' : 'none',
                          }}>
                          <span>{TRANS_ICONS[tr]}</span> {tr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Additional Details <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}>(Optional)</span></label>
                    <textarea
                      rows={3}
                      value={heroDescription}
                      onChange={e => setHeroDescription(e.target.value.slice(0, 250))}
                      placeholder="Condition, color, features, mileage, urgency, budget flexibility..."
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: '76px' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.7)'; e.target.style.boxShadow = '0 0 0 2px rgba(230,57,70,0.15)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--color-gray-200)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.6875rem', color: 'var(--color-gray-400)', marginTop: '3px' }}>
                      {heroDescription.length}/250
                    </div>
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={submitting} style={{
                    width: '100%', padding: '14px',
                    background: submitting ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg, #e63946 0%, #c1121f 100%)',
                    color: '#fff', border: 'none', borderRadius: '10px',
                    fontFamily: 'var(--font)', fontWeight: 800, fontSize: '1rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'opacity 0.2s, transform 0.15s',
                    boxShadow: submitting ? 'none' : '0 4px 20px rgba(230,57,70,0.4)',
                    letterSpacing: '0.02em',
                  }}
                    onMouseEnter={e => { if (!submitting) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Send size={16} /> {submitting ? 'Posting...' : 'Post Requirement'}
                  </button>

                  {/* Trust signal */}
                  <div style={{ textAlign: 'center', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.6875rem', color: 'var(--color-gray-400)' }}>
                    <Lock size={11} /> Your details are secure and private
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>

        {/* Scroll-down hint */}
        <div ref={scrollHintRef} style={{
          position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          zIndex: 10, pointerEvents: 'none', transition: 'opacity 0.3s',
        }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-gray-600)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scroll to explore</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '6px', height: '6px', borderRight: '2px solid var(--color-gray-500)',
                borderBottom: '2px solid var(--color-gray-500)',
                transform: 'rotate(45deg)',
                animation: `chevron-bounce 1.4s ease-in-out ${i * 0.18}s infinite`,
              }} />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes chevron-bounce {
            0%, 100% { opacity: 0.2; transform: rotate(45deg) translateY(-3px); }
            50% { opacity: 1; transform: rotate(45deg) translateY(3px); }
          }
        `}</style>
      </div>


      {/* ===== ALL CONTENT — single unified section ===== */}
      <section style={{ position: 'relative' }}>

        {/* ── Popular Dealers in Tamil Nadu (full-bleed, outside container) ── */}
        <div style={{ paddingTop: '56px', paddingBottom: '56px' }}>

          {/* Section header */}
          <div className="container" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.6875rem', fontWeight: 800, color: '#ff6b7a',
                  letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '8px',
                }}>
                  <Building2 size={12} />
                  Tamil Nadu
                </div>
                <h2 style={{
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 800,
                  color: 'var(--color-gray-900)', letterSpacing: '-0.02em', marginBottom: '6px',
                }}>
                  Trusted Dealers Across Tamil Nadu
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                  Explore verified dealers from Chennai, Coimbatore, Madurai, Trichy&nbsp;&amp;&nbsp;more.
                </p>
              </div>

              {/* Live stats */}
              <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                {[
                  { value: '500+', label: 'Dealers' },
                  { value: '32', label: 'Cities' },
                  { value: '15', label: 'Brands' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1.375rem', fontWeight: 900, color: '#ff6b7a',
                      lineHeight: 1, letterSpacing: '-0.03em',
                    }}>{stat.value}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)', fontWeight: 600, marginTop: '2px' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New Car Dealers Marquee */}
          <div style={{ marginBottom: '28px' }}>
            <div className="container" style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '0.75rem', fontWeight: 800, color: '#ff6b7a',
                letterSpacing: '0.05em', textTransform: 'uppercase'
              }}>
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

          {/* Used Car Dealers Marquee */}
          <div style={{ marginTop: '28px' }}>
            <div className="container" style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '0.75rem', fontWeight: 800, color: '#34d399',
                letterSpacing: '0.05em', textTransform: 'uppercase'
              }}>
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
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(15, 23, 42, 0.08), transparent)', marginBottom: '0' }} />
        </div>

        <div className="container" style={{ paddingTop: '48px', paddingBottom: '80px' }}>

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

export default Home;


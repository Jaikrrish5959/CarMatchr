import React, { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import {
  Clock, Send, CheckCircle2, AlertCircle, Plus, Car, X, MapPin, Fuel,
  Gauge, ImagePlus, Users, Star, ChevronDown, TrendingDown, TrendingUp,
  MessageCircle, FileText, HelpCircle, Target, ChevronLeft, ChevronRight,
  Zap, ArrowRight,
} from 'lucide-react';
import { cities, bodyTypes, fuelTypes, transmissions, type CarListing } from '../../data/carDatabase';
import { useCatalog } from '../../hooks/useCatalog';
import { getToken } from '../../services/authService';
import toast from 'react-hot-toast';
import type { BrokerListing, Requirement } from '../../contexts/DataContext';

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

function parseBudgetLakh(budget: string): number | null {
  const clean = (budget || '').replace(/[₹,\s]/g, '');
  const match = clean.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

function expiresIn(dateStr: string): { text: string; urgent: boolean } | null {
  const expiry = new Date(dateStr).getTime() + 24 * 60 * 60 * 1000;
  const secs = Math.floor((expiry - Date.now()) / 1000);
  if (secs <= 0) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return { text: `${h}h ${m}m`, urgent: h < 6 };
}

function calcMatchScore(req: Requirement, myListings: BrokerListing[]): number {
  const active = myListings.filter(l => l.status === 'active');
  let score = 35;
  if (active.some(l => l.make.toLowerCase() === req.make.toLowerCase())) score += 25;
  if (active.some(l => l.model.toLowerCase() === req.model.toLowerCase())) score += 25;
  const budget = parseBudgetLakh(req.budget);
  if (budget && active.some(l => Math.abs(l.price - budget) / budget < 0.25)) score += 10;
  if (req.yearRange) {
    const parts = req.yearRange.split(/[-–]/);
    const minY = parseInt(parts[0]);
    const maxY = parseInt(parts[1] || parts[0]);
    if (!isNaN(minY) && active.some(l => l.year >= minY && l.year <= (isNaN(maxY) ? 2026 : maxY))) score += 5;
  }
  return Math.min(score, 99);
}

function matchLabel(score: number): string {
  if (score >= 85) return 'Excellent Match';
  if (score >= 70) return 'Good Match';
  if (score >= 55) return 'Fair Match';
  return 'Partial Match';
}

function matchColor(score: number): string {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#d97706';
  return '#e63946';
}

function getMatchReasons(req: Requirement, myListings: BrokerListing[]): string[] {
  const active = myListings.filter(l => l.status === 'active');
  const reasons: string[] = [];
  if (active.some(l => l.model.toLowerCase() === req.model.toLowerCase())) {
    reasons.push('Model Exact Match');
  } else if (active.some(l => l.make.toLowerCase() === req.make.toLowerCase())) {
    reasons.push('Brand Match');
  }
  const budget = parseBudgetLakh(req.budget);
  if (budget && active.some(l => Math.abs(l.price - budget) / budget < 0.25)) {
    reasons.push('Budget Fits');
  }
  const desc = (req.description || '').toLowerCase();
  if (active.some(l => l.city && desc.includes(l.city.toLowerCase()))) {
    reasons.push('Location Match');
  }
  if (reasons.length < 2) reasons.push('Inventory Available');
  if (reasons.length < 3) reasons.push('Quick Turnaround');
  return reasons.slice(0, 3);
}

interface PriceSuggestion {
  avg: number | null;
  low: number | null;
  high: number | null;
  trend: 'low' | 'fair' | 'high' | null;
}

function getSuggestedPrice(req: Requirement, myListings: BrokerListing[]): PriceSuggestion {
  const matching = myListings.filter(
    l => l.status === 'active' &&
      (l.make.toLowerCase() === req.make.toLowerCase() || l.model.toLowerCase() === req.model.toLowerCase())
  );
  if (matching.length === 0) return { avg: null, low: null, high: null, trend: null };
  const avg = matching.reduce((s, l) => s + l.price, 0) / matching.length;
  const low = Math.round(avg * 0.97 * 10) / 10;
  const high = Math.round(avg * 1.03 * 10) / 10;
  const budget = parseBudgetLakh(req.budget);
  let trend: PriceSuggestion['trend'] = null;
  if (budget) {
    const ratio = avg / budget;
    trend = ratio < 0.95 ? 'low' : ratio > 1.05 ? 'high' : 'fair';
  }
  return { avg: Math.round(avg * 10) / 10, low, high, trend };
}

// ============================================================
//  CircularProgress SVG ring
// ============================================================
function CircularProgress({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = matchColor(score);
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="var(--color-gray-100)" strokeWidth={4} />
        <circle
          cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color }}>{score}%</span>
      </div>
    </div>
  );
}

// ============================================================
//  Constants
// ============================================================
const OFFER_TEMPLATES = [
  { name: 'Single Owner, Low KM', text: 'Single owner, well-maintained, complete service history available. Insurance valid till next year.' },
  { name: 'Certified Pre-Owned', text: 'Fully inspected, certified pre-owned. All papers clear, no accidents, ready for RC transfer.' },
  { name: 'Competitive Pricing', text: 'Best market price, flexible on negotiation. Test drive available at our dealership location.' },
];

type SortOrder = 'newest' | 'oldest' | 'budget' | 'match';
const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest', oldest: 'Oldest', budget: 'Highest Budget', match: 'Best Match',
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
const BrokerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requirements, offers, addOffer, brokerListings, addBrokerListing, removeBrokerListing } = useData();
  const { brands } = useCatalog();

  const carouselRef = useRef<HTMLDivElement>(null);

  // — Offer form state —
  const [activeReqId, setActiveReqId] = useState<number | null>(null);
  const [price, setPrice] = useState('');
  const [details, setDetails] = useState('');
  const [offerError, setOfferError] = useState('');

  // — Tab / list car state —
  const [activeTab, setActiveTab] = useState<'marketplace' | 'inventory'>('marketplace');
  const [showListForm, setShowListForm] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // — NEW feature state —
  const [savedReqIds, setSavedReqIds] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [inventoryPickerReqId, setInventoryPickerReqId] = useState<number | null>(null);

  // — List Car form state —
  const [listForm, setListForm] = useState<{
    make: string; model: string; variant: string; year: number; price: number;
    fuelType: CarListing['fuelType']; transmission: CarListing['transmission'];
    bodyType: CarListing['bodyType']; color: string; city: string;
    kmDriven: number; owners: number; description: string;
  }>({
    make: '', model: '', variant: '', year: 2024, price: 0,
    fuelType: 'Petrol', transmission: 'Manual', bodyType: 'SUV',
    color: '', city: '', kmDriven: 0, owners: 1, description: '',
  });

  /* ---- PENDING STATE ---- */
  if (user?.status === 'pending') {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: '520px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '48px 36px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-warning-bg)', color: 'var(--color-warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Clock size={28} />
            </div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '8px' }}>Verification Pending</h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-500)', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto 32px' }}>
              Your broker application is under review. You'll receive full marketplace access once an admin approves your account.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ---- COMPUTED DATA ---- */
  const openReqs = requirements.filter(r => r.status === 'open');
  const myOffers = offers.filter(o => o.brokerId === user?.id);
  const myListings = brokerListings.filter(l => l.brokerId === user?.id);
  const activeListings = myListings.filter(l => l.status === 'active');
  const acceptedOffers = myOffers.filter(o => o.status === 'accepted');
  const revenue = acceptedOffers.reduce((sum, o) => sum + (parseBudgetLakh(o.price) ?? 0), 0);

  const sortedReqs = [...openReqs].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'budget':  return (parseBudgetLakh(b.budget) ?? 0) - (parseBudgetLakh(a.budget) ?? 0);
      case 'match':   return calcMatchScore(b, myListings) - calcMatchScore(a, myListings);
      default:        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Sidebar target requirement: the one the broker has the offer form open for, or first in the sorted list
  const sidebarReq = (activeReqId ? requirements.find(r => r.id === activeReqId) : null) ?? sortedReqs[0] ?? null;

  const latestOffer = myOffers.length > 0
    ? [...myOffers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;
  const latestOfferReq = latestOffer ? requirements.find(r => r.id === latestOffer.requirementId) : null;
  const buyerReqCount = sidebarReq ? requirements.filter(r => r.buyerId === sidebarReq.buyerId).length : 0;

  /* ---- HANDLERS ---- */
  const handleSubmitOffer = (e: React.FormEvent, reqId: number) => {
    e.preventDefault();
    if (!user?.phone) {
      const msg = 'Add your contact number in your broker profile before sending offers.';
      setOfferError(msg);
      toast.error(msg);
      return;
    }
    if (user?.id && user?.businessName) {
      addOffer({ requirementId: reqId, brokerId: user.id, brokerName: user.businessName, brokerPhone: user.phone, price, details });
      setOfferError('');
      setActiveReqId(null);
      setInventoryPickerReqId(null);
      setShowTemplates(false);
      setPrice(''); setDetails('');
    }
  };

  const handleListCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user?.businessName) return;
    const listingId = await addBrokerListing({ brokerId: user.id, brokerName: user.businessName, ...listForm });
    if (listingId && imageFiles.length > 0) {
      const formData = new FormData();
      imageFiles.forEach(f => formData.append('images', f));
      const token = getToken();
      const uploadHeaders: Record<string, string> = {};
      if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;
      try {
        await fetch(`/api/listings/${listingId}/images`, { method: 'POST', headers: uploadHeaders, body: formData });
        toast.success(`${imageFiles.length} image(s) uploaded`);
      } catch { toast.error('Image upload failed'); }
    }
    setShowListForm(false);
    setImageFiles([]);
    setListForm({ make: '', model: '', variant: '', year: 2024, price: 0, fuelType: 'Petrol', transmission: 'Manual', bodyType: 'SUV', color: '', city: '', kmDriven: 0, owners: 1, description: '' });
  };

  const toggleSave = (reqId: number) =>
    setSavedReqIds(prev => prev.includes(reqId) ? prev.filter(id => id !== reqId) : [...prev, reqId]);

  const selectedBrand = brands.find(b => b.name === listForm.make);

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <section className="section" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>

        {/* ===== PAGE HEADER ===== */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title">Broker Dashboard</h1>
            <p className="page-subtitle">Respond to buyer requirements and manage your car inventory.</p>
          </div>
          <button onClick={() => { setActiveTab('inventory'); setShowListForm(true); }} className="btn btn-primary btn-sm">
            <Plus size={15} /> List a Car
          </button>
        </div>

        {/* ===== STATS BAR ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { icon: <Target size={20} />, value: openReqs.length, label: 'Active Requirements', color: '#2563eb', bg: '#eff6ff' },
            { icon: <Send size={20} />, value: myOffers.length, label: 'Offers Submitted', color: '#7c3aed', bg: '#f5f3ff' },
            { icon: <CheckCircle2 size={20} />, value: acceptedOffers.length, label: 'Deals Accepted', color: '#059669', bg: '#ecfdf5' },
            {
              icon: <span style={{ fontSize: '1.0625rem', fontWeight: 800, lineHeight: 1 }}>₹</span>,
              value: revenue > 0 ? `₹${revenue.toFixed(1)}L` : '₹0L',
              label: 'Revenue Generated', color: '#d97706', bg: '#fffbeb',
            },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                background: stat.bg, color: stat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-dark)', lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)', marginTop: '4px', fontWeight: 500 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ===== TAB SWITCHER ===== */}
        <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '2px solid var(--color-gray-200)' }}>
          {(['marketplace', 'inventory'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '12px 24px', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.875rem',
              background: 'transparent',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-gray-500)',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'all 0.2s',
            }}>
              {tab === 'marketplace' ? `Buyer Requirements (${openReqs.length})` : `My Inventory (${activeListings.length})`}
            </button>
          ))}
        </div>

        {/* ===== MARKETPLACE TAB ===== */}
        {activeTab === 'marketplace' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>

            {/* ---- LEFT COLUMN: Requirements ---- */}
            <div>
              {/* Sort header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-dark)' }}>Active Requirements</h2>
                  <span className="badge badge-active">{sortedReqs.length}</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSortMenu(p => !p)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8125rem', gap: '6px' }}
                  >
                    Sort by: {SORT_LABELS[sortOrder]} <ChevronDown size={13} />
                  </button>
                  {showSortMenu && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '6px',
                      background: '#fff', border: '1px solid var(--color-gray-200)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                      zIndex: 50, minWidth: '180px', overflow: 'hidden',
                    }}>
                      {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([key, label]) => (
                        <button key={key} onClick={() => { setSortOrder(key); setShowSortMenu(false); }}
                          style={{
                            display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                            background: sortOrder === key ? 'var(--color-primary-light)' : '#fff',
                            color: sortOrder === key ? 'var(--color-primary)' : 'var(--color-gray-700)',
                            fontWeight: sortOrder === key ? 700 : 500, fontSize: '0.8125rem',
                            textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements list */}
              {sortedReqs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><AlertCircle size={24} /></div>
                  <p className="empty-state-title">No active requirements</p>
                  <p className="empty-state-text">Check back soon — new buyer requirements drop every minute.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sortedReqs.map(req => {
                    const alreadyOffered = offers.some(o => o.requirementId === req.id && o.brokerId === user?.id);
                    const score = calcMatchScore(req, myListings);
                    const color = matchColor(score);
                    const label = matchLabel(score);
                    const reasons = getMatchReasons(req, myListings);
                    const competition = offers.filter(o => o.requirementId === req.id).length;
                    const isSaved = savedReqIds.includes(req.id);
                    const expires = expiresIn(req.createdAt);
                    const matchingInventory = myListings.filter(
                      l => l.status === 'active' &&
                        (l.make.toLowerCase() === req.make.toLowerCase() || l.model.toLowerCase() === req.model.toLowerCase())
                    );

                    return (
                      <div key={req.id} className="card animate-in" style={{ padding: '20px' }}>

                        {/* Card header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                              REQ #{String(req.id).slice(-8).toUpperCase()}
                            </p>
                            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-dark)' }}>{req.make} {req.model}</h3>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                              Budget: <strong style={{ color: 'var(--color-dark)' }}>{req.budget}</strong>
                              {req.yearRange && ` · ${req.yearRange}`}
                            </p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* Verified Buyer badge */}
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                background: '#ecfdf5', color: '#059669',
                                fontSize: '0.6875rem', fontWeight: 700, whiteSpace: 'nowrap',
                              }}>
                                <CheckCircle2 size={10} /> Verified Buyer
                              </span>
                              {/* Save star */}
                              <button
                                onClick={() => toggleSave(req.id)}
                                title={isSaved ? 'Unsave' : 'Save requirement'}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: isSaved ? '#d97706' : 'var(--color-gray-300)', transition: 'color 0.2s' }}
                              >
                                <Star size={16} fill={isSaved ? '#d97706' : 'none'} />
                              </button>
                            </div>
                            {/* Timestamps */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-400)' }}>
                                Posted {timeAgo(req.createdAt)}
                              </span>
                              {expires && (
                                <span style={{
                                  display: 'flex', alignItems: 'center', gap: '3px',
                                  fontSize: '0.6875rem', fontWeight: 700,
                                  color: expires.urgent ? '#e63946' : '#d97706',
                                }}>
                                  <Clock size={10} /> Expires in {expires.text}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Description quote */}
                        {req.description && (
                          <div style={{
                            padding: '10px 14px', background: 'var(--color-gray-50)',
                            borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
                            color: 'var(--color-gray-600)', lineHeight: 1.6,
                            border: '1px solid var(--color-gray-100)', marginBottom: '14px',
                            fontStyle: 'italic',
                          }}>
                            "{req.description}"
                          </div>
                        )}

                        {/* Match score + reasons + competition row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginBottom: '14px', flexWrap: 'wrap' }}>

                          {/* Match ring */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', background: 'var(--color-gray-50)',
                            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-100)', flex: '0 0 auto',
                          }}>
                            <CircularProgress score={score} />
                            <div>
                              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: '2px' }}>Match Score</p>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color }}>{label}</p>
                            </div>
                          </div>

                          {/* Match reasons */}
                          <div style={{
                            flex: 1, minWidth: '160px', padding: '10px 12px',
                            background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-gray-100)',
                          }}>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: '7px' }}>Top Match Reasons</p>
                            {reasons.map((r, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                <CheckCircle2 size={11} color="#059669" />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-600)', fontWeight: 500 }}>{r}</span>
                              </div>
                            ))}
                          </div>

                          {/* Competition count */}
                          <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '10px 14px', background: 'var(--color-gray-50)',
                            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-100)',
                            flex: '0 0 auto', textAlign: 'center',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                              <Users size={14} color="var(--color-gray-500)" />
                              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark)' }}>{competition}</span>
                            </div>
                            <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-500)', fontWeight: 500, whiteSpace: 'nowrap' }}>Brokers responded</span>
                          </div>
                        </div>

                        {/* CTA buttons */}
                        {!alreadyOffered && activeReqId !== req.id && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => { setOfferError(''); setActiveReqId(req.id); setInventoryPickerReqId(null); setShowTemplates(false); }}
                              className="btn btn-primary btn-sm"
                            >
                              <Send size={13} /> Make an Offer
                            </button>
                            {matchingInventory.length > 0 && (
                              <button
                                onClick={() => { setOfferError(''); setActiveReqId(req.id); setInventoryPickerReqId(req.id); setShowTemplates(false); }}
                                className="btn btn-secondary btn-sm"
                              >
                                <Car size={13} /> Select from My Inventory
                              </button>
                            )}
                          </div>
                        )}

                        {alreadyOffered && activeReqId !== req.id && (
                          <span className="badge badge-active">
                            <CheckCircle2 size={10} /> Offer Submitted
                          </span>
                        )}

                        {/* Inventory picker panel */}
                        {activeReqId === req.id && inventoryPickerReqId === req.id && matchingInventory.length > 0 && (
                          <div className="animate-in" style={{
                            marginTop: '12px', padding: '14px', background: '#f8fafc',
                            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)',
                          }}>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-gray-500)', marginBottom: '10px', textTransform: 'uppercase' }}>
                              Select from your inventory
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {matchingInventory.map(l => (
                                <button
                                  key={l.id}
                                  onClick={() => {
                                    setPrice(`₹${l.price}L`);
                                    setDetails(`${l.year} ${l.make} ${l.model}${l.variant ? ' ' + l.variant : ''}, ${l.kmDriven.toLocaleString()} km, ${l.fuelType}, ${l.transmission}, ${l.city}`);
                                    setInventoryPickerReqId(null);
                                  }}
                                  style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 12px', background: '#fff', border: '1px solid var(--color-gray-200)',
                                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
                                    transition: 'border-color 0.15s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-gray-200)')}
                                >
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-dark)' }}>
                                    {l.year} {l.make} {l.model} {l.variant}
                                  </span>
                                  <span style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 700 }}>₹{l.price}L</span>
                                </button>
                              ))}
                              <button onClick={() => setInventoryPickerReqId(null)} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Offer form */}
                        {activeReqId === req.id && (
                          <form
                            onSubmit={e => handleSubmitOffer(e, req.id)}
                            className="animate-in"
                            style={{ marginTop: '12px', padding: '16px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-dark)' }}>Your Offer</h4>
                              <button
                                type="button"
                                onClick={() => setShowTemplates(p => !p)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  fontSize: '0.75rem', color: 'var(--color-info)', fontWeight: 600,
                                  fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px',
                                }}
                              >
                                <FileText size={12} /> Templates
                              </button>
                            </div>

                            {/* Templates dropdown */}
                            {showTemplates && (
                              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {OFFER_TEMPLATES.map((t, i) => (
                                  <button key={i} type="button" onClick={() => { setDetails(t.text); setShowTemplates(false); }}
                                    style={{
                                      padding: '8px 12px', background: '#fff', border: '1px solid var(--color-gray-200)',
                                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
                                      textAlign: 'left', transition: 'border-color 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-gray-200)')}
                                  >
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-dark)', display: 'block' }}>{t.name}</span>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>{t.text.slice(0, 65)}…</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Price (On Road)</label>
                                <input className="form-control" value={price} onChange={e => setPrice(e.target.value)} placeholder="₹19.5L" required />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Details</label>
                                <input className="form-control" value={details} onChange={e => setDetails(e.target.value)} placeholder="2021 XLE, 32K km, single owner" required />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="submit" className="btn btn-primary btn-sm">Submit Offer</button>
                              <button
                                type="button"
                                onClick={() => { setOfferError(''); setActiveReqId(null); setShowTemplates(false); setInventoryPickerReqId(null); }}
                                className="btn btn-ghost btn-sm"
                              >
                                Cancel
                              </button>
                            </div>
                            {offerError && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '8px' }}>{offerError}</p>
                            )}
                          </form>
                        )}

                        {/* Save footer row */}
                        {!alreadyOffered && activeReqId !== req.id && (
                          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => toggleSave(req.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                              fontSize: '0.75rem', color: isSaved ? '#d97706' : 'var(--color-gray-400)',
                              display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
                            }}>
                              <Star size={13} fill={isSaved ? '#d97706' : 'none'} />
                              {isSaved ? 'Saved' : 'Save Requirement'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ---- Other Requirements Carousel ---- */}
              {openReqs.length > 1 && (
                <div style={{ marginTop: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-dark)' }}>Other Active Requirements</h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => carouselRef.current?.scrollBy({ left: -230, behavior: 'smooth' })}
                        className="btn btn-secondary btn-sm" style={{ padding: '5px 9px' }}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        onClick={() => carouselRef.current?.scrollBy({ left: 230, behavior: 'smooth' })}
                        className="btn btn-secondary btn-sm" style={{ padding: '5px 9px' }}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                  <div
                    ref={carouselRef}
                    style={{
                      display: 'flex', gap: '12px', overflowX: 'auto',
                      scrollbarWidth: 'none', paddingBottom: '4px',
                      scrollSnapType: 'x mandatory',
                    }}
                  >
                    {openReqs
                      .filter(r => r.id !== sortedReqs[0]?.id)
                      .map(req => {
                        const score = calcMatchScore(req, myListings);
                        const color = matchColor(score);
                        return (
                          <div
                            key={req.id}
                            onClick={() => { setActiveReqId(null); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50); }}
                            style={{
                              minWidth: '190px', maxWidth: '190px', padding: '14px',
                              background: '#fff', border: '1px solid var(--color-gray-200)',
                              borderRadius: 'var(--radius-md)', cursor: 'pointer',
                              scrollSnapAlign: 'start', flexShrink: 0,
                              transition: 'box-shadow 0.2s, border-color 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--color-gray-300)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--color-gray-200)'; }}
                          >
                            {/* Car icon placeholder */}
                            <div style={{
                              width: '100%', height: '72px', background: 'var(--color-gray-100)',
                              borderRadius: 'var(--radius-sm)', marginBottom: '10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Car size={28} color="var(--color-gray-300)" />
                            </div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-dark)', marginBottom: '2px' }}>{req.make} {req.model}</p>
                            <p style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)', marginBottom: '8px' }}>
                              {req.budget}{req.yearRange ? ` · ${req.yearRange}` : ''}
                            </p>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '2px 8px', borderRadius: 'var(--radius-full)',
                              background: color + '18', color,
                              fontSize: '0.625rem', fontWeight: 700,
                            }}>
                              {score}% Match
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* ---- RIGHT SIDEBAR ---- */}
            <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* My Offer Status */}
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-dark)' }}>My Offer Status</span>
                  {myOffers.length > 0 && (
                    <span style={{
                      background: 'var(--color-primary)', color: '#fff', fontSize: '0.625rem', fontWeight: 700,
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {myOffers.length}
                    </span>
                  )}
                </div>
                {latestOffer && latestOfferReq ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{
                        width: '56px', height: '44px', background: 'var(--color-gray-100)',
                        borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Car size={18} color="var(--color-gray-400)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {latestOfferReq.make} {latestOfferReq.model}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>{latestOffer.price}</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--color-gray-400)' }}>{timeAgo(latestOffer.createdAt)}</p>
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: 'var(--radius-full)',
                      color: latestOffer.status === 'accepted' ? '#059669' : latestOffer.status === 'rejected' ? '#e63946' : '#d97706',
                      background: latestOffer.status === 'accepted' ? '#ecfdf5' : latestOffer.status === 'rejected' ? '#fef2f2' : '#fffbeb',
                    }}>
                      {latestOffer.status}
                    </span>
                    <button style={{
                      marginTop: '12px', width: '100%', padding: '8px',
                      border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-sm)',
                      background: '#fff', cursor: 'pointer', fontFamily: 'var(--font)',
                      fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-700)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      View All Offers <ArrowRight size={13} />
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', textAlign: 'center', padding: '16px 0' }}>No offers submitted yet.</p>
                )}
              </div>

              {/* Buyer Details */}
              {sidebarReq && (
                <div className="card" style={{ padding: '16px' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-dark)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} /> Buyer Details
                  </p>
                  {[
                    { label: 'Looking For', value: `${sidebarReq.make} ${sidebarReq.model}` },
                    { label: 'Budget', value: sidebarReq.budget },
                    { label: 'Year Range', value: sidebarReq.yearRange || '—' },
                    { label: 'Requirements Posted', value: buyerReqCount },
                    { label: 'Phone', value: 'On offer acceptance' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>{label}</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-dark)', maxWidth: '130px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Suggested Price */}
              {sidebarReq && (() => {
                const s = getSuggestedPrice(sidebarReq, myListings);
                if (s.avg === null) return null;
                return (
                  <div className="card" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-dark)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color="#d97706" /> Suggested Price (AI)
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>Market Average</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-dark)' }}>₹{s.avg}L</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>Recommended Offer</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#059669' }}>₹{s.low}L – ₹{s.high}L</span>
                    </div>
                    {s.trend && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>Price Trend</span>
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '3px',
                          color: s.trend === 'low' ? '#059669' : s.trend === 'high' ? '#e63946' : '#d97706',
                        }}>
                          {s.trend === 'low' ? <TrendingDown size={11} /> : s.trend === 'high' ? <TrendingUp size={11} /> : null}
                          {s.trend === 'low' ? 'Slightly Low' : s.trend === 'high' ? 'Above Market' : 'Fair Market'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quick Actions */}
              <div className="card" style={{ padding: '16px' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-dark)', marginBottom: '12px' }}>Quick Actions</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center' }}>
                  {[
                    {
                      icon: <MessageCircle size={18} />, label: 'Chat with Buyer',
                      action: () => toast('Chat feature coming soon!', { icon: '💬' }),
                    },
                    {
                      icon: <Car size={18} />, label: 'View Inventory',
                      action: () => setActiveTab('inventory'),
                    },
                    {
                      icon: <FileText size={18} />, label: 'Offer Templates',
                      action: () => {
                        if (sortedReqs[0]) { setActiveReqId(sortedReqs[0].id); setShowTemplates(true); }
                        else toast('Open a requirement first to use templates.', { icon: '📋' });
                      },
                    },
                    {
                      icon: <HelpCircle size={18} />, label: 'Help Center',
                      action: () => toast('Email: support@carmatchr.com', { icon: '🤝' }),
                    },
                  ].map(({ icon, label, action }) => (
                    <button
                      key={label} onClick={action}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                        borderRadius: 'var(--radius-sm)', transition: 'background 0.15s', fontFamily: 'var(--font)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-gray-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ color: 'var(--color-gray-600)' }}>{icon}</div>
                      <span style={{ fontSize: '0.5625rem', color: 'var(--color-gray-500)', fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== INVENTORY TAB ===== */}
        {activeTab === 'inventory' && (
          <div>
            {/* List Car Form */}
            {showListForm && (
              <div className="card animate-in" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-dark)' }}>
                    <Car size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
                    List a Car for Sale
                  </h3>
                  <button onClick={() => setShowListForm(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
                </div>

                <form onSubmit={handleListCar}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Make *</label>
                      <select className="form-control" required value={listForm.make}
                        onChange={e => setListForm({ ...listForm, make: e.target.value, model: '' })}>
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Model *</label>
                      <select className="form-control" required value={listForm.model}
                        onChange={e => setListForm({ ...listForm, model: e.target.value })} disabled={!listForm.make}>
                        <option value="">Select Model</option>
                        {selectedBrand?.models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Variant</label>
                      <input className="form-control" value={listForm.variant}
                        onChange={e => setListForm({ ...listForm, variant: e.target.value })} placeholder="e.g. ZXi+" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Year *</label>
                      <input type="number" className="form-control" required min={2000} max={2026}
                        value={listForm.year} onChange={e => setListForm({ ...listForm, year: Number(e.target.value) })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Price (₹ Lakh) *</label>
                      <input type="number" className="form-control" required step="0.1" min={0.1}
                        value={listForm.price || ''} onChange={e => setListForm({ ...listForm, price: Number(e.target.value) })} placeholder="12.5" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">KM Driven *</label>
                      <input type="number" className="form-control" required min={0}
                        value={listForm.kmDriven || ''} onChange={e => setListForm({ ...listForm, kmDriven: Number(e.target.value) })} placeholder="25000" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Owners</label>
                      <input type="number" className="form-control" min={1} max={5}
                        value={listForm.owners} onChange={e => setListForm({ ...listForm, owners: Number(e.target.value) })} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Fuel Type</label>
                      <select className="form-control" value={listForm.fuelType}
                        onChange={e => setListForm({ ...listForm, fuelType: e.target.value as CarListing['fuelType'] })}>
                        {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Transmission</label>
                      <select className="form-control" value={listForm.transmission}
                        onChange={e => setListForm({ ...listForm, transmission: e.target.value as CarListing['transmission'] })}>
                        {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Body Type</label>
                      <select className="form-control" value={listForm.bodyType}
                        onChange={e => setListForm({ ...listForm, bodyType: e.target.value as CarListing['bodyType'] })}>
                        {bodyTypes.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">City *</label>
                      <select className="form-control" required value={listForm.city}
                        onChange={e => setListForm({ ...listForm, city: e.target.value })}>
                        <option value="">Select City</option>
                        {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '14px', marginTop: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Color</label>
                      <input className="form-control" value={listForm.color}
                        onChange={e => setListForm({ ...listForm, color: e.target.value })} placeholder="Pearl White" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Description</label>
                      <input className="form-control" value={listForm.description}
                        onChange={e => setListForm({ ...listForm, description: e.target.value })} placeholder="Well-maintained, service history available, insurance till 2026" />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="form-group" style={{ margin: 0, marginTop: '14px' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImagePlus size={14} /> Car Images (max 10)
                    </label>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp"
                      onChange={e => setImageFiles(Array.from(e.target.files || []))}
                      style={{ fontSize: '0.8125rem' }} />
                    {imageFiles.length > 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '4px' }}>
                        {imageFiles.length} file(s) selected
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary"><Plus size={15} /> Add to Marketplace</button>
                    <button type="button" onClick={() => setShowListForm(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Inventory Grid */}
            {!showListForm && activeListings.length === 0 ? (
              <div className="empty-state" style={{ margin: '40px 0' }}>
                <div className="empty-state-icon"><Car size={24} /></div>
                <p className="empty-state-title">No cars listed yet</p>
                <p className="empty-state-text">List your available cars to reach thousands of buyers on the CarMatchr marketplace.</p>
                <button onClick={() => setShowListForm(true)} className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
                  <Plus size={15} /> List Your First Car
                </button>
              </div>
            ) : !showListForm && (
              <div className="grid grid-3" style={{ gap: '16px' }}>
                {myListings.map(car => (
                  <div key={car.id} className="card" style={{ padding: '16px', opacity: car.status === 'sold' ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-dark)' }}>
                          {car.year} {car.make} {car.model}
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{car.variant} · {car.color}</p>
                      </div>
                      <span className={`badge ${car.status === 'active' ? 'badge-active' : 'badge-pending'}`}
                        style={{ textTransform: 'uppercase', fontSize: '0.625rem' }}>
                        {car.status === 'active' ? 'LIVE' : 'SOLD'}
                      </span>
                    </div>

                    <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-primary)', margin: '8px 0' }}>
                      ₹{car.price} Lakh
                    </p>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.6875rem', color: 'var(--color-gray-500)', marginBottom: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Gauge size={11} /> {car.kmDriven.toLocaleString()} km</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Fuel size={11} /> {car.fuelType}</span>
                      <span>{car.transmission === 'Automatic' ? 'AT' : 'MT'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-gray-100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>
                          <MapPin size={10} /> {car.city}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6875rem', color: 'var(--color-info)', fontWeight: 600 }}>
                          <Users size={10} /> {car.leadsCount ?? 0} leads
                        </span>
                      </div>
                      {car.status === 'active' && (
                        <button onClick={() => removeBrokerListing(car.id)}
                          className="btn btn-ghost btn-sm" style={{ fontSize: '0.6875rem', color: 'var(--color-gray-400)' }}>
                          Mark as Sold
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};

export default BrokerDashboard;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Plus, X, Check, Clock, MessageSquare, Loader2, ChevronDown, Car, Sparkles, Phone, Tag, CalendarRange } from 'lucide-react';
import { useCatalog } from '../../hooks/useCatalog';
import toast from 'react-hot-toast';

const YEAR_LIST = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requirements, offers, addRequirement, acceptOffer, rejectOffer, markOfferRead } = useData();
  const { brands } = useCatalog();
  const [showForm, setShowForm] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [feature, setFeature] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedBrand = brands.find((b) => b.name === make);
  const modelFeatures = selectedBrand?.models.find((m) => m.name === model)?.features ?? [];

  useEffect(() => {
    const pending = sessionStorage.getItem('pending_requirement');
    if (pending && user?.role === 'buyer' && user.id) {
      const { make, model, budget, yearRange, description } = JSON.parse(pending);
      sessionStorage.removeItem('pending_requirement');
      addRequirement({
        buyerId: user.id,
        make,
        model,
        yearRange: yearRange || '2020-2024',
        budget,
        preferredFeature: '',
        description: description || 'Looking for a clean vehicle in good condition.'
      })
        .then(() => toast.success('Your pending requirement has been posted successfully!'))
        .catch(() => toast.error('Failed to post pending requirement.'));
    }
  }, [user, addRequirement]);

  const myReqs = requirements.filter(r => r.buyerId === user?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!make) { toast.error('Please select a car brand.'); return; }
    if (!model) { toast.error('Please select a car model.'); return; }
    if (!budget.trim()) { toast.error('Please enter your budget.'); return; }
    if (!user?.id) { toast.error('Please log in first.'); return; }

    const yearRange = minYear && maxYear ? `${minYear}-${maxYear}` : minYear || maxYear;
    if (!yearRange) { toast.error('Please select at least a minimum year.'); return; }
    if (minYear && maxYear && parseInt(minYear) > parseInt(maxYear)) {
      toast.error('Min year cannot be greater than Max year.'); return;
    }

    setSubmitting(true);
    try {
      await addRequirement({ buyerId: user.id, make, model, yearRange, budget, preferredFeature: feature, description });
      toast.success('Requirement posted! Brokers will now send you offers.');
      setShowForm(false);
      setMake(''); setModel(''); setFeature(''); setMinYear(''); setMaxYear(''); setBudget(''); setDescription('');
    } catch {
      toast.error('Failed to post requirement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '900px' }}>

        {/* ===== PAGE HEADER ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(230,57,70,0.08)', color: 'var(--color-primary)',
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.6875rem',
              fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px',
            }}>
              <Sparkles size={11} /> My Dashboard
            </div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '4px' }}>
              My Requirements
            </h1>
            <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>Post what you need. Brokers compete to find it for you.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 22px', borderRadius: '12px', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 700,
              fontSize: '0.9375rem', transition: 'all 0.2s',
              background: showForm ? '#f1f5f9' : 'linear-gradient(135deg, var(--color-primary), #c1121f)',
              color: showForm ? '#64748b' : '#fff',
              boxShadow: showForm ? 'none' : '0 4px 16px rgba(230,57,70,0.35)',
            }}
          >
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Requirement</>}
          </button>
        </div>

        {/* ===== POST REQUIREMENT FORM ===== */}
        {showForm && (
          <div style={{
            background: '#fff', borderRadius: '20px', marginBottom: '36px',
            boxShadow: '0 8px 40px rgba(15,23,42,0.1)',
            overflow: 'hidden', border: '1px solid rgba(230,57,70,0.15)',
          }} className="animate-in">

            {/* Form header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '24px 28px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-40px', right: '-40px',
                width: '160px', height: '160px', borderRadius: '50%',
                background: 'rgba(230,57,70,0.15)',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(230,57,70,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Car size={20} color="#f87171" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>Post a New Requirement</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fill in the details and brokers will contact you within hours</p>
                </div>
              </div>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} style={{ padding: '28px' }}>

              {/* Row 1: Make + Model */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Make *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      required
                      value={make}
                      onChange={e => { setMake(e.target.value); setModel(''); }}
                      style={{
                        width: '100%', padding: '12px 36px 12px 14px',
                        borderRadius: '10px', border: '2px solid #e2e8f0',
                        fontFamily: 'var(--font)', fontSize: '0.9375rem',
                        color: make ? '#0f172a' : '#94a3b8', background: '#fff',
                        appearance: 'none', cursor: 'pointer', outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    >
                      <option value="">Select make</option>
                      {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Model *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      required
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      disabled={!make}
                      style={{
                        width: '100%', padding: '12px 36px 12px 14px',
                        borderRadius: '10px', border: '2px solid #e2e8f0',
                        fontFamily: 'var(--font)', fontSize: '0.9375rem',
                        color: model ? '#0f172a' : '#94a3b8', background: make ? '#fff' : '#f8fafc',
                        appearance: 'none', cursor: make ? 'pointer' : 'not-allowed', outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    >
                      <option value="">Select model</option>
                      {selectedBrand?.models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                    <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Row 2: Year Range + Preferred Feature */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <CalendarRange size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Year Range *
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <select
                        required
                        value={minYear}
                        onChange={e => setMinYear(e.target.value)}
                        style={{
                          width: '100%', padding: '12px 32px 12px 12px',
                          borderRadius: '10px', border: '2px solid #e2e8f0',
                          fontFamily: 'var(--font)', fontSize: '0.875rem',
                          color: minYear ? '#0f172a' : '#94a3b8', background: '#fff',
                          appearance: 'none', cursor: 'pointer', outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      >
                        <option value="">From</option>
                        {YEAR_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                    <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>—</span>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <select
                        value={maxYear}
                        onChange={e => setMaxYear(e.target.value)}
                        style={{
                          width: '100%', padding: '12px 32px 12px 12px',
                          borderRadius: '10px', border: '2px solid #e2e8f0',
                          fontFamily: 'var(--font)', fontSize: '0.875rem',
                          color: maxYear ? '#0f172a' : '#94a3b8', background: '#fff',
                          appearance: 'none', cursor: 'pointer', outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      >
                        <option value="">To (opt.)</option>
                        {YEAR_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Preferred Feature
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={feature}
                      onChange={e => setFeature(e.target.value)}
                      disabled={!model}
                      style={{
                        width: '100%', padding: '12px 36px 12px 14px',
                        borderRadius: '10px', border: '2px solid #e2e8f0',
                        fontFamily: 'var(--font)', fontSize: '0.9375rem',
                        color: feature ? '#0f172a' : '#94a3b8', background: model ? '#fff' : '#f8fafc',
                        appearance: 'none', cursor: model ? 'pointer' : 'not-allowed', outline: 'none',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    >
                      <option value="">Any feature</option>
                      {modelFeatures.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                    <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Row 3: Budget */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Budget (₹ Lakhs) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    fontWeight: 800, fontSize: '1rem', color: '#94a3b8', pointerEvents: 'none',
                  }}>₹</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.5"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="e.g. 15.5"
                    style={{
                      width: '100%', padding: '12px 14px 12px 30px',
                      borderRadius: '10px', border: '2px solid #e2e8f0',
                      fontFamily: 'var(--font)', fontSize: '0.9375rem',
                      color: '#0f172a', outline: 'none', transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Lakhs</span>
                </div>
              </div>

              {/* Row 4: Description */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Additional Details
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Condition preferences, color, urgency, trim level..."
                  style={{
                    width: '100%', padding: '12px 14px',
                    borderRadius: '10px', border: '2px solid #e2e8f0',
                    fontFamily: 'var(--font)', fontSize: '0.9375rem',
                    color: '#0f172a', resize: 'vertical', outline: 'none',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                    lineHeight: 1.6,
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '14px 24px',
                    background: submitting ? '#94a3b8' : 'linear-gradient(135deg, var(--color-primary), #c1121f)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    fontFamily: 'var(--font)', fontWeight: 700, fontSize: '1rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: submitting ? 'none' : '0 4px 16px rgba(230,57,70,0.35)',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {submitting
                    ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Posting…</>
                    : <><Sparkles size={16} /> Submit Requirement</>
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '14px 20px', background: '#f1f5f9',
                    color: '#64748b', border: 'none', borderRadius: '12px',
                    fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== EMPTY STATE ===== */}
        {myReqs.length === 0 && !showForm && (
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '64px 32px',
            textAlign: 'center', boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
            border: '2px dashed #e2e8f0',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: 'rgba(230,57,70,0.08)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <MessageSquare size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>No requirements yet</h3>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', lineHeight: 1.7, maxWidth: '360px', margin: '0 auto 24px' }}>
              Post your first car requirement and verified brokers will start sending you competitive offers.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '13px 28px',
                background: 'linear-gradient(135deg, var(--color-primary), #c1121f)',
                color: '#fff', border: 'none', borderRadius: '12px',
                fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.9375rem',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(230,57,70,0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Plus size={16} /> Post Your First Requirement
            </button>
          </div>
        )}

        {/* ===== REQUIREMENTS LIST ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {myReqs.map(req => {
            const reqOffers = offers.filter(o => o.requirementId === req.id);
            const newOffers = reqOffers.filter(o => !o.isRead && o.status === 'pending');
            return (
              <div key={req.id} style={{
                background: '#fff', borderRadius: '20px',
                boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
                border: '1px solid #e2e8f0', overflow: 'hidden',
              }}>
                {/* Req Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  padding: '20px 24px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.1)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Car size={20} color="#e2e8f0" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>{req.make} {req.model}</h3>
                        <span style={{
                          padding: '2px 10px', borderRadius: '20px', fontSize: '0.625rem',
                          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                          background: req.status === 'open' ? 'rgba(5,150,105,0.2)' : 'rgba(100,116,139,0.3)',
                          color: req.status === 'open' ? '#34d399' : '#94a3b8',
                        }}>
                          {req.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={11} /> ₹{req.budget}L
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarRange size={11} /> {req.yearRange}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '4px' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {newOffers.length > 0 && (
                      <span style={{
                        background: 'var(--color-primary)', color: '#fff',
                        padding: '3px 10px', borderRadius: '20px',
                        fontSize: '0.6875rem', fontWeight: 800,
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        animation: 'pulse 2s infinite',
                      }}>
                        🔔 {newOffers.length} new offer{newOffers.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  {/* Description */}
                  {req.description && (
                    <div style={{
                      background: '#f8fafc', borderRadius: '10px',
                      padding: '12px 16px', marginBottom: '16px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.875rem', color: '#475569', lineHeight: 1.7,
                      fontStyle: 'italic',
                    }}>
                      "{req.description}"
                    </div>
                  )}

                  {req.preferredFeature && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(124,58,237,0.08)', color: '#7c3aed',
                        padding: '4px 12px', borderRadius: '20px',
                        fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        ⭐ Preferred: {req.preferredFeature}
                      </span>
                    </div>
                  )}

                  {/* Offers header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Broker Offers</h4>
                    <span style={{
                      background: reqOffers.length > 0 ? 'var(--color-primary)' : '#e2e8f0',
                      color: reqOffers.length > 0 ? '#fff' : '#94a3b8',
                      width: '22px', height: '22px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight: 800,
                    }}>
                      {reqOffers.length}
                    </span>
                  </div>

                  {reqOffers.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '28px 16px',
                      background: '#f8fafc', borderRadius: '12px',
                      border: '1.5px dashed #e2e8f0',
                    }}>
                      <Clock size={20} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                      <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>Waiting for broker responses…</p>
                      <p style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>Usually within a few hours</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {reqOffers.sort((a, b) => (a.isRead === b.isRead ? 0 : a.isRead ? 1 : -1)).map(offer => {
                        const isAccepted = offer.status === 'accepted';
                        const isRejected = offer.status === 'rejected';
                        const isNew = !offer.isRead && offer.status === 'pending';
                        return (
                          <div
                            key={offer.id}
                            style={{
                              borderRadius: '14px', border: '2px solid',
                              borderColor: isAccepted ? '#10b981' : isRejected ? '#e2e8f0' : isNew ? '#e63946' : '#e2e8f0',
                              background: isAccepted ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)' : isRejected ? '#f8fafc' : isNew ? '#fff5f5' : '#fff',
                              opacity: isRejected ? 0.65 : 1,
                              padding: '16px 18px',
                              position: 'relative',
                              transition: 'all 0.2s',
                            }}
                          >
                            {isNew && (
                              <span style={{
                                position: 'absolute', top: '-10px', right: '16px',
                                background: 'var(--color-primary)', color: '#fff',
                                fontSize: '0.6rem', fontWeight: 900, padding: '2px 10px',
                                borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.08em',
                              }}>
                                New
                              </span>
                            )}

                            {/* Broker row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '10px',
                                  background: isAccepted ? 'rgba(16,185,129,0.1)' : 'rgba(15,23,42,0.06)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.9375rem', color: isAccepted ? '#059669' : '#334155',
                                }}>
                                  {offer.brokerName?.charAt(0)?.toUpperCase() || 'B'}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>{offer.brokerName}</span>
                                  {isAccepted && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <Check size={11} color="#059669" />
                                      <span style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 700 }}>Accepted</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span style={{
                                fontWeight: 900, fontSize: '1.1875rem',
                                color: isAccepted ? '#059669' : 'var(--color-primary)',
                                background: isAccepted ? 'rgba(16,185,129,0.08)' : 'rgba(230,57,70,0.06)',
                                padding: '4px 12px', borderRadius: '8px',
                              }}>
                                {offer.price}
                              </span>
                            </div>

                            {/* Contact reveal on accept */}
                            {isAccepted && offer.brokerPhone && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'rgba(16,185,129,0.1)', borderRadius: '8px',
                                padding: '8px 12px', marginBottom: '8px',
                              }}>
                                <Phone size={13} color="#059669" />
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669' }}>{offer.brokerPhone}</span>
                                <span style={{ fontSize: '0.6875rem', color: '#6ee7b7' }}>· Seller Contact</span>
                              </div>
                            )}

                            {/* Details */}
                            <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6, marginBottom: '12px' }}>{offer.details}</p>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {offer.status === 'pending' && req.status === 'open' && (
                                <>
                                  <button
                                    onClick={() => { markOfferRead(offer.id); acceptOffer(offer.id, req.id); }}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '6px',
                                      padding: '8px 16px', borderRadius: '8px', border: 'none',
                                      background: 'linear-gradient(135deg, #059669, #047857)',
                                      color: '#fff', fontFamily: 'var(--font)', fontWeight: 700,
                                      fontSize: '0.8125rem', cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                                    }}
                                  >
                                    <Check size={13} /> Accept
                                  </button>
                                  <button
                                    onClick={() => { markOfferRead(offer.id); rejectOffer(offer.id); }}
                                    style={{
                                      padding: '8px 14px', borderRadius: '8px',
                                      border: '1.5px solid #e2e8f0', background: '#fff',
                                      color: '#64748b', fontFamily: 'var(--font)', fontWeight: 600,
                                      fontSize: '0.8125rem', cursor: 'pointer',
                                    }}
                                  >
                                    Reject
                                  </button>
                                  {!offer.isRead && (
                                    <button
                                      onClick={() => markOfferRead(offer.id)}
                                      style={{
                                        marginLeft: 'auto', padding: '8px 12px', borderRadius: '8px',
                                        border: 'none', background: 'transparent',
                                        color: '#94a3b8', fontFamily: 'var(--font)', fontWeight: 600,
                                        fontSize: '0.75rem', cursor: 'pointer',
                                      }}
                                    >
                                      Mark as Read
                                    </button>
                                  )}
                                </>
                              )}
                              {isRejected && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                                  <X size={12} /> Rejected
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BuyerDashboard;

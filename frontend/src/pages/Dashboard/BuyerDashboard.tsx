import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useCatalog } from '../../hooks/useCatalog';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, X, Check, Clock, MessageSquare, Loader2, ChevronDown, Car, Sparkles,
  Phone, CalendarRange, Star, Bell, MapPin, List, Settings, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LocationSelector, type LocationValue, EMPTY_LOCATION, locationLabel } from '../../components/LocationSelector';

const YEAR_LIST = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

const parsePriceToNumber = (priceStr: string | number) => {
  if (!priceStr) return 0;
  if (typeof priceStr === 'number') return priceStr;
  
  if (String(priceStr).includes('-')) {
    const parts = String(priceStr).split('-');
    const upperLimit = parts[1];
    const clean = upperLimit.replace(/[₹,\sLakhs|L]/gi, '');
    const match = clean.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }
  
  const clean = String(priceStr).replace(/[₹,\sLakhs|L]/gi, '');
  const match = clean.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
};

const formatSavings = (savings: number) => {
  if (savings <= 0) return '₹0';
  if (savings < 1) {
    return `₹${Math.round(savings * 100000).toLocaleString('en-IN')}`;
  }
  return `₹${savings.toFixed(2)} Lakh`;
};

const getTransmission = (modelName: string, desc: string) => {
  const combined = (modelName + ' ' + desc).toLowerCase();
  if (combined.includes('automatic') || combined.includes('cvt') || combined.includes('dct') || combined.includes('amt') || combined.includes('auto')) {
    return 'Automatic';
  }
  return 'Manual';
};

const getFuelType = (modelName: string, desc: string) => {
  const combined = (modelName + ' ' + desc).toLowerCase();
  if (combined.includes('diesel')) return 'Diesel';
  if (combined.includes('ev') || combined.includes('electric')) return 'EV';
  if (combined.includes('cng')) return 'CNG';
  if (combined.includes('hybrid')) return 'Hybrid';
  return 'Petrol';
};

const extractLocation = (desc: string) => {
  const match = desc.match(/Preferred Location:\s*(.+)$/m);
  return match ? match[1].trim() : 'Tamil Nadu';
};

const getDealerRating = (brokerId: number) => {
  return (4.5 + (brokerId % 5) * 0.1).toFixed(1);
};

const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requirements, offers, addRequirement, acceptOffer, rejectOffer, markOfferRead } = useData();
  const { brands } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'active';
  
  const [showForm, setShowForm] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [feature, setFeature] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [submitting, setSubmitting] = useState(false);
  const [expandedReqs, setExpandedReqs] = useState<Record<number, boolean>>({});
  const [sortBy, setSortBy] = useState('latest');
  const [summaryReqId, setSummaryReqId] = useState<number | null>(null);

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

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const toggleExpand = (reqId: number) => {
    setExpandedReqs(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const myReqs = requirements.filter(r => r.buyerId === user?.id);

  // --- STATS CALCULATIONS ---
  const totalPosted = myReqs.length;
  const activeReqs = myReqs.filter(r => r.status === 'open').length;
  const completedReqs = myReqs.filter(r => r.status === 'closed').length;
  
  const myOffers = offers.filter(o => myReqs.some(r => r.id === o.requirementId));
  const totalOffersReceived = myOffers.length;

  let totalSavings = 0;
  myReqs.forEach(req => {
    if (req.status === 'closed') {
      const acceptedOffer = offers.find(o => o.requirementId === req.id && o.status === 'accepted');
      if (acceptedOffer) {
        const budgetNum = parsePriceToNumber(req.budget);
        const offerNum = parsePriceToNumber(acceptedOffer.price);
        if (budgetNum > offerNum) {
          totalSavings += (budgetNum - offerNum);
        }
      }
    }
  });

  // --- FILTERED DATA FOR MAIN VIEWS ---
  const getModelImage = (makeName: string, modelName: string) => {
    const brand = brands.find(b => b.name.toLowerCase() === makeName.toLowerCase());
    const model = brand?.models.find(m => m.name.toLowerCase() === modelName.toLowerCase());
    return model?.imageUrl || '/hero-car-new.png';
  };

  const getBrandLogo = (makeName: string) => {
    const brand = brands.find(b => b.name.toLowerCase() === makeName.toLowerCase());
    return brand?.logoUrl || null;
  };

  const getBestOffer = (reqId: number) => {
    const reqOffers = offers.filter(o => o.requirementId === reqId);
    if (reqOffers.length === 0) return null;
    const sorted = [...reqOffers].sort((a, b) => parsePriceToNumber(a.price) - parsePriceToNumber(b.price));
    return sorted[0];
  };

  const activeRequirementsList = myReqs.filter(r => r.status === 'open');
  const completedRequirementsList = myReqs.filter(r => r.status === 'closed');
  const historyReqs = myReqs.filter(r => r.status === 'closed');

  // Sort function for All Posted
  const getSortedReqs = () => {
    const list = [...myReqs];
    if (sortBy === 'latest') {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortBy === 'oldest') {
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (sortBy === 'budget_high') {
      return list.sort((a, b) => parsePriceToNumber(b.budget) - parsePriceToNumber(a.budget));
    }
    if (sortBy === 'budget_low') {
      return list.sort((a, b) => parsePriceToNumber(a.budget) - parsePriceToNumber(b.budget));
    }
    return list;
  };
  const sortedReqs = getSortedReqs();

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
      const locStr = locationLabel(location);
      await addRequirement({
        buyerId: user.id,
        make,
        model,
        yearRange,
        budget,
        preferredFeature: feature,
        description: description + (locStr ? `\nPreferred Location: ${locStr}` : '')
      });
      toast.success('Requirement posted! Brokers will now send you offers.');
      setShowForm(false);
      setMake(''); setModel(''); setFeature(''); setMinYear(''); setMaxYear(''); setBudget(''); setDescription(''); setLocation(EMPTY_LOCATION);
    } catch {
      toast.error('Failed to post requirement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderActiveTabContent = () => {
    if (currentTab === 'history') {
      return (
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Deal History</h3>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              {historyReqs.length} Closed Deal{historyReqs.length === 1 ? '' : 's'}
            </span>
          </div>
          {historyReqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
              <Clock size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>No history yet</div>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '4px', maxWidth: '320px', margin: '8px auto 0' }}>
                When you accept a broker's offer and close a requirement, it will show up here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posted Date</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responses</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Offer</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Savings</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyReqs.map(req => {
                    const reqOffers = offers.filter(o => o.requirementId === req.id);
                    const accepted = offers.find(o => o.requirementId === req.id && o.status === 'accepted');
                    const savings = accepted ? (parsePriceToNumber(req.budget) - parsePriceToNumber(accepted.price)) : 0;
                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.15s' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          {req.make} {req.model}
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                            {getFuelType(req.model, req.description)} • {getTransmission(req.model, req.description)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{req.budget}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155' }}>{extractLocation(req.description)}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#64748b' }}>
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', background: '#f1f5f9', color: '#64748b' }}>
                            Completed
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{reqOffers.length} Dealers</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                          {accepted ? accepted.price : '—'}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#059669', fontWeight: 700 }}>
                          {savings > 0 ? formatSavings(savings) : '₹0'}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <button
                            onClick={() => setSummaryReqId(req.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              color: '#475569',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            View Summary
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (currentTab === 'all') {
      return (
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>All Posted Requirements</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Sort by:</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="budget_high">Budget: High to Low</option>
                <option value="budget_low">Budget: Low to High</option>
              </select>
            </div>
          </div>
          {sortedReqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
              <Car size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>No requirements posted yet</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Car Requirement</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posted On</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responses</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Offer</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReqs.map(req => {
                    const reqOffers = offers.filter(o => o.requirementId === req.id);
                    const bestOffer = getBestOffer(req.id);
                    const isCompleted = req.status === 'closed';
                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.15s' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          {req.make} {req.model}
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                            {getFuelType(req.model, req.description)} • {getTransmission(req.model, req.description)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{req.budget}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155' }}>{extractLocation(req.description)}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#64748b' }}>
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: isCompleted ? '#f1f5f9' : '#ecfdf5',
                            color: isCompleted ? '#64748b' : '#059669'
                          }}>
                            {isCompleted ? 'Completed' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{reqOffers.length} Dealers</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                          {bestOffer ? bestOffer.price : '—'}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <button
                            onClick={() => {
                              if (isCompleted) {
                                setSummaryReqId(req.id);
                              } else {
                                setTab('active');
                                setExpandedReqs(prev => ({ ...prev, [req.id]: true }));
                                setTimeout(() => {
                                  const el = document.getElementById(`req-card-${req.id}`);
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              color: '#475569',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {isCompleted ? 'View Summary' : 'View Offers'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // Default card view for Active and Completed
    const reqList = currentTab === 'completed' ? completedRequirementsList : activeRequirementsList;

    if (reqList.length === 0 && !showForm) {
      return (
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
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>No requirements found</h3>
          <p style={{ fontSize: '0.9375rem', color: '#64748b', lineHeight: 1.7, maxWidth: '360px', margin: '0 auto 24px' }}>
            {currentTab === 'completed'
              ? 'You do not have any completed/closed requirements yet.'
              : 'Post your requirement and verified brokers will start sending you competitive offers.'}
          </p>
          {currentTab === 'active' && (
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
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {reqList.map(req => {
          const reqOffers = offers.filter(o => o.requirementId === req.id);
          const bestOffer = getBestOffer(req.id);
          return (
            <div id={`req-card-${req.id}`} key={req.id} style={{
              background: '#fff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(15,23,42,0.05)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative'
            }}>
              {/* Upper Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                {/* Left section: Vehicle Info */}
                <div style={{ display: 'flex', gap: '20px', flex: '1 1 500px' }}>
                  {/* Car Image */}
                  <div style={{
                    width: '130px',
                    height: '90px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img
                      src={getModelImage(req.make, req.model)}
                      alt={`${req.make} ${req.model}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
                      onError={(e) => {
                        e.currentTarget.src = '/hero-car-new.png';
                      }}
                    />
                  </div>
                  
                  {/* Specs Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {req.make} {req.model}
                    </h3>
                    
                    {/* Spec tags row */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }}></span>
                        {getFuelType(req.model, req.description)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }}></span>
                        {getTransmission(req.model, req.description)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        <CalendarRange size={12} />
                        {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    
                    {/* Budget + Location row */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
                        Budget: <span style={{ color: '#0f172a', fontWeight: 700 }}>{req.budget}</span>
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        Location: <span style={{ color: '#0f172a', fontWeight: 700 }}>{extractLocation(req.description)}</span>
                      </span>
                    </div>
                    
                    {/* Dealers count badge */}
                    {reqOffers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          <MessageSquare size={12} /> {reqOffers.length} {reqOffers.length === 1 ? 'Dealer' : 'Dealers'} Responded
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right section: Best Offer Info & Action */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: '220px', textAlign: 'right' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: req.status === 'open' ? '#ecfdf5' : '#f1f5f9',
                    color: req.status === 'open' ? '#059669' : '#64748b',
                    border: req.status === 'open' ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                    marginBottom: '4px'
                  }}>
                    {req.status === 'open' ? 'Active' : 'Completed'}
                  </span>
                  
                  {bestOffer ? (
                    <>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Best Offer</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary)', display: 'flex', alignItems: 'baseline', gap: '6px', lineHeight: 1.1 }}>
                        {bestOffer.price}
                        {(() => {
                          const reqBudgetVal = parsePriceToNumber(req.budget);
                          const offerPriceVal = parsePriceToNumber(bestOffer.price);
                          const savingsVal = reqBudgetVal - offerPriceVal;
                          if (savingsVal > 0) {
                            return (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(5,150,105,0.1)',
                                color: '#059669',
                                padding: '2px 8px',
                                borderRadius: '20px'
                              }}>
                                Save {formatSavings(savingsVal)}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>{bestOffer.brokerName}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>
                          <Star size={11} fill="#d97706" color="#d97706" />
                          {getDealerRating(bestOffer.brokerId)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginTop: '12px' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 500 }}>Waiting for offers...</span>
                      <span style={{ fontSize: '0.6875rem', color: '#cbd5e1' }}>Usually responds in 2 hrs</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => toggleExpand(req.id)}
                    style={{
                      marginTop: '12px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-primary)',
                      background: expandedReqs[req.id] ? '#fef2f2' : 'transparent',
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {req.status === 'open' ? `View Offers (${reqOffers.length})` : 'View Summary'}
                    {expandedReqs[req.id] ? <ChevronDown size={14} style={{ transform: 'rotate(180deg)', transition: 'transform 0.2s' }} /> : <ChevronDown size={14} style={{ transition: 'transform 0.2s' }} />}
                  </button>
                </div>
              </div>

              {/* Bottom section: Top Dealer Offers horizontal slider */}
              {reqOffers.length > 0 && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Top Dealer Offers
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {reqOffers
                      .slice()
                      .sort((a, b) => parsePriceToNumber(a.price) - parsePriceToNumber(b.price))
                      .slice(0, 4)
                      .map(offer => {
                        const logoUrl = getBrandLogo(req.make);
                        return (
                          <div key={offer.id} style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            minWidth: '200px',
                            flex: '1 1 200px'
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {logoUrl ? (
                                <img src={logoUrl} alt={req.make} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                              ) : (
                                <Car size={16} color="#94a3b8" />
                              )}
                            </div>
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                                  {offer.brokerName}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6875rem', color: '#d97706', fontWeight: 700, flexShrink: 0 }}>
                                  <Star size={10} fill="#d97706" color="#d97706" />
                                  {getDealerRating(offer.brokerId)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{extractLocation(offer.details || req.description)}</span>
                                <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--color-primary)' }}>{offer.price}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {reqOffers.length > 4 && (
                      <div
                        onClick={() => toggleExpand(req.id)}
                        style={{
                          background: '#f8fafc',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          minWidth: '130px',
                          flex: '1 1 130px',
                          transition: 'all 0.2s',
                        }}
                      >
                        +{reqOffers.length - 4} More Offers
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Extended drawer */}
              {expandedReqs[req.id] && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>All Offers Received ({reqOffers.length})</h4>
                  {reqOffers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                      No offers yet for this requirement.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {reqOffers.map(offer => {
                        const isAccepted = offer.status === 'accepted';
                        const isRejected = offer.status === 'rejected';
                        const isNew = !offer.isRead && offer.status === 'pending';
                        return (
                          <div key={offer.id} style={{
                            borderRadius: '14px',
                            border: '2px solid',
                            borderColor: isAccepted ? '#10b981' : isRejected ? '#e2e8f0' : isNew ? 'var(--color-primary)' : '#e2e8f0',
                            background: isAccepted ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)' : isRejected ? '#f8fafc' : isNew ? '#fff5f5' : '#fff',
                            opacity: isRejected ? 0.7 : 1,
                            padding: '16px 20px',
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: isAccepted ? 'rgba(16,185,129,0.1)' : 'rgba(15,23,42,0.06)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.9375rem',
                                  color: isAccepted ? '#059669' : '#334155'
                                }}>
                                  {offer.brokerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>{offer.brokerName}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>
                                      <Star size={11} fill="#d97706" color="#d97706" />
                                      {getDealerRating(offer.brokerId)}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <MapPin size={11} /> {extractLocation(offer.details || req.description)}
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span style={{
                                  fontWeight: 900,
                                  fontSize: '1.25rem',
                                  color: isAccepted ? '#059669' : 'var(--color-primary)',
                                  background: isAccepted ? 'rgba(16,185,129,0.08)' : 'rgba(230,57,70,0.06)',
                                  padding: '4px 12px',
                                  borderRadius: '8px'
                                }}>
                                  {offer.price}
                                </span>
                                {(() => {
                                  const reqBudgetVal = parsePriceToNumber(req.budget);
                                  const offerPriceVal = parsePriceToNumber(offer.price);
                                  const savingsVal = reqBudgetVal - offerPriceVal;
                                  if (savingsVal > 0) {
                                    return (
                                      <span style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 700 }}>
                                        Save {formatSavings(savingsVal)}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>

                            {offer.details && (
                              <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6, margin: '8px 0 12px' }}>
                                {offer.details}
                              </p>
                            )}

                            {isAccepted && offer.brokerPhone && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(16,185,129,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                marginBottom: '12px',
                                width: 'fit-content'
                              }}>
                                <Phone size={13} color="#059669" />
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669' }}>{offer.brokerPhone}</span>
                                <span style={{ fontSize: '0.6875rem', color: '#6ee7b7' }}>· Seller Contact Info</span>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {offer.status === 'pending' && req.status === 'open' && (
                                <>
                                  <button
                                    onClick={() => { markOfferRead(offer.id); acceptOffer(offer.id, req.id); }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: 'linear-gradient(135deg, #059669, #047857)',
                                      color: '#fff',
                                      fontFamily: 'var(--font)',
                                      fontWeight: 700,
                                      fontSize: '0.8125rem',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(5,150,105,0.2)'
                                    }}
                                  >
                                    <Check size={13} /> Accept Offer
                                  </button>
                                  <button
                                    onClick={() => { markOfferRead(offer.id); rejectOffer(offer.id); }}
                                    style={{
                                      padding: '8px 14px',
                                      borderRadius: '8px',
                                      border: '1.5px solid #e2e8f0',
                                      background: '#fff',
                                      color: '#64748b',
                                      fontFamily: 'var(--font)',
                                      fontWeight: 600,
                                      fontSize: '0.8125rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Reject
                                  </button>
                                  {!offer.isRead && (
                                    <button
                                      onClick={() => markOfferRead(offer.id)}
                                      style={{
                                        marginLeft: 'auto',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#94a3b8',
                                        fontFamily: 'var(--font)',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Mark as Read
                                    </button>
                                  )}
                                </>
                              )}
                              {isAccepted && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                                  <Check size={12} /> Accepted Deal
                                </span>
                              )}
                              {isRejected && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                                  <X size={12} /> Rejected Offer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '1300px' }}>
        
        {/* ===== TWO COLUMN LAYOUT ===== */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          
          {/* ----- LEFT SIDEBAR ----- */}
          <div style={{
            width: '280px',
            flexShrink: 0,
            background: '#fff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            height: 'fit-content',
            boxShadow: '0 4px 20px rgba(15,23,42,0.03)'
          }}>
            {/* My Requirements Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.9375rem',
            }}>
              <Car size={18} style={{ color: '#475569' }} />
              <span>My Requirements</span>
            </div>

            {/* Sub-item: Active Requirements */}
            <button
              onClick={() => setTab('active')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 16px 10px 36px',
                borderRadius: '12px',
                border: 'none',
                background: currentTab === 'active' ? '#fff0f1' : 'transparent',
                color: currentTab === 'active' ? '#e63946' : '#526071',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: currentTab === 'active' ? '#e63946' : '#94a3b8',
                  display: 'inline-block'
                }}></span>
                <span>Active Requirements</span>
              </div>
              {activeReqs > 0 && (
                <span style={{
                  background: '#e63946',
                  color: '#fff',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {activeReqs}
                </span>
              )}
            </button>

            {/* Sub-item: Completed */}
            <button
              onClick={() => setTab('completed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 16px 10px 36px',
                borderRadius: '12px',
                border: 'none',
                background: currentTab === 'completed' ? '#fff0f1' : 'transparent',
                color: currentTab === 'completed' ? '#e63946' : '#526071',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: currentTab === 'completed' ? '#e63946' : '#94a3b8',
                  display: 'inline-block'
                }}></span>
                <span>Completed</span>
              </div>
              {completedReqs > 0 && (
                <span style={{
                  background: '#059669',
                  color: '#fff',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {completedReqs}
                </span>
              )}
            </button>

            {/* Sub-item: Deal History */}
            <button
              onClick={() => setTab('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 16px 10px 36px',
                borderRadius: '12px',
                border: 'none',
                background: currentTab === 'history' ? '#fff0f1' : 'transparent',
                color: currentTab === 'history' ? '#e63946' : '#526071',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: currentTab === 'history' ? '#e63946' : '#94a3b8',
                  display: 'inline-block'
                }}></span>
                <span>Deal History</span>
              </div>
            </button>

            {/* Sub-item: All Posted */}
            <button
              onClick={() => setTab('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 16px 10px 36px',
                borderRadius: '12px',
                border: 'none',
                background: currentTab === 'all' ? '#fff0f1' : 'transparent',
                color: currentTab === 'all' ? '#e63946' : '#526071',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: currentTab === 'all' ? '#e63946' : '#94a3b8',
                  display: 'inline-block'
                }}></span>
                <span>All Posted</span>
              </div>
              {totalPosted > 0 && (
                <span style={{
                  background: '#2563eb',
                  color: '#fff',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {totalPosted}
                </span>
              )}
            </button>
            
            <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0' }} />
            
            {/* Messages */}
            <button style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              color: '#526071',
              fontFamily: 'var(--font)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MessageSquare size={18} style={{ color: '#526071' }} />
                <span>Messages</span>
              </div>
              <span style={{
                background: '#e63946',
                color: '#fff',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                3
              </span>
            </button>

            {/* Notifications */}
            <button style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              color: '#526071',
              fontFamily: 'var(--font)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bell size={18} style={{ color: '#526071' }} />
                <span>Notifications</span>
              </div>
              <span style={{
                background: '#e63946',
                color: '#fff',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                5
              </span>
            </button>
            
            <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0' }} />
            
            {/* Profile Settings */}
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              color: '#526071',
              fontFamily: 'var(--font)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}>
              <Settings size={18} style={{ color: '#526071' }} />
              <span>Profile Settings</span>
            </button>

            {/* Help & Support */}
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              color: '#526071',
              fontFamily: 'var(--font)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}>
              <HelpCircle size={18} style={{ color: '#526071' }} />
              <span>Help & Support</span>
            </button>
            
            {/* Support Expert Card */}
            <div style={{
              background: '#f4f7fa',
              borderRadius: '20px',
              padding: '20px 16px',
              marginTop: '24px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a', marginBottom: '4px' }}>Need Help?</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '16px' }}>Talk to our experts</div>
              <a href="tel:+919150091500" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '10px 12px',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: '#e63946',
                textDecoration: 'none'
              }}>
                <Phone size={14} fill="#e63946" color="#e63946" />
                +91 91500 91500
              </a>
            </div>
          </div>
          
          {/* ----- MAIN CONTENT AREA ----- */}
          <div style={{ flex: '1 1 800px', minWidth: 0 }}>

            {/* ===== PAGE HEADER ===== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                  My Requirements
                </h1>
                <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>Post what you need. Verified dealers compete to get you the best deal.</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s',
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
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fill in the details and dealers will contact you within hours</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
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
                          }}
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
                          }}
                        >
                          <option value="">Select model</option>
                          {selectedBrand?.models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  </div>

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
                        >
                          <option value="">Any feature</option>
                          {modelFeatures.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                        </select>
                        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  </div>

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
                          color: '#0f172a', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Lakhs</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <MapPin size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      Preferred Location (TN)
                    </label>
                    <LocationSelector value={location} onChange={setLocation} />
                    {locationLabel(location) && (
                      <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} /> {locationLabel(location)}
                      </p>
                    )}
                  </div>

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
                        boxSizing: 'border-box',
                        lineHeight: 1.6,
                      }}
                    />
                  </div>

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

            {/* ===== STATS CARDS ROW ===== */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(230,57,70,0.08)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <List size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{totalPosted}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Total Posted</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>All time</div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(5,150,105,0.08)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{activeReqs}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Active Requests</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>This Month</div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{completedReqs}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Completed Requests</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>This Month</div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(217,119,6,0.08)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{totalOffersReceived}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Dealers Responded</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>This Month</div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹</span>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{formatSavings(totalSavings)}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Total Savings</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>This Month</div>
                </div>
              </div>
            </div>

            {/* ===== VIEW TABS / FILTERS ===== */}
            <div style={{
              display: 'flex',
              gap: '24px',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: '32px'
            }}>
              <button
                onClick={() => setTab('active')}
                style={{
                  padding: '12px 4px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: '3px solid',
                  borderColor: currentTab === 'active' ? 'var(--color-primary)' : 'transparent',
                  color: currentTab === 'active' ? 'var(--color-primary)' : '#64748b',
                  marginBottom: '-2.5px',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font)'
                }}
              >
                Active Requirements ({activeReqs})
              </button>
              <button
                onClick={() => setTab('completed')}
                style={{
                  padding: '12px 4px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: '3px solid',
                  borderColor: currentTab === 'completed' ? 'var(--color-primary)' : 'transparent',
                  color: currentTab === 'completed' ? 'var(--color-primary)' : '#64748b',
                  marginBottom: '-2.5px',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font)'
                }}
              >
                Completed ({completedReqs})
              </button>
              <button
                onClick={() => setTab('history')}
                style={{
                  padding: '12px 4px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: '3px solid',
                  borderColor: currentTab === 'history' ? 'var(--color-primary)' : 'transparent',
                  color: currentTab === 'history' ? 'var(--color-primary)' : '#64748b',
                  marginBottom: '-2.5px',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font)'
                }}
              >
                Deal History
              </button>
              <button
                onClick={() => setTab('all')}
                style={{
                  padding: '12px 4px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: '3px solid',
                  borderColor: currentTab === 'all' ? 'var(--color-primary)' : 'transparent',
                  color: currentTab === 'all' ? 'var(--color-primary)' : '#64748b',
                  marginBottom: '-2.5px',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font)'
                }}
              >
                All Posted ({totalPosted})
              </button>
            </div>

            {/* ===== MAIN CONTENT TABS SWITCH ===== */}
            {renderActiveTabContent()}

          </div>
        </div>

      </div>

      {/* ===== DEAL SUMMARY MODAL ===== */}
      {summaryReqId !== null && (() => {
        const req = myReqs.find(r => r.id === summaryReqId);
        if (!req) return null;
        const accepted = offers.find(o => o.requirementId === req.id && o.status === 'accepted');
        const savings = accepted ? (parsePriceToNumber(req.budget) - parsePriceToNumber(accepted.price)) : 0;
        
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              maxWidth: '550px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.3)',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '24px 28px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>Deal Summary</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Requirement finalized successfully</span>
                </div>
                <button
                  onClick={() => setSummaryReqId(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '50%'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Body */}
              <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Requirement Details</div>
                  <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0f172a' }}>{req.make} {req.model}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '4px' }}>
                    {getFuelType(req.model, req.description)} • {getTransmission(req.model, req.description)} • Budget: {req.budget} • Location: {extractLocation(req.description)}
                  </div>
                </div>
                
                <div style={{ height: '1px', background: '#e2e8f0' }} />
                
                {accepted ? (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Accepted Offer Details</div>
                    
                    <div style={{
                      background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#059669' }}>{accepted.brokerName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>
                          <Star size={11} fill="#d97706" color="#d97706" />
                          {getDealerRating(accepted.brokerId)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#059669' }}>{accepted.price}</div>
                        {savings > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Saved {formatSavings(savings)}</div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{
                      marginTop: '16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 16px'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Dealer Contact Details</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} color="var(--color-primary)" />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{accepted.brokerPhone || 'Contact details provided upon acceptance'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.8125rem', textAlign: 'center' }}>
                    No accepted offer was recorded for this closed requirement.
                  </div>
                )}
                
                <button
                  onClick={() => setSummaryReqId(null)}
                  style={{
                    marginTop: '12px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    width: '100%',
                    boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
                  }}
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
};

export default BuyerDashboard;

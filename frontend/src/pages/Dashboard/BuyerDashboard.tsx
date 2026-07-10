import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useCatalog } from '../../hooks/useCatalog';
import { useNotifications } from '../../contexts/NotificationContext';
import ConversationCenter from '../../components/ConversationCenter';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Plus, X, Check, Clock, MessageSquare, Loader2, ChevronDown, Car, Sparkles,
  Phone, CalendarRange, Star, Bell, MapPin, List, Settings, HelpCircle,
  Menu, Lock, Unlock, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../../services/api';
import { getToken } from '../../services/authService';

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

const getExpiryInfo = (createdAt: string, expiresAt?: string | null): { text: string; urgent: boolean; isExpired: boolean } => {
  const expiry = expiresAt ? new Date(expiresAt).getTime() : new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
  const secs = Math.floor((expiry - Date.now()) / 1000);
  if (secs <= 0) return { text: 'Expired', urgent: true, isExpired: true };
  const days = Math.floor(secs / 86400);
  if (days >= 1) {
    return { text: `${days}d ${Math.floor((secs % 86400) / 3600)}h`, urgent: days < 2, isExpired: false };
  }
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return { text: `${h}h ${m}m`, urgent: true, isExpired: false };
};

// Legacy compat shim used in a few places
const expiresIn = (createdAt: string, expiresAt?: string | null) => {
  const info = getExpiryInfo(createdAt, expiresAt);
  if (info.isExpired) return null;
  return { text: info.text, urgent: info.urgent };
};

const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requirements, offers, addRequirement, acceptOffer, rejectOffer, markOfferRead, negotiateOffer, shortlistOffer, refreshData } = useData();
  const { brands } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'active';
  const { notifications, totalUnread, markRead, markAllRead } = useNotifications();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [showForm, setShowForm] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [feature, setFeature] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedReqs, setExpandedReqs] = useState<Record<number, boolean>>({});
  const [sortBy, setSortBy] = useState('latest');
  const [summaryReqId, setSummaryReqId] = useState<number | null>(null);
  
  const [counterPriceInput, setCounterPriceInput] = useState('');
  const [negotiateOfferId, setNegotiateOfferId] = useState<number | null>(null);

  // Redesign requirement state fields
  const [vehicleType, setVehicleType] = useState<'new' | 'used'>('new');
  const [variant, setVariant] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [cityName, setCityName] = useState('');
  const [citiesList, setCitiesList] = useState<{ id: number; name: string; state: string }[]>([]);
  
  // New Car Specs
  const [fuelType, setFuelType] = useState('Any');
  const [transmission, setTransmission] = useState('Any');
  const [colorPreference, setColorPreference] = useState('');
  const [purchaseTimeline, setPurchaseTimeline] = useState('Immediate');

  // Used Car Specs
  const [maxKmDriven, setMaxKmDriven] = useState('');
  const [ownershipPreference, setOwnershipPreference] = useState('Any');
  const [accidentHistoryPreference, setAccidentHistoryPreference] = useState('No Accidents');

  const [expiryDays, setExpiryDays] = useState('7');

  const selectedBrand = brands.find((b) => b.name === make);

  const handleExtendRequirement = async (reqId: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/requirements/${reqId}/extend`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const newLabel = data.expiresAt ? 'Requirement reactivated! New expiry: 3 days added.' : 'Requirement extended by 3 days!';
        toast.success(newLabel);
        refreshData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to extend requirement.');
      }
    } catch (err) {
      toast.error('Network error. Unable to extend requirement.');
    }
  };

  useEffect(() => {
    fetch('/api/locations/cities')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCitiesList(data);
        }
      })
      .catch((err) => console.error('Failed to load cities:', err));
  }, []);

  const availableStates = useMemo(() => {
    const states = new Set(citiesList.map((c) => c.state));
    if (states.size === 0) {
      states.add('Tamil Nadu');
    }
    return Array.from(states).sort();
  }, [citiesList]);

  const filteredCities = useMemo(() => {
    return citiesList.filter((c) => c.state === stateName);
  }, [citiesList, stateName]);

  useEffect(() => {
    const pending = sessionStorage.getItem('pending_requirement');
    if (pending && user?.role === 'buyer' && user.id) {
      try {
        const parsed = JSON.parse(pending);
        if (parsed.make) setMake(parsed.make);
        if (parsed.model) setModel(parsed.model);
        if (parsed.budget) {
          setBudgetMax(parsed.budget);
          setBudgetMin('');
        }
        if (parsed.vehicleType) setVehicleType(parsed.vehicleType);
        if (parsed.state) setStateName(parsed.state);
        if (parsed.city) setCityName(parsed.city);
        setShowForm(true);
        toast.success('Resumed posting your requirement! Review details and submit.');
      } catch (err) {
        console.error('Failed to load pending requirement:', err);
      } finally {
        sessionStorage.removeItem('pending_requirement');
      }
    }
  }, [user]);

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
  const conversationThreadCount = useMemo(() => new Set(myOffers.map((offer) => `${offer.requirementId}:${offer.brokerId}`)).size, [myOffers]);
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
    if (!budgetMin.trim() || !budgetMax.trim()) { toast.error('Please enter budget range.'); return; }
    if (parseFloat(budgetMin) > parseFloat(budgetMax)) {
      toast.error('Min budget cannot be greater than Max budget.'); return;
    }
    if (!stateName) { toast.error('Please select a state.'); return; }
    if (!cityName) { toast.error('Please select a city.'); return; }
    if (!user?.id) { toast.error('Please log in first.'); return; }

    let yearRangeValue = '';
    if (vehicleType === 'used') {
      yearRangeValue = minYear && maxYear ? `${minYear}-${maxYear}` : minYear || maxYear;
      if (!yearRangeValue) { toast.error('Please select at least a minimum year.'); return; }
      if (minYear && maxYear && parseInt(minYear) > parseInt(maxYear)) {
        toast.error('Min year cannot be greater than Max year.'); return;
      }
    }

    setSubmitting(true);
    try {
      await addRequirement({
        buyerId: user.id,
        make,
        model,
        yearRange: vehicleType === 'used' ? yearRangeValue : '',
        budget: budgetMax, // Backward compatibility
        preferredFeature: feature || '',
        description: description || '',
        expiryDays: parseInt(expiryDays, 10),
        
        // New common fields
        vehicleType,
        variant: variant || '',
        budgetMin,
        budgetMax,
        state: stateName,
        city: cityName,

        // For New Cars
        fuelType: vehicleType === 'new' ? fuelType : '',
        transmission: vehicleType === 'new' ? transmission : '',
        colorPreference: vehicleType === 'new' ? colorPreference : '',
        purchaseTimeline: vehicleType === 'new' ? purchaseTimeline : '',

        // For Used Cars
        maxKmDriven: (vehicleType === 'used' && maxKmDriven) ? parseInt(maxKmDriven) : undefined,
        ownershipPreference: vehicleType === 'used' ? ownershipPreference : '',
        accidentHistoryPreference: vehicleType === 'used' ? accidentHistoryPreference : '',
      });
      toast.success('Requirement posted! Dealers will now send you offers.');
      setShowForm(false);
      setMake(''); setModel(''); setFeature(''); setMinYear(''); setMaxYear(''); setDescription('');
      setVariant(''); setBudgetMin(''); setBudgetMax(''); setCityName(''); setFuelType('Any'); setTransmission('Any'); setColorPreference('');
      setPurchaseTimeline('Immediate'); setMaxKmDriven(''); setOwnershipPreference('Any'); setAccidentHistoryPreference('No Accidents');
      setExpiryDays('7');
    } catch {
      toast.error('Failed to post requirement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderActiveTabContent = () => {
    if (currentTab === 'messages') {
      return (
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Messages Portal</h3>
            <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Chat with dealers tied to your active or completed offers.
            </p>
          </div>
          <div style={{ padding: '24px' }}>
            <ConversationCenter mode="buyer" />
          </div>
        </div>
      );
    }

    if (currentTab === 'notifications') {
      return (
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Notifications Feed</h3>
              <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                Read status updates, offer alerts, and deal activity in one place.
              </p>
            </div>
            {totalUnread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b', border: '1px dashed #e2e8f0', borderRadius: '16px', background: '#f8fafc' }}>
                <Bell size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 800, color: '#0f172a' }}>No notifications yet</div>
                <p style={{ margin: '8px auto 0', maxWidth: '340px', fontSize: '0.875rem', lineHeight: 1.7 }}>
                  You will see offer changes, shortlist updates, and deal activity here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markRead(notification.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: '1px solid',
                    borderColor: notification.isRead ? '#e2e8f0' : '#fecaca',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    background: notification.isRead ? '#fff' : '#fff5f5',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: notification.isRead ? 'none' : '0 8px 24px rgba(230,57,70,0.06)',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = notification.isRead ? '#cbd5e1' : '#f87171';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = notification.isRead ? '#e2e8f0' : '#fecaca';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: notification.isRead ? '#cbd5e1' : '#e63946', flexShrink: 0 }} />
                        <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>{notification.title}</h4>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#e63946', background: 'rgba(230,57,70,0.08)', padding: '2px 8px', borderRadius: '999px' }}>
                           {notification.priority}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', lineHeight: 1.6 }}>{notification.message}</p>
                      
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead(notification.id);
                          }}
                          style={{
                            marginTop: '10px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#e63946',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#e63946';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.color = '#e63946';
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {new Date(notification.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

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
                            {getFuelType(req.model, req.description || '')} • {getTransmission(req.model, req.description || '')}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{req.budget}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155' }}>{extractLocation(req.description || '')}</td>
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
                            {getFuelType(req.model, req.description || '')} • {getTransmission(req.model, req.description || '')}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{req.budget}</td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155' }}>{extractLocation(req.description || '')}</td>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {req.make} {req.model} {req.variant ? `(${req.variant})` : ''}
                      </h3>
                      <span style={{
                        fontSize: '0.6875rem',
                        color: req.vehicleType === 'new' ? '#0f766e' : '#b45309',
                        background: req.vehicleType === 'new' ? '#ccfbf1' : '#fef3c7',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {req.vehicleType === 'new' ? 'New Car' : 'Used Car'}
                      </span>
                    </div>
                    
                    {/* Spec tags row */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                      {req.vehicleType === 'new' ? (
                        <>
                          {req.fuelType && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Fuel: <strong style={{ color: '#334155' }}>{req.fuelType}</strong>
                            </span>
                          )}
                          {req.transmission && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Gear: <strong style={{ color: '#334155' }}>{req.transmission}</strong>
                            </span>
                          )}
                          {req.colorPreference && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Color: <strong style={{ color: '#334155' }}>{req.colorPreference}</strong>
                            </span>
                          )}
                          {req.purchaseTimeline && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Timeline: <strong style={{ color: '#334155' }}>{req.purchaseTimeline}</strong>
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {req.yearRange && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Years: <strong style={{ color: '#334155' }}>{req.yearRange}</strong>
                            </span>
                          )}
                          {req.maxKmDriven && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Max KM: <strong style={{ color: '#334155' }}>{req.maxKmDriven.toLocaleString()}</strong>
                            </span>
                          )}
                          {req.ownershipPreference && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Owners: <strong style={{ color: '#334155' }}>{req.ownershipPreference}</strong>
                            </span>
                          )}
                          {req.accidentHistoryPreference && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                              Accidents: <strong style={{ color: '#334155' }}>{req.accidentHistoryPreference}</strong>
                            </span>
                          )}
                        </>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                        <CalendarRange size={12} />
                        {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {(() => {
                        const expInfo = getExpiryInfo(req.createdAt, req.expiresAt);
                        if (expInfo.isExpired) {
                          return (
                            <span style={{
                              fontSize: '0.75rem', color: '#ef4444',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              background: 'rgba(239,68,68,0.1)',
                              padding: '2px 8px', borderRadius: '6px', fontWeight: 700,
                              border: '1px solid rgba(239,68,68,0.2)'
                            }}>
                              <Clock size={12} style={{ flexShrink: 0 }} />
                              Expired
                            </span>
                          );
                        }
                        return (
                          <span style={{
                            fontSize: '0.75rem', color: expInfo.urgent ? '#e63946' : '#d97706',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            background: expInfo.urgent ? 'rgba(230,57,70,0.08)' : 'rgba(217,119,6,0.08)',
                            padding: '2px 8px', borderRadius: '6px', fontWeight: 700
                          }}>
                            <Clock size={12} style={{ flexShrink: 0 }} />
                            {expInfo.text} left
                          </span>
                        );
                      })()}
                    </div>
                    
                    {/* Budget + Location row */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
                        Budget: <span style={{ color: '#0f172a', fontWeight: 700 }}>
                          {req.budgetMin && req.budgetMax ? `₹${req.budgetMin}L - ₹${req.budgetMax}L` : req.budget}
                        </span>
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        Location: <span style={{ color: '#0f172a', fontWeight: 700 }}>
                          {req.city && req.state ? `${req.city}, ${req.state}` : extractLocation(req.description || '')}
                        </span>
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
                  {(() => {
                    const expInfo = getExpiryInfo(req.createdAt, req.expiresAt);
                    const isExpired = req.status === 'open' && expInfo.isExpired;
                    return (
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: isExpired ? '#fef2f2' : req.status === 'open' ? '#ecfdf5' : '#f1f5f9',
                        color: isExpired ? '#ef4444' : req.status === 'open' ? '#059669' : '#64748b',
                        border: isExpired ? '1px solid #fecaca' : req.status === 'open' ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                        marginBottom: '4px'
                      }}>
                        {isExpired ? 'Expired' : req.status === 'open' ? 'Active' : 'Completed'}
                      </span>
                    );
                  })()}
                  
                  {req.status === 'open' && !req.extended && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExtendRequirement(req.id);
                      }}
                      style={{
                        padding: '4px 10px',
                        background: getExpiryInfo(req.createdAt, req.expiresAt).isExpired
                          ? 'rgba(239,68,68,0.08)'
                          : 'rgba(37,99,235,0.08)',
                        color: getExpiryInfo(req.createdAt, req.expiresAt).isExpired ? '#ef4444' : '#2563eb',
                        border: `1px solid ${getExpiryInfo(req.createdAt, req.expiresAt).isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(37,99,235,0.2)'}`,
                        borderRadius: '6px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '2px',
                        marginBottom: '6px',
                        fontFamily: 'var(--font)',
                        alignSelf: 'flex-end'
                      }}
                    >
                      {getExpiryInfo(req.createdAt, req.expiresAt).isExpired ? '🔄 Reactivate (+3 Days)' : 'Extend +3 Days'}
                    </button>
                  )}
                  
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
                                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{extractLocation(offer.details || req.description || '')}</span>
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
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
                                  {(offer.dealerName || offer.brokerName).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                                      {offer.dealerName || offer.brokerName}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>
                                      <Star size={11} fill="#d97706" color="#d97706" />
                                      {getDealerRating(offer.brokerId)}
                                    </span>
                                    {offer.shortlisted && (
                                      <span style={{
                                        fontSize: '0.6875rem',
                                        background: '#fef3c7',
                                        color: '#d97706',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 700
                                      }}>
                                        Shortlisted
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <MapPin size={11} /> {offer.dealerLocation ? offer.dealerLocation.split(',')[0].trim() : 'Tamil Nadu'}
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
                                  const reqBudgetVal = parsePriceToNumber(req.budgetMin && req.budgetMax ? req.budgetMax : req.budget);
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

                            {/* Specifications Grid */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                              gap: '10px',
                              background: '#f8fafc',
                              padding: '12px',
                              borderRadius: '10px',
                              margin: '10px 0 12px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                <strong>Variant:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.variant}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                <strong>Model Year:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.year}</span>
                              </div>
                              
                              {req.vehicleType === 'new' ? (
                                <>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>Stock:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.stockStatus || 'Not Specified'}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>Delivery:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.deliveryTime || 'Not Specified'}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>Reg Year:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.registrationYear || 'Not Specified'}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>KM Driven:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.kmDriven ? `${offer.kmDriven.toLocaleString()} km` : 'Not Specified'}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>Owners:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.ownership || 'Not Specified'}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>Condition:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.vehicleCondition || 'Not Specified'}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>Insurance:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.insuranceValidTill || 'Not Specified'}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    <strong>Service History:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{offer.serviceHistory || 'Not Specified'}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Additional optional strings (Price Breakdown & Benefits) */}
                            {(offer.priceBreakdown || offer.benefits) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                {offer.priceBreakdown && (
                                  <div style={{ background: '#fff9db', border: '1px solid #ffe066', padding: '10px 14px', borderRadius: '8px', fontSize: '0.75rem', color: '#66a80f' }}>
                                    <strong>Price Breakdown:</strong> <span style={{ color: '#3f6b0b' }}>{offer.priceBreakdown}</span>
                                  </div>
                                )}
                                {offer.benefits && (
                                  <div style={{ background: '#e8f7ff', border: '1px solid #bce5ff', padding: '10px 14px', borderRadius: '8px', fontSize: '0.75rem', color: '#0066cc' }}>
                                    <strong>Dealer Benefits:</strong> <span style={{ color: '#00478f' }}>{offer.benefits}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {offer.details && (
                              <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6, margin: '8px 0 12px' }}>
                                <strong>Dealer Notes:</strong> {offer.details.split('\n[Negotiated:')[0].trim()}
                              </p>
                            )}

                            {/* Disclosure Contact Card */}
                            {(() => {
                              const contactsUnlocked = offer.shortlisted || offer.status === 'accepted';
                              return (
                                <div style={{
                                  background: contactsUnlocked ? 'rgba(16,185,129,0.05)' : '#f8fafc',
                                  border: '1.5px solid',
                                  borderColor: contactsUnlocked ? '#10b981' : '#cbd5e1',
                                  borderRadius: '12px',
                                  padding: '12px 16px',
                                  marginBottom: '14px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: contactsUnlocked ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {contactsUnlocked ? <Unlock size={13} color="#059669" /> : <Lock size={13} color="#64748b" />}
                                      Seller Contact Information {contactsUnlocked ? '(Unlocked)' : '(Locked)'}
                                    </span>
                                    {!contactsUnlocked && (
                                      <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>
                                        Shortlist or accept offer to unlock
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.8125rem', color: '#334155' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <MapPin size={12} color="#64748b" />
                                      <strong>Address:</strong> {contactsUnlocked ? offer.dealerLocation : 'Address Hidden'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Phone size={12} color="#64748b" />
                                      <strong>Phone:</strong> {contactsUnlocked ? (
                                        <a href={`tel:${offer.brokerPhone}`} style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
                                          {offer.brokerPhone}
                                        </a>
                                      ) : '••••••••••'}
                                    </div>
                                    {contactsUnlocked && offer.brokerPhone && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span
                                          onClick={() => window.open(`https://wa.me/${offer.brokerPhone.replace(/\D/g, '')}`, '_blank')}
                                          style={{
                                            color: '#25d366',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.618-1.016-5.08-2.87-6.936C16.353 2.016 13.882 1 11.99 1 6.586 1 2.185 5.398 2.182 10.803c-.001 1.493.404 2.955 1.17 4.298l-.994 3.633 3.725-.977-.04.097zm10.37-6.26c-.25-.124-1.474-.727-1.703-.81-.228-.084-.393-.124-.558.125-.165.247-.64.81-.784.975-.143.165-.288.185-.538.062-.25-.124-1.055-.389-2.01-1.243-.743-.662-1.244-1.479-1.39-1.727-.144-.247-.015-.38.11-.503.112-.111.25-.29.375-.436.124-.145.166-.248.25-.415.082-.165.042-.31-.02-.435-.062-.124-.559-1.348-.765-1.848-.2-.486-.403-.42-.557-.428-.145-.008-.31-.01-.475-.01-.165 0-.435.063-.662.312-.228.248-.87.85-.87 2.075s.89 2.41 1.012 2.575c.125.166 1.75 2.673 4.24 3.75 2.49 1.077 2.49.718 2.986.672.496-.046 1.474-.602 1.68-1.185.207-.584.207-1.084.145-1.187-.062-.102-.227-.165-.477-.29z"/></svg>
                                          WhatsApp Chat
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {offer.details && (offer.details.includes('[Negotiated:') || offer.details.includes('[Broker Counter:')) && (() => {
                               let negotiationText = '';
                               let isBrokerCounter = false;
                               
                               // Check for broker's counter response
                               const brokerMatch = offer.details.match(/\[Broker Counter:\s*(.+?)\]/);
                               if (brokerMatch) {
                                 negotiationText = brokerMatch[1];
                                 isBrokerCounter = true;
                               } else {
                                 // Check for customer's counter
                                 const customerMatch = offer.details.match(/\[Negotiated:\s*(.+?)\]/);
                                 if (customerMatch) {
                                   negotiationText = customerMatch[1];
                                 }
                               }
                               
                               return (
                                 <>
                                   {isBrokerCounter ? (
                                     // Broker has responded with their counter
                                     <div style={{
                                       fontSize: '0.75rem', fontWeight: 700, color: '#059669',
                                       background: 'rgba(5, 150, 105, 0.08)', padding: '4px 10px',
                                       borderRadius: '8px', marginBottom: '8px', width: 'fit-content'
                                     }}>
                                       ✓ Broker Counter: ₹{negotiationText}
                                     </div>
                                   ) : offer.negotiationAwaitingFrom === 'broker' ? (
                                     // Waiting for broker response
                                     <div style={{
                                       fontSize: '0.75rem', fontWeight: 700, color: '#dc2626',
                                       background: 'rgba(220, 38, 38, 0.08)', padding: '4px 10px',
                                       borderRadius: '8px', marginBottom: '8px', width: 'fit-content'
                                     }}>
                                       ⏳ Waiting for broker response to your counter offer: ₹{negotiationText}
                                     </div>
                                   ) : (
                                     // Negotiation pending, can counter again
                                     <div style={{
                                       fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed',
                                       background: 'rgba(124, 58, 237, 0.08)', padding: '4px 10px',
                                       borderRadius: '8px', marginBottom: '8px', width: 'fit-content'
                                     }}>
                                       Negotiation Pending (You countered: ₹{negotiationText})
                                     </div>
                                   )}
                                 </>
                               );
                             })()}

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                                {offer.status === 'pending' && req.status === 'open' && !getExpiryInfo(req.createdAt, req.expiresAt).isExpired && offer.negotiationAwaitingFrom !== 'broker' && (
                                  <>
                                    {negotiateOfferId === offer.id ? (
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginTop: '4px', flexWrap: 'wrap' }}>
                                        <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 700 }}>₹</span>
                                          <input
                                            type="text"
                                            placeholder="Counter price (e.g. 14.5L)"
                                            value={counterPriceInput}
                                            onChange={e => setCounterPriceInput(e.target.value)}
                                            style={{
                                              width: '100%', padding: '8px 12px 8px 20px', borderRadius: '8px',
                                              border: '1.5px solid var(--color-primary)', fontFamily: 'var(--font)',
                                              fontSize: '0.8125rem', boxSizing: 'border-box'
                                            }}
                                          />
                                        </div>
                                        <button
                                          onClick={async () => {
                                            if (!counterPriceInput.trim()) {
                                              toast.error('Please enter a counter price.');
                                              return;
                                            }
                                            await negotiateOffer(offer.id, counterPriceInput);
                                            setNegotiateOfferId(null);
                                            setCounterPriceInput('');
                                            toast.success('Counter offer sent to dealer!');
                                          }}
                                          style={{
                                            padding: '8px 14px', borderRadius: '8px', border: 'none',
                                            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff',
                                            fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.8125rem',
                                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.2)'
                                          }}
                                        >
                                          Send Counter
                                        </button>
                                        <button
                                          onClick={() => { setNegotiateOfferId(null); setCounterPriceInput(''); }}
                                          style={{
                                            padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1',
                                            background: '#fff', color: '#475569', fontFamily: 'var(--font)',
                                            fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer'
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
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
                                          onClick={async () => {
                                            markOfferRead(offer.id);
                                            const nextState = !offer.shortlisted;
                                            await shortlistOffer(offer.id, nextState);
                                            toast.success(nextState ? 'Offer shortlisted! Contact info unlocked.' : 'Offer removed from shortlist.');
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            border: offer.shortlisted ? '1.5px solid #d97706' : '1.5px solid #cbd5e1',
                                            background: offer.shortlisted ? '#fffbeb' : '#fff',
                                            color: offer.shortlisted ? '#b45309' : '#64748b',
                                            fontFamily: 'var(--font)',
                                            fontWeight: 700,
                                            fontSize: '0.8125rem',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <Star size={13} fill={offer.shortlisted ? '#d97706' : 'none'} color={offer.shortlisted ? '#d97706' : '#cbd5e1'} />
                                          {offer.shortlisted ? 'Shortlisted' : 'Shortlist'}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setNegotiateOfferId(offer.id);
                                            setCounterPriceInput('');
                                          }}
                                          style={{
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #7c3aed',
                                            background: '#fff',
                                            color: '#7c3aed',
                                            fontFamily: 'var(--font)',
                                            fontWeight: 700,
                                            fontSize: '0.8125rem',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          Negotiate
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
                                      </>
                                    )}
                                    
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
                                
                                {offer.status === 'pending' && req.status === 'open' && offer.negotiationAwaitingFrom === 'broker' && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(220, 38, 38, 0.08)',
                                    border: '1.5px solid rgba(220, 38, 38, 0.2)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: '#dc2626'
                                  }}>
                                    <span style={{ fontSize: '1rem' }}>⏳</span>
                                    <span>Waiting for broker's response. You cannot accept until they reply.</span>
                                  </div>
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
    <section style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', position: 'relative', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 89,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* ----- LEFT SIDEBAR ----- */}
      <div style={{
        position: 'fixed',
        top: '60px',
        bottom: 0,
        left: 0,
        width: sidebarOpen ? '280px' : '0px',
        background: '#fff',
        borderRight: '1px solid #e2e8f0',
        padding: sidebarOpen ? '24px 16px' : '24px 0px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 90,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: sidebarOpen ? 1 : 0
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
          whiteSpace: 'nowrap'
        }}>
          <Car size={18} style={{ color: '#475569' }} />
          <span>My Requirements</span>
        </div>

        {/* Sub-item: Active Requirements */}
        <button
          onClick={() => { setTab('active'); if (isMobile) setSidebarOpen(false); }}
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
            whiteSpace: 'nowrap'
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
          onClick={() => { setTab('completed'); if (isMobile) setSidebarOpen(false); }}
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
            whiteSpace: 'nowrap'
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
          onClick={() => { setTab('history'); if (isMobile) setSidebarOpen(false); }}
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
            whiteSpace: 'nowrap'
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
          onClick={() => { setTab('all'); if (isMobile) setSidebarOpen(false); }}
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
            whiteSpace: 'nowrap'
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
        
        <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0', minHeight: '1px' }} />
        
        {/* Messages */}
        <button
          onClick={() => { setTab('messages'); if (isMobile) setSidebarOpen(false); }}
          style={{
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
          whiteSpace: 'nowrap'
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
            {conversationThreadCount}
          </span>
        </button>

        {/* Notifications */}
        <button
          onClick={() => { setTab('notifications'); if (isMobile) setSidebarOpen(false); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: 'none',
            background: currentTab === 'notifications' ? '#fff0f1' : 'transparent',
            color: currentTab === 'notifications' ? '#e63946' : '#526071',
            fontFamily: 'var(--font)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bell size={18} style={{ color: currentTab === 'notifications' ? '#e63946' : '#526071' }} />
            <span>Notifications</span>
          </div>
          {totalUnread > 0 && (
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
              {totalUnread}
            </span>
          )}
        </button>
        
        <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0', minHeight: '1px' }} />
        
        {/* Profile Settings */}
        <Link to="/settings" style={{
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
          whiteSpace: 'nowrap',
          textDecoration: 'none'
        }}>
          <Settings size={18} style={{ color: '#526071' }} />
          <span>Profile Settings</span>
        </Link>

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
          whiteSpace: 'nowrap'
        }}>
          <HelpCircle size={18} style={{ color: '#526071' }} />
          <span>Help & Support</span>
        </button>
        
        {/* Support Expert Card */}
        <div style={{
          background: '#f4f7fa',
          borderRadius: '20px',
          padding: '20px 16px',
          marginTop: 'auto',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          display: sidebarOpen ? 'block' : 'none'
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
      <div style={{
        flexGrow: 1,
        marginLeft: (!isMobile && sidebarOpen) ? '280px' : '0px',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: isMobile ? '24px 16px 80px' : '40px 48px 80px',
        minWidth: 0,
        width: '100%'
      }}>

            {/* ===== PAGE HEADER ===== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Sidebar Toggle Button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                  title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                    {currentTab === 'active' ? 'My Requirements' :
                     currentTab === 'completed' ? 'Completed Requirements' :
                     currentTab === 'history' ? 'Deal History' :
                     currentTab === 'all' ? 'All Posted Requirements' :
                     currentTab === 'messages' ? 'Messages' :
                     currentTab === 'notifications' ? 'Notifications' :
                     'Profile Settings'}
                  </h1>
                  <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
                    {currentTab === 'active' ? 'Post what you need. Verified dealers compete to get you the best deal.' :
                     currentTab === 'completed' ? 'Review closed deals and the savings you secured.' :
                     currentTab === 'history' ? 'Track every deal you closed from start to finish.' :
                     currentTab === 'all' ? 'Browse all your posted requirements in one place.' :
                     currentTab === 'messages' ? 'Chat directly with dealers about your offers and deal progress.' :
                     currentTab === 'notifications' ? 'View deal updates, offer alerts, and platform activity.' :
                     'Manage your buyer profile and preferences.'}
                  </p>
                </div>
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
                  {/* Vehicle Type Toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Vehicle Type *
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setVehicleType('new')}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '10px',
                          border: vehicleType === 'new' ? '2.5px solid var(--color-primary)' : '2px solid #e2e8f0',
                          background: vehicleType === 'new' ? 'rgba(230,57,70,0.06)' : '#fff',
                          color: vehicleType === 'new' ? 'var(--color-primary)' : '#475569',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: 'var(--font)'
                        }}
                      >
                        New Car
                      </button>
                      <button
                        type="button"
                        onClick={() => setVehicleType('used')}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '10px',
                          border: vehicleType === 'used' ? '2px solid var(--color-primary)' : '2px solid #e2e8f0',
                          background: vehicleType === 'used' ? 'rgba(230,57,70,0.06)' : '#fff',
                          color: vehicleType === 'used' ? 'var(--color-primary)' : '#475569',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: 'var(--font)'
                        }}
                      >
                        Used Car
                      </button>
                    </div>
                  </div>

                  {/* Brand & Model */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Brand *
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
                          <option value="">Select Brand</option>
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
                          <option value="">Select Model</option>
                          {selectedBrand?.models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  </div>

                  {/* Variant */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Variant (Optional)
                    </label>
                    <input
                      type="text"
                      value={variant}
                      onChange={e => setVariant(e.target.value)}
                      placeholder="e.g. VXi, Alpha, LXi, Dual Tone"
                      style={{
                        width: '100%', padding: '12px 14px',
                        borderRadius: '10px', border: '2px solid #e2e8f0',
                        fontFamily: 'var(--font)', fontSize: '0.9375rem',
                        color: '#0f172a', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Budget Min / Max */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Min Budget (₹ Lakhs) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.5"
                        value={budgetMin}
                        onChange={e => setBudgetMin(e.target.value)}
                        placeholder="e.g. 8.0"
                        style={{
                          width: '100%', padding: '12px 14px',
                          borderRadius: '10px', border: '2px solid #e2e8f0',
                          fontFamily: 'var(--font)', fontSize: '0.9375rem',
                          color: '#0f172a', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Max Budget (₹ Lakhs) *
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.5"
                        value={budgetMax}
                        onChange={e => setBudgetMax(e.target.value)}
                        placeholder="e.g. 12.0"
                        style={{
                          width: '100%', padding: '12px 14px',
                          borderRadius: '10px', border: '2px solid #e2e8f0',
                          fontFamily: 'var(--font)', fontSize: '0.9375rem',
                          color: '#0f172a', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* State & City/District */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        State *
                      </label>
                      <select
                        required
                        value={stateName}
                        onChange={e => { setStateName(e.target.value); setCityName(''); }}
                        style={{
                          width: '100%', padding: '12px 14px',
                          borderRadius: '10px', border: '2px solid #e2e8f0',
                          fontFamily: 'var(--font)', fontSize: '0.9375rem',
                          color: '#0f172a', background: '#fff', outline: 'none',
                        }}
                      >
                        {availableStates.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        City / District *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <select
                          required
                          value={cityName}
                          onChange={e => setCityName(e.target.value)}
                          disabled={!stateName}
                          style={{
                            width: '100%', padding: '12px 36px 12px 14px',
                            borderRadius: '10px', border: '2px solid #e2e8f0',
                            fontFamily: 'var(--font)', fontSize: '0.9375rem',
                            color: cityName ? '#0f172a' : '#94a3b8', background: '#fff',
                            appearance: 'none', cursor: stateName ? 'pointer' : 'not-allowed', outline: 'none',
                            opacity: stateName ? 1 : 0.6
                          }}
                        >
                          <option value="">Select District</option>
                          {filteredCities.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  </div>

                  {/* New Cars Specification Fields */}
                  {vehicleType === 'new' && (
                    <div style={{ border: '1.5px solid #e2e8f0', padding: '20px', borderRadius: '12px', background: '#f8fafc', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#475569', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>New Car Specifications</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Fuel Type</label>
                          <select value={fuelType} onChange={e => setFuelType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', background: '#fff' }}>
                            <option value="Any">Any Fuel</option>
                            <option value="Petrol">Petrol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Electric">Electric</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Transmission</label>
                          <select value={transmission} onChange={e => setTransmission(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', background: '#fff' }}>
                            <option value="Any">Any Transmission</option>
                            <option value="Manual">Manual</option>
                            <option value="Automatic">Automatic</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Color Preference</label>
                          <input type="text" value={colorPreference} onChange={e => setColorPreference(e.target.value)} placeholder="e.g. White, Black, Red" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Purchase Timeline</label>
                          <select value={purchaseTimeline} onChange={e => setPurchaseTimeline(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', background: '#fff' }}>
                            <option value="Immediate">Immediate</option>
                            <option value="Within 15 Days">Within 15 Days</option>
                            <option value="Within 1 Month">Within 1 Month</option>
                            <option value="Exploring">Exploring</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Used Cars Specification Fields */}
                  {vehicleType === 'used' && (
                    <div style={{ border: '1.5px solid #e2e8f0', padding: '20px', borderRadius: '12px', background: '#f8fafc', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#475569', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Used Car Specifications</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Year Range *</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select required={vehicleType === 'used'} value={minYear} onChange={e => setMinYear(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', background: '#fff' }}>
                              <option value="">From</option>
                              {YEAR_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>
                            <select value={maxYear} onChange={e => setMaxYear(e.target.value)} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', background: '#fff' }}>
                              <option value="">To (opt.)</option>
                              {YEAR_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Max KM Driven</label>
                          <input type="number" min="0" value={maxKmDriven} onChange={e => setMaxKmDriven(e.target.value)} placeholder="e.g. 50000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Ownership Preference</label>
                          <select value={ownershipPreference} onChange={e => setOwnershipPreference(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', background: '#fff' }}>
                            <option value="Any">Any Ownership</option>
                            <option value="1st Owner">1st Owner</option>
                            <option value="2nd Owner">2nd Owner</option>
                            <option value="3rd Owner">3rd Owner</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Accident History Preference</label>
                        <select value={accidentHistoryPreference} onChange={e => setAccidentHistoryPreference(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.875rem', background: '#fff' }}>
                          <option value="No Accidents">No Accidents / Clean History</option>
                          <option value="Any">Any History</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Additional Notes */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. trim preference, preferred test drive time, color preferences..."
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

                  {/* Expiry Duration */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Requirement Active Duration *
                    </label>
                    <select
                      value={expiryDays}
                      onChange={e => setExpiryDays(e.target.value)}
                      style={{
                        width: '100%', padding: '12px 14px',
                        borderRadius: '10px', border: '2px solid #e2e8f0',
                        fontFamily: 'var(--font)', fontSize: '0.9375rem',
                        color: '#0f172a', outline: 'none',
                        background: '#fff', boxSizing: 'border-box'
                      }}
                    >
                      <option value="3">3 Days (Urgent)</option>
                      <option value="7">7 Days (Standard)</option>
                      <option value="14">14 Days (Extended)</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
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
                    {getFuelType(req.model, req.description || '')} • {getTransmission(req.model, req.description || '')} • Budget: {req.budget} • Location: {extractLocation(req.description || '')}
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
                    
                    {/* Dealer contact + profile link */}
                    <div style={{
                      marginTop: '16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 16px'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Dealer Contact Details</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Phone size={14} color="var(--color-primary)" />
                        {accepted.brokerPhone ? (
                          <a
                            href={`tel:${accepted.brokerPhone}`}
                            style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'none' }}
                          >
                            {accepted.brokerPhone}
                          </a>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#64748b' }}>Contact details provided upon acceptance</span>
                        )}
                      </div>
                    </div>

                    {/* View Dealer Profile link */}
                    {accepted.brokerId && (
                      <Link
                        to={`/dealers/${accepted.brokerId}`}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          marginTop: '12px', padding: '10px 16px',
                          background: '#f1f5f9', border: '1px solid #e2e8f0',
                          borderRadius: '10px', color: '#334155',
                          fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                      >
                        <ExternalLink size={14} /> View Dealer Profile
                      </Link>
                    )}
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

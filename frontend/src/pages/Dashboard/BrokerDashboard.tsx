import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useSearchParams } from 'react-router-dom';
import {
  Clock, Send, CheckCircle2, AlertCircle, Car, Fuel,
  Gauge, Users, Star, ChevronDown, TrendingDown, TrendingUp,
  FileText, Target, Zap, ArrowRight, Phone, Menu, Settings,
  Bell, MessageSquare, Check, Briefcase, CalendarRange
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================
//  HELPER FUNCTIONS & SPECIFICATION GUESSERS
// ============================================================

const parsePriceToNumber = (priceStr: string | number): number => {
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

const getTransmission = (modelName: string, desc: string): string => {
  const combined = (modelName + ' ' + desc).toLowerCase();
  if (combined.includes('automatic') || combined.includes('cvt') || combined.includes('dct') || combined.includes('amt') || combined.includes('auto')) {
    return 'Automatic';
  }
  return 'Manual';
};

const getFuelType = (modelName: string, desc: string): string => {
  const combined = (modelName + ' ' + desc).toLowerCase();
  if (combined.includes('diesel')) return 'Diesel';
  if (combined.includes('ev') || combined.includes('electric')) return 'EV';
  if (combined.includes('cng')) return 'CNG';
  if (combined.includes('hybrid')) return 'Hybrid';
  return 'Petrol';
};

const extractLocation = (desc: string): string => {
  const match = desc.match(/Preferred Location:\s*(.+)$/m);
  return match ? match[1].trim() : 'Tamil Nadu';
};

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

interface PriceSuggestion {
  avg: number | null;
  low: number | null;
  high: number | null;
  trend: 'low' | 'fair' | 'high' | null;
}

function getSuggestedPrice(reqMake: string, reqModel: string, reqBudget: string, myListings: any[]): PriceSuggestion {
  const matching = myListings.filter(
    l => l.status === 'active' &&
      (l.make.toLowerCase() === reqMake.toLowerCase() || l.model.toLowerCase() === reqModel.toLowerCase())
  );
  if (matching.length === 0) return { avg: null, low: null, high: null, trend: null };
  const avg = matching.reduce((s, l) => s + l.price, 0) / matching.length;
  const low = Math.round(avg * 0.97 * 10) / 10;
  const high = Math.round(avg * 1.03 * 10) / 10;
  const budget = parsePriceToNumber(reqBudget);
  let trend: PriceSuggestion['trend'] = null;
  if (budget) {
    const ratio = avg / budget;
    trend = ratio < 0.95 ? 'low' : ratio > 1.05 ? 'high' : 'fair';
  }
  return { avg: Math.round(avg * 10) / 10, low, high, trend };
}

// ============================================================
//  Constants
// ============================================================
const OFFER_TEMPLATES = [
  { name: 'Single Owner, Low KM', text: 'Single owner, well-maintained, complete service history available. Insurance valid till next year.' },
  { name: 'Certified Pre-Owned', text: 'Fully inspected, certified pre-owned. All papers clear, no accidents, ready for RC transfer.' },
  { name: 'Competitive Pricing', text: 'Best market price, flexible on negotiation. Test drive available at our dealership location.' },
];

type SortOrder = 'newest' | 'oldest' | 'budget';
const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest', oldest: 'Oldest', budget: 'Highest Budget',
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
const BrokerDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { requirements, offers, addOffer, brokerListings, refreshData } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileBusinessName, setProfileBusinessName] = useState(user?.businessName || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileCity, setProfileCity] = useState(user?.city || '');

  // Local state persistence for workflow
  const [savedReqIds, setSavedReqIds] = useState<number[]>(() => {
    return JSON.parse(localStorage.getItem(`broker_saved_requirements_${user?.id}`) || '[]');
  });

  const [closedOfferIds, setClosedOfferIds] = useState<number[]>(() => {
    return JSON.parse(localStorage.getItem(`broker_closed_offer_ids_${user?.id}`) || '[]');
  });

  const [dealProgress, setDealProgress] = useState<Record<number, string>>(() => {
    return JSON.parse(localStorage.getItem(`broker_deal_progress_${user?.id}`) || '{}');
  });

  // Local offer overrides to support edit/delete locally
  const [deletedOfferIds, setDeletedOfferIds] = useState<number[]>(() => {
    return JSON.parse(localStorage.getItem(`broker_deleted_offer_ids_${user?.id}`) || '[]');
  });

  const [editedOffers, setEditedOffers] = useState<Record<number, { price: string; details: string }>>(() => {
    return JSON.parse(localStorage.getItem(`broker_edited_offers_${user?.id}`) || '{}');
  });

  // UI state variables
  const [activeReqId, setActiveReqId] = useState<number | null>(null);
  const [price, setPrice] = useState('');
  const [details, setDetails] = useState('');
  const [offerError, setOfferError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [inventoryPickerReqId, setInventoryPickerReqId] = useState<number | null>(null);
  
  // New Proposal Form fields
  const [variant, setVariant] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [dealerName, setDealerName] = useState('');
  const [dealerLocation, setDealerLocation] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [stockStatus, setStockStatus] = useState('In Stock');
  const [benefits, setBenefits] = useState('');
  const [registrationYear, setRegistrationYear] = useState('');
  const [kmDriven, setKmDriven] = useState('');
  const [ownership, setOwnership] = useState('1st Owner');
  const [insuranceValidTill, setInsuranceValidTill] = useState('');
  const [serviceHistory, setServiceHistory] = useState('Full Service History');
  const [vehicleCondition, setVehicleCondition] = useState('Excellent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Modals / dialogs
  const [confirmCloseOfferId, setConfirmCloseOfferId] = useState<number | null>(null);
  const [detailsDrawerReqId, setDetailsDrawerReqId] = useState<number | null>(null);
  const [editOfferId, setEditOfferId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDetails, setEditDetails] = useState('');

  // Handle mobile screen responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Poll database every 4 seconds for real-time notification updates
  useEffect(() => {
    const timer = setInterval(() => {
      refreshData();
    }, 4000);
    return () => clearInterval(timer);
  }, [refreshData]);

  // Save persistent state changes
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`broker_saved_requirements_${user.id}`, JSON.stringify(savedReqIds));
    }
  }, [savedReqIds, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`broker_closed_offer_ids_${user.id}`, JSON.stringify(closedOfferIds));
    }
  }, [closedOfferIds, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`broker_deal_progress_${user.id}`, JSON.stringify(dealProgress));
    }
  }, [dealProgress, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`broker_deleted_offer_ids_${user.id}`, JSON.stringify(deletedOfferIds));
    }
  }, [deletedOfferIds, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`broker_edited_offers_${user.id}`, JSON.stringify(editedOffers));
    }
  }, [editedOffers, user?.id]);



  // Sync profile editing fields with user auth context
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileBusinessName(user.businessName || '');
      setProfilePhone(user.phone || '');
      setProfileCity(user.city || '');
    }
  }, [user]);

  /* ---- PENDING VERIFICATION STATE ---- */
  if (user?.status === 'pending') {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: '520px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '48px 36px', marginTop: '60px' }}>
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

  // Set URL query param
  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  /* ============================================================
     DATA PARSING AND STATISTICS CALCULATIONS
     ============================================================ */
  const openReqs = requirements.filter(r => r.status === 'open');
  const myListings = brokerListings.filter(l => l.brokerId === user?.id);

  // Compute Offers
  const allRawOffers = offers.filter(o => o.brokerId === user?.id && !deletedOfferIds.includes(o.id));
  const myOffers = allRawOffers.map(o => {
    const override = editedOffers[o.id];
    if (override) {
      return { ...o, price: override.price, details: override.details };
    }
    return o;
  });

  // Stat 1: Active Buyer Requirements
  const activeBuyerRequirementsCount = openReqs.length;

  // Stat 2: Offers Submitted
  const offersSubmittedCount = myOffers.length;

  // Stat 3: Accepted Offers (Accepted but not Closed)
  const acceptedOffers = myOffers.filter(o => o.status === 'accepted' && !closedOfferIds.includes(o.id));
  const acceptedOffersCount = acceptedOffers.length;

  // Stat 4: Closed Deals
  const closedDeals = myOffers.filter(o => o.status === 'accepted' && closedOfferIds.includes(o.id));
  const closedDealsCount = closedDeals.length;

  // Stat 5: Total Deal Value (Sum of confirmed closed deals)
  const totalDealValue = closedDeals.reduce((sum, o) => sum + parsePriceToNumber(o.price), 0);

  // Sort requirements
  const sortedReqs = [...openReqs].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'budget':  return parsePriceToNumber(b.budget) - parsePriceToNumber(a.budget);
      default:        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  /* ---- HANDLERS ---- */
  const handleSubmitOffer = (e: React.FormEvent, reqId: number) => {
    e.preventDefault();
    if (!user?.phone) {
      const msg = 'Add your contact number in your broker profile before sending offers.';
      setOfferError(msg);
      toast.error(msg);
      return;
    }
    const req = requirements.find(r => r.id === reqId);
    if (!req) {
      toast.error('Requirement not found.');
      return;
    }
    if (!variant.trim()) {
      toast.error('Vehicle variant is required.');
      return;
    }
    if (!year.trim()) {
      toast.error('Model Year is required.');
      return;
    }
    if (!dealerName.trim()) {
      toast.error('Dealer Name is required.');
      return;
    }
    if (!dealerLocation.trim()) {
      toast.error('Dealer Location is required.');
      return;
    }

    if (user?.id) {
      const isUsed = req.vehicleType === 'used';
      addOffer({
        requirementId: reqId,
        brokerId: user.id,
        brokerName: user.businessName || user.name || 'Dealer',
        brokerPhone: user.phone,
        price,
        details: details || '',
        
        // New Mandatory Fields
        variant,
        year: Number(year),
        dealerName,
        dealerLocation,

        // Optional/Recommended
        priceBreakdown: priceBreakdown || '',
        deliveryTime: deliveryTime || '',
        stockStatus: stockStatus || '',
        benefits: benefits || '',

        // Used specific
        registrationYear: (isUsed && registrationYear) ? Number(registrationYear) : undefined,
        kmDriven: (isUsed && kmDriven) ? Number(kmDriven) : undefined,
        ownership: isUsed ? ownership : '',
        insuranceValidTill: isUsed ? insuranceValidTill : '',
        serviceHistory: isUsed ? serviceHistory : '',
        vehicleCondition: isUsed ? vehicleCondition : '',
      });

      setOfferError('');
      setActiveReqId(null);
      setInventoryPickerReqId(null);
      setShowTemplates(false);
      setPrice(''); 
      setDetails('');
      setVariant('');
      setYear(new Date().getFullYear().toString());
      setDealerName('');
      setDealerLocation('');
      setPriceBreakdown('');
      setDeliveryTime('');
      setStockStatus('In Stock');
      setBenefits('');
      setRegistrationYear('');
      setKmDriven('');
      setOwnership('1st Owner');
      setInsuranceValidTill('');
      setServiceHistory('Full Service History');
      setVehicleCondition('Excellent');
      toast.success('Offer submitted successfully!');
    }
  };

  const handleUpdateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editOfferId !== null) {
      const updated = { ...editedOffers, [editOfferId]: { price: editPrice, details: editDetails } };
      setEditedOffers(updated);
      setEditOfferId(null);
      toast.success('Offer updated successfully!');
    }
  };

  const handleDeleteOffer = (offerId: number) => {
    if (window.confirm('Are you sure you want to retract this offer? This cannot be undone.')) {
      setDeletedOfferIds([...deletedOfferIds, offerId]);
      toast.success('Offer retracted.');
    }
  };

  const handleCloseDeal = (offerId: number) => {
    if (!closedOfferIds.includes(offerId)) {
      setClosedOfferIds([...closedOfferIds, offerId]);
      // Set progress to Closed
      setDealProgress({ ...dealProgress, [offerId]: 'Closed' });
      toast.success('Deal closed and recorded!');
    }
    setConfirmCloseOfferId(null);
  };

  const handleUpdateProgress = (offerId: number, progress: string) => {
    const updated = { ...dealProgress, [offerId]: progress };
    setDealProgress(updated);
    toast.success(`Deal status updated to: ${progress}`);
  };

  const toggleSave = (reqId: number) => {
    setSavedReqIds(prev => {
      const exists = prev.includes(reqId);
      if (exists) {
        toast.success('Requirement removed from Saved');
        return prev.filter(id => id !== reqId);
      } else {
        toast.success('Requirement saved!');
        return [...prev, reqId];
      }
    });
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: profileName,
      businessName: profileBusinessName,
      phone: profilePhone,
      city: profileCity
    });
    toast.success('Profile settings saved successfully!');
  };

  // Generate notifications feed dynamically based on backend data (negotiations, accepts, rejects)
  const getNotifications = () => {
    const list = [
      { text: 'Verify your WhatsApp contact number in settings to get direct buyer alerts.', time: '1 day ago', isNew: false },
      { text: 'Admin approved your operating service area updates.', time: '3 days ago', isNew: false }
    ];

    myOffers.forEach(o => {
      const req = requirements.find(r => r.id === o.requirementId);
      const vehicleName = req ? `${req.make} ${req.model}` : 'car';
      
      if (closedOfferIds.includes(o.id)) {
        list.unshift({
          text: `Deal closed! The transaction for ${vehicleName} was confirmed closed.`,
          time: 'Recently',
          isNew: false
        });
      } else if (o.status === 'accepted') {
        list.unshift({
          text: `Deal won! Buyer accepted your offer of ${o.price} on ${vehicleName}.`,
          time: timeAgo(o.createdAt),
          isNew: true
        });
      } else if (o.status === 'rejected') {
        list.unshift({
          text: `Offer rejected by buyer for ${vehicleName}.`,
          time: timeAgo(o.createdAt),
          isNew: false
        });
      } else if (o.details && o.details.includes('[Negotiated:')) {
        const match = o.details.match(/\[Negotiated:\s*(.+?)\]/);
        const counterPrice = match ? match[1] : '—';
        list.unshift({
          text: `Counter offer received! Buyer countered ${counterPrice} on ${vehicleName}.`,
          time: timeAgo(o.createdAt),
          isNew: true
        });
      }
    });

    return list;
  };

  const notificationsList = getNotifications();

  /* ============================================================
     RENDER SECTIONS / VIEWS
     ============================================================ */

  const renderStatsRow = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
    }}>
      {/* 1. Active Buyer Requirements */}
      <div 
        onClick={() => setTab('requirements')}
        style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)', cursor: 'pointer' }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Target size={20} />
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{activeBuyerRequirementsCount}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Active Requirements</div>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Open on platform</div>
        </div>
      </div>

      {/* 2. Offers Submitted */}
      <div 
        onClick={() => setTab('offers')}
        style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)', cursor: 'pointer' }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={20} />
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{offersSubmittedCount}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Offers Submitted</div>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>All time</div>
        </div>
      </div>

      {/* 3. Accepted Offers */}
      <div 
        onClick={() => setTab('accepted')}
        style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)', cursor: 'pointer' }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(217,119,6,0.08)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Star size={20} />
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{acceptedOffersCount}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Accepted Offers</div>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>In Negotiation</div>
        </div>
      </div>

      {/* 4. Closed Deals */}
      <div 
        onClick={() => setTab('closed')}
        style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)', cursor: 'pointer' }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(5,150,105,0.08)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={20} />
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{closedDealsCount}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Closed Deals</div>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Won & Completed</div>
        </div>
      </div>

      {/* 5. Total Deal Value */}
      <div 
        onClick={() => setTab('closed')}
        style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(15,23,42,0.02)', cursor: 'pointer' }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(230,57,70,0.08)', color: '#e63946', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹</span>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {totalDealValue > 0 ? `₹${totalDealValue.toFixed(2)}L` : '₹0'}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Total Deal Value</div>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Closed Orders Only</div>
        </div>
      </div>
    </div>
  );

  const renderTabsRow = () => (
    <div style={{
      display: 'flex',
      gap: '24px',
      borderBottom: '2px solid #e2e8f0',
      marginBottom: '32px'
    }}>
      {[
        { id: 'requirements', label: `Available Requirements (${activeBuyerRequirementsCount})` },
        { id: 'offers', label: `My Offers (${offersSubmittedCount})` },
        { id: 'accepted', label: `Accepted Deals (${acceptedOffersCount})` },
        { id: 'closed', label: `Closed Deals (${closedDealsCount})` },
      ].map(tabItem => (
        <button
          key={tabItem.id}
          onClick={() => setTab(tabItem.id)}
          style={{
            padding: '12px 4px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            borderBottom: '3px solid',
            borderColor: currentTab === tabItem.id ? 'var(--color-primary)' : 'transparent',
            color: currentTab === tabItem.id ? 'var(--color-primary)' : '#64748b',
            marginBottom: '-2.5px',
            transition: 'all 0.2s',
            fontFamily: 'var(--font)'
          }}
        >
          {tabItem.label}
        </button>
      ))}
    </div>
  );

  const renderWorkflowBanner = () => (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '12px',
      padding: '12px 20px',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Briefcase size={15} color="var(--color-primary)" />
        <span style={{ fontSize: '0.8125rem', fontWeight: 800 }}>Primary Flow:</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
        <span>1. Available Req</span>
        <ArrowRight size={10} color="#64748b" />
        <span>2. Submit Offer</span>
        <ArrowRight size={10} color="#64748b" />
        <span>3. Buyer Shortlists</span>
        <ArrowRight size={10} color="#64748b" />
        <span>4. Offer Accepted</span>
        <ArrowRight size={10} color="#64748b" />
        <span style={{ color: 'var(--color-primary)' }}>5. Deal Closed</span>
      </div>
    </div>
  );

  const renderDashboardView = () => (
    <div>
      {/* Reduced Size Workflow Status Banner */}
      {renderWorkflowBanner()}

      {/* Quick Actions Grid (No Recent Activity panel) */}
      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <div 
          onClick={() => setTab('requirements')}
          className="card animate-in" 
          style={{ padding: '24px', cursor: 'pointer', border: '1.5px solid #e2e8f0', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37,99,235,0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Target size={18} />
          </div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Browse Requirements</h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
            Respond to {activeBuyerRequirementsCount} new buyer postings with competitive offers.
          </p>
        </div>

        <div 
          onClick={() => setTab('accepted')}
          className="card animate-in" 
          style={{ padding: '24px', cursor: 'pointer', border: '1.5px solid #e2e8f0', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(5,150,105,0.08)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Briefcase size={18} />
          </div>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Manage Accepted Deals</h4>
          <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
            You have {acceptedOffersCount} active accepted deals awaiting final confirmation.
          </p>
        </div>
      </div>
    </div>
  );

  const renderRequirementsView = () => {
    return (
      <div>
        {/* Sorting and Filter controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Available Buyer Requirements ({sortedReqs.length})
          </h2>
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSortMenu(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', background: '#fff', border: '1.5px solid #e2e8f0',
                borderRadius: '10px', fontWeight: 700, fontSize: '0.8125rem', color: '#475569',
                cursor: 'pointer', fontFamily: 'var(--font)'
              }}
            >
              Sort: {SORT_LABELS[sortOrder]} <ChevronDown size={14} />
            </button>
            {showSortMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '6px',
                background: '#fff', border: '1px solid var(--color-gray-200)',
                borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
                zIndex: 50, minWidth: '180px', overflow: 'hidden',
              }}>
                {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => { setSortOrder(key); setShowSortMenu(false); }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                      background: sortOrder === key ? 'rgba(230,57,70,0.08)' : '#fff',
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

        {/* Grid/List of requirements */}
        {sortedReqs.length === 0 ? (
          <div className="empty-state" style={{ padding: '64px 24px' }}>
            <AlertCircle size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>No Active Requirements</h4>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Check back later. New buyers join every day.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sortedReqs.map(req => {
              const alreadyOffered = myOffers.some(o => o.requirementId === req.id);
              const isSaved = savedReqIds.includes(req.id);
              const expires = expiresIn(req.createdAt);
              const responsesCount = offers.filter(o => o.requirementId === req.id).length;
              
              const fuelGuessed = getFuelType(req.model, req.description || '');
              const transGuessed = getTransmission(req.model, req.description || '');
              const locGuessed = extractLocation(req.description || '');

              const matchingInventory = myListings.filter(
                l => l.status === 'active' &&
                  (l.make.toLowerCase() === req.make.toLowerCase() || l.model.toLowerCase() === req.model.toLowerCase())
              );

              return (
                <div key={req.id} className="card animate-in" style={{ padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.02)' }}>
                  
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                          {req.vehicleType === 'new' ? 'New' : 'Used'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>Budget: <strong style={{ color: 'var(--color-primary)' }}>
                          {req.budgetMin && req.budgetMax ? `₹${req.budgetMin}L - ₹${req.budgetMax}L` : req.budget}
                        </strong></span>
                        <span>•</span>
                        <span>Location: <strong>{req.city && req.state ? `${req.city}, ${req.state}` : locGuessed}</strong></span>
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {expires && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: '3px',
                          fontSize: '0.6875rem', fontWeight: 700,
                          color: expires.urgent ? '#e63946' : '#d97706',
                          background: expires.urgent ? 'rgba(230,57,70,0.08)' : 'rgba(217,119,6,0.08)',
                          padding: '3px 8px', borderRadius: '12px'
                        }}>
                          <Clock size={11} /> {expires.text} left
                        </span>
                      )}
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 800,
                        background: 'rgba(5, 150, 105, 0.08)', color: '#059669', textTransform: 'uppercase'
                      }}>
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Specification Badges */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {req.vehicleType === 'new' ? (
                      <>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Fuel size={12} /> {req.fuelType || fuelGuessed}
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Gauge size={12} /> {req.transmission || transGuessed}
                        </span>
                        {req.colorPreference && (
                          <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                            Color: {req.colorPreference}
                          </span>
                        )}
                        {req.purchaseTimeline && (
                          <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                            Timeline: {req.purchaseTimeline}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarRange size={12} /> Year: {req.yearRange || 'Any'}
                        </span>
                        {req.maxKmDriven && (
                          <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                            Max KM: {req.maxKmDriven.toLocaleString()}
                          </span>
                        )}
                        {req.ownershipPreference && (
                          <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                            Owners: {req.ownershipPreference}
                          </span>
                        )}
                        {req.accidentHistoryPreference && (
                          <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                            Accidents: {req.accidentHistoryPreference}
                          </span>
                        )}
                      </>
                    )}
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                      Posted {timeAgo(req.createdAt)}
                    </span>
                  </div>

                  {/* Description */}
                  {req.description && (
                    <div style={{
                      padding: '12px 16px', background: '#f8fafc', borderRadius: '8px',
                      fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5,
                      borderLeft: '3px solid #cbd5e1', marginBottom: '16px', fontStyle: 'italic'
                    }}>
                      "{req.description}"
                    </div>
                  )}

                  {/* Response Counts */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <Users size={13} /> Responses: <strong>{responsesCount} dealer{responsesCount === 1 ? '' : 's'}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <Send size={13} /> Offers Sent: <strong>{responsesCount} total</strong>
                    </span>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!alreadyOffered && activeReqId !== req.id && (
                        <button
                          onClick={() => {
                            setActiveReqId(req.id);
                            setPrice('');
                            setDetails('');
                            setInventoryPickerReqId(null);
                            setOfferError('');
                            
                            // Initialize new fields
                            setVariant(req.variant || '');
                            setYear(new Date().getFullYear().toString());
                            setDealerName(user?.businessName || user?.name || '');
                            setDealerLocation(user?.city || '');
                            setPriceBreakdown('');
                            setDeliveryTime('');
                            setStockStatus('In Stock');
                            setBenefits('');
                            setRegistrationYear('');
                            setKmDriven('');
                            setOwnership('1st Owner');
                            setInsuranceValidTill('');
                            setServiceHistory('Full Service History');
                            setVehicleCondition('Excellent');
                          }}
                          style={{
                            padding: '8px 18px', background: 'linear-gradient(135deg, var(--color-primary), #cbd5e1)',
                            color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.8125rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 4px 12px rgba(230,57,70,0.2)'
                          }}
                        >
                          <Send size={12} /> Submit Offer
                        </button>
                      )}
                      
                      {alreadyOffered && (
                        <span style={{
                          padding: '6px 14px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.08)',
                          color: '#059669', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <Check size={12} /> Offer Submitted
                        </span>
                      )}

                      <button
                        onClick={() => setDetailsDrawerReqId(detailsDrawerReqId === req.id ? null : req.id)}
                        style={{
                          padding: '8px 14px', background: '#fff', border: '1.5px solid #cbd5e1',
                          color: '#475569', borderRadius: '10px', fontWeight: 700, fontSize: '0.8125rem',
                          cursor: 'pointer'
                        }}
                      >
                        View Details
                      </button>
                    </div>

                    <button
                      onClick={() => toggleSave(req.id)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: isSaved ? '#fbbf24' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font)'
                      }}
                    >
                      <Star size={14} fill={isSaved ? '#fbbf24' : 'none'} />
                      {isSaved ? 'Saved' : 'Save Requirement'}
                    </button>
                  </div>

                  {/* Inline Submit Offer Form */}
                  {activeReqId === req.id && (
                    <form
                      onSubmit={e => handleSubmitOffer(e, req.id)}
                      className="animate-in"
                      style={{
                        marginTop: '16px', padding: '20px',
                        background: '#f8fafc', borderRadius: '12px',
                        border: '1.5px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Send size={13} color="var(--color-primary)" /> Send Proposal
                        </h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {matchingInventory.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setInventoryPickerReqId(inventoryPickerReqId === req.id ? null : req.id)}
                              style={{
                                background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer',
                                fontSize: '0.75rem', color: '#475569', fontWeight: 700,
                                padding: '4px 10px', borderRadius: '8px',
                              }}
                            >
                              <Car size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                              Select Stock
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowTemplates(!showTemplates)}
                            style={{
                              background: 'rgba(37,99,235,0.06)', border: 'none', cursor: 'pointer',
                              fontSize: '0.75rem', color: '#2563eb', fontWeight: 700,
                              padding: '4px 10px', borderRadius: '8px',
                            }}
                          >
                            <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                            Templates
                          </button>
                        </div>
                      </div>

                      {/* Templates Menu */}
                      {showTemplates && (
                        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {OFFER_TEMPLATES.map((t, idx) => (
                            <button
                              key={idx} type="button"
                              onClick={() => { setDetails(t.text); setShowTemplates(false); }}
                              style={{
                                padding: '10px 12px', background: '#fff', border: '1px solid #e2e8f0',
                                borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font)',
                                textAlign: 'left', fontSize: '0.75rem'
                              }}
                            >
                              <strong>{t.name}</strong> - <span style={{ color: '#64748b' }}>{t.text.slice(0, 60)}...</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Inventory Picker Menu */}
                      {inventoryPickerReqId === req.id && matchingInventory.length > 0 && (
                        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Select Matching Stock Car
                          </span>
                          {matchingInventory.map(l => (
                            <button
                              key={l.id} type="button"
                              onClick={() => {
                                setPrice(`₹${l.price}L`);
                                setDetails(`${l.year} ${l.make} ${l.model} ${l.variant || ''}, ${l.kmDriven.toLocaleString()} km, ${l.fuelType}, ${l.transmission}`);
                                setInventoryPickerReqId(null);
                              }}
                              style={{
                                display: 'flex', justifyContent: 'space-between', padding: '8px 10px',
                                background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px',
                                cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.75rem'
                              }}
                            >
                              <span>{l.year} {l.make} {l.model}</span>
                              <strong style={{ color: 'var(--color-primary)' }}>₹{l.price}L</strong>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Dealer & Showroom Info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Dealer / Business Name *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Adyar Motors"
                            value={dealerName}
                            onChange={e => setDealerName(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Showroom Location *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Adyar, Chennai"
                            value={dealerLocation}
                            onChange={e => setDealerLocation(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Variant, Model Year & Price */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Vehicle Variant *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. ZXI+ AT"
                            value={variant}
                            onChange={e => setVariant(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Model Year *</label>
                          <input
                            required
                            type="number"
                            min="2000"
                            max={new Date().getFullYear() + 1}
                            placeholder="e.g. 2022"
                            value={year}
                            onChange={e => setYear(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Offer Price (Lakhs) *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. ₹14.5L"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* New vs Used conditional sections */}
                      {req.vehicleType === 'new' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px', padding: '12px', background: 'rgba(37,99,235,0.03)', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.1)' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Stock Status</label>
                            <select
                              value={stockStatus}
                              onChange={e => setStockStatus(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', background: '#fff', boxSizing: 'border-box' }}
                            >
                              <option value="In Stock">In Stock</option>
                              <option value="Ready to Dispatch">Ready to Dispatch</option>
                              <option value="Delivery 10-15 Days">Delivery 10-15 Days</option>
                              <option value="Delivery 30 Days">Delivery 30 Days</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Delivery Timeline</label>
                            <input
                              type="text"
                              placeholder="e.g. 3 Days, 2 Weeks"
                              value={deliveryTime}
                              onChange={e => setDeliveryTime(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '14px', padding: '12px', background: 'rgba(217,119,6,0.03)', borderRadius: '8px', border: '1px solid rgba(217,119,6,0.1)' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Registration Year</label>
                            <input
                              type="number"
                              placeholder="e.g. 2022"
                              value={registrationYear}
                              onChange={e => setRegistrationYear(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Kilometers Driven</label>
                            <input
                              type="number"
                              placeholder="e.g. 45000"
                              value={kmDriven}
                              onChange={e => setKmDriven(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Ownership</label>
                            <select
                              value={ownership}
                              onChange={e => setOwnership(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', background: '#fff', boxSizing: 'border-box' }}
                            >
                              <option value="1st Owner">1st Owner</option>
                              <option value="2nd Owner">2nd Owner</option>
                              <option value="3rd Owner">3rd Owner</option>
                              <option value="4th+ Owner">4th+ Owner</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Insurance Validity</label>
                            <input
                              type="text"
                              placeholder="e.g. Jan 2027, Expired"
                              value={insuranceValidTill}
                              onChange={e => setInsuranceValidTill(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Service History</label>
                            <select
                              value={serviceHistory}
                              onChange={e => setServiceHistory(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', background: '#fff', boxSizing: 'border-box' }}
                            >
                              <option value="Full Service History">Full Service History</option>
                              <option value="Partial History">Partial History</option>
                              <option value="No History Available">No History Available</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Vehicle Condition</label>
                            <select
                              value={vehicleCondition}
                              onChange={e => setVehicleCondition(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', background: '#fff', boxSizing: 'border-box' }}
                            >
                              <option value="Excellent">Excellent</option>
                              <option value="Good">Good</option>
                              <option value="Fair">Fair</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Optional Breakdown & Benefits */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Price Breakdown (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Ex-Showroom 13.5L + TCS 15k + Road Tax 85k"
                            value={priceBreakdown}
                            onChange={e => setPriceBreakdown(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Benefits & Inclusions (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Free Insurance + 5 Years Extended Warranty"
                            value={benefits}
                            onChange={e => setBenefits(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Notes / details */}
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Additional Notes (Optional)</label>
                        <textarea
                          placeholder="e.g. 2021 model, single owner, perfect condition"
                          value={details}
                          onChange={e => setDetails(e.target.value)}
                          style={{ width: '100%', height: '60px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary btn-sm"><Send size={12} /> Submit</button>
                        <button type="button" onClick={() => setActiveReqId(null)} className="btn btn-secondary btn-sm">Cancel</button>
                      </div>

                      {offerError && <p style={{ color: 'var(--color-primary)', fontSize: '0.75rem', marginTop: '8px', fontWeight: 600 }}>{offerError}</p>}
                    </form>
                  )}

                  {/* Expanded Drawer Details (AI Suggested Price & Buyer Stats) */}
                  {detailsDrawerReqId === req.id && (() => {
                    const aiSuggest = getSuggestedPrice(req.make, req.model, req.budget, brokerListings);
                    
                    return (
                      <div className="animate-in" style={{
                        marginTop: '16px', padding: '18px',
                        background: '#f8fafc', borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px'
                      }}>
                        {/* Column 1: AI Valuation */}
                        <div>
                          <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Zap size={13} color="#fbbf24" fill="#fbbf24" /> AI Pricing Insights
                          </h4>
                          {aiSuggest.avg ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Market Average:</span>
                                <strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>₹{aiSuggest.avg} Lakh</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Suggested Offer:</span>
                                <strong style={{ fontSize: '0.75rem', color: '#059669' }}>₹{aiSuggest.low}L – ₹{aiSuggest.high}L</strong>
                              </div>
                              {aiSuggest.trend && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Budget Trend:</span>
                                  <span style={{
                                    fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px',
                                    color: aiSuggest.trend === 'low' ? '#059669' : aiSuggest.trend === 'high' ? '#e63946' : '#d97706'
                                  }}>
                                    {aiSuggest.trend === 'low' ? <TrendingDown size={12} /> : aiSuggest.trend === 'high' ? <TrendingUp size={12} /> : null}
                                    {aiSuggest.trend === 'low' ? 'Below Market' : aiSuggest.trend === 'high' ? 'Premium Deal' : 'Fair Price'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                              Add inventory stock matching {req.make} or {req.model} to see suggested pricing valuations.
                            </p>
                          )}
                        </div>

                        {/* Column 2: Buyer Profile */}
                        <div>
                          <h4 style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={13} color="#2563eb" /> Buyer Context
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Verification:</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>Verified Contact</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Requested Features:</span>
                              <strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>{req.preferredFeature || 'Standard Package'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phone Access:</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Granted on offer acceptance</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderOffersView = () => {
    return (
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          My Sent Offers ({myOffers.length})
        </h2>

        {myOffers.length === 0 ? (
          <div className="empty-state" style={{ padding: '64px 24px' }}>
            <Send size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>No Offers Sent</h4>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Click on "Available Requirements" to make your first proposal.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Vehicle</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Buyer Budget</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Offered Price</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Submitted Date</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myOffers.map(o => {
                    const req = requirements.find(r => r.id === o.requirementId);
                    const vehicleName = req ? `${req.make} ${req.model}` : 'Unknown';
                    const budget = req ? req.budget : '—';
                    const location = req ? extractLocation(req.description || '') : 'Tamil Nadu';

                    // Parse potential counter offers
                    const isNegotiated = o.details ? o.details.includes('[Negotiated:') : false;
                    const counterMatch = o.details ? o.details.match(/\[Negotiated:\s*(.+?)\]/) : null;
                    const counterVal = counterMatch ? counterMatch[1] : '';

                    // Clean details
                    const cleanDetails = o.details ? o.details.split('\n[Negotiated:')[0].trim() : '';

                    // Derive granular statuses
                    let statusLabel = 'Pending';
                    let statusStyle = { background: '#fef3c7', color: '#d97706' }; // Yellow

                    if (closedOfferIds.includes(o.id)) {
                      statusLabel = 'Closed';
                      statusStyle = { background: '#f1f5f9', color: '#64748b' };
                    } else if (o.status === 'accepted') {
                      statusLabel = 'Accepted';
                      statusStyle = { background: '#d1fae5', color: '#059669' };
                    } else if (o.status === 'rejected') {
                      statusLabel = 'Rejected';
                      statusStyle = { background: '#fee2e2', color: '#e63946' };
                    } else if (o.status === 'pending') {
                      if (isNegotiated) {
                        statusLabel = 'Negotiating';
                        statusStyle = { background: '#fae8ff', color: '#a21caf' };
                      } else if (o.isRead) {
                        statusLabel = 'Viewed';
                        statusStyle = { background: '#e0e7ff', color: '#4338ca' };
                      } else if (o.id % 3 === 0) {
                        statusLabel = 'Shortlisted';
                        statusStyle = { background: '#fae8ff', color: '#a21caf' };
                      }
                    }

                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          {vehicleName}
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>{cleanDetails}</div>
                          {isNegotiated && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.6875rem', fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.06)', padding: '2px 6px', borderRadius: '4px', marginTop: '6px' }}>
                              <Zap size={10} /> Counter Offer: {counterVal}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>{budget}</td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#334155' }}>{location}</td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 800 }}>{o.price}</td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#64748b' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 800,
                            background: statusStyle.background, color: statusStyle.color
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {statusLabel === 'Accepted' ? (
                            <button
                              onClick={() => setTab('accepted')}
                              style={{
                                padding: '5px 12px', background: '#059669', color: '#fff',
                                border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              View Deal
                            </button>
                          ) : statusLabel === 'Closed' || statusLabel === 'Rejected' ? (
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>—</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => {
                                  setEditOfferId(o.id);
                                  setEditPrice(isNegotiated ? counterVal : o.price);
                                  setEditDetails(cleanDetails);
                                }}
                                style={{
                                  padding: '5px 10px', background: '#f1f5f9', color: '#475569',
                                  border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                {isNegotiated ? 'Counter Back' : 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDeleteOffer(o.id)}
                                style={{
                                  padding: '5px 10px', background: 'transparent', color: '#e63946',
                                  border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Retract
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Offer Modal */}
        {editOfferId !== null && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <form onSubmit={handleUpdateOffer} style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '450px', width: '100%', boxShadow: 'var(--shadow-xl)' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Modify Offer Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>New Offer Price</label>
                  <input
                    required
                    type="text"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Comments / Vehicle Stats</label>
                  <input
                    required
                    type="text"
                    value={editDetails}
                    onChange={e => setEditDetails(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
                <button type="button" onClick={() => setEditOfferId(null)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };

  const renderAcceptedDealsView = () => {
    return (
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          Accepted Deals (Active Negotiations)
        </h2>

        {acceptedOffers.length === 0 ? (
          <div className="empty-state" style={{ padding: '64px 24px' }}>
            <Briefcase size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>No Active Accepted Deals</h4>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Deals accepted by buyers appear here for you to finalize.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            {acceptedOffers.map(o => {
              const req = requirements.find(r => r.id === o.requirementId);
              const vehicleName = req ? `${req.make} ${req.model}` : 'Unknown Car';
              const location = req ? extractLocation(req.description || '') : 'Tamil Nadu';
              const currentProgress = dealProgress[o.id] || 'Contacted';
              const cleanDetails = (o.details || '').split('\n[Negotiated:')[0].trim();

              return (
                <div key={o.id} className="card animate-in" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{vehicleName}</h3>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Buyer Location: <strong>{location}</strong></p>
                      {cleanDetails && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                          "{cleanDetails}"
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#059669' }}>{o.price}</span>
                      <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Accepted Price</p>
                    </div>
                  </div>

                  {/* Buyer Contact details */}
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      Buyer Contact Info
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{o.brokerPhone || '+91 91500 91500'}</span>
                      <a href={`tel:${o.brokerPhone || '9150091500'}`} style={{ textDecoration: 'none' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                          <Phone size={12} fill="var(--color-primary)" /> Call Buyer
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Pipeline Step Picker */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.6875rem', color: '#475569', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Deal Progress Pipeline
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={currentProgress}
                        onChange={e => handleUpdateProgress(o.id, e.target.value)}
                        style={{
                          width: '100%', padding: '10px 32px 10px 12px', borderRadius: '8px',
                          border: '1.5px solid #cbd5e1', fontFamily: 'var(--font)', fontSize: '0.8125rem',
                          background: '#fff', cursor: 'pointer', appearance: 'none', outline: 'none'
                        }}
                      >
                        <option value="Contacted">1. Buyer Contacted</option>
                        <option value="Paperwork">2. Document Check / Paperwork</option>
                        <option value="Payment Pending">3. Payment & RTO Pending</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Last updated: Just now</span>
                    
                    <button
                      onClick={() => setConfirmCloseOfferId(o.id)}
                      style={{
                        padding: '8px 16px', background: 'linear-gradient(135deg, #059669, #10b981)',
                        color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8125rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        boxShadow: '0 3px 8px rgba(5,150,105,0.2)'
                      }}
                    >
                      <CheckCircle2 size={13} /> Confirm Close Deal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal to Close Deal */}
        {confirmCloseOfferId !== null && (() => {
          const matchingOffer = myOffers.find(o => o.id === confirmCloseOfferId);
          const req = matchingOffer ? requirements.find(r => r.id === matchingOffer.requirementId) : null;
          const name = req ? `${req.make} ${req.model}` : 'car';
          const priceStr = matchingOffer ? matchingOffer.price : '₹0L';
          const askedStr = req ? req.budget : '₹0L';

          return (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
            }}>
              <div style={{ background: '#fff', borderRadius: '20px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 40px rgba(15,23,42,0.2)', overflow: 'hidden' }}>
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(5, 150, 105, 0.08)',
                    color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                  }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Confirm Deal Finalization?</h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
                    Are you sure you want to mark the deal for <strong>{name}</strong> as Closed?
                    <span style={{ display: 'block', marginTop: '8px', fontSize: '0.8125rem', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      Asked Price (Budget): <strong>{askedStr}</strong><br />
                      Selled Price (Offer): <strong style={{ color: 'var(--color-primary)' }}>{priceStr}</strong>
                    </span>
                    Only after confirmation will the deal value of <strong>{priceStr}</strong> be calculated into your dashboard statistics.
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleCloseDeal(confirmCloseOfferId)}
                      style={{
                        flex: 1, padding: '12px', background: '#059669', color: '#fff',
                        border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer'
                      }}
                    >
                      Yes, Finalize Deal
                    </button>
                    <button
                      onClick={() => setConfirmCloseOfferId(null)}
                      style={{
                        flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569',
                        border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderClosedDealsView = () => {
    return (
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          Closed Deals Log (Completed Transactions)
        </h2>

        {closedDeals.length === 0 ? (
          <div className="empty-state" style={{ padding: '64px 24px' }}>
            <Check size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>No Closed Deals</h4>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Your completed orders will be archived here.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Vehicle</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Asked Price (Budget)</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Selled Price (Deal Value)</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Closed Date</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Earnings</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Buyer Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {closedDeals.map(o => {
                    const req = requirements.find(r => r.id === o.requirementId);
                    const vehicleName = req ? `${req.make} ${req.model}` : 'Unknown Car';
                    const location = req ? extractLocation(req.description || '') : 'Tamil Nadu';
                    const budget = req ? req.budget : '—';
                    
                    const ratingVal = (o.id % 2 === 0) ? 5 : 4;
                    const cleanDetails = (o.details || '').split('\n[Negotiated:')[0].trim();

                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          {vehicleName}
                          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>{cleanDetails}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#475569' }}>{budget}</td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#0f172a', fontWeight: 800 }}>{o.price}</td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#475569' }}>{location}</td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#64748b' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#059669', fontWeight: 800 }}>{o.price}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {Array.from({ length: ratingVal }).map((_, i) => (
                              <Star key={i} size={13} fill="#fbbf24" color="#fbbf24" />
                            ))}
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: '4px', color: '#475569' }}>{ratingVal}.0</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMessagesView = () => (
    <div className="card" style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(230, 57, 70, 0.08)', color: 'var(--color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
      }}>
        <MessageSquare size={28} />
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Messages Portal</h3>
      <span style={{
        display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
        background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed',
        fontSize: '0.75rem', fontWeight: 700, marginBottom: '16px'
      }}>Feature Under Development</span>
      <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, margin: '0 auto' }}>
        The live negotiation chat feature between brokers and buyers is currently under active development.
        In the meantime, you can reach out and finalize deals directly by calling the buyer using their contact details, which are unlocked and visible in the <strong>Accepted Deals</strong> panel.
      </p>
    </div>
  );

  const renderNotificationsView = () => (
    <div className="card animate-in" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Notifications Feed</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notificationsList.map((n, i) => (
          <div key={i} style={{
            padding: '12px 16px', background: n.isNew ? 'rgba(230,57,70,0.04)' : '#f8fafc',
            borderRadius: '10px', border: n.isNew ? '1px solid rgba(230,57,70,0.1)' : '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: '#334155', margin: 0, fontWeight: n.isNew ? 700 : 500 }}>{n.text}</p>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>{n.time}</span>
            </div>
            {n.isNew && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }}></span>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfileView = () => (
    <div className="card animate-in" style={{ padding: '32px' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px' }}>Profile & Service Settings</h3>
      
      <form onSubmit={saveProfile}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label className="form-label">Full Name / Owner Name</label>
            <input
              required
              className="form-control"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Business Name</label>
            <input
              required
              className="form-control"
              value={profileBusinessName}
              onChange={e => setProfileBusinessName(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Contact Phone</label>
            <input
              required
              className="form-control"
              value={profilePhone}
              onChange={e => setProfilePhone(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Office Location City</label>
            <input
              required
              className="form-control"
              value={profileCity}
              onChange={e => setProfileCity(e.target.value)}
            />
          </div>
        </div>



        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Settings size={15} /> Save Settings
        </button>
      </form>
    </div>
  );

  return (
    <section style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', position: 'relative', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      
      {/* Mobile Sidebar Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)',
            zIndex: 89, transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* ----- LEFT SIDEBAR ----- */}
      <div style={{
        position: 'fixed', top: '60px', bottom: 0, left: 0,
        width: sidebarOpen ? '280px' : '0px',
        background: '#fff', borderRight: '1px solid #e2e8f0',
        padding: sidebarOpen ? '24px 16px' : '24px 0px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        zIndex: 90, overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: sidebarOpen ? 1 : 0
      }}>
        {/* Navigation Head */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', color: '#475569', fontWeight: 700, fontSize: '0.9375rem', whiteSpace: 'nowrap'
        }}>
          <Briefcase size={18} style={{ color: '#475569' }} />
          <span>Broker Portal</span>
        </div>

        {/* Navigation Items */}
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <Target size={16} />, badge: 0 },
          { id: 'requirements', label: 'Available Requirements', icon: <Car size={16} />, badge: activeBuyerRequirementsCount },
          { id: 'offers', label: 'My Offers', icon: <Send size={16} />, badge: offersSubmittedCount },
          { id: 'accepted', label: 'Accepted Deals', icon: <Star size={16} />, badge: acceptedOffersCount },
          { id: 'closed', label: 'Closed Deals', icon: <CheckCircle2 size={16} />, badge: closedDealsCount },
        ].map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); if (isMobile) setSidebarOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 16px', borderRadius: '12px', border: 'none',
                background: isActive ? '#fff0f1' : 'transparent',
                color: isActive ? '#e63946' : '#526071',
                fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.875rem',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span style={{
                  background: isActive ? 'var(--color-primary)' : '#526071', color: '#fff',
                  width: '20px', height: '20px', borderRadius: '50%',
                  fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{item.badge}</span>
              )}
            </button>
          );
        })}

        <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0', minHeight: '1px' }} />

        {/* Sub Navigation Items */}
        {[
          { id: 'messages', label: 'Messages', icon: <MessageSquare size={16} />, badge: 0 },
          { id: 'notifications', label: 'Notifications', icon: <Bell size={16} />, badge: notificationsList.filter(n => n.isNew).length },
          { id: 'profile', label: 'Profile Settings', icon: <Settings size={16} />, badge: 0 }
        ].map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'messages') {
                  toast('Messages feature is under development.', { icon: '💬' });
                }
                setTab(item.id);
                if (isMobile) setSidebarOpen(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 16px', borderRadius: '12px', border: 'none',
                background: isActive ? '#fff0f1' : 'transparent',
                color: isActive ? '#e63946' : '#526071',
                fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.875rem',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span style={{
                  background: isActive ? 'var(--color-primary)' : '#526071', color: '#fff',
                  width: '20px', height: '20px', borderRadius: '50%',
                  fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{item.badge}</span>
              )}
            </button>
          );
        })}

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
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #cbd5e1',
                background: '#fff', color: '#475569', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                {currentTab === 'dashboard' ? 'Broker Dashboard' :
                 currentTab === 'requirements' ? 'Available Requirements' :
                 currentTab === 'offers' ? 'My Offers' :
                 currentTab === 'accepted' ? 'Accepted Deals' :
                 currentTab === 'closed' ? 'Closed Deals' :
                 currentTab === 'messages' ? 'Messages' :
                 currentTab === 'notifications' ? 'Notifications' :
                 'Profile Settings'}
              </h1>
              <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
                {currentTab === 'dashboard' ? 'Overview of your sales progression, pending requirements, and actions.' :
                 currentTab === 'requirements' ? 'Verfied dealer and buyer specifications currently requesting offers.' :
                 currentTab === 'offers' ? 'Edit, view, and manage your sent proposals and buyer statuses.' :
                 currentTab === 'accepted' ? 'Fulfill negotiations, contact buyer directly, and close your orders.' :
                 currentTab === 'closed' ? 'Archive log of your completed transactions and sales revenue.' :
                 currentTab === 'messages' ? 'Live negotiation chat portal between you and active buyers.' :
                 currentTab === 'notifications' ? 'Alerts history of read receipts and shortlist statuses.' :
                 'Manage operating districts and dealership brand parameters.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Stats bar for main dashboard elements */}
        {(['dashboard', 'requirements', 'offers', 'accepted', 'closed'].includes(currentTab)) && renderStatsRow()}

        {/* Main tabs bar for ease of jumping */}
        {(['requirements', 'offers', 'accepted', 'closed'].includes(currentTab)) && renderTabsRow()}

        {/* Main Content Render Switch */}
        {currentTab === 'dashboard' && renderDashboardView()}
        {currentTab === 'requirements' && renderRequirementsView()}
        {currentTab === 'offers' && renderOffersView()}
        {currentTab === 'accepted' && renderAcceptedDealsView()}
        {currentTab === 'closed' && renderClosedDealsView()}
        {currentTab === 'messages' && renderMessagesView()}
        {currentTab === 'notifications' && renderNotificationsView()}
        {currentTab === 'profile' && renderProfileView()}

      </div>
    </section>
  );
};

export default BrokerDashboard;

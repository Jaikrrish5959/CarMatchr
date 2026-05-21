import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Home, Users, Image as ImageIcon, Cpu, Settings,
  MessageSquare, BookOpen, ArrowUpRight, Plus, Trash2,
  Check, TrendingUp, Sparkles, ShieldCheck
} from 'lucide-react';
import { useCatalog } from '../contexts/useCatalog';
import { authHeaders } from '../services/authService';

function authJsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders() };
}

type AdminUser = {
  id: string;
  email: string;
  role: 'buyer' | 'broker' | 'admin';
  status: 'active' | 'pending';
  name?: string;
  businessName?: string;
  phone?: string;
  city?: string;
};

const AdminDashboard: React.FC = () => {
  const { brands, refreshCatalog } = useCatalog();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [features, setFeatures] = useState<Array<{ id: number; name: string }>>([]);
  const [featureId, setFeatureId] = useState<number | null>(null);

  // Layout states
  const [activeTab, setActiveTab] = useState<'overview' | 'brokers' | 'media' | 'features'>('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  };

  const loadFeatures = async () => {
    try {
      const res = await fetch('/api/catalog/features');
      const data = await res.json();
      setFeatures(Array.isArray(data) ? data : []);
    } catch {
      setFeatures([]);
    }
  };

  useEffect(() => {
    loadUsers();
    loadFeatures();
  }, []);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) ?? null,
    [brands, selectedBrandId]
  );
  const selectedModel = useMemo(
    () => selectedBrand?.models.find((m) => m.id === selectedModelId) ?? null,
    [selectedBrand, selectedModelId]
  );

  const approveBroker = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: authJsonHeaders(),
        body: JSON.stringify({ status: 'active' }),
      });
      toast.success('Broker approved successfully!');
      await loadUsers();
    } catch {
      toast.error('Failed to approve broker.');
    }
  };

  const saveBrandLogo = async () => {
    if (!selectedBrandId || !logoUrl) {
      toast.error('Please select a brand and enter a valid logo URL.');
      return;
    }
    try {
      await fetch(`/api/admin/brands/${selectedBrandId}/logo`, {
        method: 'PATCH',
        headers: authJsonHeaders(),
        body: JSON.stringify({ logoUrl }),
      });
      toast.success('Brand logo updated');
      setLogoUrl('');
      await refreshCatalog();
    } catch {
      toast.error('Failed to update brand logo.');
    }
  };

  const saveModelImage = async () => {
    if (!selectedModelId || !imageUrl) {
      toast.error('Please select a model and enter a valid image URL.');
      return;
    }
    try {
      await fetch(`/api/admin/models/${selectedModelId}/image`, {
        method: 'PATCH',
        headers: authJsonHeaders(),
        body: JSON.stringify({ imageUrl }),
      });
      toast.success('Model image updated');
      setImageUrl('');
      await refreshCatalog();
    } catch {
      toast.error('Failed to update model image.');
    }
  };

  const createFeature = async () => {
    if (!featureName.trim()) {
      toast.error('Please specify a feature name.');
      return;
    }
    try {
      await fetch('/api/admin/features', {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify({ name: featureName.trim() }),
      });
      setFeatureName('');
      toast.success('Feature added successfully!');
      await loadFeatures();
    } catch {
      toast.error('Failed to add feature.');
    }
  };

  const assignFeature = async () => {
    if (!selectedModelId || !featureId) {
      toast.error('Please select a model and a feature to assign.');
      return;
    }
    try {
      await fetch('/api/admin/model-features', {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify({ modelId: selectedModelId, featureId }),
      });
      toast.success('Feature assigned to model!');
      await refreshCatalog();
    } catch {
      toast.error('Failed to assign feature.');
    }
  };

  const removeFeature = async (mId: number, fId: number) => {
    try {
      await fetch('/api/admin/model-features', {
        method: 'DELETE',
        headers: authJsonHeaders(),
        body: JSON.stringify({ modelId: mId, featureId: fId }),
      });
      toast.success('Feature removed');
      await refreshCatalog();
    } catch {
      toast.error('Failed to remove feature.');
    }
  };

  const pendingBrokers = useMemo(() => users.filter(u => u.role === 'broker' && u.status === 'pending'), [users]);
  const activeBrokers = useMemo(() => users.filter(u => u.role === 'broker' && u.status === 'active'), [users]);
  const buyersCount = useMemo(() => users.filter(u => u.role === 'buyer').length, [users]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
      backgroundSize: '24px 24px',
      fontFamily: "'Inter', sans-serif",
      padding: '32px 24px',
      color: '#0f172a',
      display: 'flex',
      gap: '32px'
    }}>
      
      {/* ── LEFT SIDEBAR (Pill Shape) ── */}
      <div style={{
        width: '76px',
        background: '#09090b',
        borderRadius: '38px',
        padding: '36px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: '32px',
        flexShrink: 0
      }}>
        {/* Top Logo Icon */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #e1f893 0%, #a3e635 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '56px',
          cursor: 'pointer',
          fontWeight: 800,
          color: '#09090b',
          fontSize: '1rem',
          boxShadow: '0 0 15px rgba(225,248,147,0.4)'
        }}>
          C
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'overview' ? '#e1f893' : '#64748b',
              padding: '12px', borderRadius: '50%', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Overview"
          >
            <Home size={20} strokeWidth={activeTab === 'overview' ? 2.5 : 2} />
          </button>

          <button
            onClick={() => setActiveTab('brokers')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'brokers' ? '#e1f893' : '#64748b',
              padding: '12px', borderRadius: '50%', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Broker Approvals"
          >
            <Users size={20} strokeWidth={activeTab === 'brokers' ? 2.5 : 2} />
          </button>

          <button
            onClick={() => setActiveTab('media')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'media' ? '#e1f893' : '#64748b',
              padding: '12px', borderRadius: '50%', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Brand & Model Catalog"
          >
            <ImageIcon size={20} strokeWidth={activeTab === 'media' ? 2.5 : 2} />
          </button>

          <button
            onClick={() => setActiveTab('features')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'features' ? '#e1f893' : '#64748b',
              padding: '12px', borderRadius: '50%', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Features Console"
          >
            <Cpu size={20} strokeWidth={activeTab === 'features' ? 2.5 : 2} />
          </button>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'var(--color-primary-light)', display: 'flex',
            alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
            color: 'var(--color-primary)', cursor: 'pointer'
          }}>
            <Settings size={18} />
          </div>

          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: '#e1f893', border: '2px solid #e1f893',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.75rem', color: '#09090b'
          }}>
            AD
          </div>
        </div>
      </div>

      {/* ── MAIN DASHBOARD CONTAINER ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* TOP ROW HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#09090b', marginBottom: '4px' }}>
              Business Performance
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Live metrics, broker validations, and centralized marketplace controls
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Theme Toggle pill */}
            <button
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                toast.success(isDarkMode ? 'Light mode enabled' : 'Dark mode preview enabled (Visual mockup)');
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
              }}
            >
              {isDarkMode ? '🌙' : '☀️'}
            </button>

            {/* Pale Lime Button */}
            <button
              onClick={() => toast.success('Launching Growth Action Wizard')}
              style={{
                background: '#e1f893',
                color: '#09090b',
                border: 'none',
                borderRadius: '24px',
                padding: '12px 24px',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(225,248,147,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(225,248,147,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(225,248,147,0.3)';
              }}
            >
              <Sparkles size={14} /> Launch Admin Action
            </button>
          </div>
        </div>

        {/* TAB CONTROLS (Pills) */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'brokers', label: 'Broker Validation' },
            { id: 'media', label: 'Catalog Media' },
            { id: 'features', label: 'Model Features' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '20px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                background: activeTab === t.id ? '#09090b' : '#fff',
                color: activeTab === t.id ? '#fff' : '#64748b',
                boxShadow: activeTab === t.id ? '0 4px 12px rgba(9,9,11,0.15)' : 'var(--shadow-sm)',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PANES RENDERER ── */}
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
            
            {/* Left Big Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Top Row Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                
                {/* CARD 1: Conversion Quality */}
                <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '24px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '16px' }}>
                    <span>Broker Conversion</span>
                    <span>•••</span>
                  </div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                    {pendingBrokers.length > 0 ? 'Pending Action' : '100% Validated'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{pendingBrokers.length} broker approval requests awaiting</span>
                  </div>
                  
                  {/* Decorative chart line */}
                  <div style={{ marginTop: '24px', height: '36px' }}>
                    <svg viewBox="0 0 100 20" style={{ width: '100%', height: '100%' }}>
                      <path d="M0,15 Q25,8 50,14 T100,5" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                      <path d="M0,15 Q25,8 50,14 T100,5" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="3 3" />
                    </svg>
                  </div>
                </div>

                {/* CARD 2: Avg Deal Value (Pale Lime Green Accent) */}
                <div className="card" style={{
                  padding: '24px',
                  background: '#e1f893',
                  borderRadius: '24px',
                  position: 'relative',
                  boxShadow: '0 10px 15px -3px rgba(225,248,147,0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#09090b', opacity: 0.6, fontSize: '0.8125rem', fontWeight: 600, marginBottom: '16px' }}>
                    <span>Active Brokers</span>
                    <span>•••</span>
                  </div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                    {activeBrokers.length}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#09090b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(9,9,11,0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                    <TrendingUp size={12} /> Live catalog contributors
                  </div>

                  {/* Visual Rounded Pills Bar indicators */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '28px' }}>
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: '8px', borderRadius: '4px',
                        background: i < activeBrokers.length ? '#09090b' : 'rgba(9,9,11,0.1)'
                      }} />
                    ))}
                  </div>
                </div>

                {/* CARD 3: Unlock advanced agent capability (Black Gradient Card) */}
                <div className="card" style={{
                  padding: '24px',
                  background: 'linear-gradient(135deg, #09090b 0%, #1e293b 100%)',
                  borderRadius: '24px',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '6px', color: '#fff' }}>
                      Security Shield ✦ Active
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Anti-compromise middlewares and rate limiters fully active.
                    </p>
                  </div>

                  <button
                    onClick={() => toast.success('Integrity scan: 100% secure')}
                    style={{
                      background: '#fff', color: '#09090b', border: 'none',
                      borderRadius: '16px', padding: '8px 16px', fontSize: '0.75rem',
                      fontWeight: 700, cursor: 'pointer', marginTop: '16px',
                      alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <ShieldCheck size={12} color="#10b981" /> Verify Firewall
                  </button>
                </div>

              </div>

              {/* CARD 4: Revenue Insight (Large Bar Chart card) */}
              <div className="card" style={{ padding: '32px', background: '#fff', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#09090b', marginBottom: '4px' }}>Platform Activity Insight</h3>
                    <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>Active registration & approval timelines over previous periods</p>
                  </div>
                  <select className="form-control" style={{ width: '100px', padding: '6px 12px', fontSize: '0.8125rem' }}>
                    <option>2026</option>
                    <option>2025</option>
                  </select>
                </div>

                {/* SVG Visual Bar Chart */}
                <div style={{ position: 'relative', marginTop: '36px' }}>
                  {/* Floating Peak badge */}
                  <div style={{
                    position: 'absolute', top: '-24px', left: '60%', transform: 'translateX(-50%)',
                    background: '#09090b', color: '#fff', fontSize: '0.6875rem', fontWeight: 800,
                    padding: '6px 12px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    <TrendingUp size={10} color="#e1f893" /> Peak: Today {activeBrokers.length + pendingBrokers.length + buyersCount} Users
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    {[
                      { label: 'Jan', val: 3 },
                      { label: 'Feb', val: 5 },
                      { label: 'Mar', val: 4 },
                      { label: 'Apr', val: 6 },
                      { label: 'May', val: activeBrokers.length + pendingBrokers.length + buyersCount },
                    ].map((item, idx) => {
                      const maxVal = Math.max(activeBrokers.length + pendingBrokers.length + buyersCount, 8);
                      const pctHeight = (item.val / maxVal) * 100;
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '100%',
                            height: `${pctHeight}%`,
                            background: '#e1f893',
                            borderRadius: '12px 12px 0 0',
                            position: 'relative',
                            display: 'flex',
                            justifyContent: 'center',
                            transition: 'height 0.4s ease-out'
                          }}>
                            {/* Black circle dot on top */}
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%', background: '#09090b',
                              position: 'absolute', top: '8px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CARD 5: System Health Console */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* Health indicator */}
                <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>System Health</span>
                    <span style={{ fontSize: '0.6875rem', color: '#10b981', background: '#d1fae5', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>Live</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                    99.98%
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                    Automated API integrity validations running cleanly on local SQLite db configurations.
                  </p>
                </div>

                {/* Next Best Action */}
                <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '24px' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '12px' }}>Next Action Suggestion</span>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', lineHeight: 1.4, marginBottom: '14px' }}>
                    Approve pending brokers to release catalog updates in key metropolitan cities.
                  </p>
                  <button
                    onClick={() => setActiveTab('brokers')}
                    style={{
                      background: '#09090b', color: '#fff', border: 'none', borderRadius: '12px',
                      padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Resolve Pending Brokers
                  </button>
                </div>

              </div>

            </div>

            {/* Right Mini Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Twin Buttons: Messages + Knowledge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => toast.success('Direct broker communications initialized')}
                  style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
                    padding: '16px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '8px', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <MessageSquare size={18} color="var(--color-primary)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>Messages</span>
                </button>

                <button
                  onClick={() => toast.success('Opening admin knowledge base')}
                  style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
                    padding: '16px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '8px', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <BookOpen size={18} color="var(--color-primary)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>Knowledge</span>
                </button>
              </div>

              {/* Menu List of Operations */}
              <div className="card" style={{ padding: '24px 16px', background: '#fff', borderRadius: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { title: 'Brokers List', count: users.filter(u => u.role === 'broker').length, desc: 'View and manage brokers', action: () => setActiveTab('brokers') },
                    { title: 'Registered Buyers', count: buyersCount, desc: 'View current car buyers', action: () => toast.success(`Active Buyer Accounts: ${buyersCount}`) },
                    { title: 'Brand Catalog', count: brands.length, desc: 'Media and logo uploads', action: () => setActiveTab('media') },
                    { title: 'Assigned Features', count: features.length, desc: 'Unique model specifications', action: () => setActiveTab('features') },
                    { title: 'Security Audits', count: 'Strict', desc: 'Secure middleware states', action: () => toast.success('Vite + Express OWASP Hardening Active') },
                  ].map((opt, idx) => (
                    <div
                      key={idx}
                      onClick={opt.action}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                        borderRadius: '16px', cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary-light)',
                        color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ArrowUpRight size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#09090b', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{opt.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 800 }}>{opt.count}</span>
                        </div>
                        <p style={{ fontSize: '0.6875rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '1px' }}>{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* BROKERS PANEL */}
        {activeTab === 'brokers' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
            
            {/* Validations list */}
            <div className="card" style={{ padding: '32px', background: '#fff', borderRadius: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', marginBottom: '4px' }}>Pending Approvals</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '24px' }}>Verify documents and validate credentials before broker onboarding</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingBrokers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', border: '1px dashed #e2e8f0', borderRadius: '16px' }}>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>No pending broker approvals.</p>
                  </div>
                ) : (
                  pendingBrokers.map(u => (
                    <div key={u.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 20px', background: '#f8fafc', borderRadius: '16px',
                      border: '1px solid #e2e8f0', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#09090b' }}>{u.businessName || u.email}</div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Phone: {u.phone || 'N/A'} · City: {u.city || 'N/A'}
                        </p>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => approveBroker(u.id)} style={{ gap: '4px' }}>
                        <Check size={14} /> Approve Onboarding
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active brokers */}
            <div className="card" style={{ padding: '32px', background: '#fff', borderRadius: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', marginBottom: '4px' }}>Verified Partners</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '24px' }}>Currently authorized dealer channels contributing to catalog</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeBrokers.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>No active partners.</p>
                ) : (
                  activeBrokers.map(u => (
                    <div key={u.id} style={{
                      padding: '12px 16px', background: '#f8fafc', borderRadius: '12px',
                      border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#09090b' }}>{u.businessName || u.name || u.email}</div>
                        <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 700 }}>✓ Verified Broker</span>
                      </div>
                      <span className="badge badge-active" style={{ fontSize: '0.6875rem', background: '#d1fae5', color: '#10b981' }}>Active</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* CATALOG MEDIA PANEL */}
        {activeTab === 'media' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            {/* Brand Logo Upload */}
            <div className="card" style={{ padding: '32px', background: '#fff', borderRadius: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', marginBottom: '4px' }}>Brand Logo Asset</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '24px' }}>Upload brand graphics and customize logos shown in search grids</p>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Choose Brand</label>
                <select className="form-control" value={selectedBrandId ?? ''} onChange={(e) => { setSelectedBrandId(Number(e.target.value)); setSelectedModelId(null); }}>
                  <option value="">Select Brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {selectedBrand && selectedBrand.logoUrl && (
                <div style={{
                  padding: '16px', background: 'var(--color-primary-light)', borderRadius: '16px',
                  display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px'
                }}>
                  <img src={selectedBrand.logoUrl} alt={selectedBrand.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#09090b' }}>Current Asset Graphic</div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>{selectedBrand.logoUrl}</p>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Logo URL</label>
                <input className="form-control" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="e.g. https://logos.com/hyundai.png" />
              </div>

              <button className="btn btn-primary" onClick={saveBrandLogo}>Update Brand Logo</button>
            </div>

            {/* Model Image Upload */}
            <div className="card" style={{ padding: '32px', background: '#fff', borderRadius: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', marginBottom: '4px' }}>Model Showcase Image</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '24px' }}>Update model showcase images for requirements and listing cards</p>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Choose Brand</label>
                <select className="form-control" value={selectedBrandId ?? ''} onChange={(e) => { setSelectedBrandId(Number(e.target.value)); setSelectedModelId(null); }}>
                  <option value="">Select Brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Choose Model</label>
                <select className="form-control" value={selectedModelId ?? ''} onChange={(e) => setSelectedModelId(Number(e.target.value))} disabled={!selectedBrandId}>
                  <option value="">Select Model</option>
                  {selectedBrand?.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {selectedModel && selectedModel.imageUrl && (
                <div style={{
                  padding: '16px', background: 'var(--color-primary-light)', borderRadius: '16px',
                  display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px'
                }}>
                  <img src={selectedModel.imageUrl} alt={selectedModel.name} style={{ width: '64px', height: '44px', objectFit: 'cover', borderRadius: '8px' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#09090b' }}>Current Showcase Image</div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>{selectedModel.imageUrl}</p>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Image URL</label>
                <input className="form-control" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="e.g. https://images.com/creta.jpg" />
              </div>

              <button className="btn btn-primary" onClick={saveModelImage}>Update Showcase Image</button>
            </div>

          </div>
        )}

        {/* FEATURES PANEL */}
        {activeTab === 'features' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Features configuration list */}
            <div className="card" style={{ padding: '32px', background: '#fff', borderRadius: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b', marginBottom: '4px' }}>Feature Specifications Console</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '24px' }}>Create, assign, and customize technical and premium features across catalog listings</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '16px', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Add New Feature</label>
                  <input className="form-control" value={featureName} onChange={(e) => setFeatureName(e.target.value)} placeholder="e.g. Panoramic Sunroof" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Target Model</label>
                  <select className="form-control" value={selectedModelId ?? ''} onChange={(e) => setSelectedModelId(Number(e.target.value))}>
                    <option value="">Choose model</option>
                    {brands.flatMap((b) => b.models.map((m) => <option key={m.id} value={m.id}>{b.name} - {m.name}</option>))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#09090b' }}>Target Feature</label>
                  <select className="form-control" value={featureId ?? ''} onChange={(e) => setFeatureId(Number(e.target.value))}>
                    <option value="">Choose feature</option>
                    {features.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" onClick={createFeature} style={{ height: '42px', padding: '0 20px', gap: '4px' }}><Plus size={16} /> Add</button>
                  <button className="btn btn-secondary" onClick={assignFeature} style={{ height: '42px', padding: '0 20px' }}>Assign Feature</button>
                </div>
              </div>

              {/* Selected Model Details & Features */}
              {selectedModel ? (
                <div style={{
                  padding: '24px', background: '#f8fafc', borderRadius: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', marginBottom: '4px' }}>
                    {selectedBrand?.name} {selectedModel.name}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '16px' }}>Currently configured features on this model:</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedModel.features.length === 0 ? (
                      <span style={{ fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic' }}>No features currently assigned.</span>
                    ) : (
                      selectedModel.features.map((f) => (
                        <span key={f.id} className="badge badge-info" style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          padding: '6px 12px', fontSize: '0.75rem', borderRadius: '10px',
                          background: '#fff', border: '1px solid #e2e8f0', color: '#09090b',
                          fontWeight: 700
                        }}>
                          {f.name}
                          <button
                            onClick={() => removeFeature(selectedModelId!, f.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444',
                              padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Remove feature connection"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '36px 0', border: '1px dashed #e2e8f0', borderRadius: '20px',
                  textAlign: 'center', color: '#64748b', fontSize: '0.875rem'
                }}>
                  Select a model from the dropdown above to view and manage its assigned specifications.
                </div>
              )}
            </div>

          </div>
        )}

      </div>
      
    </div>
  );
};

export default AdminDashboard;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, MapPin, Building2, Globe, Lock,
  Bell, BellOff, Shield, CheckCircle2, AlertTriangle,
  ChevronRight, Save, LogOut, Trash2, Eye, EyeOff, Loader2,
  BadgeCheck, Languages, MessageSquare, FileText,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { API_BASE } from '../services/api';
import { getToken } from '../services/authService';
import toast from 'react-hot-toast';
import OtpModal from '../components/OtpModal';


// ─── Types ────────────────────────────────────────────────────────────────────

type BuyerTab = 'personal' | 'preferences' | 'security';
type DealerTab = 'business' | 'public' | 'notifications' | 'verification' | 'security';

interface NotifPrefs {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  newRequirementAlerts: boolean;
  offerUpdates: boolean;
  buyerMessages: boolean;
}

const defaultNotifPrefs = (userId: number): NotifPrefs => {
  try {
    const raw = localStorage.getItem(`notif_prefs_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return {
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    newRequirementAlerts: true,
    offerUpdates: true,
    buyerMessages: false,
  };
};

const saveNotifPrefs = (userId: number, prefs: NotifPrefs) => {
  localStorage.setItem(`notif_prefs_${userId}`, JSON.stringify(prefs));
};

// ─── Common helpers ────────────────────────────────────────────────────────────

const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '11px',
      width: '100%', padding: '11px 14px', border: 'none', borderRadius: '10px',
      background: active ? 'var(--color-primary-light)' : 'transparent',
      color: active ? 'var(--color-primary)' : 'var(--color-gray-600)',
      fontWeight: active ? 800 : 600, fontSize: '0.875rem', cursor: 'pointer',
      textAlign: 'left', transition: 'all 0.15s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-gray-50)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    {icon}
    <span style={{ flex: 1 }}>{label}</span>
    {active && <ChevronRight size={14} />}
  </button>
);

const SectionTitle: React.FC<{ children: React.ReactNode; subtitle?: string }> = ({ children, subtitle }) => (
  <div style={{ marginBottom: '24px' }}>
    <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: subtitle ? '4px' : 0 }}>{children}</h2>
    {subtitle && <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>{subtitle}</p>}
  </div>
);

const FormField: React.FC<{
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
}> = ({ label, icon, children, hint }) => (
  <div style={{ marginBottom: '18px' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: '6px' }}>
      {icon} {label}
    </label>
    {children}
    {hint && <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: '4px' }}>{hint}</p>}
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, sublabel, icon, checked, onChange }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', borderRadius: '12px',
    background: checked ? 'var(--color-primary-light)' : 'var(--color-gray-50)',
    border: `1px solid ${checked ? 'rgba(230,57,70,0.15)' : 'var(--color-gray-200)'}`,
    marginBottom: '10px', transition: 'all 0.15s',
  }}>
    {icon && <div style={{ color: checked ? 'var(--color-primary)' : 'var(--color-gray-400)', flexShrink: 0 }}>{icon}</div>}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{label}</div>
      {sublabel && <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{sublabel}</div>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none',
        background: checked ? 'var(--color-primary)' : 'var(--color-gray-300)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px', left: checked ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s',
      }} />
    </button>
  </div>
);

const input = {
  width: '100%', padding: '10px 13px', border: '1px solid var(--color-gray-200)',
  borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
  fontFamily: 'var(--font)', background: '#fff', color: 'var(--color-gray-900)',
  boxSizing: 'border-box' as const,
};

const inputDisabled = {
  ...input,
  background: 'var(--color-gray-50)',
  color: 'var(--color-gray-500)',
  cursor: 'not-allowed',
};

// ─── States listing ───────────────────────────────────────────────────────────

const STATES = [
  'Tamil Nadu', 'Maharashtra', 'Karnataka', 'Delhi', 'Telangana',
  'Gujarat', 'Rajasthan', 'West Bengal', 'Uttar Pradesh', 'Kerala',
];

const LANGUAGES = ['English', 'Tamil', 'Hindi', 'Telugu', 'Malayalam', 'Kannada'];

// ─── Main Component ───────────────────────────────────────────────────────────

const ProfileSettings: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const isBuyer = user?.role === 'buyer';

  // ── Buyer state
  const [buyerTab, setBuyerTab] = useState<BuyerTab>('personal');

  // ── Dealer state
  const [dealerTab, setDealerTab] = useState<DealerTab>('business');

  // ─── Shared form state
  const [form, setForm] = useState({
    name: user?.name ?? '',
    businessName: user?.businessName ?? '',
    phone: (user?.phone && user.phone.startsWith('+91')) ? user.phone.slice(3) : (user?.phone ?? ''),
    email: user?.email ?? '',
    state: user?.state ?? '',
    city: user?.city ?? '',
    address: user?.address ?? '',
    authorizedBrands: user?.authorizedBrands ?? '',
    showroomAddress: user?.showroomAddress ?? '',
    businessType: (user?.businessType ?? 'dealer') as 'dealer' | 'individual',
    description: user?.description ?? '',
    website: user?.website ?? '',
    mapsLink: user?.mapsLink ?? '',
    language: user?.language ?? 'English',
  });

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() =>
    user ? defaultNotifPrefs(user.id) : defaultNotifPrefs(0)
  );

  const [saving, setSaving] = useState(false);

  // ── Phone OTP verification
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);

  // ── Password modal
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // ── Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleChange = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleNotifChange = (k: keyof NotifPrefs, v: boolean) => {
    const updated = { ...notifPrefs, [k]: v };
    setNotifPrefs(updated);
    if (user) saveNotifPrefs(user.id, updated);
  };

  const handleSave = async (phoneOtp?: string | React.MouseEvent) => {
    if (!user) return;
    setSaving(true);
    try {
      const token = getToken();
      
      // Validate mobile number format
      if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) {
        toast.error('Please enter a valid 10-digit mobile number.');
        setSaving(false);
        return;
      }

      const payload: Record<string, string | null> = {
        phone: form.phone.trim() ? `+91${form.phone.trim()}` : null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        address: form.address.trim() || null,
        language: form.language || null,
        description: form.description.trim() || null,
      };

      // If phone changed, require OTP
      const cleanUserPhone = (user.phone && user.phone.startsWith('+91')) ? user.phone.slice(3) : (user.phone || '');
      const phoneChanged = form.phone.trim() !== cleanUserPhone;
      const isOtpString = typeof phoneOtp === 'string';
      if (phoneChanged && !isOtpString) {
        setSaving(false);
        setShowPhoneOtpModal(true);
        return;
      }
      if (isOtpString) payload.phoneOtp = phoneOtp;

      if (isBuyer) {
        payload.name = form.name.trim() || null;
      } else {
        payload.business_name = form.businessName.trim() || null;
        payload.authorized_brands = form.authorizedBrands.trim() || null;
        payload.showroom_address = form.showroomAddress.trim() || null;
        payload.business_type = form.businessType || null;
        payload.website = form.website.trim() || null;
        payload.maps_link = form.mapsLink.trim() || null;
      }

      const res = await fetch(`${API_BASE}/api/users/${user.id}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Could not save settings.');
        return;
      }

      updateUser({
        phone: form.phone.trim() ? `+91${form.phone.trim()}` : undefined,
        phoneVerified: isOtpString ? true : user.phoneVerified,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        address: form.address.trim() || undefined,
        language: form.language || undefined,
        description: form.description.trim() || undefined,
        ...(isBuyer
          ? { name: form.name.trim() || undefined }
          : {
              businessName: form.businessName.trim() || undefined,
              authorizedBrands: form.authorizedBrands.trim() || undefined,
              showroomAddress: form.showroomAddress.trim() || undefined,
              businessType: form.businessType || undefined,
              website: form.website.trim() || undefined,
              mapsLink: form.mapsLink.trim() || undefined,
            }),
      });

      toast.success('Profile saved!');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdForm.newPwd !== pwdForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (pwdForm.newPwd.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setPwdSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/users/${user!.id}/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.newPwd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Password change failed.');
        return;
      }
      toast.success('Password changed successfully!');
      setShowPwdModal(false);
      setPwdForm({ current: '', newPwd: '', confirm: '' });
    } finally {
      setPwdSaving(false);
    }
  };

  const handleLogoutAll = () => {
    logout();
    navigate('/login');
    toast.success('Logged out from all devices.');
  };

  // ─── Buyer Tabs content ──────────────────────────────────────────────────────

  const buyerPersonalTab = (
    <div>
      <SectionTitle subtitle="Update your personal information">Personal Information</SectionTitle>
      <FormField label="Full Name" icon={<User size={13} />}>
        <input style={input} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Your full name" />
      </FormField>
      <FormField label="Mobile Number" icon={<Phone size={13} />} hint="Used so dealers can contact you directly.">
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <select
            style={{
              padding: '10px 12px', border: '1px solid var(--color-gray-200)',
              borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
              background: '#f8fafc', color: 'var(--color-gray-700)', fontWeight: 600,
              width: '100px', pointerEvents: 'none'
            }}
            tabIndex={-1}
          >
            <option>+91 (IN)</option>
          </select>
          <input
            style={{ ...input, flex: 1 }}
            value={form.phone}
            onChange={e => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter your 10-digit mobile number"
            type="tel"
          />
        </div>
      </FormField>
      <FormField label="Email Address" icon={<Mail size={13} />} hint="Email cannot be changed.">
        <input style={inputDisabled} value={form.email} readOnly />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <FormField label="State" icon={<MapPin size={13} />}>
          <select style={input} value={form.state} onChange={e => handleChange('state', e.target.value)}>
            <option value="">Select state</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="City">
          <input style={input} value={form.city} onChange={e => handleChange('city', e.target.value)} placeholder="Your city" />
        </FormField>
      </div>
      <button
        onClick={handleSave} disabled={saving}
        style={{
          marginTop: '8px', padding: '11px 24px', background: 'var(--color-primary)',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const buyerPrefsTab = (
    <div>
      <SectionTitle subtitle="Manage your language and notification preferences">Preferences</SectionTitle>
      <FormField label="Preferred Language" icon={<Languages size={13} />}>
        <select style={input} value={form.language} onChange={e => handleChange('language', e.target.value)}>
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </FormField>
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-gray-700)', marginBottom: '12px' }}>Notification Preferences</h3>
        <ToggleRow
          label="Push Notifications"
          sublabel="In-app alerts for new offers and updates"
          icon={<Bell size={16} />}
          checked={notifPrefs.pushNotifications}
          onChange={v => handleNotifChange('pushNotifications', v)}
        />
        <ToggleRow
          label="Email Notifications"
          sublabel="Send updates to your email address"
          icon={<Mail size={16} />}
          checked={notifPrefs.emailNotifications}
          onChange={v => handleNotifChange('emailNotifications', v)}
        />
        <ToggleRow
          label="SMS Notifications"
          sublabel="Get text alerts for accepted offers"
          icon={<Phone size={16} />}
          checked={notifPrefs.smsNotifications}
          onChange={v => handleNotifChange('smsNotifications', v)}
        />
      </div>
    </div>
  );

  const buyerSecurityTab = (
    <div>
      <SectionTitle subtitle="Manage your account security">Security</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => setShowPwdModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 18px', border: '1px solid var(--color-gray-200)',
            borderRadius: '12px', background: '#fff', cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230,57,70,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} color="#4f46e5" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Change Password</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Update your account password</div>
          </div>
          <ChevronRight size={16} color="var(--color-gray-400)" />
        </button>

        <button
          onClick={handleLogoutAll}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 18px', border: '1px solid var(--color-gray-200)',
            borderRadius: '12px', background: '#fff', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={18} color="#d97706" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Logout From All Devices</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>End all active sessions</div>
          </div>
          <ChevronRight size={16} color="var(--color-gray-400)" />
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 18px', border: '1px solid #fecaca',
            borderRadius: '12px', background: '#fff7f7', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e63946'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230,57,70,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} color="#e63946" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e63946' }}>Delete Account</div>
            <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Permanently delete your account and data</div>
          </div>
          <ChevronRight size={16} color="#f87171" />
        </button>
      </div>
    </div>
  );

  // ─── Dealer Tabs content ─────────────────────────────────────────────────────

  const dealerBusinessTab = (
    <div>
      <SectionTitle subtitle="Update your dealership information">Business Information</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <FormField label="Business Name" icon={<Building2 size={13} />}>
          <input style={input} value={form.businessName} onChange={e => handleChange('businessName', e.target.value)} placeholder="ABC Motors" />
        </FormField>
        <FormField label="Owner Name" icon={<User size={13} />}>
          <input style={input} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Owner's name" />
        </FormField>
        <FormField label="Mobile Number" icon={<Phone size={13} />}>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <select
              style={{
                padding: '10px 12px', border: '1px solid var(--color-gray-200)',
                borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
                background: '#f8fafc', color: 'var(--color-gray-700)', fontWeight: 600,
                width: '100px', pointerEvents: 'none'
              }}
              tabIndex={-1}
            >
              <option>+91 (IN)</option>
            </select>
            <input
              style={{ ...input, flex: 1 }}
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter your 10-digit mobile number"
              type="tel"
            />
          </div>
        </FormField>
        <FormField label="Email Address" icon={<Mail size={13} />} hint="Cannot be changed.">
          <input style={inputDisabled} value={form.email} readOnly />
        </FormField>
        <FormField label="State" icon={<MapPin size={13} />}>
          <select style={input} value={form.state} onChange={e => handleChange('state', e.target.value)}>
            <option value="">Select state</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="City">
          <input style={input} value={form.city} onChange={e => handleChange('city', e.target.value)} placeholder="City" />
        </FormField>
      </div>
      <FormField label="Business Address" icon={<MapPin size={13} />}>
        <input style={input} value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Full showroom / business address" />
      </FormField>

      <div style={{ marginTop: '8px', padding: '16px', background: 'var(--color-gray-50)', borderRadius: '12px', border: '1px solid var(--color-gray-200)', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-gray-700)', marginBottom: '14px' }}>Dealer Details</h3>
        {user?.dealerType === 'new' || user?.dealerType === 'both' ? (
          <>
            <FormField label="Authorized Brands">
              <input style={input} value={form.authorizedBrands} onChange={e => handleChange('authorizedBrands', e.target.value)} placeholder="e.g. Hyundai, Tata Motors" />
            </FormField>
            <FormField label="Showroom Address">
              <input style={input} value={form.showroomAddress} onChange={e => handleChange('showroomAddress', e.target.value)} placeholder="Official showroom address" />
            </FormField>
          </>
        ) : (
          <FormField label="Business Type">
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['dealer', 'individual'] as const).map(bt => (
                <button key={bt}
                  onClick={() => handleChange('businessType', bt)}
                  style={{
                    flex: 1, padding: '10px', border: `1.5px solid ${form.businessType === bt ? 'var(--color-primary)' : 'var(--color-gray-200)'}`,
                    borderRadius: '10px', background: form.businessType === bt ? 'var(--color-primary-light)' : '#fff',
                    color: form.businessType === bt ? 'var(--color-primary)' : 'var(--color-gray-600)',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >{bt === 'dealer' ? 'Dealer' : 'Individual Seller'}</button>
              ))}
            </div>
          </FormField>
        )}
      </div>

      <button
        onClick={handleSave} disabled={saving}
        style={{
          padding: '11px 24px', background: 'var(--color-primary)',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );

  const dealerPublicTab = (
    <div>
      <SectionTitle subtitle="Control what buyers see on your public dealer profile">Public Profile</SectionTitle>
      <FormField label="Business Description" icon={<FileText size={13} />} hint="Shown on your dealer profile page. Keep it concise and professional.">
        <textarea
          value={form.description}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="Brief description of your dealership — services, specializations, years in business…"
          rows={4}
          style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
        />
      </FormField>
      <FormField label="Website" icon={<Globe size={13} />} hint="Optional">
        <input style={input} value={form.website} onChange={e => handleChange('website', e.target.value)} placeholder="https://yourdealership.com" type="url" />
      </FormField>
      <FormField label="Google Maps Link" icon={<MapPin size={13} />} hint="Optional — paste the Maps link to your showroom">
        <input style={input} value={form.mapsLink} onChange={e => handleChange('mapsLink', e.target.value)} placeholder="https://maps.google.com/..." />
      </FormField>
      <button
        onClick={handleSave} disabled={saving}
        style={{
          marginTop: '4px', padding: '11px 24px', background: 'var(--color-primary)',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}
        {saving ? 'Saving…' : 'Save Public Profile'}
      </button>
    </div>
  );

  const dealerNotifTab = (
    <div>
      <SectionTitle subtitle="Choose which notifications you receive">Notification Preferences</SectionTitle>
      <ToggleRow
        label="New Requirement Alerts"
        sublabel="Get notified when buyers post matching requirements"
        icon={<Bell size={16} />}
        checked={notifPrefs.newRequirementAlerts}
        onChange={v => handleNotifChange('newRequirementAlerts', v)}
      />
      <ToggleRow
        label="Offer Updates"
        sublabel="Shortlist, accept or reject notifications"
        icon={<MessageSquare size={16} />}
        checked={notifPrefs.offerUpdates}
        onChange={v => handleNotifChange('offerUpdates', v)}
      />
      <ToggleRow
        label="Buyer Messages"
        sublabel="Feature under development — coming soon"
        icon={<MessageSquare size={16} />}
        checked={notifPrefs.buyerMessages}
        onChange={v => handleNotifChange('buyerMessages', v)}
      />
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-gray-100)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-gray-700)', marginBottom: '12px' }}>Delivery Channels</h3>
        <ToggleRow label="Email Notifications" icon={<Mail size={16} />} checked={notifPrefs.emailNotifications} onChange={v => handleNotifChange('emailNotifications', v)} />
        <ToggleRow label="SMS Notifications" icon={<Phone size={16} />} checked={notifPrefs.smsNotifications} onChange={v => handleNotifChange('smsNotifications', v)} />
      </div>
    </div>
  );

  const dealerVerifTab = (
    <div>
      <SectionTitle subtitle="Your account verification status">Verification Status</SectionTitle>
      {[
        { label: 'Mobile Verified', done: !!user?.phoneVerified, sub: user?.phoneVerified ? user?.phone ?? 'Verified' : (user?.phone ? 'Phone added but not verified' : 'Not added') },
        { label: 'Email Verified', done: true, sub: user?.email ?? '' },
        { label: 'Business Verified', done: user?.status === 'active', sub: user?.status === 'active' ? 'Your business is verified' : 'Pending admin review' },
      ].map(v => (
        <div key={v.label} style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '16px 18px', borderRadius: '12px',
          background: v.done ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${v.done ? '#bbf7d0' : 'var(--color-gray-200)'}`,
          marginBottom: '10px',
        }}>
          {v.done
            ? <CheckCircle2 size={22} color="#16a34a" />
            : <AlertTriangle size={22} color="#f59e0b" />
          }
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-gray-900)' }}>{v.label}</div>
            <div style={{ fontSize: '0.75rem', color: v.done ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>{v.sub}</div>
          </div>
          {v.done
            ? <BadgeCheck size={16} color="#16a34a" style={{ marginLeft: 'auto' }} />
            : (v.label === 'Mobile Verified' && user?.phone && (
              <button
                onClick={() => setShowPhoneOtpModal(true)}
                style={{
                  padding: '7px 16px', background: 'var(--color-primary)',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Verify Now
              </button>
            ))
          }
        </div>
      ))}
    </div>
  );

  const dealerSecurityTab = (
    <div>
      <SectionTitle subtitle="Manage your account security">Security</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => setShowPwdModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 18px', border: '1px solid var(--color-gray-200)',
            borderRadius: '12px', background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px #eef2ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} color="#4f46e5" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Change Password</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Update your account password</div>
          </div>
          <ChevronRight size={16} color="var(--color-gray-400)" />
        </button>

        <button
          onClick={handleLogoutAll}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 18px', border: '1px solid var(--color-gray-200)',
            borderRadius: '12px', background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 0 3px #fffbeb'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={18} color="#d97706" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Logout From All Devices</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>End all active sessions immediately</div>
          </div>
          <ChevronRight size={16} color="var(--color-gray-400)" />
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 18px', border: '1px solid #fecaca',
            borderRadius: '12px', background: '#fff7f7', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e63946'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230,57,70,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BellOff size={18} color="#e63946" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e63946' }}>Deactivate Account</div>
            <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Temporarily disable your dealer account</div>
          </div>
          <ChevronRight size={16} color="#f87171" />
        </button>
      </div>
    </div>
  );

  // ─── Avatar initials ─────────────────────────────────────────────────────────

  const displayName = isBuyer ? (user?.name ?? user?.email) : (user?.businessName ?? user?.email);
  const initials = (displayName ?? '?').split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh', padding: '32px 0 64px' }}>
      <div className="container" style={{ maxWidth: '900px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>Profile Settings</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Manage your account, preferences, and security settings</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>

          {/* ── Sidebar ── */}
          <div>
            {/* Avatar card */}
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '20px',
              border: '1px solid var(--color-gray-200)', textAlign: 'center', marginBottom: '12px',
            }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.375rem', fontWeight: 800, margin: '0 auto 10px',
              }}>
                {initials}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{displayName}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px',
                background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                borderRadius: '20px', padding: '2px 10px', fontSize: '0.6875rem', fontWeight: 700,
              }}>
                <Shield size={10} />
                {user?.role === 'buyer' ? 'Buyer' : user?.dealerType ? `${user.dealerType} Dealer` : 'Dealer'}
              </div>
            </div>

            {/* Nav items */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '8px', border: '1px solid var(--color-gray-200)' }}>
              {isBuyer ? (
                <>
                  <SidebarItem icon={<User size={15} />} label="Personal Info" active={buyerTab === 'personal'} onClick={() => setBuyerTab('personal')} />
                  <SidebarItem icon={<Bell size={15} />} label="Preferences" active={buyerTab === 'preferences'} onClick={() => setBuyerTab('preferences')} />
                  <SidebarItem icon={<Lock size={15} />} label="Security" active={buyerTab === 'security'} onClick={() => setBuyerTab('security')} />
                </>
              ) : (
                <>
                  <SidebarItem icon={<Building2 size={15} />} label="Business Info" active={dealerTab === 'business'} onClick={() => setDealerTab('business')} />
                  <SidebarItem icon={<Globe size={15} />} label="Public Profile" active={dealerTab === 'public'} onClick={() => setDealerTab('public')} />
                  <SidebarItem icon={<Bell size={15} />} label="Notifications" active={dealerTab === 'notifications'} onClick={() => setDealerTab('notifications')} />
                  <SidebarItem icon={<BadgeCheck size={15} />} label="Verification" active={dealerTab === 'verification'} onClick={() => setDealerTab('verification')} />
                  <SidebarItem icon={<Lock size={15} />} label="Security" active={dealerTab === 'security'} onClick={() => setDealerTab('security')} />
                </>
              )}
            </div>
          </div>

          {/* ── Main Content ── */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 32px', border: '1px solid var(--color-gray-200)' }}>
            {isBuyer ? (
              <>
                {buyerTab === 'personal' && buyerPersonalTab}
                {buyerTab === 'preferences' && buyerPrefsTab}
                {buyerTab === 'security' && buyerSecurityTab}
              </>
            ) : (
              <>
                {dealerTab === 'business' && dealerBusinessTab}
                {dealerTab === 'public' && dealerPublicTab}
                {dealerTab === 'notifications' && dealerNotifTab}
                {dealerTab === 'verification' && dealerVerifTab}
                {dealerTab === 'security' && dealerSecurityTab}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      {showPwdModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
        }} onClick={() => setShowPwdModal(false)}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={18} color="#4f46e5" />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>Change Password</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Enter your current and new password</p>
              </div>
            </div>

            {[
              { key: 'current', label: 'Current Password' },
              { key: 'newPwd', label: 'New Password' },
              { key: 'confirm', label: 'Confirm New Password' },
            ].map(f => (
              <FormField key={f.key} label={f.label} icon={<Lock size={13} />}>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...input, paddingRight: '40px' }}
                    type={showPwd ? 'text' : 'password'}
                    value={pwdForm[f.key as keyof typeof pwdForm]}
                    onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </FormField>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setShowPwdModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid var(--color-gray-200)', borderRadius: '10px', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleChangePassword} disabled={pwdSaving} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: '#4f46e5', color: '#fff', fontWeight: 800, cursor: pwdSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: pwdSaving ? 0.7 : 1 }}>
                {pwdSaving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />}
                {pwdSaving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete/Deactivate Confirmation Modal ── */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} color="#e63946" />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--color-gray-900)', marginBottom: '8px' }}>
              {isBuyer ? 'Delete Account?' : 'Deactivate Account?'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '24px' }}>
              {isBuyer
                ? 'This will permanently delete your account and all your requirements. This cannot be undone.'
                : 'Your dealer account will be deactivated. You can reactivate it by contacting support.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '11px', border: '1px solid var(--color-gray-200)', borderRadius: '10px', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => { toast.error('Account deletion requires contacting support.'); setShowDeleteModal(false); }}
                style={{ flex: 1, padding: '11px', border: 'none', borderRadius: '10px', background: '#e63946', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                {isBuyer ? 'Delete' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Phone OTP Modal (triggered on phone change or Verify Now) */}
      {showPhoneOtpModal && (
        <OtpModal
          phone={`+91${form.phone.trim() || ((user?.phone && user.phone.startsWith('+91')) ? user.phone.slice(3) : user?.phone)}`}
          title="Verify Phone Number"
          subtitle="Enter the 6-digit code sent to your phone to confirm ownership."
          onVerified={(otp) => {
            setShowPhoneOtpModal(false);
            handleSave(otp);
          }}
          onClose={() => setShowPhoneOtpModal(false)}
        />
      )}
    </div>
  );
};

export default ProfileSettings;

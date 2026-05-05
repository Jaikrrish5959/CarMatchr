import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useCatalog } from '../contexts/useCatalog';

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

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  const loadFeatures = async () => {
    const res = await fetch('/api/catalog/features');
    const data = await res.json();
    setFeatures(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    Promise.resolve()
      .then(() => loadUsers())
      .catch(() => setUsers([]));
    Promise.resolve()
      .then(() => loadFeatures())
      .catch(() => setFeatures([]));
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
    await fetch(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    toast.success('Broker approved');
    await loadUsers();
  };

  const saveBrandLogo = async () => {
    if (!selectedBrandId || !logoUrl) return;
    await fetch(`/api/admin/brands/${selectedBrandId}/logo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoUrl }),
    });
    toast.success('Brand logo updated');
    await refreshCatalog();
  };

  const saveModelImage = async () => {
    if (!selectedModelId || !imageUrl) return;
    await fetch(`/api/admin/models/${selectedModelId}/image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    toast.success('Model image updated');
    await refreshCatalog();
  };

  const createFeature = async () => {
    if (!featureName.trim()) return;
    await fetch('/api/admin/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: featureName.trim() }),
    });
    setFeatureName('');
    toast.success('Feature added');
    await loadFeatures();
  };

  const assignFeature = async () => {
    if (!selectedModelId || !featureId) return;
    await fetch('/api/admin/model-features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: selectedModelId, featureId }),
    });
    toast.success('Feature assigned');
    await refreshCatalog();
  };

  const removeFeature = async (mId: number, fId: number) => {
    await fetch('/api/admin/model-features', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: mId, featureId: fId }),
    });
    toast.success('Feature removed');
    await refreshCatalog();
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '1100px' }}>
        <h1 className="page-title">Admin Console</h1>
        <p className="page-subtitle">Manage brokers, logos, images, and model features.</p>

        <div className="grid grid-2" style={{ marginTop: '20px' }}>
          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>Broker Approvals</h3>
            {users.filter((u) => u.role === 'broker').map((u) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-gray-100)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{u.businessName || u.email}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{u.phone || 'No phone'}</div>
                </div>
                {u.status === 'pending' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => approveBroker(u.id)}>Approve</button>
                ) : (
                  <span className="badge badge-active">active</span>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>Brand and Model Media</h3>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <select className="form-control" value={selectedBrandId ?? ''} onChange={(e) => { setSelectedBrandId(Number(e.target.value)); setSelectedModelId(null); }}>
                <option value="">Select brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Brand logo URL</label>
              <input className="form-control" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
              <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={saveBrandLogo}>Save Logo</button>
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <select className="form-control" value={selectedModelId ?? ''} onChange={(e) => setSelectedModelId(Number(e.target.value))}>
                <option value="">Select model</option>
                {selectedBrand?.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Model image URL</label>
              <input className="form-control" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={saveModelImage}>Save Image</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '18px' }}>
          <h3 style={{ marginBottom: '12px' }}>Features Management</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px' }}>
            <input className="form-control" value={featureName} onChange={(e) => setFeatureName(e.target.value)} placeholder="New feature name" />
            <select className="form-control" value={selectedModelId ?? ''} onChange={(e) => setSelectedModelId(Number(e.target.value))}>
              <option value="">Choose model</option>
              {brands.flatMap((b) => b.models.map((m) => <option key={m.id} value={m.id}>{b.name} - {m.name}</option>))}
            </select>
            <select className="form-control" value={featureId ?? ''} onChange={(e) => setFeatureId(Number(e.target.value))}>
              <option value="">Choose feature</option>
              {features.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={createFeature}>Add</button>
              <button className="btn btn-secondary btn-sm" onClick={assignFeature}>Assign</button>
            </div>
          </div>
          {selectedModel && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginBottom: '8px' }}>
                Current model features:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedModel.features.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>None</span>
                ) : selectedModel.features.map((f) => (
                  <span key={f.id} className="badge badge-info" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 10px', fontSize: '0.75rem',
                  }}>
                    {f.name}
                    <button onClick={() => removeFeature(selectedModelId!, f.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)',
                      padding: 0, lineHeight: 1, fontSize: '0.875rem', fontWeight: 700,
                    }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;

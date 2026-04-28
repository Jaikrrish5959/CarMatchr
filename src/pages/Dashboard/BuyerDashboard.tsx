import React, { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useData } from '../../contexts/useData';
import { Plus, X, Check, Clock, MessageSquare } from 'lucide-react';
import { useCatalog } from '../../contexts/useCatalog';

const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requirements, offers, addRequirement, acceptOffer, rejectOffer, markOfferRead } = useData();
  const { brands } = useCatalog();
  const [showForm, setShowForm] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [feature, setFeature] = useState('');
  const [yearRange, setYearRange] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const selectedBrand = brands.find((b) => b.name === make);
  const modelFeatures = selectedBrand?.models.find((m) => m.name === model)?.features ?? [];

  const myReqs = requirements.filter(r => r.buyerId === user?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.id) {
      const finalDescription = feature ? `${description} | Preferred feature: ${feature}` : description;
      addRequirement({ buyerId: user.id, make, model, yearRange, budget, description: finalDescription });
      setShowForm(false);
      setMake(''); setModel(''); setFeature(''); setYearRange(''); setBudget(''); setDescription('');
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '960px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">My Requirements</h1>
            <p className="page-subtitle">Post what you need. Brokers will come to you.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}>
              {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Requirement</>}
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card animate-in" style={{ marginBottom: '32px', borderLeft: '4px solid var(--color-primary)' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '20px' }}>Post a New Requirement</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Make</label>
                  <select required className="form-control" value={make} onChange={e => { setMake(e.target.value); setModel(''); }}>
                    <option value="">Select make</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.name}>{brand.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <select required className="form-control" value={model} onChange={e => setModel(e.target.value)} disabled={!make}>
                    <option value="">Select model</option>
                    {selectedBrand?.models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Feature</label>
                  <select className="form-control" value={feature} onChange={e => setFeature(e.target.value)} disabled={!model}>
                    <option value="">Any</option>
                    {modelFeatures.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year Range</label>
                  <input required className="form-control" value={yearRange} onChange={e => setYearRange(e.target.value)} placeholder="e.g. 2019 – 2022" />
                </div>
                <div className="form-group">
                  <label className="form-label">Budget</label>
                  <input required className="form-control" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. ₹10–15 Lakh" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Additional Details</label>
                <textarea required className="form-control" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Condition preferences, urgency, trim level..." />
              </div>
              <button type="submit" className="btn btn-primary">Submit Requirement</button>
            </form>
          </div>
        )}

        {/* Empty State */}
        {myReqs.length === 0 && !showForm && (
          <div className="empty-state">
            <div className="empty-state-icon"><MessageSquare size={24} /></div>
            <p className="empty-state-title">No requirements yet</p>
            <p className="empty-state-text">Post your first car requirement and brokers will start competing for your business.</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">Post Requirement</button>
          </div>
        )}

        {/* Requirements List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {myReqs.map(req => {
            const reqOffers = offers.filter(o => o.requirementId === req.id);
            return (
              <div key={req.id} className="card">
                {/* Req Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid var(--color-gray-200)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{req.make} {req.model}</h3>
                      <span className={`badge ${req.status === 'open' ? 'badge-active' : 'badge-pending'}`}>{req.status}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
                      Budget: <strong style={{ color: 'var(--color-dark)' }}>{req.budget}</strong> · Years: {req.yearRange}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Description */}
                <div style={{
                  padding: '12px 16px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem', color: 'var(--color-gray-600)', lineHeight: 1.7, marginBottom: '20px',
                  border: '1px solid var(--color-gray-100)',
                }}>
                  {req.description}
                </div>

                {/* Offers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>Offers</h4>
                  <span className="badge badge-info">{reqOffers.length}</span>
                </div>

                {reqOffers.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
                    Waiting for broker responses…
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reqOffers.sort((a,b) => (a.isRead === b.isRead ? 0 : a.isRead ? 1 : -1)).map(offer => (
                      <div key={offer.id} style={{
                        padding: '14px 18px', borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${offer.status === 'accepted' ? 'var(--color-success)' : offer.status === 'rejected' ? 'var(--color-gray-200)' : !offer.isRead ? 'var(--color-primary)' : 'var(--color-gray-200)'}`,
                        background: offer.status === 'accepted' ? 'var(--color-success-bg)' : offer.status === 'rejected' ? 'var(--color-gray-50)' : !offer.isRead ? 'var(--color-primary-light)' : '#fff',
                        opacity: offer.status === 'rejected' ? 0.6 : 1,
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}>
                        {!offer.isRead && offer.status === 'pending' && (
                          <span style={{
                            position: 'absolute', top: '-8px', right: '-8px', background: 'var(--color-primary)', color: '#fff',
                            fontSize: '0.625rem', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)'
                          }}>NEW</span>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-dark)' }}>{offer.brokerName}</span>
                          <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--color-primary)' }}>{offer.price}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                          Contact: {offer.brokerPhone}
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginBottom: '10px', lineHeight: 1.6 }}>{offer.details}</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {offer.status === 'pending' && req.status === 'open' && (
                            <>
                              <button onClick={() => { markOfferRead(offer.id); acceptOffer(offer.id, req.id); }} className="btn btn-success btn-sm">
                                <Check size={14} /> Accept
                              </button>
                              <button onClick={() => { markOfferRead(offer.id); rejectOffer(offer.id); }} className="btn btn-secondary btn-sm">
                                Reject
                              </button>
                              {!offer.isRead && (
                                <button onClick={() => markOfferRead(offer.id)} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                                  Mark as Read
                                </button>
                              )}
                            </>
                          )}
                          {offer.status !== 'pending' && (
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                              color: offer.status === 'accepted' ? 'var(--color-success)' : 'var(--color-gray-400)',
                              display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                              {offer.status === 'accepted' ? <Check size={12} /> : <Clock size={12} />}
                              {offer.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BuyerDashboard;

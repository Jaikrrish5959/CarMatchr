import React, { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useData } from '../../contexts/useData';
import { Clock, Send, CheckCircle2, AlertCircle, Plus, Car, X, MapPin, Fuel, Gauge } from 'lucide-react';
import { cities, bodyTypes, fuelTypes, transmissions, type CarListing } from '../../data/carDatabase';
import { useCatalog } from '../../contexts/useCatalog';
import toast from 'react-hot-toast';

const BrokerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requirements, offers, addOffer, brokerListings, addBrokerListing, removeBrokerListing } = useData();
  const { brands } = useCatalog();

  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [details, setDetails] = useState('');
  const [offerError, setOfferError] = useState('');
  const [activeTab, setActiveTab] = useState<'marketplace' | 'inventory'>('marketplace');
  const [showListForm, setShowListForm] = useState(false);

  // List Car form state
  const [listForm, setListForm] = useState<{
    make: string;
    model: string;
    variant: string;
    year: number;
    price: number;
    fuelType: CarListing['fuelType'];
    transmission: CarListing['transmission'];
    bodyType: CarListing['bodyType'];
    color: string;
    city: string;
    kmDriven: number;
    owners: number;
    description: string;
  }>({
    make: '', model: '', variant: '', year: 2024, price: 0,
    fuelType: 'Petrol', transmission: 'Manual',
    bodyType: 'SUV', color: '', city: '', kmDriven: 0, owners: 1, description: '',
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
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-gray-500)', lineHeight: 1.7, marginBottom: '32px', maxWidth: '380px', margin: '0 auto 32px' }}>
              Your broker application is under review. You'll receive full marketplace access once an admin approves your account.
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
              Please contact platform admin if verification takes longer than expected.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ---- ACTIVE STATE ---- */
  const openReqs = requirements.filter(r => r.status === 'open');
  const myOffers = offers.filter(o => o.brokerId === user?.id);
  const myListings = brokerListings.filter(l => l.brokerId === user?.id);
  const activeListings = myListings.filter(l => l.status === 'active');

  const handleSubmitOffer = (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    if (!user?.phone) {
      const message = 'Add your contact number in your broker profile before sending offers.';
      setOfferError(message);
      toast.error(message);
      return;
    }
    if (user?.id && user?.businessName) {
      addOffer({
        requirementId: reqId,
        brokerId: user.id,
        brokerName: user.businessName,
        brokerPhone: user.phone,
        price,
        details,
      });
      setOfferError('');
      setActiveReqId(null);
      setPrice(''); setDetails('');
    }
  };

  const handleListCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user?.businessName) return;
    addBrokerListing({
      brokerId: user.id,
      brokerName: user.businessName,
      ...listForm,
    });
    setShowListForm(false);
    setListForm({ make: '', model: '', variant: '', year: 2024, price: 0, fuelType: 'Petrol', transmission: 'Manual', bodyType: 'SUV', color: '', city: '', kmDriven: 0, owners: 1, description: '' });
  };

  const selectedBrand = brands.find(b => b.name === listForm.make);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '1100px' }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title">Broker Dashboard</h1>
            <p className="page-subtitle">Respond to buyer requirements and manage your car inventory.</p>
          </div>
          <button onClick={() => { setActiveTab('inventory'); setShowListForm(true); }} className="btn btn-primary btn-sm">
            <Plus size={15} /> List a Car
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid var(--color-gray-200)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-dark)' }}>Active Requirements</h2>
                <span className="badge badge-active">{openReqs.length}</span>
              </div>

              {openReqs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><AlertCircle size={24} /></div>
                  <p className="empty-state-title">No active requirements</p>
                  <p className="empty-state-text">Check back soon — new buyer requirements drop every minute.</p>
                </div>
              ) : (
                openReqs.map(req => {
                  const alreadyOffered = offers.some(o => o.requirementId === req.id && o.brokerId === user?.id);
                  return (
                    <div key={req.id} className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            REQ #{req.id.split('-').pop()}
                          </p>
                          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-dark)' }}>{req.make} {req.model}</h3>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                            Budget: <strong style={{ color: 'var(--color-dark)' }}>{req.budget}</strong> · {req.yearRange}
                          </p>
                        </div>
                        {alreadyOffered && (
                          <span className="badge badge-active" style={{ flexShrink: 0 }}>
                            <CheckCircle2 size={10} /> Offered
                          </span>
                        )}
                      </div>

                      <div style={{
                        padding: '10px 14px', background: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
                        color: 'var(--color-gray-600)', lineHeight: 1.6,
                        border: '1px solid var(--color-gray-100)', marginBottom: '14px',
                      }}>
                        "{req.description}"
                      </div>

                      {!alreadyOffered && activeReqId !== req.id && (
                        <button onClick={() => { setOfferError(''); setActiveReqId(req.id); }} className="btn btn-primary btn-sm">
                          <Send size={13} /> Make an Offer
                        </button>
                      )}

                      {activeReqId === req.id && (
                        <form onSubmit={e => handleSubmitOffer(e, req.id)} className="animate-in"
                          style={{ padding: '16px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '12px', color: 'var(--color-dark)' }}>Your Offer</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Price</label>
                              <input className="form-control" value={price} onChange={e => setPrice(e.target.value)} placeholder="₹19.5L" required />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Details</label>
                              <input className="form-control" value={details} onChange={e => setDetails(e.target.value)} placeholder="2021 XLE, 32K km, single owner" required />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary btn-sm">Submit Offer</button>
                            <button type="button" onClick={() => { setOfferError(''); setActiveReqId(null); }} className="btn btn-ghost btn-sm">Cancel</button>
                          </div>
                          {offerError && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '8px' }}>
                              {offerError}
                            </p>
                          )}
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar — My Offers */}
            <div style={{ position: 'sticky', top: '80px' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  padding: '14px 20px', background: 'var(--color-gray-50)',
                  borderBottom: '1px solid var(--color-gray-200)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-dark)' }}>My Offers</span>
                  <span className="badge badge-info">{myOffers.length}</span>
                </div>

                {myOffers.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>No offers submitted yet.</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {myOffers.map(offer => (
                      <div key={offer.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-100)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-dark)' }}>{offer.price}</span>
                          <span style={{
                            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                            color: offer.status === 'accepted' ? 'var(--color-success)' : offer.status === 'rejected' ? 'var(--color-primary)' : 'var(--color-warning)',
                          }}>{offer.status}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.details}</p>
                      </div>
                    ))}
                  </div>
                )}
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
                        onChange={e => setListForm({...listForm, make: e.target.value, model: ''})}>
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Model *</label>
                      <select className="form-control" required value={listForm.model}
                        onChange={e => setListForm({...listForm, model: e.target.value})} disabled={!listForm.make}>
                        <option value="">Select Model</option>
                        {selectedBrand?.models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Variant</label>
                      <input className="form-control" value={listForm.variant}
                        onChange={e => setListForm({...listForm, variant: e.target.value})} placeholder="e.g. ZXi+" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Year *</label>
                      <input type="number" className="form-control" required min={2000} max={2026}
                        value={listForm.year} onChange={e => setListForm({...listForm, year: Number(e.target.value)})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Price (₹ Lakh) *</label>
                      <input type="number" className="form-control" required step="0.1" min={0.1}
                        value={listForm.price || ''} onChange={e => setListForm({...listForm, price: Number(e.target.value)})} placeholder="12.5" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">KM Driven *</label>
                      <input type="number" className="form-control" required min={0}
                        value={listForm.kmDriven || ''} onChange={e => setListForm({...listForm, kmDriven: Number(e.target.value)})} placeholder="25000" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Owners</label>
                      <input type="number" className="form-control" min={1} max={5}
                        value={listForm.owners} onChange={e => setListForm({...listForm, owners: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Fuel Type</label>
                      <select className="form-control" value={listForm.fuelType}
                        onChange={e => setListForm({...listForm, fuelType: e.target.value as CarListing['fuelType']})}>
                        {fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Transmission</label>
                      <select className="form-control" value={listForm.transmission}
                        onChange={e => setListForm({...listForm, transmission: e.target.value as CarListing['transmission']})}>
                        {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Body Type</label>
                      <select className="form-control" value={listForm.bodyType}
                        onChange={e => setListForm({...listForm, bodyType: e.target.value as CarListing['bodyType']})}>
                        {bodyTypes.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">City *</label>
                      <select className="form-control" required value={listForm.city}
                        onChange={e => setListForm({...listForm, city: e.target.value})}>
                        <option value="">Select City</option>
                        {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '14px', marginTop: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Color</label>
                      <input className="form-control" value={listForm.color}
                        onChange={e => setListForm({...listForm, color: e.target.value})} placeholder="Pearl White" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Description</label>
                      <input className="form-control" value={listForm.description}
                        onChange={e => setListForm({...listForm, description: e.target.value})} placeholder="Well-maintained, service history available, insurance till 2026" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary">
                      <Plus size={15} /> Add to Marketplace
                    </button>
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6875rem', color: 'var(--color-gray-500)' }}>
                        <MapPin size={10} /> {car.city}
                      </span>
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

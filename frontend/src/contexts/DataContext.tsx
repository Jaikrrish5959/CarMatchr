import React, { createContext, useState, useEffect } from 'react';
import type { CarListing } from '../data/carDatabase';
import { getToken } from '../services/authService';
import { API_BASE } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export interface Requirement {
  id: number;
  buyerId: number;
  make: string;
  model: string;
  yearRange: string;
  budget: string;
  preferredFeature: string;
  description: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface Offer {
  id: number;
  requirementId: number;
  brokerId: number;
  brokerName: string;
  brokerPhone: string;
  price: string;
  details: string;
  status: 'pending' | 'accepted' | 'rejected';
  isRead: boolean;
  createdAt: string;
}

export interface BrokerListing {
  id: number;
  brokerId: number;
  brokerName: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  price: number;       // ₹ Lakhs
  fuelType: CarListing['fuelType'];
  transmission: CarListing['transmission'];
  bodyType: CarListing['bodyType'];
  color: string;
  city: string;
  kmDriven: number;
  owners: number;
  description: string;
  status: 'active' | 'sold';
  createdAt: string;
  images: string[];
  leadsCount: number;
}

interface DataContextType {
  requirements: Requirement[];
  offers: Offer[];
  brokerListings: BrokerListing[];
  isLoaded: boolean;
  addRequirement: (req: Omit<Requirement, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  closeRequirement: (id: number) => void;
  addOffer: (offer: Omit<Offer, 'id' | 'status' | 'createdAt' | 'isRead'>) => void;
  acceptOffer: (offerId: number, reqId: number) => void;
  rejectOffer: (offerId: number) => void;
  markOfferRead: (offerId: number) => void;
  addBrokerListing: (listing: Omit<BrokerListing, 'id' | 'status' | 'createdAt' | 'images' | 'leadsCount'>) => Promise<number | null>;
  removeBrokerListing: (id: number) => void;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/** Build headers with auth token */
function authJsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [brokerListings, setBrokerListings] = useState<BrokerListing[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data`, { headers: authHeaders() });
      if (!res.ok) { setIsLoaded(true); return; }
      const data = await res.json();
      if (Array.isArray(data.requirements)) setRequirements(data.requirements);
      if (Array.isArray(data.offers)) setOffers(data.offers);
      if (Array.isArray(data.brokerListings)) setBrokerListings(data.brokerListings);
    } catch (e) {
      console.error("Failed to load local DB:", e);
    }
    setIsLoaded(true);
  };

  const { user } = useAuth();

  // Load from server when user changes
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setRequirements([]);
      setOffers([]);
      setBrokerListings([]);
      setIsLoaded(true);
    }
  }, [user]);

  const refreshData = async () => {
    await loadData();
  };

  const addRequirement = async (req: Omit<Requirement, 'id' | 'status' | 'createdAt'>) => {
    try {
      const res = await fetch(`${API_BASE}/api/requirements`, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify(req),
      });
      const data = await res.json();
      const serverId = data.id ?? Date.now();

      const newReq: Requirement = {
        ...req,
        id: serverId,
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      setRequirements((prev) => [newReq, ...prev]);
    } catch (e) {
      console.error('Failed to add requirement:', e);
      const newReq: Requirement = {
        ...req,
        id: Date.now(),
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      setRequirements((prev) => [newReq, ...prev]);
    }
  };

  const closeRequirement = (id: number) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'closed' } : r))
    );
    if (isLoaded) {
      fetch(`${API_BASE}/api/requirements/${id}/close`, { method: 'PATCH', headers: authHeaders() }).catch(console.error);
    }
  };

  const addOffer = (offer: Omit<Offer, 'id' | 'status' | 'createdAt' | 'isRead'>) => {
    const newOffer: Offer = {
      ...offer,
      id: Date.now(),
      status: 'pending',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setOffers((prev) => [newOffer, ...prev]);
    if (isLoaded) {
      fetch(`${API_BASE}/api/offers`, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify(offer),
      }).catch(console.error);
    }
  };

  const acceptOffer = (offerId: number, reqId: number) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'accepted' } : o.requirementId === reqId ? { ...o, status: 'rejected' } : o))
    );
    closeRequirement(reqId);
    if (isLoaded) {
      fetch(`${API_BASE}/api/offers/${offerId}/accept`, {
        method: 'PATCH',
        headers: authJsonHeaders(),
        body: JSON.stringify({ reqId }),
      }).catch(console.error);
    }
  };

  const rejectOffer = (offerId: number) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'rejected' } : o))
    );
    if (isLoaded) {
      fetch(`${API_BASE}/api/offers/${offerId}/reject`, { method: 'PATCH', headers: authHeaders() }).catch(console.error);
    }
  };

  const markOfferRead = (offerId: number) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, isRead: true } : o))
    );
    if (isLoaded) {
      fetch(`${API_BASE}/api/offers/${offerId}/read`, { method: 'PATCH', headers: authHeaders() }).catch(console.error);
    }
  };

  const addBrokerListing = async (listing: Omit<BrokerListing, 'id' | 'status' | 'createdAt' | 'images' | 'leadsCount'>): Promise<number | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/listings`, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify(listing),
      });
      const data = await res.json();
      const serverId = data.id ?? Date.now();

      const newListing: BrokerListing = {
        ...listing,
        id: serverId,
        status: 'active',
        createdAt: new Date().toISOString(),
        images: [],
        leadsCount: 0,
      };
      setBrokerListings((prev) => [newListing, ...prev]);
      return serverId;
    } catch (e) {
      console.error('Failed to add listing:', e);
      const newListing: BrokerListing = {
        ...listing,
        id: Date.now(),
        status: 'active',
        createdAt: new Date().toISOString(),
        images: [],
        leadsCount: 0,
      };
      setBrokerListings((prev) => [newListing, ...prev]);
      return newListing.id;
    }
  };

  const removeBrokerListing = (id: number) => {
    setBrokerListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'sold' } : l))
    );
    if (isLoaded) {
      fetch(`${API_BASE}/api/listings/${id}/sold`, { method: 'PATCH', headers: authHeaders() }).catch(console.error);
    }
  };

  // Loading spinner while data loads
  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid var(--color-gray-200)',
          borderTop: '4px solid var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', fontWeight: 600 }}>
          Loading CarMatchr…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <DataContext.Provider
      value={{
        requirements,
        offers,
        brokerListings,
        isLoaded,
        addRequirement,
        closeRequirement,
        addOffer,
        acceptOffer,
        rejectOffer,
        markOfferRead,
        addBrokerListing,
        removeBrokerListing,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export { DataContext };

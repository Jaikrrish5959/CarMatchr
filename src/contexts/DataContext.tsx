import React, { createContext, useState, useEffect } from 'react';
import type { CarListing } from '../data/carDatabase';

export interface Requirement {
  id: string;
  buyerId: string;
  make: string;
  model: string;
  yearRange: string;
  budget: string;
  description: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface Offer {
  id: string;
  requirementId: string;
  brokerId: string;
  brokerName: string;
  brokerPhone: string;
  price: string;
  details: string;
  status: 'pending' | 'accepted' | 'rejected';
  isRead: boolean;
  createdAt: string;
}

export interface BrokerListing {
  id: string;
  brokerId: string;
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
}

interface DataContextType {
  requirements: Requirement[];
  offers: Offer[];
  brokerListings: BrokerListing[];
  addRequirement: (req: Omit<Requirement, 'id' | 'status' | 'createdAt'>) => void;
  closeRequirement: (id: string) => void;
  addOffer: (offer: Omit<Offer, 'id' | 'status' | 'createdAt' | 'isRead'>) => void;
  acceptOffer: (offerId: string, reqId: string) => void;
  rejectOffer: (offerId: string) => void;
  markOfferRead: (offerId: string) => void;
  addBrokerListing: (listing: Omit<BrokerListing, 'id' | 'status' | 'createdAt'>) => void;
  removeBrokerListing: (id: string) => void;
}

const defaultRequirements: Requirement[] = [
  {
    id: 'req-1',
    buyerId: 'buyer-1',
    make: 'Toyota',
    model: 'Camry',
    yearRange: '2019 - 2022',
    budget: '$18,000 - $22,000',
    description: 'Looking for a reliable everyday sedan. Clean title only, no accidents.',
    status: 'open',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'req-2',
    buyerId: 'buyer-2',
    make: 'Honda',
    model: 'CR-V',
    yearRange: '2020 - 2023',
    budget: '$25,000',
    description: 'AWD preferred, under 40k miles. Ready to buy this week.',
    status: 'open',
    createdAt: new Date().toISOString()
  }
];

const defaultOffers: Offer[] = [
  {
    id: 'offer-1',
    requirementId: 'req-1',
    brokerId: 'broker-1',
    brokerName: 'Elite Motors',
    brokerPhone: '+91 9000000000',
    price: '$21,500',
    details: '2021 Camry LE in silver. 32k miles. Perfect condition, 1 owner.',
    status: 'pending',
    isRead: false,
    createdAt: new Date().toISOString()
  }
];

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requirements, setRequirements] = useState<Requirement[]>(defaultRequirements);
  const [offers, setOffers] = useState<Offer[]>(defaultOffers);
  const [brokerListings, setBrokerListings] = useState<BrokerListing[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from HDD on mount
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.requirements)) setRequirements(data.requirements);
        if (Array.isArray(data.offers)) setOffers(data.offers);
        if (Array.isArray(data.brokerListings)) setBrokerListings(data.brokerListings);
        setIsLoaded(true);
      })
      .catch((e) => {
        console.error("Failed to load local DB:", e);
        setIsLoaded(true); // fall back to defaults
      });
  }, []);

  const addRequirement = (req: Omit<Requirement, 'id' | 'status' | 'createdAt'>) => {
    const newReq: Requirement = {
      ...req,
      id: `req-${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setRequirements((prev) => [newReq, ...prev]);
    if (isLoaded) {
      fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }).catch(console.error);
    }
  };

  const closeRequirement = (id: string) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'closed' } : r))
    );
    if (isLoaded) {
      fetch(`/api/requirements/${id}/close`, { method: 'PATCH' }).catch(console.error);
    }
  };

  const addOffer = (offer: Omit<Offer, 'id' | 'status' | 'createdAt' | 'isRead'>) => {
    const newOffer: Offer = {
      ...offer,
      id: `offer-${Date.now()}`,
      status: 'pending',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setOffers((prev) => [newOffer, ...prev]);
    if (isLoaded) {
      fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer),
      }).catch(console.error);
    }
  };

  const acceptOffer = (offerId: string, reqId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'accepted' } : o.requirementId === reqId ? { ...o, status: 'rejected' } : o))
    );
    closeRequirement(reqId);
    if (isLoaded) {
      fetch(`/api/offers/${offerId}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId }),
      }).catch(console.error);
    }
  };

  const rejectOffer = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'rejected' } : o))
    );
    if (isLoaded) {
      fetch(`/api/offers/${offerId}/reject`, { method: 'PATCH' }).catch(console.error);
    }
  };

  const markOfferRead = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, isRead: true } : o))
    );
    if (isLoaded) {
      fetch(`/api/offers/${offerId}/read`, { method: 'PATCH' }).catch(console.error);
    }
  };

  const addBrokerListing = (listing: Omit<BrokerListing, 'id' | 'status' | 'createdAt'>) => {
    const newListing: BrokerListing = {
      ...listing,
      id: `bl-${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setBrokerListings((prev) => [newListing, ...prev]);
    if (isLoaded) {
      fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing),
      }).catch(console.error);
    }
  };

  const removeBrokerListing = (id: string) => {
    setBrokerListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'sold' } : l))
    );
    if (isLoaded) {
      fetch(`/api/listings/${id}/sold`, { method: 'PATCH' }).catch(console.error);
    }
  };

  return (
    <DataContext.Provider
      value={{
        requirements,
        offers,
        brokerListings,
        addRequirement,
        closeRequirement,
        addOffer,
        acceptOffer,
        rejectOffer,
        markOfferRead,
        addBrokerListing,
        removeBrokerListing,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export { DataContext };

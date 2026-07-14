import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DataContext } from './DataContext';
import type { Requirement, Offer } from './DataContext';
import toast from 'react-hot-toast';
import { API_BASE } from '../services/api';
import { authHeaders } from '../services/authService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationPriority = 'high' | 'medium' | 'low';
export type NotificationKind =
  // Buyer
  | 'new_offer'
  | 'offer_accepted'
  | 'offer_updated'
  | 'requirement_posted'
  | 'requirement_expiring'
  // Dealer
  | 'new_requirement'
  | 'exclusive_requirement'
  | 'offer_shortlisted'
  | 'offer_accepted_dealer'
  | 'offer_rejected_dealer'
  | 'offer_viewed'
  | 'requirement_closed';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  priority: NotificationPriority;
  title: string;
  message: string;
  createdAt: string; // ISO string
  isRead: boolean;
  linkTarget?: 'buyer-dashboard' | 'broker-dashboard'; // navigate on click
  requirementId?: number;
  offerId?: number;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;           // only high-priority unread
  totalUnread: number;           // all unread
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ─── Priority Map ─────────────────────────────────────────────────────────────

const PRIORITY: Record<NotificationKind, NotificationPriority> = {
  new_offer:              'high',
  offer_accepted:         'high',
  offer_updated:          'medium',
  requirement_posted:     'low',
  requirement_expiring:   'low',
  new_requirement:        'high',
  exclusive_requirement:  'high',
  offer_shortlisted:      'high',
  offer_accepted_dealer:  'high',
  offer_rejected_dealer:  'low',
  offer_viewed:           'medium',
  requirement_closed:     'medium',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId(kind: string, entityId: number | string): string {
  return `${kind}:${entityId}`;
}

function buyerNotifications(
  requirements: Requirement[],
  offers: Offer[],
  userId: number
): Omit<AppNotification, 'isRead'>[] {
  const notes: Omit<AppNotification, 'isRead'>[] = [];
  const myReqs = requirements.filter(r => r.buyerId === userId);

  for (const req of myReqs) {
    // Requirement posted
    notes.push({
      id: makeId('req_posted', req.id),
      kind: 'requirement_posted',
      priority: PRIORITY['requirement_posted'],
      title: 'Requirement Posted',
      message: `Your requirement for ${req.make} ${req.model} has been posted successfully.`,
      createdAt: req.createdAt,
      linkTarget: 'buyer-dashboard',
      requirementId: req.id,
    });

    // Offers for this requirement
    const reqOffers = offers.filter(o => o.requirementId === req.id);

    for (const offer of reqOffers) {
      // New offer received
      notes.push({
        id: makeId('new_offer', offer.id),
        kind: 'new_offer',
        priority: PRIORITY['new_offer'],
        title: 'New Offer Received',
        message: `${offer.dealerName || offer.brokerName} submitted an offer for your ${req.make} ${req.model} requirement.`,
        createdAt: offer.createdAt,
        linkTarget: 'buyer-dashboard',
        requirementId: req.id,
        offerId: offer.id,
      });

      // Offer accepted
      if (offer.status === 'accepted') {
        notes.push({
          id: makeId('offer_accepted', offer.id),
          kind: 'offer_accepted',
          priority: PRIORITY['offer_accepted'],
          title: 'Offer Accepted',
          message: `You accepted an offer from ${offer.dealerName || offer.brokerName} for ${req.make} ${req.model}.`,
          createdAt: offer.createdAt,
          linkTarget: 'buyer-dashboard',
          requirementId: req.id,
          offerId: offer.id,
        });
      }

      // Offer updated (negotiated)
      if (offer.details && offer.details.includes('[Negotiated:')) {
        notes.push({
          id: makeId('offer_updated', offer.id),
          kind: 'offer_updated',
          priority: PRIORITY['offer_updated'],
          title: 'Offer Updated',
          message: `${offer.dealerName || offer.brokerName} updated their offer for ${req.make} ${req.model}.`,
          createdAt: offer.createdAt,
          linkTarget: 'buyer-dashboard',
          requirementId: req.id,
          offerId: offer.id,
        });
      }
    }
  }

  // Sort newest first
  return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function dealerNotifications(
  requirements: Requirement[],
  offers: Offer[],
  userId: number
): Omit<AppNotification, 'isRead'>[] {
  const notes: Omit<AppNotification, 'isRead'>[] = [];
  const myOffers = offers.filter(o => o.brokerId === userId);

  // New marketplace requirements (visible to all dealers)
  const marketplaceReqs = requirements.filter(r => r.status === 'open' && r.visibility !== 'exclusive');
  for (const req of marketplaceReqs) {
    notes.push({
      id: makeId('new_req', req.id),
      kind: 'new_requirement',
      priority: PRIORITY['new_requirement'],
      title: 'New Requirement',
      message: `New ${req.make} ${req.model} requirement posted in ${req.city}.`,
      createdAt: req.createdAt,
      linkTarget: 'broker-dashboard',
      requirementId: req.id,
    });
  }

  // Exclusive requirements sent to this dealer
  const exclusiveReqs = requirements.filter(
    r => r.visibility === 'exclusive' && r.exclusiveDealerId === userId
  );
  for (const req of exclusiveReqs) {
    notes.push({
      id: makeId('exclusive_req', req.id),
      kind: 'exclusive_requirement',
      priority: PRIORITY['exclusive_requirement'],
      title: '⭐ Exclusive Lead Received',
      message: `A buyer sent you an exclusive ${req.make} ${req.model} requirement in ${req.city}.`,
      createdAt: req.createdAt,
      linkTarget: 'broker-dashboard',
      requirementId: req.id,
    });
  }

  // Dealer's own offers
  for (const offer of myOffers) {
    const req = requirements.find(r => r.id === offer.requirementId);
    const vehicle = req ? `${req.make} ${req.model}` : 'a vehicle';

    // Offer viewed (isRead means the buyer opened it)
    if (offer.isRead) {
      notes.push({
        id: makeId('offer_viewed', offer.id),
        kind: 'offer_viewed',
        priority: PRIORITY['offer_viewed'],
        title: 'Offer Viewed',
        message: `Your offer for ${vehicle} was viewed by the buyer.`,
        createdAt: offer.createdAt,
        linkTarget: 'broker-dashboard',
        offerId: offer.id,
      });
    }

    // Offer shortlisted
    if (offer.shortlisted) {
      notes.push({
        id: makeId('offer_shortlisted', offer.id),
        kind: 'offer_shortlisted',
        priority: PRIORITY['offer_shortlisted'],
        title: 'Offer Shortlisted 🎉',
        message: `Your offer for ${vehicle} has been shortlisted by the buyer.`,
        createdAt: offer.createdAt,
        linkTarget: 'broker-dashboard',
        offerId: offer.id,
      });
    }

    // Offer accepted
    if (offer.status === 'accepted') {
      notes.push({
        id: makeId('offer_accepted_dealer', offer.id),
        kind: 'offer_accepted_dealer',
        priority: PRIORITY['offer_accepted_dealer'],
        title: 'Offer Accepted! 🎊',
        message: `Your offer for ${vehicle} has been accepted by the buyer. Close the deal!`,
        createdAt: offer.createdAt,
        linkTarget: 'broker-dashboard',
        offerId: offer.id,
      });
    }

    // Offer rejected
    if (offer.status === 'rejected') {
      notes.push({
        id: makeId('offer_rejected_dealer', offer.id),
        kind: 'offer_rejected_dealer',
        priority: PRIORITY['offer_rejected_dealer'],
        title: 'Offer Rejected',
        message: `Your offer for ${vehicle} was rejected. The buyer accepted another offer or closed the requirement.`,
        createdAt: offer.createdAt,
        linkTarget: 'broker-dashboard',
        offerId: offer.id,
      });
    }
  }

  return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const dataCtx = useContext(DataContext);

  // --- Global Message Polling & Toast Alerts ---
  const lastMessageTimestampRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    // Reset cursor to current time when user logs in or switches
    lastMessageTimestampRef.current = new Date().toISOString();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let inFlight = false;
    let timer: number;

    const pollNewMessages = async () => {
      if (inFlight) return;
      inFlight = true;

      try {
        const url = `${API_BASE}/api/messages?since=${encodeURIComponent(lastMessageTimestampRef.current)}`;
        const response = await fetch(url, { headers: authHeaders() });
        if (!response.ok) return;

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Filter out messages sent by the logged-in user themselves
          const otherMessages = data.filter(msg => Number(msg.senderId) !== Number(user.id));
          
          otherMessages.forEach(msg => {
            // If the user is actively viewing this specific conversation thread right now,
            // we should not pop a distracting toast notification since it appears directly on their chat screen.
            const threadId = `req-${msg.requirementId}-broker-${msg.brokerId}`;
            if ((window as any).__activeChatThreadId === threadId) {
              return;
            }

            // Trigger a clean, beautiful toast notification
            toast(`✉️ New message from ${msg.senderName}:\n"${msg.body}"`, {
              duration: 6000,
              position: 'top-right',
              style: {
                background: '#fff',
                color: '#1e293b',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                whiteSpace: 'pre-line',
              }
            });
          });

          // Move the cursor forward to the timestamp of the latest message
          lastMessageTimestampRef.current = data[data.length - 1].createdAt;
        }
      } catch (err) {
        console.error('Error polling for new messages:', err);
      } finally {
        inFlight = false;
      }
    };

    // Poll every 15 seconds to fetch new messages globally
    timer = window.setInterval(pollNewMessages, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [user]);

  // Read IDs persisted per user
  const storageKey = user ? `notif_read_${user.id}` : null;
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (!storageKey) return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Re-load read IDs when user changes
  useEffect(() => {
    if (!storageKey) { setReadIds(new Set()); return; }
    try {
      const raw = localStorage.getItem(storageKey);
      setReadIds(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
    } catch {
      setReadIds(new Set());
    }
  }, [storageKey]);

  // Persist read IDs
  const persistReadIds = useCallback((ids: Set<string>) => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify([...ids]));
    }
  }, [storageKey]);

  // Derive raw notification list
  const rawNotifications = useMemo<Omit<AppNotification, 'isRead'>[]>(() => {
    if (!user || !dataCtx) return [];
    const { requirements, offers } = dataCtx;
    if (user.role === 'buyer') {
      return buyerNotifications(requirements, offers, user.id);
    }
    if (user.role === 'broker') {
      return dealerNotifications(requirements, offers, user.id);
    }
    return [];
  }, [user, dataCtx?.requirements, dataCtx?.offers]);

  // Merge with read state
  const notifications = useMemo<AppNotification[]>(() =>
    rawNotifications.map(n => ({ ...n, isRead: readIds.has(n.id) })),
    [rawNotifications, readIds]
  );

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead && n.priority === 'high').length,
    [notifications]
  );

  const totalUnread = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
  }, [persistReadIds]);

  const markAllRead = useCallback(() => {
    const all = new Set(notifications.map(n => n.id));
    setReadIds(all);
    persistReadIds(all);
  }, [notifications, persistReadIds]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, totalUnread, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};

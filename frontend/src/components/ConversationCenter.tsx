import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BadgeInfo, Car, Clock, MessageSquare, Send, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import type { Offer, Requirement } from '../contexts/DataContext';
import { API_BASE } from '../services/api';
import { authHeaders } from '../services/authService';

type ConversationMode = 'buyer' | 'broker';
type SenderRole = 'buyer' | 'broker' | 'admin' | 'system';

interface ConversationMessage {
  id: string;
  requirementId: number;
  brokerId: number;
  senderRole: SenderRole;
  senderName: string;
  body: string;
  createdAt: string;
}

interface ConversationThread {
  id: string;
  requirementId: number;
  brokerId: number;
  title: string;
  subtitle: string;
  counterpartyLabel: string;
  offer: Offer;
  requirement?: Requirement;
}

function threadIdFor(requirementId: number, brokerId: number) {
  return `req-${requirementId}-broker-${brokerId}`;
}

function parseServerDate(value: string) {
  if (!value) return new Date(NaN);

  // Treat bare database timestamps as UTC so they render correctly in the browser's local time.
  const utcMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
  );
  if (utcMatch) {
    const [, year, month, day, hour, minute, second = '0', millisecond = '0'] = utcMatch;
    return new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond.padEnd(3, '0')),
    ));
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  // Some DB adapters can return "YYYY-MM-DD HH:mm:ss" without timezone.
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(normalized);
}

function formatTime(iso: string) {
  const date = parseServerDate(iso);
  if (Number.isNaN(date.getTime())) return '--:--';

  const now = new Date();
  const minutesAgo = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutesAgo < 1) return 'just now';
  if (minutesAgo < 60) return `${minutesAgo}m ago`;

  const isSameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isSameDay) return time;

  const dateLabel = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return `${dateLabel} ${time}`;
}

function sameMessages(left: ConversationMessage[], right: ConversationMessage[]) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (
      left[i].id !== right[i].id ||
      left[i].body !== right[i].body ||
      left[i].createdAt !== right[i].createdAt
    ) {
      return false;
    }
  }
  return true;
}

function buildThreads(mode: ConversationMode, userId: number | undefined, requirements: Requirement[], offers: Offer[]) {
  if (!userId) return [] as ConversationThread[];

  const grouped = new Map<string, ConversationThread>();

  offers.forEach((offer) => {
    if (offer.status !== 'accepted') return;

    const requirement = requirements.find((item) => item.id === offer.requirementId);
    if (!requirement) return;

    if (mode === 'buyer' && requirement.buyerId !== userId) return;
    if (mode === 'broker' && offer.brokerId !== userId) return;

    const id = `buyer-${requirement.buyerId}-broker-${offer.brokerId}`;
    const title = mode === 'buyer'
      ? (offer.dealerName || offer.brokerName || 'Dealer')
      : `${requirement.make} ${requirement.model}`;
    const subtitle = mode === 'buyer'
      ? `${requirement.make} ${requirement.model} • ${offer.price}`
      : `Buyer #${requirement.buyerId} • ${offer.price}`;
    const counterpartyLabel = mode === 'buyer'
      ? (offer.dealerName || offer.brokerName || 'Dealer')
      : `Buyer #${requirement.buyerId}`;

    const existing = grouped.get(id);
    if (!existing || new Date(offer.createdAt).getTime() > new Date(existing.offer.createdAt).getTime()) {
      grouped.set(id, {
        id,
        requirementId: requirement.id,
        brokerId: offer.brokerId,
        title,
        subtitle,
        counterpartyLabel,
        offer,
        requirement,
      });
    }
  });

  return Array.from(grouped.values()).sort(
    (left, right) => new Date(right.offer.createdAt).getTime() - new Date(left.offer.createdAt).getTime()
  );
}

interface Props {
  mode: ConversationMode;
}

const ConversationCenter: React.FC<Props> = ({ mode }) => {
  const { user } = useAuth();
  const { requirements, offers } = useData();
  const threads = useMemo(
    () => buildThreads(mode, user?.id, requirements, offers),
    [mode, user?.id, requirements, offers]
  );
  const [activeThreadId, setActiveThreadId] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageLoadError, setMessageLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastThreadKeyRef = useRef('');
  const initialLoadPendingRef = useRef(false);

  useEffect(() => {
    if (!threads.length) {
      setActiveThreadId('');
      return;
    }

    if (!activeThreadId || !threads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  // When the active thread changes, reset the userScrolledUp flag and scroll to bottom
  useEffect(() => {
    userScrolledUpRef.current = false;
    endRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
  }, [activeThreadId]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) || null;
  useEffect(() => {
    if (!activeThread) {
      setMessages([]);
      setIsLoadingMessages(false);
      setMessageLoadError(null);
      lastThreadKeyRef.current = '';
      initialLoadPendingRef.current = false;
      return;
    }

    let cancelled = false;
    let inFlight = false;
    const threadKey = `${activeThread.requirementId}:${activeThread.brokerId}`;

    if (lastThreadKeyRef.current !== threadKey) {
      setIsLoadingMessages(true);
      setMessageLoadError(null);
      initialLoadPendingRef.current = true;
      lastThreadKeyRef.current = threadKey;
    }

    const loadMessages = async () => {
      if (inFlight) return;
      inFlight = true;
      const shouldResolveInitialLoad = initialLoadPendingRef.current;
      try {
        const url = `${API_BASE}/api/messages?requirementId=${activeThread.requirementId}&brokerId=${activeThread.brokerId}`;
        const response = await fetch(url, { headers: authHeaders() });
        if (!response.ok) {
          if (!cancelled && shouldResolveInitialLoad) {
            setMessageLoadError('Unable to load messages right now. Please try again.');
          }
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          const next = Array.isArray(data) ? data : [];
          setMessages((prev) => (sameMessages(prev, next) ? prev : next));
          setMessageLoadError(null);
        }
      } catch {
        if (!cancelled && shouldResolveInitialLoad) {
          setMessageLoadError('Unable to load messages right now. Please try again.');
        }
      } finally {
        if (shouldResolveInitialLoad && !cancelled) {
          setIsLoadingMessages(false);
          initialLoadPendingRef.current = false;
        }
        inFlight = false;
      }
    };

    loadMessages();
    const timer = window.setInterval(loadMessages, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeThread?.requirementId, activeThread?.brokerId]);

  if (!user) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
        <MessageSquare size={28} style={{ marginBottom: '12px', color: '#e63946' }} />
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Sign in to start messaging</div>
        <p style={{ margin: '8px 0 0', fontSize: '0.875rem' }}>Buyer and broker conversations are tied to the logged-in account.</p>
      </div>
    );
  }

  const sendMessage = async () => {
    const text = draft.trim();
    if (!activeThread || !text || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          requirementId: activeThread.requirementId,
          brokerId: activeThread.brokerId,
          body: text,
        }),
      });

      if (!response.ok) {
        setIsSending(false);
        return;
      }

      setDraft('');
      userScrolledUpRef.current = false;

      const reload = await fetch(
        `${API_BASE}/api/messages?requirementId=${activeThread.requirementId}&brokerId=${activeThread.brokerId}`,
        { headers: authHeaders() }
      );
      if (reload.ok) {
        const data = await reload.json();
        const next = Array.isArray(data) ? data : [];
        setMessages((prev) => (sameMessages(prev, next) ? prev : next));
        setMessageLoadError(null);
      }
    } catch {
      setIsSending(false);
      return;
    } finally {
      setIsSending(false);
    }
  };

  const previewText = (thread: ConversationThread) => {
    const last = messages.filter((message) => message.requirementId === thread.requirementId && message.brokerId === thread.brokerId).at(-1);
    if (last) return last.body;
    return mode === 'buyer'
      ? 'Start a conversation with this dealer about pricing, availability, or delivery.'
      : 'Respond to the buyer and keep the negotiation moving.';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)', gap: '18px' }}>
      <aside style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', boxShadow: '0 4px 20px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(230,57,70,0.08)', color: '#e63946', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>Conversations</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{threads.length} active thread{threads.length === 1 ? '' : 's'}</div>
            </div>
          </div>
        </div>

        <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
          {threads.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b' }}>
              <BadgeInfo size={28} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>No chats yet</div>
              <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.6 }}>
                Messages appear once a buyer and broker share an offer thread.
              </p>
            </div>
          ) : (
            threads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: isActive ? '#fff5f5' : '#fff',
                    borderBottom: '1px solid #f1f5f9',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {thread.title}
                        </span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#e63946', background: 'rgba(230,57,70,0.08)', padding: '2px 6px', borderRadius: '999px', textTransform: 'uppercase' }}>
                          {thread.offer.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>{thread.subtitle}</div>
                      <div style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {previewText(thread)}
                      </div>
                    </div>
                    <ArrowRight size={14} color={isActive ? '#e63946' : '#cbd5e1'} style={{ flexShrink: 0, marginTop: '4px' }} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', boxShadow: '0 4px 20px rgba(15,23,42,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '680px' }}>
        {activeThread ? (
          <>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Car size={14} color="#64748b" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {mode === 'buyer' ? 'Dealer conversation' : 'Buyer conversation'}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>{activeThread.title}</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>{activeThread.subtitle}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={13} /> {activeThread.requirement?.make} {activeThread.requirement?.model}
                </span>
                <span style={{ padding: '6px 10px', borderRadius: '999px', background: 'rgba(230,57,70,0.08)', color: '#e63946', fontSize: '0.75rem', fontWeight: 800 }}>
                  {activeThread.offer.price}
                </span>
                <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 800 }}>
                  {activeThread.counterpartyLabel}
                </span>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              onScroll={() => {
                const el = scrollContainerRef.current;
                if (!el) return;
                const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                userScrolledUpRef.current = !isNearBottom;
              }}
              style={{ flex: 1, minHeight: 0, padding: '20px', background: 'linear-gradient(180deg, #fff 0%, #fafafa 100%)', overflowY: 'auto' }}
            >
              {isLoadingMessages ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ width: '34px', height: '34px', margin: '0 auto 12px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#e63946', animation: 'spin 0.8s linear infinite' }} />
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Loading messages</div>
                </div>
              ) : messageLoadError && messages.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                  <BadgeInfo size={28} style={{ color: '#f59e0b', marginBottom: '10px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Messages unavailable</div>
                  <p style={{ margin: '8px auto 0', maxWidth: '360px', fontSize: '0.875rem', lineHeight: 1.7 }}>
                    {messageLoadError}
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                  <User size={30} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Start the conversation</div>
                  <p style={{ margin: '8px auto 0', maxWidth: '360px', fontSize: '0.875rem', lineHeight: 1.7 }}>
                    Share a question, counter, or availability update. Both buyer and broker will see the same thread.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.map((message) => {
                    const isMine = message.senderRole === mode;
                    const isSystem = message.senderRole === 'system';

                    if (isSystem) {
                      return (
                        <div key={message.id} style={{ display: 'flex', justifyContent: 'center' }}>
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '6px 12px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                            {message.body}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '78%', background: isMine ? 'linear-gradient(135deg, #e63946, #c81e1e)' : '#fff', color: isMine ? '#fff' : '#0f172a', border: `1px solid ${isMine ? 'transparent' : '#e2e8f0'}`, borderRadius: '18px', padding: '14px 16px', boxShadow: isMine ? '0 10px 24px rgba(230,57,70,0.18)' : '0 6px 18px rgba(15,23,42,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: isMine ? 0.9 : 1 }}>{message.senderName}</span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, opacity: isMine ? 0.85 : 0.7, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} /> {formatTime(message.createdAt)}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message.body}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div style={{ padding: '18px 20px 20px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={mode === 'buyer' ? 'Message the dealer about this offer...' : 'Reply to the buyer...'}
                  rows={3}
                  style={{
                    flex: 1,
                    resize: 'none',
                    borderRadius: '14px',
                    border: '1px solid #cbd5e1',
                    padding: '14px 16px',
                    fontFamily: 'var(--font)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    color: '#0f172a',
                    background: '#fff',
                  }}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!draft.trim() || isSending}
                  style={{
                    minWidth: '132px',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    fontFamily: 'var(--font)',
                    fontWeight: 800,
                    fontSize: '0.9375rem',
                    cursor: draft.trim() && !isSending ? 'pointer' : 'not-allowed',
                    background: draft.trim() && !isSending ? 'linear-gradient(135deg, #e63946, #c81e1e)' : '#e2e8f0',
                    color: draft.trim() && !isSending ? '#fff' : '#94a3b8',
                    boxShadow: draft.trim() && !isSending ? '0 10px 24px rgba(230,57,70,0.18)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Send size={16} /> {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: '#64748b' }}>
            <MessageSquare size={32} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>No conversation selected</div>
            <p style={{ margin: '8px auto 0', maxWidth: '420px', fontSize: '0.875rem', lineHeight: 1.7 }}>
              Pick a buyer or dealer thread from the list to continue the chat.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ConversationCenter;
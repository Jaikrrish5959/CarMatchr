import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X, Star, AlertCircle, Info, MessageSquare } from 'lucide-react';
import { useNotifications, type AppNotification } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';

// ─── Priority styling ─────────────────────────────────────────────────────────
const PRIORITY_STYLE = {
  high:   { dot: '#e63946', bg: '#fef2f2', border: '#fecaca' },
  medium: { dot: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  low:    { dot: '#6b7280', bg: '#f8fafc', border: '#e2e8f0' },
};

const KIND_ICON: Record<string, React.ReactNode> = {
  new_offer:              <AlertCircle size={14} color="#e63946" />,
  offer_accepted:         <Star size={14} color="#16a34a" />,
  offer_updated:          <Info size={14} color="#f59e0b" />,
  requirement_posted:     <Info size={14} color="#6b7280" />,
  requirement_expiring:   <AlertCircle size={14} color="#f59e0b" />,
  new_requirement:        <AlertCircle size={14} color="#e63946" />,
  exclusive_requirement:  <Star size={14} color="#6366f1" />,
  offer_shortlisted:      <Star size={14} color="#f59e0b" />,
  offer_accepted_dealer:  <Star size={14} color="#16a34a" />,
  offer_viewed:           <Info size={14} color="#0284c7" />,
  requirement_closed:     <Info size={14} color="#6b7280" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return 'Just now';
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

interface Props {
  onClose: () => void;
}

const NotificationDropdown: React.FC<Props> = ({ onClose }) => {
  const { notifications, totalUnread, markRead, markAllRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    onClose();
    if (n.kind === 'offer_viewed' || n.kind === 'requirement_closed') {
      // messages placeholder
    }
    if (n.linkTarget) {
      navigate(`/${n.linkTarget}`);
    }
  };

  const handleMessagesClick = () => {
    const target = user?.role === 'broker' ? '/broker-dashboard?tab=messages' : '/buyer-dashboard?tab=messages';
    navigate(target);
    onClose();
  };

  const todayNotes = notifications.filter(n => isToday(n.createdAt));
  const earlierNotes = notifications.filter(n => !isToday(n.createdAt));
  const displayed = notifications.slice(0, 20);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '380px',
        maxHeight: '540px',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
        border: '1px solid var(--color-gray-200)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px 12px',
        borderBottom: '1px solid var(--color-gray-100)',
        position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} color="var(--color-primary)" />
          <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--color-gray-900)' }}>Notifications</span>
          {totalUnread > 0 && (
            <span style={{
              background: 'var(--color-primary)', color: '#fff',
              borderRadius: '20px', padding: '1px 7px',
              fontSize: '0.625rem', fontWeight: 800,
            }}>
              {totalUnread}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {totalUnread > 0 && (
            <button
              onClick={markAllRead}
              title="Mark all as read"
              style={{
                padding: '5px 8px', border: 'none', background: 'var(--color-gray-50)',
                borderRadius: '8px', cursor: 'pointer', color: 'var(--color-gray-500)',
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '0.6875rem', fontWeight: 700,
              }}
            >
              <CheckCheck size={13} /> All Read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '5px', border: 'none', background: 'transparent',
              borderRadius: '8px', cursor: 'pointer', color: 'var(--color-gray-400)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Messages placeholder item */}
      <div
        onClick={handleMessagesClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 18px',
          background: '#f5f3ff',
          borderBottom: '1px solid #ede9fe',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
        onMouseLeave={e => e.currentTarget.style.background = '#f5f3ff'}
      >
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <MessageSquare size={15} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#3730a3' }}>Messages</div>
          <div style={{ fontSize: '0.6875rem', color: '#6d28d9' }}>Open the chat thread</div>
        </div>
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Bell size={32} color="var(--color-gray-300)" style={{ marginBottom: '10px' }} />
          <p style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem', fontWeight: 600 }}>No notifications yet</p>
          <p style={{ color: 'var(--color-gray-300)', fontSize: '0.75rem' }}>You'll see updates here as activity happens.</p>
        </div>
      ) : (
        <div style={{ overflowY: 'auto' }}>
          {/* Today */}
          {todayNotes.length > 0 && (
            <>
              <div style={{ padding: '8px 18px 4px', fontSize: '0.625rem', fontWeight: 800, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Today
              </div>
              {todayNotes.slice(0, 10).map(n => <NotifItem key={n.id} n={n} onClickHandler={handleClick} />)}
            </>
          )}

          {/* Earlier */}
          {earlierNotes.length > 0 && (
            <>
              <div style={{ padding: '8px 18px 4px', fontSize: '0.625rem', fontWeight: 800, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Earlier
              </div>
              {earlierNotes.slice(0, 10).map(n => <NotifItem key={n.id} n={n} onClickHandler={handleClick} />)}
            </>
          )}

          {displayed.length === 0 && notifications.length > 0 && (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>
              All caught up!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Individual notification row ─────────────────────────────────────────────

const NotifItem: React.FC<{
  n: AppNotification;
  onClickHandler: (n: AppNotification) => void;
}> = ({ n, onClickHandler }) => {
  const style = PRIORITY_STYLE[n.priority];
  return (
    <div
      onClick={() => onClickHandler(n)}
      style={{
        display: 'flex', gap: '11px', alignItems: 'flex-start',
        padding: '12px 18px',
        background: n.isRead ? '#fff' : style.bg,
        borderBottom: `1px solid ${n.isRead ? 'var(--color-gray-100)' : style.border}`,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = n.isRead ? '#f8fafc' : style.border}
      onMouseLeave={e => e.currentTarget.style.background = n.isRead ? '#fff' : style.bg}
    >
      {/* Icon */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px',
        background: n.isRead ? 'var(--color-gray-100)' : '#fff',
        border: `1.5px solid ${n.isRead ? 'var(--color-gray-200)' : style.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: '1px',
      }}>
        {KIND_ICON[n.kind] ?? <Info size={14} color="#6b7280" />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{
            fontSize: '0.8125rem', fontWeight: n.isRead ? 600 : 800,
            color: n.isRead ? 'var(--color-gray-600)' : 'var(--color-gray-900)',
          }}>
            {n.title}
          </span>
          {!n.isRead && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: style.dot, flexShrink: 0,
            }} />
          )}
        </div>
        <p style={{
          fontSize: '0.75rem', color: 'var(--color-gray-500)',
          margin: 0, lineHeight: 1.5,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {n.message}
        </p>
        <span style={{ fontSize: '0.625rem', color: 'var(--color-gray-400)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
          {timeAgo(n.createdAt)}
        </span>
      </div>
    </div>
  );
};

export default NotificationDropdown;

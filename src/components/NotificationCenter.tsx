'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ALERT';

interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  INFO:    { icon: 'Info',         color: '#1E88E5', bg: 'rgba(30,136,229,0.12)' },
  SUCCESS: { icon: 'CheckCircle2', color: '#43A047', bg: 'rgba(67,160,71,0.12)' },
  WARNING: { icon: 'AlertCircle',  color: '#FF9800', bg: 'rgba(255,152,0,0.12)' },
  ERROR:   { icon: 'XCircle',      color: '#F44336', bg: 'rgba(244,67,54,0.12)' },
  ALERT:   { icon: 'Bell',         color: '#E91E63', bg: 'rgba(233,30,99,0.12)' },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Fetch initial notifications ──────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // ── Supabase Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 50));
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications, supabase]);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Mark all as read ─────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!user?.id) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // ── Handle click on a notification ──────────────────────────────────────
  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.action_url) {
      router.push(notif.action_url);
      setOpen(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        id="notification-center-btn"
        onClick={() => setOpen((v) => !v)}
        title="Notificaciones"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: open ? 'rgba(30,136,229,0.18)' : 'rgba(30,136,229,0.08)',
          border: `1px solid ${open ? 'rgba(30,136,229,0.45)' : 'var(--border-secondary)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: open ? '#1E88E5' : 'var(--text-secondary)',
          position: 'relative',
          transition: 'all 0.15s ease',
        }}
      >
        <Icon name="Bell" size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#F44336',
              border: '1.5px solid var(--bg-topnav)',
              fontSize: 9,
              fontWeight: 800,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: '0 3px',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          id="notification-center-panel"
          style={{
            position: 'fixed',
            top: 58,
            right: 'auto',
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 520,
            background: 'rgba(15,31,56,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-primary)',
            borderRadius: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'notif-slide-in 0.18s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: '1px solid var(--border-primary)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="Bell" size={15} style={{ color: '#1E88E5' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#F44336',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    borderRadius: 10,
                    padding: '1px 7px',
                  }}
                >
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'rgba(30,136,229,0.12)',
                  border: '1px solid rgba(30,136,229,0.3)',
                  borderRadius: 7,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#1E88E5',
                  transition: 'all 0.15s',
                }}
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 8px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>
                <Icon name="Loader2" size={20} style={{ color: 'var(--text-muted)' }} />
                <div style={{ marginTop: 8 }}>Cargando...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <Icon name="Bell" size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600 }}>Sin notificaciones</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>Estás al día</div>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '10px 10px',
                      borderRadius: 10,
                      marginBottom: 4,
                      cursor: notif.action_url ? 'pointer' : 'default',
                      background: notif.is_read ? 'transparent' : cfg.bg,
                      borderLeft: `3px solid ${notif.is_read ? 'transparent' : cfg.color}`,
                      transition: 'background 0.15s',
                      opacity: notif.is_read ? 0.65 : 1,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = `${cfg.color}14`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = notif.is_read
                        ? 'transparent'
                        : cfg.bg;
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: cfg.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 1,
                      }}
                    >
                      <Icon name={cfg.icon} size={14} style={{ color: cfg.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: notif.is_read ? 500 : 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          marginTop: 2,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notif.message}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                        alignSelf: 'flex-start',
                        marginTop: 2,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {timeAgo(notif.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Keyframes injected once */}
      <style>{`
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}

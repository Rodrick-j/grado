'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type AlertSeverity = 'EMERGENCY' | 'CRITICAL' | 'WARNING' | 'INFO';
type AlertStatus   = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED';

interface ClinicalAlert {
  id: string;
  patient_id?: string | null;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
  expires_at?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { color: string; bg: string; border: string; label: string }
> = {
  EMERGENCY: {
    color: '#F44336',
    bg: 'rgba(244,67,54,0.14)',
    border: 'rgba(244,67,54,0.45)',
    label: 'EMERGENCIA',
  },
  CRITICAL: {
    color: '#FF9800',
    bg: 'rgba(255,152,0,0.12)',
    border: 'rgba(255,152,0,0.35)',
    label: 'CRÍTICO',
  },
  WARNING: {
    color: '#FFEB3B',
    bg: 'rgba(255,235,59,0.10)',
    border: 'rgba(255,235,59,0.30)',
    label: 'ADVERTENCIA',
  },
  INFO: {
    color: '#1E88E5',
    bg: 'rgba(30,136,229,0.10)',
    border: 'rgba(30,136,229,0.30)',
    label: 'INFO',
  },
};

const SEVERITY_ORDER: AlertSeverity[] = ['EMERGENCY', 'CRITICAL', 'WARNING', 'INFO'];

function severityRank(s: AlertSeverity) {
  return SEVERITY_ORDER.indexOf(s);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertCenter() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const supabase = createClient();

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const hasEmergency = activeAlerts.some((a) => a.severity === 'EMERGENCY');
  const unacknowledgedCount = activeAlerts.length;

  // ── Fetch initial alerts ─────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinical_alerts')
        .select('*')
        .in('status', ['ACTIVE', 'ACKNOWLEDGED'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const sorted = (data as ClinicalAlert[]).sort(
          (a, b) => severityRank(a.severity) - severityRank(b.severity)
        );
        setAlerts(sorted);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── Supabase Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('clinical_alerts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinical_alerts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAlerts((prev) => {
              const next = [payload.new as ClinicalAlert, ...prev];
              return next.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
            });
          } else if (payload.eventType === 'UPDATE') {
            setAlerts((prev) =>
              prev
                .map((a) => (a.id === payload.new.id ? (payload.new as ClinicalAlert) : a))
                .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
            );
          } else if (payload.eventType === 'DELETE') {
            setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts, supabase]);

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

  // ── Acknowledge alert ────────────────────────────────────────────────────
  const acknowledgeAlert = async (alertId: string) => {
    if (!user?.id) return;
    setAcknowledging(alertId);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('clinical_alerts')
        .update({
          status: 'ACKNOWLEDGED',
          acknowledged_by: user.id,
          acknowledged_at: now,
        })
        .eq('id', alertId);

      if (!error) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertId
              ? { ...a, status: 'ACKNOWLEDGED', acknowledged_by: user.id, acknowledged_at: now }
              : a
          )
        );
      }
    } finally {
      setAcknowledging(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* AlertTriangle button */}
      <button
        id="alert-center-btn"
        onClick={() => setOpen((v) => !v)}
        title="Alertas Clínicas"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: open
            ? 'rgba(244,67,54,0.18)'
            : hasEmergency
            ? 'rgba(244,67,54,0.10)'
            : 'rgba(30,136,229,0.08)',
          border: `1px solid ${
            open
              ? 'rgba(244,67,54,0.55)'
              : hasEmergency
              ? 'rgba(244,67,54,0.35)'
              : 'var(--border-secondary)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: open || hasEmergency ? '#F44336' : 'var(--text-secondary)',
          position: 'relative',
          transition: 'all 0.15s ease',
          animation: hasEmergency && !open ? 'alert-pulse 1.6s ease-in-out infinite' : 'none',
        }}
      >
        <Icon name="AlertTriangle" size={16} />
        {unacknowledgedCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: hasEmergency ? '#F44336' : '#FF9800',
              border: '1.5px solid var(--bg-topnav)',
              fontSize: 9,
              fontWeight: 800,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: '0 3px',
              animation: hasEmergency ? 'badge-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          id="alert-center-panel"
          style={{
            position: 'fixed',
            top: 58,
            right: 'auto',
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 540,
            background: 'rgba(15,31,56,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${hasEmergency ? 'rgba(244,67,54,0.4)' : 'var(--border-primary)'}`,
            borderRadius: 14,
            boxShadow: hasEmergency
              ? '0 8px 40px rgba(244,67,54,0.25)'
              : '0 8px 40px rgba(0,0,0,0.45)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'alert-slide-in 0.18s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 16px 10px',
              borderBottom: `1px solid ${hasEmergency ? 'rgba(244,67,54,0.3)' : 'var(--border-primary)'}`,
              flexShrink: 0,
            }}
          >
            <Icon
              name="AlertTriangle"
              size={15}
              style={{ color: hasEmergency ? '#F44336' : '#FF9800' }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
              Alertas Clínicas
            </span>
            {hasEmergency && (
              <span
                style={{
                  background: '#F44336',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 10,
                  padding: '2px 8px',
                  animation: 'badge-pulse 1.2s ease-in-out infinite',
                }}
              >
                ⚡ EMERGENCIA
              </span>
            )}
            {!hasEmergency && unacknowledgedCount > 0 && (
              <span
                style={{
                  background: '#FF9800',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 10,
                  padding: '2px 8px',
                }}
              >
                {unacknowledgedCount} activas
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 8px' }}>
            {loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 32,
                  color: 'var(--text-muted)',
                  fontSize: 12,
                }}
              >
                <Icon name="Loader2" size={20} style={{ color: 'var(--text-muted)' }} />
                <div style={{ marginTop: 8 }}>Cargando alertas...</div>
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <Icon
                  name="CheckCircle2"
                  size={28}
                  style={{ color: '#43A047', opacity: 0.6 }}
                />
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600 }}>
                  Sin alertas activas
                </div>
                <div style={{ marginTop: 4, fontSize: 11 }}>Todo en orden</div>
              </div>
            ) : (
              alerts.map((alert) => {
                const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
                const isAcknowledged = alert.status === 'ACKNOWLEDGED';
                const isAcknowledgingThis = acknowledging === alert.id;

                return (
                  <div
                    key={alert.id}
                    style={{
                      borderRadius: 10,
                      marginBottom: 6,
                      border: `1px solid ${isAcknowledged ? 'var(--border-secondary)' : cfg.border}`,
                      background: isAcknowledged ? 'rgba(255,255,255,0.02)' : cfg.bg,
                      padding: '10px 12px',
                      opacity: isAcknowledged ? 0.55 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {/* Severity badge */}
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          color: cfg.color,
                          background: `${cfg.color}18`,
                          border: `1px solid ${cfg.color}44`,
                          borderRadius: 5,
                          padding: '2px 6px',
                          flexShrink: 0,
                          marginTop: 1,
                          animation:
                            alert.severity === 'EMERGENCY' && !isAcknowledged
                              ? 'badge-pulse 1.2s ease-in-out infinite'
                              : 'none',
                        }}
                      >
                        {cfg.label}
                      </span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3,
                          }}
                        >
                          {alert.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            marginTop: 3,
                            lineHeight: 1.4,
                          }}
                        >
                          {alert.message}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 8,
                          }}
                        >
                          <span
                            style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
                          >
                            {timeAgo(alert.created_at)} atrás
                          </span>

                          {!isAcknowledged && (
                            <button
                              onClick={() => acknowledgeAlert(alert.id)}
                              disabled={isAcknowledgingThis}
                              style={{
                                background: `${cfg.color}15`,
                                border: `1px solid ${cfg.color}44`,
                                borderRadius: 6,
                                padding: '3px 10px',
                                cursor: isAcknowledgingThis ? 'not-allowed' : 'pointer',
                                fontSize: 10,
                                fontWeight: 700,
                                color: cfg.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                transition: 'all 0.15s',
                                opacity: isAcknowledgingThis ? 0.6 : 1,
                              }}
                            >
                              <Icon
                                name={isAcknowledgingThis ? 'Loader2' : 'Check'}
                                size={11}
                                style={{ color: cfg.color }}
                              />
                              {isAcknowledgingThis ? 'Reconociendo...' : 'Reconocer'}
                            </button>
                          )}

                          {isAcknowledged && (
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 10,
                                color: '#43A047',
                              }}
                            >
                              <Icon name="Check" size={11} style={{ color: '#43A047' }} />
                              Reconocida
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes alert-slide-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes alert-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244,67,54,0.0); }
          50%       { box-shadow: 0 0 0 5px rgba(244,67,54,0.25); }
        }
        @keyframes badge-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

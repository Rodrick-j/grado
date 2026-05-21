'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { logAuditEvent } from '@/lib/audit';

const EVENT_COLORS: Record<string, string> = {
  EHR_WRITE: '#1E88E5',
  PRESCRIPTION_CREATE: '#FF9800',
  LOGIN: '#4CAF50',
  LOGOUT: '#757575',
  EHR_ACCESS: '#00BCD4',
  ROLE_CHANGE: '#9C27B0',
  LAB_ORDER: '#4CAF50',
  IMAGING_ORDER: '#607D8B',
  TRIAGE_UPDATE: '#F44336',
};

export function AuditPage() {
  const supabase = createClient();
  const { user, role } = useAuth();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterOutcome, setFilterOutcome] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  // KPIs
  const [kpis, setKpis] = useState({
    eventsToday: 0,
    authFailures: 0,
    ehrWrites: 0,
    roleChanges: 0,
  });

  const fetchKpis = useCallback(async () => {
    try {
      const todayStr = new Date();
      todayStr.setHours(0, 0, 0, 0);
      const todayISO = todayStr.toISOString();

      // Today's total events
      const { count: todayCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      // Auth failures
      const { count: failuresCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'LOGIN')
        .eq('outcome', 'FAILED');

      // EHR Writes
      const { count: writesCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'EHR_WRITE');

      // Role Changes
      const { count: rolesCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'ROLE_CHANGE');

      setKpis({
        eventsToday: todayCount || 0,
        authFailures: failuresCount || 0,
        ehrWrites: writesCount || 0,
        roleChanges: rolesCount || 0,
      });
    } catch (err) {
      console.error('Error fetching audit KPIs:', err);
    }
  }, [supabase]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user_profiles (
            full_name
          )
        `, { count: 'exact' });

      if (filterAction !== 'ALL') {
        query = query.eq('action', filterAction);
      }
      if (filterOutcome !== 'ALL') {
        query = query.eq('outcome', filterOutcome);
      }
      if (filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23,59,59,999);
        query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching audit logs:', error);
      }
      if (data) {
        setLogs(data);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
    setLoading(false);
  }, [supabase, page, pageSize, filterAction, filterOutcome, filterDate]);

  // Log page access once when user is loaded
  useEffect(() => {
    if (user) {
      logAuditEvent({
        action: 'EHR_ACCESS',
        resource_type: 'audit_logs',
        outcome: 'SUCCESS',
      });
    }
  }, [user]);

  useEffect(() => {
    fetchLogs();
    fetchKpis();
  }, [fetchLogs, fetchKpis]);

  const handleExportPDF = () => {
    window.print();
  };

  // Advanced Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Pending filter inputs
  const [pendingAction, setPendingAction] = useState('ALL');
  const [pendingRole, setPendingRole] = useState('ALL');
  const [pendingOutcome, setPendingOutcome] = useState('ALL');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo, setPendingDateTo] = useState('');

  const applyFilters = () => {
    setFilterAction(pendingAction);
    setFilterRole(pendingRole);
    setFilterOutcome(pendingOutcome);
    setFilterDateFrom(pendingDateFrom);
    setFilterDateTo(pendingDateTo);
    setPage(1);
  };

  const clearFilters = () => {
    setPendingAction('ALL');
    setPendingRole('ALL');
    setPendingOutcome('ALL');
    setPendingDateFrom('');
    setPendingDateTo('');
    setFilterAction('ALL');
    setFilterRole('ALL');
    setFilterOutcome('ALL');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const handleExportCSV = () => {
    const headers = ['ID Evento', 'Timestamp', 'Usuario', 'Rol', 'IP', 'Acción', 'Recurso', 'Resultado'];
    const rows = logs.map(e => [
      `AUD-${e.id}`,
      new Date(e.created_at).toLocaleString(),
      e.user_profiles?.full_name || 'Sistema',
      e.user_role || '',
      e.ip_address || '',
      e.action,
      `${e.resource_type || ''} ${e.resource_id || ''}`,
      e.outcome
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `auditoria_${Date.now()}.csv`; a.click();
  };

  // Replace old fetchLogs filter logic with new one:
  const fetchLogsWithNewFilters = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user_profiles (
            full_name
          )
        `, { count: 'exact' });

      if (filterAction !== 'ALL') query = query.eq('action', filterAction);
      if (filterRole !== 'ALL') query = query.eq('user_role', filterRole);
      if (filterOutcome !== 'ALL') query = query.eq('outcome', filterOutcome);
      
      if (filterDateFrom) {
        const from = new Date(filterDateFrom);
        from.setHours(0,0,0,0);
        query = query.gte('created_at', from.toISOString());
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23,59,59,999);
        query = query.lte('created_at', to.toISOString());
      }

      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(fromIdx, toIdx);

      if (error) console.error('Error fetching audit logs:', error);
      if (data) {
        setLogs(data);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
    setLoading(false);
  }, [supabase, page, pageSize, filterAction, filterRole, filterOutcome, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchLogsWithNewFilters();
  }, [fetchLogsWithNewFilters]);

  // Rest of rendering...
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Auditoría & Logs del Sistema</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Trazabilidad inmutable · Registro de accesos, modificaciones y eventos clínicos · Cumple HIPAA / HL7 FHIR
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={handleExportCSV}><Icon name="Download" size={14} /> Exportar CSV</button>
          <button className="btn-ghost" onClick={handleExportPDF}><Icon name="Printer" size={14} /> Imprimir</button>
        </div>
      </div>

      {/* Compliance Banner */}
      <div style={{
        padding: '14px 18px', marginBottom: 24,
        background: 'rgba(0,188,212,0.06)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,188,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="ShieldCheck" size={20} style={{ color: 'var(--color-teal)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-teal)' }}>Sistema de Auditoría Inmutable — Project FARO</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Cada evento registra: timestamp UTC, ID de usuario, IP de origen, recurso afectado y resultado.
            Los registros son append-only — no se pueden eliminar ni modificar. Cumplimiento HIPAA / HL7 FHIR AuditEvent.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['HIPAA', 'FHIR R4', 'HL7 v2'].map(b => (
            <span key={b} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(0,188,212,0.15)', color: 'var(--color-teal)', border: '1px solid rgba(0,188,212,0.3)' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Eventos Hoy', value: kpis.eventsToday, icon: 'Activity', color: '#1E88E5' },
          { label: 'Fallos de Autenticación', value: kpis.authFailures, icon: 'XCircle', color: '#F44336' },
          { label: 'EHR Guardados', value: kpis.ehrWrites, icon: 'FileText', color: '#FF9800' },
          { label: 'Cambios de Rol', value: kpis.roleChanges, icon: 'Lock', color: '#9C27B0' },
        ].map(c => (
          <div key={c.label} className="metric-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={16} style={{ color: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-surface)', borderRadius: '10px 10px 0 0' }}>
        <button className="btn-ghost" onClick={() => setFiltersOpen(!filtersOpen)} style={{ gap: 6 }}>
          <Icon name="SlidersHorizontal" size={14} />
          Filtros {filtersOpen ? '▲' : '▼'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          Mostrando {logs.length} de {totalCount} eventos
        </span>
      </div>

      {/* Advanced Filters Panel */}
      {filtersOpen && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-secondary)',
          borderTop: 'none',
          padding: '14px 16px',
          marginBottom: 16,
          animation: 'fade-in 0.2s ease',
          borderRadius: '0 0 10px 10px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tipo de Acción</label>
              <select className="input-field" value={pendingAction} onChange={e => setPendingAction(e.target.value)}>
                <option value="ALL">Todas</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="EHR_ACCESS">EHR_ACCESS</option>
                <option value="EHR_WRITE">EHR_WRITE</option>
                <option value="PRESCRIPTION_CREATE">PRESCRIPTION_CREATE</option>
                <option value="LAB_ORDER">LAB_ORDER</option>
                <option value="IMAGING_ORDER">IMAGING_ORDER</option>
                <option value="ROLE_CHANGE">ROLE_CHANGE</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Rol de usuario</label>
              <select className="input-field" value={pendingRole} onChange={e => setPendingRole(e.target.value)}>
                <option value="ALL">Todos</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="MEDICAL_DIRECTOR">MEDICAL_DIRECTOR</option>
                <option value="DOCTOR">DOCTOR</option>
                <option value="RESIDENT">RESIDENT</option>
                <option value="NURSE">NURSE</option>
                <option value="RECEPTIONIST">RECEPTIONIST</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Resultado</label>
              <select className="input-field" value={pendingOutcome} onChange={e => setPendingOutcome(e.target.value)}>
                <option value="ALL">Todos</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Fecha desde</label>
              <input type="date" className="input-field" value={pendingDateFrom} onChange={e => setPendingDateFrom(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Fecha hasta</label>
              <input type="date" className="input-field" value={pendingDateTo} onChange={e => setPendingDateTo(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={applyFilters}>Aplicar Filtros</button>
            <button className="btn-ghost" onClick={clearFilters}>Limpiar</button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Icon name="Loader2" size={32} className="animate-spin" style={{ color: '#1E88E5' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No se registran eventos de auditoría que coincidan con la búsqueda.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Evento</th>
                <th>Timestamp (UTC)</th>
                <th>Usuario / ID</th>
                <th>Rol</th>
                <th>IP Origen</th>
                <th>Tipo de Evento</th>
                <th>Recurso Afectado</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(e => {
                const eventColor = EVENT_COLORS[e.action] ?? '#8AA3C8';
                return (
                  <tr key={e.id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--color-teal)' }}>
                        AUD-{e.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {e.user_profiles?.full_name || 'Usuario del Sistema'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {e.user_role}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {e.ip_address || '127.0.0.1'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${eventColor}15`, color: eventColor, borderColor: `${eventColor}30`, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                        {e.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.resource_type ? `${e.resource_type} (${e.resource_id || ''})` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${e.outcome === 'SUCCESS' ? 'badge-active' : 'badge-error'}`}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: e.outcome === 'SUCCESS' ? '#4CAF50' : '#F44336' }} />
                        {e.outcome}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Mostrando {logs.length} de {totalCount.toLocaleString()} eventos · Datos inmutables
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              className="btn-ghost" 
              style={{ fontSize: 12 }} 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
            >
              ← Anterior
            </button>
            <button 
              className="btn-ghost" 
              style={{ fontSize: 12 }}
              disabled={page * pageSize >= totalCount}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

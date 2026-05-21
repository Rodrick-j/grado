'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type LabOrder = {
  id: string;
  barcode: string;
  panel_name: string;
  tests_requested: string[];
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  patient_id: string;
  ordered_by: string;
  results?: any;
  critical_values?: any[];
  patients?: { first_name: string; last_name: string; mrn: string };
  professionals?: { title: string; user_profiles: { full_name: string } };
};

const STATUS_CONFIG = {
  ORDERED: { label: 'Ordenada', color: '#78909C' },
  SAMPLE_COLLECTED: { label: 'Muestra Rec.', color: '#FFB300' },
  PROCESSING: { label: 'Procesando', color: '#1E88E5' },
  COMPLETED: { label: 'Completado', color: '#4CAF50' },
  CANCELLED: { label: 'Cancelado', color: '#F44336' },
};

const REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  'Glucemia': { min: 70, max: 110, unit: 'mg/dL' },
  'Hemoglobina': { min: 12.0, max: 16.0, unit: 'g/dL' },
  'Leucocitos': { min: 4.5, max: 11.0, unit: '10^3/uL' },
  'Potasio': { min: 3.5, max: 5.1, unit: 'mEq/L' },
  'Colesterol Total': { min: 0, max: 200, unit: 'mg/dL' },
};

const TEST_PANELS = [
  { name: 'Biometría Hemática', tests: ['Hemoglobina', 'Leucocitos'] },
  { name: 'Química Sanguínea Básica', tests: ['Glucemia', 'Potasio'] },
  { name: 'Perfil Lipídico', tests: ['Colesterol Total'] }
];

export function LaboratoryPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const supabase = createClient();

  const [tab, setTab] = useState<'orders' | 'critical' | 'new'>('orders');
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCritical, setFilterCritical] = useState(false);
  const [filterPanel, setFilterPanel] = useState('');
  const [totalOrders, setTotalOrders] = useState(0);

  // Pending filter inputs
  const [pendingStatus, setPendingStatus] = useState('');
  const [pendingPriority, setPendingPriority] = useState('');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo, setPendingDateTo] = useState('');
  const [pendingCritical, setPendingCritical] = useState(false);
  const [pendingPanel, setPendingPanel] = useState('');
  
  // Para nueva orden
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState({
    patient_id: '', ordered_by: '', priority: 'ROUTINE', panel_name: '', tests: [] as string[]
  });
  const [savingOrder, setSavingOrder] = useState(false);

  // Para resultados
  const [activeOrder, setActiveOrder] = useState<LabOrder | null>(null);
  const [resultsForm, setResultsForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOrders();
    fetchLookups();
  }, []);

  // Re-fetch when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders(); }, [filterStatus, filterPriority, filterDateFrom, filterDateTo, filterCritical, filterPanel]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('lab_orders')
      .select(`
        *,
        patients (first_name, last_name, mrn),
        professionals (title, user_profiles(full_name))
      `);

    if (filterStatus) query = query.eq('status', filterStatus);
    if (filterPriority) query = query.eq('priority', filterPriority);
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      query = query.gte('created_at', from.toISOString());
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      query = query.lte('created_at', to.toISOString());
    }
    if (filterCritical) {
      // Filter orders where critical_values is not empty array
      query = query.not('critical_values', 'eq', '[]');
    }
    if (filterPanel) query = query.ilike('panel_name', `%${filterPanel}%`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (data) {
      setOrders(data);
      setTotalOrders(data.length);
    }
    setLoading(false);
  };

  const applyLabFilters = () => {
    setFilterStatus(pendingStatus);
    setFilterPriority(pendingPriority);
    setFilterDateFrom(pendingDateFrom);
    setFilterDateTo(pendingDateTo);
    setFilterCritical(pendingCritical);
    setFilterPanel(pendingPanel);
  };

  const clearLabFilters = () => {
    setPendingStatus(''); setPendingPriority(''); setPendingDateFrom('');
    setPendingDateTo(''); setPendingCritical(false); setPendingPanel('');
    setFilterStatus(''); setFilterPriority(''); setFilterDateFrom('');
    setFilterDateTo(''); setFilterCritical(false); setFilterPanel('');
  };

  const fetchLookups = async () => {
    const { data: p } = await supabase.from('patients').select('id, first_name, last_name, mrn');
    if (p) setPatients(p);

    const { data: d } = await supabase.from('professionals').select('id, title, user_profiles(full_name)');
    if (d) setDoctors(d);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await supabase.from('lab_orders').update({ status: newStatus }).eq('id', id);
    fetchOrders();
  };

  const handleCreateOrder = async () => {
    if (!newOrder.patient_id || !newOrder.ordered_by || !newOrder.panel_name) return alert('Completa los campos');
    setSavingOrder(true);
    
    await supabase.from('lab_orders').insert([{
      patient_id: newOrder.patient_id,
      ordered_by: newOrder.ordered_by,
      panel_name: newOrder.panel_name,
      tests_requested: newOrder.tests,
      priority: newOrder.priority,
      status: 'ORDERED'
    }]);

    setSavingOrder(false);
    setTab('orders');
    fetchOrders();
    setNewOrder({ patient_id: '', ordered_by: '', priority: 'ROUTINE', panel_name: '', tests: [] });
  };

  const handleSaveResults = async () => {
    if (!activeOrder) return;
    
    const finalResults: any = {};
    const criticalValues: any[] = [];

    for (const test of activeOrder.tests_requested) {
      const valStr = resultsForm[test];
      if (!valStr) continue;
      
      const val = parseFloat(valStr);
      finalResults[test] = valStr;

      const ref = REFERENCE_RANGES[test];
      if (ref) {
        if (val < ref.min) criticalValues.push({ test, value: valStr, status: 'BAJO', ref: `${ref.min}-${ref.max}` });
        if (val > ref.max) criticalValues.push({ test, value: valStr, status: 'ALTO', ref: `${ref.min}-${ref.max}` });
      }
    }

    await supabase.from('lab_orders').update({
      status: 'COMPLETED',
      results: finalResults,
      critical_values: criticalValues,
      completed_at: new Date().toISOString()
    }).eq('id', activeOrder.id);

    setActiveOrder(null);
    setResultsForm({});
    fetchOrders();
  };

  const getDoctorName = (o: LabOrder) => o.professionals ? `${o.professionals.title} ${o.professionals.user_profiles?.full_name}` : 'Desconocido';
  const getPatientName = (o: LabOrder) => o.patients ? `${o.patients.first_name} ${o.patients.last_name}` : 'Desconocido';

  const criticalOrders = orders.filter(o => o.status === 'COMPLETED' && o.critical_values && o.critical_values.length > 0);
  const activeCount = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.back()} className="btn-ghost" style={{ padding: 8 }}>
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Laboratorio LIS</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Sistema de Información de Laboratorio · Control y Resultados</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('new')} className="btn-primary">
            <Icon name="Plus" size={14} /> Nueva Orden
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Órdenes Totales', value: orders.length, icon: 'FlaskConical', color: '#1E88E5' },
          { label: 'Activas / Pendientes', value: activeCount, icon: 'Clock', color: '#FF9800' },
          { label: 'Valores Críticos', value: criticalOrders.length, icon: 'AlertTriangle', color: '#F44336' },
          { label: 'Completados', value: orders.filter(o=>o.status==='COMPLETED').length, icon: 'CheckCircle2', color: '#4CAF50' },
        ].map(c => (
          <div key={c.label} className="metric-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={16} style={{ color: c.color }} />
              </div>
              <div><div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="tab-bar" style={{ marginBottom: 16, width: 'fit-content' }}>
        {[{ id: 'orders', label: 'Órdenes Activas' }, { id: 'critical', label: 'Alertas Críticas' }, { id: 'new', label: 'Crear Orden' }].map(t => (
          <div key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as typeof tab)}>
            {t.id === 'critical' && criticalOrders.length > 0 && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#F44336', marginRight: 5 }} />}
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {/* Filter toggle */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => setFiltersOpen(!filtersOpen)} style={{ gap: 6 }}>
              <Icon name="SlidersHorizontal" size={14} />
              Filtros {filtersOpen ? '▲' : '▼'}
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              Mostrando {orders.length} de {totalOrders} órdenes
            </span>
          </div>

          {/* Advanced Filters Panel */}
          {filtersOpen && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-secondary)',
              borderRadius: 10,
              padding: '14px 16px',
              margin: 12,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Estado</label>
                  <select className="input-field" value={pendingStatus} onChange={e => setPendingStatus(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="ORDERED">ORDERED</option>
                    <option value="SAMPLE_COLLECTED">SAMPLE_COLLECTED</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Prioridad</label>
                  <select className="input-field" value={pendingPriority} onChange={e => setPendingPriority(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="URGENT">URGENT</option>
                    <option value="STAT">STAT</option>
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
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Panel / Tipo</label>
                  <input className="input-field" placeholder="Ej: Biometría" value={pendingPanel} onChange={e => setPendingPanel(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="lab-filter-critical" checked={pendingCritical} onChange={e => setPendingCritical(e.target.checked)} style={{ width: 15, height: 15 }} />
                  <label htmlFor="lab-filter-critical" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Solo valores críticos</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn-primary" onClick={applyLabFilters}>Aplicar Filtros</button>
                <button className="btn-ghost" onClick={clearLabFilters}>Limpiar</button>
              </div>
            </div>
          )}

          {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando órdenes...</div> : (
            <table className="data-table">
              <thead><tr>
                <th>Código Barras</th><th>Paciente</th><th>Panel</th>
                <th>Prioridad</th><th>Estado</th><th>Médico</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {orders.map(o => {
                  const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.ORDERED;
                  return (
                    <tr key={o.id}>
                      <td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--color-teal)', fontWeight: 600 }}>{o.barcode}</span></td>
                      <td style={{ fontWeight: 600 }}>{getPatientName(o)}</td>
                      <td>{o.panel_name}</td>
                      <td><span className="badge" style={{ background: o.priority === 'STAT' ? 'rgba(244,67,54,0.15)' : o.priority === 'URGENT' ? 'rgba(255,152,0,0.15)' : 'rgba(74,96,128,0.15)', color: o.priority === 'STAT' ? '#FF5252' : o.priority === 'URGENT' ? '#FFAB40' : 'var(--text-muted)', borderColor: 'transparent' }}>{o.priority}</span></td>
                      <td><span className="badge" style={{ background: `${sc.color}15`, color: sc.color, borderColor: `${sc.color}30` }}>{sc.label}</span></td>
                      <td style={{ fontSize: 12 }}>{getDoctorName(o)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {o.status === 'ORDERED' && (
                            <button onClick={() => handleUpdateStatus(o.id, 'SAMPLE_COLLECTED')} className="btn-primary" style={{ padding: '4px 8px', fontSize: 11 }}>Tomar Muestra</button>
                          )}
                          {o.status === 'SAMPLE_COLLECTED' && (
                            <button onClick={() => handleUpdateStatus(o.id, 'PROCESSING')} className="btn-primary" style={{ padding: '4px 8px', fontSize: 11, background: '#1E88E5' }}>Procesar</button>
                          )}
                          {o.status === 'PROCESSING' && (
                            <button onClick={() => { setActiveOrder(o); setResultsForm({}); }} className="btn-primary" style={{ padding: '4px 8px', fontSize: 11, background: '#4CAF50' }}>Resultados</button>
                          )}
                          {o.status === 'COMPLETED' && (
                            <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: '#1E88E5' }} onClick={() => alert('Imprimiendo reporte...')}><Icon name="Printer" size={14} /> Imprimir</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'critical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {criticalOrders.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay valores críticos detectados.</div>
          ) : (
            <>
              <div style={{ padding: '10px 14px', background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.25)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Icon name="AlertTriangle" size={14} style={{ color: '#F44336' }} />
                <span style={{ fontSize: 12, color: '#FF5252', fontWeight: 600 }}>Alerta Crítica: Se detectaron resultados fuera de rango que requieren atención médica inmediata.</span>
              </div>
              {criticalOrders.map(o => (
                <div key={o.id} style={{ background: 'var(--bg-card)', border: '1px solid rgba(244,67,54,0.3)', borderLeft: '4px solid #F44336', borderRadius: 10, padding: 18, display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(244,67,54,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="AlertTriangle" size={20} style={{ color: '#F44336' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Paciente: {getPatientName(o)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Código: {o.barcode} · Médico: {getDoctorName(o)}</div>
                    
                    <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {o.critical_values?.map((cv, idx) => (
                        <div key={idx} style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.2)', padding: '6px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{cv.test}: </span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#F44336' }}>{cv.value}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>({cv.status} - Ref: {cv.ref})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #D32F2F, #B71C1C)', fontSize: 12 }} onClick={() => alert('Notificando al médico por SMS/Push...')}>
                    <Icon name="Bell" size={12} /> Notificar Médico
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'new' && (
        <div className="glass-card" style={{ padding: 24, maxWidth: 600 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Nueva Orden de Laboratorio</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Paciente *</label>
              <select className="input-field" value={newOrder.patient_id} onChange={e => setNewOrder({...newOrder, patient_id: e.target.value})}>
                <option value="">Seleccione Paciente</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} (MRN: {p.mrn})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Médico Solicitante *</label>
              <select className="input-field" value={newOrder.ordered_by} onChange={e => setNewOrder({...newOrder, ordered_by: e.target.value})}>
                <option value="">Seleccione Médico</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.title} {d.user_profiles?.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Prioridad</label>
              <select className="input-field" value={newOrder.priority} onChange={e => setNewOrder({...newOrder, priority: e.target.value as any})}>
                <option value="ROUTINE">Rutina</option>
                <option value="URGENT">Urgente</option>
                <option value="STAT">STAT (Inmediato)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Panel de Análisis *</label>
              <select className="input-field" value={newOrder.panel_name} onChange={e => {
                const panel = TEST_PANELS.find(p => p.name === e.target.value);
                setNewOrder({...newOrder, panel_name: e.target.value, tests: panel ? panel.tests : []})
              }}>
                <option value="">Seleccione Panel</option>
                {TEST_PANELS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {newOrder.tests.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(30,136,229,0.05)', borderRadius: 8, border: '1px solid rgba(30,136,229,0.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1E88E5', marginBottom: 8 }}>PRUEBAS INCLUIDAS:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {newOrder.tests.map(t => <span key={t} className="badge" style={{ background: 'var(--bg-surface)' }}>{t}</span>)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={handleCreateOrder} disabled={savingOrder} className="btn-primary">
              <Icon name={savingOrder ? 'Loader2' : 'FlaskConical'} size={14} className={savingOrder ? 'animate-spin' : ''} /> 
              {savingOrder ? 'Generando...' : 'Generar Orden'}
            </button>
            <button onClick={() => setTab('orders')} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal Ingreso de Resultados */}
      {activeOrder && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={() => setActiveOrder(null)} />
          <div className="glass-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, zIndex: 101, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Ingreso de Resultados</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              Paciente: <strong style={{ color: 'var(--text-primary)' }}>{getPatientName(activeOrder)}</strong><br/>
              Orden: <strong style={{ color: 'var(--color-teal)' }}>{activeOrder.barcode}</strong> ({activeOrder.panel_name})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto', paddingRight: 10 }}>
              {activeOrder.tests_requested.map(test => {
                const ref = REFERENCE_RANGES[test];
                return (
                  <div key={test} style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{test}</label>
                      {ref && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ref: {ref.min} - {ref.max} {ref.unit}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="number" step="0.01" className="input-field" style={{ flex: 1 }} placeholder="Valor..."
                        value={resultsForm[test] || ''} onChange={e => setResultsForm({...resultsForm, [test]: e.target.value})}
                      />
                      {ref && <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 40 }}>{ref.unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={() => setActiveOrder(null)} className="btn-ghost">Cancelar</button>
              <button onClick={handleSaveResults} className="btn-primary" style={{ background: '#4CAF50', color: '#000' }}>
                <Icon name="CheckCircle2" size={16} /> Guardar y Completar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';

type Recibo = {
  id: string; receipt_number: string; tipo: string; descripcion: string;
  monto_total: number; metodo_pago: string; estado: string;
  created_at: string; pagado_en: string | null;
  patients?: { first_name: string; last_name: string; mrn: string } | null;
  user_profiles?: { full_name: string } | null;
};

const TIPO_COLOR: Record<string, string> = {
  CONSULTA: '#1E88E5', LABORATORIO: '#4CAF50', IMAGENES: '#9C27B0',
  FARMACIA: '#FF9800', INTERNACION: '#F44336', EMERGENCIA: '#FF5252',
  PROCEDIMIENTO: '#00BCD4', OTRO: '#607D8B',
};
const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: '#FF9800', PAGADO: '#4CAF50', ANULADO: '#F44336', PARCIAL: '#00BCD4',
};

const TIPOS = ['TODOS','CONSULTA','LABORATORIO','IMAGENES','FARMACIA','INTERNACION','EMERGENCIA','PROCEDIMIENTO'];
const ESTADOS = ['TODOS','PENDIENTE','PAGADO','ANULADO','PARCIAL'];
const METODOS = ['EFECTIVO','TARJETA','TRANSFERENCIA','SEGURO','EXENTO'];

export default function RecibosPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [filterFecha, setFilterFecha] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState<{ id: string; first_name: string; last_name: string; mrn: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', tipo: 'CONSULTA', descripcion: '', monto_subtotal: '',
    descuento: '0', metodo_pago: 'EFECTIVO', notas: '', seguro_provider: '', seguro_cobertura: '0',
  });

  const loadRecibos = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('recibos').select('*, patients(first_name,last_name,mrn), user_profiles!emitido_por(full_name)').order('created_at', { ascending: false });
    if (filterTipo !== 'TODOS') q = q.eq('tipo', filterTipo);
    if (filterEstado !== 'TODOS') q = q.eq('estado', filterEstado);
    if (filterFecha) q = q.gte('created_at', filterFecha).lte('created_at', filterFecha + 'T23:59:59');
    const { data } = await q.limit(100);
    setRecibos((data || []) as Recibo[]);
    setLoading(false);
  }, [filterTipo, filterEstado, filterFecha]);

  useEffect(() => { loadRecibos(); }, [loadRecibos]);

  useEffect(() => {
    supabase.from('patients').select('id,first_name,last_name,mrn').order('last_name').limit(200).then(({ data }) => setPatients(data || []));
  }, []);

  const kpis = {
    total: recibos.reduce((s, r) => r.estado === 'PAGADO' ? s + r.monto_total : s, 0),
    pendiente: recibos.filter(r => r.estado === 'PENDIENTE').reduce((s, r) => s + r.monto_total, 0),
    count: recibos.length,
    anulados: recibos.filter(r => r.estado === 'ANULADO').length,
  };

  const filtered = recibos.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.receipt_number?.toLowerCase().includes(s) ||
      r.patients?.first_name?.toLowerCase().includes(s) ||
      r.patients?.last_name?.toLowerCase().includes(s) ||
      r.patients?.mrn?.toLowerCase().includes(s);
  });

  const handleSave = async () => {
    if (!form.patient_id || !form.monto_subtotal) return;
    setSaving(true);
    const subtotal = parseFloat(form.monto_subtotal) || 0;
    const descuento = parseFloat(form.descuento) || 0;
    const cobertura = parseFloat(form.seguro_cobertura) || 0;
    const total = Math.max(0, subtotal - descuento - cobertura);
    await supabase.from('recibos').insert({
      patient_id: form.patient_id, tipo: form.tipo, descripcion: form.descripcion,
      monto_subtotal: subtotal, descuento, monto_total: total,
      metodo_pago: form.metodo_pago, notas: form.notas,
      seguro_provider: form.seguro_provider || null,
      seguro_cobertura: cobertura,
      emitido_por: user?.id,
    });
    setSaving(false);
    setShowModal(false);
    setForm({ patient_id: '', tipo: 'CONSULTA', descripcion: '', monto_subtotal: '', descuento: '0', metodo_pago: 'EFECTIVO', notas: '', seguro_provider: '', seguro_cobertura: '0' });
    loadRecibos();
  };

  const marcarPagado = async (id: string) => {
    await supabase.from('recibos').update({ estado: 'PAGADO', pagado_en: new Date().toISOString() }).eq('id', id);
    loadRecibos();
  };

  const anular = async (id: string) => {
    if (!confirm('¿Anular este recibo?')) return;
    await supabase.from('recibos').update({ estado: 'ANULADO', anulado_en: new Date().toISOString(), anulado_por: user?.id }).eq('id', id);
    loadRecibos();
  };

  const imprimir = (r: Recibo) => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura / Recibo ${r.receipt_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: white; }
          .container { max-width: 700px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; }
          .logo-area { display: flex; align-items: center; gap: 12px; }
          .logo-box { width: 48px; height: 48px; background: #1E88E5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 24px; }
          h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
          .hospital-info { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.5; }
          .receipt-title { text-align: right; }
          .receipt-title h2 { margin: 0; font-size: 28px; font-weight: 800; color: #1E88E5; letter-spacing: 0.05em; text-transform: uppercase; }
          .receipt-title p { margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #475569; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; background: #f8fafc; padding: 20px; border-radius: 8px; }
          .info-block span { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
          .info-block strong { display: block; font-size: 15px; color: #1e293b; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
          td { padding: 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .totals-box { width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
          .total-final { display: flex; justify-content: space-between; padding: 16px 0; margin-top: 8px; border-top: 2px solid #cbd5e1; font-size: 18px; font-weight: 800; color: #0f172a; }
          .total-final .amount { color: #1E88E5; font-size: 24px; }
          
          .footer { margin-top: 60px; padding-top: 24px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; margin-top: 8px; }
          .status-PAGADO { background: #dcfce7; color: #166534; }
          .status-PENDIENTE { background: #fef3c7; color: #b45309; }
          .status-ANULADO { background: #fee2e2; color: #991b1b; }
          
          @media print {
            body { padding: 0; }
            .container { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-area">
              <div class="logo-box">H</div>
              <div>
                <h1>HOSPITAL SAN JUAN DE DIOS</h1>
                <div class="hospital-info">Av. Principal 123, Ciudad de Salud<br>Tel: +1 234 567 8900 | Nit: 123456789</div>
              </div>
            </div>
            <div class="receipt-title">
              <h2>FACTURA</h2>
              <p>N° ${r.receipt_number}</p>
              <div class="status-badge status-${r.estado}">${r.estado}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-block">
              <span>Paciente</span>
              <strong>${r.patients?.first_name} ${r.patients?.last_name}</strong>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">MRN: ${r.patients?.mrn || '—'}</div>
            </div>
            <div class="info-block" style="text-align: right;">
              <span>Fecha de Emisión</span>
              <strong>${new Date(r.created_at).toLocaleString('es-BO')}</strong>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Atendido por: ${r.user_profiles?.full_name || '—'}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Servicio / Concepto</th>
                <th class="text-center">Tipo</th>
                <th class="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${r.descripcion || 'Servicio Médico'}</strong></td>
                <td class="text-center"><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${r.tipo}</span></td>
                <td class="text-right" style="font-weight: 600;">Bs. ${r.monto_total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="totals-box">
            <div class="total-row">
              <span>Método de pago:</span>
              <strong>${r.metodo_pago}</strong>
            </div>
            <div class="total-final">
              <span>TOTAL A PAGAR</span>
              <span class="amount">Bs. ${r.monto_total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <strong>SISTEMA INTEGRADO FARO</strong><br>
            Gracias por confiar en nuestros servicios.<br>
            Este documento es un comprobante válido generado electrónicamente.
          </div>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
      </html>
    `);
    w.document.close();
  };

  const inp = { background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="Receipt" size={22} style={{ color: '#FF9800' }} />
            Recibos & Caja
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gestión de cobros, recibos de pago y arqueo de caja diario</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ gap: 8, flexShrink: 0 }}>
          <Icon name="Plus" size={16} /> Nuevo Recibo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Recaudado Hoy', value: `Bs. ${kpis.total.toFixed(2)}`, icon: 'TrendingUp', color: '#4CAF50' },
          { label: 'Por Cobrar', value: `Bs. ${kpis.pendiente.toFixed(2)}`, icon: 'Clock', color: '#FF9800' },
          { label: 'Recibos Emitidos', value: kpis.count, icon: 'FileText', color: '#1E88E5' },
          { label: 'Anulados', value: kpis.anulados, icon: 'XCircle', color: '#F44336' },
        ].map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={k.icon} size={20} style={{ color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Icon name="Search" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por N° recibo o paciente..." style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ ...inp, width: 'auto' }}>
          {TIPOS.map(t => <option key={t} value={t}>{t === 'TODOS' ? 'Todos los tipos' : t}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={{ ...inp, width: 'auto' }}>
          {ESTADOS.map(s => <option key={s} value={s}>{s === 'TODOS' ? 'Todos los estados' : s}</option>)}
        </select>
        <input type="date" value={filterFecha} onChange={e => setFilterFecha(e.target.value)} style={{ ...inp, width: 'auto' }} />
        {(filterTipo !== 'TODOS' || filterEstado !== 'TODOS' || filterFecha || search) && (
          <button onClick={() => { setFilterTipo('TODOS'); setFilterEstado('TODOS'); setFilterFecha(''); setSearch(''); }} className="btn-ghost" style={{ gap: 6, fontSize: 12 }}>
            <Icon name="X" size={12} /> Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                {['N° Recibo', 'Paciente', 'Tipo', 'Descripción', 'Método', 'Total (Bs.)', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Icon name="Loader2" className="animate-spin" size={20} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Icon name="Receipt" size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                  No hay recibos registrados
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: '#1E88E5', whiteSpace: 'nowrap' }}>{r.receipt_number}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.patients?.first_name} {r.patients?.last_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.patients?.mrn}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: `${TIPO_COLOR[r.tipo] || '#607D8B'}18`, color: TIPO_COLOR[r.tipo] || '#607D8B', border: `1px solid ${TIPO_COLOR[r.tipo] || '#607D8B'}30` }}>{r.tipo}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-secondary)' }}>{r.metodo_pago}</td>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, color: '#4CAF50' }}>Bs. {r.monto_total.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: `${ESTADO_COLOR[r.estado]}18`, color: ESTADO_COLOR[r.estado], border: `1px solid ${ESTADO_COLOR[r.estado]}30` }}>{r.estado}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString('es-BO')}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => imprimir(r)} title="Imprimir" style={{ background: 'rgba(30,136,229,0.1)', border: '1px solid rgba(30,136,229,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#1E88E5' }}>
                        <Icon name="Printer" size={13} />
                      </button>
                      {r.estado === 'PENDIENTE' && (
                        <button onClick={() => marcarPagado(r.id)} title="Marcar Pagado" style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#4CAF50' }}>
                          <Icon name="CheckCircle" size={13} />
                        </button>
                      )}
                      {r.estado !== 'ANULADO' && (
                        <button onClick={() => anular(r.id)} title="Anular" style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#F44336' }}>
                          <Icon name="X" size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="animate-fade-in" style={{ position: 'relative', width: '90%', maxWidth: 540, zIndex: 201, background: '#0B1628', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 16, padding: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="Receipt" size={18} style={{ color: '#FF9800' }} /> Emitir Nuevo Recibo
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Paciente *</label>
                <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} style={inp}>
                  <option value="">Seleccionar paciente...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Tipo de Servicio *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inp}>
                    {['CONSULTA','LABORATORIO','IMAGENES','FARMACIA','INTERNACION','EMERGENCIA','PROCEDIMIENTO','OTRO'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Método de Pago *</label>
                  <select value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))} style={inp}>
                    {METODOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Descripción / Concepto</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Consulta médica — Cardiología" style={inp} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Subtotal (Bs.) *</label>
                  <input type="number" min="0" step="0.01" value={form.monto_subtotal} onChange={e => setForm(f => ({ ...f, monto_subtotal: e.target.value }))} placeholder="0.00" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Descuento (Bs.)</label>
                  <input type="number" min="0" step="0.01" value={form.descuento} onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Cob. Seguro (Bs.)</label>
                  <input type="number" min="0" step="0.01" value={form.seguro_cobertura} onChange={e => setForm(f => ({ ...f, seguro_cobertura: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL A PAGAR</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#4CAF50' }}>
                  Bs. {Math.max(0, (parseFloat(form.monto_subtotal) || 0) - (parseFloat(form.descuento) || 0) - (parseFloat(form.seguro_cobertura) || 0)).toFixed(2)}
                </span>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Notas adicionales</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} style={{ ...inp, resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !form.patient_id || !form.monto_subtotal} className="btn-primary" style={{ gap: 8 }}>
                  {saving ? <Icon name="Loader2" className="animate-spin" size={14} /> : <Icon name="Save" size={14} />}
                  {saving ? 'Guardando...' : 'Emitir Recibo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

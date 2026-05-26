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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', tipo: 'CONSULTA', descripcion: '', monto_subtotal: '',
    descuento: '0', metodo_pago: 'EFECTIVO', notas: '', seguro_provider: '', seguro_cobertura: '0',
  });
  // Buscador por carnet
  const [carnetInput, setCarnetInput] = useState('');
  const [foundPatient, setFoundPatient] = useState<{ id: string; first_name: string; last_name: string; mrn: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const searchByCarnet = useCallback(async (carnet: string) => {
    if (!carnet.trim()) { setFoundPatient(null); setNotFound(false); return; }
    setSearching(true); setNotFound(false);
    // Buscar por carnet (ci_passport) que es donde se guarda el CI real
    const { data } = await supabase.from('patients').select('id,first_name,last_name,mrn,ci_passport').ilike('ci_passport', `%${carnet.trim()}%`).limit(1);
    const found = data && data.length > 0 ? data[0] : null;
    if (found) {
      setFoundPatient(found);
      setForm(f => ({ ...f, patient_id: found.id }));
      setNotFound(false);
    } else {
      // Intento secundario: buscar por MRN por si acaso el usuario escribio el MRN
      const { data: mrnData } = await supabase.from('patients').select('id,first_name,last_name,mrn,ci_passport').ilike('mrn', `%${carnet.trim()}%`).limit(1);
      const foundMrn = mrnData && mrnData.length > 0 ? mrnData[0] : null;
      if (foundMrn) {
        setFoundPatient(foundMrn);
        setForm(f => ({ ...f, patient_id: foundMrn.id }));
        setNotFound(false);
      } else {
        setFoundPatient(null);
        setForm(f => ({ ...f, patient_id: '' }));
        setNotFound(true);
      }
    }
    setSearching(false);
  }, [supabase]);

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
    setCarnetInput(''); setFoundPatient(null); setNotFound(false);
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

  const numeroALetras = (num: number): string => {
    const unidades = ['Cero', 'Un', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];
    const decenas = ['Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciseis', 'Diecisiete', 'Dieciocho', 'Diecinueve'];
    const decenas2 = ['Veinte', 'Treinta', 'Cuarenta', 'Cincuenta', 'Sesenta', 'Setenta', 'Ochenta', 'Noventa'];
    const centenas = ['Cien', 'Ciento', 'Doscientos', 'Trescientos', 'Cuatrocientos', 'Quinientos', 'Seiscientos', 'Setecientos', 'Ochocientos', 'Novecientos'];

    const convertirEntero = (n: number): string => {
      if (n < 10) return unidades[n];
      if (n < 20) return decenas[n - 10];
      if (n < 100) return decenas2[Math.floor(n / 10) - 2] + (n % 10 !== 0 ? ' y ' + unidades[n % 10] : '');
      if (n === 100) return 'Cien';
      if (n < 1000) return centenas[Math.floor(n / 100)] + (n % 100 !== 0 ? ' ' + convertirEntero(n % 100) : '');
      if (n === 1000) return 'Mil';
      if (n < 2000) return 'Mil ' + convertirEntero(n % 1000);
      if (n < 1000000) return convertirEntero(Math.floor(n / 1000)) + ' Mil' + (n % 1000 !== 0 ? ' ' + convertirEntero(n % 1000) : '');
      return n.toString();
    };

    const entero = Math.floor(num);
    const decimales = Math.round((num - entero) * 100);
    const textoEntero = convertirEntero(entero);
    const textoDecimales = decimales < 10 ? `0${decimales}` : `${decimales}`;
    return `${textoEntero.toUpperCase()} ${textoDecimales}/100 BOLIVIANOS`;
  };

  const imprimir = (r: Recibo) => {
    const w = window.open('', '_blank', 'width=850,height=900');
    if (!w) return;
    
    // Asumiendo que `r` podría tener `monto_subtotal`, `descuento`, y `seguro_cobertura` (aunque no estén en el type inicial, los usamos si existen, sino calculamos).
    const subtotal = (r as any).monto_subtotal || r.monto_total;
    const descuento = (r as any).descuento || 0;
    const seguro = (r as any).seguro_cobertura || 0;

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo ${r.receipt_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; position: relative; }
          
          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1E88E5; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-area { display: flex; align-items: center; gap: 16px; }
          .logo-box { width: 60px; height: 60px; background: #1E88E5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 32px; }
          h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .hospital-info { font-size: 13px; color: #64748b; margin-top: 6px; line-height: 1.6; }
          
          .receipt-title { text-align: right; }
          .receipt-title h2 { margin: 0; font-size: 32px; font-weight: 800; color: #1E88E5; letter-spacing: 0.05em; text-transform: uppercase; }
          .receipt-title p { margin: 6px 0 0; font-size: 16px; font-weight: 700; color: #334155; font-family: 'Space Mono', monospace; }
          
          /* Patient Info */
          .info-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 30px; }
          .info-card { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .info-card span { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
          .info-card strong { display: block; font-size: 16px; color: #0f172a; margin-bottom: 6px; }
          .info-detail { font-size: 13px; color: #475569; display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
          
          /* Table */
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 700; color: #ffffff; background: #334155; text-transform: uppercase; letter-spacing: 0.05em; }
          th:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
          th:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
          td { padding: 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          /* Summary Section */
          .summary-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
          
          .amount-words { width: 50%; background: #f1f5f9; padding: 16px; border-left: 4px solid #1E88E5; border-radius: 0 6px 6px 0; }
          .amount-words span { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
          .amount-words p { margin: 0; font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.5; font-style: italic; }
          
          .totals-box { width: 320px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 16px; font-size: 14px; color: #475569; }
          .total-row.discount { color: #e11d48; }
          .total-row.insurance { color: #059669; }
          .total-final { display: flex; justify-content: space-between; align-items: center; padding: 16px; margin-top: 8px; background: #0f172a; color: white; border-radius: 8px; font-size: 16px; font-weight: 700; }
          .total-final .amount { color: #38bdf8; font-size: 24px; font-weight: 800; font-family: 'Space Mono', monospace; }
          
          /* Footer */
          .notes { margin-top: 40px; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 13px; color: #475569; }
          .notes span { font-weight: 700; color: #0f172a; }
          
          .footer { margin-top: 40px; text-align: center; }
          .qr-placeholder { width: 100px; height: 100px; border: 2px solid #cbd5e1; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; border-radius: 8px; background: #f8fafc; }
          .footer-text { font-size: 12px; color: #64748b; line-height: 1.6; }
          
          .status-watermark { position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; font-weight: 900; opacity: 0.04; text-transform: uppercase; letter-spacing: 0.1em; pointer-events: none; z-index: 0; }
          .status-ANULADO { color: #ef4444; }
          .status-PAGADO { color: #22c55e; }
          .status-PENDIENTE { color: #f59e0b; }
          
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; margin-top: 8px; }
          .badge-PAGADO { background: #dcfce7; color: #166534; }
          .badge-PENDIENTE { background: #fef3c7; color: #b45309; }
          .badge-ANULADO { background: #fee2e2; color: #991b1b; }
          
          @media print {
            body { padding: 0; }
            .container { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status-watermark status-${r.estado}">${r.estado}</div>
          
          <div class="header">
            <div class="logo-area">
              <div class="logo-box">H</div>
              <div>
                <h1>HOSPITAL SAN JUAN DE DIOS</h1>
                <div class="hospital-info">
                  Av. Principal 123, Zona Sur, Ciudad de Salud<br>
                  Teléfono: +1 (234) 567-8900 | Nit: 123456789<br>
                  www.hospitalsanjuandedios.com
                </div>
              </div>
            </div>
            <div class="receipt-title">
              <h2>RECIBO OFICIAL</h2>
              <p>N° ${r.receipt_number}</p>
              <div class="status-badge badge-${r.estado}">${r.estado}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-card">
              <span>Datos del Paciente</span>
              <strong>${r.patients?.first_name} ${r.patients?.last_name}</strong>
              <div class="info-detail"><span>N° Carnet / CI:</span> <span style="font-family: 'Space Mono', monospace;">${(r.patients as any)?.ci_passport || '—'}</span></div>
              <div class="info-detail"><span>Historia Clínica (MRN):</span> <span style="font-family: 'Space Mono', monospace;">${r.patients?.mrn || '—'}</span></div>
              <div class="info-detail" style="border: none;"><span>Método de Pago:</span> <span><strong>${r.metodo_pago}</strong></span></div>
            </div>
            <div class="info-card">
              <span>Detalles de Emisión</span>
              <div class="info-detail"><span>Fecha:</span> <span>${new Date(r.created_at).toLocaleDateString('es-BO')}</span></div>
              <div class="info-detail"><span>Hora:</span> <span>${new Date(r.created_at).toLocaleTimeString('es-BO')}</span></div>
              <div class="info-detail"><span>Cajero:</span> <span>${r.user_profiles?.full_name || '—'}</span></div>
              <div class="info-detail" style="border: none;"><span>Tipo:</span> <span style="color: #1E88E5; font-weight: 700;">${r.tipo}</span></div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Ítem / Concepto</th>
                <th class="text-center" style="width: 15%">Cant.</th>
                <th class="text-center" style="width: 20%">Precio Unit.</th>
                <th class="text-right" style="width: 20%">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${r.descripcion || 'Servicio Médico'}</strong>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Atención en especialidad de ${r.tipo.toLowerCase()}</div>
                </td>
                <td class="text-center">1</td>
                <td class="text-center">Bs. ${subtotal.toFixed(2)}</td>
                <td class="text-right" style="font-weight: 600;">Bs. ${subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary-section">
            <div class="amount-words">
              <span>Son:</span>
              <p>${numeroALetras(r.monto_total)}</p>
            </div>
            
            <div class="totals-box">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>Bs. ${subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row discount">
                <span>Descuento Aplicado:</span>
                <span>- Bs. ${descuento.toFixed(2)}</span>
              </div>
              <div class="total-row insurance">
                <span>Cobertura Seguro:</span>
                <span>- Bs. ${seguro.toFixed(2)}</span>
              </div>
              <div class="total-final">
                <span>TOTAL A PAGAR</span>
                <span class="amount">Bs. ${r.monto_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          ${(r as any).notas ? `
          <div class="notes">
            <span>Notas Adicionales:</span><br>
            ${(r as any).notas}
          </div>
          ` : ''}
          
          <div class="footer">
            <div class="qr-placeholder">QR de<br>Validación</div>
            <div class="footer-text">
              <strong>SISTEMA INTEGRADO FARO</strong><br>
              Este recibo es un comprobante de pago emitido por el sistema.<br>
              Revise su documento, no se aceptan reclamos posteriores a la fecha de emisión.
            </div>
          </div>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 800);
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 16px 16px' }}>
          <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.82)', backdropFilter: 'blur(4px)' }} />
          <div className="animate-fade-in" style={{ position: 'relative', width: '100%', maxWidth: 680, zIndex: 201, background: '#0B1628', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 14, padding: '16px 20px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Icon name="Receipt" size={15} style={{ color: '#FF9800' }} /> Emitir Nuevo Recibo
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={16} /></button>
            </div>

            {/* Fila 1: Buscar por Carnet */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buscar Paciente por Carnet *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Icon name="CreditCard" size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    value={carnetInput}
                    onChange={e => { setCarnetInput(e.target.value); if (foundPatient) { setFoundPatient(null); setForm(f => ({ ...f, patient_id: '' })); } setNotFound(false); }}
                    onKeyDown={e => e.key === 'Enter' && searchByCarnet(carnetInput)}
                    placeholder="Ingresa número de carnet / CI..."
                    style={{ ...inp, paddingLeft: 30, padding: '6px 10px 6px 30px', fontSize: 12 }}
                  />
                </div>
                <button onClick={() => searchByCarnet(carnetInput)} disabled={searching || !carnetInput.trim()} style={{ background: 'rgba(30,136,229,0.15)', border: '1px solid rgba(30,136,229,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#1E88E5', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  {searching ? <Icon name="Loader2" className="animate-spin" size={13} /> : <Icon name="Search" size={13} />}
                  Buscar
                </button>
              </div>
              {/* Resultado del paciente encontrado */}
              {foundPatient && (
                <div style={{ marginTop: 6, background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(76,175,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="User" size={16} style={{ color: '#4CAF50' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{foundPatient.first_name} {foundPatient.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Carnet: <span style={{ color: '#4CAF50', fontWeight: 600 }}>{foundPatient.mrn}</span></div>
                  </div>
                  <button onClick={() => { setFoundPatient(null); setCarnetInput(''); setForm(f => ({ ...f, patient_id: '' })); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Icon name="X" size={13} />
                  </button>
                </div>
              )}
              {notFound && (
                <div style={{ marginTop: 6, background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.25)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#F44336', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="AlertCircle" size={13} /> No se encontró ningún paciente con ese carnet.
                </div>
              )}
            </div>


            {/* Fila 2: Tipo + Método de Pago */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo de Servicio *</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ ...inp, padding: '6px 10px', fontSize: 12 }}>
                  {['CONSULTA','LABORATORIO','IMAGENES','FARMACIA','INTERNACION','EMERGENCIA','PROCEDIMIENTO','OTRO'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Método de Pago *</label>
                <select value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))} style={{ ...inp, padding: '6px 10px', fontSize: 12 }}>
                  {METODOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Fila 3: Descripción (full width) */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción / Concepto</label>
              <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Consulta médica — Cardiología" style={{ ...inp, padding: '6px 10px', fontSize: 12 }} />
            </div>

            {/* Fila 4: Subtotal + Descuento + Seguro + Total */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: 10, marginBottom: 8, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subtotal (Bs.) *</label>
                <input type="number" min="0" step="0.01" value={form.monto_subtotal} onChange={e => setForm(f => ({ ...f, monto_subtotal: e.target.value }))} placeholder="0.00" style={{ ...inp, padding: '6px 10px', fontSize: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descuento (Bs.)</label>
                <input type="number" min="0" step="0.01" value={form.descuento} onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))} style={{ ...inp, padding: '6px 10px', fontSize: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cob. Seguro (Bs.)</label>
                <input type="number" min="0" step="0.01" value={form.seguro_cobertura} onChange={e => setForm(f => ({ ...f, seguro_cobertura: e.target.value }))} style={{ ...inp, padding: '6px 10px', fontSize: 12 }} />
              </div>
              <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 8, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total a Pagar</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#4CAF50' }}>
                  Bs. {Math.max(0, (parseFloat(form.monto_subtotal) || 0) - (parseFloat(form.descuento) || 0) - (parseFloat(form.seguro_cobertura) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Fila 5: Notas + Botones en la misma fila */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notas adicionales</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} style={{ ...inp, resize: 'none', padding: '6px 10px', fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 1 }}>
                <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ padding: '7px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving || !form.patient_id || !form.monto_subtotal} className="btn-primary" style={{ gap: 8, padding: '7px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>
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

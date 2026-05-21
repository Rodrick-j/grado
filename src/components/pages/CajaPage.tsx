'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

type Charge = {
  id: string;
  patient_id: string;
  source_type: string;
  description: string;
  amount: number;
  created_at: string;
  patients?: { first_name: string; last_name: string; mrn: string; memberships?: { name: string; discount_percentage: number } | null } | null;
};

type Recibo = {
  id: string; receipt_number: string; monto_total: number; metodo_pago: string; created_at: string; estado: string;
  patients?: { first_name: string; last_name: string } | null;
};

export function CajaPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<'pendientes' | 'corte'>('pendientes');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [recibosDia, setRecibosDia] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Facturación
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [saving, setSaving] = useState(false);
  const [receiptResult, setReceiptResult] = useState<any>(null); // For printable view

  const fetchCaja = useCallback(async () => {
    setLoading(true);
    // 1. Unbilled charges
    const { data: cData } = await supabase
      .from('patient_charges')
      .select('*, patients(first_name, last_name, mrn, memberships(name, discount_percentage))')
      .eq('is_billed', false)
      .order('created_at', { ascending: true });
    setCharges((cData || []) as Charge[]);

    // 2. Today's receipts for Corte de Caja
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const { data: rData } = await supabase
      .from('recibos')
      .select('id, receipt_number, monto_total, metodo_pago, created_at, estado, patients(first_name, last_name)')
      .gte('created_at', startOfDay.toISOString());
    setRecibosDia((rData || []) as unknown as Recibo[]);
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchCaja(); }, [fetchCaja]);

  const handleImprimir = () => {
    window.print();
  };

  const pacientesConDeuda = Array.from(new Set(charges.map(c => c.patient_id))).map(pid => {
    const pCharges = charges.filter(c => c.patient_id === pid);
    const pInfo = pCharges[0].patients;
    const total = pCharges.reduce((acc, c) => acc + Number(c.amount), 0);
    const discountPct = pInfo?.memberships?.discount_percentage || 0;
    const descuento = total * (discountPct / 100);
    const totalFinal = total - descuento;
    return {
      patient_id: pid,
      name: pInfo ? `${pInfo.first_name} ${pInfo.last_name}` : 'Desconocido',
      mrn: pInfo?.mrn || '',
      membership: pInfo?.memberships,
      charges: pCharges,
      total,
      descuento,
      totalFinal
    };
  });

  const handleFacturar = async (pacienteData: any) => {
    setSaving(true);
    // 1. Create Recibo
    const { data: recData, error } = await supabase.from('recibos').insert({
      patient_id: pacienteData.patient_id,
      tipo: 'INTERNACION', // General
      descripcion: `Cobro consolidado (${pacienteData.charges.length} items)`,
      monto_subtotal: pacienteData.total,
      descuento: pacienteData.descuento,
      monto_total: pacienteData.totalFinal,
      metodo_pago: paymentMethod,
      estado: 'PAGADO',
      notas: pacienteData.membership ? `Descuento de membresía: ${pacienteData.membership.name}` : null
    }).select().single();

    if (recData) {
      // 2. Update charges to billed
      await supabase.from('patient_charges')
        .update({ is_billed: true, receipt_id: recData.id })
        .in('id', pacienteData.charges.map((c: any) => c.id));
      
      setReceiptResult({ ...recData, details: pacienteData });
      setSelectedPatientId(null);
      fetchCaja();
    }
    setSaving(false);
  };

  const stats = {
    efectivo: recibosDia.filter(r => r.metodo_pago === 'EFECTIVO' && r.estado !== 'ANULADO').reduce((a, b) => a + Number(b.monto_total), 0),
    tarjeta: recibosDia.filter(r => r.metodo_pago === 'TARJETA' && r.estado !== 'ANULADO').reduce((a, b) => a + Number(b.monto_total), 0),
    transferencia: recibosDia.filter(r => r.metodo_pago === 'TRANSFERENCIA' && r.estado !== 'ANULADO').reduce((a, b) => a + Number(b.monto_total), 0),
    totalDia: recibosDia.filter(r => r.estado !== 'ANULADO').reduce((a, b) => a + Number(b.monto_total), 0),
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; padding: 40px; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Caja y Facturación</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Control de ingresos, cuentas hospitalarias y cobros</p>
        </div>
        <div className="tab-bar">
          <div className={`tab-item ${tab === 'pendientes' ? 'active' : ''}`} onClick={() => setTab('pendientes')}>Cuentas Pendientes</div>
          <div className={`tab-item ${tab === 'corte' ? 'active' : ''}`} onClick={() => setTab('corte')}>Corte de Caja Diario</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }} className="no-print"><Icon name="Loader2" size={24} className="animate-spin" /></div>
      ) : receiptResult ? (
        // --- VISTA DE IMPRESIÓN (RECIBO PDF) ---
        <div className="print-area" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-secondary)', borderRadius: 12, padding: 32, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #EEE', paddingBottom: 20, marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, background: '#1E88E5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="Activity" size={24} style={{ color: 'white' }} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Hospital San Juan de Dios</h2>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Av. Principal 123, Ciudad de Salud<br/>Tel: +1 234 567 8900</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#1E88E5', letterSpacing: '0.05em' }}>FACTURA / RECIBO</h3>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>N° {receiptResult.receipt_number}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fecha: {new Date(receiptResult.created_at).toLocaleString('es-ES')}</p>
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>DATOS DEL PACIENTE</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><span style={{ fontSize: 15, fontWeight: 700 }}>{receiptResult.details.name}</span><br/><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>MRN: {receiptResult.details.mrn}</span></div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>
                Método de Pago: <strong>{receiptResult.metodo_pago}</strong><br/>
                Estado: <span style={{ color: '#4CAF50', fontWeight: 800 }}>PAGADO</span>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-secondary)' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>Descripción del Cargo</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>Origen</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {receiptResult.details.charges.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                  <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text-primary)' }}>{c.description}</td>
                  <td style={{ padding: '12px 8px', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>{c.source_type}</td>
                  <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500 }}>Bs. {Number(c.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
            <div style={{ width: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>Bs. {Number(receiptResult.monto_subtotal).toFixed(2)}</span>
              </div>
              {receiptResult.descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, color: '#4CAF50' }}>
                  <span>Descuento ({receiptResult.details.membership?.name})</span>
                  <span>- Bs. {Number(receiptResult.descuento).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px solid var(--border-primary)', marginTop: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>TOTAL A PAGAR</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#1E88E5' }}>Bs. {Number(receiptResult.monto_total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 40 }}>
            <button className="btn-ghost" onClick={() => setReceiptResult(null)}><Icon name="ArrowLeft" size={14} /> Volver a Caja</button>
            <button className="btn-primary" onClick={handleImprimir}><Icon name="Printer" size={14} /> Imprimir / Guardar PDF</button>
          </div>
        </div>
      ) : tab === 'pendientes' ? (
        // --- LISTA DE CUENTAS POR COBRAR ---
        <div className="no-print">
          {pacientesConDeuda.length === 0 ? (
            <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Icon name="CheckCircle2" size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>No hay cuentas pendientes</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Todos los cargos de hospitalización y farmacia han sido cobrados.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {pacientesConDeuda.map(p => (
                <div key={p.patient_id} className="glass-card" style={{ padding: 20, borderTop: selectedPatientId === p.patient_id ? '3px solid #1E88E5' : '1px solid var(--border-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>MRN: {p.mrn}</div>
                      {p.membership && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(76,175,80,0.1)', color: '#4CAF50', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginTop: 6 }}>
                          <Icon name="Star" size={10} /> {p.membership.name} (-{p.membership.discount_percentage}%)
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total a Pagar</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#1E88E5' }}>Bs. {p.totalFinal.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div style={{ maxHeight: 150, overflowY: 'auto', background: 'var(--bg-surface)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {p.charges.map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px dashed var(--border-secondary)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>[{c.source_type}] {c.description}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Bs. {c.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {selectedPatientId === p.patient_id ? (
                    <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Método de Pago</label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map(m => (
                          <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: `1px solid ${paymentMethod === m ? '#1E88E5' : 'var(--border-secondary)'}`, background: paymentMethod === m ? 'rgba(30,136,229,0.1)' : 'transparent', color: paymentMethod === m ? '#1E88E5' : 'var(--text-secondary)', cursor: 'pointer' }}>
                            {m}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setSelectedPatientId(null)}>Cancelar</button>
                        <button className="btn-primary" style={{ flex: 1, background: '#4CAF50' }} disabled={saving} onClick={() => handleFacturar(p)}>
                          {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />} Facturar y Cobrar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => setSelectedPatientId(p.patient_id)}>Cobrar Cuenta ({p.charges.length} items)</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // --- CORTE DE CAJA DIARIO ---
        <div className="no-print">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Ingresos Efectivo', value: stats.efectivo, color: '#4CAF50', icon: 'Banknote' },
              { label: 'Ingresos Tarjeta', value: stats.tarjeta, color: '#1E88E5', icon: 'CreditCard' },
              { label: 'Ingresos Transferencia', value: stats.transferencia, color: '#9C27B0', icon: 'ArrowRightLeft' },
              { label: 'TOTAL DEL DÍA', value: stats.totalDia, color: '#FF9800', icon: 'Wallet' },
            ].map(s => (
              <div key={s.label} className="metric-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={16} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>Bs. {s.value.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Recibo N°</th><th>Hora</th><th>Paciente</th><th>Monto</th><th>Método</th><th>Estado</th></tr></thead>
              <tbody>
                {recibosDia.map(r => (
                  <tr key={r.id}>
                    <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700 }}>{r.receipt_number}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(r.created_at).toLocaleTimeString('es-ES')}</span></td>
                    <td>{r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : '—'}</td>
                    <td><span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Bs. {Number(r.monto_total).toFixed(2)}</span></td>
                    <td><span className="badge" style={{ background: 'var(--bg-elevated)' }}>{r.metodo_pago}</span></td>
                    <td>
                      <span className="badge" style={{ background: r.estado === 'PAGADO' ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)', color: r.estado === 'PAGADO' ? '#4CAF50' : '#F44336' }}>
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {recibosDia.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No hay recibos generados hoy.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

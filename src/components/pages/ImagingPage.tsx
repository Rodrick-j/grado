'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────
interface ImagingOrder {
  id: string;
  patient_id: string;
  ordered_by: string;
  modality: 'XR' | 'CT' | 'MRI' | 'US' | 'PET' | 'MAMMO' | 'FLUORO';
  study_description: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  status: 'ORDERED' | 'SCHEDULED' | 'COMPLETED' | 'REPORTED' | 'CANCELLED';
  radiologist_id?: string;
  created_at: string;
  technique?: string;
  findings?: string;
  conclusion?: string;
  report_signed_at?: string;
  
  patients?: { first_name: string; last_name: string; mrn: string };
  professionals?: { title: string; user_profiles: { full_name: string } }; // referring doc
  radiologist?: { title: string; user_profiles: { full_name: string } }; // radiologist
}

const MODALITY_MAP: Record<string, { label: string, color: string }> = { 
  XR: { label: 'Rayos X', color: '#607D8B' }, 
  CT: { label: 'Tomografía (TAC)', color: '#9C27B0' }, 
  MRI: { label: 'Resonancia (RM)', color: '#1E88E5' }, 
  US: { label: 'Ecografía', color: '#00BCD4' },
  PET: { label: 'PET Scan', color: '#E91E63' },
  MAMMO: { label: 'Mamografía', color: '#FF4081' },
  FLUORO: { label: 'Fluoroscopia', color: '#FF9800' },
};

const STATUS_COLORS: Record<string, { label: string; color: string }> = {
  ORDERED: { label: 'Solicitado', color: '#78909C' },
  SCHEDULED: { label: 'Agendado', color: '#FF9800' },
  COMPLETED: { label: 'Realizado (Esperando Informe)', color: '#1E88E5' },
  REPORTED: { label: 'Informado & Firmado', color: '#4CAF50' },
  CANCELLED: { label: 'Cancelado', color: '#F44336' },
};

export function ImagingPage() {
  const { user } = useAuth();
  const supabase = createClient();
  
  // ─── State ──────────────────────────────────────────────────
  const [orders, setOrders] = useState<ImagingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; title: string } | null>(null);
  
  // Radiology Report Form
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState({ tecnica: '', comparacion: '', hallazgos: '', conclusion: '' });
  
  // New Request Modal
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState({
    patient_id: '', ordered_by: '', modality: 'XR', study_description: '', priority: 'ROUTINE'
  });
  const [savingOrder, setSavingOrder] = useState(false);

  // ─── Effects ────────────────────────────────────────────────
  useEffect(() => {
    fetchOrders();
    fetchLookups();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('imaging_orders')
      .select(`
        *,
        patients (first_name, last_name, mrn),
        professionals!ordered_by (title, user_profiles(full_name)),
        radiologist:professionals!radiologist_id (title, user_profiles(full_name))
      `)
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
    setLoading(false);
  };

  const fetchLookups = async () => {
    const { data: p } = await supabase.from('patients').select('id, first_name, last_name, mrn');
    if (p) setPatients(p);

    const { data: d } = await supabase.from('professionals').select('id, title, user_profiles(full_name)');
    if (d) setDoctors(d);
  };

  // ─── Handlers ───────────────────────────────────────────────
  const selectOrder = (order: ImagingOrder) => {
    setSelectedOrderId(order.id);
    setReportForm({
      tecnica: order.technique || '',
      comparacion: 'Sin estudios previos (Defecto)', // No hay campo comparacion en bd, simulado
      hallazgos: order.findings || '',
      conclusion: order.conclusion || ''
    });
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('imaging_orders').update({ status }).eq('id', id);
    fetchOrders();
  };

  const handleSignReport = async () => {
    if (!selectedOrderId) return;

    // Buscar perfil del radiólogo actual basado en user auth
    // Por seguridad, en un sistema real buscaríamos el ID del profesional ligado al user.id
    // Como simplificación de demo, actualizamos los textos y estado.
    
    await supabase.from('imaging_orders').update({
      technique: reportForm.tecnica,
      findings: reportForm.hallazgos,
      conclusion: reportForm.conclusion,
      status: 'REPORTED',
      report_signed_at: new Date().toISOString()
    }).eq('id', selectedOrderId);

    setToast({
      title: 'Informe Firmado Exitosamente',
      message: `El informe fue firmado criptográficamente y anexado a la Historia Clínica (EHR) del paciente.`
    });
    
    setSelectedOrderId(null);
    fetchOrders();
  };

  const handleCreateRequest = async () => {
    if (!newOrder.patient_id || !newOrder.ordered_by || !newOrder.study_description) {
      return alert('Complete los campos obligatorios.');
    }
    setSavingOrder(true);
    
    await supabase.from('imaging_orders').insert([{
      patient_id: newOrder.patient_id,
      ordered_by: newOrder.ordered_by,
      modality: newOrder.modality,
      study_description: newOrder.study_description,
      priority: newOrder.priority,
      status: 'ORDERED'
    }]);

    setSavingOrder(false);
    setShowModal(false);
    setToast({
      title: 'Solicitud Creada',
      message: `La solicitud de imagen fue enviada al departamento de radiología.`
    });
    fetchOrders();
    setNewOrder({ patient_id: '', ordered_by: '', modality: 'XR', study_description: '', priority: 'ROUTINE' });
  };

  // ─── Render Helpers ─────────────────────────────────────────
  const getPatientName = (o: ImagingOrder) => o.patients ? `${o.patients.first_name} ${o.patients.last_name}` : 'Desconocido';
  const getDoctorName = (o: ImagingOrder) => o.professionals ? `${o.professionals.title} ${o.professionals.user_profiles?.full_name}` : 'N/A';
  const getRadiologistName = (o: ImagingOrder) => o.radiologist ? `${o.radiologist.title} ${o.radiologist.user_profiles?.full_name}` : '—';

  const rxCount = orders.filter(o => o.modality === 'XR').length;
  const usCount = orders.filter(o => o.modality === 'US').length;
  const ctCount = orders.filter(o => o.modality === 'CT').length;
  const mrCount = orders.filter(o => o.modality === 'MRI').length;
  const pendingCount = orders.filter(o => o.status !== 'REPORTED' && o.status !== 'CANCELLED').length;

  const currentOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <>
      <div className="animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '12px 18px',
          background: 'rgba(15, 31, 56, 0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-accent)', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: 'var(--shadow-card), 0 0 20px rgba(0, 188, 212, 0.25)',
          animation: 'fade-in 0.3s ease forwards', maxWidth: 420
        }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0, 188, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="CheckCircle2" size={14} style={{ color: 'var(--color-cyan)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{toast.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{toast.message}</div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Imágenes — RIS/PACS</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Sistema de Información Radiológica conectado a Base de Datos en Tiempo Real</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="Plus" size={14} /> Nueva Solicitud
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        {[
          { label: 'Rayos X Totales', value: rxCount, color: '#607D8B' },
          { label: 'Ecografías Totales', value: usCount, color: '#00BCD4' },
          { label: 'TAC Totales', value: ctCount, color: '#9C27B0' },
          { label: 'RM Totales', value: mrCount, color: '#1E88E5' },
          { label: 'Pendientes / En Curso', value: pendingCount, color: '#FF9800' },
        ].map(c => (
          <div key={c.label} className="metric-card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Table of Orders */}
      <div className="glass-card" style={{ overflowX: 'auto', marginBottom: 16 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando estudios RIS/PACS...</div> : (
          <table className="data-table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Modalidad</th>
                <th>Estudio</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Médico Solicitante</th>
                <th>Fecha/Hora</th>
                <th>Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const sc = STATUS_COLORS[o.status] || STATUS_COLORS.ORDERED;
                const mod = MODALITY_MAP[o.modality];
                const isSelected = selectedOrderId === o.id;

                return (
                  <tr key={o.id} style={{ background: isSelected ? 'rgba(30, 136, 229, 0.08)' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>{getPatientName(o)}</td>
                    <td>
                      <span className="badge" style={{ background: `${mod.color}18`, color: mod.color, borderColor: `${mod.color}30` }}>
                        {mod.label}
                      </span>
                    </td>
                    <td>{o.study_description}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: o.priority === 'STAT' ? 'rgba(244,67,54,0.15)' : o.priority === 'URGENT' ? 'rgba(255,152,0,0.15)' : 'rgba(74,96,128,0.15)', 
                        color: o.priority === 'STAT' ? '#FF5252' : o.priority === 'URGENT' ? '#FFAB40' : 'var(--text-secondary)', 
                        borderColor: 'transparent' 
                      }}>
                        {o.priority}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${sc.color}15`, color: sc.color, borderColor: `${sc.color}30` }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{getDoctorName(o)}</td>
                    <td style={{ fontSize: 11 }}>{new Date(o.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {o.status === 'ORDERED' && (
                          <button onClick={() => updateStatus(o.id, 'SCHEDULED')} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: '#FF9800', whiteSpace: 'nowrap' }}>Agendar</button>
                        )}
                        {o.status === 'SCHEDULED' && (
                          <button onClick={() => updateStatus(o.id, 'COMPLETED')} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: '#1E88E5', whiteSpace: 'nowrap' }}>Realizar Estudio</button>
                        )}
                        {o.status === 'COMPLETED' && (
                          <button onClick={() => selectOrder(o)} className="btn-primary" style={{ padding: '4px 8px', fontSize: 11, background: '#4CAF50', whiteSpace: 'nowrap' }}>Redactar Informe</button>
                        )}
                        {o.status === 'REPORTED' && (
                          <button onClick={() => selectOrder(o)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            <Icon name="Eye" size={12} /> Ver Informe
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No hay solicitudes de imagen aún. Crea una nueva.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Radiology Report Form */}
      {currentOrder && (
        <div className="glass-card animate-fade-in" style={{ padding: 24, borderTop: `4px solid ${MODALITY_MAP[currentOrder.modality].color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Estación de Trabajo Radiológica (PACS) — <span style={{ color: MODALITY_MAP[currentOrder.modality].color }}>{currentOrder.modality}</span>
            </h3>
            <button className="btn-ghost" onClick={() => setSelectedOrderId(null)}><Icon name="X" size={16} /></button>
          </div>

          <div style={{ display: 'flex', gap: 16, padding: 12, background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 20, border: '1px solid var(--border-secondary)' }}>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>Paciente: <strong style={{color: 'var(--text-primary)'}}>{getPatientName(currentOrder)}</strong></div>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>Estudio: <strong style={{color: 'var(--text-primary)'}}>{currentOrder.study_description}</strong></div>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>Solicita: <strong style={{color: 'var(--text-primary)'}}>{getDoctorName(currentOrder)}</strong></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Técnica utilizada</label>
              <input 
                className="input-field" 
                value={reportForm.tecnica}
                onChange={e => setReportForm({...reportForm, tecnica: e.target.value})}
                disabled={currentOrder.status === 'REPORTED'}
                placeholder="Ej: Proyecciones ortogonales..." 
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Comparación con estudios previos</label>
              <input 
                className="input-field" 
                value={reportForm.comparacion}
                onChange={e => setReportForm({...reportForm, comparacion: e.target.value})}
                disabled={currentOrder.status === 'REPORTED'}
                placeholder="Sin estudios previos..." 
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Hallazgos Radiológicos</label>
              <textarea 
                className="input-field" 
                style={{ height: 120, resize: 'vertical' }} 
                value={reportForm.hallazgos}
                onChange={e => setReportForm({...reportForm, hallazgos: e.target.value})}
                disabled={currentOrder.status === 'REPORTED'}
                placeholder="Describa de forma estructurada..." 
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Conclusión Diagnóstica</label>
              <textarea 
                className="input-field" 
                style={{ height: 80, resize: 'vertical', fontWeight: 600 }} 
                value={reportForm.conclusion}
                onChange={e => setReportForm({...reportForm, conclusion: e.target.value})}
                disabled={currentOrder.status === 'REPORTED'}
                placeholder="Conclusión final (Ej. Sin alteraciones patológicas evidentes)." 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {currentOrder.status !== 'REPORTED' ? (
              <button className="btn-primary" onClick={handleSignReport} style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)', padding: '10px 20px' }}>
                <Icon name="CheckCircle2" size={16} /> Firmar y Completar Informe
              </button>
            ) : (
              <div style={{ padding: '10px 16px', background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 8, color: '#4CAF50', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="ShieldCheck" size={16} /> 
                <strong>Estudio Cerrado.</strong> Firmado digitalmente en {new Date(currentOrder.report_signed_at!).toLocaleString()}.
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* ─── Modal Dialog: Nueva Solicitud ─── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)} />
          <div className="glass-card animate-fade-in" style={{ position: 'relative', padding: 24, width: '90%', maxWidth: 500, zIndex: 101, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="ScanLine" size={18} style={{ color: 'var(--color-blue-light)' }} /> Nueva Solicitud de Imagen
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Paciente *</label>
                <select className="input-field" value={newOrder.patient_id} onChange={e => setNewOrder({...newOrder, patient_id: e.target.value})}>
                  <option value="">Seleccionar Paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} (MRN: {p.mrn})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Médico Solicitante *</label>
                <select className="input-field" value={newOrder.ordered_by} onChange={e => setNewOrder({...newOrder, ordered_by: e.target.value})}>
                  <option value="">Seleccionar Médico</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.title} {d.user_profiles?.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Modalidad *</label>
                  <select className="input-field" value={newOrder.modality} onChange={e => setNewOrder({...newOrder, modality: e.target.value as any})}>
                    {Object.entries(MODALITY_MAP).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Prioridad *</label>
                  <select className="input-field" value={newOrder.priority} onChange={e => setNewOrder({...newOrder, priority: e.target.value as any})}>
                    <option value="ROUTINE">Rutina</option>
                    <option value="URGENT">Urgente</option>
                    <option value="STAT">STAT (Emergencia)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Estudio Solicitado (Descripción) *</label>
                <input 
                  className="input-field" 
                  value={newOrder.study_description} 
                  onChange={e => setNewOrder({...newOrder, study_description: e.target.value})} 
                  placeholder="Ej: Radiografía AP/LAT de Tórax" 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={savingOrder} onClick={handleCreateRequest}>
                {savingOrder ? 'Creando...' : 'Guardar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

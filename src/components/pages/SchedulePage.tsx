'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase';

interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string;
  specialty_id: string | null;
  room: string | null;
  starts_at: string;
  ends_at: string;
  visit_type: string;
  status: string;
  reason: string | null;
  patients?: { first_name: string; last_name: string; mrn: string } | null;
  professionals?: { title: string; user_profiles: { full_name: string } } | null;
  specialties?: { name: string; color: string } | null;
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#1E88E5', CONFIRMED: '#4CAF50', IN_PROGRESS: '#FF9800',
  COMPLETED: '#607D8B', CANCELLED: '#F44336', NO_SHOW: '#9C27B0',
};

function getWeekStart(date: Date, offset: number) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function SchedulePage() {
  const supabase = createClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'week' | 'day'>('week');
  const [selectedDayIdx, setSelectedDayIdx] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  // Lookups
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', professional_id: '', specialty_id: '', room: '',
    starts_at: '', duration: 60, visit_type: 'CONSULTATION', reason: ''
  });

  const weekStart = getWeekStart(new Date(), weekOffset);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const from = new Date(weekStart);
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 7);

    const { data } = await supabase
      .from('appointments')
      .select(`*, patients(first_name,last_name,mrn), professionals(title,user_profiles!professionals_user_id_fkey(full_name)), specialties(name,color)`)
      .gte('starts_at', from.toISOString())
      .lt('starts_at', to.toISOString())
      .order('starts_at');

    setAppointments((data || []) as Appointment[]);
    setLoading(false);
  }, [weekOffset]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    supabase.from('patients').select('id,first_name,last_name,mrn').then(({ data }) => setPatients(data || []));
    supabase.from('professionals').select('id,title,user_profiles!professionals_user_id_fkey(full_name)').then(({ data }) => setDoctors(data || []));
    supabase.from('specialties').select('id,name').then(({ data }) => setSpecialties(data || []));
  }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  const getDayDates = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getAptsForDayHour = (dayIdx: number, hour: number) => {
    const dates = getDayDates();
    const date = dates[dayIdx];
    return appointments.filter(a => {
      const s = new Date(a.starts_at);
      return s.getFullYear() === date.getFullYear() &&
        s.getMonth() === date.getMonth() &&
        s.getDate() === date.getDate() &&
        s.getHours() === hour;
    });
  };

  const getDurationSlots = (apt: Appointment) => {
    const start = new Date(apt.starts_at);
    const end = new Date(apt.ends_at);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000));
  };

  const handleCancelApt = async (id: string) => {
    await supabase.from('appointments').update({ status: 'CANCELLED' }).eq('id', id);
    setSelectedApt(null);
    setToast({ title: 'Cita Cancelada', message: 'La cita ha sido cancelada y liberada del sistema.' });
    fetchAppointments();
  };

  const handleCreate = async () => {
    if (!form.patient_id || !form.professional_id || !form.starts_at) return;
    setSaving(true);
    const start = new Date(form.starts_at);
    const end = new Date(start.getTime() + form.duration * 60000);
    await supabase.from('appointments').insert({
      patient_id: form.patient_id,
      professional_id: form.professional_id,
      specialty_id: form.specialty_id || null,
      room: form.room || null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      visit_type: form.visit_type,
      reason: form.reason || null,
      status: 'SCHEDULED',
    });
    setSaving(false);
    setShowModal(false);
    setForm({ patient_id: '', professional_id: '', specialty_id: '', room: '', starts_at: '', duration: 60, visit_type: 'CONSULTATION', reason: '' });
    setToast({ title: 'Cita Programada', message: 'La nueva cita ha sido registrada en el sistema.' });
    fetchAppointments();
  };

  const getWeekLabel = () => {
    const dates = getDayDates();
    return `Semana ${dates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} — ${dates[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  };

  const dayDates = getDayDates();
  const today = new Date();
  const visibleDays = view === 'week' ? 7 : 1;
  const visibleDayIndices = view === 'week' ? Array.from({ length: 7 }, (_, i) => i) : [selectedDayIdx];

  return (
    <>
      <div className="animate-fade-in">
      {toast && (
        <div style={{ position:'fixed',top:24,right:24,zIndex:9999,padding:'12px 18px',background:'rgba(15,31,56,0.95)',backdropFilter:'blur(12px)',border:'1px solid var(--border-accent)',borderRadius:8,display:'flex',alignItems:'center',gap:12,boxShadow:'var(--shadow-card)',maxWidth:420 }}>
          <Icon name="CheckCircle2" size={14} style={{ color: 'var(--color-cyan)' }} />
          <div><div style={{ fontSize:13,fontWeight:700,color:'var(--text-primary)' }}>{toast.title}</div><div style={{ fontSize:11,color:'var(--text-secondary)' }}>{toast.message}</div></div>
          <button onClick={() => setToast(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',marginLeft:8 }}><Icon name="X" size={14} /></button>
        </div>
      )}

      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em' }}>Agenda &amp; Turnos</h1>
          <p style={{ fontSize:13,color:'var(--text-muted)',marginTop:4 }}>{getWeekLabel()} · Zona horaria: GMT-4</p>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <div className="tab-bar">
            <button className={`tab-item ${view==='week'?'active':''}`} onClick={() => setView('week')} style={{ background:'transparent',border:'none',cursor:'pointer' }}>Semana</button>
            <button className={`tab-item ${view==='day'?'active':''}`} onClick={() => setView('day')} style={{ background:'transparent',border:'none',cursor:'pointer' }}>Día</button>
          </div>
          <button className="btn-ghost" onClick={() => { if(view==='week'){setWeekOffset(p=>p-1)}else{setSelectedDayIdx(p=>p>0?p-1:6)} }}><Icon name="ChevronLeft" size={14}/></button>
          <button className="btn-ghost" onClick={() => { setWeekOffset(0); setSelectedDayIdx(today.getDay()===0?6:today.getDay()-1); }} style={{ padding:'8px 14px',fontSize:12,fontWeight:600,color:'var(--color-blue-light)' }}>Hoy</button>
          <button className="btn-ghost" onClick={() => { if(view==='week'){setWeekOffset(p=>p+1)}else{setSelectedDayIdx(p=>p<6?p+1:0)} }}><Icon name="ChevronRight" size={14}/></button>
          <button className="btn-primary" onClick={() => setShowModal(true)}><Icon name="Plus" size={14}/> Nueva Cita</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20 }}>
        {[
          { label:'Esta semana',value:appointments.length,color:'#1E88E5' },
          { label:'Confirmadas',value:appointments.filter(a=>a.status==='CONFIRMED').length,color:'#4CAF50' },
          { label:'En Progreso',value:appointments.filter(a=>a.status==='IN_PROGRESS').length,color:'#FF9800' },
          { label:'Canceladas',value:appointments.filter(a=>a.status==='CANCELLED').length,color:'#F44336' },
        ].map(s => (
          <div key={s.label} className="metric-card" style={{ padding:'14px 16px',textAlign:'center' }}>
            <div style={{ fontSize:26,fontWeight:900,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ overflow:'hidden' }}>
        {/* Header row */}
        <div style={{ display:'grid',gridTemplateColumns:`60px repeat(${visibleDays},1fr)`,borderBottom:'1px solid var(--border-secondary)' }}>
          <div style={{ padding:'10px 8px',fontSize:10,color:'var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600 }}>GMT-4</div>
          {visibleDayIndices.map(i => {
            const d = dayDates[i];
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={i} onClick={() => { setSelectedDayIdx(i); setView('day'); }}
                style={{ padding:'10px 8px',textAlign:'center',borderLeft:'1px solid var(--border-secondary)',cursor:'pointer',background:isToday?'rgba(30,136,229,0.06)':'transparent' }}>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)' }}>{DAYS[i]}</div>
                <div style={{ fontSize:18,fontWeight:700,color:isToday?'var(--color-blue-light)':'var(--text-primary)' }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div style={{ overflowY:'auto',maxHeight:'55vh' }}>
          {loading ? (
            <div style={{ padding:40,textAlign:'center',color:'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin" /></div>
          ) : (
            HOURS.map(hour => (
              <div key={hour} style={{ display:'grid',gridTemplateColumns:`60px repeat(${visibleDays},1fr)`,borderBottom:'1px solid var(--border-secondary)',minHeight:56 }}>
                <div style={{ padding:'8px',fontSize:10,color:'var(--text-muted)',fontFamily:'JetBrains Mono,monospace',textAlign:'center',borderRight:'1px solid var(--border-secondary)',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:6 }}>
                  {String(hour).padStart(2,'0')}:00
                </div>
                {visibleDayIndices.map(dayIdx => {
                  const apts = getAptsForDayHour(dayIdx, hour);
                  return (
                    <div key={dayIdx} style={{ borderLeft:'1px solid var(--border-secondary)',padding:3,minHeight:56 }}>
                      {apts.map(apt => {
                        const color = apt.specialties?.color || STATUS_COLORS[apt.status] || '#1E88E5';
                        const slots = getDurationSlots(apt);
                        const patName = apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Paciente';
                        const docName = apt.professionals ? `${apt.professionals.title} ${apt.professionals.user_profiles?.full_name}` : '';
                        return (
                          <div key={apt.id} onClick={() => setSelectedApt(apt)}
                            style={{ height:`${slots*56-8}px`,background:`${color}18`,border:`1px solid ${color}50`,borderLeft:`3px solid ${color}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',overflow:'hidden',transition:'all 0.15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background=`${color}28`}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background=`${color}18`}>
                            <div style={{ fontSize:11,fontWeight:700,color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{docName}</div>
                            <div style={{ fontSize:10,color:'var(--text-muted)' }}>{patName}</div>
                            {apt.room && <div style={{ fontSize:9,color:'var(--text-muted)' }}>{apt.room}</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rules */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginTop:16 }}>
        {[
          { icon:'Clock',color:'#FF9800',title:'Regla: Horas Máximas',desc:'Máximo 12h consecutivas por turno. Descanso obligatorio de 11h entre turnos.' },
          { icon:'AlertTriangle',color:'#F44336',title:'Anti-Overbooking',desc:'Bloqueo automático de slots cuando el consultorio ya tiene cita confirmada.' },
          { icon:'CalendarDays',color:'#4CAF50',title:'Rotación de Guardias',desc:'Motor de asignación de on-call. Equitativo por especialidad y semana.' },
        ].map(r => (
          <div key={r.title} className="glass-card" style={{ padding:16,display:'flex',gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:`${r.color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <Icon name={r.icon} size={16} style={{ color:r.color }} />
            </div>
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:'var(--text-primary)',marginBottom:4 }}>{r.title}</div>
              <p style={{ fontSize:11,color:'var(--text-muted)',lineHeight:1.5 }}>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Detail Modal */}
      {selectedApt && (
        <div onClick={() => setSelectedApt(null)} style={{ position:'fixed',inset:0,background:'rgba(6,13,26,0.85)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} className="glass-card animate-fade-in"
            style={{ borderTop:`4px solid ${selectedApt.specialties?.color||STATUS_COLORS[selectedApt.status]||'#1E88E5'}`,borderRadius:16,padding:24,width:'100%',maxWidth:420 }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:16,alignItems:'center' }}>
              <h3 style={{ fontSize:15,fontWeight:700,color:'var(--text-primary)' }}>Detalle de Cita Médica</h3>
              <button onClick={() => setSelectedApt(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={18}/></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:2,marginBottom:16 }}>
              {[
                { label:'Paciente', value: selectedApt.patients ? `${selectedApt.patients.first_name} ${selectedApt.patients.last_name}` : '—' },
                { label:'Médico', value: selectedApt.professionals ? `${selectedApt.professionals.title} ${selectedApt.professionals.user_profiles?.full_name}` : '—' },
                { label:'Especialidad', value: selectedApt.specialties?.name || '—' },
                { label:'Consultorio', value: selectedApt.room || '—' },
                { label:'Inicio', value: new Date(selectedApt.starts_at).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}) },
                { label:'Fin', value: new Date(selectedApt.ends_at).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}) },
                { label:'Motivo', value: selectedApt.reason || '—' },
                { label:'Estado', value: selectedApt.status },
              ].map(r => (
                <div key={r.label} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border-secondary)' }}>
                  <span style={{ fontSize:12,color:'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontSize:12,fontWeight:600,color:'var(--text-primary)' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex',gap:8 }}>
              {selectedApt.status !== 'CANCELLED' && (
                <button className="btn-ghost" style={{ borderColor:'#F44336',color:'#F44336' }} onClick={() => handleCancelApt(selectedApt.id)}>
                  <Icon name="Trash2" size={13}/> Cancelar Cita
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nueva Cita Modal */}
      {showModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16 }}>
          <div className="glass-card animate-fade-in" style={{ padding:24,width:'100%',maxWidth:480 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
              <h3 style={{ fontSize:16,fontWeight:800,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8 }}>
                <Icon name="CalendarDays" size={18} style={{ color:'var(--color-blue-light)' }}/> Programar Nueva Cita
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Paciente *</label>
                <select className="input-field" value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})}>
                  <option value="">Seleccionar paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Médico *</label>
                <select className="input-field" value={form.professional_id} onChange={e => setForm({...form,professional_id:e.target.value})}>
                  <option value="">Seleccionar médico</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.title} {d.user_profiles?.full_name}</option>)}
                </select>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Especialidad</label>
                  <select className="input-field" value={form.specialty_id} onChange={e => setForm({...form,specialty_id:e.target.value})}>
                    <option value="">Sin especificar</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Consultorio</label>
                  <input className="input-field" value={form.room} onChange={e => setForm({...form,room:e.target.value})} placeholder="Ej: CN-301" />
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Fecha y Hora *</label>
                  <input type="datetime-local" className="input-field" value={form.starts_at} onChange={e => setForm({...form,starts_at:e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Duración</label>
                  <select className="input-field" value={form.duration} onChange={e => setForm({...form,duration:parseInt(e.target.value)})}>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1.5 horas</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Tipo de visita</label>
                <select className="input-field" value={form.visit_type} onChange={e => setForm({...form,visit_type:e.target.value})}>
                  <option value="CONSULTATION">Consulta</option>
                  <option value="FOLLOW_UP">Seguimiento</option>
                  <option value="PROCEDURE">Procedimiento</option>
                  <option value="EMERGENCY">Emergencia</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Motivo de consulta</label>
                <input className="input-field" value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} placeholder="Ej: Control de hipertensión arterial" />
              </div>
            </div>
            <div style={{ display:'flex',gap:8,marginTop:20,justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={handleCreate}>
                {saving ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Plus" size={14}/>}
                {saving ? 'Guardando...' : 'Programar Turno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

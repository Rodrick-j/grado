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

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'Ausente',
};

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const formatShortDateES = (date: Date) => {
  const day = date.getDate();
  const month = MONTHS_ES[date.getMonth()];
  return `${day} ${month}`;
};

const formatFullDateES = (date: Date) => {
  const day = date.getDate();
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatLongDateES = (date: Date) => {
  const weekday = WEEKDAYS_ES[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_LONG_ES[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday}, ${day} de ${month} de ${year}`;
};

const formatTimeES = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterDoctorId, setFilterDoctorId] = useState<string>('');
  const [filterSpecialtyId, setFilterSpecialtyId] = useState<string>('');

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
    supabase.from('professionals').select('id,title,shift_preference,specialty_id,user_profiles!professionals_user_id_fkey(full_name)').then(({ data }) => setDoctors(data || []));
    supabase.from('specialties').select('id,name').then(({ data }) => setSpecialties(data || []));
  }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  // Live timer for red line
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

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
      const matchesTime = s.getFullYear() === date.getFullYear() &&
        s.getMonth() === date.getMonth() &&
        s.getDate() === date.getDate() &&
        s.getHours() === hour;
      if (!matchesTime) return false;
      if (filterDoctorId && a.professional_id !== filterDoctorId) return false;
      return true;
    });
  };

  const isHourBlocked = (hour: number) => {
    if (!filterDoctorId) return false;
    const doc = doctors.find(d => d.id === filterDoctorId);
    if (!doc || !doc.shift_preference) return false;
    
    const shift = doc.shift_preference;
    if (shift === 'MORNING' && hour >= 14) return true;
    if (shift === 'ADMIN_8H' && hour >= 16) return true;
    if (shift === 'DAY_12H' && (hour < 8 || hour >= 20)) return true;
    if (shift === 'NIGHT_12H' && (hour >= 8 && hour < 20)) return true;
    return false;
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
    
    // Validate shift
    const doc = doctors.find(d => d.id === form.professional_id);
    const h = new Date(form.starts_at).getHours();
    if (doc?.shift_preference) {
       const shift = doc.shift_preference;
       if ((shift === 'MORNING' && h >= 14) || 
           (shift === 'ADMIN_8H' && h >= 16) || 
           (shift === 'DAY_12H' && (h < 8 || h >= 20)) ||
           (shift === 'NIGHT_12H' && (h >= 8 && h < 20))) {
          if (!window.confirm(`⚠️ ADVERTENCIA: El horario de la cita (${h}:00) está fuera del turno laboral de la plantilla (${shift}) de este especialista. ¿Desea programar la cita de todos modos?`)) {
            return;
          }
       }
    }

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
    return `Semana ${formatShortDateES(dates[0])} — ${formatFullDateES(dates[6])}`;
  };

  const dayDates = getDayDates();
  const today = new Date();
  const visibleDays = view === 'week' ? 7 : 1;
  const visibleDayIndices = view === 'week' ? Array.from({ length: 7 }, (_, i) => i) : [selectedDayIdx];

  // Calculate current time line position
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const isTimeInGrid = currentHour >= 7 && currentHour < 21;
  const timeLineY = isTimeInGrid ? ((currentHour - 7) * 40) + Math.round(currentMinute * 40/60) : -1; // 40px per hour
  
  // Find index of today in visible days
  const todayIndexInVisible = visibleDayIndices.findIndex(idx => dayDates[idx].toDateString() === today.toDateString());

  return (
    <>
      <div className="animate-fade-in">
        
      {/* Premium Toast */}
      {toast && (
        <div style={{ position:'fixed',top:24,right:24,zIndex:9999,padding:'16px 20px',background:'var(--bg-surface)',backdropFilter:'blur(20px)',border:'1px solid rgba(0, 188, 212, 0.3)',borderRadius:16,display:'flex',alignItems:'center',gap:16,boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)',maxWidth:420, transition:'all 0.3s ease' }} className="animate-slide-up">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0, 188, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="CheckCircle2" size={20} style={{ color: '#00BCD4' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize:14,fontWeight:700,color:'var(--text-primary)', marginBottom: 2 }}>{toast.title}</div>
            <div style={{ fontSize:12,color:'var(--text-muted)' }}>{toast.message}</div>
          </div>
          <button onClick={() => setToast(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={16} /></button>
        </div>
      )}

      {/* Header Compact */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #FF9800, #F57C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(255,152,0,0.2)' }}>
            <Icon name="CalendarDays" size={18} style={{ color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize:20,fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em', lineHeight: 1.1 }}>Agenda &amp; Turnos</h1>
            <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:2, fontWeight: 500 }}>{getWeekLabel()} · GMT-4</p>
          </div>
        </div>
        
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          
          {/* Specialty Filter */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="Activity" size={14} style={{ color: filterSpecialtyId ? 'var(--color-blue-light)' : 'var(--text-muted)' }} />
            <select 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer', maxWidth: 160 }}
              value={filterSpecialtyId}
              onChange={e => { setFilterSpecialtyId(e.target.value); setFilterDoctorId(''); }}
            >
              <option value="" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Todas Especialidades</option>
              {specialties.map(s => <option key={s.id} value={s.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>{s.name}</option>)}
            </select>
          </div>

          {/* Doctor Filter */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="Stethoscope" size={14} style={{ color: filterDoctorId ? 'var(--color-blue-light)' : 'var(--text-muted)' }} />
            <select 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer', maxWidth: 180 }}
              value={filterDoctorId}
              onChange={e => setFilterDoctorId(e.target.value)}
            >
              <option value="" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Agenda General (Todos)</option>
              {doctors.filter(d => !filterSpecialtyId || d.specialty_id === filterSpecialtyId).map(d => (
                <option key={d.id} value={d.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                  {d.title} {d.user_profiles?.full_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, padding: 3, display: 'flex' }}>
            <button 
              onClick={() => setView('week')} 
              style={{ background: view === 'week' ? 'var(--bg-primary)' : 'transparent', border:'none', borderRadius: 7, padding: '5px 12px', color: view === 'week' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: view === 'week' ? 'var(--shadow-sm)' : 'none' }}>
              Semana
            </button>
            <button 
              onClick={() => setView('day')} 
              style={{ background: view === 'day' ? 'var(--bg-primary)' : 'transparent', border:'none', borderRadius: 7, padding: '5px 12px', color: view === 'day' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: view === 'day' ? 'var(--shadow-sm)' : 'none' }}>
              Día
            </button>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, padding: 3 }}>
            <button className="btn-ghost" style={{ padding: '5px 8px', borderRadius: 7 }} onClick={() => { if(view==='week'){setWeekOffset(p=>p-1)}else{setSelectedDayIdx(p=>p>0?p-1:6)} }}><Icon name="ChevronLeft" size={14}/></button>
            <button className="btn-ghost" style={{ padding: '5px 12px', borderRadius: 7, fontSize:12,fontWeight:700,color:'var(--text-primary)' }} onClick={() => { setWeekOffset(0); setSelectedDayIdx(today.getDay()===0?6:today.getDay()-1); }}>Hoy</button>
            <button className="btn-ghost" style={{ padding: '5px 8px', borderRadius: 7 }} onClick={() => { if(view==='week'){setWeekOffset(p=>p+1)}else{setSelectedDayIdx(p=>p<6?p+1:0)} }}><Icon name="ChevronRight" size={14}/></button>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #1E88E5, #0D47A1)', border: 'none', borderRadius: 10, padding: '7px 14px', color: 'white', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 6px 14px -6px rgba(30,136,229,0.8)', transition: 'all 0.2s', outline: 'none' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Icon name="Plus" size={14}/> Nueva Cita
          </button>
        </div>
      </div>

      {/* Advanced Stats / KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14 }}>
        {[
          { label:'Semanales',value:appointments.length,color:'#1E88E5', icon: 'CalendarDays' },
          { label:'Confirmadas',value:appointments.filter(a=>a.status==='CONFIRMED').length,color:'#4CAF50', icon: 'CheckCircle2' },
          { label:'En Progreso',value:appointments.filter(a=>a.status==='IN_PROGRESS').length,color:'#FF9800', icon: 'Clock' },
          { label:'Canceladas',value:appointments.filter(a=>a.status==='CANCELLED').length,color:'#F44336', icon: 'XCircle' },
        ].map(s => (
          <div key={s.label} style={{ padding:'12px 14px', background: 'var(--bg-surface)', border: `1px solid ${s.color}25`, borderRadius: 12, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${s.color}15`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={s.icon as any} size={16} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize:20,fontWeight:800,color:'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize:11,color:'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Calendar Grid */}
      <div style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-secondary)', borderRadius: 16, overflow:'hidden', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Sticky Header Row */}
        <div style={{ display:'grid',gridTemplateColumns:`54px repeat(${visibleDays},1fr)`, borderBottom:'1px solid var(--border-secondary)', background: 'var(--bg-surface)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ padding:'8px 4px',fontSize:9,color:'var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>GMT-4</div>
          {visibleDayIndices.map(i => {
            const d = dayDates[i];
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={i} onClick={() => { setSelectedDayIdx(i); setView('day'); }}
                style={{ padding:'6px 4px',textAlign:'center',borderLeft:'1px solid var(--border-secondary)',cursor:'pointer',background:isToday?'rgba(30,136,229,0.08)':'transparent', transition: 'background 0.2s' }}
                onMouseEnter={e => { if(!isToday) e.currentTarget.style.background='var(--bg-primary)' }}
                onMouseLeave={e => { if(!isToday) e.currentTarget.style.background='transparent' }}>
                <div style={{ fontSize:10,fontWeight:600,color:isToday?'var(--color-blue-light)':'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAYS[i]}</div>
                <div style={{ fontSize:16,fontWeight:800,color:isToday?'var(--color-blue-light)':'var(--text-primary)', marginTop: 1 }}>{d.getDate()}</div>
                {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-blue-light)', margin: '2px auto 0 auto', boxShadow: '0 0 8px var(--color-blue-light)' }} />}
              </div>
            );
          })}
        </div>

        {/* Scrollable Time Grid */}
        <div style={{ overflowY:'auto', height:'calc(100vh - 240px)', position: 'relative' }}>
          
          {/* Live Time Indicator (Red Line) */}
          {!loading && isTimeInGrid && todayIndexInVisible !== -1 && (
            <div style={{ position: 'absolute', top: timeLineY, left: 54, right: 0, height: 2, background: '#FF3B30', zIndex: 15, pointerEvents: 'none', opacity: 0.8 }}>
              {view === 'week' ? (
                // In week view, limit line to today's column
                <div style={{ position: 'absolute', left: `calc((100% / 7) * ${todayIndexInVisible})`, width: `calc(100% / 7)`, height: 2, background: '#FF3B30', boxShadow: '0 0 8px rgba(255,59,48,0.5)' }}>
                  <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#FF3B30', boxShadow: '0 0 10px rgba(255,59,48,0.8)' }} className="animate-pulse" />
                </div>
              ) : (
                // In day view (only showing today), span full width
                <div style={{ position: 'absolute', left: 0, width: '100%', height: 2, background: '#FF3B30', boxShadow: '0 0 8px rgba(255,59,48,0.5)' }}>
                  <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#FF3B30', boxShadow: '0 0 10px rgba(255,59,48,0.8)' }} className="animate-pulse" />
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Icon name="Loader2" size={32} className="animate-spin" style={{ color: '#1E88E5', marginBottom: 16 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>Sincronizando agenda...</div>
            </div>
          ) : (
            HOURS.map(hour => (
              <div key={hour} style={{ display:'grid',gridTemplateColumns:`54px repeat(${visibleDays},1fr)`, borderBottom:'1px dashed var(--border-secondary)', minHeight:40 }}>
                {/* Time Label */}
                <div style={{ padding:'4px',fontSize:10,color:'var(--text-muted)',fontFamily:'JetBrains Mono,monospace',textAlign:'center',borderRight:'1px solid var(--border-secondary)',display:'flex',alignItems:'flex-start',justifyContent:'center' }}>
                  {String(hour).padStart(2,'0')}:00
                </div>
                
                {/* Columns */}
                {visibleDayIndices.map((dayIdx, colIndex) => {
                  const apts = getAptsForDayHour(dayIdx, hour);
                  const isToday = dayDates[dayIdx].toDateString() === today.toDateString();
                  const isBlocked = isHourBlocked(hour);
                  
                  return (
                    <div key={dayIdx} style={{ 
                       borderLeft: colIndex !== 0 ? '1px solid var(--border-secondary)' : 'none', 
                       padding: 2, 
                       minHeight: 40, 
                       position: 'relative', 
                       background: isBlocked ? 'repeating-linear-gradient(45deg, rgba(200,200,200,0.05), rgba(200,200,200,0.05) 10px, transparent 10px, transparent 20px)' : isToday ? 'rgba(30,136,229,0.02)' : 'transparent',
                       opacity: isBlocked ? 0.6 : 1
                    }}>
                      {apts.map(apt => {
                        const color = apt.specialties?.color || STATUS_COLORS[apt.status] || '#1E88E5';
                        const slots = getDurationSlots(apt);
                        const patName = apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Paciente';
                        const docName = apt.professionals ? `${apt.professionals.title} ${apt.professionals.user_profiles?.full_name}` : '';
                        
                        return (
                          <div key={apt.id} onClick={() => setSelectedApt(apt)}
                            style={{ 
                              position: 'absolute',
                              top: 2,
                              left: 2,
                              right: 2,
                              height:`${slots*40 - 4}px`,
                              background:`linear-gradient(135deg, ${color}22, ${color}11)`,
                              backdropFilter:'blur(8px)',
                              border:`1px solid ${color}44`,
                              borderLeft:`4px solid ${color}`,
                              borderRadius:8,
                              padding:'4px 8px',
                              cursor:'pointer',
                              overflow:'hidden',
                              zIndex: 10,
                              transition:'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: `0 4px 12px ${color}10`
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background=`linear-gradient(135deg, ${color}33, ${color}22)`;
                              (e.currentTarget as HTMLElement).style.transform='translateY(-2px) scale(1.01)';
                              (e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${color}25`;
                              (e.currentTarget as HTMLElement).style.zIndex='20';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background=`linear-gradient(135deg, ${color}22, ${color}11)`;
                              (e.currentTarget as HTMLElement).style.transform='translateY(0) scale(1)';
                              (e.currentTarget as HTMLElement).style.boxShadow=`0 4px 12px ${color}10`;
                              (e.currentTarget as HTMLElement).style.zIndex='10';
                            }}>
                            <div style={{ fontSize:10,fontWeight:700,color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis', lineHeight: 1.2 }}>{docName}</div>
                            <div style={{ fontSize:9,color:'var(--text-primary)', whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis', lineHeight: 1.2 }}>{patName}</div>
                            {apt.room && <div style={{ fontSize:10,color:'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Icon name="MapPin" size={10} /> {apt.room}
                            </div>}
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
      </div>

      {/* Premium Detail Modal */}
      {selectedApt && (
        <div onClick={() => setSelectedApt(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="animate-scale-in"
            style={{ 
              background: 'var(--bg-surface)',
              border: `1px solid var(--border-secondary)`,
              borderRadius: 24,
              width:'100%',
              maxWidth:480,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xl)'
            }}>
            
            {/* Modal Header */}
            <div style={{ height: 6, background: selectedApt.specialties?.color||STATUS_COLORS[selectedApt.status]||'#1E88E5' }} />
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize:18,fontWeight:800,color:'var(--text-primary)' }}>Detalles Clínicos del Turno</h3>
                <div style={{ fontSize:13,color:'var(--text-muted)', marginTop: 4 }}>ID: {selectedApt.id.substring(0,8).toUpperCase()}</div>
              </div>
              <button onClick={() => setSelectedApt(null)} style={{ background:'var(--bg-primary)',border:'none',cursor:'pointer',color:'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--border-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background='var(--bg-primary)'}>
                <Icon name="X" size={16}/>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Doctor & Patient Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 16, border: '1px solid var(--border-secondary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Paciente</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedApt.patients ? `${selectedApt.patients.first_name} ${selectedApt.patients.last_name}` : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    MRN: {selectedApt.patients?.mrn || 'N/A'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 16, border: '1px solid var(--border-secondary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Profesional</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedApt.professionals ? `${selectedApt.professionals.title} ${selectedApt.professionals.user_profiles?.full_name}` : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: selectedApt.specialties?.color || 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                    {selectedApt.specialties?.name || 'Medicina General'}
                  </div>
                </div>
              </div>

              {/* Time Details */}
              <div style={{ background: 'rgba(30,136,229,0.05)', padding: 20, borderRadius: 16, border: '1px solid rgba(30,136,229,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(30,136,229,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="Clock" size={16} style={{ color: '#1E88E5' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Horario Asignado</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatLongDateES(new Date(selectedApt.starts_at))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                    {formatTimeES(new Date(selectedApt.starts_at))}
                  </div>
                  <Icon name="ArrowRight" size={14} style={{ color: 'var(--text-muted)' }} />
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                    {formatTimeES(new Date(selectedApt.ends_at))}
                  </div>
                </div>
              </div>

              {/* Meta details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Estado</div>
                  <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${STATUS_COLORS[selectedApt.status]||'#FFF'}15`, color: STATUS_COLORS[selectedApt.status]||'var(--text-primary)', border: `1px solid ${STATUS_COLORS[selectedApt.status]||'#FFF'}30` }}>
                    {STATUS_LABELS[selectedApt.status] || selectedApt.status}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Ubicación</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedApt.room || 'Sin asignar'}</div>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Motivo / Observaciones</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-secondary)', minHeight: 60 }}>
                  {selectedApt.reason || 'Sin observaciones registradas.'}
                </div>
              </div>

            </div>
            
            {/* Modal Actions */}
            <div style={{ padding: '24px 32px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-secondary)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setSelectedApt(null)} style={{ padding: '10px 20px', borderRadius: 12 }}>
                Cerrar
              </button>
              {selectedApt.status !== 'CANCELLED' && (
                <button 
                  onClick={() => handleCancelApt(selectedApt.id)}
                  style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 12, padding: '10px 20px', color: '#F44336', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,67,54,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,67,54,0.1)'}
                >
                  <Icon name="Trash2" size={16}/> Cancelar Cita
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Premium Nueva Cita Modal */}
      {showModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20 }}>
          <div className="animate-scale-in" 
            style={{ 
              background: 'var(--bg-surface)',
              border: `1px solid var(--border-secondary)`,
              borderRadius: 24,
              width:'100%',
              maxWidth:560,
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden'
            }}>
            
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30,136,229,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #1E88E5, #0D47A1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="CalendarPlus" size={20} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 style={{ fontSize:18,fontWeight:800,color:'var(--text-primary)', lineHeight: 1.2 }}>Programar Nueva Cita</h3>
                  <div style={{ fontSize:13,color:'var(--color-blue-light)', marginTop: 2, fontWeight: 500 }}>Agendamiento Centralizado</div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background:'var(--bg-primary)',border:'none',cursor:'pointer',color:'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--border-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background='var(--bg-primary)'}>
                <Icon name="X" size={16}/>
              </button>
            </div>

            <div style={{ padding: '32px', display:'flex',flexDirection:'column',gap:24 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                    <Icon name="User" size={14}/> Paciente *
                  </label>
                  <select 
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                    value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})}
                    onFocus={e => e.currentTarget.style.border = '1px solid var(--color-blue-light)'}
                    onBlur={e => e.currentTarget.style.border = '1px solid var(--border-secondary)'}
                  >
                    <option value="">Seleccionar paciente...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                    <Icon name="Stethoscope" size={14}/> Profesional Médico *
                  </label>
                  <select 
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                    value={form.professional_id} onChange={e => setForm({...form,professional_id:e.target.value})}
                    onFocus={e => e.currentTarget.style.border = '1px solid var(--color-blue-light)'}
                    onBlur={e => e.currentTarget.style.border = '1px solid var(--border-secondary)'}
                  >
                    <option value="">Seleccionar médico...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.title} {d.user_profiles?.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:8 }}>Especialidad</label>
                  <select 
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                    value={form.specialty_id} onChange={e => setForm({...form,specialty_id:e.target.value})}
                    onFocus={e => e.currentTarget.style.border = '1px solid var(--color-blue-light)'}
                    onBlur={e => e.currentTarget.style.border = '1px solid var(--border-secondary)'}
                  >
                    <option value="">Sin especificar</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:8 }}>Consultorio / Box</label>
                  <input 
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                    value={form.room} onChange={e => setForm({...form,room:e.target.value})} placeholder="Ej: CN-301" 
                    onFocus={e => e.currentTarget.style.border = '1px solid var(--color-blue-light)'}
                    onBlur={e => e.currentTarget.style.border = '1px solid var(--border-secondary)'}
                  />
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                    <Icon name="Calendar" size={14}/> Fecha y Hora *
                  </label>
                  <input type="datetime-local" 
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '11px 16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                    value={form.starts_at} onChange={e => setForm({...form,starts_at:e.target.value})} 
                    onFocus={e => e.currentTarget.style.border = '1px solid var(--color-blue-light)'}
                    onBlur={e => e.currentTarget.style.border = '1px solid var(--border-secondary)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                    <Icon name="Clock" size={14}/> Duración
                  </label>
                  <select 
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                    value={form.duration} onChange={e => setForm({...form,duration:parseInt(e.target.value)})}
                    onFocus={e => e.currentTarget.style.border = '1px solid var(--color-blue-light)'}
                    onBlur={e => e.currentTarget.style.border = '1px solid var(--border-secondary)'}
                  >
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1.5 horas</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:8 }}>Motivo Clínico</label>
                <textarea 
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '16px', borderRadius: 12, fontSize: 14, outline: 'none', transition: 'border 0.2s', resize: 'none', minHeight: 80, fontFamily: 'inherit' }}
                  value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} placeholder="Ej: Control post-operatorio, seguimiento de hipertensión..." 
                  onFocus={e => e.currentTarget.style.border = '1px solid var(--color-blue-light)'}
                  onBlur={e => e.currentTarget.style.border = '1px solid var(--border-secondary)'}
                />
              </div>

            </div>

            <div style={{ padding: '24px 32px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-secondary)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', borderRadius: 12, fontSize: 14 }}>
                Cancelar
              </button>
              <button 
                disabled={saving} 
                onClick={handleCreate}
                style={{ background: 'linear-gradient(135deg, #1E88E5, #0D47A1)', border: 'none', borderRadius: 12, padding: '12px 24px', color: 'white', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 10px 20px -10px rgba(30,136,229,0.8)', transition: 'all 0.2s', opacity: saving ? 0.7 : 1 }}
                onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { if(!saving) e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {saving ? <Icon name="Loader2" size={16} className="animate-spin"/> : <Icon name="CheckCircle2" size={16}/>}
                {saving ? 'Registrando...' : 'Confirmar Cita'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

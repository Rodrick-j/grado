'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

// ─── Types ──────────────────────────────────────────────────────────────────

type OrStatus = 'AVAILABLE' | 'IN_USE' | 'CLEANING' | 'MAINTENANCE' | 'CLOSED';
type SurgicalPriority = 'EMERGENCY' | 'URGENT' | 'ELECTIVE';
type SurgicalStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type WaitlistStatus = 'WAITING' | 'SCHEDULED' | 'CANCELLED';

type OperatingRoom = {
  id: string;
  code: string;
  name: string;
  floor: number | null;
  wing: string | null;
  status: OrStatus;
  equipment: string[] | null;
  active: boolean;
};

type SurgicalSchedule = {
  id: string;
  patient_id: string;
  surgeon_id: string;
  anesthesiologist_id: string | null;
  room_id: string;
  specialty_id: string | null;
  procedure_name: string;
  scheduled_start: string;
  estimated_duration_min: number;
  priority: SurgicalPriority;
  status: SurgicalStatus;
  who_sign_in: Record<string, unknown> | null;
  who_time_out: Record<string, unknown> | null;
  who_sign_out: Record<string, unknown> | null;
  anesthesia_type: string | null;
  blood_loss_ml: number | null;
  complications: string | null;
  created_at: string;
  patients?: { first_name: string; last_name: string; mrn: string } | null;
  professionals?: { title: string | null; user_profiles: { full_name: string } | null } | null;
  operating_rooms?: { code: string; name: string } | null;
};

type WaitlistEntry = {
  id: string;
  patient_id: string;
  procedure_name: string;
  referring_doctor_id: string | null;
  specialty_id: string | null;
  priority: SurgicalPriority;
  clinical_notes: string | null;
  listed_at: string;
  status: WaitlistStatus;
  patients?: { first_name: string; last_name: string; mrn: string } | null;
  professionals?: { title: string | null; user_profiles: { full_name: string } | null } | null;
};

type Patient = { id: string; first_name: string; last_name: string; mrn: string };
type Professional = { id: string; title: string | null; user_profiles: { full_name: string } | null };
type Specialty = { id: string; name: string };

// ─── Config ──────────────────────────────────────────────────────────────────

const OR_STATUS_CONFIG: Record<OrStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE:   { label: 'Disponible',   color: '#4CAF50', bg: 'rgba(76,175,80,0.1)' },
  IN_USE:      { label: 'En Uso',       color: '#F44336', bg: 'rgba(244,67,54,0.1)' },
  CLEANING:    { label: 'Limpieza',     color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
  MAINTENANCE: { label: 'Mantenimiento',color: '#607D8B', bg: 'rgba(96,125,139,0.1)' },
  CLOSED:      { label: 'Cerrado',      color: '#37474F', bg: 'rgba(55,71,79,0.15)' },
};

const PRIORITY_CONFIG: Record<SurgicalPriority, { label: string; color: string; bg: string }> = {
  EMERGENCY: { label: 'Emergencia', color: '#F44336', bg: 'rgba(244,67,54,0.15)' },
  URGENT:    { label: 'Urgente',    color: '#FF9800', bg: 'rgba(255,152,0,0.15)' },
  ELECTIVE:  { label: 'Electiva',   color: '#1E88E5', bg: 'rgba(30,136,229,0.15)' },
};

const SCHED_STATUS_CONFIG: Record<SurgicalStatus, { label: string; color: string; bg: string }> = {
  SCHEDULED:   { label: 'Programada',    color: '#1E88E5', bg: 'rgba(30,136,229,0.12)' },
  IN_PROGRESS: { label: 'En Progreso',   color: '#FF9800', bg: 'rgba(255,152,0,0.12)' },
  COMPLETED:   { label: 'Completada',    color: '#4CAF50', bg: 'rgba(76,175,80,0.12)' },
  CANCELLED:   { label: 'Cancelada',     color: '#607D8B', bg: 'rgba(96,125,139,0.12)' },
};

const inp = {
  background: '#081121',
  border: '1px solid rgba(30,136,229,0.25)',
  borderRadius: 8,
  color: 'white',
  padding: '9px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
} as React.CSSProperties;

// ─── WHO Checklist Modal ──────────────────────────────────────────────────────

const WHO_SIGN_IN_ITEMS = [
  'Paciente confirmó identidad, sitio y procedimiento',
  'Consentimiento informado firmado',
  'Sitio quirúrgico marcado',
  'Anestesia completada y equipos verificados',
  'Alergias confirmadas',
  'Vía aérea / riesgo de aspiración evaluado',
  'Riesgo de sangrado > 500 mL valorado',
];
const WHO_TIME_OUT_ITEMS = [
  'Todos los miembros del equipo se presentaron',
  'Confirmación verbal del paciente, procedimiento y sitio',
  'Antibiótico profiláctico administrado',
  'Imágenes diagnósticas disponibles',
  'Alergias críticas confirmadas por el equipo',
  'Equipo de esterilización verificado',
];
const WHO_SIGN_OUT_ITEMS = [
  'Procedimiento registrado en el expediente',
  'Conteo correcto de instrumentos, gasas y agujas',
  'Muestras etiquetadas correctamente',
  'Problemas con equipos reportados',
  'Revisión de aspectos clave para la recuperación',
];

function WhoModal({
  schedule,
  onClose,
  onSave,
}: {
  schedule: SurgicalSchedule;
  onClose: () => void;
  onSave: (id: string, field: 'who_sign_in' | 'who_time_out' | 'who_sign_out', data: Record<string, unknown>) => Promise<void>;
}) {
  const [step, setStep] = useState<'sign_in' | 'time_out' | 'sign_out'>('sign_in');
  const [signIn, setSignIn] = useState<Record<string, boolean>>(
    (schedule.who_sign_in as Record<string, boolean>) || {}
  );
  const [timeOut, setTimeOut] = useState<Record<string, boolean>>(
    (schedule.who_time_out as Record<string, boolean>) || {}
  );
  const [signOut, setSignOut] = useState<Record<string, boolean>>(
    (schedule.who_sign_out as Record<string, boolean>) || {}
  );
  const [saving, setSaving] = useState(false);

  const currentItems = step === 'sign_in' ? WHO_SIGN_IN_ITEMS : step === 'time_out' ? WHO_TIME_OUT_ITEMS : WHO_SIGN_OUT_ITEMS;
  const currentChecks = step === 'sign_in' ? signIn : step === 'time_out' ? timeOut : signOut;
  const setCurrentChecks = step === 'sign_in' ? setSignIn : step === 'time_out' ? setTimeOut : setSignOut;
  const dbField = step === 'sign_in' ? 'who_sign_in' : step === 'time_out' ? 'who_time_out' : 'who_sign_out';

  const handleToggle = (item: string) => {
    setCurrentChecks(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(schedule.id, dbField, { ...currentChecks, saved_at: new Date().toISOString() });
    setSaving(false);
  };

  const allChecked = currentItems.every(i => currentChecks[i]);

  const STEPS = [
    { key: 'sign_in', label: 'Sign In', icon: 'LogIn', color: '#1E88E5' },
    { key: 'time_out', label: 'Time Out', icon: 'Clock', color: '#FF9800' },
    { key: 'sign_out', label: 'Sign Out', icon: 'LogOut', color: '#4CAF50' },
  ] as const;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(156,39,176,0.3)', boxShadow: '0 0 40px rgba(156,39,176,0.15)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="ShieldCheck" size={20} style={{ color: '#9C27B0' }} />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>WHO Safety Checklist</h2>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {schedule.procedure_name} · {schedule.patients?.first_name} {schedule.patients?.last_name}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 10px' }}>
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Step tabs */}
        <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
          {STEPS.map(s => (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, border: `1px solid ${step === s.key ? s.color : 'rgba(255,255,255,0.07)'}`,
                background: step === s.key ? `${s.color}18` : 'rgba(255,255,255,0.03)',
                color: step === s.key ? s.color : 'var(--text-muted)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Icon name={s.icon} size={14} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Checklist */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            {currentItems.map((item, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!currentChecks[item]}
                  onChange={() => handleToggle(item)}
                  style={{ width: 16, height: 16, marginTop: 2, accentColor: '#9C27B0', flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: currentChecks[item] ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: currentChecks[item] ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                  {item}
                </span>
              </label>
            ))}
          </div>

          {allChecked && (
            <div style={{ padding: '10px 14px', background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4CAF50' }}>
              <Icon name="CheckCircle" size={14} />
              Todos los ítems verificados — listo para guardar
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose}>Cerrar</button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ background: 'linear-gradient(135deg, #9C27B0, #7B1FA2)', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
              Guardar {step === 'sign_in' ? 'Sign In' : step === 'time_out' ? 'Time Out' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Surgery Modal ────────────────────────────────────────────────────────

function NewSurgeryModal({
  rooms,
  patients,
  professionals,
  specialties,
  onClose,
  onSaved,
}: {
  rooms: OperatingRoom[];
  patients: Patient[];
  professionals: Professional[];
  specialties: Specialty[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    patient_id: '',
    surgeon_id: '',
    anesthesiologist_id: '',
    room_id: '',
    specialty_id: '',
    procedure_name: '',
    scheduled_start: '',
    estimated_duration_min: 60,
    priority: 'ELECTIVE' as SurgicalPriority,
    anesthesia_type: '',
    status: 'SCHEDULED' as SurgicalStatus,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!form.patient_id || !form.surgeon_id || !form.room_id || !form.procedure_name || !form.scheduled_start) {
      setErr('Completa los campos obligatorios: paciente, cirujano, quirófano, procedimiento y fecha/hora.');
      return;
    }
    setSaving(true);
    setErr('');
    const { error } = await supabase.from('surgical_schedules').insert({
      patient_id: form.patient_id,
      surgeon_id: form.surgeon_id,
      anesthesiologist_id: form.anesthesiologist_id || null,
      room_id: form.room_id,
      specialty_id: form.specialty_id || null,
      procedure_name: form.procedure_name,
      scheduled_start: form.scheduled_start,
      estimated_duration_min: form.estimated_duration_min,
      priority: form.priority,
      anesthesia_type: form.anesthesia_type || null,
      status: form.status,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(30,136,229,0.3)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="Scissors" size={20} style={{ color: '#9C27B0' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Nueva Cirugía</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 10px' }}><Icon name="X" size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Patient */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PACIENTE *</label>
            <select style={inp} value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — MRN: {p.mrn}</option>)}
            </select>
          </div>
          {/* Procedure */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PROCEDIMIENTO *</label>
            <input style={inp} value={form.procedure_name} onChange={e => setForm(f => ({ ...f, procedure_name: e.target.value }))} placeholder="Nombre del procedimiento quirúrgico..." />
          </div>
          {/* Surgeon */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>CIRUJANO *</label>
            <select style={inp} value={form.surgeon_id} onChange={e => setForm(f => ({ ...f, surgeon_id: e.target.value }))}>
              <option value="">Seleccionar cirujano...</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.title || 'Dr.'} {p.user_profiles?.full_name || '—'}</option>)}
            </select>
          </div>
          {/* Anesthesiologist */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>ANESTESIÓLOGO</label>
            <select style={inp} value={form.anesthesiologist_id} onChange={e => setForm(f => ({ ...f, anesthesiologist_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.title || 'Dr.'} {p.user_profiles?.full_name || '—'}</option>)}
            </select>
          </div>
          {/* Room */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>QUIRÓFANO *</label>
            <select style={inp} value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
              <option value="">Seleccionar quirófano...</option>
              {rooms.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
            </select>
          </div>
          {/* Specialty */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>ESPECIALIDAD</label>
            <select style={inp} value={form.specialty_id} onChange={e => setForm(f => ({ ...f, specialty_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {/* Date/Time */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>FECHA Y HORA *</label>
            <input type="datetime-local" style={inp} value={form.scheduled_start} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} />
          </div>
          {/* Duration */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>DURACIÓN ESTIMADA (min)</label>
            <input type="number" style={inp} value={form.estimated_duration_min} onChange={e => setForm(f => ({ ...f, estimated_duration_min: Number(e.target.value) }))} min={15} step={15} />
          </div>
          {/* Priority */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PRIORIDAD</label>
            <select style={inp} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as SurgicalPriority }))}>
              <option value="ELECTIVE">Electiva</option>
              <option value="URGENT">Urgente</option>
              <option value="EMERGENCY">Emergencia</option>
            </select>
          </div>
          {/* Anesthesia type */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>TIPO DE ANESTESIA</label>
            <select style={inp} value={form.anesthesia_type} onChange={e => setForm(f => ({ ...f, anesthesia_type: e.target.value }))}>
              <option value="">Seleccionar...</option>
              <option value="GENERAL">General</option>
              <option value="REGIONAL">Regional</option>
              <option value="LOCAL">Local</option>
              <option value="SEDACION">Sedación</option>
              <option value="ESPINAL">Espinal / Raquídea</option>
              <option value="EPIDURAL">Epidural</option>
            </select>
          </div>

          {err && (
            <div style={{ gridColumn: '1/-1', padding: '10px 14px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, fontSize: 12, color: '#F44336' }}>
              {err}
            </div>
          )}

          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
              Registrar Cirugía
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add to Waitlist Modal ────────────────────────────────────────────────────

function WaitlistModal({
  patients,
  professionals,
  specialties,
  onClose,
  onSaved,
}: {
  patients: Patient[];
  professionals: Professional[];
  specialties: Specialty[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    patient_id: '',
    referring_doctor_id: '',
    specialty_id: '',
    procedure_name: '',
    priority: 'ELECTIVE' as SurgicalPriority,
    clinical_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!form.patient_id || !form.procedure_name) {
      setErr('Paciente y procedimiento son obligatorios.');
      return;
    }
    setSaving(true);
    setErr('');
    const { error } = await supabase.from('surgical_waitlist').insert({
      patient_id: form.patient_id,
      referring_doctor_id: form.referring_doctor_id || null,
      specialty_id: form.specialty_id || null,
      procedure_name: form.procedure_name,
      priority: form.priority,
      clinical_notes: form.clinical_notes || null,
      status: 'WAITING',
      listed_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 560, border: '1px solid rgba(30,136,229,0.3)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="ClipboardList" size={20} style={{ color: '#FF9800' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Añadir a Lista de Espera</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 10px' }}><Icon name="X" size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PACIENTE *</label>
            <select style={inp} value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
              <option value="">Seleccionar paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PROCEDIMIENTO *</label>
            <input style={inp} value={form.procedure_name} onChange={e => setForm(f => ({ ...f, procedure_name: e.target.value }))} placeholder="Nombre del procedimiento quirúrgico..." />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>MÉDICO REFERENTE</label>
            <select style={inp} value={form.referring_doctor_id} onChange={e => setForm(f => ({ ...f, referring_doctor_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.title || 'Dr.'} {p.user_profiles?.full_name || '—'}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>ESPECIALIDAD</label>
            <select style={inp} value={form.specialty_id} onChange={e => setForm(f => ({ ...f, specialty_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PRIORIDAD</label>
            <select style={inp} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as SurgicalPriority }))}>
              <option value="ELECTIVE">Electiva</option>
              <option value="URGENT">Urgente</option>
              <option value="EMERGENCY">Emergencia</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>NOTAS CLÍNICAS</label>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 80 }}
              value={form.clinical_notes}
              onChange={e => setForm(f => ({ ...f, clinical_notes: e.target.value }))}
              placeholder="Observaciones clínicas relevantes..."
            />
          </div>
          {err && (
            <div style={{ gridColumn: '1/-1', padding: '10px 14px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, fontSize: 12, color: '#F44336' }}>{err}</div>
          )}
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg, #FF9800, #F57C00)', opacity: saving ? 0.6 : 1 }}>
              {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
              Añadir a Lista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── OR Status Change Modal ───────────────────────────────────────────────────

function ChangeStatusModal({
  room,
  onClose,
  onSaved,
}: {
  room: OperatingRoom;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [status, setStatus] = useState<OrStatus>(room.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('operating_rooms').update({ status }).eq('id', room.id);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 400, border: '1px solid rgba(30,136,229,0.3)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="RefreshCw" size={18} style={{ color: '#00BCD4' }} />
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Cambiar Estado — {room.code}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 10px' }}><Icon name="X" size={16} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
            {(Object.keys(OR_STATUS_CONFIG) as OrStatus[]).map(s => {
              const cfg = OR_STATUS_CONFIG[s];
              return (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: `1px solid ${status === s ? cfg.color : 'rgba(255,255,255,0.07)'}`, background: status === s ? cfg.bg : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                  <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} style={{ accentColor: cfg.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: status === s ? cfg.color : 'var(--text-secondary)' }}>{cfg.label}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
              Actualizar Estado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: OR Panel ─────────────────────────────────────────────────────────

function ORPanel({ rooms, onRefresh }: { rooms: OperatingRoom[]; onRefresh: () => void }) {
  const [changingRoom, setChangingRoom] = useState<OperatingRoom | null>(null);

  const kpis = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'AVAILABLE').length,
    inUse: rooms.filter(r => r.status === 'IN_USE').length,
    cleaning: rooms.filter(r => r.status === 'CLEANING').length,
  };

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Quirófanos', value: kpis.total,     icon: 'Building2',    color: '#1E88E5' },
          { label: 'Disponibles',       value: kpis.available, icon: 'CheckCircle',  color: '#4CAF50' },
          { label: 'En Uso',            value: kpis.inUse,     icon: 'Activity',     color: '#F44336' },
          { label: 'En Limpieza',       value: kpis.cleaning,  icon: 'Sparkles',     color: '#FF9800' },
        ].map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={k.icon} size={20} style={{ color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* OR Cards Grid */}
      {rooms.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon name="Building2" size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No hay quirófanos registrados</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {rooms.map(room => {
            const cfg = OR_STATUS_CONFIG[room.status] || OR_STATUS_CONFIG.AVAILABLE;
            return (
              <div key={room.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${cfg.color}30`, boxShadow: room.status === 'IN_USE' ? `0 0 20px ${cfg.color}15` : 'none' }}>
                {/* Card header */}
                <div style={{ padding: '14px 18px', background: cfg.bg, borderBottom: `1px solid ${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: cfg.color }}>{room.code}</span>
                      {room.status === 'IN_USE' && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'rgba(244,67,54,0.2)', color: '#F44336', border: '1px solid rgba(244,67,54,0.4)', animation: 'pulse 2s infinite', letterSpacing: '0.08em' }}>
                          ● EN USO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{room.name}</div>
                  </div>
                  <span className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, fontSize: 10, fontWeight: 700 }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                    {room.wing && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Ala:</span> {room.wing}
                      </div>
                    )}
                    {room.floor !== null && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Piso:</span> {room.floor}
                      </div>
                    )}
                  </div>

                  {/* Equipment chips */}
                  {room.equipment && room.equipment.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em' }}>EQUIPAMIENTO</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {room.equipment.map((eq, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(30,136,229,0.1)', color: '#42A5F5', border: '1px solid rgba(30,136,229,0.2)', fontWeight: 500 }}>
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className="btn-ghost"
                    onClick={() => setChangingRoom(room)}
                    style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                  >
                    <Icon name="RefreshCw" size={13} />
                    Cambiar Estado
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {changingRoom && (
        <ChangeStatusModal
          room={changingRoom}
          onClose={() => setChangingRoom(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Tab 2: Surgical Schedule ─────────────────────────────────────────────────

function SurgicalSchedulePanel({
  schedules,
  rooms,
  patients,
  professionals,
  specialties,
  onRefresh,
}: {
  schedules: SurgicalSchedule[];
  rooms: OperatingRoom[];
  patients: Patient[];
  professionals: Professional[];
  specialties: Specialty[];
  onRefresh: () => void;
}) {
  const [newModal, setNewModal] = useState(false);
  const [whoModal, setWhoModal] = useState<SurgicalSchedule | null>(null);
  const supabase = createClient();

  const handleWhoSave = async (id: string, field: 'who_sign_in' | 'who_time_out' | 'who_sign_out', data: Record<string, unknown>) => {
    await supabase.from('surgical_schedules').update({ [field]: data }).eq('id', id);
    onRefresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => setNewModal(true)}>
          <Icon name="Plus" size={15} />
          Nueva Cirugía
        </button>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {schedules.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="Scissors" size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>No hay cirugías programadas</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Procedimiento</th>
                  <th>Cirujano</th>
                  <th>Quirófano</th>
                  <th>Fecha / Hora</th>
                  <th>Duración</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => {
                  const prCfg = PRIORITY_CONFIG[s.priority] || PRIORITY_CONFIG.ELECTIVE;
                  const stCfg = SCHED_STATUS_CONFIG[s.status] || SCHED_STATUS_CONFIG.SCHEDULED;
                  const dt = new Date(s.scheduled_start);
                  const whoComplete = s.who_sign_in && s.who_time_out && s.who_sign_out;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.patients?.first_name} {s.patients?.last_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{s.patients?.mrn}</div>
                      </td>
                      <td style={{ maxWidth: 200, whiteSpace: 'normal', fontSize: 12 }}>{s.procedure_name}</td>
                      <td style={{ fontSize: 12 }}>
                        {s.professionals?.title || 'Dr.'} {s.professionals?.user_profiles?.full_name || '—'}
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(0,188,212,0.1)', color: '#00BCD4', border: '1px solid rgba(0,188,212,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                          {s.operating_rooms?.code || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        <div>{dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{s.estimated_duration_min} min</td>
                      <td>
                        <span className="badge" style={{ background: prCfg.bg, color: prCfg.color, border: `1px solid ${prCfg.color}40`, fontSize: 10 }}>
                          {prCfg.label}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.color}40`,
                          fontSize: 10, animation: s.status === 'IN_PROGRESS' ? 'pulse 2s infinite' : 'none',
                        }}>
                          {stCfg.label}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setWhoModal(s)}
                          className="btn-ghost"
                          style={{ fontSize: 11, padding: '5px 10px', borderColor: whoComplete ? 'rgba(76,175,80,0.4)' : undefined, color: whoComplete ? '#4CAF50' : undefined }}
                        >
                          <Icon name="ShieldCheck" size={13} style={{ color: whoComplete ? '#4CAF50' : undefined }} />
                          WHO
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {newModal && (
        <NewSurgeryModal
          rooms={rooms}
          patients={patients}
          professionals={professionals}
          specialties={specialties}
          onClose={() => setNewModal(false)}
          onSaved={onRefresh}
        />
      )}
      {whoModal && (
        <WhoModal
          schedule={whoModal}
          onClose={() => setWhoModal(null)}
          onSave={handleWhoSave}
        />
      )}
    </div>
  );
}

// ─── Tab 3: Waitlist ──────────────────────────────────────────────────────────

function WaitlistPanel({
  waitlist,
  rooms,
  patients,
  professionals,
  specialties,
  onRefresh,
}: {
  waitlist: WaitlistEntry[];
  rooms: OperatingRoom[];
  patients: Patient[];
  professionals: Professional[];
  specialties: Specialty[];
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const [addModal, setAddModal] = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null);

  const handleSchedule = async (entry: WaitlistEntry) => {
    setScheduling(entry.id);
    // Mark waitlist as scheduled
    await supabase.from('surgical_waitlist').update({ status: 'SCHEDULED' }).eq('id', entry.id);
    setScheduling(null);
    onRefresh();
    alert(`Paciente "${entry.patients?.first_name} ${entry.patients?.last_name}" marcado como programado. Por favor, crea la cirugía en la pestaña de Programación Quirúrgica.`);
  };

  const daysWaiting = (listed: string) => {
    return Math.floor((Date.now() - new Date(listed).getTime()) / 86400000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => setAddModal(true)} style={{ background: 'linear-gradient(135deg, #FF9800, #F57C00)' }}>
          <Icon name="Plus" size={15} />
          Añadir a Lista de Espera
        </button>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {waitlist.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="ClipboardList" size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>La lista de espera está vacía</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Procedimiento</th>
                  <th>Médico Referente</th>
                  <th>Prioridad</th>
                  <th>Fecha Inscripción</th>
                  <th>Días en Espera</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map(entry => {
                  const prCfg = PRIORITY_CONFIG[entry.priority] || PRIORITY_CONFIG.ELECTIVE;
                  const days = daysWaiting(entry.listed_at);
                  const urgentWait = days > 30 && entry.priority === 'ELECTIVE' || days > 7 && entry.priority === 'URGENT' || days > 1 && entry.priority === 'EMERGENCY';
                  return (
                    <tr key={entry.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{entry.patients?.first_name} {entry.patients?.last_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{entry.patients?.mrn}</div>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 200, whiteSpace: 'normal' }}>{entry.procedure_name}</td>
                      <td style={{ fontSize: 12 }}>
                        {entry.professionals ? `${entry.professionals.title || 'Dr.'} ${entry.professionals.user_profiles?.full_name || '—'}` : '—'}
                      </td>
                      <td>
                        <span className="badge" style={{ background: prCfg.bg, color: prCfg.color, border: `1px solid ${prCfg.color}40`, fontSize: 10 }}>
                          {prCfg.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {new Date(entry.listed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 800, color: urgentWait ? '#F44336' : days > 14 ? '#FF9800' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {days}d
                          {urgentWait && <span style={{ fontSize: 9, marginLeft: 4, color: '#F44336' }}>⚠</span>}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ fontSize: 10, background: entry.status === 'WAITING' ? 'rgba(255,152,0,0.12)' : entry.status === 'SCHEDULED' ? 'rgba(76,175,80,0.12)' : 'rgba(96,125,139,0.12)', color: entry.status === 'WAITING' ? '#FF9800' : entry.status === 'SCHEDULED' ? '#4CAF50' : '#607D8B', border: `1px solid ${entry.status === 'WAITING' ? 'rgba(255,152,0,0.3)' : entry.status === 'SCHEDULED' ? 'rgba(76,175,80,0.3)' : 'rgba(96,125,139,0.3)'}` }}>
                          {entry.status === 'WAITING' ? 'En Espera' : entry.status === 'SCHEDULED' ? 'Programado' : 'Cancelado'}
                        </span>
                      </td>
                      <td>
                        {entry.status === 'WAITING' && (
                          <button
                            className="btn-ghost"
                            onClick={() => handleSchedule(entry)}
                            disabled={scheduling === entry.id}
                            style={{ fontSize: 11, padding: '5px 10px' }}
                          >
                            {scheduling === entry.id ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="CalendarPlus" size={12} />}
                            Programar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {addModal && (
        <WaitlistModal
          patients={patients}
          professionals={professionals}
          specialties={specialties}
          onClose={() => setAddModal(false)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export function QuirofanoPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<'panel' | 'schedule' | 'waitlist'>('panel');
  const [rooms, setRooms] = useState<OperatingRoom[]>([]);
  const [schedules, setSchedules] = useState<SurgicalSchedule[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: roomsData },
      { data: schedulesData },
      { data: waitlistData },
      { data: patientsData },
      { data: profsData },
      { data: specsData },
    ] = await Promise.all([
      supabase.from('operating_rooms').select('*').order('code'),
      supabase.from('surgical_schedules').select(`
        *,
        patients(first_name, last_name, mrn),
        professionals!surgeon_id(title, user_profiles(full_name)),
        operating_rooms(code, name)
      `).order('scheduled_start', { ascending: false }),
      supabase.from('surgical_waitlist').select(`
        *,
        patients(first_name, last_name, mrn),
        professionals!referring_doctor_id(title, user_profiles(full_name))
      `).order('listed_at', { ascending: false }),
      supabase.from('patients').select('id, first_name, last_name, mrn').order('last_name'),
      supabase.from('professionals').select('id, title, user_profiles(full_name)').order('id'),
      supabase.from('specialties').select('id, name').order('name'),
    ]);

    setRooms((roomsData || []) as OperatingRoom[]);
    setSchedules((schedulesData || []) as SurgicalSchedule[]);
    setWaitlist((waitlistData || []) as WaitlistEntry[]);
    setPatients((patientsData || []) as Patient[]);
    setProfessionals((profsData || []) as unknown as Professional[]);
    setSpecialties((specsData || []) as Specialty[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const TABS = [
    { id: 'panel'    as const, label: 'Panel de Quirófanos',    icon: 'Building2' },
    { id: 'schedule' as const, label: 'Programación Quirúrgica', icon: 'Scissors'  },
    { id: 'waitlist' as const, label: 'Lista de Espera Quirúrgica', icon: 'ClipboardList' },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="Scissors" size={22} style={{ color: '#9C27B0' }} />
            Quirófano &amp; Cirugía
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Gestión de salas de operaciones, programación quirúrgica y WHO Safety Checklist
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {schedules.filter(s => s.status === 'IN_PROGRESS').length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', color: '#F44336', fontWeight: 700, fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F44336', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                {schedules.filter(s => s.status === 'IN_PROGRESS').length} EN PROGRESO
              </span>
            )}
          </span>
          <button className="btn-ghost" onClick={loadAll} style={{ fontSize: 12 }}>
            <Icon name="RefreshCw" size={14} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-item${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Icon name="Loader2" className="animate-spin" size={32} style={{ marginBottom: 12 }} />
          <div>Cargando datos del módulo de quirófano...</div>
        </div>
      ) : (
        <>
          {tab === 'panel' && <ORPanel rooms={rooms} onRefresh={loadAll} />}
          {tab === 'schedule' && (
            <SurgicalSchedulePanel
              schedules={schedules}
              rooms={rooms}
              patients={patients}
              professionals={professionals}
              specialties={specialties}
              onRefresh={loadAll}
            />
          )}
          {tab === 'waitlist' && (
            <WaitlistPanel
              waitlist={waitlist}
              rooms={rooms}
              patients={patients}
              professionals={professionals}
              specialties={specialties}
              onRefresh={loadAll}
            />
          )}
        </>
      )}
    </div>
  );
}

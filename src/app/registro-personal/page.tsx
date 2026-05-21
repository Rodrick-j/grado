'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SPECIALTIES } from '@/lib/data';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { createProfessionalAction, type ProfessionalFormData } from './actions';

const STEPS = [
  { id: 1, label: 'Datos Personales', icon: 'User' },
  { id: 2, label: 'Credenciales', icon: 'BadgeCheck' },
  { id: 3, label: 'Perfil Clínico', icon: 'Stethoscope' },
  { id: 4, label: 'Contrato', icon: 'FileText' },
];

const INITIAL: ProfessionalFormData = {
  full_name: '', email: '', phone: '', ci_passport: '', title: 'Dr.', role: 'DOCTOR',
  photo_base64: '',
  license_number: '', license_country: 'VE', license_expires: '',
  degree_base64: '',
  specialty_id: 'SP-001', subspecialty: '', years_experience: 1,
  graduated_from: '', graduation_year: new Date().getFullYear() - 5, certifications: '',
  contract_type: 'PERMANENT', hire_date: new Date().toISOString().split('T')[0],
  shift_preference: 'MORNING', max_weekly_hours: 48, on_call: false, consulting_rooms: '',
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
      {label} {required && <span style={{ color: '#F44336' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function RegistroPersonalPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProfessionalFormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPwd, setTempPwd] = useState('');
  const router = useRouter();

  const set = (field: keyof ProfessionalFormData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo_base64' | 'degree_base64') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      set(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    const res = await createProfessionalAction(form);
    if (res.success) {
      setTempPwd(res.tempPassword!);
    } else {
      setError(res.error || 'Error desconocido');
      setLoading(false);
    }
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (tempPwd) return (
    <AppShell>
      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
        <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(76,175,80,0.15)', border: '2px solid rgba(76,175,80,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon name="CheckCircle2" size={28} style={{ color: '#4CAF50' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Profesional Registrado
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            La cuenta ha sido creada. Comparta las credenciales de acceso temporal de forma segura.
          </p>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>EMAIL</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{form.email}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CONTRASEÑA TEMPORAL</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#69F0AE', background: 'rgba(76,175,80,0.08)', padding: '8px 12px', borderRadius: 8, letterSpacing: '0.1em' }}>
              {tempPwd}
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#FF9800', marginBottom: 20 }}>
            ⚠️ El profesional deberá cambiar su contraseña al iniciar sesión por primera vez.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setForm(INITIAL); setStep(1); setTempPwd(''); }} className="btn-ghost" style={{ flex: 1 }}>
              <Icon name="UserPlus" size={14} /> Nuevo Registro
            </button>
            <Link href="/profesionales" className="btn-primary" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}>
              <Icon name="Users" size={14} /> Ver Directorio
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );

  // ── MAIN FORM ───────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto', padding: '4px 24px 40px' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.12) 0%, rgba(21, 101, 192, 0.02) 100%)',
          border: '1px solid rgba(30, 136, 229, 0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          boxShadow: '0 4px 20px rgba(30, 136, 229, 0.05)'
        }}>
          <Link href="/profesionales" style={{ padding: 8, borderRadius: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textDecoration: 'none', background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)' }}>
            <Icon name="ArrowLeft" size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: '#1E88E5', letterSpacing: '-0.02em', margin: 0 }}>Registro de Personal Médico</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: 0 }}>Crear cuenta de acceso y perfil clínico completo en el Sistema FARO</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i < STEPS.length - 1 && (
                  <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, background: done ? '#1E88E5' : 'var(--border-secondary)', zIndex: 0, transition: 'background 0.3s' }} />
                )}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', border: `2px solid ${done || active ? '#1E88E5' : 'var(--border-primary)'}`,
                  background: done ? '#1E88E5' : active ? 'rgba(30,136,229,0.15)' : 'var(--bg-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative',
                  transition: 'all 0.3s',
                }}>
                  {done
                    ? <Icon name="Check" size={14} style={{ color: 'white' }} />
                    : <Icon name={s.icon} size={14} style={{ color: active ? '#1E88E5' : 'var(--text-muted)' }} />
                  }
                </div>
                <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#1E88E5' : 'var(--text-muted)', marginTop: 6, textAlign: 'center', lineHeight: 1.3 }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)', color: '#FF5252', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="AlertTriangle" size={15} /> {error}
          </div>
        )}

        {/* Card */}
        <div className="glass-card" style={{ padding: 28 }}>

          {/* ── STEP 1: Datos Personales ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10, marginBottom: 4 }}>
                Datos Personales e Identificación
              </h2>
              
              {/* Foto de Perfil del Profesional */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(30,136,229,0.03)', border: '1px solid var(--border-secondary)', padding: 14, borderRadius: 12 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', border: '1px solid var(--border-primary)',
                  background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {form.photo_base64 ? (
                    <img src={form.photo_base64} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Icon name="User" size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>FOTO DE PERFIL DEL PROFESIONAL</span>
                  <label className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0, width: 'fit-content' }}>
                    <Icon name="Upload" size={12} /> Cargar Foto
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo_base64')} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-4">
                <Field label="Título">
                  <select className="input-field" value={form.title} onChange={e => set('title', e.target.value)}>
                    <option value="Dr.">Dr.</option>
                    <option value="Dra.">Dra.</option>
                    <option value="Lic.">Lic.</option>
                    <option value="Lcda.">Lcda.</option>
                    <option value="Enf.">Enf.</option>
                  </select>
                </Field>
                <Field label="Nombre Completo" required>
                  <input className="input-field" placeholder="Sofía Mendoza García" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email Institucional" required>
                  <input type="email" className="input-field" placeholder="s.mendoza@sjdios.org" value={form.email} onChange={e => set('email', e.target.value)} />
                </Field>
                <Field label="CI / Pasaporte" required>
                  <input className="input-field" placeholder="V-12345678" value={form.ci_passport} onChange={e => set('ci_passport', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Teléfono de Contacto">
                  <input className="input-field" placeholder="+58 412 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </Field>
                <Field label="Rol en el Sistema" required>
                  <select className="input-field" value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="DOCTOR">Médico Especialista</option>
                    <option value="RESIDENT">Médico Residente</option>
                    <option value="NURSE">Enfermero/a</option>
                    <option value="LAB_TECHNICIAN">Técnico de Laboratorio</option>
                    <option value="RADIOLOGIST">Radiólogo</option>
                    <option value="PHARMACIST">Farmacéutico</option>
                    <option value="RECEPTIONIST">Recepcionista</option>
                    <option value="BILLING">Facturación</option>
                    <option value="AUDITOR">Auditor Clínico</option>
                    <option value="MEDICAL_DIRECTOR">Director Médico</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 2: Credenciales ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10, marginBottom: 4 }}>
                Credenciales y Matrícula Profesional
              </h2>

              {/* Uploader del Título/Diploma */}
              <div style={{ background: 'rgba(30,136,229,0.03)', border: '1px solid var(--border-secondary)', padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 90, height: 60, borderRadius: 6, border: '1px solid var(--border-primary)',
                  background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {form.degree_base64 ? (
                    <img src={form.degree_base64} alt="Diploma Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Icon name="GraduationCap" size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>TÍTULO PROFESIONAL / DIPLOMA</span>
                  <label className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0, width: 'fit-content' }}>
                    <Icon name="Upload" size={12} /> Cargar Documento
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'degree_base64')} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
                <Field label="Número de Matrícula / Licencia" required>
                  <input className="input-field" placeholder="Ej: MN-51298" value={form.license_number} onChange={e => set('license_number', e.target.value)} />
                </Field>
                <Field label="País Emisor">
                  <select className="input-field" value={form.license_country} onChange={e => set('license_country', e.target.value)}>
                    <option value="VE">Venezuela</option>
                    <option value="US">EE.UU.</option>
                    <option value="ES">España</option>
                    <option value="CO">Colombia</option>
                    <option value="MX">México</option>
                    <option value="AR">Argentina</option>
                    <option value="BR">Brasil</option>
                    <option value="CL">Chile</option>
                    <option value="PE">Perú</option>
                    <option value="EC">Ecuador</option>
                  </select>
                </Field>
              </div>
              <Field label="Fecha de Vencimiento de Licencia">
                <input type="date" className="input-field" value={form.license_expires} onChange={e => set('license_expires', e.target.value)} />
              </Field>
              <div style={{ background: 'rgba(30,136,229,0.07)', border: '1px solid rgba(30,136,229,0.2)', borderRadius: 10, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Icon name="Info" size={15} style={{ color: '#1E88E5', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  La verificación de matrícula se realizará manualmente por el Director Médico. El profesional podrá iniciar sesión inmediatamente pero tendrá acceso limitado hasta que su licencia sea verificada.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Perfil Clínico ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10, marginBottom: 4 }}>
                Perfil Clínico y Formación Académica
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Especialidad Principal" required>
                  <select className="input-field" value={form.specialty_id} onChange={e => set('specialty_id', e.target.value)}>
                    {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Subespecialidad">
                  <input className="input-field" placeholder="Ej: Cardiología Intervencionista" value={form.subspecialty} onChange={e => set('subspecialty', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Años de Experiencia" required>
                  <input type="number" className="input-field" min={0} max={60} value={form.years_experience} onChange={e => set('years_experience', parseInt(e.target.value) || 0)} />
                </Field>
                <Field label="Año de Graduación">
                  <input type="number" className="input-field" min={1960} max={new Date().getFullYear()} value={form.graduation_year} onChange={e => set('graduation_year', parseInt(e.target.value) || 2000)} />
                </Field>
              </div>
              <Field label="Universidad / Casa de Estudios">
                <input className="input-field" placeholder="Ej: Universidad Central de Venezuela" value={form.graduated_from} onChange={e => set('graduated_from', e.target.value)} />
              </Field>
              <Field label="Certificaciones y Postgrados (separados por coma)">
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Ej: Cardiología Intervencionista, ACLS, Fellow ACC"
                  value={form.certifications}
                  onChange={e => set('certifications', e.target.value)}
                  style={{ resize: 'vertical', minHeight: 70 }}
                />
              </Field>
            </div>
          )}

          {/* ── STEP 4: Contrato ── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10, marginBottom: 4 }}>
                Información Contractual y Asignación
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tipo de Contrato" required>
                  <select className="input-field" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                    <option value="PERMANENT">Permanente (Nómina)</option>
                    <option value="FEES">Honorarios Médicos</option>
                    <option value="RESIDENT">Residente</option>
                    <option value="INTERN">Interno</option>
                    <option value="CONTRACT">Contrato a Plazo Fijo</option>
                  </select>
                </Field>
                <Field label="Fecha de Ingreso" required>
                  <input type="date" className="input-field" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Turno Preferente">
                  <select className="input-field" value={form.shift_preference} onChange={e => set('shift_preference', e.target.value)}>
                    <option value="MORNING">Mañana (07:00–13:00)</option>
                    <option value="AFTERNOON">Tarde (13:00–19:00)</option>
                    <option value="NIGHT">Noche (19:00–07:00)</option>
                    <option value="ROTATING">Rotativo</option>
                  </select>
                </Field>
                <Field label="Horas Semanales Máx.">
                  <input type="number" className="input-field" min={8} max={80} value={form.max_weekly_hours} onChange={e => set('max_weekly_hours', parseInt(e.target.value) || 48)} />
                </Field>
              </div>
              <Field label="Consultorios Asignados (separados por coma)">
                <input className="input-field" placeholder="Ej: CN-301, CN-302" value={form.consulting_rooms} onChange={e => set('consulting_rooms', e.target.value)} />
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border-secondary)', cursor: 'pointer' }} onClick={() => set('on_call', !form.on_call)}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.on_call ? '#1E88E5' : 'var(--border-primary)'}`, background: form.on_call ? '#1E88E5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                  {form.on_call && <Icon name="Check" size={12} style={{ color: 'white' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Disponible para Guardia (On-Call)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>El profesional puede ser convocado fuera de su turno habitual</div>
                </div>
              </div>

              {/* Resumen previo al envío */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>RESUMEN DEL REGISTRO</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ['Profesional', `${form.title} ${form.full_name}`],
                    ['Email', form.email],
                    ['Matrícula', form.license_number || '—'],
                    ['Especialidad', SPECIALTIES.find(s => s.id === form.specialty_id)?.name || '—'],
                    ['Experiencia', `${form.years_experience} años`],
                    ['Contrato', form.contract_type],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k}</span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-secondary)' }}>
            <button
              className="btn-ghost"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0.4 : 1 }}
            >
              <Icon name="ArrowLeft" size={14} /> Anterior
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {STEPS.map(s => (
                <div key={s.id} style={{ width: step === s.id ? 20 : 6, height: 6, borderRadius: 3, background: step === s.id ? '#1E88E5' : step > s.id ? 'rgba(30,136,229,0.4)' : 'var(--border-primary)', transition: 'all 0.3s' }} />
              ))}
            </div>
            {step < 4 ? (
              <button className="btn-primary" onClick={() => setStep(s => Math.min(4, s + 1))}>
                Siguiente <Icon name="ArrowRight" size={14} />
              </button>
            ) : (
              <button
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #43A047, #1B5E20)', minWidth: 180 }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <><Icon name="Loader2" size={14} className="animate-spin" /> Creando cuenta...</>
                ) : (
                  <><Icon name="UserCheck" size={14} /> Crear Perfil Profesional</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

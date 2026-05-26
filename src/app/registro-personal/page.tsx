'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SPECIALTIES } from '@/lib/data';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { createProfessionalAction, type ProfessionalFormData } from './actions';

const STEPS = [
  { id: 1, label: 'Categoría y Cargo', icon: 'Briefcase' },
  { id: 2, label: 'Datos Personales', icon: 'User' },
  { id: 3, label: 'Perfil Profesional', icon: 'BadgeCheck' },
  { id: 4, label: 'Contrato Laboral', icon: 'FileText' },
];

const INITIAL: ProfessionalFormData = {
  full_name: '', email: '', phone: '', ci_passport: '', title: 'Lic.', role: 'NURSE',
  photo_base64: '',
  license_number: '', license_country: 'BO', license_expires: '',
  degree_base64: '',
  specialty_id: 'SP-001', subspecialty: '', years_experience: 0,
  graduated_from: '', graduation_year: new Date().getFullYear(), certifications: '',
  contract_type: 'PERMANENT', hire_date: new Date().toISOString().split('T')[0],
  shift_preference: 'MORNING', max_weekly_hours: 48, on_call: false, consulting_rooms: '',
};

const CATEGORIES = [
  { id: 'MEDICAL', title: '1. Personal Médico', desc: 'Especialistas, Residentes, Cirujanos', icon: 'Stethoscope', color: '#1E88E5', roles: [
    { id: 'DOCTOR', label: 'Médico Especialista / Cirujano' },
    { id: 'RESIDENT', label: 'Médico Residente' },
    { id: 'MEDICAL_DIRECTOR', label: 'Director Médico / Jefatura' }
  ]},
  { id: 'NURSING', title: '2. Personal de Enfermería', desc: 'Enfermeros Universitarios, TENS, Matronas', icon: 'HeartPulse', color: '#E91E63', roles: [
    { id: 'NURSE', label: 'Enfermero/a Universitario' },
    { id: 'NURSE', label: 'Técnico en Enfermería (TENS)' },
    { id: 'NURSE', label: 'Matrona / Obstetra' }
  ]},
  { id: 'TECH', title: '3. Técnico y Apoyo', desc: 'Laboratorio, Imagenología, Farmacia', icon: 'Microscope', color: '#00BCD4', roles: [
    { id: 'LAB_TECHNICIAN', label: 'Bioquímico / Téc. Laboratorio' },
    { id: 'RADIOLOGIST', label: 'Radiólogo / Téc. Médico' },
    { id: 'PHARMACIST', label: 'Farmacéutico / Auxiliar' },
    { id: 'NURSE', label: 'Kinesiólogo / Rehabilitación' }
  ]},
  { id: 'ADMIN', title: '4. Administrativo y Gestión', desc: 'Recepción, Finanzas, RRHH', icon: 'Briefcase', color: '#FF9800', roles: [
    { id: 'RECEPTIONIST', label: 'Recepción / Admisión' },
    { id: 'BILLING', label: 'Recaudación / Caja' },
    { id: 'AUDITOR', label: 'RRHH / Contabilidad' },
    { id: 'AUDITOR', label: 'Auditor Clínico' }
  ]},
  { id: 'SERVICES', title: '5. Servicios y Logística', desc: 'Camilleros, Limpieza, Mantenimiento', icon: 'Wrench', color: '#8BC34A', roles: [
    { id: 'RECEPTIONIST', label: 'Camillero / Celador' },
    { id: 'RECEPTIONIST', label: 'Limpieza / Higiene' },
    { id: 'RECEPTIONIST', label: 'Mantenimiento / Biomedicina' },
    { id: 'RECEPTIONIST', label: 'Alimentación / Nutricionista' }
  ]}
];

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
  const [selectedCategory, setSelectedCategory] = useState<string>('MEDICAL');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPwd, setTempPwd] = useState('');

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

  const isMedicalStaff = selectedCategory === 'MEDICAL';

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (tempPwd) return (
    <AppShell>
      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
        <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(76,175,80,0.15)', border: '2px solid rgba(76,175,80,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon name="CheckCircle2" size={28} style={{ color: '#4CAF50' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Personal Registrado con Éxito
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            El registro se guardó en la base de datos de RRHH. Para los cargos con acceso al sistema, comparta estas credenciales.
          </p>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>EMAIL DE ACCESO</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{form.email}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CONTRASEÑA TEMPORAL</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#69F0AE', background: 'rgba(76,175,80,0.08)', padding: '8px 12px', borderRadius: 8, letterSpacing: '0.1em' }}>
              {tempPwd}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setForm(INITIAL); setStep(1); setTempPwd(''); setSelectedJobTitle(''); }} className="btn-ghost" style={{ flex: 1 }}>
              <Icon name="UserPlus" size={14} /> Nuevo Registro
            </button>
            <Link href="/rrhh-inteligente" className="btn-primary" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}>
              <Icon name="Users" size={14} /> Ir a RRHH
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );

  // ── MAIN FORM ───────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto', padding: '10px 24px 40px' }}>

        {/* Header */}
        <div 
          style={{
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid var(--border-secondary)',
            paddingBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #9C27B0, #673AB7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)' }}>
              <Icon name="Users" size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Alta de Personal (RRHH)</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Registro centralizado de todo el staff del hospital</p>
            </div>
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
                  <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, background: done ? '#9C27B0' : 'var(--border-secondary)', zIndex: 0, transition: 'background 0.3s' }} />
                )}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', border: `2px solid ${done || active ? '#9C27B0' : 'var(--border-primary)'}`,
                  background: done ? '#9C27B0' : active ? 'rgba(156, 39, 176, 0.15)' : 'var(--bg-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative',
                  transition: 'all 0.3s',
                }}>
                  {done
                    ? <Icon name="Check" size={14} style={{ color: 'white' }} />
                    : <Icon name={s.icon} size={14} style={{ color: active ? '#9C27B0' : 'var(--text-muted)' }} />
                  }
                </div>
                <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#9C27B0' : 'var(--text-muted)', marginTop: 6, textAlign: 'center', lineHeight: 1.3 }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)', color: '#FF5252', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="AlertTriangle" size={15} /> {error}
          </div>
        )}

        <div className="glass-card" style={{ padding: '32px 36px' }}>

          {/* ── STEP 1: Categoría ── */}
          {step === 1 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Departamento y Cargo</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -14 }}>Seleccione el área a la que pertenecerá el nuevo empleado.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {CATEGORIES.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => { setSelectedCategory(cat.id); setSelectedJobTitle(''); set('role', cat.roles[0].id); }}
                    style={{ 
                      padding: 16, 
                      borderRadius: 12, 
                      border: `2px solid ${selectedCategory === cat.id ? cat.color : 'var(--border-secondary)'}`,
                      background: selectedCategory === cat.id ? `${cat.color}15` : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: selectedCategory === cat.id ? `0 4px 14px ${cat.color}25` : 'none'
                    }}
                  >
                    <Icon name={cat.icon} size={20} style={{ color: selectedCategory === cat.id ? cat.color : 'var(--text-muted)', marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{cat.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{cat.desc}</div>
                  </div>
                ))}
              </div>

              {selectedCategory && (
                <div style={{ marginTop: 10, padding: 20, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-secondary)' }}>
                  <Field label="Cargo Específico" required>
                    <select 
                      className="input-field" 
                      value={selectedJobTitle}
                      onChange={e => {
                        setSelectedJobTitle(e.target.value);
                        const roleObj = CATEGORIES.find(c => c.id === selectedCategory)?.roles.find(r => r.label === e.target.value);
                        if (roleObj) set('role', roleObj.id);
                      }}
                    >
                      <option value="" disabled>Seleccione el cargo...</option>
                      {CATEGORIES.find(c => c.id === selectedCategory)?.roles.map(r => (
                        <option key={r.label} value={r.label}>{r.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Datos Personales ── */}
          {step === 2 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10, margin: 0 }}>
                Datos Personales e Identidad
              </h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-surface)', border: '1px dashed var(--border-secondary)', padding: 20, borderRadius: 12 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--border-primary)',
                  background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {form.photo_base64 ? (
                    <img src={form.photo_base64} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Icon name="User" size={32} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Fotografía de Gafete / Perfil</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recomendado para la identificación interna.</span>
                  <label className="btn-ghost" style={{ padding: '6px 14px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0, width: 'fit-content' }}>
                    <Icon name="Upload" size={14} /> Subir Imagen
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo_base64')} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 mt-2">
                <Field label="Trato/Título">
                  <select className="input-field" value={form.title} onChange={e => set('title', e.target.value)}>
                    <option value="Dr.">Dr.</option>
                    <option value="Dra.">Dra.</option>
                    <option value="Lic.">Lic.</option>
                    <option value="Lcda.">Lcda.</option>
                    <option value="Enf.">Enf.</option>
                    <option value="Tec.">Téc.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="Sra.">Sra.</option>
                  </select>
                </Field>
                <Field label="Nombre Completo" required>
                  <input className="input-field" placeholder="Nombre y Apellidos" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="CI / Pasaporte" required>
                  <input className="input-field" placeholder="Número de Documento" value={form.ci_passport} onChange={e => set('ci_passport', e.target.value)} />
                </Field>
                <Field label="Teléfono de Contacto">
                  <input className="input-field" placeholder="+591 7000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </Field>
              </div>
              <Field label="Email Corporativo o Personal" required>
                <input type="email" className="input-field" placeholder="correo@ejemplo.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <div style={{ background: 'rgba(30,136,229,0.05)', border: '1px solid rgba(30,136,229,0.15)', borderRadius: 8, padding: 12, display: 'flex', gap: 10 }}>
                <Icon name="Info" size={16} style={{ color: '#1E88E5', flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                  El email se utilizará como usuario para ingresar al sistema (si su rol tiene acceso).
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Perfil Profesional ── */}
          {step === 3 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10, margin: 0 }}>
                Perfil Profesional / Académico
              </h2>
              
              {isMedicalStaff ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Especialidad Principal" required>
                      <select className="input-field" value={form.specialty_id} onChange={e => set('specialty_id', e.target.value)}>
                        {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Número de Matrícula (Médico)" required>
                      <input className="input-field" placeholder="Ej: MN-51298" value={form.license_number} onChange={e => set('license_number', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Certificaciones y Postgrados">
                    <textarea className="input-field" rows={2} placeholder="Ej: Especialización en UMSA, ACLS, etc." value={form.certifications} onChange={e => set('certifications', e.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Título / Oficio Obtenido">
                      <input className="input-field" placeholder="Ej: Técnico Superior en Laboratorio" value={form.subspecialty} onChange={e => set('subspecialty', e.target.value)} />
                    </Field>
                    <Field label="Registro Profesional (Si aplica)">
                      <input className="input-field" placeholder="Nro. de Registro o Licencia" value={form.license_number} onChange={e => set('license_number', e.target.value)} />
                    </Field>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px] gap-4">
                <Field label="Casa de Estudios / Instituto">
                  <input className="input-field" placeholder="Ej: UMSA, INFOCAL..." value={form.graduated_from} onChange={e => set('graduated_from', e.target.value)} />
                </Field>
                <Field label="Año de Egreso">
                  <input type="number" className="input-field" min={1960} max={new Date().getFullYear()} value={form.graduation_year} onChange={e => set('graduation_year', parseInt(e.target.value) || 2000)} />
                </Field>
                <Field label="Años Exp.">
                  <input type="number" className="input-field" min={0} value={form.years_experience} onChange={e => set('years_experience', parseInt(e.target.value) || 0)} />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 4: Contrato ── */}
          {step === 4 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10, margin: 0 }}>
                Información Laboral (RRHH)
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tipo de Contrato" required>
                  <select className="input-field" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                    <option value="PERMANENT">Ítem / Permanente (Nómina)</option>
                    <option value="CONTRACT">Contrato Anual / Plazo Fijo</option>
                    <option value="FEES">Consultor / Honorarios Profesionales</option>
                    <option value="INTERN">Pasante / Interno</option>
                  </select>
                </Field>
                <Field label="Fecha de Ingreso" required>
                  <input type="date" className="input-field" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Plantilla de Turno Hospitalario">
                  <select className="input-field" value={form.shift_preference} onChange={e => set('shift_preference', e.target.value)}>
                    <option value="MORNING">Mañana / Medio Tiempo (08:00–14:00)</option>
                    <option value="ADMIN_8H">Turno Administrativo (08:00–16:00)</option>
                    <option value="DAY_12H">Rotativo Diurno (08:00–20:00)</option>
                    <option value="NIGHT_12H">Rotativo Nocturno (20:00–08:00)</option>
                    <option value="GUARD_24H">Guardia 24 Horas (08:00–08:00)</option>
                    <option value="ROTATING">Asignación Variable / Libre</option>
                  </select>
                </Field>
                <Field label="Carga Horaria Semanal (Hrs)">
                  <input type="number" className="input-field" min={8} max={100} value={form.max_weekly_hours} onChange={e => set('max_weekly_hours', parseInt(e.target.value) || 48)} />
                </Field>
              </div>

              {isMedicalStaff && (
                <Field label="Consultorios Asignados (opcional)">
                  <input className="input-field" placeholder="Ej: Consultorio 301, Box Trauma" value={form.consulting_rooms} onChange={e => set('consulting_rooms', e.target.value)} />
                </Field>
              )}

              {/* Resumen previo al envío */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, padding: 20, marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#9C27B0', marginBottom: 14, letterSpacing: '0.05em' }}>RESUMEN DE REGISTRO EN RRHH</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  {[
                    ['Empleado', `${form.title} ${form.full_name}`],
                    ['Documento', form.ci_passport],
                    ['Departamento', CATEGORIES.find(c => c.id === selectedCategory)?.title.substring(3)],
                    ['Cargo', selectedJobTitle || '—'],
                    ['Contrato', form.contract_type === 'PERMANENT' ? 'Permanente' : form.contract_type === 'CONTRACT' ? 'Contrato Fijo' : 'Honorarios'],
                    ['Ingreso', form.hire_date],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{k}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-row items-center justify-between gap-2" style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid var(--border-secondary)', flexWrap: 'wrap' }}>
            <button
              className="btn-ghost"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0.4 : 1, padding: '10px 16px' }}
            >
              <Icon name="ArrowLeft" size={14} /> Anterior
            </button>
            <div className="flex gap-2 max-sm:hidden">
              {STEPS.map(s => (
                <div key={s.id} style={{ width: step === s.id ? 24 : 8, height: 8, borderRadius: 4, background: step === s.id ? '#9C27B0' : step > s.id ? 'rgba(156, 39, 176, 0.4)' : 'var(--border-primary)', transition: 'all 0.3s' }} />
              ))}
            </div>
            {step < 4 ? (
              <button 
                className="btn-primary" 
                onClick={() => {
                  if (step === 1 && !selectedJobTitle) {
                    setError('Por favor, seleccione un cargo específico antes de continuar.');
                    return;
                  }
                  setError('');
                  setStep(s => Math.min(4, s + 1));
                }} 
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1E88E5, #0D47A1)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(30, 136, 229, 0.3)' }}
              >
                Siguiente <Icon name="ArrowRight" size={14} />
              </button>
            ) : (
              <button
                className="btn-primary max-sm:w-full"
                style={{ background: 'linear-gradient(135deg, #9C27B0, #673AB7)', color: 'white', minWidth: 160, padding: '10px 20px', border: 'none', boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)' }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <><Icon name="Loader2" size={14} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Icon name="UserCheck" size={14} /> Finalizar Registro</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

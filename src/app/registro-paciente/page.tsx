'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { AppShell } from '@/components/AppShell';
import { QRScanner } from '@/components/QRScanner';
import SignatureCanvas from 'react-signature-canvas';
import { createPatientAction, type PatientFormData } from './actions';

const STEPS = [
  { id: 1, label: 'Identidad', icon: 'User' },
  { id: 2, label: 'Contacto', icon: 'MapPin' },
  { id: 3, label: 'Cobertura', icon: 'Shield' },
  { id: 4, label: 'Consentimientos', icon: 'PenTool' },
];

const Field = ({ label, required, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
      {label} {required && <span style={{ color: '#F44336' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function RegistroPacientePage() {
  const [step, setStep] = useState(1);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMrn, setSuccessMrn] = useState('');
  
  const sigCanvas = useRef<any>(null);
  const router = useRouter();

  const [formData, setFormData] = useState<PatientFormData>({
    ci_passport: '', first_name: '', last_name: '', birth_date: '', gender: 'MALE',
    phone_primary: '', email: '', address_line1: '', city: '',
    emergency_name: '', emergency_phone: '', insurance_provider: '', insurance_policy_num: '',
    consent_treatment: false, consent_data: false, photo_base64: '', id_card_base64: ''
  });

  const set = (field: keyof PatientFormData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo_base64' | 'id_card_base64') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      set(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = (text: string) => {
    setShowScanner(false);
    try {
      const data = JSON.parse(text);
      setFormData(prev => ({
        ...prev,
        first_name: data.fn || prev.first_name,
        last_name: data.ln || prev.last_name,
        ci_passport: data.id || prev.ci_passport,
        birth_date: data.dob || prev.birth_date,
      }));
    } catch {
      alert('Formato de QR no reconocido. Intente manualmente.');
    }
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.ci_passport || !formData.birth_date || !formData.phone_primary) {
      setError('Por favor complete todos los campos obligatorios (*)');
      return;
    }
    if (!formData.consent_treatment) {
      setError('Debe aceptar el consentimiento de tratamiento médico.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const signatureUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    const finalData = { ...formData, consent_signature_url: signatureUrl };

    const res = await createPatientAction(finalData);

    setLoading(false);
    if (!res.success || !res.patient) {
      setError(res.error || 'Error guardando paciente');
    } else {
      setSuccessMrn(res.patient.mrn);
    }
  };

  if (successMrn) {
    return (
      <AppShell>
        <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
          <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(76,175,80,0.15)', border: '2px solid rgba(76,175,80,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Icon name="CheckCircle2" size={28} style={{ color: '#4CAF50' }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Paciente Registrado Exitosamente
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              El paciente {formData.first_name} {formData.last_name} ha sido ingresado al sistema.
            </p>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MEDICAL RECORD NUMBER (MRN)</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#1E88E5', letterSpacing: '0.05em' }}>
                {successMrn}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { window.location.reload(); }} className="btn-ghost" style={{ flex: 1 }}>
                <Icon name="UserPlus" size={14} /> Nuevo Registro
              </button>
              <Link href="/adt" className="btn-primary" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}>
                <Icon name="List" size={14} /> Ir a ADT
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }



  return (
    <AppShell>
      <div className="animate-fade-in" style={{ padding: '4px 24px 40px', maxWidth: 720, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.12) 0%, rgba(21, 101, 192, 0.02) 100%)',
          border: '1px solid rgba(30, 136, 229, 0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          boxShadow: '0 4px 20px rgba(30, 136, 229, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/adt" style={{ padding: 8, borderRadius: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textDecoration: 'none', background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)' }}>
              <Icon name="ArrowLeft" size={16} />
            </Link>
            <div>
              <h1 style={{ fontSize: 21, fontWeight: 800, color: '#1E88E5', letterSpacing: '-0.02em', margin: 0 }}>Registro Universal de Pacientes</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: 0 }}>Ingreso de datos demográficos y administrativos</p>
            </div>
          </div>
          {step === 1 && (
            <button className="btn-ghost" style={{ background: 'rgba(30,136,229,0.15)', color: '#1E88E5', border: '1px solid rgba(30,136,229,0.3)', margin: 0 }} onClick={() => setShowScanner(true)}>
              <Icon name="Scan" size={14} /> Escanear Documento
            </button>
          )}
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

        {error && (
          <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)', color: '#FF5252', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="AlertTriangle" size={15} /> {error}
          </div>
        )}

        <div className="glass-card" style={{ padding: 28 }}>
          
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10 }}>1. Identidad y Demografía</h2>
              
              {/* Fotos del Paciente y de su Carnet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2" style={{ background: 'rgba(30,136,229,0.03)', border: '1px solid var(--border-secondary)', padding: 16, borderRadius: 12 }}>
                <Field label="Foto de Perfil del Paciente">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%', border: '1px solid var(--border-primary)',
                      background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {formData.photo_base64 ? (
                        <img src={formData.photo_base64} alt="Preview Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Icon name="Camera" size={20} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <label className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      <Icon name="Upload" size={12} /> Cargar Foto
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo_base64')} style={{ display: 'none' }} />
                    </label>
                  </div>
                </Field>

                <Field label="Foto de Cédula / Carnet de Identidad">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 100, height: 60, borderRadius: 6, border: '1px solid var(--border-primary)',
                      background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {formData.id_card_base64 ? (
                        <img src={formData.id_card_base64} alt="Preview Carnet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Icon name="FileImage" size={20} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <label className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      <Icon name="Upload" size={12} /> Cargar Carnet
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'id_card_base64')} style={{ display: 'none' }} />
                    </label>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cédula / Pasaporte" required><input className="input-field" value={formData.ci_passport} onChange={e=>set('ci_passport', e.target.value)} /></Field>
                <Field label="Fecha de Nacimiento" required><input type="date" className="input-field" value={formData.birth_date} onChange={e=>set('birth_date', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombres" required><input className="input-field" value={formData.first_name} onChange={e=>set('first_name', e.target.value)} /></Field>
                <Field label="Apellidos" required><input className="input-field" value={formData.last_name} onChange={e=>set('last_name', e.target.value)} /></Field>
              </div>
              <Field label="Género Biológico">
                <select className="input-field" value={formData.gender} onChange={e=>set('gender', e.target.value)}>
                  <option value="MALE">Masculino</option><option value="FEMALE">Femenino</option><option value="OTHER">Otro</option>
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10 }}>2. Contacto y Domicilio</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Teléfono Principal" required><input className="input-field" value={formData.phone_primary} onChange={e=>set('phone_primary', e.target.value)} /></Field>
                <Field label="Email"><input type="email" className="input-field" value={formData.email} onChange={e=>set('email', e.target.value)} /></Field>
              </div>
              <Field label="Dirección Residencial"><input className="input-field" value={formData.address_line1} onChange={e=>set('address_line1', e.target.value)} /></Field>
              <Field label="Ciudad / Estado"><input className="input-field" value={formData.city} onChange={e=>set('city', e.target.value)} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre Contacto Emergencia"><input className="input-field" value={formData.emergency_name} onChange={e=>set('emergency_name', e.target.value)} /></Field>
                <Field label="Teléfono Emergencia"><input className="input-field" value={formData.emergency_phone} onChange={e=>set('emergency_phone', e.target.value)} /></Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10 }}>3. Seguro y Cobertura Médica</h2>
              <Field label="Proveedor de Seguro">
                <select className="input-field" value={formData.insurance_provider} onChange={e=>set('insurance_provider', e.target.value)}>
                  <option value="">Ninguno / Particular</option>
                  <option value="Medicare">Medicare</option>
                  <option value="Medicaid">Medicaid</option>
                  <option value="BlueCross">BlueCross BlueShield</option>
                  <option value="SeguroPrivado">Otro Seguro Privado</option>
                </select>
              </Field>
              {formData.insurance_provider && (
                <Field label="Número de Póliza"><input className="input-field" value={formData.insurance_policy_num} onChange={e=>set('insurance_policy_num', e.target.value)} /></Field>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10 }}>4. Consentimientos Legales</h2>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border-secondary)', cursor: 'pointer' }} onClick={() => set('consent_treatment', !formData.consent_treatment)}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${formData.consent_treatment ? '#1E88E5' : 'var(--border-primary)'}`, background: formData.consent_treatment ? '#1E88E5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, marginTop: 2 }}>
                  {formData.consent_treatment && <Icon name="Check" size={12} style={{ color: 'white' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Consentimiento de Tratamiento *</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Acepto los términos de tratamiento médico y procedimientos rutinarios en el Hospital San Juan de Dios.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border-secondary)', cursor: 'pointer' }} onClick={() => set('consent_data', !formData.consent_data)}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${formData.consent_data ? '#1E88E5' : 'var(--border-primary)'}`, background: formData.consent_data ? '#1E88E5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, marginTop: 2 }}>
                  {formData.consent_data && <Icon name="Check" size={12} style={{ color: 'white' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Protección de Datos (HIPAA)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Autorizo el manejo de mis datos de salud bajo los estándares de confidencialidad médica.</div>
                </div>
              </div>

              <Field label="Firma Digital del Paciente">
                <div style={{ background: '#E3F2FD', borderRadius: 8, border: '2px dashed #90CAF9', overflow: 'hidden', position: 'relative' }}>
                  <SignatureCanvas ref={sigCanvas} penColor="#0D47A1" canvasProps={{ width: 500, height: 150, className: 'sigCanvas', style: { width: '100%' } }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => sigCanvas.current?.clear()}>
                    <Icon name="Eraser" size={12} /> Limpiar Firma
                  </button>
                </div>
              </Field>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-secondary)' }}>
            <button className="btn-ghost" onClick={() => { setError(''); setStep(s => Math.max(1, s - 1)); }} disabled={step === 1} style={{ opacity: step === 1 ? 0.4 : 1 }}>
              <Icon name="ArrowLeft" size={14} /> Anterior
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {STEPS.map(s => (
                <div key={s.id} style={{ width: step === s.id ? 20 : 6, height: 6, borderRadius: 3, background: step === s.id ? '#1E88E5' : step > s.id ? 'rgba(30,136,229,0.4)' : 'var(--border-primary)', transition: 'all 0.3s' }} />
              ))}
            </div>
            {step < 4 ? (
              <button className="btn-primary" onClick={() => { setError(''); setStep(s => Math.min(4, s + 1)); }}>
                Siguiente <Icon name="ArrowRight" size={14} />
              </button>
            ) : (
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #43A047, #1B5E20)', minWidth: 180 }} onClick={handleSave} disabled={loading}>
                {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Guardando...</> : <><Icon name="UserCheck" size={14} /> Registrar Paciente</>}
              </button>
            )}
          </div>

        </div>
      </div>
      {showScanner && <QRScanner onScanSuccess={handleScan} onClose={() => setShowScanner(false)} />}
    </AppShell>
  );
}

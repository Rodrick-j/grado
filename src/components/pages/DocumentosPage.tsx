'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

// ─── Types ──────────────────────────────────────────────────────────────────

type DocumentType =
  | 'DISCHARGE_SUMMARY'
  | 'MEDICAL_CERT'
  | 'PRESCRIPTION_PRINT'
  | 'IMAGING_REPORT'
  | 'REFERRAL_LETTER'
  | 'SICK_LEAVE';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  birth_date: string | null;
  insurance_plan: string | null;
  primary_physician: string | null;
}

interface Professional {
  id: string;
  full_name: string;
  specialty: string | null;
}

interface Prescription {
  id: string;
  medication_name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  duration_days: number | null;
  instructions: string | null;
}

interface ClinicalDocument {
  id: string;
  type: DocumentType;
  title: string;
  content_json: Record<string, unknown>;
  pdf_url: string | null;
  signed_at: string | null;
  is_valid: boolean;
  created_at: string;
  patients?: { first_name: string; last_name: string; mrn: string } | null;
  user_profiles?: { full_name: string } | null;
}

// ─── Document Type Config ────────────────────────────────────────────────────

const DOC_TYPE_CONFIG: Record<
  DocumentType,
  { label: string; icon: string; description: string; color: string }
> = {
  DISCHARGE_SUMMARY: {
    label: 'Epicrisis / Alta',
    icon: '📋',
    description: 'Resumen completo del episodio hospitalario',
    color: '#1E88E5',
  },
  MEDICAL_CERT: {
    label: 'Certificado Médico',
    icon: '🏥',
    description: 'Certificado de atención, diagnóstico o aptitud',
    color: '#4CAF50',
  },
  PRESCRIPTION_PRINT: {
    label: 'Receta Médica',
    icon: '💊',
    description: 'Prescripción oficial imprimible',
    color: '#FF9800',
  },
  IMAGING_REPORT: {
    label: 'Informe Radiológico',
    icon: '🔬',
    description: 'Informe de estudio de imágenes firmado',
    color: '#9C27B0',
  },
  REFERRAL_LETTER: {
    label: 'Carta de Referencia',
    icon: '📨',
    description: 'Derivación a otro nivel de atención',
    color: '#00BCD4',
  },
  SICK_LEAVE: {
    label: 'Baja Médica / Reposo',
    icon: '🛌',
    description: 'Certificado de incapacidad laboral',
    color: '#F44336',
  },
};

const DOC_TYPE_BADGE_COLORS: Record<DocumentType | string, string> = {
  DISCHARGE_SUMMARY: '#1E88E5',
  MEDICAL_CERT: '#4CAF50',
  PRESCRIPTION_PRINT: '#FF9800',
  IMAGING_REPORT: '#9C27B0',
  REFERRAL_LETTER: '#00BCD4',
  SICK_LEAVE: '#F44336',
  AUTOPSY: '#607D8B',
};

// ─── Discharge Summary Form ──────────────────────────────────────────────────

interface DischargeSummaryFields {
  main_diagnosis: string;
  secondary_diagnoses: string;
  hospitalization_summary: string;
  procedures_performed: string;
  discharge_condition: string;
  discharge_medications: string;
  home_instructions: string;
  next_appointment: string;
  responsible_doctor: string;
}

// ─── Medical Cert Form ───────────────────────────────────────────────────────

interface MedicalCertFields {
  cert_type: string;
  diagnosis: string;
  observations: string;
  valid_from: string;
  valid_until: string;
  signing_doctor: string;
}

// ─── Prescription Fields ─────────────────────────────────────────────────────

interface PrescriptionFields {
  selected_prescriptions: string[];
  prescriber_notes: string;
  prescriber_doctor: string;
}

// ─── Referral Fields ─────────────────────────────────────────────────────────

interface ReferralFields {
  specialty_to: string;
  center_name: string;
  reason: string;
  clinical_summary: string;
  urgency: string;
  referring_doctor: string;
}

// ─── Sick Leave Fields ───────────────────────────────────────────────────────

interface SickLeaveFields {
  rest_days: string;
  reason: string;
  restricted_activities: string;
  start_date: string;
  end_date: string;
  signing_doctor: string;
}

type FormContent =
  | DischargeSummaryFields
  | MedicalCertFields
  | PrescriptionFields
  | ReferralFields
  | SickLeaveFields;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        display: 'block',
        marginBottom: 5,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </label>
  );
}

// ─── A4 Print Styles ──────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden; }
  #doc-preview, #doc-preview * { visibility: visible; }
  #doc-preview { position: fixed; top: 0; left: 0; width: 100%; }
  .no-print { display: none !important; }
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function DocumentosPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<'generate' | 'history'>('generate');

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);

  // ── Patient selection ───────────────────────────────────────────────────────
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // ── Professionals ───────────────────────────────────────────────────────────
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // ── Prescriptions ───────────────────────────────────────────────────────────
  const [patientPrescriptions, setPatientPrescriptions] = useState<
    Prescription[]
  >([]);

  // ── Form content ────────────────────────────────────────────────────────────
  const [dischargeSummary, setDischargeSummary] =
    useState<DischargeSummaryFields>({
      main_diagnosis: '',
      secondary_diagnoses: '',
      hospitalization_summary: '',
      procedures_performed: '',
      discharge_condition: 'Mejorado',
      discharge_medications: '',
      home_instructions: '',
      next_appointment: '',
      responsible_doctor: '',
    });

  const [medicalCert, setMedicalCert] = useState<MedicalCertFields>({
    cert_type: 'Asistencia',
    diagnosis: '',
    observations: '',
    valid_from: '',
    valid_until: '',
    signing_doctor: '',
  });

  const [prescriptionFields, setPrescriptionFields] =
    useState<PrescriptionFields>({
      selected_prescriptions: [],
      prescriber_notes: '',
      prescriber_doctor: '',
    });

  const [referralFields, setReferralFields] = useState<ReferralFields>({
    specialty_to: '',
    center_name: '',
    reason: '',
    clinical_summary: '',
    urgency: 'Electiva',
    referring_doctor: '',
  });

  const [sickLeaveFields, setSickLeaveFields] = useState<SickLeaveFields>({
    rest_days: '',
    reason: '',
    restricted_activities: '',
    start_date: '',
    end_date: '',
    signing_doctor: '',
  });

  // ── History tab ─────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyPatientFilter, setHistoryPatientFilter] = useState('');
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Fetch professionals on mount ────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('professionals')
      .select('id,title,user_profiles!professionals_user_id_fkey(full_name),specialties!professionals_specialty_id_fkey(name)')
      .then(({ data }) => {
        const mapped = (data || []).map((d: any) => ({
          id: d.id,
          full_name: `${d.title || ''} ${d.user_profiles?.full_name || ''}`.trim(),
          specialty: d.specialties?.name || null
        }));
        mapped.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setProfessionals(mapped);
      });
  }, []);

  // ── Fetch patients for search ───────────────────────────────────────────────
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatients([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('patients')
        .select(`
          id,
          first_name,
          last_name,
          mrn,
          birth_date,
          insurance_provider,
          professionals!patients_primary_doctor_id_fkey(
            title,
            user_profiles!professionals_user_id_fkey(full_name)
          )
        `)
        .or(
          `first_name.ilike.%${patientSearch}%,last_name.ilike.%${patientSearch}%,mrn.ilike.%${patientSearch}%`
        )
        .limit(8);

      const mapped: Patient[] = (data || []).map((p: any) => {
        const doc = p.professionals;
        const doctorName = doc ? `${doc.title || ''} ${doc.user_profiles?.full_name || ''}`.trim() : null;
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          mrn: p.mrn,
          birth_date: p.birth_date,
          insurance_plan: p.insurance_provider || null,
          primary_physician: doctorName
        };
      });
      setPatients(mapped);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // ── Fetch prescriptions when patient selected ───────────────────────────────
  useEffect(() => {
    if (!selectedPatient || selectedType !== 'PRESCRIPTION_PRINT') return;
    supabase
      .from('prescriptions')
      .select(
        'id,medication_name,dose,route,frequency,duration_days,instructions'
      )
      .eq('patient_id', selectedPatient.id)
      .eq('status', 'ACTIVE')
      .then(({ data }) =>
        setPatientPrescriptions((data as Prescription[]) || [])
      );
  }, [selectedPatient, selectedType]);

  // ── Fetch history ───────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setHistoryLoading(true);
    let q = supabase
      .from('clinical_documents')
      .select(
        '*, patients(first_name,last_name,mrn), user_profiles!generated_by(full_name)'
      )
      .order('created_at', { ascending: false });

    if (historyTypeFilter) q = q.eq('type', historyTypeFilter);
    if (historyPatientFilter)
      q = q.or(
        `patients.first_name.ilike.%${historyPatientFilter}%,patients.last_name.ilike.%${historyPatientFilter}%,patients.mrn.ilike.%${historyPatientFilter}%`
      );

    const { data } = await q.limit(50);
    setDocuments((data as ClinicalDocument[]) || []);
    setHistoryLoading(false);
  }, [historyTypeFilter, historyPatientFilter]);

  useEffect(() => {
    if (tab === 'history') fetchDocuments();
  }, [tab, fetchDocuments]);

  // ─── Build content_json from current form ──────────────────────────────────

  function buildContentJson(): Record<string, unknown> {
    switch (selectedType) {
      case 'DISCHARGE_SUMMARY':
        return { ...dischargeSummary };
      case 'MEDICAL_CERT':
        return { ...medicalCert };
      case 'PRESCRIPTION_PRINT': {
        const selected = patientPrescriptions.filter((p) =>
          prescriptionFields.selected_prescriptions.includes(p.id)
        );
        return { ...prescriptionFields, medications: selected };
      }
      case 'REFERRAL_LETTER':
        return { ...referralFields };
      case 'SICK_LEAVE':
      case 'IMAGING_REPORT':
        return { ...sickLeaveFields };
      default:
        return {};
    }
  }

  function getDocTitle(): string {
    if (!selectedType) return '';
    const conf = DOC_TYPE_CONFIG[selectedType];
    const patName = selectedPatient
      ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
      : '';
    return `${conf.label} — ${patName}`;
  }

  function getSelectedDoctorId(): string | null {
    if (!selectedType) return null;
    switch (selectedType) {
      case 'DISCHARGE_SUMMARY':
        return dischargeSummary.responsible_doctor || null;
      case 'MEDICAL_CERT':
        return medicalCert.signing_doctor || null;
      case 'PRESCRIPTION_PRINT':
        return prescriptionFields.prescriber_doctor || null;
      case 'REFERRAL_LETTER':
        return referralFields.referring_doctor || null;
      case 'SICK_LEAVE':
      case 'IMAGING_REPORT':
        return sickLeaveFields.signing_doctor || null;
      default:
        return null;
    }
  }

  // ─── Save to DB ─────────────────────────────────────────────────────────────

  async function handleSaveDocument() {
    if (!selectedType || !selectedPatient) return;
    setSaving(true);
    const { data: me } = await supabase.auth.getUser();
    await supabase.from('clinical_documents').insert({
      patient_id: selectedPatient.id,
      type: selectedType,
      title: getDocTitle(),
      content_json: buildContentJson(),
      generated_by: me?.user?.id ?? null,
      professional_id: getSelectedDoctorId(),
      is_valid: true,
    });
    setSaving(false);
    setTab('history');
    setStep(1);
    setSelectedType(null);
    setSelectedPatient(null);
    setPatientSearch('');
  }

  // ─── Invalidate document ─────────────────────────────────────────────────────

  async function handleInvalidate(id: string) {
    await supabase
      .from('clinical_documents')
      .update({ is_valid: false })
      .eq('id', id);
    fetchDocuments();
  }

  // ─── Document Preview Renderer ───────────────────────────────────────────────

  function renderDocumentBody() {
    if (!selectedType) return null;
    const content = buildContentJson();

    switch (selectedType) {
      case 'DISCHARGE_SUMMARY': {
        const d = content as unknown as DischargeSummaryFields;
        return (
          <div>
            <Row label="Diagnóstico Principal" value={d.main_diagnosis} />
            <Row label="Diagnósticos Secundarios" value={d.secondary_diagnoses} />
            <Row label="Resumen de Hospitalización" value={d.hospitalization_summary} />
            <Row label="Procedimientos Realizados" value={d.procedures_performed} />
            <Row label="Condición al Alta" value={d.discharge_condition} />
            <Row label="Medicación al Alta" value={d.discharge_medications} />
            <Row label="Indicaciones al Egreso" value={d.home_instructions} />
            <Row label="Próxima Consulta" value={formatDate(d.next_appointment)} />
          </div>
        );
      }
      case 'MEDICAL_CERT': {
        const d = content as unknown as MedicalCertFields;
        return (
          <div>
            <Row label="Tipo de Certificado" value={d.cert_type} />
            <Row label="Diagnóstico" value={d.diagnosis} />
            <Row label="Observaciones" value={d.observations} />
            <Row label="Válido Desde" value={formatDate(d.valid_from)} />
            <Row label="Válido Hasta" value={formatDate(d.valid_until)} />
          </div>
        );
      }
      case 'PRESCRIPTION_PRINT': {
        const selected = patientPrescriptions.filter((p) =>
          prescriptionFields.selected_prescriptions.includes(p.id)
        );
        return (
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#222',
                marginBottom: 10,
                borderBottom: '1px solid #ddd',
                paddingBottom: 6,
              }}
            >
              MEDICAMENTOS PRESCRITOS
            </div>
            {selected.map((p, i) => (
              <div
                key={p.id}
                style={{
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: '1px dashed #eee',
                }}
              >
                <div style={{ fontWeight: 700, color: '#111', fontSize: 14 }}>
                  {i + 1}. {p.medication_name}
                </div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 3 }}>
                  {p.dose && `Dosis: ${p.dose}`}
                  {p.route && ` · Vía: ${p.route}`}
                  {p.frequency && ` · Frecuencia: ${p.frequency}`}
                  {p.duration_days && ` · Duración: ${p.duration_days} días`}
                </div>
                {p.instructions && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                    Instrucciones: {p.instructions}
                  </div>
                )}
              </div>
            ))}
            {prescriptionFields.prescriber_notes && (
              <Row label="Notas del Prescriptor" value={prescriptionFields.prescriber_notes} />
            )}
          </div>
        );
      }
      case 'REFERRAL_LETTER': {
        const d = content as unknown as ReferralFields;
        return (
          <div>
            <Row label="Derivado a Especialidad" value={d.specialty_to} />
            <Row label="Centro de Referencia" value={d.center_name} />
            <Row label="Urgencia" value={d.urgency} />
            <Row label="Motivo de Derivación" value={d.reason} />
            <Row label="Historia Clínica Resumida" value={d.clinical_summary} />
          </div>
        );
      }
      case 'SICK_LEAVE':
      case 'IMAGING_REPORT': {
        const d = content as unknown as SickLeaveFields;
        return (
          <div>
            <Row label="Días de Reposo" value={d.rest_days} />
            <Row label="Motivo" value={d.reason} />
            <Row label="Actividades Restringidas" value={d.restricted_activities} />
            <Row label="Fecha Inicio" value={formatDate(d.start_date)} />
            <Row label="Fecha Fin" value={formatDate(d.end_date)} />
          </div>
        );
      }
      default:
        return null;
    }
  }

  function getDoctorNameForPreview(): string {
    switch (selectedType) {
      case 'DISCHARGE_SUMMARY': {
        const prof = professionals.find(
          (p) => p.id === dischargeSummary.responsible_doctor
        );
        return prof ? prof.full_name : '________________________________';
      }
      case 'MEDICAL_CERT': {
        const prof = professionals.find(
          (p) => p.id === medicalCert.signing_doctor
        );
        return prof ? prof.full_name : '________________________________';
      }
      case 'PRESCRIPTION_PRINT': {
        const prof = professionals.find(
          (p) => p.id === prescriptionFields.prescriber_doctor
        );
        return prof ? prof.full_name : '________________________________';
      }
      case 'REFERRAL_LETTER': {
        const prof = professionals.find(
          (p) => p.id === referralFields.referring_doctor
        );
        return prof ? prof.full_name : '________________________________';
      }
      case 'SICK_LEAVE':
      case 'IMAGING_REPORT': {
        const prof = professionals.find(
          (p) => p.id === sickLeaveFields.signing_doctor
        );
        return prof ? prof.full_name : '________________________________';
      }
      default:
        return '________________________________';
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{PRINT_STYLE}</style>

      <div className="animate-fade-in">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
          className="no-print"
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Documentos Clínicos
            </h1>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
              Epicrisis · Certificados · Recetas · Referencias · Bajas Médicas
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: 'rgba(33,150,243,0.1)',
              border: '1px solid rgba(33,150,243,0.25)',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>📄</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#2196F3',
              }}
            >
              FARO HIS v3.0
            </span>
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
        <div
          className="tab-bar no-print"
          style={{ marginBottom: 24, width: 'fit-content' }}
        >
          {[
            { id: 'generate', label: 'Generar Documento' },
            { id: 'history', label: 'Historial de Documentos' },
          ].map((t) => (
            <div
              key={t.id}
              className={`tab-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => {
                setTab(t.id as typeof tab);
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: GENERATE
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'generate' && (
          <div className="no-print">
            {/* Wizard progress bar */}
            <WizardProgress step={step} />

            {/* ── STEP 1: Select Document Type ── */}
            {step === 1 && (
              <div className="animate-fade-in">
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}
                >
                  Seleccionar Tipo de Documento
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    marginBottom: 20,
                  }}
                >
                  Elige el tipo de documento clínico que deseas generar.
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                  }}
                >
                  {(
                    Object.keys(DOC_TYPE_CONFIG) as DocumentType[]
                  ).map((type) => {
                    const conf = DOC_TYPE_CONFIG[type];
                    const isSelected = selectedType === type;
                    return (
                      <div
                        key={type}
                        className="metric-card"
                        onClick={() => {
                          setSelectedType(type);
                          setStep(2);
                        }}
                        style={{
                          cursor: 'pointer',
                          border: isSelected
                            ? `2px solid ${conf.color}`
                            : '1px solid var(--border-primary)',
                          boxShadow: isSelected
                            ? `0 0 16px ${conf.color}40`
                            : undefined,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 12 }}>
                          {conf.icon}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: 6,
                          }}
                        >
                          {conf.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            lineHeight: 1.5,
                          }}
                        >
                          {conf.description}
                        </div>
                        <div
                          style={{
                            marginTop: 14,
                            display: 'inline-block',
                            padding: '3px 10px',
                            background: `${conf.color}18`,
                            color: conf.color,
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {type}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 2: Select Patient ── */}
            {step === 2 && (
              <div className="animate-fade-in" style={{ maxWidth: 680 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}
                >
                  Seleccionar Paciente
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    marginBottom: 20,
                  }}
                >
                  Busca por nombre o MRN para encontrar al paciente.
                </div>

                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Icon
                    name="Search"
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    className="input-field"
                    style={{ paddingLeft: 36 }}
                    placeholder="Buscar paciente por nombre o MRN..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                </div>

                {patients.length > 0 && !selectedPatient && (
                  <div
                    className="glass-card"
                    style={{ overflow: 'hidden', marginBottom: 16 }}
                  >
                    {patients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch(`${p.first_name} ${p.last_name}`);
                          setPatients([]);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom:
                            '1px solid var(--border-secondary)',
                          transition: 'background 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            'rgba(30,136,229,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            'transparent';
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'rgba(30,136,229,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                        >
                          👤
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              fontSize: 13,
                            }}
                          >
                            {p.first_name} {p.last_name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                            }}
                          >
                            MRN: {p.mrn}
                            {p.birth_date &&
                              ` · Nac: ${formatDate(p.birth_date)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPatient && (
                  <PatientCard
                    patient={selectedPatient}
                    onClear={() => {
                      setSelectedPatient(null);
                      setPatientSearch('');
                    }}
                  />
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button
                    className="btn-ghost"
                    onClick={() => setStep(1)}
                  >
                    <Icon name="ChevronLeft" size={14} />
                    Volver
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!selectedPatient}
                    onClick={() => setStep(3)}
                  >
                    Siguiente
                    <Icon name="ChevronRight" size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Fill Content ── */}
            {step === 3 && selectedType && (
              <div className="animate-fade-in">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 22 }}>
                    {DOC_TYPE_CONFIG[selectedType].icon}
                  </span>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {DOC_TYPE_CONFIG[selectedType].label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    marginBottom: 20,
                  }}
                >
                  Complete todos los campos del documento.
                </div>

                <div className="glass-card" style={{ padding: 28, maxWidth: 800 }}>
                  {selectedType === 'DISCHARGE_SUMMARY' && (
                    <DischargeSummaryForm
                      form={dischargeSummary}
                      setForm={setDischargeSummary}
                      professionals={professionals}
                    />
                  )}
                  {selectedType === 'MEDICAL_CERT' && (
                    <MedicalCertForm
                      form={medicalCert}
                      setForm={setMedicalCert}
                      professionals={professionals}
                    />
                  )}
                  {selectedType === 'PRESCRIPTION_PRINT' && (
                    <PrescriptionForm
                      form={prescriptionFields}
                      setForm={setPrescriptionFields}
                      prescriptions={patientPrescriptions}
                      professionals={professionals}
                    />
                  )}
                  {selectedType === 'REFERRAL_LETTER' && (
                    <ReferralForm
                      form={referralFields}
                      setForm={setReferralFields}
                      professionals={professionals}
                    />
                  )}
                  {(selectedType === 'SICK_LEAVE' ||
                    selectedType === 'IMAGING_REPORT') && (
                    <SickLeaveForm
                      form={sickLeaveFields}
                      setForm={setSickLeaveFields}
                      professionals={professionals}
                      label={
                        selectedType === 'SICK_LEAVE'
                          ? 'Baja Médica'
                          : 'Informe Radiológico'
                      }
                    />
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button
                    className="btn-ghost"
                    onClick={() => setStep(2)}
                  >
                    <Icon name="ChevronLeft" size={14} />
                    Volver
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => setStep(4)}
                  >
                    Vista Previa
                    <Icon name="Eye" size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Preview + Generate ── */}
            {step === 4 && selectedType && selectedPatient && (
              <div className="animate-fade-in">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: 4,
                      }}
                    >
                      Vista Previa del Documento
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                      }}
                    >
                      Revisa el documento antes de imprimir o guardar.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => setStep(3)}
                    >
                      <Icon name="PenLine" size={14} />
                      Volver a Editar
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => window.print()}
                      style={{
                        borderColor: 'rgba(33,150,243,0.4)',
                        color: '#42A5F5',
                      }}
                    >
                      <Icon name="Printer" size={14} />
                      Imprimir / Exportar PDF
                    </button>
                    <button
                      className="btn-primary"
                      disabled={saving}
                      onClick={handleSaveDocument}
                    >
                      {saving ? (
                        <Icon
                          name="Loader2"
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <Icon name="Save" size={14} />
                      )}
                      {saving ? 'Guardando...' : 'Guardar en Historial'}
                    </button>
                  </div>
                </div>

                {/* A4 Preview */}
                <div style={{ overflowX: 'auto' }}>
                  <div
                    id="doc-preview"
                    style={{
                      background: 'white',
                      color: '#111',
                      padding: 48,
                      width: 794,
                      minHeight: 1123,
                      margin: '0 auto',
                      boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
                      borderRadius: 4,
                      fontFamily: "'Inter', sans-serif",
                      position: 'relative',
                    }}
                  >
                    {/* Letterhead */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 24,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            background:
                              'linear-gradient(135deg, #1E88E5, #00BCD4)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          🏥 HOSPITAL SAN JUAN DE DIOS
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#666',
                            marginTop: 2,
                            letterSpacing: '0.08em',
                          }}
                        >
                          PROJECT FARO HIS v3.0 · Sistema de Información
                          Hospitalaria
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#888' }}>
                          Fecha de emisión
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#333',
                          }}
                        >
                          {formatDate(new Date().toISOString())}
                        </div>
                      </div>
                    </div>

                    {/* Separator */}
                    <div
                      style={{
                        height: 3,
                        background:
                          'linear-gradient(90deg, #1E88E5, #00BCD4, #1E88E5)',
                        borderRadius: 2,
                        marginBottom: 24,
                      }}
                    />

                    {/* Document Type Title */}
                    <div
                      style={{
                        textAlign: 'center',
                        marginBottom: 24,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: '#1a1a1a',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {DOC_TYPE_CONFIG[selectedType].icon}{' '}
                        {DOC_TYPE_CONFIG[selectedType].label}
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div
                      style={{
                        background: '#f8faff',
                        border: '1px solid #e0e8f0',
                        borderRadius: 8,
                        padding: '14px 18px',
                        marginBottom: 24,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px 20px',
                      }}
                    >
                      <InfoField
                        label="Nombre del Paciente"
                        value={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
                      />
                      <InfoField
                        label="MRN"
                        value={selectedPatient.mrn}
                      />
                      <InfoField
                        label="Fecha de Nacimiento"
                        value={formatDate(selectedPatient.birth_date)}
                      />
                      <InfoField
                        label="Seguro Médico"
                        value={selectedPatient.insurance_plan || '—'}
                      />
                    </div>

                    {/* Document Body */}
                    <div style={{ marginBottom: 40 }}>
                      {renderDocumentBody()}
                    </div>

                    {/* Footer */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 48,
                        left: 48,
                        right: 48,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 24,
                          alignItems: 'flex-end',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#333',
                              marginBottom: 4,
                            }}
                          >
                            Médico Responsable
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#111',
                              marginBottom: 24,
                            }}
                          >
                            {getDoctorNameForPreview()}
                          </div>
                          <div
                            style={{
                              borderTop: '1px solid #333',
                              paddingTop: 4,
                              fontSize: 10,
                              color: '#666',
                            }}
                          >
                            Firma y Sello del Médico
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#888',
                              marginBottom: 4,
                            }}
                          >
                            HOSPITAL SAN JUAN DE DIOS
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#888',
                            }}
                          >
                            Documento generado por FARO HIS v3.0
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: '#bbb',
                              marginTop: 2,
                            }}
                          >
                            Este documento es válido con firma y sello del
                            médico
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: HISTORY
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <div className="animate-fade-in no-print">
            {/* Filters */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 200px' }}>
                <select
                  className="input-field"
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  {(Object.keys(DOC_TYPE_CONFIG) as DocumentType[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {DOC_TYPE_CONFIG[t].label}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div style={{ flex: '1 1 240px', position: 'relative' }}>
                <Icon
                  name="Search"
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  className="input-field"
                  style={{ paddingLeft: 36 }}
                  placeholder="Filtrar por paciente..."
                  value={historyPatientFilter}
                  onChange={(e) => setHistoryPatientFilter(e.target.value)}
                />
              </div>
              <button className="btn-ghost" onClick={fetchDocuments}>
                <Icon name="RefreshCw" size={14} />
                Actualizar
              </button>
            </div>

            <div className="glass-card" style={{ overflow: 'hidden' }}>
              {historyLoading ? (
                <div
                  style={{
                    padding: 60,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Icon
                    name="Loader2"
                    size={28}
                    className="animate-spin"
                    style={{ display: 'block', margin: '0 auto 12px' }}
                  />
                  Cargando documentos...
                </div>
              ) : documents.length === 0 ? (
                <div
                  style={{
                    padding: 60,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Icon
                    name="FileOutput"
                    size={40}
                    style={{
                      opacity: 0.3,
                      display: 'block',
                      margin: '0 auto 12px',
                    }}
                  />
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    No hay documentos registrados
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    Genera tu primer documento usando el wizard.
                  </div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>Tipo</th>
                      <th>Título</th>
                      <th>Generado por</th>
                      <th>Fecha</th>
                      <th>Firmado</th>
                      <th>Válido</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => {
                      const color =
                        DOC_TYPE_BADGE_COLORS[doc.type] || '#607D8B';
                      const typeConf =
                        DOC_TYPE_CONFIG[doc.type as DocumentType];
                      return (
                        <tr key={doc.id}>
                          <td>
                            {doc.patients ? (
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {doc.patients.first_name}{' '}
                                  {doc.patients.last_name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--text-muted)',
                                    fontFamily: 'JetBrains Mono, monospace',
                                  }}
                                >
                                  {doc.patients.mrn}
                                </div>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: `${color}18`,
                                color,
                                borderColor: `${color}35`,
                              }}
                            >
                              {typeConf?.icon} {typeConf?.label || doc.type}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {doc.title}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--text-muted)',
                              }}
                            >
                              {doc.user_profiles?.full_name || '—'}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 11,
                                color: 'var(--text-muted)',
                              }}
                            >
                              {new Date(doc.created_at).toLocaleDateString(
                                'es-ES',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </span>
                          </td>
                          <td>
                            {doc.signed_at ? (
                              <span
                                style={{
                                  color: '#4CAF50',
                                  fontSize: 16,
                                }}
                                title={`Firmado: ${formatDate(doc.signed_at)}`}
                              >
                                ✅
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>
                                —
                              </span>
                            )}
                          </td>
                          <td>
                            {doc.is_valid ? (
                              <span
                                className="badge badge-active"
                                style={{ fontSize: 10 }}
                              >
                                Válido
                              </span>
                            ) : (
                              <span
                                className="badge badge-error"
                                style={{ fontSize: 10 }}
                              >
                                Anulado
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn-ghost"
                                style={{ padding: '4px 10px', fontSize: 11 }}
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <Icon name="Eye" size={12} />
                                Vista Previa
                              </button>
                              {doc.is_valid && (
                                <button
                                  className="btn-danger"
                                  style={{ padding: '4px 10px', fontSize: 11 }}
                                  onClick={() => handleInvalidate(doc.id)}
                                >
                                  <Icon name="XCircle" size={12} />
                                  Invalidar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── History Preview Modal ──────────────────────────────────────────── */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,10,20,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 24,
            overflowY: 'auto',
            paddingTop: '5vh',
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{ padding: 28, width: '100%', maxWidth: 600, marginBottom: '5vh' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="FileText" size={18} style={{ color: '#2196F3' }} />
                {previewDoc.title}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 16,
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <span>
                Paciente:{' '}
                {previewDoc.patients
                  ? `${previewDoc.patients.first_name} ${previewDoc.patients.last_name} (${previewDoc.patients.mrn})`
                  : '—'}
              </span>
              <span>
                Fecha:{' '}
                {new Date(previewDoc.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                padding: 16,
                maxHeight: 400,
                overflowY: 'auto',
              }}
            >
              <pre
                style={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(previewDoc.content_json, null, 2)}
              </pre>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-ghost"
                onClick={() => setPreviewDoc(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function WizardProgress({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Tipo' },
    { n: 2, label: 'Paciente' },
    { n: 3, label: 'Contenido' },
    { n: 4, label: 'Vista Previa' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 28,
        gap: 0,
      }}
    >
      {steps.map((s, idx) => {
        const done = step > s.n;
        const active = step === s.n;
        const color = active ? '#1E88E5' : done ? '#4CAF50' : 'var(--text-muted)';
        return (
          <div
            key={s.n}
            style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length - 1 ? 1 : 'none' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: active
                    ? 'linear-gradient(135deg,#1E88E5,#00BCD4)'
                    : done
                    ? '#4CAF5022'
                    : 'var(--bg-surface)',
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: active ? 'white' : done ? '#4CAF50' : 'var(--text-muted)',
                  transition: 'all 0.3s ease',
                  boxShadow: active ? '0 0 12px rgba(30,136,229,0.4)' : 'none',
                }}
              >
                {done ? '✓' : s.n}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: done
                    ? 'linear-gradient(90deg,#4CAF50,#1E88E5)'
                    : 'var(--border-secondary)',
                  marginBottom: 18,
                  marginLeft: 4,
                  marginRight: 4,
                  transition: 'background 0.3s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PatientCard({
  patient,
  onClear,
}: {
  patient: Patient;
  onClear: () => void;
}) {
  return (
    <div
      className="glass-card"
      style={{ padding: 20, marginBottom: 8 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(30,136,229,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {patient.first_name} {patient.last_name}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              <InfoChip label="MRN" value={patient.mrn} />
              <InfoChip
                label="Nac."
                value={formatDate(patient.birth_date)}
              />
              <InfoChip
                label="Seguro"
                value={patient.insurance_plan || '—'}
              />
              {patient.primary_physician && (
                <InfoChip
                  label="Médico Tratante"
                  value={patient.primary_physician}
                />
              )}
            </div>
          </div>
        </div>
        <button
          className="btn-ghost"
          style={{ padding: '4px 10px', fontSize: 11 }}
          onClick={onClear}
        >
          <Icon name="X" size={12} />
          Cambiar
        </button>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
      <span style={{ fontWeight: 600 }}>{label}:</span>{' '}
      <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: '1px solid #eef2f7',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#222',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Form Components ──────────────────────────────────────────────────────────

function DischargeSummaryForm({
  form,
  setForm,
  professionals,
}: {
  form: DischargeSummaryFields;
  setForm: React.Dispatch<React.SetStateAction<DischargeSummaryFields>>;
  professionals: Professional[];
}) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  const specialtiesList = Array.from(
    new Set(professionals.map((p) => p.specialty).filter((s): s is string => !!s))
  ).sort();
  const hasDoctorsWithoutSpecialty = professionals.some((p) => !p.specialty);

  const filteredProfessionals = professionals.filter((p) => {
    if (selectedSpecialty === 'ALL') return true;
    if (selectedSpecialty === 'NONE') return !p.specialty;
    return p.specialty === selectedSpecialty;
  });

  useEffect(() => {
    if (form.responsible_doctor && professionals.length > 0 && selectedSpecialty === 'ALL') {
      const doc = professionals.find((p) => p.id === form.responsible_doctor);
      if (doc?.specialty) {
        setSelectedSpecialty(doc.specialty);
      } else if (doc && !doc.specialty) {
        setSelectedSpecialty('NONE');
      }
    }
  }, [form.responsible_doctor, professionals]);

  const handleSpecialtyChange = (val: string) => {
    setSelectedSpecialty(val);
    if (form.responsible_doctor) {
      const doc = professionals.find((p) => p.id === form.responsible_doctor);
      if (doc) {
        const docSpec = doc.specialty || 'NONE';
        if (val !== 'ALL' && docSpec !== val) {
          setForm((f) => ({ ...f, responsible_doctor: '' }));
        }
      }
    }
  };

  const set = (k: keyof DischargeSummaryFields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>Diagnóstico Principal *</Label>
        <input
          className="input-field"
          value={form.main_diagnosis}
          onChange={set('main_diagnosis')}
          placeholder="Diagnóstico principal de egreso..."
        />
      </div>
      <div>
        <Label>Diagnósticos Secundarios</Label>
        <textarea
          className="input-field"
          rows={2}
          value={form.secondary_diagnoses}
          onChange={set('secondary_diagnoses')}
          placeholder="Comorbilidades y diagnósticos adicionales..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div>
        <Label>Resumen de Hospitalización *</Label>
        <textarea
          className="input-field"
          rows={4}
          value={form.hospitalization_summary}
          onChange={set('hospitalization_summary')}
          placeholder="Descripción del curso clínico durante la hospitalización..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div>
        <Label>Procedimientos Realizados</Label>
        <textarea
          className="input-field"
          rows={2}
          value={form.procedures_performed}
          onChange={set('procedures_performed')}
          placeholder="Cirugías, procedimientos diagnósticos, intervenciones..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Condición al Alta *</Label>
          <select
            className="input-field"
            value={form.discharge_condition}
            onChange={set('discharge_condition')}
          >
            {['Mejorado', 'Estable', 'Sin cambios', 'Fallecido'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Fecha Próxima Consulta</Label>
          <input
            type="date"
            className="input-field"
            value={form.next_appointment}
            onChange={set('next_appointment')}
          />
        </div>
      </div>
      <div>
        <Label>Medicación al Alta</Label>
        <textarea
          className="input-field"
          rows={2}
          value={form.discharge_medications}
          onChange={set('discharge_medications')}
          placeholder="Medicamentos recetados para continuar en casa..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div>
        <Label>Indicaciones y Cuidados en Casa</Label>
        <textarea
          className="input-field"
          rows={2}
          value={form.home_instructions}
          onChange={set('home_instructions')}
          placeholder="Indicaciones de cuidado, dieta, restricciones de actividad..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Especialidad del Médico</Label>
          <select
            className="input-field"
            value={selectedSpecialty}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
          >
            <option value="ALL">Todas las especialidades</option>
            {specialtiesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {hasDoctorsWithoutSpecialty && (
              <option value="NONE">Sin Especialidad / Medicina General</option>
            )}
          </select>
        </div>
        <div>
          <Label>Médico Responsable *</Label>
          <select
            className="input-field"
            value={form.responsible_doctor}
            onChange={set('responsible_doctor')}
          >
            <option value="">Seleccionar médico...</option>
            {filteredProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function MedicalCertForm({
  form,
  setForm,
  professionals,
}: {
  form: MedicalCertFields;
  setForm: React.Dispatch<React.SetStateAction<MedicalCertFields>>;
  professionals: Professional[];
}) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  const specialtiesList = Array.from(
    new Set(professionals.map((p) => p.specialty).filter((s): s is string => !!s))
  ).sort();
  const hasDoctorsWithoutSpecialty = professionals.some((p) => !p.specialty);

  const filteredProfessionals = professionals.filter((p) => {
    if (selectedSpecialty === 'ALL') return true;
    if (selectedSpecialty === 'NONE') return !p.specialty;
    return p.specialty === selectedSpecialty;
  });

  useEffect(() => {
    if (form.signing_doctor && professionals.length > 0 && selectedSpecialty === 'ALL') {
      const doc = professionals.find((p) => p.id === form.signing_doctor);
      if (doc?.specialty) {
        setSelectedSpecialty(doc.specialty);
      } else if (doc && !doc.specialty) {
        setSelectedSpecialty('NONE');
      }
    }
  }, [form.signing_doctor, professionals]);

  const handleSpecialtyChange = (val: string) => {
    setSelectedSpecialty(val);
    if (form.signing_doctor) {
      const doc = professionals.find((p) => p.id === form.signing_doctor);
      if (doc) {
        const docSpec = doc.specialty || 'NONE';
        if (val !== 'ALL' && docSpec !== val) {
          setForm((f) => ({ ...f, signing_doctor: '' }));
        }
      }
    }
  };

  const set = (k: keyof MedicalCertFields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>Tipo de Certificado *</Label>
        <select
          className="input-field"
          value={form.cert_type}
          onChange={set('cert_type')}
        >
          {['Asistencia', 'Diagnóstico', 'Aptitud física', 'Reposo'].map(
            (c) => (
              <option key={c}>{c}</option>
            )
          )}
        </select>
      </div>
      <div>
        <Label>Diagnóstico *</Label>
        <input
          className="input-field"
          value={form.diagnosis}
          onChange={set('diagnosis')}
          placeholder="Diagnóstico o motivo de certificación..."
        />
      </div>
      <div>
        <Label>Observaciones</Label>
        <textarea
          className="input-field"
          rows={3}
          value={form.observations}
          onChange={set('observations')}
          placeholder="Observaciones clínicas adicionales..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Válido Desde</Label>
          <input
            type="date"
            className="input-field"
            value={form.valid_from}
            onChange={set('valid_from')}
          />
        </div>
        <div>
          <Label>Válido Hasta</Label>
          <input
            type="date"
            className="input-field"
            value={form.valid_until}
            onChange={set('valid_until')}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Especialidad del Médico</Label>
          <select
            className="input-field"
            value={selectedSpecialty}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
          >
            <option value="ALL">Todas las especialidades</option>
            {specialtiesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {hasDoctorsWithoutSpecialty && (
              <option value="NONE">Sin Especialidad / Medicina General</option>
            )}
          </select>
        </div>
        <div>
          <Label>Médico Firmante *</Label>
          <select
            className="input-field"
            value={form.signing_doctor}
            onChange={set('signing_doctor')}
          >
            <option value="">Seleccionar médico...</option>
            {filteredProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function PrescriptionForm({
  form,
  setForm,
  prescriptions,
  professionals,
}: {
  form: PrescriptionFields;
  setForm: React.Dispatch<React.SetStateAction<PrescriptionFields>>;
  prescriptions: Prescription[];
  professionals: Professional[];
}) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  const specialtiesList = Array.from(
    new Set(professionals.map((p) => p.specialty).filter((s): s is string => !!s))
  ).sort();
  const hasDoctorsWithoutSpecialty = professionals.some((p) => !p.specialty);

  const filteredProfessionals = professionals.filter((p) => {
    if (selectedSpecialty === 'ALL') return true;
    if (selectedSpecialty === 'NONE') return !p.specialty;
    return p.specialty === selectedSpecialty;
  });

  useEffect(() => {
    if (form.prescriber_doctor && professionals.length > 0 && selectedSpecialty === 'ALL') {
      const doc = professionals.find((p) => p.id === form.prescriber_doctor);
      if (doc?.specialty) {
        setSelectedSpecialty(doc.specialty);
      } else if (doc && !doc.specialty) {
        setSelectedSpecialty('NONE');
      }
    }
  }, [form.prescriber_doctor, professionals]);

  const handleSpecialtyChange = (val: string) => {
    setSelectedSpecialty(val);
    if (form.prescriber_doctor) {
      const doc = professionals.find((p) => p.id === form.prescriber_doctor);
      if (doc) {
        const docSpec = doc.specialty || 'NONE';
        if (val !== 'ALL' && docSpec !== val) {
          setForm((f) => ({ ...f, prescriber_doctor: '' }));
        }
      }
    }
  };

  const togglePrescription = (id: string) => {
    setForm((f) => ({
      ...f,
      selected_prescriptions: f.selected_prescriptions.includes(id)
        ? f.selected_prescriptions.filter((x) => x !== id)
        : [...f.selected_prescriptions, id],
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>Prescripciones Activas del Paciente</Label>
        {prescriptions.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              border: '1px dashed var(--border-secondary)',
            }}
          >
            No se encontraron prescripciones activas para este paciente.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {prescriptions.map((p) => {
              const isSelected = form.selected_prescriptions.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePrescription(p.id)}
                  style={{
                    padding: '12px 16px',
                    border: isSelected
                      ? '1px solid rgba(255,152,0,0.5)'
                      : '1px solid var(--border-secondary)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isSelected
                      ? 'rgba(255,152,0,0.08)'
                      : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: isSelected
                        ? 'none'
                        : '2px solid var(--text-muted)',
                      background: isSelected ? '#FF9800' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 11,
                    }}
                  >
                    {isSelected && '✓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    >
                      💊 {p.medication_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {[
                        p.dose && `${p.dose}`,
                        p.route && `Vía: ${p.route}`,
                        p.frequency && `${p.frequency}`,
                        p.duration_days && `${p.duration_days} días`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <Label>Notas Adicionales del Prescriptor</Label>
        <textarea
          className="input-field"
          rows={2}
          value={form.prescriber_notes}
          onChange={(e) =>
            setForm((f) => ({ ...f, prescriber_notes: e.target.value }))
          }
          placeholder="Instrucciones especiales, interacciones a monitorizar..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Especialidad del Médico</Label>
          <select
            className="input-field"
            value={selectedSpecialty}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
          >
            <option value="ALL">Todas las especialidades</option>
            {specialtiesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {hasDoctorsWithoutSpecialty && (
              <option value="NONE">Sin Especialidad / Medicina General</option>
            )}
          </select>
        </div>
        <div>
          <Label>Médico Prescriptor *</Label>
          <select
            className="input-field"
            value={form.prescriber_doctor}
            onChange={(e) =>
              setForm((f) => ({ ...f, prescriber_doctor: e.target.value }))
            }
          >
            <option value="">Seleccionar médico...</option>
            {filteredProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function ReferralForm({
  form,
  setForm,
  professionals,
}: {
  form: ReferralFields;
  setForm: React.Dispatch<React.SetStateAction<ReferralFields>>;
  professionals: Professional[];
}) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  const specialtiesList = Array.from(
    new Set(professionals.map((p) => p.specialty).filter((s): s is string => !!s))
  ).sort();
  const hasDoctorsWithoutSpecialty = professionals.some((p) => !p.specialty);

  const filteredProfessionals = professionals.filter((p) => {
    if (selectedSpecialty === 'ALL') return true;
    if (selectedSpecialty === 'NONE') return !p.specialty;
    return p.specialty === selectedSpecialty;
  });

  useEffect(() => {
    if (form.referring_doctor && professionals.length > 0 && selectedSpecialty === 'ALL') {
      const doc = professionals.find((p) => p.id === form.referring_doctor);
      if (doc?.specialty) {
        setSelectedSpecialty(doc.specialty);
      } else if (doc && !doc.specialty) {
        setSelectedSpecialty('NONE');
      }
    }
  }, [form.referring_doctor, professionals]);

  const handleSpecialtyChange = (val: string) => {
    setSelectedSpecialty(val);
    if (form.referring_doctor) {
      const doc = professionals.find((p) => p.id === form.referring_doctor);
      if (doc) {
        const docSpec = doc.specialty || 'NONE';
        if (val !== 'ALL' && docSpec !== val) {
          setForm((f) => ({ ...f, referring_doctor: '' }));
        }
      }
    }
  };

  const set = (k: keyof ReferralFields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const specialties = [
    'Cardiología', 'Neurología', 'Oncología', 'Traumatología', 'Cirugía General',
    'Ginecología', 'Pediatría', 'Psiquiatría', 'Nefrología', 'Gastroenterología',
    'Dermatología', 'Oftalmología', 'Neumología', 'Endocrinología', 'Reumatología',
    'Urología', 'ORL', 'Hematología', 'Geriatría',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Especialidad de Destino *</Label>
          <select
            className="input-field"
            value={form.specialty_to}
            onChange={set('specialty_to')}
          >
            <option value="">Seleccionar especialidad...</option>
            {specialties.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Urgencia *</Label>
          <select
            className="input-field"
            value={form.urgency}
            onChange={set('urgency')}
          >
            {['Electiva', 'Preferente', 'Urgente'].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label>Centro / Nombre del Centro Receptor</Label>
        <input
          className="input-field"
          value={form.center_name}
          onChange={set('center_name')}
          placeholder="Nombre del hospital o centro médico de destino..."
        />
      </div>
      <div>
        <Label>Motivo de Derivación *</Label>
        <textarea
          className="input-field"
          rows={3}
          value={form.reason}
          onChange={set('reason')}
          placeholder="Motivo clínico que justifica la derivación..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div>
        <Label>Historia Clínica Resumida</Label>
        <textarea
          className="input-field"
          rows={3}
          value={form.clinical_summary}
          onChange={set('clinical_summary')}
          placeholder="Resumen de antecedentes, evolución y tratamiento actual..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Especialidad del Médico</Label>
          <select
            className="input-field"
            value={selectedSpecialty}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
          >
            <option value="ALL">Todas las especialidades</option>
            {specialtiesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {hasDoctorsWithoutSpecialty && (
              <option value="NONE">Sin Especialidad / Medicina General</option>
            )}
          </select>
        </div>
        <div>
          <Label>Médico que Deriva *</Label>
          <select
            className="input-field"
            value={form.referring_doctor}
            onChange={set('referring_doctor')}
          >
            <option value="">Seleccionar médico...</option>
            {filteredProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SickLeaveForm({
  form,
  setForm,
  professionals,
  label,
}: {
  form: SickLeaveFields;
  setForm: React.Dispatch<React.SetStateAction<SickLeaveFields>>;
  professionals: Professional[];
  label: string;
}) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');

  const specialtiesList = Array.from(
    new Set(professionals.map((p) => p.specialty).filter((s): s is string => !!s))
  ).sort();
  const hasDoctorsWithoutSpecialty = professionals.some((p) => !p.specialty);

  const filteredProfessionals = professionals.filter((p) => {
    if (selectedSpecialty === 'ALL') return true;
    if (selectedSpecialty === 'NONE') return !p.specialty;
    return p.specialty === selectedSpecialty;
  });

  useEffect(() => {
    if (form.signing_doctor && professionals.length > 0 && selectedSpecialty === 'ALL') {
      const doc = professionals.find((p) => p.id === form.signing_doctor);
      if (doc?.specialty) {
        setSelectedSpecialty(doc.specialty);
      } else if (doc && !doc.specialty) {
        setSelectedSpecialty('NONE');
      }
    }
  }, [form.signing_doctor, professionals]);

  const handleSpecialtyChange = (val: string) => {
    setSelectedSpecialty(val);
    if (form.signing_doctor) {
      const doc = professionals.find((p) => p.id === form.signing_doctor);
      if (doc) {
        const docSpec = doc.specialty || 'NONE';
        if (val !== 'ALL' && docSpec !== val) {
          setForm((f) => ({ ...f, signing_doctor: '' }));
        }
      }
    }
  };

  const set = (k: keyof SickLeaveFields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>Días de Reposo / Período *</Label>
        <input
          type="number"
          min="1"
          className="input-field"
          value={form.rest_days}
          onChange={set('rest_days')}
          placeholder="Número de días..."
        />
      </div>
      <div>
        <Label>Motivo / Diagnóstico *</Label>
        <input
          className="input-field"
          value={form.reason}
          onChange={set('reason')}
          placeholder={
            label === 'Baja Médica'
              ? 'Diagnóstico que justifica el reposo...'
              : 'Tipo de estudio realizado...'
          }
        />
      </div>
      <div>
        <Label>Actividades Restringidas</Label>
        <textarea
          className="input-field"
          rows={2}
          value={form.restricted_activities}
          onChange={set('restricted_activities')}
          placeholder="Actividades físicas, laborales o sociales que se deben evitar..."
          style={{ resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Fecha Inicio</Label>
          <input
            type="date"
            className="input-field"
            value={form.start_date}
            onChange={set('start_date')}
          />
        </div>
        <div>
          <Label>Fecha Fin</Label>
          <input
            type="date"
            className="input-field"
            value={form.end_date}
            onChange={set('end_date')}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <Label>Especialidad del Médico</Label>
          <select
            className="input-field"
            value={selectedSpecialty}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
          >
            <option value="ALL">Todas las especialidades</option>
            {specialtiesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {hasDoctorsWithoutSpecialty && (
              <option value="NONE">Sin Especialidad / Medicina General</option>
            )}
          </select>
        </div>
        <div>
          <Label>Médico Firmante *</Label>
          <select
            className="input-field"
            value={form.signing_doctor}
            onChange={set('signing_doctor')}
          >
            <option value="">Seleccionar médico...</option>
            {filteredProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

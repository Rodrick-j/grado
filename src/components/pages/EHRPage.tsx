'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit';
import { SAMPLE_ICD11_CODES } from '@/lib/data';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';

type TimelineEvent = {
  id: string;
  date: string;
  time: string;
  type: 'CONSULT' | 'LAB' | 'IMAGING' | 'PHARMACY' | 'APPOINTMENT';
  title: string;
  doctor: string;
  summary: string;
  locked: boolean;
  rawDetails: any;
};

const EVENT_ICONS: Record<string, string> = { 
  CONSULT: 'Stethoscope', 
  LAB: 'FlaskConical', 
  IMAGING: 'ScanLine',
  PHARMACY: 'Pill',
  APPOINTMENT: 'Calendar'
};

const EVENT_COLORS: Record<string, string> = { 
  CONSULT: '#9C27B0', 
  LAB: '#1E88E5', 
  IMAGING: '#607D8B',
  PHARMACY: '#4CAF50',
  APPOINTMENT: '#FF9800'
};

export function EHRPage() {
  const [tab, setTab] = useState<'timeline' | 'consult' | 'rx' | 'bg'>('timeline');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const mrnParam = searchParams.get('mrn');
  const supabase = createClient();
  const { user } = useAuth();

  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Search state if no patient is loaded
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // New consult form state
  const [consultForm, setConsultForm] = useState({
    chief_complaint: '',
    hpi: '',
    physical_exam: '',
    assessment: '',
    plan: '',
    fc: '',
    pas: '',
    pad: '',
    spo2: '',
    temp: '',
    fr: '',
    weight: '',
    height: '',
  });
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<any[]>([]);
  const [dxSearch, setDxSearch] = useState('');
  const [savingConsult, setSavingConsult] = useState(false);

  // New prescription form state
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxForm, setRxForm] = useState({
    drug_name: '',
    dose: '',
    frequency: '',
    duration: '',
    instructions: '',
  });
  const [savingRx, setSavingRx] = useState(false);

  // Add background entry modal state
  const [showBgModal, setShowBgModal] = useState<'allergy' | 'surgery' | 'chronic' | 'medication' | null>(null);
  const [bgInput, setBgInput] = useState({
    name: '',
    reaction: '',
    severity: 'MEDIUM',
    date: '',
    notes: '',
  });
  const [savingBg, setSavingBg] = useState(false);

  const fetchPatientByMrn = useCallback(async (mrn: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('mrn', mrn)
      .single();
    
    if (!error && data) {
      setPatient(data);
      logAuditEvent({
        action: 'EHR_ACCESS',
        resource_type: 'patients',
        resource_id: data.id,
        outcome: 'SUCCESS',
      });
    } else {
      setPatient(null);
    }
    setLoading(false);
  }, [supabase]);

  const fetchAllPatients = useCallback(async () => {
    setSearching(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSearchResults(data);
    }
    setSearching(false);
  }, [supabase]);

  useEffect(() => {
    if (mrnParam) {
      fetchPatientByMrn(mrnParam);
    } else {
      setPatient(null);
      fetchAllPatients();
    }
  }, [mrnParam, fetchPatientByMrn, fetchAllPatients]);

  const fetchTimeline = useCallback(async () => {
    if (!patient) return;
    
    // Fetch clinical records
    const { data: records, error: recordsError } = await supabase
      .from('clinical_records')
      .select(`
        *,
        professionals:professionals!professional_id (
          title,
          user_profiles:user_profiles!user_id (full_name)
        ),
        specialties (name)
      `)
      .eq('patient_id', patient.id)
      .order('visit_date', { ascending: false });

    if (recordsError) {
      console.error('Error fetching clinical_records:', recordsError);
    }

    // Fetch lab orders
    const { data: labs, error: labsError } = await supabase
      .from('lab_orders')
      .select(`
        *,
        professionals:professionals!ordered_by (
          title,
          user_profiles:user_profiles!user_id (full_name)
        )
      `)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (labsError) {
      console.error('Error fetching lab_orders:', labsError);
    }

    // Fetch imaging orders
    const { data: imagings, error: imagingsError } = await supabase
      .from('imaging_orders')
      .select(`
        *,
        professionals:professionals!ordered_by (
          title,
          user_profiles:user_profiles!user_id (full_name)
        )
      `)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (imagingsError) {
      console.error('Error fetching imaging_orders:', imagingsError);
    }

    // Fetch appointments
    const { data: apts, error: aptsError } = await supabase
      .from('appointments')
      .select(`
        *,
        professionals (
          title,
          user_profiles!professionals_user_id_fkey (full_name)
        ),
        specialties (name)
      `)
      .eq('patient_id', patient.id)
      .order('starts_at', { ascending: false });

    if (aptsError) {
      console.error('Error fetching appointments:', aptsError);
    }

    // Fetch dispensing_log
    const { data: disp, error: dispError } = await supabase
      .from('dispensing_log')
      .select(`
        *,
        inventory:pharmacy_inventory(drug_name,unit),
        user_profiles!pharmacist_id(full_name)
      `)
      .eq('patient_id', patient.id)
      .order('dispensed_at', { ascending: false });

    if (dispError) {
      console.error('Error fetching dispensing_log:', dispError);
    }

    // Compile into timeline events
    const events: TimelineEvent[] = [];

    records?.forEach((r: any) => {
      const docName = r.professionals ? `${r.professionals.title} ${r.professionals.user_profiles?.full_name || ''}` : 'Médico Especialista';
      const visitDate = new Date(r.visit_date || r.created_at);
      events.push({
        id: r.id,
        date: visitDate.toLocaleDateString(),
        time: visitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'CONSULT',
        title: `Consulta Clínica — ${r.specialties?.name || 'Medicina General'}`,
        doctor: docName,
        summary: r.chief_complaint || 'Sin motivo registrado',
        locked: r.is_locked,
        rawDetails: r,
      });
    });

    labs?.forEach((l: any) => {
      const docName = l.professionals ? `${l.professionals.title} ${l.professionals.user_profiles?.full_name || ''}` : 'Sistema LIS';
      const createdDate = new Date(l.created_at);
      events.push({
        id: l.id,
        date: createdDate.toLocaleDateString(),
        time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'LAB',
        title: `Orden de Laboratorio — ${l.panel_name}`,
        doctor: docName,
        summary: `Pruebas: ${l.tests_requested?.join(', ') || ''} · Estado: ${l.status}`,
        locked: true,
        rawDetails: l,
      });
    });

    imagings?.forEach((im: any) => {
      const docName = im.professionals ? `${im.professionals.title} ${im.professionals.user_profiles?.full_name || ''}` : 'Servicio de Imágenes';
      const createdDate = new Date(im.created_at);
      events.push({
        id: im.id,
        date: createdDate.toLocaleDateString(),
        time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'IMAGING',
        title: `Estudio de Imagenología — ${im.modality}`,
        doctor: docName,
        summary: `${im.study_description || ''} · Indicación: ${im.clinical_indication || ''} · Estado: ${im.status}`,
        locked: true,
        rawDetails: im,
      });
    });

    apts?.forEach((a: any) => {
      const docName = a.professionals ? `${a.professionals.title} ${a.professionals.user_profiles?.full_name || ''}` : 'Administración';
      const aptDate = new Date(a.starts_at);
      events.push({
        id: a.id,
        date: aptDate.toLocaleDateString(),
        time: aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'APPOINTMENT',
        title: `Cita Médica — ${a.specialties?.name || 'General'}`,
        doctor: docName,
        summary: `Motivo: ${a.reason || 'Sin especificar'} · Estado: ${a.status}`,
        locked: true,
        rawDetails: a,
      });
    });

    disp?.forEach((d: any) => {
      const docName = d.user_profiles ? `${d.user_profiles.full_name}` : 'Farmacia';
      const dispDate = new Date(d.dispensed_at);
      events.push({
        id: d.id,
        date: dispDate.toLocaleDateString(),
        time: dispDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'PHARMACY',
        title: `Dispensación de Farmacia — ${d.inventory?.drug_name || 'Medicamento'}`,
        doctor: docName,
        summary: `Cantidad: ${d.quantity_dispensed} ${d.inventory?.unit || 'u'} · Notas: ${d.notes || 'Sin observaciones'}`,
        locked: true,
        rawDetails: d,
      });
    });

    // Sort descending by date
    events.sort((a, b) => {
      const timeA = new Date(a.rawDetails.created_at || a.rawDetails.visit_date || a.rawDetails.starts_at || a.rawDetails.dispensed_at).getTime();
      const timeB = new Date(b.rawDetails.created_at || b.rawDetails.visit_date || b.rawDetails.starts_at || b.rawDetails.dispensed_at).getTime();
      return timeB - timeA;
    });
    setTimelineEvents(events);
  }, [patient, supabase]);

  const fetchPrescriptions = useCallback(async () => {
    if (!patient) return;
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        professionals:professionals!prescribed_by (
          title,
          user_profiles:user_profiles!user_id (full_name)
        )
      `)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching prescriptions:', error);
    }
    setPrescriptions(data || []);
  }, [patient, supabase]);

  useEffect(() => {
    if (patient) {
      fetchTimeline();
      fetchPrescriptions();
    }
  }, [patient, fetchTimeline, fetchPrescriptions]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) {
      fetchAllPatients();
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,mrn.ilike.%${searchQuery}%,ci_passport.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSearchResults(data);
    }
    setSearching(false);
  };

  const getAge = (dob: string) => {
    if (!dob) return '?';
    const ageDifMs = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ACTIVE': return { label: 'Activo / Ambulatorio', color: '#4CAF50' };
      case 'HOSPITALIZED': return { label: 'Hospitalizado', color: '#1E88E5' };
      case 'DISCHARGED': return { label: 'De Alta', color: '#FF9800' };
      default: return { label: status, color: '#9C27B0' };
    }
  };

  const getProfessionalId = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('professionals')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (data?.id) return data.id;

    // Fallback if current auth user is not in professionals table (e.g. admin role)
    const { data: list } = await supabase
      .from('professionals')
      .select('id')
      .limit(1);
    return list?.[0]?.id || null;
  };

  const handleSignConsult = async () => {
    if (!consultForm.chief_complaint) {
      alert('El motivo de consulta es obligatorio.');
      return;
    }

    setSavingConsult(true);
    const profId = await getProfessionalId();

    if (!profId) {
      alert('No se pudo encontrar un profesional médico asociado a su usuario.');
      setSavingConsult(false);
      return;
    }

    const calculatedBmi = consultForm.weight && consultForm.height
      ? Number(consultForm.weight) / Math.pow(Number(consultForm.height) / 100, 2)
      : null;

    const vitalsObj = {
      fc: consultForm.fc ? Number(consultForm.fc) : null,
      spo2: consultForm.spo2 ? Number(consultForm.spo2) : null,
      pas: consultForm.pas ? Number(consultForm.pas) : null,
      pad: consultForm.pad ? Number(consultForm.pad) : null,
      temp: consultForm.temp ? Number(consultForm.temp) : null,
      fr: consultForm.fr ? Number(consultForm.fr) : null,
      weight: consultForm.weight ? Number(consultForm.weight) : null,
      height: consultForm.height ? Number(consultForm.height) : null,
    };

    const { data: newRec, error } = await supabase
      .from('clinical_records')
      .insert([{
        patient_id: patient.id,
        professional_id: profId,
        chief_complaint: consultForm.chief_complaint,
        hpi: consultForm.hpi,
        physical_exam: consultForm.physical_exam,
        assessment: consultForm.assessment,
        plan: consultForm.plan,
        vitals: vitalsObj,
        bmi: calculatedBmi,
        diagnoses: selectedDiagnoses,
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: user?.id || null,
        visit_date: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else {
      alert('Consulta firmada y guardada con éxito.');
      logAuditEvent({
        action: 'EHR_WRITE',
        resource_type: 'clinical_records',
        resource_id: newRec?.id,
        outcome: 'SUCCESS',
      });
      setConsultForm({
        chief_complaint: '', hpi: '', physical_exam: '', assessment: '', plan: '',
        fc: '', pas: '', pad: '', spo2: '', temp: '', fr: '', weight: '', height: ''
      });
      setSelectedDiagnoses([]);
      setTab('timeline');
      fetchTimeline();
    }
    setSavingConsult(false);
  };

  const handleCreatePrescription = async () => {
    if (!rxForm.drug_name || !rxForm.dose || !rxForm.frequency) {
      alert('Complete los campos obligatorios de la receta.');
      return;
    }
    setSavingRx(true);
    const profId = await getProfessionalId();

    const { data: newRx, error } = await supabase
      .from('prescriptions')
      .insert([{
        patient_id: patient.id,
        prescribed_by: profId,
        drug_name: rxForm.drug_name,
        dose: rxForm.dose,
        frequency: rxForm.frequency,
        duration: rxForm.duration || 'Continuo',
        instructions: rxForm.instructions,
        status: 'ACTIVE',
      }])
      .select('id')
      .single();

    if (error) {
      alert(`Error al guardar receta: ${error.message}`);
    } else {
      setShowRxModal(false);
      logAuditEvent({
        action: 'EHR_WRITE',
        resource_type: 'prescriptions',
        resource_id: newRx?.id,
        outcome: 'SUCCESS',
      });
      setRxForm({ drug_name: '', dose: '', frequency: '', duration: '', instructions: '' });
      fetchPrescriptions();
    }
    setSavingRx(false);
  };

  const handleAddBgEntry = async () => {
    if (!showBgModal) return;
    setSavingBg(true);

    let updatedFieldData: any;

    if (showBgModal === 'allergy') {
      const list = Array.isArray(patient.allergies) ? patient.allergies : [];
      updatedFieldData = {
        allergies: [...list, { drug: bgInput.name, reaction: bgInput.reaction, severity: bgInput.severity }]
      };
    } else if (showBgModal === 'surgery') {
      const list = Array.isArray(patient.surgical_history) ? patient.surgical_history : [];
      updatedFieldData = {
        surgical_history: [...list, { procedure: bgInput.name, date: bgInput.date, notes: bgInput.notes }]
      };
    } else if (showBgModal === 'chronic') {
      const list = Array.isArray(patient.chronic_conditions) ? patient.chronic_conditions : [];
      updatedFieldData = {
        chronic_conditions: [...list, bgInput.name]
      };
    } else if (showBgModal === 'medication') {
      const list = Array.isArray(patient.current_medications) ? patient.current_medications : [];
      updatedFieldData = {
        current_medications: [...list, { drug: bgInput.name, dose: bgInput.reaction, notes: bgInput.notes }]
      };
    }

    const { error } = await supabase
      .from('patients')
      .update(updatedFieldData)
      .eq('id', patient.id);

    if (error) {
      alert(`Error al guardar antecedente: ${error.message}`);
    } else {
      logAuditEvent({
        action: 'EHR_WRITE',
        resource_type: 'patients',
        resource_id: patient.id,
        outcome: 'SUCCESS',
      });
      // Reload patient details to refresh view
      await fetchPatientByMrn(patient.mrn);
      setShowBgModal(null);
      setBgInput({ name: '', reaction: '', severity: 'MEDIUM', date: '', notes: '' });
    }
    setSavingBg(false);
  };

  const handleRemoveBgEntry = async (type: 'allergy' | 'surgery' | 'chronic' | 'medication', index: number) => {
    if (!window.confirm('¿Seguro que desea eliminar este antecedente?')) return;
    
    let updatedFieldData: any;

    if (type === 'allergy') {
      const list = Array.isArray(patient.allergies) ? [...patient.allergies] : [];
      list.splice(index, 1);
      updatedFieldData = { allergies: list };
    } else if (type === 'surgery') {
      const list = Array.isArray(patient.surgical_history) ? [...patient.surgical_history] : [];
      list.splice(index, 1);
      updatedFieldData = { surgical_history: list };
    } else if (type === 'chronic') {
      const list = Array.isArray(patient.chronic_conditions) ? [...patient.chronic_conditions] : [];
      list.splice(index, 1);
      updatedFieldData = { chronic_conditions: list };
    } else if (type === 'medication') {
      const list = Array.isArray(patient.current_medications) ? [...patient.current_medications] : [];
      list.splice(index, 1);
      updatedFieldData = { current_medications: list };
    }

    const { error } = await supabase
      .from('patients')
      .update(updatedFieldData)
      .eq('id', patient.id);

    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      logAuditEvent({
        action: 'EHR_WRITE',
        resource_type: 'patients',
        resource_id: patient.id,
        outcome: 'SUCCESS',
      });
      await fetchPatientByMrn(patient.mrn);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12 }}>
        <Icon name="Loader2" size={32} className="animate-spin" style={{ color: '#1E88E5' }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando Historia Clínica...</span>
      </div>
    );
  }

  // EHR patient lookup screen if no patient selected
  if (!patient) {
    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Buscador de Historia Clínica (EHR)</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Seleccione un paciente para abrir su ficha médica electrónica</p>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 600 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Icon name="Search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input 
              className="input-field" 
              style={{ paddingLeft: 36, width: '100%' }} 
              placeholder="Buscar por Nombre, MRN o Cédula..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit">Buscar</button>
        </form>

        <div className="glass-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Listado de Pacientes</h2>
          
          {searching ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}><Icon name="Loader2" size={24} className="animate-spin" style={{ color: '#1E88E5' }} /></div>
          ) : searchResults.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No se encontraron pacientes registrados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {searchResults.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => router.push(`/historia-clinica?mrn=${p.mrn}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E88E5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-secondary)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(30,136,229,0.1)', border: '1px solid rgba(30,136,229,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1E88E5' }}>
                      {p.first_name[0]}{p.last_name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Cédula: {p.ci_passport} · Edad: {getAge(p.birth_date)}a · Género: {p.gender}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--color-teal)', fontWeight: 700, background: 'rgba(0,150,136,0.08)', padding: '4px 8px', borderRadius: 6 }}>
                      {p.mrn}
                    </div>
                    <Icon name="ChevronRight" size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render EHR dashboard for dynamic loaded patient
  const pBadge = getStatusBadge(patient.status);

  // Dynamic allergies text parsing for top banner
  const patientAllergiesList = Array.isArray(patient.allergies) ? patient.allergies : [];
  const allergiesBannerText = patientAllergiesList.length > 0
    ? patientAllergiesList.map((a: any) => `${a.drug} (${a.reaction || 'Leve'})`).join(' — ')
    : 'SIN ALERGIAS CONOCIDAS';

  const hasAllergies = patientAllergiesList.length > 0;
  
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/historia-clinica')} style={{ padding: 8, borderRadius: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', textDecoration: 'none', background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', cursor: 'pointer' }}>
            <Icon name="ArrowLeft" size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Historia Clínica (EHR)</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Registro Electrónico de Salud · FHIR R4 Patient Resource · Inmutable & Auditado</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ 
            padding: '6px 12px', 
            borderRadius: 8, 
            background: hasAllergies ? 'rgba(244,67,54,0.1)' : 'rgba(76,175,80,0.1)', 
            border: hasAllergies ? '1px solid rgba(244,67,54,0.3)' : '1px solid rgba(76,175,80,0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6 
          }}>
            <Icon name={hasAllergies ? "AlertTriangle" : "CheckCircle2"} size={13} style={{ color: hasAllergies ? '#FF5252' : '#4CAF50' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: hasAllergies ? '#FF5252' : '#4CAF50' }}>
              ALERGIAS: {allergiesBannerText}
            </span>
          </div>
          <button className="btn-ghost" onClick={() => window.print()}><Icon name="Printer" size={14} /></button>
          <button className="btn-primary" onClick={() => setTab('consult')}><Icon name="Plus" size={14} /> Nueva Consulta</button>
        </div>
      </div>

      {/* Patient Header Banner */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg, #1E88E5, #0D47A1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0 }}>
          {patient.first_name[0]}{patient.last_name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
              {patient.first_name} {patient.last_name} — {patient.gender === 'MALE' ? 'Masculino' : patient.gender === 'FEMALE' ? 'Femenino' : patient.gender}, {getAge(patient.birth_date)} años
            </h2>
            <span className="badge" style={{ background: `${pBadge.color}18`, color: pBadge.color, borderColor: `${pBadge.color}30` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: pBadge.color, marginRight: 5 }} />
              {pBadge.label}
            </span>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: 4 }}>
            MRN: {patient.mrn} · Cédula: {patient.ci_passport} · Nacimiento: {new Date(patient.birth_date).toLocaleDateString()}
          </div>
        </div>
        {[
          { label: 'Última consulta', value: timelineEvents.find(e => e.type === 'CONSULT')?.date || 'Ninguna', color: '#1E88E5' },
          { label: 'Episodios totales', value: timelineEvents.length.toString(), color: '#4CAF50' },
          { label: 'Alergias conocidas', value: patientAllergiesList.length.toString(), color: '#F44336' },
          { label: 'Seguro médico', value: patient.insurance_provider || 'Particular', color: '#FF9800' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', borderLeft: '1px solid var(--border-secondary)', paddingLeft: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tab-bar" style={{ marginBottom: 20, width: 'fit-content' }}>
        {[
          { id: 'timeline', label: 'Timeline Longitudinal' },
          { id: 'consult', label: 'Nueva Consulta' },
          { id: 'rx', label: 'Prescripciones' },
          { id: 'bg', label: 'Antecedentes' },
        ].map(t => (
          <div key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as typeof tab)}>{t.label}</div>
        ))}
      </div>

      {/* TIMELINE */}
      {tab === 'timeline' && (
        <div style={{ position: 'relative', paddingLeft: 30 }}>
          <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'var(--border-secondary)' }} />
          {timelineEvents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No se registran eventos clínicos para este paciente.
            </div>
          ) : (
            timelineEvents.map((ev, i) => (
              <div key={i} style={{ marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -19, top: 12, width: 14, height: 14, borderRadius: '50%', background: EVENT_COLORS[ev.type], border: '2px solid var(--bg-primary)', zIndex: 1 }} />
                <div
                  onClick={() => setSelectedEvent(ev)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = EVENT_COLORS[ev.type] + '50'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${EVENT_COLORS[ev.type]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={EVENT_ICONS[ev.type]} size={13} style={{ color: EVENT_COLORS[ev.type] }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.doctor}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{ev.date}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 2 }}>
                        {ev.locked && <Icon name="Lock" size={10} style={{ color: 'var(--text-muted)' }} />}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ev.locked ? 'Cerrado' : 'Editable'}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ev.summary}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CONSULT */}
      {tab === 'consult' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Anamnesis y Motivo de Consulta *</h3>
            <textarea 
              className="input-field" 
              style={{ height: 100, resize: 'vertical', width: '100%', marginBottom: 12 }} 
              placeholder="Describa el motivo de consulta..."
              value={consultForm.chief_complaint}
              onChange={e => setConsultForm({...consultForm, chief_complaint: e.target.value})}
            />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Historia de la Enfermedad Actual (HPI)</h3>
            <textarea 
              className="input-field" 
              style={{ height: 100, resize: 'vertical', width: '100%' }} 
              placeholder="Describa la evolución de los síntomas..."
              value={consultForm.hpi}
              onChange={e => setConsultForm({...consultForm, hpi: e.target.value})}
            />
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Examen Físico</h3>
            <textarea 
              className="input-field" 
              style={{ height: 100, resize: 'vertical', width: '100%', marginBottom: 12 }} 
              placeholder="Hallazgos del examen físico segmentado..."
              value={consultForm.physical_exam}
              onChange={e => setConsultForm({...consultForm, physical_exam: e.target.value})}
            />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Análisis y Diagnóstico</h3>
            <textarea 
              className="input-field" 
              style={{ height: 100, resize: 'vertical', width: '100%' }} 
              placeholder="Análisis clínico y diagnóstico presuntivo..."
              value={consultForm.assessment}
              onChange={e => setConsultForm({...consultForm, assessment: e.target.value})}
            />
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Signos Vitales</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'FC (bpm)', key: 'fc' },
                { label: 'PA Sistólica', key: 'pas' },
                { label: 'PA Diastólica', key: 'pad' },
                { label: 'SpO2 (%)', key: 'spo2' },
                { label: 'Temperatura (°C)', key: 'temp' },
                { label: 'FR (/min)', key: 'fr' },
                { label: 'Peso (kg)', key: 'weight' },
                { label: 'Talla (cm)', key: 'height' },
              ].map(v => (
                <div key={v.key}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{v.label}</label>
                  <input 
                    type="number" 
                    step="any"
                    className="input-field" 
                    placeholder="0" 
                    value={(consultForm as any)[v.key]}
                    onChange={e => setConsultForm({...consultForm, [v.key]: e.target.value})}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>IMC (auto)</label>
                <div style={{ 
                  padding: '10px 12px', 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border-secondary)', 
                  borderRadius: 8, 
                  fontSize: 12, 
                  color: 'var(--text-muted)' 
                }}>
                  {consultForm.weight && consultForm.height
                    ? (Number(consultForm.weight) / Math.pow(Number(consultForm.height) / 100, 2)).toFixed(1)
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Diagnóstico ICD-11</h3>
            <input 
              className="input-field" 
              placeholder="Filtrar por nombre del diagnóstico..." 
              style={{ marginBottom: 10, width: '100%' }} 
              value={dxSearch}
              onChange={e => setDxSearch(e.target.value)}
            />
            
            {/* Selected Diagnoses Badges */}
            {selectedDiagnoses.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {selectedDiagnoses.map((dx: any) => (
                  <span key={dx.code} className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,150,136,0.15)', color: 'var(--color-teal)', border: '1px solid rgba(0,150,136,0.3)' }}>
                    {dx.code} — {dx.title}
                    <Icon 
                      name="X" 
                      size={10} 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => setSelectedDiagnoses(selectedDiagnoses.filter(d => d.code !== dx.code))} 
                    />
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
              {SAMPLE_ICD11_CODES
                .filter(c => c.title.toLowerCase().includes(dxSearch.toLowerCase()) || c.code.toLowerCase().includes(dxSearch.toLowerCase()))
                .map(c => {
                  const isSelected = selectedDiagnoses.some(d => d.code === c.code);
                  return (
                    <div 
                      key={c.code} 
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDiagnoses(selectedDiagnoses.filter(d => d.code !== c.code));
                        } else {
                          setSelectedDiagnoses([...selectedDiagnoses, c]);
                        }
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        padding: '7px 10px', 
                        background: isSelected ? 'rgba(30,136,229,0.08)' : 'var(--bg-surface)', 
                        borderRadius: 6, 
                        cursor: 'pointer', 
                        border: isSelected ? '1px solid #1E88E5' : '1px solid var(--border-secondary)' 
                      }}
                    >
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--color-teal)', flexShrink: 0 }}>{c.code}</span>
                      <span style={{ fontSize: 12, flex: 1 }}>{c.title}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.category}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Plan de Tratamiento / Indicaciones</h3>
            <textarea 
              className="input-field" 
              style={{ height: 80, resize: 'vertical', width: '100%', marginBottom: 16 }} 
              placeholder="Medicamentos, dosis, recomendaciones..."
              value={consultForm.plan}
              onChange={e => setConsultForm({...consultForm, plan: e.target.value})}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn-primary" 
                disabled={savingConsult} 
                onClick={handleSignConsult}
              >
                {savingConsult ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="CheckCircle2" size={14} />}
                {savingConsult ? 'Firmando y Guardando...' : 'Firmar y Cerrar Consulta'}
              </button>
              <button className="btn-ghost" onClick={() => setTab('rx')}><Icon name="Pill" size={14} /> Prescribir Receta</button>
              <button className="btn-ghost" onClick={() => router.push(`/laboratorio?new=true`)}><Icon name="FlaskConical" size={14} /> Solicitar Labs</button>
            </div>
          </div>
        </div>
      )}

      {/* PRESCRIPTIONS */}
      {tab === 'rx' && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Prescripciones Activas</h3>
            <button className="btn-primary" onClick={() => setShowRxModal(true)}>
              <Icon name="Plus" size={13} /> Nueva Receta
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No se registran prescripciones activas.
            </div>
          ) : (
            prescriptions.map((rx, i) => (
              <div key={i} style={{ marginBottom: 10, padding: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,152,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="Pill" size={14} style={{ color: '#FF9800' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{rx.drug_name} <span style={{ fontSize: 12, color: '#FF9800' }}>{rx.dose}</span></div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {rx.frequency} · {rx.duration} · Dr. {rx.professionals?.user_profiles?.full_name || 'Médico'} · {new Date(rx.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF50' }} />{rx.status}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 42 }}>{rx.instructions}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* BACKGROUNDS (ANTECEDENTES) */}
      {tab === 'bg' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {/* Alergias */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,67,54,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="AlertTriangle" size={13} style={{ color: '#F44336' }} />
              </div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Alergias</h3>
            </div>
            {patientAllergiesList.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>Sin alergias conocidas</div>
            ) : (
              patientAllergiesList.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F44336', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <strong>{item.drug}</strong> — {item.reaction} ({item.severity})
                    </span>
                  </div>
                  <Icon 
                    name="X" 
                    size={12} 
                    style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => handleRemoveBgEntry('allergy', i)}
                  />
                </div>
              ))
            )}
            <button className="btn-ghost" style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={() => setShowBgModal('allergy')}>
              <Icon name="Plus" size={11} /> Agregar
            </button>
          </div>

          {/* Quirúrgicos */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(156,39,176,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="Scissors" size={13} style={{ color: '#9C27B0' }} />
              </div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Antecedentes Quirúrgicos</h3>
            </div>
            {(Array.isArray(patient.surgical_history) ? patient.surgical_history : []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>Sin antecedentes registrados</div>
            ) : (
              (patient.surgical_history as any[]).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#9C27B0', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <strong>{item.procedure}</strong> ({item.date}) {item.notes && `— ${item.notes}`}
                    </span>
                  </div>
                  <Icon 
                    name="X" 
                    size={12} 
                    style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => handleRemoveBgEntry('surgery', i)}
                  />
                </div>
              ))
            )}
            <button className="btn-ghost" style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={() => setShowBgModal('surgery')}>
              <Icon name="Plus" size={11} /> Agregar
            </button>
          </div>

          {/* Patológicos / Crónicos */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(30,136,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="Heart" size={13} style={{ color: '#1E88E5' }} />
              </div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Condiciones Crónicas</h3>
            </div>
            {(Array.isArray(patient.chronic_conditions) ? patient.chronic_conditions : []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>Sin condiciones registradas</div>
            ) : (
              (patient.chronic_conditions as string[]).map((item: string, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1E88E5', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                  <Icon 
                    name="X" 
                    size={12} 
                    style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => handleRemoveBgEntry('chronic', i)}
                  />
                </div>
              ))
            )}
            <button className="btn-ghost" style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={() => setShowBgModal('chronic')}>
              <Icon name="Plus" size={11} /> Agregar
            </button>
          </div>

          {/* Medicación Habitual */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,152,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="Pill" size={13} style={{ color: '#FF9800' }} />
              </div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Medicamentos Previos / Habituales</h3>
            </div>
            {(Array.isArray(patient.current_medications) ? patient.current_medications : []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>Sin medicamentos registrados</div>
            ) : (
              (patient.current_medications as any[]).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF9800', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <strong>{item.drug}</strong> {item.dose} {item.notes && `(${item.notes})`}
                    </span>
                  </div>
                  <Icon 
                    name="X" 
                    size={12} 
                    style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => handleRemoveBgEntry('medication', i)}
                  />
                </div>
              ))
            )}
            <button className="btn-ghost" style={{ marginTop: 10, width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={() => setShowBgModal('medication')}>
              <Icon name="Plus" size={11} /> Agregar
            </button>
          </div>

          {/* Antecedentes Familiares (Texto Libre) */}
          <div className="glass-card" style={{ padding: 16, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(76,175,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="Users" size={13} style={{ color: '#4CAF50' }} />
              </div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Antecedentes Familiares</h3>
            </div>
            
            <textarea 
              className="input-field" 
              style={{ width: '100%', height: 100, resize: 'vertical', fontSize: 12, marginBottom: 10 }}
              placeholder="Padre, madre o hermanos con patologías cardiovasculares, diabetes, cáncer..."
              value={patient.family_history || ''}
              onChange={async e => {
                const val = e.target.value;
                setPatient({ ...patient, family_history: val });
                await supabase
                  .from('patients')
                  .update({ family_history: val })
                  .eq('id', patient.id);
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>* Se guarda automáticamente al escribir</span>
          </div>
        </div>
      )}

      {/* Timeline Event Details Modal */}
      {selectedEvent && (
        <div onClick={() => setSelectedEvent(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: `1px solid ${EVENT_COLORS[selectedEvent.type]}40`, borderTop: `3px solid ${EVENT_COLORS[selectedEvent.type]}`, borderRadius: 16, padding: 24, maxWidth: 520, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{selectedEvent.title}</h2>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedEvent.doctor} · {selectedEvent.date} {selectedEvent.time}</div>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={18} /></button>
            </div>
            
            <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 14, marginBottom: 14, maxHeight: 300, overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {selectedEvent.summary}
              </p>
              {selectedEvent.type === 'CONSULT' && selectedEvent.rawDetails && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-secondary)', paddingTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {selectedEvent.rawDetails.hpi && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Enfermedad Actual (HPI):</strong>
                      <p style={{ marginTop: 2, fontStyle: 'italic' }}>{selectedEvent.rawDetails.hpi}</p>
                    </div>
                  )}
                  {selectedEvent.rawDetails.physical_exam && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Examen Físico:</strong>
                      <p style={{ marginTop: 2 }}>{selectedEvent.rawDetails.physical_exam}</p>
                    </div>
                  )}
                  {selectedEvent.rawDetails.assessment && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Evaluación / Diagnóstico:</strong>
                      <p style={{ marginTop: 2 }}>{selectedEvent.rawDetails.assessment}</p>
                    </div>
                  )}
                  {selectedEvent.rawDetails.plan && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Plan de Tratamiento:</strong>
                      <p style={{ marginTop: 2 }}>{selectedEvent.rawDetails.plan}</p>
                    </div>
                  )}
                  {selectedEvent.rawDetails.vitals && typeof selectedEvent.rawDetails.vitals === 'object' && (
                    <div style={{ marginTop: 10 }}>
                      <strong>Signos Vitales:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 4 }}>
                        {Object.entries(selectedEvent.rawDetails.vitals).map(([k, v]) => (
                          <div key={k} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', padding: 4, borderRadius: 4, textAlign: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{k}</span>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{String(v ?? '—')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {selectedEvent.locked && (
              <div style={{ display: 'flex', gap: 8, padding: 10, background: 'rgba(74,96,128,0.1)', border: '1px solid rgba(74,96,128,0.2)', borderRadius: 8 }}>
                <Icon name="Lock" size={13} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Esta nota clínica está bloqueada. Solo se permiten adendums firmados para correcciones.
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {!selectedEvent.locked && <button className="btn-primary"><Icon name="Edit" size={13} /> Editar</button>}
              {selectedEvent.locked && <button className="btn-ghost"><Icon name="Plus" size={13} /> Agregar Adendum</button>}
              <button className="btn-ghost" onClick={() => window.print()}><Icon name="Printer" size={13} /> Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* Rx Modal */}
      {showRxModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div className="glass-card animate-fade-in" style={{ padding: 24, width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="Pill" size={18} style={{ color: '#FF9800' }}/> Recetar Nuevo Medicamento
              </h3>
              <button onClick={() => setShowRxModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Medicamento (Nombre Comercial o Genérico) *</label>
                <input 
                  className="input-field" 
                  style={{ width: '100%' }}
                  placeholder="Ej: Paracetamol"
                  value={rxForm.drug_name}
                  onChange={e => setRxForm({...rxForm, drug_name: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Dosis *</label>
                  <input 
                    className="input-field" 
                    style={{ width: '100%' }}
                    placeholder="Ej: 500 mg"
                    value={rxForm.dose}
                    onChange={e => setRxForm({...rxForm, dose: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Frecuencia *</label>
                  <input 
                    className="input-field" 
                    style={{ width: '100%' }}
                    placeholder="Ej: Cada 8 horas"
                    value={rxForm.frequency}
                    onChange={e => setRxForm({...rxForm, frequency: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Duración</label>
                <input 
                  className="input-field" 
                  style={{ width: '100%' }}
                  placeholder="Ej: 7 días"
                  value={rxForm.duration}
                  onChange={e => setRxForm({...rxForm, duration: e.target.value})}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Instrucciones adicionales</label>
                <textarea 
                  className="input-field" 
                  style={{ height: 60, resize: 'vertical', width: '100%' }}
                  placeholder="Tomar después de los alimentos, evitar alcohol..."
                  value={rxForm.instructions}
                  onChange={e => setRxForm({...rxForm, instructions: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowRxModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={savingRx} onClick={handleCreatePrescription} style={{ background: 'linear-gradient(135deg,#FF9800,#F57C00)', color: '#fff' }}>
                {savingRx ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Plus" size={14}/>}
                {savingRx ? 'Generando...' : 'Generar Receta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Background Item Modal */}
      {showBgModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div className="glass-card animate-fade-in" style={{ padding: 24, width: '100%', maxWidth: 450 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                {showBgModal === 'allergy' && 'Registrar Alergia'}
                {showBgModal === 'surgery' && 'Registrar Antecedente Quirúrgico'}
                {showBgModal === 'chronic' && 'Registrar Condición Crónica'}
                {showBgModal === 'medication' && 'Registrar Medicamento Habitual'}
              </h3>
              <button onClick={() => setShowBgModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  {showBgModal === 'allergy' && 'Medicamento / Sustancia *'}
                  {showBgModal === 'surgery' && 'Procedimiento Quirúrgico *'}
                  {showBgModal === 'chronic' && 'Diagnóstico / Patología *'}
                  {showBgModal === 'medication' && 'Medicamento / Sustancia *'}
                </label>
                <input 
                  className="input-field" 
                  style={{ width: '100%' }}
                  placeholder="Ej: Penicilina, Apendicectomía, HTA..."
                  value={bgInput.name}
                  onChange={e => setBgInput({...bgInput, name: e.target.value})}
                />
              </div>

              {showBgModal === 'allergy' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Reacción / Síntoma</label>
                      <input 
                        className="input-field" 
                        style={{ width: '100%' }}
                        placeholder="Ej: Erupción cutánea"
                        value={bgInput.reaction}
                        onChange={e => setBgInput({...bgInput, reaction: e.target.value})}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Severidad</label>
                      <select 
                        className="input-field" 
                        style={{ width: '100%' }}
                        value={bgInput.severity}
                        onChange={e => setBgInput({...bgInput, severity: e.target.value})}
                      >
                        <option value="LOW">Leve</option>
                        <option value="MEDIUM">Moderada</option>
                        <option value="HIGH">Grave / Anafilaxia</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {showBgModal === 'surgery' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Fecha / Año</label>
                      <input 
                        className="input-field" 
                        style={{ width: '100%' }}
                        placeholder="Ej: 2019"
                        value={bgInput.date}
                        onChange={e => setBgInput({...bgInput, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Notas / Hospital</label>
                      <input 
                        className="input-field" 
                        style={{ width: '100%' }}
                        placeholder="Opcional..."
                        value={bgInput.notes}
                        onChange={e => setBgInput({...bgInput, notes: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}

              {showBgModal === 'medication' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Dosis / Frecuencia</label>
                      <input 
                        className="input-field" 
                        style={{ width: '100%' }}
                        placeholder="Ej: 50mg cada 12h"
                        value={bgInput.reaction}
                        onChange={e => setBgInput({...bgInput, reaction: e.target.value})}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Notas / Indicación</label>
                      <input 
                        className="input-field" 
                        style={{ width: '100%' }}
                        placeholder="Opcional..."
                        value={bgInput.notes}
                        onChange={e => setBgInput({...bgInput, notes: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowBgModal(null)}>Cancelar</button>
              <button className="btn-primary" disabled={savingBg} onClick={handleAddBgEntry}>
                {savingBg ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Plus" size={14}/>}
                {savingBg ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

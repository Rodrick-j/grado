'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

export function ADTPage() {
  const [tab, setTab] = useState<'list' | 'discharge' | 'suspended'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [patients, setPatients] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [triggerFetch, setTriggerFetch] = useState(0);

  // Suspension states
  const [suspendingPatient, setSuspendingPatient] = useState<any | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Selected date for registration reports (YYYY-MM-DD local time)
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Filter patient list by reportDate automatically (enabled by default)
  const [filterByReportDate, setFilterByReportDate] = useState(true);

  // Advanced filters state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [filterInsurance, setFilterInsurance] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
  const [filterCreatorSpecialty, setFilterCreatorSpecialty] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);

  // Pending filter inputs (applied only on click)
  const [pendingStatus, setPendingStatus] = useState('');
  const [pendingAgeMin, setPendingAgeMin] = useState('');
  const [pendingAgeMax, setPendingAgeMax] = useState('');
  const [pendingInsurance, setPendingInsurance] = useState('');
  const [pendingDoctor, setPendingDoctor] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingDate, setPendingDate] = useState('');
  const [pendingSpecialty, setPendingSpecialty] = useState('');
  const [pendingCreator, setPendingCreator] = useState('');
  const [pendingCreatorSpecialty, setPendingCreatorSpecialty] = useState('');

  // Doctor & Bed Assignment State
  const [assigningPatient, setAssigningPatient] = useState<any | null>(null);
  const [assignSelectedSpecialty, setAssignSelectedSpecialty] = useState('');
  const [assignSelectedDoctor, setAssignSelectedDoctor] = useState('');
  const [assignSelectedBed, setAssignSelectedBed] = useState('');
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Edit Patient State
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    ci_passport: '',
    birth_date: '',
    gender: 'MALE',
    phone_primary: '',
    phone_secondary: '',
    email: '',
    address_line1: '',
    city: '',
    state_province: '',
    insurance_provider: '',
    insurance_policy_num: '',
    status: 'ACTIVE',
    emergency_name: '',
    emergency_phone: '',
    emergency_relation: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [quickPreviewPatient, setQuickPreviewPatient] = useState<any | null>(null);

  useEffect(() => {
    fetchPatients();
    fetchDoctors();

    const channel = supabase.channel('public:patients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, (payload) => {
        setTriggerFetch(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (triggerFetch > 0) {
      fetchPatients();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerFetch]);

  const fetchDoctors = async () => {
    const { data: docData } = await supabase
      .from('professionals')
      .select('id, title, specialty_id, user_profiles!professionals_user_id_fkey(full_name)');
    if (docData) setDoctors(docData);

    const { data: specData } = await supabase
      .from('specialties')
      .select('id, name')
      .order('name');
    if (specData) setSpecialties(specData);

    const { data: bedsData } = await supabase
      .from('camas')
      .select('id, bed_code, ala, tipo')
      .eq('estado', 'DISPONIBLE')
      .order('ala')
      .order('bed_code');
    if (bedsData) setAvailableBeds(bedsData);
  };

  const fetchPatients = async () => {
    setLoading(true);
    let q = supabase
      .from('patients')
      .select('*, creator:user_profiles!patients_created_by_fkey(id, full_name, role, professionals!professionals_user_id_fkey(specialties!professionals_specialty_id_fkey(id, name)))')
      .neq('status', 'OUTPATIENT')
      .order('created_at', { ascending: false });

    if (filterStatus) q = q.eq('status', filterStatus);
    if (filterDate) {
      const startOfDay = new Date(filterDate);
      startOfDay.setUTCHours(0,0,0,0);
      const endOfDay = new Date(filterDate);
      endOfDay.setUTCHours(23,59,59,999);
      q = q.gte('created_at', startOfDay.toISOString());
      q = q.lte('created_at', endOfDay.toISOString());
    }
    if (filterSpecialty) {
      const docsWithSpecialty = doctors.filter(d => d.specialty_id === filterSpecialty).map(d => d.id);
      if (docsWithSpecialty.length > 0) {
        q = q.in('primary_doctor_id', docsWithSpecialty);
      } else {
        q = q.in('primary_doctor_id', ['00000000-0000-0000-0000-000000000000']); // force no results
      }
    }
    if (filterCreator) {
      q = q.eq('created_by', filterCreator);
    }


    // Filter by Creator Specialty requires filtering after fetch or using a more complex join.
    // Given PostgREST limits on nested filtering in 1:many, we'll filter it client side later,
    // OR we filter the `created_by` users directly:
    if (filterCreatorSpecialty) {
      const docsWithSpecialty = doctors.filter(d => d.specialty_id === filterCreatorSpecialty).map(d => d.user_profiles?.id || d.user_id);
      if (docsWithSpecialty.length > 0) {
        q = q.in('created_by', docsWithSpecialty);
      } else {
        q = q.in('created_by', ['00000000-0000-0000-0000-000000000000']);
      }
    }
    if (filterAgeMin) {
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() - parseInt(filterAgeMin));
      q = q.lte('birth_date', maxDate.toISOString().split('T')[0]);
    }
    if (filterAgeMax) {
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - parseInt(filterAgeMax) - 1);
      q = q.gte('birth_date', minDate.toISOString().split('T')[0]);
    }
    if (filterInsurance) q = q.ilike('insurance_provider', `%${filterInsurance}%`);
    if (filterDoctor) q = q.eq('primary_doctor_id', filterDoctor);
    if (filterSearch) {
      q = q.or(`first_name.ilike.%${filterSearch}%,last_name.ilike.%${filterSearch}%,mrn.ilike.%${filterSearch}%`);
    }

    const { data, error } = await q;
    if (!error && data) {
      setPatients(data);
      setTotalPatients(data.length);
    }
    setLoading(false);
  };

  const handleAssignDoctor = async () => {
    if (!assigningPatient || !assignSelectedDoctor || !assignSelectedBed) return;
    setIsAssigning(true);

    const bed = availableBeds.find(b => b.id === assignSelectedBed);
    const locationStr = bed ? `${bed.ala} - ${bed.bed_code}` : null;

    // Actualizar paciente
    await supabase.from('patients').update({
      primary_doctor_id: assignSelectedDoctor,
      current_location: locationStr
    }).eq('id', assigningPatient.id);

    // Actualizar cama
    await supabase.from('camas').update({
      estado: 'OCUPADA',
      patient_id: assigningPatient.id,
      internado_en: new Date().toISOString()
    }).eq('id', assignSelectedBed);

    setIsAssigning(false);
    setAssigningPatient(null);
    setAssignSelectedSpecialty('');
    setAssignSelectedDoctor('');
    setAssignSelectedBed('');
    fetchPatients();
    setTriggerFetch(prev => prev + 1);
  };

  const applyFilters = () => {
    setFilterStatus(pendingStatus);
    setFilterAgeMin(pendingAgeMin);
    setFilterAgeMax(pendingAgeMax);
    setFilterInsurance(pendingInsurance);
    setFilterDoctor(pendingDoctor);
    setFilterSearch(pendingSearch);
    setFilterDate(pendingDate);
    setFilterSpecialty(pendingSpecialty);
    setFilterCreator(pendingCreator);
    setFilterCreatorSpecialty(pendingCreatorSpecialty);
  };

  const clearFilters = () => {
    setPendingStatus('');
    setPendingAgeMin('');
    setPendingAgeMax('');
    setPendingInsurance('');
    setPendingDoctor('');
    setPendingSearch('');
    setPendingDate('');
    setPendingSpecialty('');
    setPendingCreator('');
    setPendingCreatorSpecialty('');
    
    setFilterStatus('');
    setFilterAgeMin('');
    setFilterAgeMax('');
    setFilterInsurance('');
    setFilterDoctor('');
    setFilterSearch('');
    setFilterDate('');
    setFilterSpecialty('');
    setFilterCreator('');
    setFilterCreatorSpecialty('');
  };

  useEffect(() => {
    fetchPatients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterAgeMin, filterAgeMax, filterInsurance, filterDoctor, filterSearch, filterDate, filterSpecialty, filterCreator, filterCreatorSpecialty]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, filterStatus, filterAgeMin, filterAgeMax, filterInsurance, filterDoctor, filterSearch, filterDate, filterSpecialty, filterCreator, filterCreatorSpecialty]);

  // Synchronize reportDate with filterDate when filterByReportDate is enabled
  useEffect(() => {
    if (filterByReportDate) {
      setFilterDate(reportDate);
      setPendingDate(reportDate);
    } else {
      setFilterDate('');
      setPendingDate('');
    }
  }, [reportDate, filterByReportDate]);

  // Suspension action handlers
  const handleSuspendClick = (p: any) => {
    setSuspendingPatient(p);
    setSuspensionReason('');
  };

  const handleConfirmSuspension = async () => {
    if (!suspendingPatient) return;
    
    // Clean old suspension reasons if any to prevent duplicates in chronic_conditions
    const cleanConditions = (suspendingPatient.chronic_conditions || []).filter(
      (c: string) => !c.startsWith('SUSPENSION_REASON:')
    );
    
    const { error } = await supabase
      .from('patients')
      .update({ 
        status: 'SUSPENDED',
        chronic_conditions: [...cleanConditions, `SUSPENSION_REASON: ${suspensionReason || 'No especificado'}`]
      })
      .eq('id', suspendingPatient.id);
    
    if (error) {
      alert('Error al suspender paciente: ' + error.message);
    } else {
      setSuspendingPatient(null);
      fetchPatients();
    }
  };

  const handleReactivatePatient = async (p: any) => {
    if (!confirm(`¿Está seguro de re-activar a ${p.first_name} ${p.last_name}?`)) return;
    
    // Clean suspension reason upon reactivation
    const cleanConditions = (p.chronic_conditions || []).filter(
      (c: string) => !c.startsWith('SUSPENSION_REASON:')
    );

    const { error } = await supabase
      .from('patients')
      .update({ 
        status: 'ACTIVE',
        chronic_conditions: cleanConditions
      })
      .eq('id', p.id);
    
    if (error) {
      alert('Error al reactivar paciente: ' + error.message);
    } else {
      fetchPatients();
    }
  };

  const getSuspensionReason = (p: any) => {
    const reason = p.chronic_conditions?.find((c: string) => c.startsWith('SUSPENSION_REASON:'));
    return reason ? reason.replace('SUSPENSION_REASON:', '').trim() : 'No especificado';
  };

  // Patients are already filtered server-side; local search for quick tab filter
  const filteredPatients = patients.filter(p => {
    // Exclude SUSPENDED patients from the main active list tab
    if (tab === 'list' && p.status === 'SUSPENDED') return false;
    
    // For suspended tab, only show SUSPENDED patients
    if (tab === 'suspended' && p.status !== 'SUSPENDED') return false;

    const matchesSearch =
      !search ||
      (p.first_name + ' ' + p.last_name).toLowerCase().includes(search.toLowerCase()) ||
      p.mrn?.toLowerCase().includes(search.toLowerCase()) ||
      p.ci_passport?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate daily registrations and hourly breakdown for the selected report date
  const patientsOnReportDate = patients.filter(p => {
    if (!p.created_at) return false;
    const pDate = new Date(p.created_at);
    const year = pDate.getFullYear();
    const month = String(pDate.getMonth() + 1).padStart(2, '0');
    const day = String(pDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === reportDate;
  });

  const dailyRegisteredCount = patientsOnReportDate.length;

  const hourlyDistribution = Array(24).fill(0);
  patientsOnReportDate.forEach(p => {
    if (!p.created_at) return;
    const pDate = new Date(p.created_at);
    const hour = pDate.getHours();
    if (hour >= 0 && hour < 24) {
      hourlyDistribution[hour]++;
    }
  });

  const maxHourCount = Math.max(...hourlyDistribution, 1);
  const peakHour = hourlyDistribution.reduce((maxIdx, currentVal, currentIdx, arr) => 
    currentVal > arr[maxIdx] ? currentIdx : maxIdx, 0
  );
  const peakHourCount = hourlyDistribution[peakHour];

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'ACTIVE': return { label: 'Activo', color: '#4CAF50' };
      case 'HOSPITALIZED': return { label: 'Hospitalizado', color: '#1E88E5' };
      case 'DISCHARGED': return { label: 'De Alta', color: '#FF9800' };
      case 'SUSPENDED': return { label: 'Suspendido', color: '#F44336' };
      default: return { label: status, color: '#9C27B0' };
    }
  };

  const getRoleLabel = (role: string) => {
    return {'RECEPTIONIST': 'Recepción', 'SUPER_ADMIN': 'Administrador', 'DOCTOR': 'Médico', 'NURSE': 'Enfermería', 'SPECIALIST': 'Especialista'}[role] || role;
  };

  const getAge = (dob: string) => {
    if (!dob) return '?';
    const ageDifMs = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
  };

  const handleEditClick = (p: any) => {
    setEditingPatient(p);
    setEditForm({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      ci_passport: p.ci_passport || '',
      birth_date: p.birth_date || '',
      gender: p.gender || 'MALE',
      phone_primary: p.phone_primary || '',
      phone_secondary: p.phone_secondary || '',
      email: p.email || '',
      address_line1: p.address_line1 || '',
      city: p.city || '',
      state_province: p.state_province || '',
      insurance_provider: p.insurance_provider || '',
      insurance_policy_num: p.insurance_policy_num || '',
      status: p.status || 'ACTIVE',
      emergency_name: p.emergency_name || '',
      emergency_phone: p.emergency_phone || '',
      emergency_relation: p.emergency_relation || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.first_name || !editForm.last_name || !editForm.ci_passport || !editForm.phone_primary || !editForm.birth_date || !editForm.gender) {
      alert('Por favor complete los campos obligatorios (*)');
      return;
    }
    
    setSavingEdit(true);
    const { error } = await supabase
      .from('patients')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        ci_passport: editForm.ci_passport,
        birth_date: editForm.birth_date,
        gender: editForm.gender,
        phone_primary: editForm.phone_primary,
        phone_secondary: editForm.phone_secondary || null,
        email: editForm.email || null,
        address_line1: editForm.address_line1 || null,
        city: editForm.city || null,
        state_province: editForm.state_province || null,
        insurance_provider: editForm.insurance_provider || null,
        insurance_policy_num: editForm.insurance_policy_num || null,
        status: editForm.status,
        emergency_name: editForm.emergency_name || null,
        emergency_phone: editForm.emergency_phone || null,
        emergency_relation: editForm.emergency_relation || null
      })
      .eq('id', editingPatient.id);

    setSavingEdit(false);
    if (error) {
      alert('Error al guardar cambios: ' + error.message);
    } else {
      setEditingPatient(null);
      fetchPatients();
      
      // Update quick preview if currently opened
      if (quickPreviewPatient?.id === editingPatient.id) {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .eq('id', editingPatient.id)
          .single();
        if (data) {
          setQuickPreviewPatient(data);
        }
      }
    }
  };

  const getRecommendedAla = (specialtyName: string) => {
    if (!specialtyName) return '';
    const name = specialtyName.toLowerCase();
    if (name.includes('cirugía') || name.includes('traumatología') || name.includes('urología') || name.includes('oftalmología') || name.includes('otorrinolaringología')) return 'Bloque Quirúrgico';
    if (name.includes('ginecología') || name.includes('obstetricia') || name.includes('pediatría')) return 'Materno-Infantil';
    if (name.includes('psiquiatría')) return 'Psiquiatría';
    if (name.includes('emergencia') || name.includes('urgencia')) return 'Urgencias';
    if (name.includes('intensivo') || name.includes('crítico')) return 'Cuidados Críticos';
    return 'Medicina Interna';
  };

  const selectedSpecObj = specialties.find(s => s.id === assignSelectedSpecialty);
  const recommendedAla = selectedSpecObj ? getRecommendedAla(selectedSpecObj.name) : '';
  const recommendedBeds = availableBeds.filter(b => b.ala === recommendedAla);
  const otherBeds = availableBeds.filter(b => b.ala !== recommendedAla);

  return (
    <>
      <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Administración ADT</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Admisión · Traslado · Alta — Registro Universal de Pacientes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={fetchPatients}><Icon name="RefreshCw" size={14} /> Refrescar</button>
          <button className="btn-ghost"><Icon name="Download" size={14} /> Exportar</button>
          <Link href="/registro-paciente" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="Plus" size={14} /> Nueva Admisión
          </Link>
        </div>
      </div>

      {/* Sleek Integrated Telemetry & Report Panel */}
      <div className="glass-card" style={{ 
        padding: '16px 20px', 
        marginBottom: 24, 
        border: '1px solid var(--border-primary)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {/* Header Title with live dot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-teal-light)', margin: 0 }}>
              TELEMETRÍA CLÍNICA Y CONTROL DE ADMISIONES ADT
            </h3>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Actualizado en tiempo real
          </span>
        </div>

        {/* 2-Column Responsive Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: 20 
        }}>
          {/* Column 1: General Stats Pills (Super Compact) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>
              Resumen Clínico General
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total Registrados', value: patients.length, icon: 'Users', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.08)' },
                { label: 'Hospitalizados Activos', value: patients.filter(p => p.status === 'HOSPITALIZED').length, icon: 'Bed', color: '#1E88E5', bg: 'rgba(30, 136, 229, 0.08)' },
                { label: 'Altas Clínicas', value: patients.filter(p => p.status === 'DISCHARGED').length, icon: 'CheckCircle2', color: '#FF9800', bg: 'rgba(255, 152, 0, 0.08)' },
                { label: 'Ingresos por Emergencias', value: patients.filter(p => p.created_by === null).length, icon: 'Siren', color: '#F44336', bg: 'rgba(244, 67, 54, 0.08)' },
              ].map(item => (
                <div key={item.label} style={{ 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border-secondary)', 
                  borderRadius: 10, 
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
                >
                  <div style={{ 
                    width: 28, height: 28, borderRadius: 8, 
                    background: item.bg, display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                  }}>
                    <Icon name={item.icon} size={13} style={{ color: item.color }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                      {loading ? '...' : item.value}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Date Report & Hourly Graph */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.01)', 
            border: '1px solid var(--border-secondary)', 
            borderRadius: 12, 
            padding: '12px 14px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 10 
          }}>
            {/* Control Bar for Report */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="Calendar" size={14} style={{ color: 'var(--color-teal)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Reporte de Registros</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Checkbox to toggle table filtering */}
                <label style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 5, 
                  fontSize: 11, 
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input 
                    type="checkbox" 
                    checked={filterByReportDate} 
                    onChange={e => setFilterByReportDate(e.target.checked)}
                    style={{
                      width: 13,
                      height: 13,
                      accentColor: 'var(--color-blue)',
                      cursor: 'pointer'
                    }}
                  />
                  Filtrar lista
                </label>

                {/* Professional Custom Date Picker */}
                <div 
                  style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={e => {
                    const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null;
                    if (input) {
                      if (typeof input.showPicker === 'function') {
                        input.showPicker();
                      } else {
                        input.focus();
                      }
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    pointerEvents: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    height: 28,
                    minWidth: 125,
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="Calendar" size={11} style={{ color: 'var(--color-teal)' }} />
                      <span>
                        {(() => {
                          const dateParts = reportDate.split('-');
                          if (dateParts.length === 3) {
                            const dObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                            return dObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                          }
                          return reportDate;
                        })()}
                      </span>
                    </span>
                    <Icon name="ChevronDown" size={11} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <input 
                    type="date" 
                    value={reportDate} 
                    onChange={e => setReportDate(e.target.value)} 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Daily Counter Summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px dashed var(--border-secondary)' }}>
              <div style={{ 
                fontSize: 26, fontWeight: 900, 
                background: 'linear-gradient(135deg, var(--color-teal-light) 0%, var(--color-blue) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1
              }}>
                {dailyRegisteredCount}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.3 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Pacientes Registrados</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {filterByReportDate ? `Filtrando lista para el ${reportDate}` : 'Filtrado de lista desactivado'}
                </span>
              </div>
              {dailyRegisteredCount > 0 && (
                <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)' }}>
                  Pico: <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{String(peakHour).padStart(2, '0')}:00</span> ({peakHourCount} reg.)
                </div>
              )}
            </div>

            {/* Hourly Distribution Equalizer Graph */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>DISTRIBUCIÓN HORARIA (00h - 23h)</span>
                <span>Frecuencia por Hora</span>
              </div>
              {dailyRegisteredCount === 0 ? (
                <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)', border: '1px dashed var(--border-secondary)' }}>
                  Sin registros en la fecha seleccionada.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Equalizer-like 24 Bar Visual Container */}
                  <div style={{ 
                    height: 30, 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    gap: 2, 
                    padding: '2px 4px',
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: 6,
                    border: '1px solid var(--border-secondary)',
                    overflow: 'hidden'
                  }}>
                    {hourlyDistribution.map((count, hour) => {
                      const heightPercent = count > 0 ? (count / maxHourCount) * 100 : 8;
                      const hasRegs = count > 0;
                      return (
                        <div 
                          key={hour} 
                          title={`${String(hour).padStart(2, '0')}:00 - ${count} registros`}
                          style={{
                            flex: 1,
                            height: `${heightPercent}%`,
                            background: hasRegs 
                              ? 'linear-gradient(to top, var(--color-blue-dark), var(--color-cyan))' 
                              : 'rgba(138, 163, 200, 0.08)',
                            borderRadius: '1px 1px 0 0',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            boxShadow: hasRegs ? '0 0 8px rgba(0, 229, 255, 0.2)' : 'none',
                          }}
                          onMouseEnter={e => {
                            if (hasRegs) e.currentTarget.style.filter = 'brightness(1.3)';
                          }}
                          onMouseLeave={e => {
                            if (hasRegs) e.currentTarget.style.filter = 'none';
                          }}
                        />
                      );
                    })}
                  </div>
                  {/* Graph Labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', fontSize: 8, color: 'var(--text-muted)' }}>
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom: 16, width: 'fit-content' }}>
        {[
          { id: 'list', label: 'Lista de Pacientes' }, 
          { id: 'discharge', label: 'Proceso de Alta' },
          { id: 'suspended', label: `Pacientes Suspendidos (${patients.filter(p => p.status === 'SUSPENDED').length})` }
        ].map(t => (
          <div key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id as typeof tab); setCurrentPage(1); }}>{t.label}</div>
        ))}
      </div>

      {(tab === 'list' || tab === 'suspended') && (
        <>
          {/* Search + Filter Toggle Row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Icon name="Search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input className="input-field" style={{ paddingLeft: 36, width: '100%' }} placeholder="Buscar por MRN, Cédula o Nombre..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input-field" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="HOSPITALIZED">Hospitalizados</option>
              <option value="DISCHARGED">De Alta</option>
            </select>
            <button className="btn-ghost" onClick={() => setFiltersOpen(!filtersOpen)} style={{ gap: 6, whiteSpace: 'nowrap' }}>
              <Icon name="SlidersHorizontal" size={14} />
              Filtros {filtersOpen ? '▲' : '▼'}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 14,
            display: filtersOpen ? 'block' : 'none',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Estado</label>
                <select className="input-field" value={pendingStatus} onChange={e => setPendingStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="HOSPITALIZED">HOSPITALIZED</option>
                  <option value="OUTPATIENT">OUTPATIENT</option>
                  <option value="DISCHARGED">DISCHARGED</option>
                  <option value="DECEASED">DECEASED</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Edad mínima</label>
                <input type="number" className="input-field" placeholder="Ej: 18" value={pendingAgeMin} onChange={e => setPendingAgeMin(e.target.value)} min={0} max={120} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Edad máxima</label>
                <input type="number" className="input-field" placeholder="Ej: 65" value={pendingAgeMax} onChange={e => setPendingAgeMax(e.target.value)} min={0} max={120} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Seguro médico</label>
                <input className="input-field" placeholder="Ej: Medicare" value={pendingInsurance} onChange={e => setPendingInsurance(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Médico tratante</label>
                <select className="input-field" value={pendingDoctor} onChange={e => setPendingDoctor(e.target.value)}>
                  <option value="">Todos</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.title} {(d.user_profiles as any)?.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Día de Registro</label>
                <input type="date" className="input-field" value={pendingDate} onChange={e => setPendingDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Especialidad Tratante</label>
                <select className="input-field" value={pendingSpecialty} onChange={e => setPendingSpecialty(e.target.value)}>
                  <option value="">Todas</option>
                  {specialties.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Especialidad del que Registró</label>
                <select className="input-field" value={pendingCreatorSpecialty} onChange={e => setPendingCreatorSpecialty(e.target.value)}>
                  <option value="">Todas</option>
                  {specialties.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Especialista que Registró</label>
                <select className="input-field" value={pendingCreator} onChange={e => setPendingCreator(e.target.value)}>
                  <option value="">Todos</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.user_profiles?.id || d.user_id}>{(d.user_profiles as any)?.full_name || d.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Buscar</label>
                <input className="input-field" placeholder="Nombre, apellido o MRN" value={pendingSearch} onChange={e => setPendingSearch(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn-primary" onClick={applyFilters}>Aplicar Filtros</button>
              <button className="btn-ghost" onClick={clearFilters}>Limpiar</button>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                Mostrando {filteredPatients.length} de {totalPatients} pacientes
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="glass-card" style={{ overflowX: 'auto', width: '100%' }}>
                <table className="data-table">
                  <thead style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border-primary)' }}>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap', color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Hash" size={13} /> MRN / ID</div>
                      </th>
                      <th style={{ whiteSpace: 'nowrap', color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="CreditCard" size={13} /> Documento</div>
                      </th>
                      <th style={{ color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="User" size={13} /> Nombre</div>
                      </th>
                      <th style={{ color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Users" size={13} /> Apellido</div>
                      </th>
                      <th style={{ whiteSpace: 'nowrap', color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Activity" size={13} /> Edad/Sex</div>
                      </th>
                      <th style={{ color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Phone" size={13} /> Contacto</div>
                      </th>
                      <th style={{ color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name={tab === 'suspended' ? 'AlertCircle' : 'Shield'} size={13} /> 
                          {tab === 'suspended' ? 'Motivo Suspensión' : 'Seguro'}
                        </div>
                      </th>
                      <th style={{ whiteSpace: 'nowrap', color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Bed" size={13} /> Ubicación</div>
                      </th>
                      <th style={{ whiteSpace: 'nowrap', color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="HeartPulse" size={13} /> Estado</div>
                      </th>
                      <th style={{ whiteSpace: 'nowrap', color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Clock" size={13} /> Ingreso</div>
                      </th>
                      <th style={{ color: 'var(--color-blue)', padding: '12px 10px', maxWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Stethoscope" size={13} /> Médico Tratante</div>
                      </th>
                      <th style={{ whiteSpace: 'nowrap', color: 'var(--color-blue)', padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="Settings2" size={13} /> Acciones</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin" /></td></tr>
                    ) : filteredPatients.length === 0 ? (
                      <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No se encontraron pacientes.</td></tr>
                    ) : (
                      paginatedPatients.map(p => {
                        const sc = getStatusConfig(p.status);
                        const assignedDoc = doctors.find(d => d.id === p.primary_doctor_id);
                        const assignedDocName = assignedDoc ? `${assignedDoc.title} ${assignedDoc.user_profiles?.full_name || 'Desconocido'}` : 'Sin Asignar';
                        const assignedDocSpecialty = assignedDoc ? specialties.find(s => s.id === assignedDoc.specialty_id)?.name : null;
                        const isSelected = quickPreviewPatient?.id === p.id;
                        const cellStyle = isSelected ? { background: 'rgba(30, 136, 229, 0.12)' } : undefined;
                        return (
                          <tr key={p.id} onClick={() => setQuickPreviewPatient(p)} style={{ cursor: 'pointer' }}>
                            <td style={{ ...cellStyle, borderLeft: isSelected ? '3px solid #1E88E5' : '3px solid transparent', transition: 'border-color 0.15s ease' }}>
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--color-teal)', fontWeight: 700, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                <span>{p.mrn?.split('-')[0]}</span>
                                <span>{p.mrn?.split('-').slice(1).join('-')}</span>
                              </div>
                            </td>
                            <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600, fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{p.ci_passport}</div>
                            </td>
                            <td style={{ ...cellStyle }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border-secondary)',
                                  background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  overflow: 'hidden', flexShrink: 0
                                }}>
                                  {p.photo_url ? (
                                    <img src={p.photo_url} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: 'rgba(30,136,229,0.1)', color: '#1E88E5' }}>
                                      {p.first_name?.[0] || ''}{p.last_name?.[0] || ''}
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11.5 }}>{p.first_name}</span>
                              </div>
                            </td>
                            <td style={{ ...cellStyle }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11.5 }}>{p.last_name}</span>
                            </td>
                            <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                              <div style={{ fontSize: 11.5 }}>{getAge(p.birth_date)}a</div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{p.gender === 'MALE' ? 'Masc.' : p.gender === 'FEMALE' ? 'Fem.' : p.gender}</div>
                            </td>
                            <td style={{ ...cellStyle }}>
                              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{p.phone_primary}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.city || '—'}</div>
                            </td>
                            <td style={{ ...cellStyle }}>
                               {tab === 'suspended' ? (
                                 <span style={{ fontSize: 11, color: 'var(--color-red-light)', fontStyle: 'italic', fontWeight: 600 }}>
                                   Motivo: {getSuspensionReason(p)}
                                 </span>
                               ) : (
                                 <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.insurance_provider || 'Particular'}</span>
                               )}
                             </td>
                             <td style={{ ...cellStyle }}>
                               <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.current_location || 'No asignada'}</span>
                             </td>
                             <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}><span className="badge" style={{ background: `${sc.color}18`, color: sc.color, borderColor: `${sc.color}30`, whiteSpace: 'nowrap', fontSize: 10.5, padding: '2px 6px' }}>{sc.label}</span></td>
                             <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                               <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                 <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                 <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                             </td>
                             <td style={{ ...cellStyle, maxWidth: 160 }}>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                   <Icon name="Stethoscope" size={14} style={{ color: 'var(--color-teal)', marginTop: 1, flexShrink: 0 }} />
                                   <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                     {assignedDocName}
                                   </span>
                                 </div>
                                 <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 20, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                   {assignedDocSpecialty || (p.triage_level ? `Triage: ${p.triage_level}` : '---')}
                                 </div>
                               </div>
                             </td>
                             <td style={{ ...cellStyle, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                               <div style={{ display: 'flex', gap: 2 }}>
                                 <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11, color: isSelected ? '#1E88E5' : 'inherit' }} title="Vista Rápida" onClick={() => setQuickPreviewPatient(p)}>
                                   <Icon name="EyeIcon" size={12} />
                                 </button>
                                 
                                 {tab === 'list' ? (
                                   <>
                                     <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11, color: 'var(--color-teal)' }} title="Asignar Médico" onClick={() => setAssigningPatient(p)}>
                                       <Icon name="UserPlus" size={12} />
                                     </button>
                                     <Link href={`/historia-clinica?mrn=${p.mrn}`} className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Ver Historia">
                                       <Icon name="FileText" size={12} />
                                     </Link>
                                     <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11 }} title="Editar" onClick={() => handleEditClick(p)}>
                                       <Icon name="Edit" size={12} />
                                     </button>
                                     <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11, color: 'var(--color-red-light)' }} title="Suspender Paciente" onClick={() => handleSuspendClick(p)}>
                                       <Icon name="XCircle" size={12} />
                                     </button>
                                   </>
                                 ) : (
                                   <>
                                     <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11, color: 'var(--color-green-light)' }} title="Re-activar Paciente" onClick={() => handleReactivatePatient(p)}>
                                       <Icon name="CheckCircle" size={12} />
                                     </button>
                                   </>
                                 )}
                               </div>
                             </td>
                          </tr>
                        );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (Always visible to ensure UI clarity) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 10,
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Mostrando <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filteredPatients.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> - <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredPatients.length)}</span> de <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filteredPatients.length}</span> pacientes
              </span>
              
              {/* Page Size Selector */}
              <select 
                value={itemsPerPage} 
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }} 
                className="input-field" 
                style={{ 
                  width: 100, 
                  height: 24, 
                  padding: '2px 24px 2px 8px', 
                  fontSize: 10.5, 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10 / pág.</option>
                <option value={20}>20 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn-ghost"
                style={{ padding: '4px 8px', fontSize: 11, minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || totalPages <= 1}
                title="Primera Página"
              >
                «
              </button>
              <button
                className="btn-ghost"
                style={{ padding: '4px 8px', fontSize: 11, minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages <= 1}
                title="Anterior"
              >
                <Icon name="ChevronLeft" size={12} />
              </button>

              {/* Dynamic Page Buttons */}
              {totalPages <= 1 ? (
                <button
                  className="btn-ghost"
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    minWidth: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--color-blue)',
                    color: 'var(--text-primary)',
                    fontWeight: 700
                  }}
                  disabled
                >
                  1
                </button>
              ) : (
                Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                  })
                  .map((page, index, arr) => {
                    const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                    return (
                      <div key={page} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {showEllipsis && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>...</span>}
                        <button
                          className="btn-ghost"
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            minWidth: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: currentPage === page ? 'var(--bg-elevated)' : 'transparent',
                            borderColor: currentPage === page ? 'var(--color-blue)' : 'var(--border-secondary)',
                            color: currentPage === page ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: currentPage === page ? 700 : 500
                          }}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })
              )}

              <button
                className="btn-ghost"
                style={{ padding: '4px 8px', fontSize: 11, minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages <= 1}
                title="Siguiente"
              >
                <Icon name="ChevronRight" size={12} />
              </button>
              <button
                className="btn-ghost"
                style={{ padding: '4px 8px', fontSize: 11, minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages <= 1}
                title="Última Página"
              >
                »
              </button>
            </div>
          </div>
        </div>

            {/* Side Quick Preview Panel */}
            {quickPreviewPatient && (
              <div className="glass-card animate-fade-in" style={{
                width: 340,
                flexShrink: 0,
                padding: 20,
                alignSelf: 'flex-start',
                position: 'sticky',
                top: 20,
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                background: 'var(--bg-card)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: '#1E88E5', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="User" size={14} /> Vista Rápida
                  </h3>
                  <button onClick={() => setQuickPreviewPatient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Icon name="X" size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', flexShrink: 0 }}>
                    {quickPreviewPatient.photo_url ? (
                      <img src={quickPreviewPatient.photo_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: 'rgba(30,136,229,0.1)', color: '#1E88E5' }}>
                        {quickPreviewPatient.first_name?.[0] || ''}{quickPreviewPatient.last_name?.[0] || ''}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{quickPreviewPatient.first_name} {quickPreviewPatient.last_name}</h4>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{quickPreviewPatient.mrn}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--bg-surface)', padding: 8, borderRadius: 6 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>IDENTIFICACIÓN</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{quickPreviewPatient.ci_passport}</span>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: 8, borderRadius: 6 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>EDAD / GÉNERO</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {getAge(quickPreviewPatient.birth_date)}a · {quickPreviewPatient.gender === 'MALE' ? 'Masc' : quickPreviewPatient.gender === 'FEMALE' ? 'Fem' : quickPreviewPatient.gender}
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: 8, borderRadius: 6 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>TELÉFONO</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{quickPreviewPatient.phone_primary}</span>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: 8, borderRadius: 6 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>CIUDAD</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{quickPreviewPatient.city || '—'}</span>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: 8, borderRadius: 6 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>DIRECCIÓN</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{quickPreviewPatient.address_line1 || '—'}</span>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: 8, borderRadius: 6 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>CONTACTO DE EMERGENCIA</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {quickPreviewPatient.emergency_name || '—'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{quickPreviewPatient.emergency_phone || '—'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>FIRMA</span>
                    <div style={{ height: 40, border: '1px solid var(--border-primary)', borderRadius: 4, overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {quickPreviewPatient.consent_signature_url ? (
                        <img src={quickPreviewPatient.consent_signature_url} alt="Firma" style={{ height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sin firma</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>CARNET ID</span>
                    <div style={{ height: 40, border: '1px solid var(--border-primary)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {quickPreviewPatient.id_card_url ? (
                        <img src={quickPreviewPatient.id_card_url} alt="Carnet" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(quickPreviewPatient.id_card_url, '_blank')} />
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sin carnet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Link href={`/historia-clinica?mrn=${quickPreviewPatient.mrn}`} className="btn-primary" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: 11, padding: '8px 12px' }}>
                    <Icon name="FileText" size={12} /> Abrir Historia Clínica
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'discharge' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          {/* Left Column: Formulario */}
          <div className="glass-card" style={{ padding: 24, flex: '1 1 500px', maxWidth: 600 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Proceso de Alta Médica</h2>
            <div style={{ background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.25)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="AlertTriangle" size={14} style={{ color: '#FF9800', marginTop: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  El alta requiere firma del médico tratante. Se generará el resumen de egreso y las indicaciones post-alta de forma automática.
                </span>
              </div>
            </div>
            {[
              { label: 'MRN Paciente *', placeholder: 'SJD-2026-XXXXX' },
              { label: 'Diagnóstico de Egreso (ICD-11)', placeholder: 'Código o buscar...' },
              { label: 'Condición al alta', placeholder: 'Mejorado / Estable / Fallecido / Traslado' },
              { label: 'Médico responsable', placeholder: 'Nombre o ID del médico' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input className="input-field" placeholder={f.placeholder} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Indicaciones post-alta</label>
              <textarea className="input-field" style={{ height: 80, resize: 'vertical' }} placeholder="Indicaciones, medicamentos, citas de seguimiento..." />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary"><Icon name="CheckCircle2" size={14} /> Confirmar Alta</button>
              <button className="btn-ghost"><Icon name="Printer" size={14} /> Imprimir Resumen</button>
            </div>
          </div>

          {/* Right Column: Contexto del Paciente y Checklist */}
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Tarjeta de Identificación del Paciente */}
            <div className="glass-card animate-fade-in" style={{ padding: 20, borderTop: '4px solid #1E88E5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(30,136,229,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E88E5' }}>
                  <Icon name="User" size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Esperando MRN...</h3>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ingrese el MRN para cargar datos</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>EDAD / SEXO</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>--</span>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>CAMA ACTUAL</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>--</span>
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, marginTop: 12 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>FECHA DE INGRESO</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>--</span>
              </div>
            </div>

            {/* Checklist de Alta */}
            <div className="glass-card animate-fade-in" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="ListChecks" size={16} style={{ color: '#4CAF50' }} /> Requisitos de Alta
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Estado de Cuenta (Caja)', text: 'Pendiente de MRN' },
                  { label: 'Receta de Egreso', text: 'Pendiente de MRN' },
                  { label: 'Liberación de Cama', text: 'Pendiente de MRN' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, background: 'var(--bg-surface)' }}>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Botón Integración Historia */}
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(33, 150, 243, 0.08)', borderRadius: 8, border: '1px dashed rgba(33, 150, 243, 0.3)' }}>
              <Icon name="Database" size={16} style={{ color: '#2196F3', flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Al confirmar, este formulario se anexará automáticamente a la <strong>Historia Clínica</strong> del paciente en la base de datos.
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Sleek Premium Edit Modal */}
      {editingPatient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6, 13, 26, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 16,
            padding: 24,
            maxWidth: 600,
            width: '100%',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Editar Datos del Paciente</h2>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{editingPatient.mrn}</div>
              </div>
              <button onClick={() => setEditingPatient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Fotos del Paciente y de su Carnet */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>FOTO DE PERFIL</div>
                  <div style={{ width: 70, height: 70, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)' }}>
                    {editingPatient.photo_url ? (
                      <img src={editingPatient.photo_url} alt="Foto Paciente" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(editingPatient.photo_url, '_blank')} title="Ver en tamaño completo" />
                    ) : (
                      <Icon name="User" size={24} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>DOCUMENTO DE IDENTIDAD</div>
                  <div style={{ height: 70, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)' }}>
                    {editingPatient.id_card_url ? (
                      <img src={editingPatient.id_card_url} alt="Carnet Paciente" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(editingPatient.id_card_url, '_blank')} title="Ver en tamaño completo" />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin documento cargado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 1: Identificación y Demografía */}
              <div style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: 6, marginTop: 4 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1E88E5', margin: 0 }}>Identidad y Demografía</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombres *</label>
                  <input className="input-field" value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Apellidos *</label>
                  <input className="input-field" value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cédula / Carnet *</label>
                  <input className="input-field" value={editForm.ci_passport} onChange={e => setEditForm({...editForm, ci_passport: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>F. Nacimiento *</label>
                  <input type="date" className="input-field" value={editForm.birth_date} onChange={e => setEditForm({...editForm, birth_date: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Género *</label>
                  <select className="input-field" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Femenino</option>
                    <option value="OTHER">Otro</option>
                    <option value="PREFER_NOT_SAY">No especificar</option>
                  </select>
                </div>
              </div>

              {/* Sección 2: Contacto y Ubicación */}
              <div style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: 6, marginTop: 4 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1E88E5', margin: 0 }}>Contacto y Ubicación</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Teléfono Principal *</label>
                  <input className="input-field" value={editForm.phone_primary} onChange={e => setEditForm({...editForm, phone_primary: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Teléfono Secundario</label>
                  <input className="input-field" value={editForm.phone_secondary} onChange={e => setEditForm({...editForm, phone_secondary: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Correo Electrónico</label>
                <input type="email" className="input-field" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Dirección de Residencia</label>
                  <input className="input-field" value={editForm.address_line1} onChange={e => setEditForm({...editForm, address_line1: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ciudad</label>
                  <input className="input-field" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Provincia</label>
                  <input className="input-field" value={editForm.state_province} onChange={e => setEditForm({...editForm, state_province: e.target.value})} />
                </div>
              </div>

              {/* Sección 3: Seguro y Cobertura */}
              <div style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: 6, marginTop: 4 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1E88E5', margin: 0 }}>Seguro y Estado</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Aseguradora</label>
                  <select className="input-field" value={editForm.insurance_provider || ''} onChange={e => setEditForm({...editForm, insurance_provider: e.target.value})}>
                    <option value="">Ninguno / Particular</option>
                    <option value="Medicare">Medicare</option>
                    <option value="Medicaid">Medicaid</option>
                    <option value="BlueCross">BlueCross BlueShield</option>
                    <option value="SeguroPrivado">Otro Seguro Privado</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nro. de Póliza</label>
                  <input className="input-field" value={editForm.insurance_policy_num} onChange={e => setEditForm({...editForm, insurance_policy_num: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Estado Clínico</label>
                  <select className="input-field" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                    <option value="ACTIVE">Activo / Ambulatorio</option>
                    <option value="HOSPITALIZED">Hospitalizado</option>
                    <option value="DISCHARGED">De Alta</option>
                    <option value="SUSPENDED">Suspendido</option>
                  </select>
                </div>
              </div>

              {/* Sección 4: Contacto de Emergencia */}
              <div style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: 6, marginTop: 4 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1E88E5', margin: 0 }}>Contacto de Emergencia</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombre Contacto</label>
                  <input className="input-field" value={editForm.emergency_name} onChange={e => setEditForm({...editForm, emergency_name: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Relación</label>
                  <input className="input-field" value={editForm.emergency_relation} onChange={e => setEditForm({...editForm, emergency_relation: e.target.value})} placeholder="Ej: Madre, Esposa" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Teléfono Contacto</label>
                  <input className="input-field" value={editForm.emergency_phone} onChange={e => setEditForm({...editForm, emergency_phone: e.target.value})} />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setEditingPatient(null)} disabled={savingEdit}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={savingEdit} style={{ background: 'linear-gradient(135deg, #1E88E5, #0D47A1)', minWidth: 120 }}>
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspension Justification Modal */}
      {suspendingPatient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6, 13, 26, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 16,
            padding: 24,
            maxWidth: 450,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#F44336', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="XCircle" size={18} /> Suspender Registro
              </h3>
              <button onClick={() => setSuspendingPatient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={18} /></button>
            </div>

            <div>
              <p style={{ fontSize: 12.5, color: 'var(--text-primary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                Está a punto de suspender/inactivar el registro de <strong style={{ color: 'var(--text-primary)' }}>{suspendingPatient.first_name} {suspendingPatient.last_name}</strong> (MRN: {suspendingPatient.mrn}).
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Esto ocultará al paciente de las listas de admisiones activas. Por favor indique el motivo de la suspensión:
              </p>
              
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Motivo / Justificación *</label>
              <textarea 
                className="input-field" 
                style={{ height: 80, resize: 'vertical', width: '100%', padding: 8 }} 
                placeholder="Escriba la justificación médica o administrativa..."
                value={suspensionReason}
                onChange={e => setSuspensionReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => setSuspendingPatient(null)}>Cancelar</button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmSuspension}
                disabled={!suspensionReason.trim()}
                style={{ background: 'linear-gradient(135deg, #F44336, #D32F2F)', color: 'white', border: 'none', minWidth: 100 }}
              >
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Assign Doctor Modal */}
      {assigningPatient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6, 13, 26, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 16,
            padding: 24,
            maxWidth: 450,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="Stethoscope" size={18} style={{ color: 'var(--color-teal)' }} /> Asignación Inteligente
              </h3>
              <button onClick={() => { setAssigningPatient(null); setAssignSelectedSpecialty(''); setAssignSelectedDoctor(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={18} /></button>
            </div>

            <div>
              <p style={{ fontSize: 12.5, color: 'var(--text-primary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Asignando médico tratante para <strong style={{ color: 'var(--color-teal)' }}>{assigningPatient.first_name} {assigningPatient.last_name}</strong> (MRN: {assigningPatient.mrn}).
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>1. Filtrar por Especialidad</label>
                  <select 
                    className="input-field" 
                    value={assignSelectedSpecialty} 
                    onChange={e => { setAssignSelectedSpecialty(e.target.value); setAssignSelectedDoctor(''); }}
                    style={{ width: '100%' }}
                  >
                    <option value="">Todas las especialidades...</option>
                    {specialties.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>2. Seleccionar Médico</label>
                  <select 
                    className="input-field" 
                    value={assignSelectedDoctor} 
                    onChange={e => setAssignSelectedDoctor(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Seleccione al médico...</option>
                    {doctors
                      .filter(d => !assignSelectedSpecialty || d.specialty_id === assignSelectedSpecialty)
                      .map(d => (
                      <option key={d.id} value={d.id}>{d.title} {d.user_profiles?.full_name || 'Desconocido'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>3. Asignar Cama Física</label>
                  <select 
                    className="input-field" 
                    value={assignSelectedBed} 
                    onChange={e => setAssignSelectedBed(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Seleccione cama disponible...</option>
                    {recommendedAla && recommendedBeds.length > 0 && (
                      <optgroup label={`Camas Recomendadas (${recommendedAla})`}>
                        {recommendedBeds.map(b => (
                          <option key={b.id} value={b.id}>{b.ala} - Cama {b.bed_code} ({b.tipo})</option>
                        ))}
                      </optgroup>
                    )}
                    {otherBeds.length > 0 && (
                      <optgroup label="Otras Camas Disponibles">
                        {otherBeds.map(b => (
                          <option key={b.id} value={b.id}>{b.ala} - Cama {b.bed_code} ({b.tipo})</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => { setAssigningPatient(null); setAssignSelectedSpecialty(''); setAssignSelectedDoctor(''); setAssignSelectedBed(''); }}>Cancelar</button>
              <button 
                className="btn-primary" 
                onClick={handleAssignDoctor}
                disabled={!assignSelectedDoctor || !assignSelectedBed || isAssigning}
                style={{ background: 'linear-gradient(135deg, #00B4D8, #0077B6)', color: 'white', border: 'none', minWidth: 100 }}
              >
                {isAssigning ? 'Asignando...' : 'Asignar Cama y Médico'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

export function ADTPage() {
  const [tab, setTab] = useState<'list' | 'discharge'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [patients, setPatients] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Advanced filters state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [filterInsurance, setFilterInsurance] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);

  // Pending filter inputs (applied only on click)
  const [pendingStatus, setPendingStatus] = useState('');
  const [pendingAgeMin, setPendingAgeMin] = useState('');
  const [pendingAgeMax, setPendingAgeMax] = useState('');
  const [pendingInsurance, setPendingInsurance] = useState('');
  const [pendingDoctor, setPendingDoctor] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');

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
  }, []);

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('professionals')
      .select('id, title, user_profiles(full_name)');
    if (data) setDoctors(data);
  };

  const fetchPatients = async () => {
    setLoading(true);
    let q = supabase
      .from('patients')
      .select('*')
      .neq('status', 'OUTPATIENT')
      .order('created_at', { ascending: false });

    if (filterStatus) q = q.eq('status', filterStatus);
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

  const applyFilters = () => {
    setFilterStatus(pendingStatus);
    setFilterAgeMin(pendingAgeMin);
    setFilterAgeMax(pendingAgeMax);
    setFilterInsurance(pendingInsurance);
    setFilterDoctor(pendingDoctor);
    setFilterSearch(pendingSearch);
  };

  const clearFilters = () => {
    setPendingStatus('');
    setPendingAgeMin('');
    setPendingAgeMax('');
    setPendingInsurance('');
    setPendingDoctor('');
    setPendingSearch('');
    setFilterStatus('');
    setFilterAgeMin('');
    setFilterAgeMax('');
    setFilterInsurance('');
    setFilterDoctor('');
    setFilterSearch('');
  };

  useEffect(() => {
    fetchPatients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterAgeMin, filterAgeMax, filterInsurance, filterDoctor, filterSearch]);

  // Patients are already filtered server-side; local search for quick tab filter
  const filteredPatients = patients.filter(p => {
    const matchesSearch =
      !search ||
      (p.first_name + ' ' + p.last_name).toLowerCase().includes(search.toLowerCase()) ||
      p.mrn?.toLowerCase().includes(search.toLowerCase()) ||
      p.ci_passport?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'ACTIVE': return { label: 'Activo', color: '#4CAF50' };
      case 'HOSPITALIZED': return { label: 'Hospitalizado', color: '#1E88E5' };
      case 'DISCHARGED': return { label: 'De Alta', color: '#FF9800' };
      default: return { label: status, color: '#9C27B0' };
    }
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

  return (
    <>
      <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Administración ADT</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Admisión · Traslado · Alta — Registro Universal de Pacientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={fetchPatients}><Icon name="RefreshCw" size={14} /> Refrescar</button>
          <button className="btn-ghost"><Icon name="Download" size={14} /> Exportar</button>
          <Link href="/registro-paciente" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="Plus" size={14} /> Nueva Admisión
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Registrados', value: patients.length, icon: 'Users', color: '#4CAF50' },
          { label: 'Hospitalizados', value: patients.filter(p => p.status === 'HOSPITALIZED').length, icon: 'Bed', color: '#1E88E5' },
          { label: 'Cirugía del Día', value: 0, icon: 'Scissors', color: '#9C27B0' },
          { label: 'Altas (Histórico)', value: patients.filter(p => p.status === 'DISCHARGED').length, icon: 'CheckCircle2', color: '#FF9800' },
          { label: 'Traslados', value: 0, icon: 'ArrowRight', color: '#00BCD4' },
        ].map(c => (
          <div key={c.label} className="metric-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={15} style={{ color: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>
                  {loading ? '...' : c.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="tab-bar" style={{ marginBottom: 16, width: 'fit-content' }}>
        {[{ id: 'list', label: 'Lista de Pacientes' }, { id: 'discharge', label: 'Proceso de Alta' }].map(t => (
          <div key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as typeof tab)}>{t.label}</div>
        ))}
      </div>

      {tab === 'list' && (
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
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div className="glass-card" style={{ overflowX: 'auto', flex: 1, minWidth: 0 }}>
              <table className="data-table">
                <thead><tr>
                  <th style={{ whiteSpace: 'nowrap' }}>MRN / ID</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Documento</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Edad/Sex</th>
                  <th>Contacto</th>
                  <th>Seguro</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Estado</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Ingreso</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Acciones</th>
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin" /></td></tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No se encontraron pacientes.</td></tr>
                  ) : (
                    filteredPatients.map(p => {
                      const sc = getStatusConfig(p.status);
                      const isSelected = quickPreviewPatient?.id === p.id;
                      const cellStyle = isSelected ? { background: 'rgba(30, 136, 229, 0.12)' } : undefined;
                      return (
                        <tr key={p.id} onClick={() => setQuickPreviewPatient(p)} style={{ cursor: 'pointer' }}>
                          <td style={{ ...cellStyle, borderLeft: isSelected ? '3px solid #1E88E5' : '3px solid transparent', transition: 'border-color 0.15s ease', whiteSpace: 'nowrap' }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--color-teal)', fontWeight: 700 }}>{p.mrn}</div>
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
                          <td style={{ ...cellStyle }}><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.insurance_provider || 'Particular'}</span></td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}><span className="badge" style={{ background: `${sc.color}18`, color: sc.color, borderColor: `${sc.color}30`, whiteSpace: 'nowrap', fontSize: 10.5, padding: '2px 6px' }}>{sc.label}</span></td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11, color: isSelected ? '#1E88E5' : 'inherit' }} title="Vista Rápida" onClick={() => setQuickPreviewPatient(p)}>
                                <Icon name="EyeIcon" size={12} />
                              </button>
                              <Link href={`/historia-clinica?mrn=${p.mrn}`} className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Ver Historia">
                                <Icon name="FileText" size={12} />
                              </Link>
                              <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11 }} title="Editar" onClick={() => handleEditClick(p)}>
                                <Icon name="Edit" size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
        <div className="glass-card" style={{ padding: 24, maxWidth: 560 }}>
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
    </>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

type Cama = {
  id: string; bed_code: string; numero: string; ala: string; piso: number;
  tipo: string; estado: string; internado_en: string | null;
  notas: string | null; updated_at: string | null; created_at: string | null;
  patient_id?: string | null;
  patients?: { id?: string; first_name: string; last_name: string; mrn: string } | null;
};

const ESTADO_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  DISPONIBLE:    { color: '#4CAF50', label: 'Disponible',    icon: 'CheckCircle' },
  OCUPADA:       { color: '#F44336', label: 'Ocupada',        icon: 'User' },
  MANTENIMIENTO: { color: '#FF9800', label: 'Mantenimiento',  icon: 'Wrench' },
  RESERVADA:     { color: '#9C27B0', label: 'Reservada',      icon: 'Calendar' },
  LIMPIEZA:      { color: '#00BCD4', label: 'Limpieza',       icon: 'Sparkles' },
};

const TIPO_COLOR: Record<string, string> = {
  GENERAL: '#1E88E5', UCI: '#9C27B0', NEONATAL: '#FF9800', PEDIATRIA: '#4CAF50',
  MATERNIDAD: '#E91E63', CIRUGIA: '#F44336', OBSERVACION: '#607D8B', EMERGENCIA: '#FF5252',
};

const ALAS = ['TODAS', 'Acceso Principal', 'Ala Norte', 'Ala Sur', 'Ala Este', 'Ala Oeste'];
const PISOS = ['TODOS', '0', '1', '2', '3', '4', '5'];
const ESTADOS_FILTER = ['TODOS', 'DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO', 'RESERVADA', 'LIMPIEZA'];

export default function CamasPage() {
  const router = useRouter();
  const supabase = createClient();
  const [camas, setCamas] = useState<Cama[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAla, setFilterAla] = useState('TODAS');
  const [filterPiso, setFilterPiso] = useState('TODOS');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [vista, setVista] = useState<'grid' | 'lista'>('grid');
  const [selectedCama, setSelectedCama] = useState<Cama | null>(null);

  // Admisión rápida state
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [isAdmitting, setIsAdmitting] = useState(false);

  useEffect(() => {
    // Set initial local date for admission
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setAdmissionDate(now.toISOString().slice(0, 16));
  }, []);

  const loadCamas = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('camas').select('*, patients(id,first_name,last_name,mrn)').order('piso').order('ala').order('bed_code');
    if (filterAla !== 'TODAS') q = q.eq('ala', filterAla);
    if (filterPiso !== 'TODOS') q = q.eq('piso', parseInt(filterPiso));
    if (filterEstado !== 'TODOS') q = q.eq('estado', filterEstado);
    if (filterTipo !== 'TODOS') q = q.eq('tipo', filterTipo);
    const { data } = await q;
    setCamas((data || []) as Cama[]);
    setLoading(false);
  }, [filterAla, filterPiso, filterEstado, filterTipo, supabase]);

  useEffect(() => { loadCamas(); }, [loadCamas]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const search = async () => {
        const { data } = await supabase.from('patients')
          .select('id, first_name, last_name, mrn')
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,mrn.ilike.%${searchQuery}%`)
          .limit(5);
        setSearchResults(data || []);
      };
      search();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, supabase]);

  const handleAdmission = async () => {
    if (!selectedCama || !selectedPatientId) return;
    setIsAdmitting(true);
    await supabase.from('camas').update({
      estado: 'OCUPADA',
      patient_id: selectedPatientId,
      internado_en: new Date(admissionDate).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', selectedCama.id);
    setIsAdmitting(false);
    setSelectedCama(null);
    setShowAdmissionForm(false);
    setSearchQuery('');
    loadCamas();
  };

  const kpis = {
    total: camas.length,
    disponibles: camas.filter(c => c.estado === 'DISPONIBLE').length,
    ocupadas: camas.filter(c => c.estado === 'OCUPADA').length,
    pct: camas.length > 0 ? Math.round((camas.filter(c => c.estado === 'OCUPADA').length / camas.length) * 100) : 0,
  };

  const cambiarEstado = async (id: string, estado: string) => {
    const payload: any = { estado, updated_at: new Date().toISOString() };
    if (estado === 'DISPONIBLE') {
      payload.patient_id = null;
      payload.internado_en = null;
    }
    await supabase.from('camas').update(payload).eq('id', id);
    setSelectedCama(null);
    loadCamas();
  };

  const pisoLabel: Record<number, string> = { 0: 'Planta Baja', 1: 'Piso 1', 2: 'Piso 2', 3: 'Piso 3', 4: 'Piso 4', 5: 'Piso 5 (UCI)' };
  const pisos = [...new Set(camas.map(c => c.piso))].sort();

  const inp = { background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 12, outline: 'none', fontFamily: 'Inter, sans-serif' };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '8px', marginTop: 2 }} title="Regresar">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="BedDouble" size={24} style={{ color: '#1E88E5' }} /> Mapa Interactivo de Camas
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Vista de planta y ocupación hospitalaria en tiempo real — {camas.length} camas registradas</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['grid', 'lista'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: vista === v ? 'rgba(30,136,229,0.2)' : 'transparent', color: vista === v ? '#1E88E5' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
              <Icon name={v === 'grid' ? 'LayoutGrid' : 'List'} size={14} />
              {v === 'grid' ? 'Mapa' : 'Lista'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Camas', value: kpis.total, icon: 'BedDouble', color: '#1E88E5' },
          { label: 'Disponibles', value: kpis.disponibles, icon: 'CheckCircle', color: '#4CAF50' },
          { label: 'Ocupadas', value: kpis.ocupadas, icon: 'User', color: '#F44336' },
          { label: '% Ocupación', value: `${kpis.pct}%`, icon: 'Activity', color: kpis.pct > 85 ? '#F44336' : kpis.pct > 70 ? '#FF9800' : '#4CAF50' },
        ].map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={k.icon} size={20} style={{ color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Leyenda y Filtros */}
      <div className="glass-card" style={{ padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: v.color, boxShadow: `0 0 8px ${v.color}80` }} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{v.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filterAla} onChange={e => setFilterAla(e.target.value)} style={inp}>
            {ALAS.map(a => <option key={a} value={a}>{a === 'TODAS' ? 'Todas las alas' : a}</option>)}
          </select>
          <select value={filterPiso} onChange={e => setFilterPiso(e.target.value)} style={inp}>
            {PISOS.map(p => <option key={p} value={p}>{p === 'TODOS' ? 'Todos los pisos' : pisoLabel[parseInt(p)]}</option>)}
          </select>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={inp}>
            {ESTADOS_FILTER.map(s => <option key={s} value={s}>{s === 'TODOS' ? 'Todos los estados' : s}</option>)}
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={inp}>
            <option value="TODOS">Todos los tipos</option>
            {Object.keys(TIPO_COLOR).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Icon name="Loader2" className="animate-spin" size={28} /></div>
      ) : vista === 'grid' ? (
        /* Floor Map View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {pisos.map(piso => {
            const camasPiso = camas.filter(c => c.piso === piso);
            if (camasPiso.length === 0) return null;
            
            // Group by Ala
            const alasMap = camasPiso.reduce((acc, cama) => {
              if (!acc[cama.ala]) acc[cama.ala] = [];
              acc[cama.ala].push(cama);
              return acc;
            }, {} as Record<string, Cama[]>);

            return (
              <div key={piso} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Piso Header */}
                <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(30,136,229,0.2) 0%, rgba(30,136,229,0.05) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                    <Icon name={piso === 5 ? 'HeartPulse' : piso === 0 ? 'Siren' : 'Building'} size={18} style={{ color: '#1E88E5' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{pisoLabel[piso]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{camasPiso.length} Camas totales • {camasPiso.filter(c => c.estado === 'DISPONIBLE').length} Disponibles</div>
                  </div>
                </div>

                {/* Floor Plan Layout */}
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {Object.entries(alasMap).map(([ala, camasAla]) => (
                    <div key={ala} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Ala Divider */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ala}</div>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-secondary)' }} />
                      </div>
                      
                      {/* Beds Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
                        {camasAla.map(cama => {
                          const cfg = ESTADO_CONFIG[cama.estado] || ESTADO_CONFIG.DISPONIBLE;
                          const isOccupied = cama.estado === 'OCUPADA';
                          return (
                            <button key={cama.id} onClick={() => { setSelectedCama(cama); setShowAdmissionForm(false); }}
                              style={{ 
                                padding: '14px', borderRadius: 12, 
                                border: `1px solid ${cfg.color}30`, 
                                background: isOccupied ? `linear-gradient(180deg, ${cfg.color}15 0%, ${cfg.color}05 100%)` : `${cfg.color}08`, 
                                cursor: 'pointer', textAlign: 'left', 
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                                position: 'relative',
                                display: 'flex', flexDirection: 'column', gap: 8,
                                overflow: 'hidden'
                              }}
                              className="hover:scale-[1.03] hover:shadow-lg"
                              onMouseEnter={e => { e.currentTarget.style.borderColor = `${cfg.color}80`; e.currentTarget.style.boxShadow = `0 8px 24px -8px ${cfg.color}50`; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = `${cfg.color}30`; e.currentTarget.style.boxShadow = 'none'; }}>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{cama.bed_code}</div>
                                <Icon name={cfg.icon} size={16} style={{ color: cfg.color }} />
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 10px ${cfg.color}` }} />
                                <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, letterSpacing: '0.04em' }}>{cfg.label.toUpperCase()}</div>
                              </div>

                              {isOccupied && cama.patients && (
                                <div style={{ marginTop: 4, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cama.patients.first_name} {cama.patients.last_name}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>MRN: {cama.patients.mrn}</div>
                                </div>
                              )}
                              
                              {cama.tipo !== 'GENERAL' && !isOccupied && (
                                <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10, color: TIPO_COLOR[cama.tipo], fontWeight: 700 }}>
                                  {cama.tipo}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Lista View */
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                {['Código', 'Ubicación', 'Tipo', 'Estado', 'Paciente / Ingreso', 'Notas', 'Actualizado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {camas.map(cama => {
                const cfg = ESTADO_CONFIG[cama.estado] || ESTADO_CONFIG.DISPONIBLE;
                return (
                  <tr key={cama.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1E88E5', fontFamily: 'monospace' }}>{cama.bed_code}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pisoLabel[cama.piso]}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cama.ala}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: `${TIPO_COLOR[cama.tipo] || '#607D8B'}18`, color: TIPO_COLOR[cama.tipo] || '#607D8B' }}>{cama.tipo}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {cama.patients ? (
                        <>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cama.patients.first_name} {cama.patients.last_name}</div>
                          <div style={{ fontSize: 10 }}>Ingreso: {cama.internado_en ? new Date(cama.internado_en).toLocaleDateString('es-BO') : '—'}</div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin paciente asignado</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cama.notas || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(cama.updated_at || cama.created_at || new Date()).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => { setSelectedCama(cama); setShowAdmissionForm(false); }} style={{ background: 'rgba(30,136,229,0.1)', border: '1px solid rgba(30,136,229,0.2)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#1E88E5', fontSize: 11 }}>
                        Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCama && (
        <>
          <div onClick={() => setSelectedCama(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div className="animate-fade-in" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 420, zIndex: 201, background: '#0B1628', border: `1px solid ${ESTADO_CONFIG[selectedCama.estado]?.color || '#1E88E5'}40`, borderRadius: 16, padding: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ESTADO_CONFIG[selectedCama.estado]?.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="BedDouble" size={20} style={{ color: ESTADO_CONFIG[selectedCama.estado]?.color }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Cama {selectedCama.bed_code}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pisoLabel[selectedCama.piso]} • {selectedCama.ala}</div>
                </div>
              </div>
              <button onClick={() => setSelectedCama(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                <Icon name="X" size={16} />
              </button>
            </div>
            
            {!showAdmissionForm ? (
              <>
                <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.02)' }}>
                  {[
                    ['Tipo', selectedCama.tipo],
                    ['Paciente', selectedCama.patients ? `${selectedCama.patients.first_name} ${selectedCama.patients.last_name}` : 'Sin asignar'],
                    ['Ingreso', selectedCama.internado_en ? new Date(selectedCama.internado_en).toLocaleString('es-BO') : '—']
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {selectedCama.estado === 'DISPONIBLE' && (
                  <button onClick={() => setShowAdmissionForm(true)} style={{ width: '100%', padding: '14px', borderRadius: 10, background: 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, boxShadow: '0 8px 24px rgba(30,136,229,0.3)', transition: 'transform 0.15s, box-shadow 0.15s' }} onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(30,136,229,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 8px 24px rgba(30,136,229,0.3)'; }}>
                    <Icon name="UserPlus" size={18} /> 🏥 Admisión Rápida
                  </button>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.06em' }}>CAMBIAR ESTADO A:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(ESTADO_CONFIG).map(([estado, cfg]) => {
                    if (estado === selectedCama.estado) return null;
                    return (
                      <button key={estado} onClick={() => cambiarEstado(selectedCama.id, estado)}
                        style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${cfg.color}30`, background: `${cfg.color}10`, color: cfg.color, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}20`; e.currentTarget.style.borderColor = `${cfg.color}50`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${cfg.color}10`; e.currentTarget.style.borderColor = `${cfg.color}30`; }}>
                        <Icon name={cfg.icon} size={14} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1E88E5', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon name="UserPlus" size={16} /> Completar Admisión
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Buscar Paciente (Nombre o MRN)</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 10, left: 12, color: 'var(--text-muted)' }}><Icon name="Search" size={16} /></div>
                    <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ej. Juan Perez..." style={{ ...inp, width: '100%', paddingLeft: 36, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-secondary)', boxSizing: 'border-box' }} />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                      {searchResults.map(p => (
                        <div key={p.id} onClick={() => { setSelectedPatientId(p.id); setSearchQuery(`${p.first_name} ${p.last_name}`); setSearchResults([]); }}
                          style={{ padding: '10px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: selectedPatientId === p.id ? 'rgba(30,136,229,0.2)' : 'transparent' }}
                          onMouseEnter={e => { if (selectedPatientId !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }} 
                          onMouseLeave={e => { if (selectedPatientId !== p.id) e.currentTarget.style.background = 'transparent' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{p.first_name} {p.last_name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.mrn}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Fecha y Hora de Ingreso</label>
                  <input type="datetime-local" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} style={{ ...inp, width: '100%', background: 'rgba(0,0,0,0.2)', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button onClick={() => { setShowAdmissionForm(false); setSelectedPatientId(''); setSearchQuery(''); }} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border-secondary)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>Cancelar</button>
                  <button onClick={handleAdmission} disabled={!selectedPatientId || isAdmitting} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: !selectedPatientId ? 'var(--border-secondary)' : 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)', color: !selectedPatientId ? 'var(--text-muted)' : 'white', cursor: !selectedPatientId ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, boxShadow: !selectedPatientId ? 'none' : '0 8px 24px rgba(30,136,229,0.3)', transition: 'all 0.2s' }}>
                    {isAdmitting ? 'Confirmando...' : 'Confirmar Ingreso'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


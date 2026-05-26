'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import { SPECIALTIES } from '@/lib/data';

type Specialty = {
  id: string;
  code: string;
  name: string;
  description: string;
  wing: string;
  floor: number;
  rooms: string[];
  color: string;
  emergency_capable: boolean;
  active: boolean;
  // Synthetic / Joined fields
  icon?: string;
  headDoctor?: string;
  activeDoctors?: number;
  activePatients?: number;
  avgWaitMin?: number;
};

export function SpecialtiesPage() {
  const supabase = createClient();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [selectedWing, setSelectedWing] = useState('');
  const [selected, setSelected] = useState<Specialty | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // New Specialty Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', description: '', wing: 'Ala Norte', floor: '1', color: '#1E88E5', emergency_capable: false, rooms: ''
  });

  const loadSpecialties = useCallback(async () => {
    setLoading(true);
    const { data: spData } = await supabase.from('specialties').select('*').order('name');
    
    const { data: profData } = await supabase
      .from('professionals')
      .select('specialty_id, user_profiles!professionals_user_id_fkey(full_name)')
      .eq('status', 'active');

    const today = new Date();
    today.setHours(0,0,0,0);
    const { data: apptData } = await supabase
      .from('appointments')
      .select('specialty_id')
      .gte('starts_at', today.toISOString());

    const enhanced = (spData || []).map(sp => {
      const spProfs = (profData || []).filter(p => p.specialty_id === sp.id);
      const spAppts = (apptData || []).filter(a => a.specialty_id === sp.id);
      const dataItem = SPECIALTIES.find(s => s.code === sp.code);

      return {
        ...sp,
        icon: dataItem?.icon || 'Stethoscope',
        headDoctor: spProfs.length > 0 ? (spProfs[0].user_profiles as any)?.full_name : 'No Asignado',
        activeDoctors: spProfs.length,
        activePatients: spAppts.length,
        avgWaitMin: spAppts.length > 0 ? 15 : 0,
      };
    });
    setSpecialties(enhanced);
    setLoading(false);
  }, []);

  useEffect(() => { loadSpecialties(); }, [loadSpecialties]);

  const wings = [...new Set(specialties.map(s => s.wing))].filter(Boolean);
  const filtered = specialties.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    (selectedWing === '' || s.wing === selectedWing)
  );

  const handleSelectSpecialty = async (sp: Specialty) => {
    setSelected(sp);
    setLoadingDocs(true);
    // Fetch professionals linked to this specialty
    const { data } = await supabase
      .from('professionals')
      .select('id, shift_preference, weekly_schedule, consulting_rooms, user_profiles(full_name)')
      .eq('specialty_id', sp.id)
      .eq('status', 'active');
    setSelectedDocs(data || []);
    setLoadingDocs(false);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) return;
    setSaving(true);
    
    const roomsArray = form.rooms.split(',').map(r => r.trim()).filter(r => r);

    await supabase.from('specialties').insert({
      code: form.code,
      name: form.name,
      description: form.description,
      wing: form.wing,
      floor: parseInt(form.floor) || 1,
      color: form.color,
      emergency_capable: form.emergency_capable,
      rooms: roomsArray
    });

    setSaving(false);
    setShowNewModal(false);
    setForm({ code: '', name: '', description: '', wing: 'Ala Norte', floor: '1', color: '#1E88E5', emergency_capable: false, rooms: '' });
    loadSpecialties();
  };

  const inp = { background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };

  return (
    <>
      <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Especialidades Médicas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Catálogo de especialidades · Hospital San Juan de Dios
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewModal(true)}>
          <Icon name="Plus" size={14} /> Nueva Especialidad
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon name="Search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input style={{...inp, paddingLeft: 36}} placeholder="Buscar especialidad..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{...inp, width: 200}} value={selectedWing} onChange={e => setSelectedWing(e.target.value)}>
          <option value="">Todas las alas</option>
          {wings.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Especialidades', value: specialties.length, icon: 'Stethoscope', color: '#1E88E5' },
          { label: 'Con Capacidad Emergencias', value: specialties.filter(s => s.emergency_capable).length, icon: 'Siren', color: '#F44336' },
          { label: 'Total Médicos Activos', value: specialties.reduce((a, s) => a + (s.activeDoctors || 0), 0), icon: 'Users', color: '#4CAF50' },
          { label: 'Total Pacientes Activos', value: specialties.reduce((a, s) => a + (s.activePatients || 0), 0), icon: 'Heart', color: '#FF9800' },
        ].map(c => (
          <div key={c.label} className="metric-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon as any} size={16} style={{ color: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Specialty Cards Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {filtered.map((sp) => (
            <div
              key={sp.id}
              onClick={() => handleSelectSpecialty(sp)}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${sp.color}25`,
                borderTop: `3px solid ${sp.color}`,
                borderRadius: 12, padding: 18,
                cursor: 'pointer', transition: 'all var(--transition-normal)',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 30px ${sp.color}20`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${sp.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={(sp.icon as any) || 'Stethoscope'} size={18} style={{ color: sp.color }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{sp.code}</div>
                  {sp.emergency_capable && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(244,67,54,0.15)', color: '#FF5252', fontWeight: 700 }}>
                      EMERGENCIAS
                    </span>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{sp.name}</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {sp.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Médicos', value: sp.activeDoctors, color: '#1E88E5' },
                  { label: 'Pacientes', value: sp.activePatients, color: sp.color },
                  { label: 'Espera', value: `${sp.avgWaitMin}m`, color: '#FF9800' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 6, padding: '6px 4px' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-secondary)', paddingTop: 10 }}>
                <Icon name="Map" size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sp.wing} · Piso {sp.floor}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{(sp.rooms || []).length} consultorios</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto', paddingTop: '8vh' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: `1px solid ${selected.color}40`, borderTop: `3px solid ${selected.color}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, boxShadow: `0 20px 60px ${selected.color}15`, marginBottom: '8vh' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${selected.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={(selected.icon as any) || 'Stethoscope'} size={24} style={{ color: selected.color }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{selected.name}</h2>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{selected.id} · {selected.code}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Icon name="X" size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{selected.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { icon: 'Users', label: 'Jefe de Departamento', value: selected.headDoctor, color: '#1E88E5' },
                { icon: 'Map', label: 'Ubicación', value: `${selected.wing} · Piso ${selected.floor}`, color: '#4CAF50' },
                { icon: 'Users', label: 'Médicos Activos', value: selectedDocs.length > 0 ? selectedDocs.length : selected.activeDoctors, color: '#FF9800' },
                { icon: 'Heart', label: 'Pacientes Activos', value: selected.activePatients, color: selected.color },
                { icon: 'Clock', label: 'Espera Promedio', value: `${selected.avgWaitMin} minutos`, color: '#9C27B0' },
                { icon: 'Building2', label: 'Consultorios', value: (selected.rooms || []).join(', '), color: '#00BCD4' },
              ].map(r => (
                <div key={r.label} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, borderBottom: '1px solid var(--border-secondary)', paddingBottom: 8 }}>
                Plantel Médico Activo
              </h3>
              {loadingDocs ? (
                <div style={{ textAlign: 'center', padding: 20 }}><Icon name="Loader2" size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
              ) : selectedDocs.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 10 }}>No hay médicos asignados a esta especialidad actualmente.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDocs.map(doc => {
                    const docName = doc.user_profiles?.full_name || 'Médico Desconocido';
                    // Parse weekly_schedule if available, else fallback to shift_preference
                    let scheduleText = doc.shift_preference === 'MORNING' ? 'Turno Mañana (08:00 - 14:00)' :
                                       doc.shift_preference === 'AFTERNOON' ? 'Turno Tarde (14:00 - 20:00)' :
                                       doc.shift_preference === 'NIGHT' ? 'Turno Noche (20:00 - 08:00)' : 'Horario Rotativo';
                    
                    if (doc.weekly_schedule && Object.keys(doc.weekly_schedule).length > 0) {
                      scheduleText = 'Horario Personalizado (Ver detalle)';
                    }
                    
                    return (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${selected.color}, ${selected.color}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                            {docName.split(' ')[0]?.[0]}{docName.split(' ')[1]?.[0] || ''}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{docName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Cons. {(doc.consulting_rooms || []).join(', ') || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-blue-light)', background: 'rgba(30, 136, 229, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            {scheduleText}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }}><Icon name="CalendarDays" size={14} /> Gestión de Agendas</button>
            </div>
          </div>
        </div>
      )}

      {/* New Specialty Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto', paddingTop: '8vh' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 500, padding: 24, marginBottom: '8vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Nueva Especialidad</h2>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Código *</label>
                  <input style={inp} value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Ej: SP-021" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Nombre de Especialidad *</label>
                  <input style={inp} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Neurología" />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Descripción</label>
                <textarea style={{...inp, minHeight: 80, resize: 'none'}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Breve descripción del departamento..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Ala / Edificio</label>
                  <select style={inp} value={form.wing} onChange={e => setForm({...form, wing: e.target.value})}>
                    <option value="Ala Norte">Ala Norte</option>
                    <option value="Ala Sur">Ala Sur</option>
                    <option value="Ala Este">Ala Este</option>
                    <option value="Ala Oeste">Ala Oeste</option>
                    <option value="Edificio Principal">Edificio Principal</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Piso</label>
                  <input type="number" style={inp} value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Consultorios (separados por coma)</label>
                <input style={inp} value={form.rooms} onChange={e => setForm({...form, rooms: e.target.value})} placeholder="Ej: 301, 302, 303" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Color Distintivo</label>
                  <input type="color" style={{...inp, padding: '2px 4px', height: 38}} value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="emergency" checked={form.emergency_capable} onChange={e => setForm({...form, emergency_capable: e.target.checked})} />
                  <label htmlFor="emergency" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Capacidad de Emergencia</label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn-ghost" onClick={() => setShowNewModal(false)}>Cancelar</button>
                <button className="btn-primary" disabled={saving || !form.code || !form.name} onClick={handleSave}>
                  {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
                  {saving ? 'Guardando...' : 'Guardar Especialidad'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

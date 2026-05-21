'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SPECIALTIES, ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/lib/data';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase';

export function ProfessionalsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [realProfessionals, setRealProfessionals] = useState<any[]>([]);
  const [editDoc, setEditDoc] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ phone: '', years: 1, status: 'active', user_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('professionals')
          .select(`
            id,
            user_id,
            license_number,
            status,
            years_experience,
            certifications,
            degree_url,
            user_profiles!professionals_user_id_fkey (
              full_name,
              role,
              phone,
              avatar_url
            ),
            specialties (
              code,
              name
            )
          `);

        if (error) {
          console.error('Error fetching professionals:', error);
          return;
        }

        if (data) {
          const mapped = data.map((p: any) => {
            const profile = p.user_profiles;
            const spec = p.specialties;
            const name = profile?.full_name || 'Sin Nombre';

            // Format institutional email from full name
            const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const nameParts = cleanName.split(' ');
            const firstLetter = nameParts[0]?.charAt(0) || '';
            const lastName = nameParts[nameParts.length - 1] || '';
            const email = firstLetter && lastName ? `${firstLetter}.${lastName}@sjdios.org` : 'profesional@sjdios.org';

            // Find mock specialty index/id matching code
            const mockSpec = SPECIALTIES.find(s => s.code === spec?.code);

            return {
              id: p.id,
              user_id: p.user_id,
              name: name,
              specialty: mockSpec?.id || 'SP-001',
              role: (profile?.role || 'DOCTOR') as UserRole,
              license: p.license_number || 'S/M',
              status: p.status || 'active',
              phone: profile?.phone || '+1 (305) 555-0100',
              email: email,
              years: p.years_experience || 1,
              certifications: p.certifications || [],
              avatar_url: profile?.avatar_url || null,
              degree_url: p.degree_url || null
            };
          });

          setRealProfessionals(mapped);
        }
      } catch (err) {
        console.error('Unexpected error fetching database professionals:', err);
      }
    };

    fetchProfessionals();
  }, []);

  const filtered = realProfessionals.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) &&
    (roleFilter === '' || d.role === roleFilter)
  );

  const handleEditClick = (e: any, doc: any) => {
    e.stopPropagation();
    setEditDoc(doc);
    setEditForm({
      phone: doc.phone,
      years: doc.years,
      status: doc.status,
      user_id: doc.user_id
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('professionals').update({
      years_experience: editForm.years,
      status: editForm.status
    }).eq('id', editDoc.id);

    if (editForm.user_id) {
      await supabase.from('user_profiles').update({
        phone: editForm.phone
      }).eq('id', editForm.user_id);
    }
    
    setSaving(false);
    setEditDoc(null);
    window.location.reload();
  };

  return (
    <>
      <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Registro Profesional</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Gestión de médicos, licencias y certificaciones · FHIR Practitioner</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost"><Icon name="Download" size={14} /> Exportar</button>
          <Link href="/registro-personal" className="btn-primary">
            <Icon name="Plus" size={14} /> Nuevo Profesional
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Médicos Registrados', value: 68 + realProfessionals.length, icon: 'UserCog', color: '#1E88E5' },
          { label: 'Activos Hoy', value: 42 + realProfessionals.filter(p => p.status === 'active').length, icon: 'CheckCircle2', color: '#4CAF50' },
          { label: 'En Licencia', value: 5, icon: 'Clock', color: '#FF9800' },
          { label: 'Licencias por Vencer', value: 3, icon: 'AlertTriangle', color: '#F44336' },
        ].map(c => (
          <div key={c.label} className="metric-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={16} style={{ color: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon name="Search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="input-field" style={{ paddingLeft: 36 }} placeholder="Buscar por nombre o matrícula..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: 220 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-ghost"><Icon name="Filter" size={14} /> Filtros</button>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID / Matrícula</th>
              <th>Profesional</th>
              <th>Especialidad</th>
              <th>Rol</th>
              <th>Experiencia</th>
              <th>Estado</th>
              <th>Contacto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => {
              const sp = SPECIALTIES.find(s => s.id === doc.specialty);
              const roleColor = ROLE_COLORS[doc.role as UserRole];
              return (
                <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(doc)}>
                  <td>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--color-teal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                      {doc.id.length > 10 ? doc.id.substring(0, 8) + '...' : doc.id}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>{doc.license}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                        overflow: 'hidden', border: '1px solid var(--border-secondary)'
                      }}>
                        {doc.avatar_url ? (
                          <img src={doc.avatar_url} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          doc.name.split(' ').slice(-2).map((n: string) => n[0]).join('')
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{doc.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {sp && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: sp.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12 }}>{sp.name}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${roleColor}18`, color: roleColor, borderColor: `${roleColor}30` }}>
                      {ROLE_LABELS[doc.role as UserRole]}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{doc.years}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> años</span>
                  </td>
                  <td>
                    <span className={`badge ${doc.status === 'active' ? 'badge-active' : 'badge-warning'}`}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: doc.status === 'active' ? '#4CAF50' : '#FF9800' }} />
                      {doc.status === 'active' ? 'Activo' : 'De Licencia'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.phone}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setSelected(doc); }}>
                        <Icon name="EyeIcon" size={12} />
                      </button>
                      <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={e => handleEditClick(e, doc)}>
                        <Icon name="Edit" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg, #1E88E5, #0D47A1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: 'white', overflow: 'hidden',
                  border: '1px solid var(--border-secondary)', flexShrink: 0
                }}>
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selected.name.split(' ').slice(-2).map((n: string) => n[0]).join('')
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{selected.name}</h2>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {selected.id.length > 20 ? selected.id.substring(0, 18) + '...' : selected.id} · {selected.license}
                  </div>
                  <span className="badge" style={{ marginTop: 4, background: `${ROLE_COLORS[selected.role as UserRole]}18`, color: ROLE_COLORS[selected.role as UserRole], borderColor: `${ROLE_COLORS[selected.role as UserRole]}30` }}>
                    {ROLE_LABELS[selected.role as UserRole]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="X" size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Especialidad', value: SPECIALTIES.find(s => s.id === selected.specialty)?.name ?? '—' },
                { label: 'Años de Experiencia', value: `${selected.years} años` },
                { label: 'Teléfono', value: selected.phone },
                { label: 'Email Institucional', value: selected.email },
              ].map(r => (
                <div key={r.label} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>CERTIFICACIONES</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selected.certifications.length > 0 ? (
                  selected.certifications.map((c: string) => (
                    <span key={c} className="badge badge-info">{c}</span>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ninguna registrada</span>
                )}
              </div>
            </div>
            {selected.degree_url && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>TÍTULO PROFESIONAL / DIPLOMA</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 60, height: 40, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-primary)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                    <img src={selected.degree_url} alt="Título" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => window.open(selected.degree_url, '_blank')}>
                    <Icon name="ExternalLink" size={12} /> Ver Título Completo
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }}><Icon name="CalendarDays" size={14} /> Ver Agenda</button>
              <button className="btn-ghost" style={{ flex: 1 }}><Icon name="FileText" size={14} /> Historial</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editDoc && (
        <div onClick={() => setEditDoc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} className="glass-card animate-fade-in" style={{ padding: 28, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>
              Editar Perfil Profesional
            </h3>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
              {editDoc.name}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Estado</label>
                <select className="input-field" style={{ width: '100%', background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, outline: 'none' }} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                  <option value="active">Activo</option>
                  <option value="on-leave">De Licencia</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Años de Experiencia</label>
                <input type="number" className="input-field" style={{ width: '100%', background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, outline: 'none' }} value={editForm.years} onChange={e => setEditForm({...editForm, years: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Teléfono de Contacto</label>
                <input className="input-field" style={{ width: '100%', background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8, outline: 'none' }} value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setEditDoc(null)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={handleSaveEdit}>
                {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

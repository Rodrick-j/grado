'use client';

import { useState, useEffect } from 'react';
import { ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/lib/data';
import { Icon } from '@/components/Icon';


const PERMISSIONS = [
  { resource: 'Historia Clínica (EHR)', read: ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE'], write: ['DOCTOR', 'RESIDENT'], delete: [] },
  { resource: 'Datos Demográficos', read: ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'RECEPTIONIST'], write: ['RECEPTIONIST', 'SUPER_ADMIN'], delete: ['SUPER_ADMIN'] },
  { resource: 'Prescripciones', read: ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'NURSE', 'PHARMACIST'], write: ['DOCTOR'], delete: [] },
  { resource: 'Laboratorio (LIS)', read: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'], write: ['DOCTOR', 'LAB_TECHNICIAN'], delete: [] },
  { resource: 'Farmacia / Inventario', read: ['SUPER_ADMIN', 'PHARMACIST', 'DOCTOR'], write: ['PHARMACIST'], delete: ['PHARMACIST'] },
  { resource: 'Auditoría & Logs', read: ['SUPER_ADMIN', 'AUDITOR', 'MEDICAL_DIRECTOR'], write: [], delete: [] },
  { resource: 'Roles & Permisos', read: ['SUPER_ADMIN'], write: ['SUPER_ADMIN'], delete: ['SUPER_ADMIN'] },
];

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];
const CLINICAL_ROLES = ['DOCTOR', 'MEDICAL_DIRECTOR', 'RESIDENT', 'NURSE', 'RADIOLOGIST'];

export function RBACPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'RECEPTIONIST' as UserRole,
    specialty_id: '', license_number: ''
  });
  const [pwdModal, setPwdModal] = useState<{show: boolean, userId: string, newPwd: string}>({show: false, userId: '', newPwd: ''});
  const [visiblePwdIds, setVisiblePwdIds] = useState<Set<string>>(new Set());

  const togglePwd = (id: string) => {
    setVisiblePwdIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FETCH_ALL' })
      });
      if (!res.ok) throw new Error('Error fetching users');
      const data = await res.json();
      
      const mapped = (data || []).map((u: any) => {
        let access = 'Acceso estándar según rol asignado en el sistema.';
        if (u.role === 'SUPER_ADMIN') access = 'Acceso total del sistema, auditorías globales y administración de personal.';
        if (u.role === 'MEDICAL_DIRECTOR') access = 'Control y supervisión de especialidades, coordinación médica y flujos clínicos.';
        if (u.role === 'DOCTOR') access = 'Acceso completo a Historias Clínicas (EHR), prescripciones médicas e interconsultas.';
        
        const profs = Array.isArray(u.professionals) ? u.professionals : [u.professionals].filter(Boolean);
        const license = profs.length > 0 && profs[0] ? profs[0].license_number : 'Sin Licencia';

        return {
          id: u.id,
          roleLabel: ROLE_LABELS[u.role as UserRole] || u.role,
          role: u.role,
          active: u.active,
          email: u.email,
          name: u.full_name,
          access: access,
          license: license,
          password: u.visible_password || 'No asignada (encriptada)'
        };
      });
      setDbUsers(mapped);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Fetch specialties using standard fetch for public data
    const fetchSpecialties = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/specialties?select=id,name&active=eq.true`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSpecialties(data);
        }
      } catch (err) {
        console.error('Error fetching specialties', err);
      }
    };
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      fetchSpecialties();
    }
  }, []);

  const handleCreateUser = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          specialty_id: form.specialty_id,
          license_number: form.license_number
        })
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error creating user');

      alert(`Usuario ${form.full_name} creado exitosamente.`);
      setShowModal(false);
      setForm({ full_name: '', email: '', password: '', role: 'RECEPTIONIST', specialty_id: '', license_number: '' });
      fetchUsers();
    } catch (err: any) {
      alert('Error creando usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'TOGGLE_ACTIVE' })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async () => {
    if (!pwdModal.newPwd) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: pwdModal.userId, action: 'RESET_PASSWORD', password: pwdModal.newPwd })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error updating auth password');
      }
      
      alert('Contraseña actualizada correctamente.');
      setPwdModal({ show: false, userId: '', newPwd: '' });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  const filteredUsers = dbUsers.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.roleLabel || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inp = { background: 'var(--bg-card)', border: '1px solid var(--border-secondary)', borderRadius: 8, color: 'var(--text-primary)', padding: '10px 12px', fontSize: 13, width: '100%', outline: 'none' };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Roles & Permisos (RBAC)</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Matriz de Control de Acceso por Rol · Cuentas Oficiales Hospitalarias
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="tab-bar" style={{ marginRight: 8 }}>
            <button className={`tab-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Cuentas Activas ({dbUsers.length})
            </button>
            <button className={`tab-item ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Matriz de Permisos
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="UserPlus" size={14} /> Registrar Usuario
          </button>
        </div>
      </div>

      {/* Role Cards Quick Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {ALL_ROLES.map(role => (
          <div key={role} style={{ padding: '12px 14px', background: 'var(--bg-card)', border: `1px solid ${ROLE_COLORS[role]}25`, borderLeft: `3px solid ${ROLE_COLORS[role]}`, borderRadius: 8, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${ROLE_COLORS[role]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="Lock" size={12} style={{ color: ROLE_COLORS[role] }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[role], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ROLE_LABELS[role]}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-muted)' }}>{role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'users' ? (
        /* ─── Institutional Accounts Directory Tab ─── */
        <div className="glass-card animate-fade-in" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Directorio de Personal & Cuentas Oficiales</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Gestión de acceso de usuarios. Por requerimiento administrativo, se muestra la contraseña actual visible.
              </p>
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Icon name="Search" size={13} /></span>
              <input className="input-field" style={{ paddingLeft: 30, fontSize: 12 }} placeholder="Buscar por nombre, correo o rol..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-surface)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Personal</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Correo / Contraseña</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Rol Asignado</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Estado</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Acciones de Admin</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => {
                  const color = ROLE_COLORS[user.role as UserRole] || '#FFFFFF';
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.2s', opacity: user.active ? 1 : 0.5 }} className="hover:bg-[rgba(255,255,255,0.01)]">
                      <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {(user.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>{user.license !== 'Sin Licencia' ? `Lic: ${user.license}` : `ID: ${user.role.substring(0,3)}-00${idx+1}`}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Icon name="Mail" size={12} style={{ color: 'var(--text-muted)' }} />{user.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-primary)' }}>
                          <Icon name="Key" size={10} style={{ color: 'var(--text-muted)' }} /> 
                          <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                            {visiblePwdIds.has(user.id) ? user.password : '••••••••'}
                          </strong>
                          <button 
                            onClick={() => togglePwd(user.id)} 
                            className="btn-ghost"
                            style={{ padding: 4, marginLeft: 4, color: 'var(--text-muted)' }}
                            title="Mostrar/Ocultar contraseña"
                          >
                            <Icon name={visiblePwdIds.has(user.id) ? 'EyeOff' : 'Eye'} size={12} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${color}18`, color: color, border: `1px solid ${color}35`, display: 'inline-block' }}>
                          {user.roleLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: user.active ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)', color: user.active ? '#4CAF50' : '#F44336' }}>
                          {user.active ? 'ACTIVO' : 'SUSPENDIDO'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setPwdModal({ show: true, userId: user.id, newPwd: '' })} className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: '#1E88E5' }}>Cambiar Clave</button>
                          <button onClick={() => handleToggleActive(user.id)} className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: user.active ? '#F44336' : '#4CAF50' }}>
                            {user.active ? 'Suspender' : 'Activar'}
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
      ) : (
        /* ─── Permissions Matrix Tab ─── */
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-secondary)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Matriz de Permisos por Recurso</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-surface)' }}>Recurso</th>
                  {ALL_ROLES.map(role => (
                    <th key={role} style={{ padding: '8px 10px', fontSize: 9, fontWeight: 700, color: ROLE_COLORS[role], borderBottom: '1px solid var(--border-secondary)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {ROLE_LABELS[role].toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((perm, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-surface)' }}>{perm.resource}</td>
                    {ALL_ROLES.map(role => {
                      const canRead = perm.read.includes(role);
                      const canWrite = perm.write.includes(role);
                      const canDelete = perm.delete.includes(role);
                      return (
                        <td key={role} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid var(--border-secondary)' }}>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            <span title="Leer" style={{ width: 18, height: 18, borderRadius: 4, fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: canRead ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.1)', color: canRead ? '#4CAF50' : '#F44336' }}>R</span>
                            <span title="Escribir" style={{ width: 18, height: 18, borderRadius: 4, fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: canWrite ? 'rgba(30,136,229,0.2)' : 'rgba(244,67,54,0.1)', color: canWrite ? '#1E88E5' : '#F44336' }}>W</span>
                            <span title="Eliminar" style={{ width: 18, height: 18, borderRadius: 4, fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: canDelete ? 'rgba(156,39,176,0.2)' : 'rgba(244,67,54,0.1)', color: canDelete ? '#9C27B0' : '#F44336' }}>D</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR USUARIO */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)} />
          <div className="glass-card animate-fade-in" style={{ position: 'relative', padding: 24, width: '90%', maxWidth: 500, zIndex: 101, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Registrar Nuevo Usuario</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Nombre Completo *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={inp} placeholder="Dr. Juan Pérez" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Correo Institucional *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inp} placeholder="juan@sjdios.org" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Contraseña Inicial *</label>
                  <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={inp} placeholder="Temporal123!" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Asignar Rol *</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})} style={inp}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>)}
                </select>
              </div>

              {/* Conditional Clinical Fields */}
              {CLINICAL_ROLES.includes(form.role) && (
                <div style={{ background: 'rgba(30,136,229,0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(30,136,229,0.2)', marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-blue-light)', marginBottom: 12, fontWeight: 600 }}><Icon name="Stethoscope" size={12} /> Datos de Perfil Clínico Requeridos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Especialidad *</label>
                      <select value={form.specialty_id} onChange={e => setForm({...form, specialty_id: e.target.value})} style={inp}>
                        <option value="">Seleccionar...</option>
                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Matrícula / Licencia *</label>
                      <input value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} style={inp} placeholder="MN-12345" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
              <button onClick={handleCreateUser} disabled={loading || !form.email || !form.password || !form.full_name} className="btn-primary">
                {loading ? 'Guardando...' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWD RESET MODAL */}
      {pwdModal.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setPwdModal({ show: false, userId: '', newPwd: '' })} />
          <div className="glass-card animate-fade-in" style={{ position: 'relative', padding: 24, width: '90%', maxWidth: 400, zIndex: 101 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Cambiar Contraseña</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Asigna una nueva contraseña. El usuario estará obligado a cambiarla al ingresar.</p>
            <input type="text" value={pwdModal.newPwd} onChange={e => setPwdModal({...pwdModal, newPwd: e.target.value})} style={inp} placeholder="Nueva contraseña..." />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setPwdModal({ show: false, userId: '', newPwd: '' })} className="btn-ghost">Cancelar</button>
              <button onClick={handleResetPassword} className="btn-primary" style={{ background: '#1E88E5' }}>Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

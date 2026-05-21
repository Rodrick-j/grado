'use client';

import { useState, useEffect } from 'react';
import { ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/lib/data';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase';


// ─── Constants & Mock Data ───────────────────────────────────
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

export function RBACPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          role,
          professionals (
            license_number
          )
        `);

      if (data) {
        const mapped = data.map((u: any) => {
          const cleanName = u.full_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const nameParts = cleanName.split(' ');
          const firstLetter = nameParts[0]?.charAt(0) || '';
          const lastName = nameParts[nameParts.length - 1] || '';
          const email = firstLetter && lastName ? `${firstLetter}.${lastName}@sjdios.org` : 'usuario@sjdios.org';

          let access = 'Acceso estándar según rol asignado en el sistema.';
          if (u.role === 'SUPER_ADMIN') access = 'Acceso total del sistema, auditorías globales y administración de personal.';
          if (u.role === 'MEDICAL_DIRECTOR') access = 'Control y supervisión de especialidades, coordinación médica y flujos clínicos.';
          if (u.role === 'DOCTOR') access = 'Acceso completo a Historias Clínicas (EHR), prescripciones médicas e interconsultas.';
          if (u.role === 'NURSE') access = 'Registro de Triage Manchester en emergencias, enfermería clínica y consulta de EHR básico.';
          if (u.role === 'LAB_TECHNICIAN') access = 'Gestión completa del sistema LIS, códigos de barra y resultados de análisis.';
          if (u.role === 'RADIOLOGIST') access = 'Módulo RIS/PACS, control de imágenes de diagnóstico y firma digital de informes.';
          if (u.role === 'PHARMACIST') access = 'Dispensación de recetas médicas, control de inventario clínico y almacén de fármacos.';
          if (u.role === 'AUDITOR') access = 'Inspección de logs del sistema, control de cambios y auditoría de seguridad HIPAA.';
          if (u.role === 'RECEPTIONIST') access = 'Admisión ADT, registro de pacientes con consentimiento firmado y agenda de turnos.';

          // Professionals might be returned as array or single object depending on how Supabase inferred the relationship
          const profs = Array.isArray(u.professionals) ? u.professionals : [u.professionals].filter(Boolean);
          const license = profs.length > 0 && profs[0] ? profs[0].license_number : 'Sin Licencia';

          return {
            id: u.id,
            roleLabel: ROLE_LABELS[u.role as UserRole] || u.role,
            role: u.role,
            email: email,
            name: u.full_name,
            access: access,
            license: license
          };
        });
        setDbUsers(mapped);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = dbUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.roleLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Roles & Permisos (RBAC)</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Matriz de Control de Acceso por Rol · Cuentas Oficiales Hospitalarias
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="tab-bar" style={{ marginRight: 8 }}>
            <button 
              className={`tab-item ${activeTab === 'users' ? 'active' : ''}`} 
              onClick={() => setActiveTab('users')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Cuentas Activas ({dbUsers.length})
            </button>
            <button 
              className={`tab-item ${activeTab === 'matrix' ? 'active' : ''}`} 
              onClick={() => setActiveTab('matrix')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Matriz de Permisos
            </button>
          </div>
          <button className="btn-primary" onClick={() => alert('¡Habilitado en el módulo de Registro de Personal!')}>
            <Icon name="UserPlus" size={14} /> Registrar Usuario
          </button>
        </div>
      </div>

      {/* Role Cards Quick Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {ALL_ROLES.map(role => (
          <div key={role} style={{ 
            padding: '12px 14px', 
            background: 'var(--bg-card)', 
            border: `1px solid ${ROLE_COLORS[role]}25`, 
            borderLeft: `3px solid ${ROLE_COLORS[role]}`, 
            borderRadius: 8,
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${ROLE_COLORS[role]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="Lock" size={12} style={{ color: ROLE_COLORS[role] }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[role], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ROLE_LABELS[role]}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-muted)' }}>
                  {role}
                </div>
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
                Cuentas activas en base de datos listas para pruebas de roles con la contraseña común `Password123!`
              </p>
            </div>
            
            {/* Search filter bar */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Icon name="Search" size={13} />
              </span>
              <input 
                className="input-field"
                style={{ paddingLeft: 30, fontSize: 12 }}
                placeholder="Buscar por nombre, correo o rol..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-surface)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Personal</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Correo Institucional</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Rol Asignado</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Licencia/Registro</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Rango de Acceso del Rol</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => {
                  const color = ROLE_COLORS[user.role as UserRole] || '#FFFFFF';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.2s' }} className="hover:bg-[rgba(255,255,255,0.01)]">
                      <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: 8, 
                          background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)`, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0
                        }}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>ID: {user.role.substring(0,3)}-00{idx+1}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name="Mail" size={12} style={{ color: 'var(--text-muted)' }} />
                          {user.email}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ 
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: `${color}18`, color: color, border: `1px solid ${color}35`,
                          display: 'inline-block'
                        }}>
                          {user.roleLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-cyan)' }}>
                        {user.license}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {user.access}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      Ningún profesional coincide con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── Permissions Matrix Tab ─── */
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-secondary)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Matriz de Permisos por Recurso</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Verde = acceso · Rojo = denegado · Por tipo de acción (Leer / Escribir / Eliminar)</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-surface)', position: 'sticky', left: 0, zIndex: 1 }}>
                    Recurso
                  </th>
                  {ALL_ROLES.map(role => (
                    <th key={role} style={{ padding: '8px 10px', fontSize: 9, fontWeight: 700, color: ROLE_COLORS[role], borderBottom: '1px solid var(--border-secondary)', textAlign: 'center', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
                      {ROLE_LABELS[role].toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((perm, i) => (
                  <tr key={i}>
                    <td style={{
                      padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-surface)',
                      position: 'sticky', left: 0, zIndex: 1, whiteSpace: 'nowrap',
                    }}>
                      {perm.resource}
                    </td>
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
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-secondary)', display: 'flex', gap: 16 }}>
            {[{ label: 'R = Leer', color: '#4CAF50' }, { label: 'W = Escribir', color: '#1E88E5' }, { label: 'D = Eliminar', color: '#9C27B0' }, { label: 'Rojo = Denegado', color: '#F44336' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

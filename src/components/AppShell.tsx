'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_PERMISSIONS, ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/lib/data';
import { Icon } from '@/components/Icon';
import { CommandPalette } from '@/components/CommandPalette';
import { createClient } from '@/lib/supabase';
import { playNotificationSound } from '@/lib/audio';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [globalToast, setGlobalToast] = useState<{title: string, message: string, creatorName?: string, roleStr?: string, time?: string} | null>(null);
  const supabase = createClient();

  // Auto-collapse right sidebar depending on the page to free up space
  useEffect(() => {
    if (window.innerWidth < 1024) return; // Don't auto-open on mobile
    if (pathname === '/emergencias') {
      setRightCollapsed(false);
    } else {
      setRightCollapsed(true);
    }
  }, [pathname]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global realtime listener for new patients
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('global:patients')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, async (payload) => {
        // Fetch detailed patient info to get creator details
        const { data } = await supabase
          .from('patients')
          .select('*, creator:user_profiles!patients_created_by_fkey(full_name, role, professionals!professionals_user_id_fkey(specialties!professionals_specialty_id_fkey(name)))')
          .eq('id', payload.new.id)
          .single();
        
        const pt = data || payload.new;
        const creatorName = pt.creator?.full_name || 'Sistema';
        
        const getRoleLabel = (role: string) => {
          return {'RECEPTIONIST': 'Recepción', 'SUPER_ADMIN': 'Administrador', 'DOCTOR': 'Médico', 'NURSE': 'Enfermería', 'SPECIALIST': 'Especialista'}[role] || role;
        };
        const roleStr = pt.creator?.professionals?.[0]?.specialties?.name || (pt.creator?.role ? getRoleLabel(pt.creator.role) : 'Registro Central');
        
        setGlobalToast({ 
          title: 'Nuevo Ingreso de Paciente', 
          message: `${pt.first_name || ''} ${pt.last_name || ''}`.trim(),
          creatorName: creatorName,
          roleStr: roleStr,
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        playNotificationSound('notification');
        setTimeout(() => setGlobalToast(null), 5000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase]);

  const leftWidth = leftCollapsed ? 68 : 260;
  const rightWidth = rightCollapsed ? 68 : 280;

  // 1. Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060D1A', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1E88E5, #00BCD4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="Building2" size={24} className="text-white animate-pulse" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="Loader2" size={16} className="animate-spin" style={{ color: '#1E88E5' }} />
          <span style={{ fontSize: 13, color: '#90A4AE', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Iniciando Faro HIS v2.4...</span>
        </div>
      </div>
    );
  }

  // 2. Route Protection Check
  const allowedRoles = ROLE_PERMISSIONS[pathname];
  const hasAccess = !allowedRoles || (role && allowedRoles.includes(role as UserRole));

  return (
    <>
      {/* Global Toast Notification (Premium Style) */}
      {globalToast && (
        <div className="animate-fade-in" style={{
          position: 'fixed', top: 24, right: 24, zIndex: 99999, background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)', borderRadius: 16, padding: '16px 20px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', gap: 14,
          borderLeft: '4px solid #4CAF50', cursor: 'pointer', minWidth: 320,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
        }} onClick={() => setGlobalToast(null)}>
          <div style={{ background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.05))', borderRadius: '50%', padding: 10, display: 'flex', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
            <Icon name="UserPlus" size={18} style={{ color: '#4CAF50' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{globalToast.title}</h4>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{globalToast.time}</span>
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{globalToast.message}</p>
            <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="UserCircle" size={14} style={{ color: 'var(--text-muted)' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.2 }}>{globalToast.creatorName}</span>
                <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{globalToast.roleStr}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <TopNav 
        onMenuClick={() => setLeftCollapsed(!leftCollapsed)} 
        onRightSidebarClick={() => setRightCollapsed(!rightCollapsed)} 
      />
      <LeftSidebar collapsed={isMobile ? leftCollapsed : leftCollapsed} onToggle={() => setLeftCollapsed(!leftCollapsed)} isMobile={isMobile} />
      <RightSidebar collapsed={isMobile ? rightCollapsed : rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)} isMobile={isMobile} />
      
      {/* Mobile Overlays */}
      {isMobile && !leftCollapsed && (
        <div 
          onClick={() => setLeftCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }} 
        />
      )}
      {isMobile && !rightCollapsed && (
        <div 
          onClick={() => setRightCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }} 
        />
      )}

      <main
        style={{
          marginTop: 'var(--topnav-height)',
          marginLeft: isMobile ? 0 : leftWidth,
          marginRight: isMobile ? 0 : rightWidth,
          minHeight: 'calc(100vh - var(--topnav-height))',
          transition: 'margin-left var(--transition-normal), margin-right var(--transition-normal)',
          background: 'var(--bg-primary)',
          padding: isMobile ? '16px' : '24px',
          width: isMobile ? '100%' : 'auto',
          overflowX: 'hidden'
        }}
      >
        {hasAccess ? (
          children
        ) : (
          <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--topnav-height) - 48px)' }}>
            <div className="glass-card" style={{ maxWidth: 520, width: '100%', padding: '40px 32px', textAlign: 'center', border: '1px solid rgba(244,67,54,0.3)', background: 'linear-gradient(180deg, rgba(244,67,54,0.05) 0%, rgba(6,13,26,0.6) 100%)' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                <Icon name="ShieldAlert" size={32} style={{ color: '#FF5252' }} />
              </div>
              
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
                Acceso Restringido
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
                Su rol actual no posee los privilegios de seguridad necesarios para acceder a este módulo. Cumplimiento estricto con los estándares de seguridad de datos de salud.
              </p>

              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 10, padding: '14px 18px', textAlign: 'left', marginBottom: 24, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Usuario:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Rol:</span>
                  <span style={{ fontWeight: 700, color: ROLE_COLORS[role as UserRole] || '#FFF' }}>
                    {ROLE_LABELS[role as UserRole] || role}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Acción requerida:</span>
                  <span style={{ color: '#FF9800', fontWeight: 600 }}>Solicitar autorización a TI</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Link href="/" className="btn-primary" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #1E88E5, #0D47A1)' }}>
                  Ir al Dashboard
                </Link>
                <button onClick={() => window.history.back()} className="btn-ghost">
                  Regresar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <CommandPalette />
    </>
  );
}

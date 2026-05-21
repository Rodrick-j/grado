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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);

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

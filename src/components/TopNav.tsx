'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS, type UserRole } from '@/lib/data';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationCenter } from '@/components/NotificationCenter';
import { AlertCenter } from '@/components/AlertCenter';

interface TopNavProps {
  onMenuClick?: () => void;
  onRightSidebarClick?: () => void;
}

export function TopNav({ onMenuClick, onRightSidebarClick }: TopNavProps) {
  const [searchVal, setSearchVal] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const { user, role, signOut } = useAuth();

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(current as 'dark' | 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'US';
  };

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const roleLabel = ROLE_LABELS[role as UserRole] || 'Recepcionista';

  return (
    <header style={{
      height: 'var(--topnav-height)',
      background: 'var(--bg-topnav)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-primary)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
    }}>
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden"
        onClick={onMenuClick}
        style={{
          width: 38, height: 38, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(30,136,229,0.1)', color: 'var(--color-blue)',
          border: '1px solid var(--border-primary)', cursor: 'pointer'
        }}
      >
        <Icon name="Menu" size={20} />
      </button>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg, #1E88E5 0%, #00BCD4 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(30,136,229,0.35)',
        }}>
          <Icon name="Heart" size={18} style={{ color: 'var(--text-on-gradient)' }} strokeWidth={2.5} />
        </div>
        <div className="hidden sm:block">
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Hospital San Juan de Dios
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--color-teal)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
            SISTEMA INTEGRADO FARO
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="hidden md:block">
        <GlobalSearch />
      </div>

      <div style={{ flex: 1 }} />

      {/* Status Chips */}
      <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 20,
          background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.25)',
        }}>
          <div className="live-dot" style={{ width: 7, height: 7 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#66BB6A' }}>SISTEMA EN LÍNEA</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 20,
          background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.25)',
        }}>
          <div className="live-dot" style={{ width: 7, height: 7, background: '#F44336' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#FF5252' }}>ER: 18 EN ESPERA</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(30,136,229,0.08)',
            border: '1px solid var(--border-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
          title={theme === 'dark' ? 'Modo Día' : 'Modo Oscuro'}
        >
          <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={16} />
        </button>

        {/* Alert Center — Clinical Alerts */}
        <AlertCenter />

        {/* Notification Center */}
        <NotificationCenter />

        {/* HIS/FHIR indicator */}
        <div className="hidden sm:flex" style={{
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.2)',
          alignItems: 'center', gap: 5,
          cursor: 'default',
        }}>
          <Icon name="ShieldCheck" size={13} style={{ color: 'var(--color-teal)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-teal)', letterSpacing: '0.06em' }}>FHIR R4 · HL7</span>
        </div>

        {/* User */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px 5px 5px',
              background: 'rgba(30,136,229,0.08)',
              border: '1px solid var(--border-secondary)',
              borderRadius: 10, cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'linear-gradient(135deg, #1E88E5, #0D47A1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--text-on-gradient)',
            }}>
              {getInitials()}
            </div>
            <div className="hidden sm:block">
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                {fullName}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {roleLabel}
              </div>
            </div>
            <Icon name="ChevronDown" size={12} className="hidden sm:block" style={{ color: 'var(--text-muted)' }} />
          </div>

          {userMenuOpen && (
            <div style={{
              position: 'absolute', top: '115%', right: 0,
              width: 240, background: 'var(--bg-dropdown)',
              border: '1px solid var(--border-primary)',
              borderRadius: 12, boxShadow: 'var(--shadow-card)',
              padding: '12px 8px', zIndex: 100,
            }}>
              <div style={{ padding: '4px 10px 10px 10px', borderBottom: '1px solid var(--border-secondary)', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fullName}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
                <span className="badge" style={{ marginTop: 6, display: 'inline-block', fontSize: 9, background: 'rgba(30,136,229,0.15)', color: '#1E88E5', border: '1px solid rgba(30,136,229,0.3)' }}>
                  {roleLabel}
                </span>
              </div>

              <button
                onClick={() => signOut()}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', color: '#FF5252', fontSize: 12,
                  fontWeight: 600, transition: 'all var(--transition-fast)',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 82, 82, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon name="LogOut" size={14} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
        
        {/* Mobile Right Sidebar Toggle */}
        <button 
          className="md:hidden"
          onClick={onRightSidebarClick}
          style={{
            width: 38, height: 38, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)',
            color: 'var(--text-primary)', cursor: 'pointer', marginLeft: 4
          }}
        >
          <Icon name="PanelRight" size={18} />
        </button>
      </div>
    </header>
  );
}

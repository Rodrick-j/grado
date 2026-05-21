'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { NAV_ITEMS, type UserRole, ROLE_PERMISSIONS, ROLE_LABELS } from '@/lib/data';
import { useAuth } from '@/hooks/useAuth';

interface LeftSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export function LeftSidebar({ collapsed, onToggle, isMobile }: LeftSidebarProps) {
  const pathname = usePathname();
  const { user, role, loading, signOut } = useAuth();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const allowedItems = NAV_ITEMS.filter(item => {
    const roles = ROLE_PERMISSIONS[item.href];
    return roles ? roles.includes(role as UserRole) : false;
  });

  const sections = [...new Set(allowedItems.map(i => i.section))];

  // Auto-expand the section containing the active page, collapse others
  useEffect(() => {
    if (allowedItems.length === 0) return;
    const activeItem = allowedItems.find(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
    if (activeItem) {
      const initial: Record<string, boolean> = {};
      sections.forEach(sec => {
        initial[sec] = sec !== activeItem.section;
      });
      setCollapsedSections(initial);
    }
  }, [pathname, allowedItems.length]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) return <div style={{ width: isMobile && collapsed ? 0 : collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-left-width)', background: 'var(--bg-leftnav)', height: '100vh', position: 'fixed' }} />;

  return (
    <aside
      style={{
        width: isMobile ? 'var(--sidebar-left-width)' : (collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-left-width)'),
        minHeight: '100vh',
        background: 'var(--bg-leftnav)',
        borderRight: '1px solid var(--border-secondary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-normal), transform var(--transition-normal)',
        overflow: 'hidden',
        position: 'fixed',
        top: 'var(--topnav-height)',
        left: 0,
        bottom: 0,
        zIndex: 60,
        transform: isMobile && collapsed ? 'translateX(-100%)' : 'translateX(0)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 12px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #1E88E5, #00BCD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="Building2" size={14} style={{ color: 'var(--text-on-gradient)' }} strokeWidth={2} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>SAN JUAN DE DIOS</div>
              <div style={{ fontSize: 9, color: '#556B8D', fontWeight: 600, letterSpacing: '0.08em' }}>PROJECT FARO v2.4</div>
            </div>
          </div>
        )}
        <button onClick={onToggle} style={{ width: 28, height: 28, background: 'var(--nav-hover-bg)', border: '1px solid var(--border-secondary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, transition: 'all var(--transition-fast)' }} className="hover:text-blue-500">
          <Icon name={collapsed ? 'ChevronRight' : 'ChevronLeft'} size={14} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 8px' }}>
        {sections.map((section) => {
          const isSectionCollapsed = !collapsed && collapsedSections[section];
          return (
            <div key={section} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <div
                  onClick={() => toggleSection(section)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '12px 8px 6px 8px',
                    userSelect: 'none',
                    borderRadius: 6,
                    transition: 'all var(--transition-fast)',
                    color: '#556B8D',
                  }}
                  className="sidebar-section-header"
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#556B8D';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{section}</span>
                  <Icon
                    name={isSectionCollapsed ? 'ChevronRight' : 'ChevronDown'}
                    size={11}
                    style={{ opacity: 0.6, transition: 'transform 0.2s ease' }}
                  />
                </div>
              )}
              {collapsed && <div style={{ height: 8 }} />}
              
              <div
                style={{
                  maxHeight: isSectionCollapsed ? 0 : 600,
                  opacity: isSectionCollapsed ? 0 : 1,
                  overflow: 'hidden',
                  transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-in-out',
                }}
              >
                {allowedItems.filter(i => i.section === section).map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link key={item.id} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined} style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                      <Icon 
                        name={item.icon} 
                        size={16} 
                        strokeWidth={isActive ? 2 : 1.75} 
                        style={{ 
                          color: item.color,
                          filter: isActive && item.color ? `drop-shadow(0 0 5px ${item.color}80)` : undefined,
                          transition: 'all var(--transition-fast)'
                        }} 
                      />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                          {item.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: item.badgeColor ?? 'var(--color-blue)', color: 'var(--text-on-gradient)', letterSpacing: '0.05em', flexShrink: 0 }}>{item.badge}</span>}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      {!collapsed ? (
        <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-on-gradient)' }}>
            {user?.user_metadata?.full_name?.substring(0, 2).toUpperCase() || (role as string)?.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.user_metadata?.full_name || 'Usuario'}
            </div>
            <div style={{ fontSize: 10, color: '#556B8D', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ROLE_LABELS[role as UserRole] || role}
            </div>
          </div>
          <button onClick={signOut} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }} className="hover:text-red-400 transition-colors" title="Cerrar Sesión">
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'center' }}>
          <button onClick={signOut} style={{ width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: 'var(--text-on-gradient)' }} className="hover:bg-red-600 transition-all" title="Cerrar Sesión">
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { NAV_ITEMS, ROLE_PERMISSIONS, type UserRole } from '@/lib/data';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface SearchResult {
  id: string;
  type: 'modulo' | 'paciente' | 'profesional';
  label: string;
  sublabel?: string;
  href: string;
  icon: string;
  color: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { role } = useAuth();
  const supabase = createClient();

  const openSearch = useCallback(() => {
    setOpen(true);
    setQuery('');
    setResults([]);
    setSelected(0);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openSearch]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      // Show module shortcuts when empty
      const modules = NAV_ITEMS.filter(item => {
        const perms = ROLE_PERMISSIONS[item.href];
        return perms ? perms.includes(role as UserRole) : false;
      }).slice(0, 6).map(item => ({
        id: item.id,
        type: 'modulo' as const,
        label: item.label,
        sublabel: item.description,
        href: item.href,
        icon: item.icon,
        color: '#1E88E5',
      }));
      setResults(modules);
      return;
    }

    const search = async () => {
      setLoading(true);
      const q = query.toLowerCase();

      // Module results
      const moduleResults: SearchResult[] = NAV_ITEMS.filter(item => {
        const perms = ROLE_PERMISSIONS[item.href];
        const allowed = perms ? perms.includes(role as UserRole) : false;
        return allowed && (item.label.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q));
      }).map(item => ({
        id: item.id,
        type: 'modulo' as const,
        label: item.label,
        sublabel: item.description,
        href: item.href,
        icon: item.icon,
        color: '#1E88E5',
      }));

      // Patient results from DB
      let patientResults: SearchResult[] = [];
      try {
        const { data: patients } = await supabase
          .from('patients')
          .select('id, first_name, last_name, mrn, ci_passport')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,mrn.ilike.%${query}%,ci_passport.ilike.%${query}%`)
          .limit(4);
        patientResults = (patients || []).map(p => ({
          id: p.id,
          type: 'paciente' as const,
          label: `${p.first_name} ${p.last_name}`,
          sublabel: `MRN: ${p.mrn || 'N/A'} · CI: ${p.ci_passport}`,
          href: '/historia-clinica',
          icon: 'User',
          color: '#4CAF50',
        }));
      } catch { /* silent */ }

      // Professional results from DB
      let profResults: SearchResult[] = [];
      try {
        const { data: profs } = await supabase
          .from('user_profiles')
          .select('id, full_name, role')
          .ilike('full_name', `%${query}%`)
          .limit(3);
        profResults = (profs || []).map(p => ({
          id: p.id,
          type: 'profesional' as const,
          label: p.full_name,
          sublabel: p.role,
          href: '/profesionales',
          icon: 'UserCog',
          color: '#FF9800',
        }));
      } catch { /* silent */ }

      setResults([...moduleResults, ...patientResults, ...profResults]);
      setLoading(false);
    };

    const timer = setTimeout(search, 200);
    return () => clearTimeout(timer);
  }, [query, role]);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected].href);
  };

  const typeLabel: Record<string, string> = {
    modulo: 'MÓDULO', paciente: 'PACIENTE', profesional: 'PROFESIONAL',
  };

  if (!open) return (
    <button
      onClick={openSearch}
      id="global-search-btn"
      style={{
        flex: 1, maxWidth: 480, height: 36,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, display: 'flex', alignItems: 'center',
        gap: 8, padding: '0 12px', cursor: 'text',
        color: 'var(--text-muted)', fontSize: 13,
        transition: 'all 0.15s',
      }}
    >
      <Icon name="Search" size={14} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Buscar paciente, módulo...</span>
      <kbd style={{
        fontSize: 9, fontFamily: 'monospace', padding: '2px 6px',
        borderRadius: 4, background: 'var(--bg-elevated)',
        border: '1px solid var(--border-secondary)', color: 'var(--text-muted)',
      }}>Ctrl+K</kbd>
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)', zIndex: 999,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '15vh', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 620, zIndex: 1000,
        animation: 'slideDown 0.18s ease',
      }}>
        <div style={{
          background: '#0B1628',
          border: '1px solid rgba(30,136,229,0.4)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(30,136,229,0.1)',
          overflow: 'hidden',
        }}>
          {/* Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <Icon name={loading ? 'Loader2' : 'Search'} size={18} style={{ color: '#1E88E5', flexShrink: 0 }} className={loading ? 'animate-spin' : ''} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar paciente, médico, módulo..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 15, fontFamily: 'Inter, sans-serif',
              }}
            />
            <kbd onClick={() => setOpen(false)} style={{
              fontSize: 10, padding: '3px 7px', borderRadius: 5, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-muted)', fontFamily: 'monospace',
            }}>Esc</kbd>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 440, overflowY: 'auto', padding: '8px 0' }}>
            {results.length === 0 && query && !loading && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Icon name="SearchX" size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div>Sin resultados para <strong style={{ color: 'var(--text-secondary)' }}>"{query}"</strong></div>
              </div>
            )}

            {!query && results.length > 0 && (
              <div style={{ padding: '4px 16px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                ACCESO RÁPIDO
              </div>
            )}

            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => navigate(r.href)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', background: selected === i ? 'rgba(30,136,229,0.12)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderLeft: selected === i ? `3px solid ${r.color}` : '3px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${r.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={r.icon} size={14} style={{ color: r.color }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.label}
                  </div>
                  {r.sublabel && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.sublabel}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}30`,
                  letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  {typeLabel[r.type]}
                </span>
                {selected === i && <Icon name="CornerDownLeft" size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)',
          }}>
            {[['↑↓', 'Navegar'], ['↵', 'Abrir'], ['Esc', 'Cerrar']].map(([key, label]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'monospace', fontSize: 10 }}>{key}</kbd>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setPatients([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      setPatients([]);
      return;
    }

    const fetchPatients = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, mrn')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,mrn.ilike.%${query}%`)
          .limit(5);

        if (error) throw error;
        setPatients(data || []);
      } catch (err) {
        console.error('Error searching patients:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchPatients, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const quickActions = [
    { id: 'new-appt', label: 'Nueva cita', icon: 'CalendarPlus', path: '/agenda' },
    { id: 'goto-or', label: 'Ir a Quirófano', icon: 'Scissors', path: '/quirofano' },
    { id: 'view-icu', label: 'Ver UCI', icon: 'Activity', path: '/uci' },
    { id: 'new-patient', label: 'Registrar paciente', icon: 'UserPlus', path: '/registro-paciente' },
  ];

  const allItems = [...patients.map(p => ({ type: 'patient', ...p })), ...quickActions.map(a => ({ type: 'action', ...a }))];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, patients]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems.length > 0) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  const handleSelect = (item: any) => {
    setIsOpen(false);
    if (item.type === 'action') {
      router.push(item.path);
    } else {
      router.push(`/historia-clinica/${item.id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
      <div 
        className="glass-card w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: 'linear-gradient(180deg, rgba(15, 31, 56, 0.95) 0%, rgba(6, 13, 26, 0.98) 100%)', border: '1px solid rgba(30, 136, 229, 0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-4 border-b border-[rgba(30,136,229,0.15)] relative">
          <Icon name="Search" size={20} className="text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-white text-lg focus:outline-none placeholder-gray-500"
            placeholder="Buscar pacientes (Nombre, MRN) o comandos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <Icon name="Loader2" size={18} className="animate-spin text-blue-400 absolute right-4" />}
          {!loading && <div className="absolute right-4 text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">ESC</div>}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query && patients.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pacientes</div>
              {patients.map((p, idx) => {
                const itemIndex = idx;
                const isSelected = selectedIndex === itemIndex;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                    onClick={() => handleSelect({ type: 'patient', ...p })}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
                      <Icon name="User" size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-gray-400">MRN: {p.mrn}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones Rápidas</div>
            {quickActions.map((action, idx) => {
              const itemIndex = patients.length + idx;
              const isSelected = selectedIndex === itemIndex;
              return (
                <div
                  key={action.id}
                  className={`flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-teal-500/10 border border-teal-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                  onClick={() => handleSelect({ type: 'action', ...action })}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center mr-3 border border-teal-500/30">
                    <Icon name={action.icon as any} size={16} className="text-teal-400" />
                  </div>
                  <div className="text-sm font-medium text-white">{action.label}</div>
                  {isSelected && <Icon name="ArrowRight" size={14} className="ml-auto text-teal-400" />}
                </div>
              );
            })}
          </div>
          
          {query && patients.length === 0 && !loading && (
             <div className="px-3 py-8 text-center text-gray-400 text-sm">
                No se encontraron pacientes para "{query}"
             </div>
          )}
        </div>
        
        <div className="border-t border-[rgba(30,136,229,0.15)] bg-black/20 p-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px]">↑</kbd>
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px]">↓</kbd>
              <span>Navegar</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px]">Enter</kbd>
              <span>Seleccionar</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
             <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px]">Cmd</kbd>
             <span>+</span>
             <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px]">K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

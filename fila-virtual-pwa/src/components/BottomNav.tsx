import React from 'react';
import { Home, LayoutGrid, Tv, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'servicios' | 'monitor' | 'perfil';
  onChangeTab: (tab: 'home' | 'servicios' | 'monitor' | 'perfil') => void;
}

export default function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'servicios', label: 'Servicios', icon: LayoutGrid },
    { id: 'monitor', label: 'Monitor', icon: Tv },
    { id: 'perfil', label: 'Perfil', icon: User },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[80px] bg-[var(--card-bg)]/80 backdrop-blur-xl border-t border-[var(--card-border)] flex items-center justify-around px-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)] pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 cursor-pointer ${
              isActive ? 'text-[#00BCD4] translate-y-[-4px]' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <div className={`relative transition-all duration-300 ${isActive ? 'bg-gradient-to-tr from-[#1E88E5]/20 to-[#00BCD4]/20 p-2 rounded-2xl shadow-[0_0_15px_rgba(0,188,212,0.3)]' : 'p-2'}`}>
              <Icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-2 hover:scale-110'}`} />
            </div>
            <span className={`text-[10px] transition-all duration-300 ${isActive ? 'font-extrabold tracking-wide' : 'font-semibold'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

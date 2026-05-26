"use client";

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Calendar, AlertTriangle, CheckCircle, XCircle, Activity, HeartPulse, BrainCircuit, ChevronRight, BarChart3, Clock, Briefcase, Stethoscope, Microscope, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function RRHHInteligentePage() {
  const [activeTab, setActiveTab] = useState("directorio");
  const [mounted, setMounted] = useState(false);
  const [vacaciones, setVacaciones] = useState<any[]>([]);
  const supabase = createClient();
  const [staffCounts, setStaffCounts] = useState({
    MEDICAL: 0,
    NURSING: 0,
    TECH: 0,
    ADMIN: 0,
    SERVICES: 0,
  });
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryUsers, setCategoryUsers] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    fetchVacaciones();
    fetchStaffCounts();

    const channel = supabase.channel('vacations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacation_requests' }, () => {
        fetchVacaciones();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleCategoryClick = async (catId: string) => {
    setSelectedCategory(catId);
    setCategoryUsers([]);
    
    let rolesToFetch: string[] = [];
    if (catId === 'MEDICAL') rolesToFetch = ['MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT'];
    else if (catId === 'NURSING') rolesToFetch = ['NURSE'];
    else if (catId === 'TECH') rolesToFetch = ['LAB_TECHNICIAN', 'RADIOLOGIST', 'PHARMACIST'];
    else if (catId === 'ADMIN') rolesToFetch = ['SUPER_ADMIN', 'RECEPTIONIST', 'BILLING', 'AUDITOR'];
    
    let query = supabase
      .from('user_profiles')
      .select('id, full_name, role, professionals(title, shift_preference, specialties(name))');
      
    if (catId === 'SERVICES') {
       query = query.not('role', 'in', '("MEDICAL_DIRECTOR","DOCTOR","RESIDENT","NURSE","LAB_TECHNICIAN","RADIOLOGIST","PHARMACIST","SUPER_ADMIN","RECEPTIONIST","BILLING","AUDITOR")');
    } else {
       query = query.in('role', rolesToFetch);
    }
    
    const { data, error } = await query;
    if (!error && data) {
       setCategoryUsers(data);
    }
  };

  const fetchStaffCounts = async () => {
    const { data, error } = await supabase.from('user_profiles').select('role');
    if (!error && data) {
      const counts = { MEDICAL: 0, NURSING: 0, TECH: 0, ADMIN: 0, SERVICES: 0 };
      data.forEach(user => {
        const role = user.role;
        if (['MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT'].includes(role)) counts.MEDICAL++;
        else if (['NURSE'].includes(role)) counts.NURSING++;
        else if (['LAB_TECHNICIAN', 'RADIOLOGIST', 'PHARMACIST'].includes(role)) counts.TECH++;
        else if (['SUPER_ADMIN', 'RECEPTIONIST', 'BILLING', 'AUDITOR'].includes(role)) counts.ADMIN++;
        else counts.SERVICES++;
      });
      setStaffCounts(counts);
    }
  };

  const fetchVacaciones = async () => {
    const { data, error } = await supabase
      .from('vacation_requests')
      .select('*, professionals(user_profiles(full_name), specialties(name))')
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setVacaciones(data);
    } else {
      // Fallback mock data if DB is empty
      setVacaciones([
        { id: 1, profesional: "Dr. Carlos Espinoza", especialidad: "Cirugía General", fechas: "12 Nov - 26 Nov", riesgo: "BAJO", ai_recomendacion: "APROBAR", motivo: "Cobertura de cirugía al 85%", estado: 'PENDIENTE' },
        { id: 2, profesional: "Lic. Marta Gómez", especialidad: "Enfermería UCI", fechas: "15 Nov - 20 Nov", riesgo: "ALTO", ai_recomendacion: "DENEGAR", motivo: "Proyección de camas UCI al 95%. Déficit de enfermeras.", estado: 'PENDIENTE' },
        { id: 3, profesional: "Dra. Ana Torres", especialidad: "Pediatría", fechas: "01 Dic - 15 Dic", riesgo: "MEDIO", ai_recomendacion: "REVISIÓN MANUAL", motivo: "Pico histórico de virus sincitial en esa fecha.", estado: 'PENDIENTE' },
      ]);
    }
  };

  const handleUpdateStatus = async (id: any, nuevoEstado: string) => {
    if (typeof id === 'number') {
      setVacaciones(prev => prev.map(v => v.id === id ? { ...v, estado: nuevoEstado } : v));
      return;
    }
    const { error } = await supabase.from('vacation_requests').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) fetchVacaciones();
  };

  const kpis = [
    { label: "Personal Óptimo vs Actual", value: "340", subValue: "/ 312", icon: <Users size={22} className="text-[#00BCD4]" />, trend: "Déficit del 8% en Enfermería", trendIcon: <TrendingUp size={14} />, trendColor: "text-rose-400", bg: "from-[#00BCD4]/10 to-transparent", border: "border-[#00BCD4]/30" },
    { label: "Predicción de Demanda (7 días)", value: "+15%", subValue: "", icon: <BarChart3 size={22} className="text-[#FF9800]" />, trend: "Brote de Dengue reportado", trendIcon: <AlertTriangle size={14} />, trendColor: "text-orange-400", bg: "from-[#FF9800]/10 to-transparent", border: "border-[#FF9800]/30" },
    { label: "Alertas de Burnout", value: "12", subValue: "", icon: <HeartPulse size={22} className="text-[#E91E63]" />, trend: "Médicos > 60h/semana", trendIcon: <Clock size={14} />, trendColor: "text-rose-400", bg: "from-[#E91E63]/10 to-transparent", border: "border-[#E91E63]/30" }
  ];

  const chartData = [45, 50, 60, 85, 95, 90, 75, 60, 55, 65, 80, 85, 70, 60];

  const STAFF_CATEGORIES = [
    { id: 'MEDICAL', title: 'Personal Médico', desc: 'Médicos especialistas, cirujanos, residentes.', count: staffCounts.MEDICAL, icon: <Stethoscope size={24} className="text-[#1E88E5]" />, color: 'from-[#1E88E5]/20 to-transparent', border: 'border-[#1E88E5]/50' },
    { id: 'NURSING', title: 'Personal de Enfermería', desc: 'Enfermeras universitarias, auxiliares (TENS).', count: staffCounts.NURSING, icon: <HeartPulse size={24} className="text-[#E91E63]" />, color: 'from-[#E91E63]/20 to-transparent', border: 'border-[#E91E63]/50' },
    { id: 'TECH', title: 'Técnicos & Apoyo', desc: 'Laboratorio, Rayos X, Kinesiología, Farmacia.', count: staffCounts.TECH, icon: <Microscope size={24} className="text-[#4CAF50]" />, color: 'from-[#4CAF50]/20 to-transparent', border: 'border-[#4CAF50]/50' },
    { id: 'ADMIN', title: 'Administración', desc: 'Admisión, caja, finanzas, recursos humanos.', count: staffCounts.ADMIN, icon: <Briefcase size={24} className="text-[#9C27B0]" />, color: 'from-[#9C27B0]/20 to-transparent', border: 'border-[#9C27B0]/50' },
    { id: 'SERVICES', title: 'Servicios Generales', desc: 'Camilleros, limpieza, alimentación, mantenimiento.', count: staffCounts.SERVICES, icon: <Wrench size={24} className="text-[#FF9800]" />, color: 'from-[#FF9800]/20 to-transparent', border: 'border-[#FF9800]/50' },
  ];

  return (
    <div className={`p-6 min-h-screen transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'} space-y-6`} style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            Gestión Central de RRHH
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xl leading-relaxed">
            Administración del personal hospitalario, estructura organizacional y herramientas de Staffing con Inteligencia Artificial.
          </p>
        </div>
        
        <div className="flex bg-[var(--bg-surface)] p-1.5 rounded-xl border border-[var(--border-secondary)] w-full lg:w-auto">
          <button 
            onClick={() => setActiveTab("directorio")}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === "directorio" ? "bg-[#9C27B0] text-white shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"}`}
          >
            Directorio y Estructura
          </button>
          <button 
            onClick={() => setActiveTab("ai_staffing")}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === "ai_staffing" ? "bg-[#00BCD4] text-white shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"}`}
          >
            <BrainCircuit size={16} /> AI Staffing
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 1: DIRECTORIO DE STAFF Y CATEGORÍAS */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === "directorio" && (
        <div className="animate-fade-in space-y-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Estructura Organizacional</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Distribución del personal por departamento en el hospital.</p>
            </div>
            <a href="/registro-personal" className="px-5 py-2.5 bg-gradient-to-r from-[#9C27B0] to-[#7B1FA2] hover:from-[#AB47BC] hover:to-[#8E24AA] rounded-xl text-xs font-bold text-white transition-all duration-300 shadow-[0_4px_14px_rgba(156,39,176,0.3)] flex items-center gap-2 border border-purple-500/30">
              <Users size={14} /> Registrar Nuevo Empleado
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {STAFF_CATEGORIES.map(cat => (
              <div 
                key={cat.id} 
                onClick={() => handleCategoryClick(cat.id)}
                className={`glass-card ${selectedCategory === cat.id ? 'border-[var(--color-blue)] shadow-[var(--shadow-glow-blue)]' : cat.border} p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-[var(--shadow-md)]`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${cat.color} rounded-bl-full opacity-30 group-hover:opacity-60 transition-opacity duration-500`}></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`p-3 rounded-xl border w-fit mb-4 ${selectedCategory === cat.id ? 'bg-[var(--color-blue)] text-white border-transparent' : 'bg-[var(--bg-elevated)] border-[var(--border-secondary)]'}`}>
                    {React.cloneElement(cat.icon as React.ReactElement, { className: selectedCategory === cat.id ? 'text-white' : (cat.icon as any).props.className })}
                  </div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-2 leading-tight">{cat.title}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-6 flex-1">{cat.desc}</p>
                  
                  <div className="pt-4 border-t border-[var(--border-secondary)] flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Activos</span>
                      <span className="text-2xl font-black text-[var(--text-primary)]">{cat.count}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedCategory === cat.id ? 'bg-[var(--color-blue)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:bg-[var(--color-blue)] group-hover:text-white'}`}>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-[var(--shadow-md)] min-h-[300px]">
            {!selectedCategory ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-4">
                  <Briefcase size={32} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Directorio de Personal</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-md">
                  Selecciona un departamento de la parte superior para ver la lista completa de empleados, sus roles, horarios y contratos.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-end mb-6 border-b border-[var(--border-secondary)] pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{STAFF_CATEGORIES.find(c => c.id === selectedCategory)?.title}</h3>
                    <p className="text-sm text-[var(--text-muted)]">Listado de personal activo ({categoryUsers.length} registros)</p>
                  </div>
                </div>
                
                {categoryUsers.length === 0 ? (
                  <div className="text-center py-10 text-[var(--text-muted)] text-sm font-medium">
                    No hay personal registrado en esta categoría.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryUsers.map((user, idx) => {
                      const prof = user.professionals && user.professionals.length > 0 ? user.professionals[0] : null;
                      const title = prof?.title || '';
                      const specName = prof?.specialties?.name || user.role;
                      const shift = prof?.shift_preference || 'No asignado';
                      
                      return (
                        <div key={user.id || idx} className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-secondary)] flex items-start gap-4 transition-transform hover:-translate-y-1 hover:shadow-lg">
                          <div className="w-10 h-10 rounded-full bg-[var(--color-blue)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {user.full_name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-[var(--text-primary)] text-sm truncate" title={`${title} ${user.full_name}`}>
                              {title} {user.full_name}
                            </h4>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">{specName}</p>
                            
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2 py-1 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded w-fit text-[var(--text-accent)] uppercase">
                              <Clock size={12} className="text-[#00BCD4]" />
                              {shift.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 2: AI STAFFING (THE OLD VIEW) */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === "ai_staffing" && (
        <div className="animate-fade-in space-y-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C4DFF]/10 border border-[#7C4DFF]/30 mb-2">
                <BrainCircuit size={14} className="text-[#7C4DFF] animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-[#7C4DFF] uppercase">Módulo AI Activo</span>
              </div>
              <p className="text-xs text-gray-400">Predicción algorítmica de necesidad de personal e impacto de ausencias.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-transparent border border-gray-700 rounded-lg hover:border-[#00BCD4]/50 hover:bg-[#00BCD4]/10 transition-colors">
              <Activity size={14} className="text-[#00BCD4]" /> Recalcular Proyección
            </button>
          </div>

          {/* KPIS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {kpis.map((kpi, i) => (
              <div key={i} className={`relative overflow-hidden p-6 rounded-2xl bg-[#0B1120]/80 backdrop-blur-xl border border-gray-800`}>
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.bg} rounded-bl-full opacity-50`}></div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">{kpi.label}</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-black text-white tracking-tighter">{kpi.value}</h3>
                      {kpi.subValue && <span className="text-lg font-bold text-gray-500">{kpi.subValue}</span>}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-[#0F172A] border ${kpi.border} shadow-lg shadow-black/50`}>{kpi.icon}</div>
                </div>
                <div className={`relative z-10 mt-5 flex items-center gap-1.5 text-[11px] font-bold ${kpi.trendColor} bg-black/20 inline-flex px-2.5 py-1.5 rounded-lg border border-white/5`}>
                  {kpi.trendIcon} <span>{kpi.trend}</span>
                </div>
              </div>
            ))}
          </div>

          {/* MAIN CHARTS AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            
            {/* LEFT: AI PREDICTIONS CHART */}
            <div className="lg:col-span-2 rounded-2xl bg-[#0B1120]/80 backdrop-blur-xl border border-gray-800 p-6 flex flex-col min-h-[500px] shadow-2xl relative">
              <div className="relative z-10 flex justify-between items-center mb-8">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-[#42A5F5]" size={18} />
                  Curva de Demanda <span className="text-gray-500 font-medium ml-1">| 14 días</span>
                </h2>
                <div className="flex items-center gap-4 text-[10px] font-bold tracking-wider uppercase text-gray-400">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00BCD4]"></div>Normal</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FF9800]"></div>Alta</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F44336]"></div>Crítica</div>
                </div>
              </div>
              
              <div className="flex-1 flex items-end gap-1.5 sm:gap-3 relative mt-4 pb-6 pl-8">
                {/* Y axis lines */}
                {[100, 75, 50, 25].map(tick => (
                  <React.Fragment key={tick}>
                    <div className={`absolute left-0 right-0 top-[${100-tick}%] h-px ${tick===100||tick===50 ? 'bg-gray-800/80' : 'bg-gray-800/40 border-t border-dashed border-gray-700/50'}`}></div>
                    <div className={`absolute -left-2 top-[${100-tick}%] -translate-y-1/2 text-[9px] font-bold text-gray-500 w-8 text-right`}>{tick}%</div>
                  </React.Fragment>
                ))}
                
                <div className="absolute left-8 right-0 bottom-[75%] h-px bg-white/20 z-0 border-t border-dashed border-[#F44336]/30">
                  <div className="absolute right-0 -top-3 px-2 py-0.5 bg-[#F44336]/10 text-[8px] font-black tracking-widest rounded text-[#F44336] border border-[#F44336]/30">CAPACIDAD MÁX</div>
                </div>
                
                {/* Mock bars */}
                {chartData.map((val, i) => {
                  const isCritical = val > 85;
                  const isHigh = val > 70 && !isCritical;
                  const colorClass = isCritical ? 'from-[#F44336] to-[#E53935]' : isHigh ? 'from-[#FF9800] to-[#F57C00]' : 'from-[#00BCD4] to-[#0288D1]';
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full z-10">
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-[#0F172A] text-white p-2 rounded pointer-events-none z-50 text-xs font-bold shadow-lg border border-gray-700">
                        {val}%
                      </div>
                      <div 
                        className={`w-full max-w-[36px] rounded-t transition-all duration-700 bg-gradient-to-t ${colorClass} opacity-80 group-hover:opacity-100 origin-bottom cursor-crosshair`}
                        style={{ height: `${val}%` }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              
              <div className="relative z-10 mt-6 p-4 bg-[#00BCD4]/5 border border-[#00BCD4]/20 rounded-xl flex gap-3 items-start">
                <BrainCircuit size={16} className="text-[#00BCD4] shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-400 leading-relaxed">
                  Pico de admisiones esperado entre el <strong className="text-white">día 4 y 6</strong>. Sugerencia: Convocar <strong className="text-[#00BCD4]">3 médicos extra</strong> de guardia y suspender vacaciones en Triage.
                </p>
              </div>
            </div>

            {/* RIGHT: VACATION APPROVALS */}
            <div className="rounded-2xl bg-[#0B1120]/80 backdrop-blur-xl border border-gray-800 flex flex-col h-[500px] shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-800/80 bg-[#0F172A]">
                <h2 className="text-[15px] font-bold text-white flex items-center justify-between">
                  Solicitudes de Ausencia
                  <span className="text-[9px] font-black tracking-widest px-2 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400">RRHH IA</span>
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {vacaciones.map((v) => {
                  if (v.estado && v.estado !== 'PENDIENTE') return null;
                  const isApprove = v.ai_recomendacion === 'APROBAR';
                  const isDeny = v.ai_recomendacion === 'DENEGAR';
                  const profName = v.professionals?.user_profiles?.full_name || v.profesional;
                  const specName = v.professionals?.specialties?.name || v.especialidad;
                  
                  return (
                    <div key={v.id} className="p-4 bg-black/40 rounded-xl border border-gray-800">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-white text-[13px]">{profName}</h4>
                          <p className="text-[10px] text-gray-500 font-medium">{specName}</p>
                        </div>
                        <span className={`text-[8px] font-black tracking-widest px-2 py-1 rounded-sm border ${
                          v.riesgo === 'ALTO' ? 'bg-[#F44336]/10 text-[#F44336] border-[#F44336]/30' :
                          v.riesgo === 'MEDIO' ? 'bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/30' :
                          'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30'
                        }`}>
                          RIESGO {v.riesgo}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-gray-400 font-medium mb-3 flex items-center gap-1.5">
                        <Calendar size={12} /> {v.fechas}
                      </div>
                      
                      <div className={`p-3 rounded-lg text-[11px] mb-3 border ${
                        isApprove ? 'bg-[#4CAF50]/5 border-[#4CAF50]/20' :
                        isDeny ? 'bg-[#F44336]/5 border-[#F44336]/20' :
                        'bg-[#FF9800]/5 border-[#FF9800]/20'
                      }`}>
                        <div className="flex items-center gap-1 mb-1">
                          <BrainCircuit size={12} className={isApprove ? 'text-[#4CAF50]' : isDeny ? 'text-[#F44336]' : 'text-[#FF9800]'} />
                          <strong className={`uppercase ${isApprove ? 'text-[#4CAF50]' : isDeny ? 'text-[#F44336]' : 'text-[#FF9800]'}`}>IA Sugiere: {v.ai_recomendacion}</strong>
                        </div>
                        <span className="text-gray-400">{v.motivo}</span>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatus(v.id, 'RECHAZADO')} className="flex-1 py-2 text-[10px] font-bold text-gray-400 border border-gray-700 hover:text-[#F44336] hover:border-[#F44336]/50 rounded">Rechazar</button>
                        <button onClick={() => handleUpdateStatus(v.id, 'APROBADO')} className="flex-1 py-2 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded">Aprobar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}


"use client";

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Calendar, AlertTriangle, CheckCircle, XCircle, Activity, HeartPulse, BrainCircuit, ChevronRight, BarChart3, Clock } from 'lucide-react';

export default function RRHHInteligentePage() {
  const [activeTab, setActiveTab] = useState("vacaciones");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const kpis = [
    { label: "Personal Óptimo vs Actual", value: "340", subValue: "/ 312", icon: <Users size={22} className="text-[#00BCD4]" />, trend: "Déficit del 8% en Enfermería", trendIcon: <TrendingUp size={14} />, trendColor: "text-rose-400", bg: "from-[#00BCD4]/10 to-transparent", border: "border-[#00BCD4]/30" },
    { label: "Predicción de Demanda (7 días)", value: "+15%", subValue: "", icon: <BarChart3 size={22} className="text-[#FF9800]" />, trend: "Brote de Dengue reportado", trendIcon: <AlertTriangle size={14} />, trendColor: "text-orange-400", bg: "from-[#FF9800]/10 to-transparent", border: "border-[#FF9800]/30" },
    { label: "Alertas de Burnout", value: "12", subValue: "", icon: <HeartPulse size={22} className="text-[#E91E63]" />, trend: "Médicos > 60h/semana", trendIcon: <Clock size={14} />, trendColor: "text-rose-400", bg: "from-[#E91E63]/10 to-transparent", border: "border-[#E91E63]/30" }
  ];

  const vacaciones = [
    { id: 1, profesional: "Dr. Carlos Espinoza", especialidad: "Cirugía General", fechas: "12 Nov - 26 Nov", riesgo: "BAJO", ai_recomendacion: "APROBAR", motivo: "Cobertura de cirugía al 85%" },
    { id: 2, profesional: "Lic. Marta Gómez", especialidad: "Enfermería UCI", fechas: "15 Nov - 20 Nov", riesgo: "ALTO", ai_recomendacion: "DENEGAR", motivo: "Proyección de camas UCI al 95%. Déficit de enfermeras." },
    { id: 3, profesional: "Dra. Ana Torres", especialidad: "Pediatría", fechas: "01 Dic - 15 Dic", riesgo: "MEDIO", ai_recomendacion: "REVISIÓN MANUAL", motivo: "Pico histórico de virus sincitial en esa fecha." },
  ];

  // Bar chart data
  const chartData = [45, 50, 60, 85, 95, 90, 75, 60, 55, 65, 80, 85, 70, 60];

  return (
    <div className={`p-6 min-h-screen transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'} space-y-8`} style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C4DFF]/10 border border-[#7C4DFF]/30 mb-3 animate-pulse-slow">
            <BrainCircuit size={14} className="text-[#7C4DFF]" />
            <span className="text-[11px] font-bold tracking-widest text-[#7C4DFF] uppercase">Módulo IA Activo</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            RRHH Inteligente 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00BCD4] to-[#42A5F5]">
              & AI Staffing
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">
            Gestión automatizada de personal basada en análisis predictivo y proyecciones de demanda hospitalaria en tiempo real.
          </p>
        </div>
        <button className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-in-out bg-[#0F172A] border border-gray-800 rounded-xl hover:border-[#00BCD4]/50 hover:bg-[#1E293B] shadow-[0_0_20px_rgba(0,188,212,0.05)] hover:shadow-[0_0_25px_rgba(0,188,212,0.15)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00BCD4]/10 to-[#42A5F5]/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
          <Activity size={16} className="text-[#00BCD4] relative z-10" />
          <span className="relative z-10 tracking-wide">Recalcular Proyección AI</span>
        </button>
      </div>

      {/* KPIS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {kpis.map((kpi, i) => (
          <div 
            key={i} 
            className={`relative overflow-hidden p-6 rounded-2xl bg-[#0B1120]/80 backdrop-blur-xl border border-gray-800 hover:border-gray-700 transition-all duration-500 group`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Background gradient blob */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.bg} rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-2">{kpi.label}</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-4xl font-black text-white tracking-tighter">{kpi.value}</h3>
                  {kpi.subValue && <span className="text-xl font-bold text-gray-500">{kpi.subValue}</span>}
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-[#0F172A] border ${kpi.border} shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-500`}>
                {kpi.icon}
              </div>
            </div>
            
            <div className={`relative z-10 mt-5 flex items-center gap-1.5 text-xs font-medium ${kpi.trendColor} bg-black/20 inline-flex px-2.5 py-1.5 rounded-lg border border-white/5`}>
              {kpi.trendIcon}
              <span>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* LEFT: AI PREDICTIONS CHART */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0B1120]/80 backdrop-blur-xl border border-gray-800 p-6 lg:p-8 flex flex-col min-h-[520px] shadow-2xl relative overflow-hidden group">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50"></div>
          
          <div className="relative z-10 flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-[#42A5F5]" size={20} />
              Proyección de Demanda <span className="text-gray-500 font-medium ml-1">| Próximos 14 días</span>
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00BCD4]"></div>Normal</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FF9800]"></div>Alta</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F44336]"></div>Crítica</div>
            </div>
          </div>
          
          <div className="flex-1 flex items-end gap-1.5 sm:gap-3 relative mt-4 pb-6 pl-8">
            {/* Y axis lines and labels */}
            <div className="absolute left-0 right-0 top-0 h-px bg-gray-800/80"></div>
            <div className="absolute -left-2 top-0 -translate-y-1/2 text-[10px] font-bold text-gray-500 w-8 text-right">100%</div>
            
            <div className="absolute left-0 right-0 top-1/4 h-px bg-gray-800/40 border-t border-dashed border-gray-700/50"></div>
            <div className="absolute -left-2 top-1/4 -translate-y-1/2 text-[10px] font-bold text-gray-500 w-8 text-right">75%</div>
            
            <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-800/80"></div>
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 w-8 text-right">50%</div>

            <div className="absolute left-0 right-0 top-3/4 h-px bg-gray-800/40 border-t border-dashed border-gray-700/50"></div>
            <div className="absolute -left-2 top-3/4 -translate-y-1/2 text-[10px] font-bold text-gray-500 w-8 text-right">25%</div>
            
            {/* The Expected Staffing line (AI Threshold) */}
            <div className="absolute left-8 right-0 bottom-[75%] h-px bg-white/20 z-0">
              <div className="absolute right-0 -top-3 px-2 py-0.5 bg-white/10 text-[9px] font-bold tracking-wider rounded text-white backdrop-blur-md">CAPACIDAD MÁX</div>
            </div>
            
            {/* Mock bars */}
            {chartData.map((val, i) => {
              const isCritical = val > 85;
              const isHigh = val > 70 && !isCritical;
              const colorClass = isCritical ? 'from-[#F44336] to-[#E53935]' : isHigh ? 'from-[#FF9800] to-[#F57C00]' : 'from-[#00BCD4] to-[#0288D1]';
              const shadowClass = isCritical ? 'shadow-[0_0_15px_rgba(244,67,54,0.4)]' : isHigh ? 'shadow-[0_0_15px_rgba(255,152,0,0.3)]' : 'shadow-[0_0_15px_rgba(0,188,212,0.2)]';
              
              return (
                <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full z-10">
                  {/* Custom Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-2 bg-[#0F172A] text-white p-2.5 rounded-lg pointer-events-none whitespace-nowrap z-50 border border-gray-700 shadow-2xl flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">Día {i+1}</span>
                    <span className="text-sm font-black flex items-baseline gap-1">
                      {val}% <span className="text-[9px] font-medium text-gray-500 font-normal">demanda est.</span>
                    </span>
                    <div className="w-2 h-2 rotate-45 bg-[#0F172A] border-b border-r border-gray-700 absolute -bottom-1"></div>
                  </div>
                  
                  {/* The Bar */}
                  <div 
                    className={`w-full max-w-[40px] rounded-t-md transition-all duration-700 ease-out bg-gradient-to-t ${colorClass} opacity-80 group-hover:opacity-100 group-hover:scale-y-[1.02] origin-bottom cursor-crosshair ${shadowClass}`}
                    style={{ height: `${val}%`, transitionDelay: `${i * 50}ms` }}
                  >
                    <div className="w-full h-1 bg-white/30 rounded-t-md"></div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="relative z-10 flex justify-between mt-2 text-[11px] font-bold tracking-widest text-gray-500 px-8 uppercase">
            <span>Hoy</span>
            <span className="translate-x-4">Semana 1</span>
            <span>Semana 2</span>
          </div>
          
          <div className="relative z-10 mt-8 p-5 bg-[#00BCD4]/5 border border-[#00BCD4]/20 rounded-2xl flex gap-4 items-start">
            <div className="p-2 bg-[#00BCD4]/10 rounded-lg shrink-0 mt-0.5">
              <BrainCircuit size={18} className="text-[#00BCD4]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Análisis Predictivo de Staffing</h4>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                Se espera un pico de admisiones por urgencias entre el <strong className="text-white">día 4 y 6</strong> debido a variables epidemiológicas. El sistema sugiere convocar a <strong className="text-[#00BCD4] font-bold px-1 py-0.5 bg-[#00BCD4]/10 rounded">3 médicos extra</strong> de guardia y restringir permisos en el área de Triage.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: VACATION APPROVALS */}
        <div className="rounded-2xl bg-[#0B1120]/80 backdrop-blur-xl border border-gray-800 flex flex-col h-[520px] shadow-2xl overflow-hidden relative">
          <div className="p-6 border-b border-gray-800/80 bg-gray-900/40 relative z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Solicitudes IA</h2>
              <span className="text-[10px] font-black tracking-widest px-2 py-1 bg-white/5 border border-white/10 rounded-md text-gray-400">RRHH</span>
            </div>
            <p className="text-[12px] text-gray-400 mt-1.5 font-medium">Evaluación predictiva de impacto</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
            {vacaciones.map((v, i) => {
              const isApprove = v.ai_recomendacion === 'APROBAR';
              const isDeny = v.ai_recomendacion === 'DENEGAR';
              
              return (
                <div 
                  key={v.id} 
                  className="p-5 bg-black/40 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors shadow-lg group relative overflow-hidden"
                  style={{ animationDelay: `${(i + 3) * 100}ms` }}
                >
                  {/* Subtle side glow based on risk */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    v.riesgo === 'ALTO' ? 'bg-[#F44336]' : v.riesgo === 'MEDIO' ? 'bg-[#FF9800]' : 'bg-[#4CAF50]'
                  }`}></div>

                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <h4 className="font-bold text-white text-[14px] leading-tight group-hover:text-blue-400 transition-colors">{v.profesional}</h4>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">{v.especialidad}</p>
                    </div>
                    <span className={`text-[9px] font-black tracking-widest px-2 py-1 rounded-md border ${
                      v.riesgo === 'ALTO' ? 'bg-[#F44336]/10 text-[#F44336] border-[#F44336]/30 shadow-[0_0_10px_rgba(244,67,54,0.15)]' :
                      v.riesgo === 'MEDIO' ? 'bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/30' :
                      'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30'
                    }`}>
                      RIESGO {v.riesgo}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-400 font-medium mb-4 pl-2 bg-gray-800/30 py-1.5 px-2 rounded-md inline-flex border border-gray-700/30">
                    <Calendar size={13} className="text-gray-500" /> {v.fechas}
                  </div>
                  
                  <div className={`p-3.5 rounded-xl text-xs mb-4 border relative overflow-hidden ${
                    isApprove ? 'bg-[#4CAF50]/5 border-[#4CAF50]/20' :
                    isDeny ? 'bg-[#F44336]/5 border-[#F44336]/20' :
                    'bg-[#FF9800]/5 border-[#FF9800]/20'
                  }`}>
                    {/* Background icon */}
                    <div className="absolute -right-2 -bottom-2 opacity-5 pointer-events-none">
                      {isApprove ? <CheckCircle size={60} /> : isDeny ? <XCircle size={60} /> : <AlertTriangle size={60} />}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BrainCircuit size={13} className={isApprove ? 'text-[#4CAF50]' : isDeny ? 'text-[#F44336]' : 'text-[#FF9800]'} />
                      <strong className={`tracking-wide text-[11px] uppercase ${isApprove ? 'text-[#4CAF50]' : isDeny ? 'text-[#F44336]' : 'text-[#FF9800]'}`}>
                        IA Sugiere: {v.ai_recomendacion}
                      </strong>
                    </div>
                    <span className="text-gray-400 leading-relaxed opacity-90 block">{v.motivo}</span>
                  </div>

                  <div className="flex gap-2.5">
                    <button className="flex-1 py-2.5 bg-transparent hover:bg-[#F44336]/10 border border-gray-700 hover:border-[#F44336]/50 rounded-lg text-xs font-bold text-gray-400 hover:text-[#F44336] transition-all duration-300">
                      Rechazar
                    </button>
                    <button className="flex-1 py-2.5 bg-gradient-to-r from-[#1E88E5] to-[#1565C0] hover:from-[#2196F3] hover:to-[#1976D2] border border-blue-500/50 rounded-lg text-xs font-bold text-white transition-all duration-300 shadow-[0_4px_14px_rgba(30,136,229,0.25)] hover:shadow-[0_6px_20px_rgba(30,136,229,0.4)] hover:-translate-y-0.5">
                      Aprobar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <style jsx global>{`
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}

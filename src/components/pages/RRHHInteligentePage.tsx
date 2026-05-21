"use client";

import React, { useState } from 'react';
import { Users, TrendingUp, Calendar, AlertTriangle, CheckCircle, XCircle, Activity, HeartPulse } from 'lucide-react';

export default function RRHHInteligentePage() {
  const [activeTab, setActiveTab] = useState("vacaciones");

  const kpis = [
    { label: "Personal Óptimo vs Actual", value: "340 / 312", icon: <Users size={24} className="text-blue-500" />, trend: "Déficit del 8% en Enfermería", trendColor: "text-red-400" },
    { label: "Predicción de Demanda (7 días)", value: "+15%", icon: <TrendingUp size={24} className="text-orange-500" />, trend: "Brote de Dengue reportado", trendColor: "text-orange-400" },
    { label: "Alertas de Burnout", value: "12", icon: <AlertTriangle size={24} className="text-red-500" />, trend: "Médicos > 60h/semana", trendColor: "text-red-400" }
  ];

  const vacaciones = [
    { id: 1, profesional: "Dr. Carlos Espinoza", especialidad: "Cirugía General", fechas: "12 Nov - 26 Nov", estado: "PENDIENTE", riesgo: "BAJO", ai_recomendacion: "APROBAR", motivo: "Cobertura de cirugía al 85%" },
    { id: 2, profesional: "Lic. Marta Gómez", especialidad: "Enfermería UCI", fechas: "15 Nov - 20 Nov", estado: "PENDIENTE", riesgo: "ALTO", ai_recomendacion: "DENEGAR", motivo: "Proyección de camas UCI al 95%. Déficit de enfermeras." },
    { id: 3, profesional: "Dra. Ana Torres", especialidad: "Pediatría", fechas: "01 Dic - 15 Dic", estado: "PENDIENTE", riesgo: "MEDIO", ai_recomendacion: "REVISIÓN MANUAL", motivo: "Pico histórico de virus sincitial en esa fecha." },
  ];

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Activity className="text-purple-500" />
            RRHH Inteligente & AI Staffing
          </h1>
          <p className="text-sm text-gray-400 mt-1">Predicción de demanda hospitalaria y gestión automatizada de personal</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-ghost text-purple-400 border-purple-500/30 hover:bg-purple-500/10">
            Recalcular Proyección AI
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass-card p-6 flex items-center justify-between hover:bg-[#152540] transition-colors cursor-default">
            <div>
              <p className="text-sm text-gray-400 font-medium">{kpi.label}</p>
              <h3 className="text-3xl font-bold mt-1 text-white">{kpi.value}</h3>
              <p className={`text-xs mt-2 font-medium ${kpi.trendColor}`}>{kpi.trend}</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-full border border-gray-700/50">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: AI Predictions Chart Mock */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[500px]">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-white mb-6">
            <TrendingUp className="text-blue-400" size={20} />
            Proyección de Demanda (Próximos 14 días)
          </h2>
          
          <div className="flex-1 flex items-end gap-2 relative mt-4 border-b border-l border-gray-700/50 pb-2 pl-2">
            {/* Y axis labels */}
            <div className="absolute -left-8 top-0 text-xs text-gray-500">100%</div>
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs text-gray-500">50%</div>
            
            {/* Mock bars */}
            {[45, 50, 60, 85, 95, 90, 75, 60, 55, 65, 80, 85, 70, 60].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                {/* Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-xs text-white p-2 rounded pointer-events-none whitespace-nowrap z-10 border border-gray-700 shadow-xl">
                  Día {i+1}: {val}% de capacidad
                </div>
                {/* Bar */}
                <div 
                  className={`w-full rounded-t-sm transition-all duration-500 ${val > 85 ? 'bg-red-500' : val > 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
                  style={{ height: `${val}%` }}
                ></div>
                {/* Expected Staff line overlay */}
                <div className="absolute w-full h-1 bg-white/20 bottom-[75%] z-0"></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 px-2">
            <span>Hoy</span>
            <span>Semana 1</span>
            <span>Semana 2</span>
          </div>
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-300">
              <strong className="text-blue-400">Análisis Predictivo:</strong> Se espera un pico de admisiones por urgencias entre el día 4 y 6. El sistema sugiere convocar a <strong>3 médicos extra</strong> de guardia y restringir permisos en el área de Triage.
            </p>
          </div>
        </div>

        {/* Right: Vacation Approvals */}
        <div className="glass-card p-0 flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-800 bg-gray-900/40">
            <h2 className="text-lg font-semibold text-white">Solicitudes de Vacaciones</h2>
            <p className="text-xs text-gray-400 mt-1">Recomendaciones basadas en IA</p>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {vacaciones.map(v => (
              <div key={v.id} className="p-4 bg-[#0A1628] rounded-xl border border-gray-800/80 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-white text-sm">{v.profesional}</h4>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    v.riesgo === 'ALTO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    v.riesgo === 'MEDIO' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>RIESGO {v.riesgo}</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{v.especialidad}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                  <Calendar size={12} /> {v.fechas}
                </p>
                
                <div className={`p-3 rounded-lg text-xs mb-3 border ${
                  v.ai_recomendacion === 'APROBAR' ? 'bg-green-500/5 border-green-500/20 text-green-300' :
                  v.ai_recomendacion === 'DENEGAR' ? 'bg-red-500/5 border-red-500/20 text-red-300' :
                  'bg-orange-500/5 border-orange-500/20 text-orange-300'
                }`}>
                  <strong>Recomendación AI: {v.ai_recomendacion}</strong><br/>
                  <span className="opacity-80">{v.motivo}</span>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 border border-gray-700 hover:border-red-500/50 rounded text-xs font-medium text-gray-300 transition-colors">
                    Rechazar
                  </button>
                  <button className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors shadow-lg shadow-blue-500/20">
                    Aprobar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

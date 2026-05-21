"use client";

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Activity, Thermometer, MapPin, Search, X } from 'lucide-react';

export default function EpidemiologiaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const kpis = [
    { id: 1, label: "Brotes Activos", value: 3, icon: <AlertTriangle size={24} className="text-red-500" />, trend: "+1 esta semana" },
    { id: 2, label: "Casos Reportados", value: 142, icon: <Activity size={24} className="text-orange-500" />, trend: "Notificación Obligatoria" },
    { id: 3, label: "Zonas de Alto Riesgo", value: 5, icon: <MapPin size={24} className="text-yellow-500" />, trend: "Ala Norte, Urgencias" }
  ];

  const reportes = [
    { id: "REP-001", enfermedad: "Dengue", paciente: "Juan Pérez", ubicacion: "Ala Norte", severidad: "ALTA", fecha: "Hoy 10:30" },
    { id: "REP-002", enfermedad: "Tuberculosis", paciente: "María Gómez", ubicacion: "Consultorios", severidad: "MEDIA", fecha: "Hoy 09:15" },
    { id: "REP-003", enfermedad: "COVID-19", paciente: "Carlos Ruiz", ubicacion: "Urgencias", severidad: "ALTA", fecha: "Ayer" },
    { id: "REP-004", enfermedad: "Malaria", paciente: "Ana Soto", ubicacion: "Ala Sur", severidad: "BAJA", fecha: "Hace 2 días" },
  ];

  const getSeverityBadge = (severidad: string) => {
    switch(severidad) {
      case "ALTA": return <span className="badge badge-error">ALTA</span>;
      case "MEDIA": return <span className="badge badge-warning">MEDIA</span>;
      case "BAJA": return <span className="badge badge-info">BAJA</span>;
      default: return <span className="badge badge-inactive">{severidad}</span>;
    }
  };

  const handleExport = () => {
    const csv = "id,enfermedad,paciente,ubicacion,severidad,fecha\n" + 
      reportes.map(r => `${r.id},${r.enfermedad},${r.paciente},${r.ubicacion},${r.severidad},${r.fecha}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_epidemiologico_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <ShieldAlert className="text-blue-500" />
            Dashboard Epidemiológico
          </h1>
          <p className="text-sm text-gray-400 mt-1">Vigilancia en tiempo real de enfermedades de notificación obligatoria</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-ghost" onClick={handleExport}>
            Exportar Reporte
          </button>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            + Nuevo Caso
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="metric-card flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">{kpi.label}</p>
              <h3 className="text-3xl font-bold mt-1 text-white">{kpi.value}</h3>
              <p className="text-xs text-gray-500 mt-2">{kpi.trend}</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-full">
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa de Calor Mock (2 cols) */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Thermometer className="text-red-400" size={20} />
              Mapa de Calor Hospitalario
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500/80"></span> Alto Riesgo</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500/80"></span> Medio Riesgo</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500/80"></span> Seguro</span>
            </div>
          </div>

          <div className="relative w-full aspect-video bg-[#0A1628] rounded-lg border border-gray-800 overflow-hidden group">
            {/* Mocked Floor Plan Lines */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#1E88E5 1px, transparent 1px), linear-gradient(90deg, #1E88E5 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>
            
            {/* Zones */}
            <div className="absolute top-[20%] left-[10%] w-[30%] h-[40%] border-2 border-gray-700/50 bg-gray-800/30 flex items-center justify-center text-xs text-gray-500 font-bold transition-all hover:bg-gray-700/40">Ala Oeste</div>
            <div className="absolute top-[10%] left-[45%] w-[45%] h-[30%] border-2 border-red-500/30 bg-red-500/20 flex items-center justify-center text-xs text-red-300 font-bold transition-all hover:bg-red-500/30">Urgencias</div>
            <div className="absolute top-[45%] left-[45%] w-[20%] h-[40%] border-2 border-orange-500/30 bg-orange-500/20 flex items-center justify-center text-xs text-orange-300 font-bold transition-all hover:bg-orange-500/30">Ala Norte</div>
            <div className="absolute top-[45%] left-[70%] w-[20%] h-[40%] border-2 border-gray-700/50 bg-gray-800/30 flex items-center justify-center text-xs text-gray-500 font-bold transition-all hover:bg-gray-700/40">Ala Este</div>
            
            {/* Heat Points (Pulsing) */}
            <div className="absolute top-[25%] left-[55%] w-12 h-12 bg-red-500/40 rounded-full blur-md animate-pulse"></div>
            <div className="absolute top-[28%] left-[58%] w-6 h-6 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse-dot"></div>
            
            <div className="absolute top-[18%] left-[75%] w-10 h-10 bg-red-500/40 rounded-full blur-md animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-[20%] left-[78%] w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse-dot" style={{ animationDelay: '0.5s' }}></div>
            
            <div className="absolute top-[60%] left-[55%] w-16 h-16 bg-orange-500/30 rounded-full blur-md animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-[65%] left-[58%] w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse-dot" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>

        {/* Notificación Obligatoria List (1 col) */}
        <div className="glass-card p-0 flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Casos Recientes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar enfermedad..." 
                className="w-full bg-[#060D1A] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
            {reportes.filter(r => r.enfermedad.toLowerCase().includes(searchTerm.toLowerCase())).map((rep) => (
              <div key={rep.id} className="p-4 bg-gray-800/20 hover:bg-gray-800/40 rounded-xl border border-gray-800/50 cursor-pointer transition-all flex flex-col gap-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-semibold text-white truncate">{rep.enfermedad}</span>
                  <div className="flex-shrink-0">
                    {getSeverityBadge(rep.severidad)}
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-300 font-medium">{rep.paciente}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={12} /> {rep.ubicacion}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono bg-gray-900/50 px-2 py-1 rounded">{rep.fecha}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Nuevo Caso */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="glass-card w-full max-w-md p-6 relative">
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Registrar Nuevo Caso</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Enfermedad (ICD-10)</label>
                <input type="text" className="w-full bg-[#060D1A] border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="Ej. Dengue" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Paciente ID / Nombre</label>
                <input type="text" className="w-full bg-[#060D1A] border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="Buscar paciente..." />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Severidad Detectada</label>
                <select className="w-full bg-[#060D1A] border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none">
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Observaciones / Contactos</label>
                <textarea className="w-full bg-[#060D1A] border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" rows={3} placeholder="Detalles epidemiológicos..."></textarea>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={() => setIsModalOpen(false)}>Reportar Caso</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

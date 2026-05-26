"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, Activity, Thermometer, MapPin, Search,
  X, User, TrendingUp, TrendingDown, Minus, Download, RefreshCw,
  Clock, ChevronRight, Zap, FlaskConical, Eye, Bell, Plus,
  BarChart3, Filter, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

// ─── Zone Map Configuration ────────────────────────────────────────────────
const ZONES_MAP: Record<string, { top: string; left: string; width: string; height: string; label: string }> = {
  "Urgencias":   { top: "5%",  left: "38%", width: "28%", height: "22%", label: "URG" },
  "Ala Oeste":   { top: "30%", left: "3%",  width: "32%", height: "38%", label: "A-O" },
  "UCI":         { top: "30%", left: "38%", width: "24%", height: "26%", label: "UCI" },
  "Ala Norte":   { top: "30%", left: "65%", width: "32%", height: "38%", label: "A-N" },
  "Pediatría":   { top: "60%", left: "38%", width: "13%", height: "28%", label: "PED" },
  "Maternidad":  { top: "60%", left: "53%", width: "13%", height: "28%", label: "MAT" },
  "Ala Este":    { top: "71%", left: "3%",  width: "32%", height: "22%", label: "A-E" },
};

const ZONE_COLORS: Record<number, { bg: string; border: string; glow: string; text: string }> = {
  0: { bg: "rgba(14,30,55,0.8)", border: "rgba(30,136,229,0.15)", glow: "none", text: "#4A6080" },
  1: { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)", glow: "rgba(249,115,22,0.15)", text: "#FB923C" },
  2: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.5)", glow: "rgba(239,68,68,0.2)", text: "#F87171" },
};

const SEVERITIES = ["ALTA", "MEDIA", "BAJA"] as const;
type Severity = typeof SEVERITIES[number];

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  ALTA:  { label: "Alta",  color: "#F87171", bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  dot: "#EF4444" },
  MEDIA: { label: "Media", color: "#FB923C", bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.4)", dot: "#F97316" },
  BAJA:  { label: "Baja",  color: "#60A5FA", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.4)", dot: "#3B82F6" },
};

// ─── Types ─────────────────────────────────────────────────────────────────
interface EpiReport {
  id: string;
  enfermedad: string;
  paciente: string;
  ubicacion: string;
  severidad: string;
  observaciones?: string;
  fecha: string;
}
interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
}

// ─── Mini Sparkline component ───────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#spk-${color.replace('#','')})`} stroke="none" />
      <defs>
        <linearGradient id={`spk-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, trend, sparkData }: {
  label: string; value: string | number; sub: string; icon: React.ReactNode;
  color: string; trend?: "up" | "down" | "neutral"; sparkData?: number[];
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#F87171" : trend === "down" ? "#4ADE80" : "#8AA3C8";
  return (
    <div style={{
      background: "rgba(15,31,56,0.9)",
      border: `1px solid ${color}33`,
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      position: "relative",
      overflow: "hidden",
      transition: "all 0.25s ease",
      cursor: "default",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px ${color}22`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      {/* Top glow bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      {/* Background icon */}
      <div style={{ position: "absolute", right: -10, top: -10, opacity: 0.04, fontSize: 80 }}>
        {icon}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4A6080", marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#E8F0FE", lineHeight: 1 }}>{value}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: trendColor }}>
          <TrendIcon size={12} />
          {sub}
        </span>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
    </div>
  );
}

// ─── Alert Banner ────────────────────────────────────────────────────────────
function AlertBanner({ outbreaks }: { outbreaks: { disease: string; count: number }[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (outbreaks.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % outbreaks.length), 3500);
    return () => clearInterval(t);
  }, [outbreaks.length]);

  if (!outbreaks.length) {
    return (
      <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <CheckCircle2 size={16} style={{ color: "#4ADE80", flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "#86EFAC", fontWeight: 500 }}>Sin brotes activos — Situación epidemiológica bajo control</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: "#4A6080" }}>LIVE</span>
        </div>
      </div>
    );
  }

  const current = outbreaks[idx];
  return (
    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <AlertTriangle size={16} style={{ color: "#F87171", flexShrink: 0, animation: "pulse-dot 1.5s ease infinite" }} />
      <span style={{ fontSize: 12, color: "#FCA5A5", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>BROTE DETECTADO</span>
      <span style={{ width: 1, height: 14, background: "rgba(239,68,68,0.3)" }} />
      <span style={{ fontSize: 13, color: "#E8F0FE" }}>
        <strong>{current.disease}</strong> — {current.count} casos en los últimos 7 días
      </span>
      {outbreaks.length > 1 && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#4A6080", flexShrink: 0 }}>{idx + 1}/{outbreaks.length}</span>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function EpidemiologiaPage() {
  const [reportes, setReportes] = useState<EpiReport[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterZone, setFilterZone] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"mapa" | "lista" | "tendencias">("mapa");

  const supabase = createClient();

  const [form, setForm] = useState({
    enfermedad: '',
    paciente_id: '',
    ubicacion: 'Urgencias',
    severidad: 'MEDIA' as Severity,
    observaciones: '',
  });

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const [reportsRes, patientsRes] = await Promise.all([
      supabase.from('epidemiological_reports').select('*').order('fecha', { ascending: false }),
      supabase.from('patients').select('id, first_name, last_name, mrn').eq('status', 'ACTIVE').order('last_name'),
    ]);
    if (reportsRes.data) setReportes(reportsRes.data);
    if (patientsRes.data) setPatients(patientsRes.data);
    setLastUpdated(new Date());
    setLoading(false);
  }, [supabase]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const { data } = await supabase.from('epidemiological_reports').select('*').order('fecha', { ascending: false });
    if (data) setReportes(data);
    setLastUpdated(new Date());
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    fetchInitialData();
    const channel = supabase.channel('epi_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epidemiological_reports' }, () => {
        handleRefresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now.getTime() - 7 * dayMs);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * dayMs);

    const recentCases = reportes.filter(r => new Date(r.fecha) >= sevenDaysAgo);
    const prevCases = reportes.filter(r => {
      const d = new Date(r.fecha);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    });

    // By disease
    const byDisease: Record<string, number> = {};
    const byZone: Record<string, number> = {};
    const bySeverity: Record<string, number> = { ALTA: 0, MEDIA: 0, BAJA: 0 };

    recentCases.forEach(r => {
      byDisease[r.enfermedad] = (byDisease[r.enfermedad] || 0) + 1;
      byZone[r.ubicacion] = (byZone[r.ubicacion] || 0) + 1;
      if (r.severidad in bySeverity) bySeverity[r.severidad]++;
    });

    // Outbreaks: diseases with > 2 cases in 7 days
    const outbreaks = Object.entries(byDisease)
      .filter(([, c]) => c > 2)
      .map(([disease, count]) => ({ disease, count }))
      .sort((a, b) => b.count - a.count);

    // Highest risk zone
    let highestRiskZone = "Seguro";
    let maxZoneCases = 0;
    Object.entries(byZone).forEach(([zone, count]) => {
      if (count > maxZoneCases) { maxZoneCases = count; highestRiskZone = zone; }
    });

    // Daily trend for last 7 days
    const dailyTrend = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now.getTime() - (6 - i) * dayMs);
      const dayStr = day.toISOString().slice(0, 10);
      return reportes.filter(r => r.fecha.slice(0, 10) === dayStr).length;
    });

    // Top diseases (sorted)
    const topDiseases = Object.entries(byDisease)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Zone risk level (0=safe,1=medium,2=high)
    const zoneRisk: Record<string, number> = {};
    Object.entries(byZone).forEach(([zone, count]) => {
      zoneRisk[zone] = count > 3 ? 2 : count > 0 ? 1 : 0;
    });

    return {
      recentCases,
      prevCount: prevCases.length,
      outbreaks,
      highestRiskZone: maxZoneCases > 0 ? highestRiskZone : "Seguro",
      byZone,
      bySeverity,
      dailyTrend,
      topDiseases,
      zoneRisk,
    };
  }, [reportes]);

  // Filtered list
  const filteredReportes = useMemo(() => reportes.filter(r => {
    const matchSearch = r.enfermedad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.paciente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSev = filterSeverity === "ALL" || r.severidad === filterSeverity;
    const matchZone = filterZone === "ALL" || r.ubicacion === filterZone;
    return matchSearch && matchSev && matchZone;
  }), [reportes, searchTerm, filterSeverity, filterZone]);

  const handleExport = () => {
    const header = "ID,Enfermedad,Paciente,Ubicación,Severidad,Fecha,Observaciones\n";
    const csv = header + reportes.map(r =>
      `${r.id},"${r.enfermedad}","${r.paciente}","${r.ubicacion}",${r.severidad},${r.fecha},"${r.observaciones || ''}"`
    ).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reporte_epidemiologico_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!form.enfermedad || !form.paciente_id) return;
    const patient = patients.find(p => p.id === form.paciente_id);
    const pacienteNombre = patient ? `${patient.first_name} ${patient.last_name}` : 'Desconocido';
    const { error } = await supabase.from('epidemiological_reports').insert([{
      enfermedad: form.enfermedad,
      paciente: pacienteNombre,
      ubicacion: form.ubicacion,
      severidad: form.severidad,
      observaciones: form.observaciones,
    }]);
    if (!error) {
      setIsModalOpen(false);
      setForm({ enfermedad: '', paciente_id: '', ubicacion: 'Urgencias', severidad: 'MEDIA', observaciones: '' });
      handleRefresh();
    }
  };

  const trendDelta = analytics.recentCases.length - analytics.prevCount;

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, minHeight: "100%", animation: "fade-in 0.4s ease forwards" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={18} style={{ color: "#F87171" }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg, #F87171, #FB923C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Dashboard Epidemiológico
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 20, padding: "3px 10px" }}>
              <div className="live-dot" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#4ADE80", letterSpacing: "0.08em" }}>EN VIVO</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#4A6080", display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={12} />
            Vigilancia activa de enfermedades de notificación obligatoria · Última actualización: {lastUpdated.toLocaleTimeString('es-BO')}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: "1px solid rgba(139,163,200,0.15)", borderRadius: 8, color: "#8AA3C8", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
            onClick={handleRefresh}
            title="Actualizar datos"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Actualizar
          </button>
          <button
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: "1px solid rgba(139,163,200,0.15)", borderRadius: 8, color: "#8AA3C8", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
            onClick={handleExport}
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button
            id="btn-nuevo-caso"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "linear-gradient(135deg, #EF4444, #DC2626)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.3)", transition: "all 0.2s" }}
            onClick={() => setIsModalOpen(true)}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = "none"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
          >
            <Plus size={15} />
            Nuevo Caso
          </button>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      <AlertBanner outbreaks={analytics.outbreaks} />

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <KpiCard
          label="Brotes Activos"
          value={analytics.outbreaks.length}
          sub={analytics.outbreaks.length > 0 ? "Requiere atención inmediata" : "Sin brotes detectados"}
          icon={<AlertTriangle size={20} />}
          color="#EF4444"
          trend={analytics.outbreaks.length > 0 ? "up" : "neutral"}
          sparkData={analytics.dailyTrend}
        />
        <KpiCard
          label="Casos — 7 Días"
          value={analytics.recentCases.length}
          sub={trendDelta === 0 ? "Sin variación" : `${trendDelta > 0 ? '+' : ''}${trendDelta} vs semana anterior`}
          icon={<Activity size={20} />}
          color="#F97316"
          trend={trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "neutral"}
          sparkData={analytics.dailyTrend}
        />
        <KpiCard
          label="Zona de Alto Riesgo"
          value={analytics.highestRiskZone}
          sub={`${analytics.byZone[analytics.highestRiskZone] || 0} casos recientes`}
          icon={<MapPin size={20} />}
          color="#FBBF24"
          trend="neutral"
        />
        <KpiCard
          label="Casos Críticos (ALTA)"
          value={analytics.bySeverity.ALTA}
          sub={`${analytics.bySeverity.MEDIA} media · ${analytics.bySeverity.BAJA} baja`}
          icon={<Zap size={20} />}
          color="#A78BFA"
          trend={analytics.bySeverity.ALTA > 0 ? "up" : "neutral"}
        />
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: "flex", gap: 4, background: "rgba(10,22,40,0.8)", borderRadius: 10, padding: 4, width: "fit-content", border: "1px solid rgba(30,136,229,0.12)" }}>
        {(["mapa", "lista", "tendencias"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              background: activeTab === tab ? "rgba(239,68,68,0.2)" : "transparent",
              color: activeTab === tab ? "#F87171" : "#4A6080",
            }}
          >
            {tab === "mapa" ? "🗺️ Mapa Hospitalario" : tab === "lista" ? "📋 Casos Registrados" : "📊 Tendencias"}
          </button>
        ))}
      </div>

      {/* ── TAB: Mapa + Lista ── */}
      {activeTab === "mapa" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, minHeight: 520 }}>

          {/* Hospital Heatmap */}
          <div style={{ background: "rgba(15,31,56,0.9)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Thermometer size={18} style={{ color: "#F87171" }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#E8F0FE" }}>Mapa de Calor Hospitalario</span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#4A6080" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block" }} />Alto (&gt;3)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F97316", display: "inline-block" }} />Medio (1-3)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1E3A5F", display: "inline-block" }} />Seguro (0)
                </span>
              </div>
            </div>

            {/* Map canvas */}
            <div style={{
              position: "relative", flex: 1, minHeight: 400,
              background: "linear-gradient(135deg, #060D1A 0%, #091221 100%)",
              borderRadius: 12, border: "1px solid rgba(30,136,229,0.1)", overflow: "hidden",
            }}>
              {/* Grid overlay */}
              <div style={{
                position: "absolute", inset: 0, opacity: 0.12, pointerEvents: "none",
                backgroundImage: "linear-gradient(#1E88E5 1px, transparent 1px), linear-gradient(90deg, #1E88E5 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }} />
              {/* Hospital outline decoration */}
              <div style={{
                position: "absolute", top: "3%", left: "2%", right: "2%", bottom: "3%",
                border: "1px dashed rgba(30,136,229,0.12)", borderRadius: 8, pointerEvents: "none",
              }} />
              <div style={{ position: "absolute", top: "6%", left: "50%", transform: "translateX(-50%)", fontSize: 9, letterSpacing: "0.2em", color: "rgba(30,136,229,0.3)", textTransform: "uppercase", fontWeight: 700, pointerEvents: "none" }}>
                HOSPITAL GENERAL — PLANO DE PLANTA
              </div>

              {/* Zones */}
              {Object.entries(ZONES_MAP).map(([zoneName, coords]) => {
                const casesCount = analytics.byZone[zoneName] || 0;
                const riskLevel = analytics.zoneRisk[zoneName] || 0;
                const col = ZONE_COLORS[riskLevel];
                const isHovered = hoveredZone === zoneName;

                return (
                  <div
                    key={`zone-${zoneName}`}
                    onMouseEnter={() => setHoveredZone(zoneName)}
                    onMouseLeave={() => setHoveredZone(null)}
                    style={{
                      position: "absolute",
                      top: coords.top, left: coords.left, width: coords.width, height: coords.height,
                      background: isHovered ? `${col.bg.replace('0.8','0.95')}` : col.bg,
                      border: `1.5px solid ${col.border}`,
                      borderRadius: 8,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 2,
                      transition: "all 0.25s ease",
                      cursor: "pointer",
                      boxShadow: riskLevel > 0 ? `0 0 20px ${col.glow}` : "none",
                      transform: isHovered ? "scale(1.02)" : "scale(1)",
                      zIndex: isHovered ? 10 : 1,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: col.text, textTransform: "uppercase" }}>
                      {coords.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: col.text, opacity: 0.9 }}>
                      {zoneName}
                    </span>
                    {casesCount > 0 && (
                      <span style={{ fontSize: 9, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "1px 6px", borderRadius: 10, marginTop: 2 }}>
                        {casesCount} caso{casesCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {/* Pulsing heat dot */}
                    {casesCount > 0 && (
                      <div style={{ position: "absolute", top: 4, right: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: riskLevel === 2 ? "#EF4444" : "#F97316", animation: "pulse-dot 1.5s ease infinite" }} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Tooltip on hover */}
              {hoveredZone && (
                <div style={{
                  position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
                  background: "rgba(6,13,26,0.95)", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 10,
                  padding: "10px 16px", zIndex: 20, whiteSpace: "nowrap", backdropFilter: "blur(10px)",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#E8F0FE", marginBottom: 4 }}>{hoveredZone}</p>
                  <p style={{ fontSize: 12, color: "#8AA3C8" }}>
                    Casos recientes: <strong style={{ color: analytics.byZone[hoveredZone] > 3 ? "#F87171" : analytics.byZone[hoveredZone] > 0 ? "#FB923C" : "#4ADE80" }}>{analytics.byZone[hoveredZone] || 0}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Cases sidebar */}
          <div style={{ background: "rgba(15,31,56,0.9)", border: "1px solid rgba(30,136,229,0.12)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(30,136,229,0.1)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#E8F0FE", marginBottom: 12 }}>Casos Recientes</p>
              <div style={{ position: "relative" }}>
                <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4A6080" }} size={14} />
                <input
                  type="text"
                  placeholder="Buscar enfermedad o paciente..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 32 }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: "center", color: "#4A6080" }}>
                  <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 12 }}>Cargando datos...</p>
                </div>
              ) : filteredReportes.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#4A6080" }}>
                  <ShieldAlert size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  <p style={{ fontSize: 12 }}>Sin resultados</p>
                </div>
              ) : filteredReportes.slice(0, 30).map(rep => {
                const sev = SEVERITY_CONFIG[rep.severidad as Severity] || SEVERITY_CONFIG.BAJA;
                return (
                  <div
                    key={rep.id}
                    style={{ background: "rgba(6,13,26,0.6)", border: "1px solid rgba(30,136,229,0.08)", borderRadius: 10, padding: "10px 12px", transition: "all 0.2s", cursor: "default" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(30,136,229,0.06)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(30,136,229,0.2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(6,13,26,0.6)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(30,136,229,0.08)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#E8F0FE", flex: 1, marginRight: 8 }}>{rep.enfermedad}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                        {sev.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <User size={10} style={{ color: "#4A6080" }} />
                      <span style={{ fontSize: 11, color: "#8AA3C8" }}>{rep.paciente}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#4A6080" }}>
                        <MapPin size={10} />
                        {rep.ubicacion}
                      </span>
                      <span style={{ fontSize: 10, color: "#2A4060", fontFamily: "monospace" }}>
                        {new Date(rep.fecha).toLocaleDateString('es-BO')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(30,136,229,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#2A4060" }}>{filteredReportes.length} resultado{filteredReportes.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 11, color: "#2A4060" }}>Total histórico: {reportes.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Lista Completa ── */}
      {activeTab === "lista" && (
        <div style={{ background: "rgba(15,31,56,0.9)", border: "1px solid rgba(30,136,229,0.12)", borderRadius: 16, overflow: "hidden" }}>
          {/* Filters bar */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(30,136,229,0.1)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Filter size={14} style={{ color: "#4A6080" }} />
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4A6080" }} size={14} />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field" style={{ paddingLeft: 32 }} />
            </div>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 130 }}>
              <option value="ALL">Todas las severidades</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{SEVERITY_CONFIG[s].label}</option>)}
            </select>
            <select value={filterZone} onChange={e => setFilterZone(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 160 }}>
              <option value="ALL">Todas las zonas</option>
              {Object.keys(ZONES_MAP).map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "#4A6080", whiteSpace: "nowrap" }}>{filteredReportes.length} registros</span>
          </div>
          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Enfermedad</th>
                  <th>Paciente</th>
                  <th>Ubicación</th>
                  <th>Severidad</th>
                  <th>Fecha</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#4A6080" }}>Cargando...</td></tr>
                ) : filteredReportes.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#4A6080" }}>Sin resultados</td></tr>
                ) : filteredReportes.map(rep => {
                  const sev = SEVERITY_CONFIG[rep.severidad as Severity] || SEVERITY_CONFIG.BAJA;
                  return (
                    <tr key={rep.id}>
                      <td style={{ fontWeight: 600, color: "#E8F0FE" }}>{rep.enfermedad}</td>
                      <td>{rep.paciente}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={11} style={{ color: "#4A6080" }} />
                          {rep.ubicacion}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: sev.dot }} />
                          {sev.label}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>{new Date(rep.fecha).toLocaleDateString('es-BO')}</td>
                      <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rep.observaciones || <span style={{ color: "#2A4060" }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Tendencias ── */}
      {activeTab === "tendencias" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Daily trend */}
          <div style={{ background: "rgba(15,31,56,0.9)", border: "1px solid rgba(30,136,229,0.12)", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <BarChart3 size={16} style={{ color: "#F97316" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F0FE" }}>Casos por Día (últimos 7 días)</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
              {analytics.dailyTrend.map((val, i) => {
                const max = Math.max(...analytics.dailyTrend, 1);
                const h = (val / max) * 100;
                const date = new Date(Date.now() - (6 - i) * 86400000);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "#E8F0FE", fontWeight: 600, visibility: val > 0 ? "visible" : "hidden" }}>{val}</span>
                    <div style={{ width: "100%", height: `${h}%`, minHeight: val > 0 ? 4 : 2, background: val > 3 ? "linear-gradient(180deg, #EF4444, #DC2626)" : val > 0 ? "linear-gradient(180deg, #F97316, #EA580C)" : "rgba(30,136,229,0.1)", borderRadius: "4px 4px 0 0", transition: "all 0.3s ease", boxShadow: val > 0 ? `0 0 10px rgba(249,115,22,0.3)` : "none" }} />
                    <span style={{ fontSize: 9, color: "#2A4060", textAlign: "center" }}>{date.toLocaleDateString('es-BO', { weekday: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Diseases */}
          <div style={{ background: "rgba(15,31,56,0.9)", border: "1px solid rgba(30,136,229,0.12)", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <FlaskConical size={16} style={{ color: "#A78BFA" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F0FE" }}>Enfermedades más Reportadas (7 días)</span>
            </div>
            {analytics.topDiseases.length === 0 ? (
              <div style={{ textAlign: "center", color: "#4A6080", padding: "30px 0", fontSize: 13 }}>Sin datos en los últimos 7 días</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analytics.topDiseases.map(([disease, count], i) => {
                  const max = analytics.topDiseases[0][1];
                  const pct = (count / max) * 100;
                  const colors = ["#EF4444","#F97316","#FBBF24","#34D399","#60A5FA","#A78BFA"];
                  const color = colors[i % colors.length];
                  return (
                    <div key={disease}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#C8D8F0" }}>{disease}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>
                          {count} caso{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "rgba(30,136,229,0.1)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease", boxShadow: `0 0 8px ${color}66` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Severity distribution */}
          <div style={{ background: "rgba(15,31,56,0.9)", border: "1px solid rgba(30,136,229,0.12)", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <AlertCircle size={16} style={{ color: "#FBBF24" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F0FE" }}>Distribución por Severidad (7 días)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {SEVERITIES.map(sev => {
                const count = analytics.bySeverity[sev];
                const total = analytics.recentCases.length || 1;
                const pct = Math.round((count / total) * 100);
                const cfg = SEVERITY_CONFIG[sev];
                return (
                  <div key={sev}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
                        <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                      </span>
                      <span style={{ fontSize: 12, color: "#8AA3C8" }}>{count} — <span style={{ fontWeight: 700, color: "#E8F0FE" }}>{pct}%</span></span>
                    </div>
                    <div style={{ height: 8, background: "rgba(30,136,229,0.08)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: cfg.dot, borderRadius: 4, transition: "width 0.6s ease", boxShadow: `0 0 10px ${cfg.dot}55` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zone distribution */}
          <div style={{ background: "rgba(15,31,56,0.9)", border: "1px solid rgba(30,136,229,0.12)", borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <MapPin size={16} style={{ color: "#34D399" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F0FE" }}>Casos por Zona Hospitalaria (7 días)</span>
            </div>
            {Object.keys(analytics.byZone).length === 0 ? (
              <div style={{ textAlign: "center", color: "#4A6080", padding: "30px 0", fontSize: 13 }}>Sin distribución por zonas</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(analytics.byZone)
                  .sort((a, b) => b[1] - a[1])
                  .map(([zone, count], i) => {
                    const maxZone = Math.max(...Object.values(analytics.byZone));
                    const pct = (count / maxZone) * 100;
                    const isHigh = count > 3;
                    const color = isHigh ? "#EF4444" : "#34D399";
                    return (
                      <div key={zone}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#C8D8F0" }}>{zone}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
                        </div>
                        <div style={{ height: 5, background: "rgba(30,136,229,0.08)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Nuevo Caso ── */}
      {isModalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          animation: "fade-in 0.25s ease forwards",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #0F1F38 0%, #0A1628 100%)",
            border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, width: "100%", maxWidth: 520,
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 40px rgba(239,68,68,0.1)",
            animation: "scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}>
            {/* Modal header */}
            <div style={{ padding: "22px 24px", borderBottom: "1px solid rgba(239,68,68,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldAlert size={16} style={{ color: "#F87171" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#E8F0FE" }}>Registrar Nuevo Caso</h2>
                  <p style={{ fontSize: 11, color: "#4A6080" }}>Sistema de Vigilancia Epidemiológica</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", color: "#4A6080", cursor: "pointer", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8AA3C8", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Enfermedad / Diagnóstico (ICD-10)
                </label>
                <input
                  type="text"
                  value={form.enfermedad}
                  onChange={e => setForm({ ...form, enfermedad: e.target.value })}
                  placeholder="Ej. Dengue, COVID-19, Influenza A..."
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8AA3C8", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Paciente Afectado
                </label>
                <select
                  value={form.paciente_id}
                  onChange={e => setForm({ ...form, paciente_id: e.target.value })}
                  className="input-field"
                >
                  <option value="" disabled>Seleccione un paciente activo...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} — MRN: {p.mrn}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#8AA3C8", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Zona / Ubicación
                  </label>
                  <select
                    value={form.ubicacion}
                    onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                    className="input-field"
                  >
                    {Object.keys(ZONES_MAP).map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#8AA3C8", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Nivel de Severidad
                  </label>
                  <select
                    value={form.severidad}
                    onChange={e => setForm({ ...form, severidad: e.target.value as Severity })}
                    className="input-field"
                  >
                    <option value="ALTA">🔴 Alta (Crítico)</option>
                    <option value="MEDIA">🟠 Media</option>
                    <option value="BAJA">🔵 Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8AA3C8", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Observaciones Clínicas
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Síntomas, contactos epidemiológicos, historial de exposición..."
                  className="input-field"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(30,136,229,0.1)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(139,163,200,0.2)", borderRadius: 8, color: "#8AA3C8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                id="btn-reportar-caso"
                onClick={handleSubmit}
                disabled={!form.enfermedad || !form.paciente_id}
                style={{
                  padding: "9px 22px",
                  background: form.enfermedad && form.paciente_id
                    ? "linear-gradient(135deg, #EF4444, #DC2626)"
                    : "rgba(239,68,68,0.2)",
                  border: "none", borderRadius: 8, color: form.enfermedad && form.paciente_id ? "#fff" : "#4A6080",
                  fontSize: 13, fontWeight: 700, cursor: form.enfermedad && form.paciente_id ? "pointer" : "not-allowed",
                  boxShadow: form.enfermedad && form.paciente_id ? "0 4px 16px rgba(239,68,68,0.3)" : "none",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <Bell size={14} />
                Reportar Caso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

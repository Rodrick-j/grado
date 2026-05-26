'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';

// Horas del día para flujo de citas
const HOURS = ['00h','02h','04h','06h','08h','10h','12h','14h','16h','18h','20h','22h'];

const TRIAGE_COLORS: Record<string, string> = {
  RED: '#D32F2F', ORANGE: '#F57C00', YELLOW: '#F9A825', GREEN: '#388E3C', BLUE: '#1565C0',
};
const TRIAGE_LABELS: Record<string, string> = {
  RED: 'Rojo', ORANGE: 'Naranja', YELLOW: 'Amarillo', GREEN: 'Verde', BLUE: 'Azul',
};

// Neon accents (work as accent colors on both themes)
const NEON = {
  cyan: '#00BCD4',
  blue: '#1E88E5',
  purple: '#7C4DFF',
  magenta: '#E91E63',
  orange: '#FF9100',
  green: '#00C853',
  red: '#FF1744',
  teal: '#1DE9B6',
};

export function DashboardPage() {
  const supabase = createClient();
  const { role } = useAuth();

  const [kpis, setKpis] = useState({
    patients: 0, erQueue: 0, bedOccupancy: 0, appointments: 0,
  });
  const [triagePie, setTriagePie] = useState<{ name: string; value: number; color: string }[]>([]);
  const [specialtyBar, setSpecialtyBar] = useState<{ name: string; pacientes: number }[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchAll = async () => {
    setLoading(true);

    const [
      { count: patientsCount },
      { data: erData },
      { data: camasData },
      { count: apptCount },
      { data: triageData },
      { data: specData },
      { data: recentAppts },
    ] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('triage_queue').select('level').is('resolved_at', null),
      supabase.from('camas').select('estado'),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .gte('starts_at', new Date().toISOString().split('T')[0])
        .lt('starts_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
      supabase.from('triage_queue').select('level').is('resolved_at', null),
      supabase.from('specialties').select('name, color, camas(id)').limit(10),
      supabase.from('appointments')
        .select('id, starts_at, reason, status, patients(first_name, last_name), professionals(title, user_profiles(full_name))')
        .order('starts_at', { ascending: false })
        .limit(6),
    ]);

    const totalCamas = camasData?.length || 0;
    const ocupadas = camasData?.filter(c => c.estado === 'OCUPADA').length || 0;
    const bedOccupancy = totalCamas > 0 ? Math.round((ocupadas / totalCamas) * 100) : 0;

    setKpis({
      patients: patientsCount || 0,
      erQueue: erData?.length || 0,
      bedOccupancy,
      appointments: apptCount || 0,
    });

    const triageCounts: Record<string, number> = {};
    (triageData || []).forEach(t => { triageCounts[t.level] = (triageCounts[t.level] || 0) + 1; });
    setTriagePie(Object.entries(triageCounts).map(([k, v]) => ({
      name: TRIAGE_LABELS[k] || k, value: v, color: TRIAGE_COLORS[k] || '#607D8B',
    })));

    setSpecialtyBar((specData || []).map((s: any) => ({
      name: s.name.split(' ')[0],
      pacientes: s.camas?.length || 0,
    })).filter((s: any) => s.pacientes > 0));

    setRecentAppointments(recentAppts || []);
    setLastUpdated(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // RBAC Flags
  const isRole = (...roles: string[]) => !role || roles.includes(role);
  const showMedical = isRole('SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE');
  const showReception = isRole('SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'RECEPTIONIST', 'BILLING', 'DOCTOR', 'RESIDENT');
  const showAdmin = isRole('SUPER_ADMIN', 'MEDICAL_DIRECTOR');

  const kpiCards = [
    { id: 'patients', label: 'Pacientes Activos', value: kpis.patients, icon: 'Users', accent: '#1565C0', barGradient: 'linear-gradient(135deg, #1E88E5, #42A5F5)', desc: 'Total de pacientes internados o en tratamiento.', show: true },
    { id: 'er', label: 'En Espera (ER)', value: kpis.erQueue, icon: 'Siren', accent: '#C62828', barGradient: 'linear-gradient(135deg, #F44336, #E91E63)', desc: 'Pacientes en sala de emergencias.', show: showMedical },
    { id: 'appts', label: 'Citas Hoy', value: kpis.appointments, icon: 'CalendarDays', accent: '#5E35B1', barGradient: 'linear-gradient(135deg, #7C4DFF, #B388FF)', desc: 'Consultas médicas del día.', show: showReception },
    { id: 'beds', label: 'Ocupación Camas', value: `${kpis.bedOccupancy}%`, icon: 'BedDouble', accent: '#E65100', barGradient: 'linear-gradient(135deg, #FF9100, #FFD740)', desc: 'Porcentaje de camas en uso.', show: showMedical },
  ].filter(k => k.show);

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in">
      <style>{`
        @keyframes kpi-shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .dash-kpi {
          position: relative;
          padding: 16px 20px;
          border-radius: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-secondary);
          overflow: hidden;
          cursor: default;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dash-kpi:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -8px rgba(0,0,0,0.15);
          border-color: var(--border-primary);
        }
        .dash-kpi-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          border-radius: 14px 14px 0 0;
        }
        .dash-kpi-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s ease;
        }
        .dash-kpi:hover .dash-kpi-icon {
          transform: scale(1.08);
        }
        .dash-kpi-value {
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 3px;
        }
        .dash-kpi-desc {
          font-size: 10.5px;
          color: var(--text-muted);
          margin-top: 6px;
          line-height: 1.3;
          opacity: 0.85;
        }
        .dash-chart {
          background: var(--bg-card);
          border: 1px solid var(--border-secondary);
          border-radius: 14px;
          padding: 18px 20px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .dash-chart:hover {
          border-color: var(--border-primary);
          box-shadow: var(--shadow-card);
        }
        .dash-chart-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          margin-bottom: 4px;
        }
        .dash-chart-sub {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
          max-width: 90%;
        }
        .dash-chart-badge {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dash-empty {
          height: 170px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--text-muted);
        }
        .dash-empty-icon {
          width: 46px; height: 46px;
          border-radius: 14px;
          background: var(--bg-surface);
          border: 1px dashed var(--border-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dash-activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-secondary);
        }
        .dash-activity-item:last-child { border-bottom: none; }
        .dash-activity-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `linear-gradient(135deg, ${NEON.blue}, ${NEON.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${NEON.blue}30`,
          }}>
            <Icon name="LayoutDashboard" size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Centro de Mando
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Hospital San Juan de Dios · {today}
              {lastUpdated && <span style={{ marginLeft: 8, color: 'var(--color-teal)', fontWeight: 600 }}>· {lastUpdated}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" style={{ borderRadius: 10 }}><Icon name="Download" size={14} /> Exportar</button>
          <button className="btn-primary" onClick={fetchAll} disabled={loading} style={{
            borderRadius: 10,
            background: `linear-gradient(135deg, ${NEON.blue}, ${NEON.purple})`,
            boxShadow: `0 4px 12px ${NEON.blue}25`,
          }}>
            <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map(kpi => (
          <div key={kpi.id} className="dash-kpi">
            <div className="dash-kpi-bar" style={{ background: kpi.barGradient }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="dash-kpi-icon" style={{
                background: `${kpi.accent}15`,
                border: `1px solid ${kpi.accent}30`,
              }}>
                <Icon name={kpi.icon} size={20} style={{ color: kpi.accent }} />
              </div>
              {loading && <Icon name="Loader2" size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
            </div>
            <div className="dash-kpi-value" style={{ color: kpi.accent }}>{kpi.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{kpi.label}</div>
            <div className="dash-kpi-desc">{kpi.desc}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Citas por hora */}
        {showReception && (
        <div className={`dash-chart ${showMedical ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 className="dash-chart-title">Citas Programadas — Hoy</h2>
              <p className="dash-chart-sub">Muestra la distribución del volumen de citas médicas programadas a lo largo de las distintas horas del día actual, permitiendo identificar los picos de mayor afluencia en el centro médico.</p>
            </div>
            <div className="dash-chart-badge" style={{ background: `${NEON.purple}15`, border: `1px solid ${NEON.purple}25` }}>
              <Icon name="TrendingUp" size={14} style={{ color: NEON.purple }} />
            </div>
          </div>
          <ResponsiveContainer width="99%" height={195}>
            <AreaChart data={HOURS.map(h => {
              const hour = parseInt(h);
              const count = recentAppointments.filter(a => {
                const ah = new Date(a.starts_at).getHours();
                return ah >= hour && ah < hour + 2;
              }).length;
              return { hour: h, citas: count };
            })}>
              <defs>
                <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NEON.blue} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={NEON.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={NEON.blue} />
                  <stop offset="100%" stopColor={NEON.cyan} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="citas" stroke="url(#lineGrad)" fill="url(#gradArea)" strokeWidth={2.5}
                dot={{ r: 3, fill: NEON.blue, stroke: NEON.blue, strokeWidth: 1 }}
                activeDot={{ r: 5, fill: NEON.cyan, stroke: 'var(--bg-card)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}

        {/* Triage Pie */}
        {showMedical && (
        <div className={`dash-chart ${!showReception ? 'lg:col-span-3' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 className="dash-chart-title">Triage Manchester</h2>
              <p className="dash-chart-sub">Clasificación en tiempo real de los pacientes en la sala de emergencias según la gravedad de su condición clínica (Rojo, Naranja, Amarillo, Verde, Azul).</p>
            </div>
            <div className="dash-chart-badge" style={{ background: '#F4433615', border: '1px solid #F4433625' }}>
              <Icon name="HeartPulse" size={14} style={{ color: '#F44336' }} />
            </div>
          </div>
          {triagePie.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">
                <Icon name="ShieldCheck" size={20} style={{ color: NEON.green, opacity: 0.7 }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>Sin pacientes en cola</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>La sala de emergencias está libre</span>
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: 180 }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', top: -5 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{kpis.erQueue}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6, fontWeight: 700 }}>Total en Triage</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={triagePie} cx="50%" cy="50%" innerRadius={60} outerRadius={78} dataKey="value" stroke="var(--bg-card)" strokeWidth={4} cornerRadius={6}>
                    {triagePie.map((entry, i) => <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 4px 8px ${entry.color}50)` }} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, fontSize: 12, color: 'var(--text-primary)', boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }} 
                    itemStyle={{ fontWeight: 800 }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            {triagePie.map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.name}: <strong style={{ color: 'var(--text-primary)' }}>{t.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Camas por especialidad */}
        {showMedical && (
        <div className={`dash-chart ${!showReception ? 'lg:col-span-2' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 className="dash-chart-title">Camas por Especialidad</h2>
              <p className="dash-chart-sub">Indica la distribución y asignación actual de las camas de hospitalización en relación a las distintas especialidades médicas (ej. Pediatría, UCI, Medicina General).</p>
            </div>
            <div className="dash-chart-badge" style={{ background: `${NEON.teal}15`, border: `1px solid ${NEON.teal}25` }}>
              <Icon name="BedDouble" size={14} style={{ color: NEON.teal }} />
            </div>
          </div>
          {specialtyBar.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">
                <Icon name="BedDouble" size={20} style={{ color: NEON.teal, opacity: 0.7 }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>Sin datos de camas</span>
            </div>
          ) : (
            <ResponsiveContainer width="99%" height={200}>
              <BarChart data={specialtyBar} layout="vertical">
                <defs>
                  <linearGradient id="barGrad2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={NEON.blue} />
                    <stop offset="100%" stopColor={NEON.cyan} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
                <Bar dataKey="pacientes" fill="url(#barGrad2)" radius={[0, 6, 6, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        )}

        {/* Citas recientes */}
        {showReception && (
        <div className={`dash-chart ${!showMedical ? 'lg:col-span-2' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 className="dash-chart-title">Citas Recientes</h2>
              <p className="dash-chart-sub">Listado cronológico de las consultas y procedimientos médicos más recientes que han sido registrados en el sistema, mostrando paciente, profesional y motivo.</p>
            </div>
            <div className="live-dot" />
          </div>
          {recentAppointments.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">
                <Icon name="CalendarDays" size={20} style={{ color: NEON.purple, opacity: 0.7 }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>Sin citas registradas</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>Las nuevas citas aparecerán aquí</span>
            </div>
          ) : (
            recentAppointments.map((a) => {
              const pat = a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : 'Paciente';
              const doc = a.professionals ? `${a.professionals.title} ${a.professionals.user_profiles?.full_name}` : '—';
              const STATUS_COLORS: Record<string, string> = { SCHEDULED: NEON.blue, CONFIRMED: NEON.green, IN_PROGRESS: NEON.orange, COMPLETED: '#607D8B', CANCELLED: NEON.red };
              const color = STATUS_COLORS[a.status] || '#607D8B';
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-secondary)' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: `${color}12`, border: `1px solid ${color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name="CalendarDays" size={14} style={{ color }} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pat} — {doc}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.reason || 'Consulta médica'}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                    {new Date(a.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Timeline Actividad */}
        {showAdmin && (
        <div className={`dash-chart ${(!showMedical && !showReception) ? 'lg:col-span-3' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 className="dash-chart-title">Actividad Reciente</h2>
              <p className="dash-chart-sub">Bitácora en vivo de los últimos eventos y acciones relevantes ocurridos dentro del sistema integrado, útil para auditoría y seguimiento general.</p>
            </div>
            <div className="dash-chart-badge" style={{ background: `${NEON.teal}15`, border: `1px solid ${NEON.teal}25` }}>
              <Icon name="Activity" size={14} style={{ color: NEON.teal }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { time: 'Ahora', color: NEON.blue, text: 'Sistema operativo — en espera de actividad' },
              { time: 'Hoy', color: NEON.green, text: 'Base de datos limpiada — 0 pacientes' },
              { time: 'Hoy', color: NEON.teal, text: '20 especialidades configuradas' },
              { time: 'Hoy', color: NEON.purple, text: '25 profesionales registrados' },
            ].map((item, i) => (
              <div key={i} className="dash-activity-item">
                <div className="dash-activity-dot" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}50` }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.time}</span>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Quirófanos */}
        {showMedical && (
        <div className={`dash-chart ${!showAdmin ? 'lg:col-span-2 md:col-span-1' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 className="dash-chart-title">Estado de Quirófanos</h2>
              <p className="dash-chart-sub">Monitoriza el estado de ocupación de las salas de cirugía, indicando qué procedimientos están en curso, en limpieza o disponibles para programación.</p>
            </div>
            <div className="dash-chart-badge" style={{ background: `${NEON.purple}15`, border: `1px solid ${NEON.purple}25` }}>
              <Icon name="Scissors" size={14} style={{ color: NEON.purple }} />
            </div>
          </div>
          <div className="dash-empty" style={{ height: 130 }}>
            <div className="dash-empty-icon">
              <Icon name="Scissors" size={20} style={{ color: NEON.purple, opacity: 0.7 }} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Sin cirugías programadas</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>Las operaciones aparecerán aquí</span>
          </div>
        </div>
        )}

        {/* Guardia */}
        <div className="dash-chart">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 className="dash-chart-title">Personal de Guardia</h2>
              <p className="dash-chart-sub">Muestra a los líderes médicos, enfermeros jefes y especialistas que se encuentran actualmente en turno para la gestión de crisis y emergencias.</p>
            </div>
            <div className="dash-chart-badge" style={{ background: `${NEON.magenta}15`, border: `1px solid ${NEON.magenta}25` }}>
              <Icon name="UserCog" size={14} style={{ color: NEON.magenta }} />
            </div>
          </div>
          <div className="dash-empty" style={{ height: 130 }}>
            <div className="dash-empty-icon">
              <Icon name="Users" size={20} style={{ color: NEON.blue, opacity: 0.7 }} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Sin personal asignado</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>Configure turnos para ver la guardia</span>
          </div>
        </div>
      </div>
    </div>
  );
}

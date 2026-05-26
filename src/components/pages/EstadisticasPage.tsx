'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import * as XLSX from 'xlsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, startOfYear, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

type TabType = 'general' | 'finanzas' | 'clinico' | 'operativo';
type DateRangeType = '7d' | '30d' | 'year' | 'all';

// Constants for UI
const COLORS = ['#00BCD4', '#10B981', '#8B5CF6', '#F59E0B', '#E91E63', '#1E88E5'];
const PAYMENT_COLORS: Record<string, string> = {
  'EFECTIVO': '#10B981',
  'TARJETA': '#3B82F6',
  'TRANSFERENCIA': '#8B5CF6',
  'SEGURO': '#F59E0B'
};

export default function EstadisticasPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [dateRange, setDateRange] = useState<DateRangeType>('7d');
  
  // Data State
  const [rawRecibos, setRawRecibos] = useState<any[]>([]);
  const [rawPatients, setRawPatients] = useState<any[]>([]);
  const [rawStaff, setRawStaff] = useState<any[]>([]);
  const [rawCamas, setRawCamas] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange]); // Refetch when date range changes

  // Silence harmless Recharts warnings about width/height in tabs
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('The width(')) return;
      originalWarn(...args);
    };
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let startDateStr = '';
      const hoy = new Date();
      if (dateRange === '7d') startDateStr = subDays(hoy, 6).toISOString();
      else if (dateRange === '30d') startDateStr = subDays(hoy, 29).toISOString();
      else if (dateRange === 'year') startDateStr = startOfYear(hoy).toISOString();
      else startDateStr = new Date(0).toISOString();

      // We fetch all patients, staff, beds for accurate current state, 
      // but filter recibos by the dateRange to see financial performance in that period.
      const [
        { data: patientsData },
        { data: staffData },
        { data: recibosData },
        { data: camasData }
      ] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('user_profiles').select('*'),
        supabase.from('recibos').select('*, patients(first_name, last_name, ci_passport, mrn)').gte('created_at', startDateStr).order('created_at', { ascending: true }),
        supabase.from('camas').select('*')
      ]);

      setRawPatients(patientsData || []);
      setRawStaff(staffData || []);
      setRawRecibos(recibosData || []);
      setRawCamas(camasData || []);

    } catch (error) {
      console.error('Error fetching data for charts', error);
    } finally {
      setLoading(false);
    }
  };

  // --- DERIVED DATA & KPIs ---
  const kpis = useMemo(() => {
    const pagados = rawRecibos.filter(r => r.estado === 'PAGADO');
    const totalRecaudado = pagados.reduce((sum, r) => sum + Number(r.monto_total), 0);
    const ticketPromedio = pagados.length > 0 ? totalRecaudado / pagados.length : 0;
    
    // Pacientes nuevos en el rango
    let startDateStr = '';
    const hoy = new Date();
    if (dateRange === '7d') startDateStr = subDays(hoy, 6).toISOString();
    else if (dateRange === '30d') startDateStr = subDays(hoy, 29).toISOString();
    else if (dateRange === 'year') startDateStr = startOfYear(hoy).toISOString();
    else startDateStr = new Date(0).toISOString();
    
    const pacientesNuevos = rawPatients.filter(p => p.created_at >= startDateStr).length;
    const camasOcupadas = rawCamas.filter(c => c.estado === 'OCUPADA').length;

    return {
      totalRecaudado,
      ticketPromedio,
      pacientesNuevos,
      totalPacientes: rawPatients.length,
      camasOcupadas,
      totalCamas: rawCamas.length,
      staffActivo: rawStaff.length,
      totalRecibos: rawRecibos.length
    };
  }, [rawRecibos, rawPatients, rawCamas, rawStaff, dateRange]);

  const chartsData = useMemo(() => {
    // 1. Ingresos Timeline
    const ingresosMap: Record<string, number> = {};
    rawRecibos.forEach(r => {
      if (r.estado === 'PAGADO') {
        const dateLabel = format(new Date(r.created_at), 'MMM dd', { locale: es });
        ingresosMap[dateLabel] = (ingresosMap[dateLabel] || 0) + Number(r.monto_total);
      }
    });
    const ingresosTimeline = Object.keys(ingresosMap).map(date => ({ date, total: ingresosMap[date] }));

    // 2. Servicios Bar
    const serviciosMap: Record<string, number> = {};
    rawRecibos.forEach(r => {
      serviciosMap[r.tipo] = (serviciosMap[r.tipo] || 0) + 1;
    });
    const serviciosBar = Object.keys(serviciosMap).map(name => ({ name, value: serviciosMap[name] })).sort((a,b) => b.value - a.value).slice(0, 5);

    // 3. Métodos de Pago
    const metodosMap: Record<string, number> = {};
    rawRecibos.forEach(r => {
      if (r.estado === 'PAGADO') {
        const met = r.metodo_pago || 'OTRO';
        metodosMap[met] = (metodosMap[met] || 0) + Number(r.monto_total);
      }
    });
    const metodosPie = Object.keys(metodosMap).map(name => ({ 
      name, 
      value: metodosMap[name],
      color: PAYMENT_COLORS[name] || '#9CA3AF'
    }));

    // 4. Edades
    let edad0_18 = 0, edad19_35 = 0, edad36_50 = 0, edad51_plus = 0;
    rawPatients.forEach(p => {
      if (p.birth_date) {
        const age = differenceInYears(new Date(), new Date(p.birth_date));
        if (age <= 18) edad0_18++;
        else if (age <= 35) edad19_35++;
        else if (age <= 50) edad36_50++;
        else edad51_plus++;
      }
    });
    const edadesPie = [
      { name: '0-18 años', value: edad0_18, color: '#3B82F6' },
      { name: '19-35 años', value: edad19_35, color: '#10B981' },
      { name: '36-50 años', value: edad36_50, color: '#F59E0B' },
      { name: '51+ años', value: edad51_plus, color: '#8B5CF6' }
    ].filter(x => x.value > 0);

    // 5. Staff por Rol
    const rolesMap: Record<string, number> = {};
    rawStaff.forEach(s => {
      const rol = s.role || 'Desconocido';
      rolesMap[rol] = (rolesMap[rol] || 0) + 1;
    });
    const staffBar = Object.keys(rolesMap).map(name => ({ name, value: rolesMap[name] })).sort((a,b) => b.value - a.value);

    return { ingresosTimeline, serviciosBar, metodosPie, edadesPie, staffBar };
  }, [rawRecibos, rawPatients, rawStaff]);

  // EXPORT TO EXCEL
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const [
        { data: allRecibos },
        { data: allPatients },
        { data: allCamas },
        { data: allStaff }
      ] = await Promise.all([
        supabase.from('recibos').select('*, patients(first_name, last_name, ci_passport, mrn)').order('created_at', { ascending: false }),
        supabase.from('patients').select('*').order('created_at', { ascending: false }),
        supabase.from('camas').select('*'),
        supabase.from('user_profiles').select('*')
      ]);

      const workbook = XLSX.utils.book_new();

      const wsFinanzas = XLSX.utils.json_to_sheet((allRecibos || []).map(r => ({
        'Fecha': new Date(r.created_at).toLocaleString('es-BO'),
        'Paciente': r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : 'Desconocido',
        'Servicio': r.tipo,
        'Estado': r.estado,
        'Método': r.metodo_pago,
        'Monto (Bs.)': r.monto_total
      })));
      XLSX.utils.book_append_sheet(workbook, wsFinanzas, "Finanzas");

      const wsPacientes = XLSX.utils.json_to_sheet((allPatients || []).map(p => ({
        'Nombre': `${p.first_name} ${p.last_name}`,
        'CI': p.ci_passport,
        'MRN': p.mrn,
        'Género': p.gender,
        'Estado': p.status
      })));
      XLSX.utils.book_append_sheet(workbook, wsPacientes, "Pacientes");

      XLSX.writeFile(workbook, `Faro_Global_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (e) {
      console.error('Export error', e);
      alert('Error exportando reporte.');
    } finally {
      setExporting(false);
    }
  };

  const tabs: { id: TabType, label: string, icon: string }[] = [
    { id: 'general', label: 'Resumen General', icon: 'LayoutDashboard' },
    { id: 'finanzas', label: 'Finanzas', icon: 'Wallet' },
    { id: 'clinico', label: 'Clínico & Pacientes', icon: 'Users' },
    { id: 'operativo', label: 'Operativo & RRHH', icon: 'Activity' }
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1600, margin: '0 auto', paddingBottom: 60 }}>
      {/* HEADER & FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
            <div style={{ padding: 12, background: 'linear-gradient(135deg, rgba(0,188,212,0.2) 0%, rgba(139,92,246,0.2) 100%)', borderRadius: 16 }}>
              <Icon name="PieChart" size={32} style={{ color: '#00BCD4' }} />
            </div>
            Analytics Insight
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 8, maxWidth: 600 }}>
            Plataforma de inteligencia de negocios para Clínica Faro. Monitoreo en tiempo real de métricas financieras, operativas y clínicas.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-card)', padding: '8px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4 }}>
            {[
              { val: '7d', label: '7 Días' },
              { val: '30d', label: '30 Días' },
              { val: 'year', label: 'Este Año' },
              { val: 'all', label: 'Histórico' }
            ].map(r => (
              <button 
                key={r.val}
                onClick={() => setDateRange(r.val as DateRangeType)}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: 8, 
                  border: 'none', 
                  background: dateRange === r.val ? 'var(--primary)' : 'transparent',
                  color: dateRange === r.val ? 'white' : 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={exportToExcel} disabled={exporting} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', borderRadius: 12, padding: '10px 20px', color: 'white', display: 'flex', alignItems: 'center', gap: 8, cursor: exporting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)' }}>
            {exporting ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="DownloadCloud" size={18} />}
            Exportar XLS
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16, overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? 'rgba(0,188,212,0.1)' : 'transparent',
              border: 'none',
              borderRadius: 12,
              color: activeTab === tab.id ? '#00BCD4' : 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === tab.id ? 'inset 0 0 0 1px rgba(0,188,212,0.3)' : 'none'
            }}
          >
            <Icon name={tab.icon} size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 400, color: 'var(--text-muted)' }}>
          <Icon name="RefreshCw" size={48} className="animate-spin" style={{ color: '#00BCD4', marginBottom: 16 }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>Procesando millones de datos...</span>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Ingresos Totales (Bs)', value: kpis.totalRecaudado.toLocaleString('es-BO', { minimumFractionDigits: 2 }), icon: 'Banknote', color: '#10B981', desc: `En ${kpis.totalRecibos} transacciones` },
                  { label: 'Pacientes Nuevos', value: kpis.pacientesNuevos, icon: 'UserPlus', color: '#00BCD4', desc: `De un histórico de ${kpis.totalPacientes}` },
                  { label: 'Ocupación de Camas', value: `${((kpis.camasOcupadas / Math.max(kpis.totalCamas, 1)) * 100).toFixed(0)}%`, icon: 'BedDouble', color: '#F43F5E', desc: `${kpis.camasOcupadas} ocupadas de ${kpis.totalCamas}` },
                  { label: 'Staff Activo', value: kpis.staffActivo, icon: 'Stethoscope', color: '#8B5CF6', desc: 'Médicos y administrativos' }
                ].map((k, i) => (
                  <div key={i} className="glass-card" style={{ padding: '24px', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: `${k.color}10`, borderRadius: '50%', filter: 'blur(20px)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${k.color}30` }}>
                        <Icon name={k.icon} size={24} style={{ color: k.color }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{k.value}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{k.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
                <div className="glass-card" style={{ gridColumn: 'span 8', padding: '24px', borderRadius: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="Activity" size={20} style={{ color: '#00BCD4' }} /> Evolución de Ingresos
                  </h3>
                  <div style={{ height: 350 }}>
                    {chartsData.ingresosTimeline.length > 0 ? (
                      <ResponsiveContainer width="99%" height="99%">
                        <AreaChart data={chartsData.ingresosTimeline}>
                          <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00BCD4" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#00BCD4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `Bs ${v/1000}k`} />
                          <RechartsTooltip 
                            contentStyle={{ background: 'rgba(11,22,40,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, backdropFilter: 'blur(10px)' }}
                            itemStyle={{ color: '#fff', fontWeight: 700 }}
                            formatter={(value: any) => [`Bs. ${Number(value).toLocaleString('es-BO', {minimumFractionDigits: 2})}`, 'Total']}
                          />
                          <Area type="monotone" dataKey="total" stroke="#00BCD4" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" activeDot={{ r: 8, fill: '#00BCD4', stroke: '#0B1628', strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos en el periodo.</div>
                    )}
                  </div>
                </div>

                <div className="glass-card" style={{ gridColumn: 'span 4', padding: '24px', borderRadius: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="Layers" size={20} style={{ color: '#8B5CF6' }} /> Top Servicios
                  </h3>
                  <div style={{ height: 350 }}>
                    {chartsData.serviciosBar.length > 0 ? (
                      <ResponsiveContainer width="99%" height="99%">
                        <BarChart data={chartsData.serviciosBar} layout="vertical" margin={{ left: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} stroke="rgba(255,255,255,0.7)" fontSize={11} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ background: 'rgba(11,22,40,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                            formatter={(value: any) => [value, 'Atenciones']}
                          />
                          <Bar dataKey="value" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={20}>
                            {chartsData.serviciosBar.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FINANZAS */}
          {activeTab === 'finanzas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
                
                <div className="glass-card" style={{ gridColumn: 'span 4', padding: '24px', borderRadius: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="PieChart" size={20} style={{ color: '#10B981' }} /> Métodos de Pago
                  </h3>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="99%" height="99%">
                      <PieChart>
                        <Pie data={chartsData.metodosPie} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                          {chartsData.metodosPie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ background: 'rgba(11,22,40,0.9)', border: 'none', borderRadius: 8 }}
                          formatter={(value: any) => [`Bs. ${Number(value).toLocaleString('es-BO')}`, 'Ingreso']}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: 24, padding: 16, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ticket Promedio</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>Bs. {kpis.ticketPromedio.toLocaleString('es-BO', {minimumFractionDigits: 2})}</div>
                  </div>
                </div>

                <div className="glass-card" style={{ gridColumn: 'span 8', padding: '24px', borderRadius: 20, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="List" size={20} style={{ color: '#00BCD4' }} /> Últimas Transacciones
                  </h3>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fecha</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Paciente</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Servicio</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Método</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Monto (Bs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawRecibos.slice(-15).reverse().map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', cursor: 'default' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : 'N/A'}</td>
                            <td style={{ padding: '12px 16px' }}><span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>{r.tipo}</span></td>
                            <td style={{ padding: '12px 16px' }}>{r.metodo_pago || '-'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>{r.monto_total}</td>
                          </tr>
                        ))}
                        {rawRecibos.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No hay transacciones en este periodo.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: CLINICO */}
          {activeTab === 'clinico' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
              <div className="glass-card" style={{ gridColumn: 'span 6', padding: '24px', borderRadius: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="UserCircle" size={20} style={{ color: '#3B82F6' }} /> Distribución por Edades
                </h3>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="99%" height="99%">
                    <PieChart>
                      <Pie data={chartsData.edadesPie} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({ name, percent }) => `${name} (${((percent || 0)*100).toFixed(0)}%)`}>
                        {chartsData.edadesPie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: 'rgba(11,22,40,0.9)', border: 'none', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card" style={{ gridColumn: 'span 6', padding: '24px', borderRadius: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="Activity" size={20} style={{ color: '#E91E63' }} /> Demografía Adicional
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 16 }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Género (Muestra histórica)</h4>
                    <div style={{ display: 'flex', gap: 24 }}>
                      <div style={{ flex: 1, textAlign: 'center', background: 'rgba(30, 136, 229, 0.1)', padding: 16, borderRadius: 12 }}>
                        <Icon name="User" size={32} style={{ color: '#1E88E5', marginBottom: 8 }} />
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{rawPatients.filter(p => p.gender === 'M').length}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Masculino</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', background: 'rgba(233, 30, 99, 0.1)', padding: 16, borderRadius: 12 }}>
                        <Icon name="User" size={32} style={{ color: '#E91E63', marginBottom: 8 }} />
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{rawPatients.filter(p => p.gender === 'F').length}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Femenino</div>
                      </div>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: 20 }}>
                    Los datos clínicos detallados (triaje, signos vitales históricos) se encuentran en el módulo EMR específico.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OPERATIVO */}
          {activeTab === 'operativo' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
              <div className="glass-card" style={{ gridColumn: 'span 5', padding: '24px', borderRadius: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="BedDouble" size={20} style={{ color: '#F43F5E' }} /> Infraestructura (Camas)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                  <div style={{ position: 'relative', width: 200, height: 200 }}>
                    <svg viewBox="0 0 100 100" width="200" height="200">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle 
                        cx="50" cy="50" r="45" fill="none" stroke="#F43F5E" strokeWidth="10" 
                        strokeDasharray={`${(kpis.camasOcupadas / Math.max(kpis.totalCamas, 1)) * 283} 283`}
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 36, fontWeight: 800, color: '#F43F5E' }}>{kpis.camasOcupadas}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>de {kpis.totalCamas} ocupadas</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ gridColumn: 'span 7', padding: '24px', borderRadius: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="Users" size={20} style={{ color: '#00BCD4' }} /> Personal por Rol
                </h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="99%" height="99%">
                    <BarChart data={chartsData.staffBar} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.5)" tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ background: 'rgba(11,22,40,0.9)', border: 'none', borderRadius: 8 }}
                      />
                      <Bar dataKey="value" fill="#00BCD4" radius={[6, 6, 0, 0]} barSize={40}>
                        {chartsData.staffBar.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  status: string;
};

type FluidRecord = {
  id: string;
  patient_id: string;
  nurse_id: string;
  recorded_at: string;
  period_hours: number;
  intake_oral_ml: number;
  intake_iv_ml: number;
  intake_sng_ml: number;
  intake_other_ml: number;
  output_urine_ml: number;
  output_drain_ml: number;
  output_emesis_ml: number;
  output_other_ml: number;
  total_intake_ml: number;
  total_output_ml: number;
  balance_ml: number;
  notes: string | null;
  created_at: string;
  patients?: { first_name: string; last_name: string; mrn: string } | null;
  user_profiles?: { full_name: string } | null;
};

type NewRecordForm = {
  intake_oral_ml: string;
  intake_iv_ml: string;
  intake_sng_ml: string;
  intake_other_ml: string;
  output_urine_ml: string;
  output_drain_ml: string;
  output_emesis_ml: string;
  output_other_ml: string;
  period_hours: string;
  notes: string;
};

const EMPTY_FORM: NewRecordForm = {
  intake_oral_ml: '',
  intake_iv_ml: '',
  intake_sng_ml: '',
  intake_other_ml: '',
  output_urine_ml: '',
  output_drain_ml: '',
  output_emesis_ml: '',
  output_other_ml: '',
  period_hours: '8',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) || n < 0 ? 0 : n;
}

function getTurno(dateStr: string): string {
  const h = new Date(dateStr).getHours();
  if (h >= 7 && h < 15) return 'Mañana';
  if (h >= 15 && h < 23) return 'Tarde';
  return 'Noche';
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtHour(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: '#081121',
  border: '1px solid rgba(30,136,229,0.25)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
};

function NumInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="input-field"
      />
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F1F38', border: '1px solid rgba(30,136,229,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.value} ml</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BalanceHidricoPage() {
  const supabase = createClient();

  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [records, setRecords] = useState<FluidRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewRecordForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ingresos' | 'egresos'>('ingresos');
  const [modalPatientId, setModalPatientId] = useState('');

  // Derived form calculations
  const formIntake =
    parseNum(form.intake_oral_ml) +
    parseNum(form.intake_iv_ml) +
    parseNum(form.intake_sng_ml) +
    parseNum(form.intake_other_ml);
  const formOutput =
    parseNum(form.output_urine_ml) +
    parseNum(form.output_drain_ml) +
    parseNum(form.output_emesis_ml) +
    parseNum(form.output_other_ml);
  const formBalance = formIntake - formOutput;

  // Load patients
  const loadPatients = useCallback(async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, first_name, last_name, mrn, status')
      .in('status', ['HOSPITALIZED', 'ACTIVE'])
      .order('last_name');
    setPatients((data || []) as Patient[]);
  }, []);

  // Load fluid records
  const loadRecords = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('fluid_balance')
      .select('*, patients(first_name,last_name,mrn), user_profiles(full_name)')
      .order('recorded_at', { ascending: false });

    if (selectedPatientId) {
      q = q.eq('patient_id', selectedPatientId).limit(50);
    } else {
      q = q.limit(20);
    }

    const { data } = await q;
    setRecords((data || []) as FluidRecord[]);
    setLoading(false);
  }, [selectedPatientId]);

  useEffect(() => { loadPatients(); }, [loadPatients]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  // ── Filtered patients list for search ────────────────────────────
  const filteredPatients = patients.filter(p => {
    const q = patientSearch.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q)
    );
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // ── KPIs ──────────────────────────────────────────────────────────
  const today = new Date().toDateString();
  const todayRecords = records.filter(r =>
    selectedPatientId
      ? new Date(r.recorded_at).toDateString() === today
      : new Date(r.recorded_at).toDateString() === today
  );
  const kpiIntake = todayRecords.reduce((s, r) => s + (r.total_intake_ml || 0), 0);
  const kpiOutput = todayRecords.reduce((s, r) => s + (r.total_output_ml || 0), 0);
  const kpiBalance = kpiIntake - kpiOutput;
  const kpiCount = todayRecords.length;

  // ── Chart data (last 10 records, most recent last) ────────────────
  const chartData = [...records]
    .slice(0, 10)
    .reverse()
    .map(r => ({
      name: fmtHour(r.recorded_at),
      'Ingreso': r.total_intake_ml || 0,
      'Egreso': r.total_output_ml || 0,
      'Balance': r.balance_ml || 0,
    }));

  // ── Alerts ────────────────────────────────────────────────────────
  const showHighPositive = selectedPatientId && kpiBalance > 1500;
  const showHighNegative = selectedPatientId && kpiBalance < -1000;

  // ── Save handler ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!modalPatientId) return;
    setSaving(true);
    const payload = {
      patient_id: modalPatientId,
      recorded_at: new Date().toISOString(),
      period_hours: parseInt(form.period_hours),
      intake_oral_ml: parseNum(form.intake_oral_ml),
      intake_iv_ml: parseNum(form.intake_iv_ml),
      intake_sng_ml: parseNum(form.intake_sng_ml),
      intake_other_ml: parseNum(form.intake_other_ml),
      output_urine_ml: parseNum(form.output_urine_ml),
      output_drain_ml: parseNum(form.output_drain_ml),
      output_emesis_ml: parseNum(form.output_emesis_ml),
      output_other_ml: parseNum(form.output_other_ml),
      notes: form.notes || null,
    };
    await supabase.from('fluid_balance').insert(payload);
    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    setModalPatientId('');
    loadRecords();
  };

  const openModal = () => {
    setModalPatientId(selectedPatientId || '');
    setForm(EMPTY_FORM);
    setActiveTab('ingresos');
    setShowModal(true);
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="Droplets" size={22} style={{ color: '#00BCD4' }} />
            Balance Hídrico
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Control de ingresos y egresos hídricos por turno
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Patient search */}
          <div style={{ position: 'relative' }}>
            <Icon name="Search" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="input-field"
              style={{ width: 220, paddingLeft: 32 }}
            />
            {searchFocused && filteredPatients.length > 0 && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#0B1528', border: '1px solid rgba(30,136,229,0.25)', borderRadius: 8, zIndex: 50, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                <div
                  style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => { setSelectedPatientId(''); setPatientSearch(''); setSearchFocused(false); }}
                >
                  — Ver todos los pacientes
                </div>
                {filteredPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedPatientId(p.id); setPatientSearch(`${p.first_name} ${p.last_name}`); setSearchFocused(false); }}
                    style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,136,229,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>MRN {p.mrn}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedPatientId && (
            <button
              onClick={() => { setSelectedPatientId(''); setPatientSearch(''); }}
              className="btn-ghost"
              style={{ fontSize: 12, padding: '8px 10px' }}
            >
              <Icon name="X" size={12} /> Limpiar
            </button>
          )}
          <button onClick={openModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="Plus" size={16} />
            Nuevo Registro
          </button>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {showHighPositive && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.35)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="AlertTriangle" size={18} style={{ color: '#F44336', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FF5252' }}>BALANCE POSITIVO ELEVADO — Riesgo de edema</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Balance 24h: +{kpiBalance.toLocaleString()} ml</span>
        </div>
      )}
      {showHighNegative && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.35)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="AlertTriangle" size={18} style={{ color: '#FF9800', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FFA726' }}>BALANCE NEGATIVO ELEVADO — Posible deshidratación</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Balance 24h: {kpiBalance.toLocaleString()} ml</span>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────── */}
      {selectedPatientId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Ingresos 24h', value: kpiIntake, icon: 'ArrowDownToLine', color: '#1E88E5', unit: 'ml' },
            { label: 'Total Egresos 24h', value: kpiOutput, icon: 'ArrowUpFromLine', color: '#FF9800', unit: 'ml' },
            { label: 'Balance Neto', value: kpiBalance, icon: 'Scale', color: kpiBalance >= 0 ? '#4CAF50' : '#F44336', unit: 'ml' },
            { label: 'Registros del Día', value: kpiCount, icon: 'ClipboardList', color: '#9C27B0', unit: '' },
          ].map(k => (
            <div key={k.label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={k.icon} size={20} style={{ color: k.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>
                  {k.label === 'Balance Neto' && kpiBalance > 0 ? '+' : ''}{k.value.toLocaleString()}
                  {k.unit && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>{k.unit}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Chart ──────────────────────────────────────────────── */}
      {selectedPatientId && chartData.length > 0 && (
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Icon name="BarChart3" size={16} style={{ color: '#00BCD4' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Evolución del Balance — {selectedPatient?.first_name} {selectedPatient?.last_name}
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#4A6080', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4A6080', fontSize: 10 }} axisLine={false} tickLine={false} unit=" ml" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8AA3C8', paddingTop: 8 }} />
              <Bar dataKey="Ingreso" fill="#1E88E5" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Egreso" fill="#FF9800" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Balance" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry['Balance'] >= 0 ? '#4CAF50' : '#F44336'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="TableProperties" size={16} style={{ color: '#00BCD4' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {selectedPatientId ? `Registros de ${selectedPatient?.first_name} ${selectedPatient?.last_name}` : 'Últimos 20 registros — Todos los pacientes'}
            </span>
          </div>
          <button onClick={loadRecords} className="btn-ghost" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="RefreshCw" size={12} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="Loader2" size={28} className="animate-spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Cargando registros...</div>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="Droplets" size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sin registros de balance hídrico</div>
            <div style={{ fontSize: 13 }}>Crea el primer registro con el botón 'Nuevo Registro'</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Fecha / Hora</th>
                  <th>Turno</th>
                  <th>Periodo</th>
                  <th>Ingreso Total</th>
                  <th>Egreso Total</th>
                  <th>Balance</th>
                  <th>Registrado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const isExpanded = expandedRow === r.id;
                  const balance = r.balance_ml ?? 0;
                  const balColor = balance >= 0 ? '#4CAF50' : '#F44336';
                  return (
                    <>
                      <tr key={r.id} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                            {r.patients?.first_name} {r.patients?.last_name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>MRN {r.patients?.mrn}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{fmtDate(r.recorded_at)}</td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: 'rgba(30,136,229,0.12)', color: '#42A5F5', border: '1px solid rgba(30,136,229,0.25)' }}>
                            {getTurno(r.recorded_at)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{r.period_hours}h</td>
                        <td style={{ fontWeight: 600, color: '#1E88E5' }}>{(r.total_intake_ml ?? 0).toLocaleString()} ml</td>
                        <td style={{ fontWeight: 600, color: '#FF9800' }}>{(r.total_output_ml ?? 0).toLocaleString()} ml</td>
                        <td>
                          <span style={{ fontWeight: 700, color: balColor, fontSize: 13 }}>
                            {balance >= 0 ? '+' : ''}{balance.toLocaleString()} ml
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {r.user_profiles?.full_name || '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                            className="btn-ghost"
                            style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={12} />
                            {isExpanded ? 'Ocultar' : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r.id}-detail`}>
                          <td colSpan={9} style={{ background: 'rgba(30,136,229,0.04)', padding: '0' }}>
                            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              {/* Ingresos */}
                              <div style={{ background: 'rgba(30,136,229,0.06)', border: '1px solid rgba(30,136,229,0.15)', borderRadius: 8, padding: '12px 16px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#1E88E5', letterSpacing: '0.1em', marginBottom: 10 }}>INGRESOS DETALLADOS</div>
                                {[
                                  ['Oral', r.intake_oral_ml],
                                  ['IV / Parenteral', r.intake_iv_ml],
                                  ['SNG / Nasogástrico', r.intake_sng_ml],
                                  ['Otros', r.intake_other_ml],
                                ].map(([label, val]) => (
                                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                    <span>{label}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Number(val || 0).toLocaleString()} ml</span>
                                  </div>
                                ))}
                              </div>
                              {/* Egresos */}
                              <div style={{ background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.15)', borderRadius: 8, padding: '12px 16px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#FF9800', letterSpacing: '0.1em', marginBottom: 10 }}>EGRESOS DETALLADOS</div>
                                {[
                                  ['Orina', r.output_urine_ml],
                                  ['Drenajes', r.output_drain_ml],
                                  ['Vómitos / Emesis', r.output_emesis_ml],
                                  ['Otros', r.output_other_ml],
                                ].map(([label, val]) => (
                                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                    <span>{label}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Number(val || 0).toLocaleString()} ml</span>
                                  </div>
                                ))}
                              </div>
                              {r.notes && (
                                <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginRight: 8 }}>Notas:</span>
                                  {r.notes}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {showModal && (() => {
        const modalPatient = patients.find(p => p.id === modalPatientId);
        const intakeSum = parseNum(form.intake_oral_ml) + parseNum(form.intake_iv_ml) + parseNum(form.intake_sng_ml) + parseNum(form.intake_other_ml);
        const outputSum = parseNum(form.output_urine_ml) + parseNum(form.output_drain_ml) + parseNum(form.output_emesis_ml) + parseNum(form.output_other_ml);
        const totalSum = intakeSum + outputSum;
        const intakePct = totalSum > 0 ? (intakeSum / totalSum) * 100 : 50;
        const outputPct = totalSum > 0 ? (outputSum / totalSum) * 100 : 50;
        const modalBalance = intakeSum - outputSum;

        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 880, maxHeight: '90vh', overflowY: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Modal Header */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-card)', borderTopLeftRadius: 12, borderTopRightRadius: 12, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,188,212,0.15)', border: '1px solid rgba(0,188,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="Droplets" size={18} style={{ color: '#00BCD4' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Nuevo Registro de Balance Hídrico</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ingrese los valores del balance clínico</div>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
                  <Icon name="X" size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: 24, overflowY: 'auto' }}>
                
                {/* Column 1: Context & Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  
                  {/* Patient Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Paciente Admitido *</label>
                    <select
                      value={modalPatientId}
                      onChange={e => setModalPatientId(e.target.value)}
                      className="input-field"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="" style={{ background: 'var(--bg-dropdown)', color: 'var(--text-primary)' }}>— Seleccionar paciente —</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id} style={{ background: 'var(--bg-dropdown)', color: 'var(--text-primary)' }}>
                          {p.first_name} {p.last_name} (MRN {p.mrn})
                        </option>
                      ))}
                    </select>

                    {modalPatient && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 10,
                        padding: '10px 14px',
                        background: 'rgba(30,136,229,0.06)',
                        border: '1px solid rgba(30,136,229,0.15)',
                        borderRadius: 8
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'rgba(30,136,229,0.1)', color: '#1E88E5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0
                        }}>
                          {modalPatient.first_name[0]}{modalPatient.last_name[0]}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {modalPatient.first_name} {modalPatient.last_name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            ID Clínico: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{modalPatient.mrn}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Period Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Período del Turno</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['8', '12', '24'].map(h => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, period_hours: h }))}
                          style={{
                            flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: form.period_hours === h ? 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)' : 'var(--bg-surface)',
                            border: form.period_hours === h ? '1px solid #1E88E5' : '1px solid var(--border-primary)',
                            color: form.period_hours === h ? 'white' : 'var(--text-muted)',
                            boxShadow: form.period_hours === h ? '0 2px 8px rgba(30,136,229,0.3)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Balance & Distribution Card */}
                  <div style={{
                    background: modalBalance >= 0 ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.08)',
                    border: `1px solid ${modalBalance >= 0 ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.25)'}`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Balance Neto Estimado</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: modalBalance >= 0 ? '#4CAF50' : '#F44336', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em', margin: '4px 0' }}>
                      {modalBalance >= 0 ? '+' : ''}{modalBalance.toLocaleString()} ml
                    </div>
                    
                    {/* Double progress bar */}
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface)', overflow: 'hidden', display: 'flex', margin: '14px 0 10px 0' }}>
                      <div style={{ width: `${intakePct}%`, background: 'linear-gradient(90deg, #1E88E5, #42A5F5)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      <div style={{ width: `${outputPct}%`, background: 'linear-gradient(90deg, #FFA726, #FF9800)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1E88E5' }} />
                        Ingresos: {intakeSum} ml
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF9800' }} />
                        Egresos: {outputSum} ml
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Notas de Enfermería</label>
                    <textarea
                      rows={3}
                      placeholder="Observaciones clínicas relevantes..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="input-field"
                      style={{ resize: 'vertical', lineHeight: 1.5 }}
                    />
                  </div>
                </div>

                {/* Column 2: Inputs Grid (Ingresos vs Egresos) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  
                  {/* Ingresos Column Card */}
                  <div style={{ background: 'rgba(30,136,229,0.05)', border: '1px solid rgba(30,136,229,0.20)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#1E88E5', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                        <Icon name="ArrowDownToLine" size={12} />
                        Ingresos (ml)
                      </div>
                      <NumInput label="Vía Oral" value={form.intake_oral_ml} onChange={v => setForm(f => ({ ...f, intake_oral_ml: v }))} />
                      <NumInput label="IV / Parenteral" value={form.intake_iv_ml} onChange={v => setForm(f => ({ ...f, intake_iv_ml: v }))} />
                      <NumInput label="Sonda (SNG)" value={form.intake_sng_ml} onChange={v => setForm(f => ({ ...f, intake_sng_ml: v }))} />
                      <NumInput label="Otros Ingresos" value={form.intake_other_ml} onChange={v => setForm(f => ({ ...f, intake_other_ml: v }))} />
                    </div>
                    <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(30,136,229,0.08)', border: '1px solid rgba(30,136,229,0.18)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#42A5F5', fontWeight: 600 }}>Total</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#1E88E5' }}>{intakeSum.toLocaleString()} ml</span>
                    </div>
                  </div>

                  {/* Egresos Column Card */}
                  <div style={{ background: 'rgba(255,152,0,0.05)', border: '1px solid rgba(255,152,0,0.20)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#FF9800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                        <Icon name="ArrowUpFromLine" size={12} />
                        Egresos (ml)
                      </div>
                      <NumInput label="Diuresis / Orina" value={form.output_urine_ml} onChange={v => setForm(f => ({ ...f, output_urine_ml: v }))} />
                      <NumInput label="Drenajes" value={form.output_drain_ml} onChange={v => setForm(f => ({ ...f, output_drain_ml: v }))} />
                      <NumInput label="Vómitos (Emesis)" value={form.output_emesis_ml} onChange={v => setForm(f => ({ ...f, output_emesis_ml: v }))} />
                      <NumInput label="Otros Egresos" value={form.output_other_ml} onChange={v => setForm(f => ({ ...f, output_other_ml: v }))} />
                    </div>
                    <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.18)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#FFA726', fontWeight: 600 }}>Total</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#FF9800' }}>{outputSum.toLocaleString()} ml</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-secondary)', display: 'flex', gap: 12, justifyContent: 'flex-end', background: 'var(--bg-card)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, zIndex: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!modalPatientId || saving}
                  className="btn-primary"
                  style={{ opacity: !modalPatientId ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
                  {saving ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

type UCIPatient = {
  id: string; bed_code: string; nivel_alerta: string;
  vitals: Record<string, number | null>; respirador: boolean; respirador_modo: string | null;
  diagnostico_uci: string | null; ingreso_uci: string; notas: string | null; activo: boolean;
  patients?: { first_name: string; last_name: string; mrn: string; blood_type: string } | null;
  professionals?: { user_profiles: { full_name: string } } | null;
};

const ALERTA_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  ESTABLE:       { color: '#4CAF50', label: 'ESTABLE',      bg: 'rgba(76,175,80,0.1)' },
  MODERADO:      { color: '#FF9800', label: 'MODERADO',     bg: 'rgba(255,152,0,0.1)' },
  CRITICO:       { color: '#F44336', label: 'CRÍTICO',      bg: 'rgba(244,67,54,0.1)' },
  MUERTE_CEREBRAL: { color: '#37474F', label: 'MUERTE CEREBRAL', bg: 'rgba(55,71,79,0.2)' },
};

const VITAL_CONFIG = [
  { key: 'fc',   label: 'FC',    unit: 'bpm', normal: [60, 100], icon: '💗' },
  { key: 'spo2', label: 'SpO₂',  unit: '%',   normal: [95, 100], icon: '🫁' },
  { key: 'pas',  label: 'PA Sis',unit: 'mmHg',normal: [90, 140], icon: '🩺' },
  { key: 'pad',  label: 'PA Dia',unit: 'mmHg',normal: [60, 90],  icon: '🩺' },
  { key: 'temp', label: 'Temp',  unit: '°C',  normal: [36, 37.5],icon: '🌡️' },
  { key: 'fr',   label: 'FR',    unit: 'rpm', normal: [12, 20],  icon: '💨' },
  { key: 'gcs',  label: 'GCS',   unit: '/15', normal: [13, 15],  icon: '🧠' },
  { key: 'fio2', label: 'FiO₂',  unit: '%',   normal: [21, 40],  icon: '💨' },
];

function isAbnormal(key: string, value: number | null) {
  if (value === null) return false;
  const cfg = VITAL_CONFIG.find(v => v.key === key);
  if (!cfg) return false;
  return value < cfg.normal[0] || value > cfg.normal[1];
}

// Simulate live vitals change slightly
function jitter(v: number | null, min: number, max: number) {
  if (v === null) return null;
  return Math.max(min, Math.min(max, Math.round((v + (Math.random() - 0.5) * 4) * 10) / 10));
}

export default function UCIPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<UCIPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAlerta, setFilterAlerta] = useState('TODOS');
  const [filterRespirador, setFilterRespirador] = useState(false);
  const [selected, setSelected] = useState<UCIPatient | null>(null);
  const [liveVitals, setLiveVitals] = useState<Record<string, Record<string, number | null>>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('uci_patients').select('*, patients(first_name,last_name,mrn,blood_type)').eq('activo', true).order('nivel_alerta');
    if (filterAlerta !== 'TODOS') q = q.eq('nivel_alerta', filterAlerta);
    if (filterRespirador) q = q.eq('respirador', true);
    const { data } = await q;
    const list = (data || []) as UCIPatient[];
    setPatients(list);
    // Init live vitals
    const init: Record<string, Record<string, number | null>> = {};
    list.forEach(p => { init[p.id] = { ...p.vitals }; });
    setLiveVitals(init);
    setLoading(false);
  }, [filterAlerta, filterRespirador]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // Live vitals simulation
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLiveVitals(prev => {
        const next: Record<string, Record<string, number | null>> = {};
        Object.entries(prev).forEach(([pid, vitals]) => {
          next[pid] = {
            fc:   jitter(vitals.fc,   40, 180),
            spo2: jitter(vitals.spo2, 70, 100),
            pas:  jitter(vitals.pas,  60, 200),
            pad:  jitter(vitals.pad,  40, 120),
            temp: vitals.temp !== null ? Math.round((vitals.temp + (Math.random() - 0.5) * 0.2) * 10) / 10 : null,
            fr:   jitter(vitals.fr,   8, 40),
            gcs:  vitals.gcs,
            fio2: vitals.fio2,
          };
        });
        return next;
      });
    }, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const inp = { background: '#0B1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 12, outline: 'none' };

  const kpis = {
    total: patients.length,
    criticos: patients.filter(p => p.nivel_alerta === 'CRITICO').length,
    respirador: patients.filter(p => p.respirador).length,
    estables: patients.filter(p => p.nivel_alerta === 'ESTABLE').length,
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="HeartPulse" size={22} style={{ color: '#9C27B0' }} />
            UCI / Cuidados Intensivos
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(244,67,54,0.15)', color: '#F44336', border: '1px solid rgba(244,67,54,0.3)', animation: 'pulse 2s infinite' }}>
              ● LIVE
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Monitoreo en tiempo real de pacientes en cuidados intensivos — constantes vitales actualizadas cada 2s</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Filtros:</label>
          <select value={filterAlerta} onChange={e => setFilterAlerta(e.target.value)} style={{ ...inp, width: 'auto' }}>
            <option value="TODOS">Todos los niveles</option>
            {Object.entries(ALERTA_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button 
            className="btn-ghost" 
            style={{ 
              fontSize: 11, padding: '6px 10px', 
              background: filterAlerta === 'CRITICO' ? 'rgba(244,67,54,0.1)' : 'transparent',
              border: `1px solid ${filterAlerta === 'CRITICO' ? '#F44336' : 'rgba(255,255,255,0.1)'}`,
              color: filterAlerta === 'CRITICO' ? '#F44336' : 'var(--text-muted)'
            }}
            onClick={() => setFilterAlerta(filterAlerta === 'CRITICO' ? 'TODOS' : 'CRITICO')}
          >
            <Icon name="AlertTriangle" size={14} /> Solo críticos
          </button>
          <button 
            className="btn-ghost" 
            style={{ 
              fontSize: 11, padding: '6px 10px', 
              background: filterRespirador ? 'rgba(255,152,0,0.15)' : 'transparent',
              border: `1px solid ${filterRespirador ? '#FF9800' : 'rgba(255,255,255,0.1)'}`,
              color: filterRespirador ? '#FF9800' : 'var(--text-muted)'
            }}
            onClick={() => setFilterRespirador(!filterRespirador)}
          >
            <Icon name="Wind" size={14} /> Solo en Respirador
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pacientes UCI', value: kpis.total, icon: 'Users', color: '#9C27B0' },
          { label: 'Estado Crítico', value: kpis.criticos, icon: 'AlertTriangle', color: '#F44336' },
          { label: 'En Respirador', value: kpis.respirador, icon: 'Wind', color: '#FF9800' },
          { label: 'Estables', value: kpis.estables, icon: 'CheckCircle', color: '#4CAF50' },
        ].map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={k.icon} size={20} style={{ color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Icon name="Loader2" className="animate-spin" size={32} style={{ marginBottom: 12 }} />
          <div>Cargando pacientes UCI...</div>
        </div>
      ) : patients.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon name="HeartPulse" size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No hay pacientes en UCI actualmente</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Los pacientes se mostrarán aquí cuando sean ingresados al módulo UCI</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(580px, 1fr))', gap: 16 }}>
          {patients.map(p => {
            const cfg = ALERTA_CONFIG[p.nivel_alerta] || ALERTA_CONFIG.ESTABLE;
            const vitals = liveVitals[p.id] || p.vitals;
            const diasUCI = Math.floor((Date.now() - new Date(p.ingreso_uci).getTime()) / 86400000);
            return (
              <div key={p.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${cfg.color}30`, boxShadow: p.nivel_alerta === 'CRITICO' ? `0 0 20px ${cfg.color}20` : 'none' }}>
                {/* Card header */}
                <div style={{ padding: '14px 18px', background: cfg.bg, borderBottom: `1px solid ${cfg.color}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="User" size={16} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {p.patients?.first_name} {p.patients?.last_name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        MRN: {p.patients?.mrn} · {p.patients?.blood_type} · Cama: {p.bed_code} · Día UCI: {diasUCI}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.respirador && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,152,0,0.15)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)' }}>
                        💨 RESP. {p.respirador_modo || ''}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40`, letterSpacing: '0.05em' }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Vitals Grid */}
                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {VITAL_CONFIG.map(vc => {
                    const val = vitals[vc.key];
                    const abnormal = isAbnormal(vc.key, val);
                    return (
                      <div key={vc.key} style={{ background: abnormal ? 'rgba(244,67,54,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${abnormal ? 'rgba(244,67,54,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{vc.icon} {vc.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: abnormal ? '#F44336' : '#4CAF50', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                          {val !== null ? val : '—'}
                        </div>
                        <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>{vc.unit}</div>
                        {abnormal && <div style={{ fontSize: 7, color: '#F44336', fontWeight: 700, marginTop: 2 }}>⚠ FUERA DE RANGO</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Diagnosis & notes */}
                {(p.diagnostico_uci || p.notas) && (
                  <div style={{ padding: '0 18px 14px', display: 'flex', gap: 12 }}>
                    {p.diagnostico_uci && (
                      <div style={{ flex: 1, background: 'rgba(156,39,176,0.08)', border: '1px solid rgba(156,39,176,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#9C27B0', marginBottom: 4 }}>DX UCI</div>
                        {p.diagnostico_uci}
                      </div>
                    )}
                    {p.notas && (
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>NOTAS</div>
                        {p.notas}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

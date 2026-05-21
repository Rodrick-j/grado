'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

type TriageLevel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';

type TriageEntry = {
  id: string;
  triage_code: string;
  level: TriageLevel;
  chief_complaint: string;
  arrived_at: string;
  assigned_room: string | null;
  vitals: Record<string, number | null>;
  resolved_at: string | null;
  patients?: { first_name: string; last_name: string; birth_date: string; gender: string; mrn: string } | null;
};

const TRIAGE_CONFIG: Record<TriageLevel, { label: string; color: string; text: string; maxWaitMin: number; description: string }> = {
  RED:    { label: 'Rojo — Inmediato',   color: '#F44336', text: '#FF5252', maxWaitMin: 0,  description: 'Riesgo vital inmediato' },
  ORANGE: { label: 'Naranja — Urgente',  color: '#FF9800', text: '#FFAB40', maxWaitMin: 10, description: 'Condición grave, riesgo potencial' },
  YELLOW: { label: 'Amarillo — Urgente', color: '#FFC107', text: '#FFD740', maxWaitMin: 30, description: 'Urgente, estabilidad mantenida' },
  GREEN:  { label: 'Verde — Menor',      color: '#4CAF50', text: '#69F0AE', maxWaitMin: 120, description: 'Condición no urgente' },
  BLUE:   { label: 'Azul — Sin Urgencia',color: '#1E88E5', text: '#40C4FF', maxWaitMin: 240, description: 'Lesión menor, leve' },
};

export function TriagePage() {
  const supabase = createClient();
  const [queue, setQueue] = useState<TriageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TriageEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', level: 'GREEN' as TriageLevel, chief_complaint: '',
    assigned_room: '', fc: '', spo2: '', pas: '', pad: '', temp: '', fr: ''
  });

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('triage_queue')
      .select('*, patients(first_name,last_name,birth_date,gender,mrn)')
      .is('resolved_at', null)
      .order('arrived_at', { ascending: true });
    setQueue((data || []) as TriageEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    supabase.from('patients').select('id,first_name,last_name,mrn').then(({ data }) => setPatients(data || []));
  }, []);

  const getAge = (dob: string) => {
    if (!dob) return '?';
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  const getWaitMin = (arrivedAt: string) => {
    return Math.floor((Date.now() - new Date(arrivedAt).getTime()) / 60000);
  };

  const handleResolve = async (id: string) => {
    await supabase.from('triage_queue').update({ resolved_at: new Date().toISOString(), disposition: 'ADMITTED' }).eq('id', id);
    setSelected(null);
    fetchQueue();
  };

  const handleCreate = async () => {
    if (!form.patient_id || !form.chief_complaint) return;
    setSaving(true);
    await supabase.from('triage_queue').insert({
      patient_id: form.patient_id,
      level: form.level,
      chief_complaint: form.chief_complaint,
      assigned_room: form.assigned_room || null,
      arrived_at: new Date().toISOString(),
      vitals: {
        fc: form.fc ? Number(form.fc) : null,
        spo2: form.spo2 ? Number(form.spo2) : null,
        pas: form.pas ? Number(form.pas) : null,
        pad: form.pad ? Number(form.pad) : null,
        temp: form.temp ? Number(form.temp) : null,
        fr: form.fr ? Number(form.fr) : null,
        gcs: null,
      }
    });
    setSaving(false);
    setShowModal(false);
    setForm({ patient_id:'',level:'GREEN',chief_complaint:'',assigned_room:'',fc:'',spo2:'',pas:'',pad:'',temp:'',fr:'' });
    fetchQueue();
  };

  const counts = Object.keys(TRIAGE_CONFIG).reduce((acc, k) => {
    acc[k] = queue.filter(p => p.level === k).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="animate-fade-in">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
            <h1 style={{ fontSize:22,fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em' }}>Sala de Emergencias</h1>
            <div style={{ display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:'rgba(244,67,54,0.15)',border:'1px solid rgba(244,67,54,0.3)' }}>
              <div className="live-dot" style={{ background:'#F44336' }} />
              <span style={{ fontSize:11,fontWeight:700,color:'#FF5252' }}>EN VIVO 24/7</span>
            </div>
          </div>
          <p style={{ fontSize:13,color:'var(--text-muted)' }}>
            Sistema Manchester Triage · {queue.length} pacientes en cola
          </p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn-ghost" onClick={fetchQueue}><Icon name="RefreshCw" size={14}/> Actualizar</button>
          <button className="btn-primary" style={{ background:'linear-gradient(135deg,#D32F2F,#B71C1C)' }} onClick={() => setShowModal(true)}>
            <Icon name="Plus" size={14}/> Nuevo Triage
          </button>
        </div>
      </div>

      {/* Nivel Summary */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24 }}>
        {(Object.entries(TRIAGE_CONFIG) as [TriageLevel, typeof TRIAGE_CONFIG[TriageLevel]][]).map(([k, cfg]) => (
          <div key={k} style={{ padding:'14px 16px',background:`${cfg.color}10`,border:`1px solid ${cfg.color}35`,borderTop:`3px solid ${cfg.color}`,borderRadius:10 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
              <span style={{ fontSize:22,fontWeight:900,color:cfg.text }}>{counts[k] ?? 0}</span>
              <div style={{ width:18,height:18,borderRadius:'50%',background:cfg.color }} />
            </div>
            <div style={{ fontSize:12,fontWeight:700,color:cfg.text }}>{k}</div>
            <div style={{ fontSize:10,color:'var(--text-muted)',marginTop:2 }}>{cfg.maxWaitMin === 0 ? 'Inmediato' : `≤ ${cfg.maxWaitMin} min`}</div>
          </div>
        ))}
      </div>

      {/* Cola */}
      {loading ? (
        <div style={{ padding:40,textAlign:'center',color:'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin"/></div>
      ) : queue.length === 0 ? (
        <div className="glass-card" style={{ padding:60,textAlign:'center',color:'var(--text-muted)' }}>
          <Icon name="CheckCircle2" size={40} style={{ opacity:0.3,display:'block',margin:'0 auto 12px' }} />
          <div style={{ fontSize:15,fontWeight:600 }}>Sin pacientes en cola de triage</div>
          <div style={{ fontSize:13,marginTop:6 }}>La sala de emergencias está libre en este momento</div>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {queue.map(p => {
            const cfg = TRIAGE_CONFIG[p.level];
            const vitals = p.vitals || {};
            const waitMin = getWaitMin(p.arrived_at);
            const isUrgent = p.level === 'RED' || p.level === 'ORANGE';
            const age = p.patients ? getAge(p.patients.birth_date) : '?';
            const gender = p.patients?.gender === 'MALE' ? 'M' : p.patients?.gender === 'FEMALE' ? 'F' : '?';
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{ background:'var(--bg-card)',border:`1px solid ${cfg.color}25`,borderLeft:`4px solid ${cfg.color}`,borderRadius:10,padding:'16px 20px',cursor:'pointer',transition:'all 0.15s',display:'grid',gridTemplateColumns:'200px 1fr auto auto',alignItems:'center',gap:24 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--bg-card-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='var(--bg-card)'}>
                <div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text-muted)',marginBottom:4 }}>{p.triage_code}</div>
                  <div style={{ fontSize:14,fontWeight:700,color:'var(--text-primary)',marginBottom:6 }}>
                    {p.patients ? `${p.patients.first_name} ${p.patients.last_name}` : 'Sin identificar'} · {age}a {gender}
                  </div>
                  <span className="badge" style={{ background:`${cfg.color}20`,color:cfg.text,borderColor:`${cfg.color}40` }}>
                    <div style={{ width:6,height:6,borderRadius:'50%',background:cfg.color,display:'inline-block',marginRight:4 }} />
                    {p.level}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize:10,color:'var(--text-muted)',marginBottom:3 }}>MOTIVO DE CONSULTA</div>
                  <div style={{ fontSize:13,color:isUrgent?'var(--text-primary)':'var(--text-secondary)',fontWeight:isUrgent?600:400 }}>{p.chief_complaint}</div>
                  <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:3 }}>{p.assigned_room || 'Sala espera'}</div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(5,auto)',gap:8 }}>
                  {[
                    { label:'FC',value:vitals.fc,unit:'bpm',alert:(vitals.fc??0)>100||(vitals.fc??999)<60 },
                    { label:'SpO2',value:vitals.spo2,unit:'%',alert:(vitals.spo2??100)<94 },
                    { label:'PA',value:vitals.pas&&vitals.pad?`${vitals.pas}/${vitals.pad}`:null,unit:'mmHg',alert:false },
                    { label:'T°',value:vitals.temp,unit:'°C',alert:(vitals.temp??0)>38 },
                    { label:'FR',value:vitals.fr,unit:'/min',alert:(vitals.fr??0)>20 },
                  ].map(v => (
                    <div key={v.label} style={{ textAlign:'center',background:v.alert?'rgba(244,67,54,0.08)':'var(--bg-surface)',border:`1px solid ${v.alert?'rgba(244,67,54,0.25)':'var(--border-secondary)'}`,borderRadius:6,padding:'6px 8px' }}>
                      <div style={{ fontSize:12,fontWeight:700,color:v.alert?'#FF5252':'var(--text-primary)' }}>{v.value ?? '—'}</div>
                      <div style={{ fontSize:9,color:'var(--text-muted)' }}>{v.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign:'center',minWidth:70 }}>
                  <div style={{ fontSize:20,fontWeight:800,color:waitMin===0?'#FF5252':cfg.text }}>
                    {waitMin < 1 ? '⚡' : `${waitMin}m`}
                  </div>
                  <div style={{ fontSize:10,color:'var(--text-muted)' }}>en espera</div>
                </div>
              </div>
            );
          })}
      </div>
      )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position:'fixed',inset:0,background:'rgba(6,13,26,0.9)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',border:`1px solid ${TRIAGE_CONFIG[selected.level].color}40`,borderTop:`3px solid ${TRIAGE_CONFIG[selected.level].color}`,borderRadius:16,padding:28,maxWidth:520,width:'100%' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text-muted)',marginBottom:4 }}>{selected.triage_code}</div>
                <h2 style={{ fontSize:18,fontWeight:800,color:'var(--text-primary)' }}>
                  {selected.patients ? `${selected.patients.first_name} ${selected.patients.last_name}` : 'Sin identificar'}
                </h2>
                <span style={{ fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:4,background:`${TRIAGE_CONFIG[selected.level].color}20`,color:TRIAGE_CONFIG[selected.level].text }}>
                  {selected.level} — {TRIAGE_CONFIG[selected.level].description}
                </span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={20}/></button>
            </div>
            <div style={{ background:'var(--bg-surface)',borderRadius:8,padding:12,marginBottom:16 }}>
              <div style={{ fontSize:10,color:'var(--text-muted)',marginBottom:4 }}>MOTIVO DE CONSULTA</div>
              <div style={{ fontSize:13,color:'var(--text-primary)',fontWeight:500 }}>{selected.chief_complaint}</div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:16 }}>
              {[
                { label:'FC',value:`${selected.vitals.fc??'—'} bpm`,alert:(selected.vitals.fc??0)>100 },
                { label:'SpO2',value:`${selected.vitals.spo2??'—'}%`,alert:(selected.vitals.spo2??100)<94 },
                { label:'P.A.',value:selected.vitals.pas?`${selected.vitals.pas}/${selected.vitals.pad}`:'—',alert:false },
                { label:'Temp.',value:`${selected.vitals.temp??'—'}°C`,alert:(selected.vitals.temp??0)>38 },
                { label:'FR',value:`${selected.vitals.fr??'—'}/min`,alert:(selected.vitals.fr??0)>20 },
              ].map(v => (
                <div key={v.label} style={{ textAlign:'center',background:v.alert?'rgba(244,67,54,0.1)':'var(--bg-elevated)',border:`1px solid ${v.alert?'rgba(244,67,54,0.3)':'var(--border-secondary)'}`,borderRadius:8,padding:'10px 6px' }}>
                  <div style={{ fontSize:14,fontWeight:800,color:v.alert?'#FF5252':'var(--text-primary)' }}>{v.value}</div>
                  <div style={{ fontSize:10,color:'var(--text-muted)' }}>{v.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn-primary" style={{ flex:1,background:'linear-gradient(135deg,#D32F2F,#B71C1C)' }}>
                <Icon name="FileText" size={13}/> Abrir Historia Clínica
              </button>
              <button className="btn-ghost" style={{ flex:1 }} onClick={() => handleResolve(selected.id)}>
                <Icon name="CheckCircle2" size={13}/> Resolver / Admitir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo Triage Modal */}
      {showModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16 }}>
          <div className="glass-card animate-fade-in" style={{ padding:24,width:'100%',maxWidth:500 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
              <h3 style={{ fontSize:16,fontWeight:800,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8 }}>
                <Icon name="Siren" size={18} style={{ color:'#F44336' }}/> Registrar Nuevo Triage
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Paciente *</label>
                <select className="input-field" value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})}>
                  <option value="">Seleccionar paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</option>)}
                </select>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Nivel Triage *</label>
                  <select className="input-field" value={form.level} onChange={e => setForm({...form,level:e.target.value as TriageLevel})}>
                    {Object.entries(TRIAGE_CONFIG).map(([k,v]) => <option key={k} value={k}>{k} — {v.description}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Sala / Box</label>
                  <input className="input-field" value={form.assigned_room} onChange={e => setForm({...form,assigned_room:e.target.value})} placeholder="ER-001" />
                </div>
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Motivo de Consulta *</label>
                <textarea className="input-field" style={{ height:80,resize:'vertical' }} value={form.chief_complaint} onChange={e => setForm({...form,chief_complaint:e.target.value})} placeholder="Describa el motivo de consulta..." />
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:8 }}>Signos Vitales</label>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                  {[{key:'fc',label:'FC (bpm)'},{key:'spo2',label:'SpO₂ (%)'},{key:'pas',label:'PA Sis.'},{key:'pad',label:'PA Dia.'},{key:'temp',label:'Temp (°C)'},{key:'fr',label:'FR (/min)'}].map(v => (
                    <div key={v.key}>
                      <label style={{ fontSize:10,color:'var(--text-muted)',display:'block',marginBottom:3 }}>{v.label}</label>
                      <input type="number" className="input-field" style={{ padding:'6px 10px' }} value={(form as any)[v.key]} onChange={e => setForm({...form,[v.key]:e.target.value})} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:'flex',gap:8,marginTop:20,justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={handleCreate} style={{ background:'linear-gradient(135deg,#D32F2F,#B71C1C)' }}>
                {saving ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Siren" size={14}/>}
                {saving ? 'Registrando...' : 'Registrar Triage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

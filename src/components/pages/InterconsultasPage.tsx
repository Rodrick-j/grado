'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

type Interconsult = {
  id: string;
  reason: string;
  clinical_context: string | null;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  response_notes: string | null;
  created_at: string;
  responded_at: string | null;
  patients?: { first_name: string; last_name: string; mrn: string } | null;
  from_prof?: { title: string; user_profiles: { full_name: string } } | null;
  to_spec?: { name: string; color: string } | null;
  to_prof?: { title: string; user_profiles: { full_name: string } } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Pendiente',   color: '#FF9800' },
  ACCEPTED:    { label: 'Aceptada',    color: '#4CAF50' },
  IN_PROGRESS: { label: 'En Proceso',  color: '#1E88E5' },
  COMPLETED:   { label: 'Completada',  color: '#607D8B' },
  REJECTED:    { label: 'Rechazada',   color: '#F44336' },
};

export function InterconsultasPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Interconsult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '', from_professional: '', to_specialty_id: '', to_professional_id: '',
    reason: '', clinical_context: '', priority: 'ROUTINE'
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('interconsults')
      .select(`*,
        patients(first_name,last_name,mrn),
        from_prof:professionals!from_professional(title,user_profiles(full_name)),
        to_spec:specialties!to_specialty_id(name,color),
        to_prof:professionals!to_professional_id(title,user_profiles(full_name))
      `)
      .order('created_at', { ascending: false });
    setItems((data || []) as Interconsult[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    supabase.from('patients').select('id,first_name,last_name,mrn').then(({ data }) => setPatients(data || []));
    supabase.from('professionals').select('id,title,user_profiles(full_name)').then(({ data }) => setProfessionals(data || []));
    supabase.from('specialties').select('id,name').then(({ data }) => setSpecialties(data || []));
  }, []);

  const handleCreate = async () => {
    if (!form.patient_id || !form.from_professional || !form.to_specialty_id || !form.reason) return;
    setSaving(true);
    await supabase.from('interconsults').insert({
      patient_id: form.patient_id,
      from_professional: form.from_professional,
      to_specialty_id: form.to_specialty_id,
      to_professional_id: form.to_professional_id || null,
      reason: form.reason,
      clinical_context: form.clinical_context || null,
      priority: form.priority,
    });
    setSaving(false);
    setShowModal(false);
    setForm({ patient_id:'',from_professional:'',to_specialty_id:'',to_professional_id:'',reason:'',clinical_context:'',priority:'ROUTINE' });
    fetchItems();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase.from('interconsults').update({ status }).eq('id', id);
    fetchItems();
  };

  const handleRespond = async (id: string) => {
    await supabase.from('interconsults').update({
      status: 'COMPLETED',
      response_notes: responseText,
      responded_at: new Date().toISOString(),
    }).eq('id', id);
    setRespondingId(null);
    setResponseText('');
    fetchItems();
  };

  const kpis = {
    total: items.length,
    pending: items.filter(i => i.status === 'PENDING').length,
    stat: items.filter(i => i.priority === 'STAT').length,
    completed: items.filter(i => i.status === 'COMPLETED').length,
  };

  return (
    <>
      <div className="animate-fade-in">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em' }}>Interconsultas</h1>
          <p style={{ fontSize:13,color:'var(--text-muted)',marginTop:4 }}>Referidos internos entre especialidades · Mensajería clínica segura</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Icon name="Plus" size={14}/> Nueva Interconsulta</button>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24 }}>
        {[
          { label:'Total',value:kpis.total,color:'#1E88E5',icon:'MessageSquare' },
          { label:'Pendientes',value:kpis.pending,color:'#FF9800',icon:'Clock' },
          { label:'STAT (urgentes)',value:kpis.stat,color:'#F44336',icon:'Siren' },
          { label:'Completadas',value:kpis.completed,color:'#4CAF50',icon:'CheckCircle2' },
        ].map(c => (
          <div key={c.label} className="metric-card" style={{ padding:16 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:38,height:38,borderRadius:10,background:`${c.color}18`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <Icon name={c.icon} size={16} style={{ color:c.color }} />
              </div>
              <div><div style={{ fontSize:22,fontWeight:800,color:c.color }}>{c.value}</div><div style={{ fontSize:11,color:'var(--text-muted)' }}>{c.label}</div></div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding:40,textAlign:'center',color:'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin"/></div>
      ) : items.length === 0 ? (
        <div className="glass-card" style={{ padding:60,textAlign:'center',color:'var(--text-muted)' }}>
          <Icon name="MessageSquare" size={40} style={{ opacity:0.3,display:'block',margin:'0 auto 12px' }} />
          <div style={{ fontSize:15,fontWeight:600 }}>No hay interconsultas registradas</div>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {items.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
            const fromName = r.from_prof ? `${r.from_prof.title} ${r.from_prof.user_profiles?.full_name}` : '—';
            const toName = r.to_prof ? `${r.to_prof.title} ${r.to_prof.user_profiles?.full_name}` : (r.to_spec?.name || '—');
            return (
              <div key={r.id} style={{ background:'var(--bg-card)',border:`1px solid ${r.priority==='STAT'?'rgba(244,67,54,0.3)':'var(--border-primary)'}`,borderRadius:12,padding:20 }}>
                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
                  <div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                      <span className="badge" style={{ background:r.priority==='STAT'?'rgba(244,67,54,0.15)':r.priority==='URGENT'?'rgba(255,152,0,0.15)':'rgba(74,96,128,0.15)',color:r.priority==='STAT'?'#FF5252':r.priority==='URGENT'?'#FFAB40':'var(--text-muted)',borderColor:'transparent' }}>{r.priority}</span>
                      <span className="badge" style={{ background:`${sc.color}15`,color:sc.color,borderColor:`${sc.color}30` }}>{sc.label}</span>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <span style={{ fontSize:13,fontWeight:600,color:'var(--text-secondary)' }}>{fromName}</span>
                      <Icon name="ArrowRight" size={14} style={{ color:'var(--text-muted)' }} />
                      <span style={{ fontSize:13,fontWeight:700,color:'var(--color-blue-light)' }}>{toName}</span>
                    </div>
                    <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>
                      Paciente: {r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : '—'} · {new Date(r.created_at).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}
                    </div>
                  </div>
                </div>
                <div style={{ background:'var(--bg-surface)',borderRadius:8,padding:12,marginBottom:12 }}>
                  <div style={{ fontSize:10,color:'var(--text-muted)',marginBottom:4,fontWeight:600,letterSpacing:'0.08em' }}>MOTIVO DE INTERCONSULTA</div>
                  <p style={{ fontSize:12,color:'var(--text-secondary)',lineHeight:1.6 }}>{r.reason}</p>
                  {r.clinical_context && <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:6,lineHeight:1.5 }}><strong>Contexto:</strong> {r.clinical_context}</p>}
                </div>
                {r.response_notes && (
                  <div style={{ background:'rgba(76,175,80,0.08)',border:'1px solid rgba(76,175,80,0.2)',borderRadius:8,padding:10,marginBottom:12 }}>
                    <div style={{ fontSize:10,color:'#4CAF50',marginBottom:4,fontWeight:700 }}>RESPUESTA</div>
                    <p style={{ fontSize:12,color:'var(--text-secondary)' }}>{r.response_notes}</p>
                  </div>
                )}
                {respondingId === r.id ? (
                  <div>
                    <textarea className="input-field" style={{ height:80,resize:'vertical',marginBottom:8 }} value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Escriba la respuesta clínica..." />
                    <div style={{ display:'flex',gap:8 }}>
                      <button className="btn-primary" style={{ background:'#4CAF50' }} onClick={() => handleRespond(r.id)}><Icon name="Check" size={13}/> Guardar Respuesta</button>
                      <button className="btn-ghost" onClick={() => setRespondingId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex',gap:8 }}>
                    {r.status === 'PENDING' && <button className="btn-primary" style={{ fontSize:12 }} onClick={() => handleUpdateStatus(r.id,'ACCEPTED')}><Icon name="Check" size={13}/> Aceptar</button>}
                    {(r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS') && <button className="btn-ghost" style={{ fontSize:12 }} onClick={() => { setRespondingId(r.id); setResponseText(''); }}><Icon name="MessageSquare" size={13}/> Responder</button>}
                    {r.status === 'PENDING' && <button className="btn-ghost" style={{ fontSize:12,color:'#F44336',borderColor:'rgba(244,67,54,0.3)' }} onClick={() => handleUpdateStatus(r.id,'REJECTED')}><Icon name="X" size={13}/> Rechazar</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {showModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16 }}>
          <div className="glass-card animate-fade-in" style={{ padding:24,width:'100%',maxWidth:520 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
              <h3 style={{ fontSize:16,fontWeight:800,color:'var(--text-primary)' }}>Nueva Interconsulta</h3>
              <button onClick={() => setShowModal(false)} style={{ background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Paciente *</label>
                <select className="input-field" value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})}>
                  <option value="">Seleccionar paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</option>)}
                </select>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Médico Solicitante *</label>
                  <select className="input-field" value={form.from_professional} onChange={e => setForm({...form,from_professional:e.target.value})}>
                    <option value="">Seleccionar</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.title} {p.user_profiles?.full_name}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Especialidad Destino *</label>
                  <select className="input-field" value={form.to_specialty_id} onChange={e => setForm({...form,to_specialty_id:e.target.value})}>
                    <option value="">Seleccionar</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Médico Destino (opcional)</label>
                  <select className="input-field" value={form.to_professional_id} onChange={e => setForm({...form,to_professional_id:e.target.value})}>
                    <option value="">Sin especificar</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.title} {p.user_profiles?.full_name}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Prioridad</label>
                  <select className="input-field" value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}>
                    <option value="ROUTINE">Rutina</option>
                    <option value="URGENT">Urgente</option>
                    <option value="STAT">STAT (Inmediato)</option>
                  </select>
                </div>
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Motivo *</label>
                <textarea className="input-field" style={{ height:80,resize:'vertical' }} value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} placeholder="Describa el motivo de la interconsulta..." />
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Contexto Clínico</label>
                <textarea className="input-field" style={{ height:60,resize:'vertical' }} value={form.clinical_context} onChange={e => setForm({...form,clinical_context:e.target.value})} placeholder="Historia clínica relevante, estudios previos..." />
              </div>
            </div>
            <div style={{ display:'flex',gap:8,marginTop:20,justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={handleCreate}>
                {saving ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Send" size={14}/>}
                {saving ? 'Enviando...' : 'Enviar Interconsulta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

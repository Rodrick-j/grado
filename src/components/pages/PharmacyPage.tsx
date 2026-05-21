'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

type Drug = {
  id: string; drug_code: string; drug_name: string; generic_name: string | null;
  category: string | null; controlled: boolean; unit: string;
  stock_current: number; stock_minimum: number; unit_cost: number | null;
  supplier: string | null; batch_number: string | null; expiry_date: string | null;
  active: boolean; updated_at: string;
};

type DispLog = {
  id: string; quantity_dispensed: number; dispensed_at: string; notes: string | null;
  patients?: { first_name: string; last_name: string } | null;
  inventory?: { drug_name: string; unit: string } | null;
  user_profiles?: { full_name: string } | null;
};

function getStockStatus(current: number, min: number): { label: string; color: string } {
  if (current === 0) return { label: 'AGOTADO', color: '#F44336' };
  if (current < min * 0.5) return { label: 'CRÍTICO', color: '#F44336' };
  if (current < min) return { label: 'Bajo', color: '#FF9800' };
  return { label: 'Normal', color: '#4CAF50' };
}

export function PharmacyPage() {
  const supabase = createClient();
  const [inventory, setInventory] = useState<Drug[]>([]);
  const [dispLog, setDispLog] = useState<DispLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inventory' | 'dispensing' | 'add'>('inventory');
  const [search, setSearch] = useState('');
  const [showDispModal, setShowDispModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id:'', inventory_id:'', quantity_dispensed:'1', notes:'' });
  // Add stock form
  const [addForm, setAddForm] = useState({ drug_code:'',drug_name:'',generic_name:'',category:'',unit:'comp',stock_current:'0',stock_minimum:'10',unit_cost:'',supplier:'',batch_number:'',expiry_date:'',controlled:false });
  const [addSaving, setAddSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('pharmacy_inventory').select('*').eq('active', true).order('drug_name');
    setInventory((data || []) as Drug[]);
    setLoading(false);
  }, []);

  const fetchDispLog = useCallback(async () => {
    const { data } = await supabase
      .from('dispensing_log')
      .select('*, patients(first_name,last_name), inventory:pharmacy_inventory(drug_name,unit), user_profiles!pharmacist_id(full_name)')
      .order('dispensed_at', { ascending: false })
      .limit(30);
    setDispLog((data || []) as DispLog[]);
  }, []);

  useEffect(() => { fetchInventory(); fetchDispLog(); }, [fetchInventory, fetchDispLog]);
  useEffect(() => { supabase.from('patients').select('id,first_name,last_name,mrn').then(({ data }) => setPatients(data || [])); }, []);

  const handleDispensar = async () => {
    if (!form.patient_id || !form.inventory_id || !form.quantity_dispensed) return;
    setSaving(true);
    // Update stock
    const drug = inventory.find(d => d.id === form.inventory_id);
    if (drug) {
      await supabase.from('pharmacy_inventory').update({ stock_current: Math.max(0, drug.stock_current - parseInt(form.quantity_dispensed)) }).eq('id', form.inventory_id);
    }
    // Insert dispensing log
    const { data: prof } = await supabase.from('professionals').select('user_id').limit(1).single();
    const { data: dispData } = await supabase.from('dispensing_log').insert({
      patient_id: form.patient_id,
      inventory_id: form.inventory_id,
      quantity_dispensed: parseInt(form.quantity_dispensed),
      pharmacist_id: prof?.user_id || null,
      notes: form.notes || null,
    }).select().single();

    // Insert patient charge for billing
    if (drug && drug.unit_cost && dispData) {
      await supabase.from('patient_charges').insert({
        patient_id: form.patient_id,
        source_type: 'PHARMACY',
        source_id: dispData.id,
        description: `${drug.drug_name} x${form.quantity_dispensed}`,
        amount: Number(drug.unit_cost) * parseInt(form.quantity_dispensed)
      });
    }

    setSaving(false);
    setShowDispModal(false);
    setForm({ patient_id:'',inventory_id:'',quantity_dispensed:'1',notes:'' });
    fetchInventory();
    fetchDispLog();
  };

  const handleAddDrug = async () => {
    if (!addForm.drug_code || !addForm.drug_name || !addForm.unit) return;
    setAddSaving(true);
    await supabase.from('pharmacy_inventory').insert({
      drug_code: addForm.drug_code,
      drug_name: addForm.drug_name,
      generic_name: addForm.generic_name || null,
      category: addForm.category || null,
      controlled: addForm.controlled,
      unit: addForm.unit,
      stock_current: parseInt(addForm.stock_current) || 0,
      stock_minimum: parseInt(addForm.stock_minimum) || 10,
      unit_cost: addForm.unit_cost ? parseFloat(addForm.unit_cost) : null,
      supplier: addForm.supplier || null,
      batch_number: addForm.batch_number || null,
      expiry_date: addForm.expiry_date || null,
    });
    setAddSaving(false);
    setTab('inventory');
    setAddForm({ drug_code:'',drug_name:'',generic_name:'',category:'',unit:'comp',stock_current:'0',stock_minimum:'10',unit_cost:'',supplier:'',batch_number:'',expiry_date:'',controlled:false });
    fetchInventory();
  };

  // Advanced Filters State
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCritical, setFilterCritical] = useState(false);
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [filterControlled, setFilterControlled] = useState(false);

  // Pending filter state
  const [pendingCategory, setPendingCategory] = useState('');
  const [pendingCritical, setPendingCritical] = useState(false);
  const [pendingExpiring, setPendingExpiring] = useState(false);
  const [pendingControlled, setPendingControlled] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');

  const uniqueCategories = Array.from(new Set(inventory.map(d => d.category).filter(Boolean))) as string[];

  const applyFilters = () => {
    setFilterCategory(pendingCategory);
    setFilterCritical(pendingCritical);
    setFilterExpiring(pendingExpiring);
    setFilterControlled(pendingControlled);
    setSearch(pendingSearch);
  };

  const clearFilters = () => {
    setPendingCategory(''); setPendingCritical(false); setPendingExpiring(false); setPendingControlled(false); setPendingSearch('');
    setFilterCategory(''); setFilterCritical(false); setFilterExpiring(false); setFilterControlled(false); setSearch('');
  };

  const filteredInventory = inventory.filter(d => {
    const matchesSearch = !search || d.drug_name.toLowerCase().includes(search.toLowerCase()) || d.drug_code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || d.category === filterCategory;
    const matchesCritical = !filterCritical || d.stock_current < d.stock_minimum;
    const matchesExpiring = !filterExpiring || (d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30 * 24 * 3600000));
    const matchesControlled = !filterControlled || d.controlled;
    return matchesSearch && matchesCategory && matchesCritical && matchesExpiring && matchesControlled;
  });

  const kpis = {
    total: inventory.length,
    critical: inventory.filter(d => d.stock_current < d.stock_minimum * 0.5).length,
    expiring: inventory.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30*24*3600000)).length,
    dispensedToday: dispLog.filter(d => new Date(d.dispensed_at).toDateString() === new Date().toDateString()).length,
  };

  const inp = { background:'#0B1628',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'white',padding:'8px 12px',fontSize:12,outline:'none',fontFamily:'Inter, sans-serif' };

  return (
    <>
      <div className="animate-fade-in">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em' }}>Farmacia &amp; Inventario</h1>
          <p style={{ fontSize:13,color:'var(--text-muted)',marginTop:4 }}>Control de stock · Dispensación · Alertas de vencimiento · Trazabilidad</p>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button className="btn-ghost" onClick={() => setTab('add')}><Icon name="PackagePlus" size={14}/> Nuevo Medicamento</button>
          <button className="btn-primary" onClick={() => setShowDispModal(true)}><Icon name="Pill" size={14}/> Dispensar</button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24 }}>
        {[
          { label:'Medicamentos activos',value:kpis.total,icon:'Pill',color:'#1E88E5' },
          { label:'Alertas de Stock',value:kpis.critical,icon:'AlertTriangle',color:'#F44336' },
          { label:'Por Vencer (30d)',value:kpis.expiring,icon:'Clock',color:'#FF9800' },
          { label:'Dispensaciones hoy',value:kpis.dispensedToday,icon:'CheckCircle2',color:'#4CAF50' },
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

      <div className="tab-bar" style={{ marginBottom:16,width:'fit-content' }}>
        {[{id:'inventory',label:'Inventario'},{id:'dispensing',label:'Log Dispensaciones'},{id:'add',label:'Agregar Medicamento'}].map(t => (
          <div key={t.id} className={`tab-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id as typeof tab)}>{t.label}</div>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div style={{ marginBottom:14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position:'relative', flex: 1 }}>
              <Icon name="Search" size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none' }} />
              <input className="input-field" style={{ paddingLeft:36, width: '100%' }} placeholder="Buscar por código o nombre..." value={pendingSearch} onChange={e => {setPendingSearch(e.target.value); setSearch(e.target.value);}} />
            </div>
            <button className="btn-ghost" onClick={() => setFiltersOpen(!filtersOpen)} style={{ gap: 6, whiteSpace: 'nowrap' }}>
              <Icon name="SlidersHorizontal" size={14} />
              Filtros {filtersOpen ? '▲' : '▼'}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {filtersOpen && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-secondary)',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 16,
              animation: 'fade-in 0.2s ease'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Categoría</label>
                  <select className="input-field" value={pendingCategory} onChange={e => setPendingCategory(e.target.value)}>
                    <option value="">Todas</option>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="crit-stock" checked={pendingCritical} onChange={e => setPendingCritical(e.target.checked)} style={{ width: 15, height: 15 }} />
                  <label htmlFor="crit-stock" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Solo stock crítico</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="exp-stock" checked={pendingExpiring} onChange={e => setPendingExpiring(e.target.checked)} style={{ width: 15, height: 15 }} />
                  <label htmlFor="exp-stock" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Vence en &lt;30 días</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="ctrl-stock" checked={pendingControlled} onChange={e => setPendingControlled(e.target.checked)} style={{ width: 15, height: 15 }} />
                  <label htmlFor="ctrl-stock" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Solo controlados</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn-primary" onClick={applyFilters}>Aplicar</button>
                <button className="btn-ghost" onClick={clearFilters}>Limpiar</button>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  Mostrando {filteredInventory.length} de {inventory.length} resultados
                </span>
              </div>
            </div>
          )}
          <div className="glass-card" style={{ overflow:'hidden' }}>
            {loading ? <div style={{ padding:40,textAlign:'center',color:'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin"/></div> : (
              <table className="data-table">
                <thead><tr><th>Código</th><th>Medicamento</th><th>Categoría</th><th>Stock Actual</th><th>Stock Mín.</th><th>Vencimiento</th><th>Proveedor</th><th>Estado</th></tr></thead>
                <tbody>
                  {filteredInventory.map(d => {
                    const st = getStockStatus(d.stock_current, d.stock_minimum);
                    return (
                      <tr key={d.id}>
                        <td><span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--color-teal)' }}>{d.drug_code}</span></td>
                        <td>
                          <div style={{ fontWeight:600 }}>{d.drug_name}</div>
                          <div style={{ fontSize:10,color:'var(--text-muted)' }}>{d.generic_name || ''}{d.controlled?' 🔒 CONTROLADO':''}</div>
                        </td>
                        <td><span style={{ fontSize:11,color:'var(--text-secondary)' }}>{d.category || '—'}</span></td>
                        <td>
                          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                            <span style={{ fontSize:16,fontWeight:800,color:st.color }}>{d.stock_current}</span>
                            <span style={{ fontSize:10,color:'var(--text-muted)' }}>{d.unit}</span>
                          </div>
                          <div style={{ width:80,height:4,background:'rgba(255,255,255,0.1)',borderRadius:2,marginTop:4 }}>
                            <div style={{ width:`${Math.min(100,(d.stock_current/d.stock_minimum)*100)}%`,height:'100%',background:st.color,borderRadius:2 }} />
                          </div>
                        </td>
                        <td><span style={{ fontSize:12 }}>{d.stock_minimum} {d.unit}</span></td>
                        <td><span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,color:d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+30*24*3600000)?'#FF9800':'var(--text-muted)' }}>{d.expiry_date||'—'}</span></td>
                        <td><span style={{ fontSize:11,color:'var(--text-muted)' }}>{d.supplier||'—'}</span></td>
                        <td><span className="badge" style={{ background:`${st.color}15`,color:st.color,borderColor:`${st.color}30` }}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length===0 && <tr><td colSpan={8} style={{ textAlign:'center',padding:40,color:'var(--text-muted)' }}>No se encontraron medicamentos</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'dispensing' && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {dispLog.length === 0 ? (
            <div className="glass-card" style={{ padding:60,textAlign:'center',color:'var(--text-muted)' }}>
              <Icon name="ClipboardList" size={40} style={{ opacity:0.3,display:'block',margin:'0 auto 12px' }} />
              <div style={{ fontSize:15,fontWeight:600 }}>No hay dispensaciones registradas</div>
            </div>
          ) : dispLog.map(d => (
            <div key={d.id} className="glass-card" style={{ padding:14 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                <span style={{ fontWeight:700,color:'var(--text-primary)' }}>{d.inventory?.drug_name||'—'}</span>
                <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--text-muted)' }}>{new Date(d.dispensed_at).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}</span>
              </div>
              <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:6 }}>
                Paciente: {d.patients?`${d.patients.first_name} ${d.patients.last_name}`:'—'} · {d.quantity_dispensed} {d.inventory?.unit||'u'}
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-muted)' }}>
                <span>Farmacéutico: {d.user_profiles?.full_name||'—'}</span>
                {d.notes && <span>{d.notes}</span>}
              </div>
            </div>
          ))}
          <div style={{ padding:12,background:'rgba(30,136,229,0.06)',border:'1px solid rgba(30,136,229,0.15)',borderRadius:8 }}>
            <div style={{ fontSize:11,color:'var(--text-muted)',display:'flex',gap:8,alignItems:'flex-start' }}>
              <Icon name="ShieldCheck" size={13} style={{ color:'var(--color-teal)',marginTop:1 }} />
              <span>Toda dispensación queda auditada: timestamp, usuario, medicamento y paciente. Inmutable por regulación HIPAA.</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'add' && (
        <div className="glass-card" style={{ padding:24,maxWidth:700 }}>
          <h2 style={{ fontSize:16,fontWeight:700,color:'var(--text-primary)',marginBottom:20 }}>Agregar Nuevo Medicamento al Inventario</h2>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            {[{key:'drug_code',label:'Código (Ej: MED-00421) *'},{key:'drug_name',label:'Nombre Comercial *'},{key:'generic_name',label:'Nombre Genérico'},{key:'category',label:'Categoría'},{key:'supplier',label:'Proveedor'},{key:'batch_number',label:'Nro. de Lote'}].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>{f.label}</label>
                <input className="input-field" value={(addForm as any)[f.key]} onChange={e => setAddForm({...addForm,[f.key]:e.target.value})} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Unidad *</label>
              <select className="input-field" value={addForm.unit} onChange={e => setAddForm({...addForm,unit:e.target.value})}>
                {['comp','cap','amp','vial','sobre','frasco','mg','mL','L'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Fecha de Vencimiento</label>
              <input type="date" className="input-field" value={addForm.expiry_date} onChange={e => setAddForm({...addForm,expiry_date:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Stock Inicial</label>
              <input type="number" className="input-field" value={addForm.stock_current} onChange={e => setAddForm({...addForm,stock_current:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Stock Mínimo</label>
              <input type="number" className="input-field" value={addForm.stock_minimum} onChange={e => setAddForm({...addForm,stock_minimum:e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Costo Unitario (Bs.)</label>
              <input type="number" step="0.01" className="input-field" value={addForm.unit_cost} onChange={e => setAddForm({...addForm,unit_cost:e.target.value})} />
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:10,paddingTop:20 }}>
              <input type="checkbox" id="controlled" checked={addForm.controlled} onChange={e => setAddForm({...addForm,controlled:e.target.checked})} style={{ width:16,height:16 }} />
              <label htmlFor="controlled" style={{ fontSize:12,fontWeight:600,color:'var(--text-secondary)',cursor:'pointer' }}>🔒 Medicamento Controlado</label>
            </div>
          </div>
          <div style={{ display:'flex',gap:8,marginTop:20 }}>
            <button className="btn-primary" disabled={addSaving} onClick={handleAddDrug}>
              {addSaving ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="PackagePlus" size={14}/>}
              {addSaving ? 'Guardando...' : 'Agregar al Inventario'}
            </button>
            <button className="btn-ghost" onClick={() => setTab('inventory')}>Cancelar</button>
          </div>
        </div>
      )}
      </div>

      {showDispModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:9999,padding:24,overflowY:'auto',paddingTop:'8vh' }}>
          <div className="glass-card animate-fade-in" style={{ padding:24,width:'100%',maxWidth:460,marginBottom:'8vh' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
              <h3 style={{ fontSize:16,fontWeight:800,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8 }}>
                <Icon name="Pill" size={18} style={{ color:'#4CAF50' }}/> Dispensar Medicamento
              </h3>
              <button onClick={() => setShowDispModal(false)} style={{ background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Paciente *</label>
                <select className="input-field" value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})}>
                  <option value="">Seleccionar paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Medicamento *</label>
                <select className="input-field" value={form.inventory_id} onChange={e => setForm({...form,inventory_id:e.target.value})}>
                  <option value="">Seleccionar medicamento</option>
                  {inventory.map(d => <option key={d.id} value={d.id}>{d.drug_name} (Stock: {d.stock_current} {d.unit})</option>)}
                </select>
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Cantidad a Dispensar *</label>
                <input type="number" min="1" className="input-field" value={form.quantity_dispensed} onChange={e => setForm({...form,quantity_dispensed:e.target.value})} />
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Notas</label>
                <input className="input-field" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Indicaciones adicionales..." />
              </div>
            </div>
            <div style={{ display:'flex',gap:8,marginTop:20,justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowDispModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={handleDispensar} style={{ background:'#4CAF50' }}>
                {saving ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Check" size={14}/>}
                {saving ? 'Dispensando...' : 'Confirmar Dispensación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

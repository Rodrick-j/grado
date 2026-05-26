'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import imageCompression from 'browser-image-compression';
import * as XLSX from 'xlsx';

type Drug = {
  product_id: string; drug_code: string; drug_name: string; generic_name: string | null;
  category: string | null; requires_prescription: boolean; unit: string;
  total_stock: number; stock_minimum: number; 
  supplier: string | null; status: string; is_low_stock: boolean;
  brand_name: string | null; presentation: string | null;
  therapeutic_action: string | null; symptoms_indications: string | null;
  target_age_group: string | null; image_url: string | null;
};

type Lot = {
  id: string; product_id: string; batch_code: string; expiry_date: string | null;
  stock_current: number; status: string; status_color?: string; location_id?: string;
};

type DispLog = {
  id: string; quantity_dispensed: number; dispensed_at: string; notes: string | null;
  patients?: { first_name: string; last_name: string } | null;
  lot?: { batch_code: string; product?: { drug_name: string; unit: string } } | null;
  user_profiles?: { full_name: string } | null;
};

function getStockStatus(current: number, min: number, status: string): { label: string; color: string } {
  if (status === 'SUSPENDIDO') return { label: 'SUSPENDIDO', color: '#9C27B0' };
  if (current === 0) return { label: 'AGOTADO', color: '#F44336' };
  if (current < min * 0.5) return { label: 'CRÍTICO', color: '#F44336' };
  if (current < min) return { label: 'Bajo', color: '#FF9800' };
  return { label: 'Normal', color: '#4CAF50' };
}

export function PharmacyPage() {
  const supabase = createClient();
  const [inventory, setInventory] = useState<Drug[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dispLog, setDispLog] = useState<DispLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inventory' | 'dispensing' | 'add' | 'lots'>('inventory');
  
  // Advanced Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterAge, setFilterAge] = useState('');
  
  // Dispensing Modal
  const [showDispModal, setShowDispModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id:'', product_id:'', quantity_dispensed:'1', notes:'' });
  
  // Lots View Modal
  const [showLotsModal, setShowLotsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Drug | null>(null);
  const [productLots, setProductLots] = useState<Lot[]>([]);

  // Product Details Modal
  const [showProductDetails, setShowProductDetails] = useState<Drug | null>(null);

  // Add stock form
  const [addForm, setAddForm] = useState({ 
    drug_code:'', drug_name:'', generic_name:'', category:'', unit:'comp', 
    stock_minimum:'10', supplier:'', requires_prescription:false,
    brand_name:'', presentation:'', therapeutic_action:'', 
    symptoms_indications:'', target_age_group:'', status:'ACTIVO' 
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    // Fetch ACTIVO and SUSPENDIDO to show them in the catalog. 
    // DESCONTINUADO is hidden from main views.
    const { data } = await supabase.from('vw_pharmacy_stock').select('*').in('status', ['ACTIVO', 'SUSPENDIDO']).order('drug_name');
    setInventory((data || []) as Drug[]);
    
    const { data: alertsData } = await supabase.from('vw_pharmacy_alerts').select('*');
    setAlerts(alertsData || []);
    setLoading(false);
  }, []);

  const fetchDispLog = useCallback(async () => {
    const { data } = await supabase
      .from('dispensing_log')
      .select(`
        *, 
        patients(first_name,last_name), 
        lot:pharmacy_lots(batch_code, product:pharmacy_products(drug_name,unit)), 
        user_profiles!pharmacist_id(full_name)
      `)
      .order('dispensed_at', { ascending: false })
      .limit(30);
    setDispLog((data || []) as any[]);
  }, []);

  useEffect(() => { fetchInventory(); fetchDispLog(); }, [fetchInventory, fetchDispLog]);
  useEffect(() => { supabase.from('patients').select('id,first_name,last_name,mrn').then(({ data }) => setPatients(data || [])); }, []);

  const handleDispensar = async () => {
    if (!form.patient_id || !form.product_id || !form.quantity_dispensed) return;
    
    const product = inventory.find(i => i.product_id === form.product_id);
    if (product?.status === 'SUSPENDIDO') {
      alert("Este producto está suspendido y no puede ser dispensado.");
      return;
    }

    setSaving(true);
    
    // FEFO Logic
    const { data: lots } = await supabase
      .from('pharmacy_lots')
      .select('id, stock_current, expiry_date')
      .eq('product_id', form.product_id)
      .eq('status', 'ACTIVE')
      .gt('stock_current', 0)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    if (!lots || lots.length === 0) {
      alert("No hay stock disponible en ningún lote para este producto.");
      setSaving(false);
      return;
    }

    const bestLot = lots[0];
    const qty = parseInt(form.quantity_dispensed);

    if (bestLot.stock_current < qty) {
      alert(`El lote más próximo a vencer solo tiene ${bestLot.stock_current} unidades. Reduzca la cantidad o implemente split de lotes.`);
      setSaving(false);
      return;
    }

    const { data: prof } = await supabase.from('professionals').select('user_id').limit(1).single();
    
    const { error } = await supabase.from('dispensing_log').insert({
      patient_id: form.patient_id,
      lot_id: bestLot.id,
      quantity_dispensed: qty,
      pharmacist_id: prof?.user_id || null,
      notes: form.notes || null,
    }).select().single();

    if (error) {
      alert("Error al dispensar: " + error.message);
    }

    setSaving(false);
    setShowDispModal(false);
    setForm({ patient_id:'',product_id:'',quantity_dispensed:'1',notes:'' });
    fetchInventory();
    fetchDispLog();
  };

  const handleAddDrug = async () => {
    if (!addForm.drug_code || !addForm.drug_name || !addForm.unit) return;
    setAddSaving(true);
    let finalImageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      try {
        const options = {
          maxSizeMB: 0.1, // 100KB max
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(imageFile, options);

        const { error: uploadError } = await supabase.storage
          .from('pharmacy-images')
          .upload(filePath, compressedFile);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('pharmacy-images')
          .getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }
      } catch (err) {
        console.error("Error comprimiendo imagen", err);
      }
    }

    await supabase.from('pharmacy_products').insert({
      drug_code: addForm.drug_code,
      drug_name: addForm.drug_name,
      generic_name: addForm.generic_name || null,
      category: addForm.category || null,
      requires_prescription: addForm.requires_prescription,
      unit: addForm.unit,
      stock_minimum: parseInt(addForm.stock_minimum) || 10,
      supplier: addForm.supplier || null,
      brand_name: addForm.brand_name || null,
      presentation: addForm.presentation || null,
      therapeutic_action: addForm.therapeutic_action || null,
      symptoms_indications: addForm.symptoms_indications || null,
      target_age_group: addForm.target_age_group || null,
      status: addForm.status,
      image_url: finalImageUrl
    });
    setAddSaving(false);
    setTab('inventory');
    setAddForm({ 
      drug_code:'', drug_name:'', generic_name:'', category:'', unit:'comp', 
      stock_minimum:'10', supplier:'', requires_prescription:false,
      brand_name:'', presentation:'', therapeutic_action:'', 
      symptoms_indications:'', target_age_group:'', status:'ACTIVO' 
    });
    setImageFile(null);
    fetchInventory();
  };

  const viewLots = async (product: Drug) => {
    setSelectedProduct(product);
    const { data } = await supabase.from('pharmacy_lots').select('*').eq('product_id', product.product_id).order('expiry_date');
    
    const coloredLots = (data || []).map(l => {
      const alert = alerts.find(a => a.lot_id === l.id);
      return { ...l, status_color: alert?.status_color || 'GREEN' };
    });
    
    setProductLots(coloredLots);
    setShowLotsModal(true);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
          alert('El archivo está vacío o no se pudo leer.');
          setLoading(false);
          return;
        }

        const mappedData = json.map(row => ({
          drug_code: row['Código'] || row['codigo'] || `EXC-${Math.floor(Math.random()*100000)}`,
          drug_name: row['Nombre'] || row['nombre'] || 'Desconocido',
          generic_name: row['Genérico'] || row['generico'] || null,
          category: row['Categoría'] || row['categoria'] || null,
          requires_prescription: (row['Receta'] || '').toString().toLowerCase() === 'si',
          unit: row['Unidad'] || row['unidad'] || 'comp',
          stock_minimum: parseInt(row['Stock Mínimo'] || row['stock_minimo']) || 10,
          supplier: row['Proveedor'] || row['proveedor'] || null,
          brand_name: row['Marca'] || row['marca'] || null,
          presentation: row['Presentación'] || row['presentacion'] || null,
          therapeutic_action: row['Acción Terapéutica'] || row['accion'] || null,
          symptoms_indications: row['Indicaciones'] || row['indicaciones'] || null,
          target_age_group: row['Público'] || row['publico'] || null,
          status: 'ACTIVO'
        }));

        const { error } = await supabase.from('pharmacy_products').insert(mappedData);
        if (error) throw error;

        alert(`¡Importación exitosa! Se añadieron ${mappedData.length} productos.`);
        fetchInventory();
      } catch (err: any) {
        console.error(err);
        alert('Error al importar Excel: ' + err.message);
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  // Extract unique values for filters
  const uniqueCategories = Array.from(new Set(inventory.map(i => i.category).filter(Boolean)));
  const uniqueActions = Array.from(new Set(inventory.map(i => i.therapeutic_action).filter(Boolean)));
  const uniqueAges = Array.from(new Set(inventory.map(i => i.target_age_group).filter(Boolean)));

  const filteredInventory = inventory.filter(d => {
    const matchSearch = !search || 
      d.drug_name.toLowerCase().includes(search.toLowerCase()) || 
      d.drug_code.toLowerCase().includes(search.toLowerCase()) ||
      (d.brand_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.symptoms_indications || '').toLowerCase().includes(search.toLowerCase());
    
    const matchCat = !filterCategory || d.category === filterCategory;
    const matchAct = !filterAction || d.therapeutic_action === filterAction;
    const matchAge = !filterAge || d.target_age_group === filterAge;

    return matchSearch && matchCat && matchAct && matchAge;
  });

  const kpis = {
    total: inventory.length,
    critical: inventory.filter(d => d.total_stock < d.stock_minimum * 0.5 && d.status === 'ACTIVO').length,
    expiring: alerts.filter(a => a.status_color === 'RED' || a.status_color === 'YELLOW').length,
    dispensedToday: dispLog.filter(d => new Date(d.dispensed_at).toDateString() === new Date().toDateString()).length,
  };

  return (
    <>
      <div className="animate-fade-in">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em' }}>Farmacia &amp; Inventario (ERP)</h1>
          <p style={{ fontSize:13,color:'var(--text-muted)',marginTop:4 }}>Catálogo Maestro · Lotes FEFO · Filtros Clínicos · Auditoría</p>
        </div>
        <div style={{ display:'flex',gap:8, alignItems: 'center' }}>
          <label className="btn-ghost" style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="FileSpreadsheet" size={14} style={{ color: '#4CAF50' }} />
            Importar Excel
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleExcelImport} />
          </label>
          <button className="btn-ghost" onClick={() => setTab('add')}><Icon name="PackagePlus" size={14}/> Nuevo Catálogo</button>
          <button className="btn-primary" onClick={() => setShowDispModal(true)}><Icon name="Pill" size={14}/> Dispensar (FEFO)</button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24 }}>
        {[
          { label:'Productos en Catálogo',value:kpis.total,icon:'Database',color:'#1E88E5' },
          { label:'Quiebre (Activos)',value:kpis.critical,icon:'AlertTriangle',color:'#F44336' },
          { label:'Lotes por Vencer',value:kpis.expiring,icon:'Clock',color:'#FF9800' },
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
        {[{id:'inventory',label:'Catálogo Maestro'},{id:'dispensing',label:'Auditoría de Salidas'},{id:'add',label:'Agregar Producto'}].map(t => (
          <div key={t.id} className={`tab-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id as typeof tab)}>{t.label}</div>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ position:'relative', flex: '1 1 250px' }}>
              <Icon name="Search" size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none' }} />
              <input className="input-field" style={{ paddingLeft:36, width: '100%' }} placeholder="Buscar por código, nombre, marca o síntomas..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input-field" style={{ width: 160 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Todas las Categorías</option>
              {uniqueCategories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
            </select>
            <select className="input-field" style={{ width: 160 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">Acción Terapéutica</option>
              {uniqueActions.map(a => <option key={a as string} value={a as string}>{a as string}</option>)}
            </select>
            <select className="input-field" style={{ width: 140 }} value={filterAge} onChange={e => setFilterAge(e.target.value)}>
              <option value="">Edades (Todas)</option>
              {uniqueAges.map(a => <option key={a as string} value={a as string}>{a as string}</option>)}
            </select>
            {(search || filterCategory || filterAction || filterAge) && (
              <button className="btn-ghost" onClick={() => { setSearch(''); setFilterCategory(''); setFilterAction(''); setFilterAge(''); }} style={{ color: '#F44336', padding: '8px 12px' }}>
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="glass-card" style={{ overflow:'hidden' }}>
            {loading ? <div style={{ padding:40,textAlign:'center',color:'var(--text-muted)' }}><Icon name="Loader2" size={24} className="animate-spin"/></div> : (
              <table className="data-table">
                <thead><tr><th>Producto & Marca</th><th>Clasificación</th><th>Stock Consolidado</th><th>Estado</th><th>Lotes</th></tr></thead>
                <tbody>
                  {filteredInventory.map(d => {
                    const st = getStockStatus(d.total_stock, d.stock_minimum, d.status);
                    const prodAlerts = alerts.filter(a => a.product_id === d.product_id);
                    const hasRed = prodAlerts.some(a => a.status_color === 'RED');
                    const hasYellow = prodAlerts.some(a => a.status_color === 'YELLOW');
                    
                    return (
                      <tr 
                        key={d.product_id} 
                        style={{ opacity: d.status === 'SUSPENDIDO' ? 0.6 : 1, cursor: 'pointer' }}
                        onClick={() => setShowProductDetails(d)}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {d.image_url ? (
                              <img src={d.image_url} alt={d.drug_name} style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-secondary)' }} />
                            ) : (
                              <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="Image" size={16} style={{ color: 'var(--text-muted)' }} />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight:600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {d.drug_name}
                                {d.requires_prescription && <span title="Requiere Receta"><Icon name="FileText" size={12} style={{ color: '#1E88E5' }} /></span>}
                              </div>
                              <div style={{ fontSize:10,color:'var(--text-muted)' }}>{d.brand_name || 'Genérico'} · {d.drug_code}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize:11,color:'var(--text-secondary)' }}>{d.presentation || d.unit}</span>
                            <span style={{ fontSize:10, padding: '2px 6px', background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: 4, width: 'fit-content' }}>
                              {d.therapeutic_action || d.category || 'Sin Clasificar'}
                            </span>
                            {d.target_age_group && <span style={{ fontSize:10, color: '#4CAF50' }}>{d.target_age_group}</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                            <span style={{ fontSize:16,fontWeight:800,color:st.color }}>{d.total_stock}</span>
                            <span style={{ fontSize:10,color:'var(--text-muted)' }}>{d.unit}</span>
                          </div>
                          {d.status === 'ACTIVO' && (
                            <div style={{ width:80,height:4,background:'rgba(255,255,255,0.1)',borderRadius:2,marginTop:4 }}>
                              <div style={{ width:`${Math.min(100,(d.total_stock/d.stock_minimum)*100)}%`,height:'100%',background:st.color,borderRadius:2 }} />
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, background: `${st.color}20`, color: st.color, border: `1px solid ${st.color}40` }}>
                            {st.label}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn-ghost" 
                            onClick={(e) => { e.stopPropagation(); viewLots(d); }} 
                            style={{ padding: '4px 8px', fontSize: 11, position: 'relative' }}
                          >
                            Ver Lotes
                            {(hasRed || hasYellow) && (
                              <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: hasRed ? '#F44336' : '#FF9800' }} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length===0 && <tr><td colSpan={8} style={{ textAlign:'center',padding:40,color:'var(--text-muted)' }}>No se encontraron medicamentos. Pruebe con otros filtros.</td></tr>}
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
              <div style={{ fontSize:15,fontWeight:600 }}>No hay salidas registradas</div>
            </div>
          ) : dispLog.map(d => (
            <div key={d.id} className="glass-card" style={{ padding:14 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                <span style={{ fontWeight:700,color:'var(--text-primary)' }}>{d.lot?.product?.drug_name||'—'}</span>
                <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--text-muted)' }}>{new Date(d.dispensed_at).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}</span>
              </div>
              <div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:6 }}>
                Paciente: {d.patients?`${d.patients.first_name} ${d.patients.last_name}`:'—'} · Cantidad: {d.quantity_dispensed} {d.lot?.product?.unit||'u'} (Lote: {d.lot?.batch_code})
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-muted)' }}>
                <span>Farmacéutico: {d.user_profiles?.full_name||'—'}</span>
                {d.notes && <span>{d.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'add' && (
        <div className="glass-card" style={{ padding:24,maxWidth:800 }}>
          <h2 style={{ fontSize:16,fontWeight:700,color:'var(--text-primary)',marginBottom:20 }}>Nuevo Producto (Catálogo Maestro)</h2>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Código (Ej: MED-00421) *</label>
                <input className="input-field" style={{ width: '100%' }} value={addForm.drug_code} onChange={e => setAddForm({...addForm, drug_code:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Nombre Comercial / Principal *</label>
                <input className="input-field" style={{ width: '100%' }} value={addForm.drug_name} onChange={e => setAddForm({...addForm, drug_name:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Marca / Laboratorio</label>
                <input className="input-field" style={{ width: '100%' }} value={addForm.brand_name} onChange={e => setAddForm({...addForm, brand_name:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Nombre Genérico</label>
                <input className="input-field" style={{ width: '100%' }} value={addForm.generic_name} onChange={e => setAddForm({...addForm, generic_name:e.target.value})} />
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Presentación</label>
                  <select className="input-field" style={{ width: '100%' }} value={addForm.presentation} onChange={e => setAddForm({...addForm, presentation:e.target.value})}>
                    <option value="">Seleccione...</option>
                    {['Comprimidos', 'Cápsulas', 'Jarabe', 'Suspensión', 'Ampolla Inyectable', 'Vial Inyectable', 'Crema/Ungüento', 'Gotas', 'Supositorios', 'Polvo', 'Otro'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Unidad de Medida *</label>
                  <select className="input-field" style={{ width: '100%' }} value={addForm.unit} onChange={e => setAddForm({...addForm,unit:e.target.value})}>
                    {['comp','cap','amp','vial','sobre','frasco','tubo','mg','mL','L'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Acción Terapéutica</label>
                  <select className="input-field" style={{ width: '100%' }} value={addForm.therapeutic_action} onChange={e => setAddForm({...addForm, therapeutic_action:e.target.value})}>
                    <option value="">Seleccione...</option>
                    {['Analgésico', 'Antibiótico', 'Antiinflamatorio', 'Antipirético', 'Antihistamínico', 'Antihipertensivo', 'Diurético', 'Anestésico', 'Suplemento', 'Otro'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Público Objetivo</label>
                  <select className="input-field" style={{ width: '100%' }} value={addForm.target_age_group} onChange={e => setAddForm({...addForm, target_age_group:e.target.value})}>
                    <option value="">General</option>
                    <option value="Pediátrico">Pediátrico</option>
                    <option value="Adulto">Adulto</option>
                    <option value="Geriátrico">Geriátrico</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Síntomas / Indicaciones Clínicas</label>
                <textarea className="input-field" style={{ width: '100%', minHeight: 60, resize: 'none' }} placeholder="Ej. Dolor de cabeza, fiebre leve..." value={addForm.symptoms_indications} onChange={e => setAddForm({...addForm, symptoms_indications:e.target.value})} />
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Stock Mínimo Global</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} value={addForm.stock_minimum} onChange={e => setAddForm({...addForm,stock_minimum:e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Estado Inicial</label>
                  <select className="input-field" style={{ width: '100%' }} value={addForm.status} onChange={e => setAddForm({...addForm, status:e.target.value})}>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="SUSPENDIDO">SUSPENDIDO</option>
                    <option value="DESCONTINUADO">DESCONTINUADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Imagen del Producto</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              </div>

              <div style={{ display:'flex',alignItems:'center',gap:10,paddingTop:10 }}>
                <input type="checkbox" id="controlled" checked={addForm.requires_prescription} onChange={e => setAddForm({...addForm,requires_prescription:e.target.checked})} style={{ width:16,height:16 }} />
                <label htmlFor="controlled" style={{ fontSize:12,fontWeight:600,color:'var(--text-secondary)',cursor:'pointer' }}>📄 Requiere Receta Médica Estricta</label>
              </div>
            </div>
          </div>
          
          <div style={{ display:'flex',gap:8,marginTop:24, paddingTop: 20, borderTop: '1px solid var(--border-secondary)' }}>
            <button className="btn-primary" disabled={addSaving} onClick={handleAddDrug}>
              {addSaving ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Database" size={14}/>}
              {addSaving ? 'Guardando en Base de Datos...' : 'Crear Producto Maestro'}
            </button>
            <button className="btn-ghost" onClick={() => setTab('inventory')}>Cancelar</button>
          </div>
        </div>
      )}
      </div>

      {/* DISPENSING MODAL */}
      {showDispModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:9999,padding:24,overflowY:'auto',paddingTop:'8vh' }}>
          <div className="glass-card animate-fade-in" style={{ padding:24,width:'100%',maxWidth:460,marginBottom:'8vh' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
              <h3 style={{ fontSize:16,fontWeight:800,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8 }}>
                <Icon name="Pill" size={18} style={{ color:'#4CAF50' }}/> Dispensar Medicamento (FEFO)
              </h3>
              <button onClick={() => setShowDispModal(false)} style={{ background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>
            <div style={{ fontSize: 11, color: '#4CAF50', marginBottom: 12, background: 'rgba(76,175,80,0.1)', padding: 8, borderRadius: 6 }}>
              Lógica FEFO Activa: El sistema descontará automáticamente del lote con fecha de vencimiento más próxima.
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Paciente *</label>
                <select className="input-field" style={{ width: '100%' }} value={form.patient_id} onChange={e => setForm({...form,patient_id:e.target.value})}>
                  <option value="">Seleccionar paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Producto Maestro *</label>
                <select className="input-field" style={{ width: '100%' }} value={form.product_id} onChange={e => setForm({...form,product_id:e.target.value})}>
                  <option value="">Seleccionar medicamento</option>
                  {inventory.filter(d => d.total_stock > 0 && d.status === 'ACTIVO').map(d => <option key={d.product_id} value={d.product_id}>{d.drug_name} (Total: {d.total_stock} {d.unit})</option>)}
                </select>
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Cantidad a Dispensar *</label>
                <input type="number" min="1" className="input-field" style={{ width: '100%' }} value={form.quantity_dispensed} onChange={e => setForm({...form,quantity_dispensed:e.target.value})} />
              </div>
              <div><label style={{ fontSize:11,fontWeight:600,color:'var(--text-muted)',display:'block',marginBottom:5 }}>Notas</label>
                <input className="input-field" style={{ width: '100%' }} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Indicaciones adicionales..." />
              </div>
            </div>
            <div style={{ display:'flex',gap:8,marginTop:20,justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowDispModal(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={handleDispensar} style={{ background:'#4CAF50' }}>
                {saving ? <Icon name="Loader2" size={14} className="animate-spin"/> : <Icon name="Check" size={14}/>}
                {saving ? 'Procesando...' : 'Confirmar Dispensación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOTS MODAL */}
      {showLotsModal && selectedProduct && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:9999,padding:24,overflowY:'auto',paddingTop:'8vh' }}>
          <div className="glass-card animate-fade-in" style={{ padding:24,width:'100%',maxWidth:700,marginBottom:'8vh' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
              <div>
                <h3 style={{ fontSize:16,fontWeight:800,color:'var(--text-primary)',display:'flex',alignItems:'center',gap:8 }}>
                  <Icon name="Layers" size={18} style={{ color:'#1E88E5' }}/> Lotes Activos
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Producto: {selectedProduct.drug_name}</p>
              </div>
              <button onClick={() => setShowLotsModal(false)} style={{ background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><Icon name="X" size={16}/></button>
            </div>
            
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código de Lote</th>
                  <th>Stock Físico</th>
                  <th>Vencimiento</th>
                  <th>Estado (Semáforo)</th>
                </tr>
              </thead>
              <tbody>
                {productLots.map(l => {
                  let alertLabel = 'Normal';
                  if (l.status_color === 'RED') alertLabel = 'CRÍTICO / VENCIDO';
                  if (l.status_color === 'YELLOW') alertLabel = 'POR VENCER (< 6m)';
                  if (l.expiry_date === null) alertLabel = 'No Aplica (Insumo)';
                  
                  const cColor = l.status_color === 'RED' ? '#F44336' : l.status_color === 'YELLOW' ? '#FF9800' : '#4CAF50';
                  
                  return (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{l.batch_code}</td>
                      <td style={{ fontSize: 14, fontWeight: 800 }}>{l.stock_current}</td>
                      <td style={{ fontFamily: 'monospace' }}>{l.expiry_date || 'N/A'}</td>
                      <td>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, background: `${cColor}20`, color: cColor, border: `1px solid ${cColor}40` }}>
                          {alertLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {productLots.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No hay lotes activos para este producto.</td></tr>
                )}
              </tbody>
            </table>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowLotsModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS MODAL */}
      {showProductDetails && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:24,overflowY:'auto' }}>
          <div className="glass-card animate-fade-in" style={{ width:'100%',maxWidth:700, padding: 0, overflow: 'hidden' }}>
            {/* Header / Banner */}
            <div style={{ height: 120, background: 'linear-gradient(135deg, #1E88E5 0%, #0D47A1 100%)', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 24 }}>
              <button 
                onClick={() => setShowProductDetails(null)} 
                style={{ position: 'absolute', top: 16, right: 16, background:'rgba(0,0,0,0.2)', border:'none', cursor:'pointer', color:'#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="X" size={16}/>
              </button>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, transform: 'translateY(30px)' }}>
                {showProductDetails.image_url ? (
                  <img src={showProductDetails.image_url} alt={showProductDetails.drug_name} style={{ width: 100, height: 100, borderRadius: 16, objectFit: 'cover', border: '4px solid var(--bg-card)', background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
                ) : (
                  <div style={{ width: 100, height: 100, borderRadius: 16, background: 'var(--bg-surface)', border: '4px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    <Icon name="Pill" size={40} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                <div style={{ paddingBottom: 6 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.4)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {showProductDetails.drug_name}
                    {showProductDetails.requires_prescription && <span title="Receta Obligatoria"><Icon name="FileText" size={16} style={{ color: '#FFCA28' }} /></span>}
                  </h2>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{showProductDetails.brand_name || 'Genérico'} · {showProductDetails.drug_code}</div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '40px 24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left Col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Genérico / Compuesto</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{showProductDetails.generic_name || 'N/A'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Categoría Terapéutica</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{showProductDetails.category || 'N/A'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Acción / Indicaciones</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      <strong>Acción:</strong> {showProductDetails.therapeutic_action || 'N/A'}<br/>
                      <strong>Uso:</strong> {showProductDetails.symptoms_indications || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Right Col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Stock Físico</div>
                      <div style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 800 }}>{showProductDetails.total_stock} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{showProductDetails.unit}</span></div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Stock Mínimo</div>
                      <div style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 800 }}>{showProductDetails.stock_minimum}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Presentación</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{showProductDetails.presentation || showProductDetails.unit}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-secondary)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 4 }}>Proveedor Principal</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{showProductDetails.supplier || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-secondary)', paddingTop: 16 }}>
                <button className="btn-ghost" onClick={() => { setShowProductDetails(null); viewLots(showProductDetails); }}>
                  <Icon name="Layers" size={14} /> Ver Lotes
                </button>
                <button className="btn-primary" onClick={() => { setShowProductDetails(null); setShowDispModal(true); setForm({...form, product_id: showProductDetails.product_id}); }}>
                  <Icon name="Pill" size={14} /> Dispensar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

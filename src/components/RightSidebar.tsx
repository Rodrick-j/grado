'use client';
import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { TRIAGE_CONFIG } from '@/lib/data';
import { createClient } from '@/lib/supabase';
import { playNotificationSound } from '@/lib/audio';

const ALL_SPECIALTIES = [
  'Cardiología',
  'Cirugía General',
  'Dermatología',
  'Endocrinología',
  'Gastroenterología',
  'Ginecología & Obstetricia',
  'Medicina de Emergencias',
  'Medicina General',
  'Medicina Interna',
  'Nefrología',
  'Neumología',
  'Neurología',
  'Oftalmología',
  'Oncología',
  'Otorrinolaringología',
  'Pediatría',
  'Psiquiatría',
  'Radiología & Imágenes',
  'Reumatología',
  'Traumatología & Ortopedia',
  'Urología'
];

const SPECIALTY_IMAGES: Record<string, string> = {
  'Cardiología': '/images/specialties/CARDIOLOGIA.jfif',
  'Cirugía General': '/images/specialties/CIRUGIA GERERAL.jfif',
  'Dermatología': '/images/specialties/DERMATOLOGIA.jfif',
  'Endocrinología': '/images/specialties/endocrinologia.jpg',
  'Gastroenterología': '/images/specialties/GASTROENTEROLOGIA.png',
  'Ginecología & Obstetricia': '/images/specialties/ginecologia-y-obstetricia.jpg',
  'Medicina de Emergencias': '/images/specialties/MEDICINA DE EMERGENCIA.jfif',
  'Medicina General': '/images/specialties/medicina_general_1.webp',
  'Medicina Interna': '/images/specialties/MEDICINA INTERNA.jfif',
  'Nefrología': '/images/specialties/NEFROLOGIA.jfif',
  'Neumología': '/images/specialties/NEUMOLOGIA.jfif',
  'Neurología': '/images/specialties/NEUROLOGIA.jpg',
  'Oftalmología': '/images/specialties/OFTALMOLOGIA.jfif',
  'Oncología': '/images/specialties/ONCOLOGIA.jfif',
  'Otorrinolaringología': '/images/specialties/OTORRINOLARINGOLOGO.jfif',
  'Pediatría': '/images/specialties/PEDIATRIA.jfif',
  'Psiquiatría': '/images/specialties/PSIQUIATRIA.avif',
  'Radiología & Imágenes': '/images/specialties/RADIOLOGIA Y IMAGENES.jfif',
  'Reumatología': '/images/specialties/REUMATOLOGIA.jfif',
  'Traumatología & Ortopedia': '/images/specialties/ortopedia_y_traumatologia.jpg',
  'Urología': '/images/specialties/urologia.jpg'
};

interface RightSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

type TabId = 'requests' | 'queue' | 'alerts' | 'staff' | 'stats';

export function RightSidebar({ collapsed, onToggle, isMobile }: RightSidebarProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const [triageQueue, setTriageQueue] = useState<any[]>([]);
  const [virtualQueue, setVirtualQueue] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ activePatients: 0, doctorsOnDuty: 0, labsToday: 0, imagingToday: 0 });

  // Modal states
  const [reassignModalOpen, setReassignModalOpen] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Master-Detail Specialty View
  const [selectedSpecialtyView, setSelectedSpecialtyView] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: tData } = await supabase
      .from('triage_queue')
      .select('id, level, chief_complaint, arrived_at, patients(first_name, last_name)')
      .is('resolved_at', null);

    const { data: vData } = await supabase
      .from('virtual_queue')
      .select('id, token_number, status, created_at, patients(first_name, last_name, mrn)')
      .in('status', ['WAITING', 'CALLED'])
      .order('created_at', { ascending: true });
    setVirtualQueue(vData || []);

    const levels = { RED: 1, ORANGE: 2, YELLOW: 3, GREEN: 4, BLUE: 5 };
    const sortedTriage = (tData || []).sort((a: any, b: any) => levels[a.level as keyof typeof levels] - levels[b.level as keyof typeof levels]);
    setTriageQueue(sortedTriage);

    const { data: dData } = await supabase
      .from('professionals')
      .select('id, status, user_profiles!professionals_user_id_fkey(full_name), specialties(name)')
      .eq('status', 'active')
      .limit(10);
    setDoctors(dData || []);

    const { data: stockAlerts } = await supabase
      .from('pharmacy_inventory')
      .select('drug_name, stock_current, unit')
      .lt('stock_current', 10)
      .limit(5);

    const formattedAlerts = (stockAlerts || []).map((s, i) => ({
      id: `AL-${i}`, type: 'STOCK', message: `${s.drug_name}: Quedan ${s.stock_current} ${s.unit}`, severity: 'warning', time: 'Ahora'
    }));
    setAlerts(formattedAlerts);

    const { data: reqData, error: reqError } = await supabase
      .from('appointments')
      .select('id, starts_at, reason, status, patients(first_name, last_name), professionals(id, title, user_profiles!professionals_user_id_fkey(full_name)), specialties(name)')
      .in('status', ['PENDING'])
      .order('starts_at', { ascending: true })
      .limit(10);
    if (reqError) console.error("Error fetching appointments:", reqError);
    setPendingRequests(reqData || []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = today.toISOString();

    const [
      { count: pacCount },
      { count: labCount },
      { count: imgCount }
    ] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }).in('status', ['ACTIVE', 'HOSPITALIZED']),
      supabase.from('lab_orders').select('*', { count: 'exact', head: true }).gte('created_at', dateStr),
      supabase.from('imaging_orders').select('*', { count: 'exact', head: true }).gte('created_at', dateStr),
    ]);

    setStats({
      activePatients: pacCount || 0,
      doctorsOnDuty: dData?.length || 0,
      labsToday: labCount || 0,
      imagingToday: imgCount || 0
    });
  }, []);

  useEffect(() => {
    loadData();
    const tInterval = setInterval(loadData, 30000);
    
    const channel = supabase.channel('right_sidebar_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound('notification');
        }
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'triage_queue' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound('alert');
        }
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'virtual_queue' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound('notification');
        }
        loadData();
      })
      .subscribe();

    return () => {
      clearInterval(tInterval);
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    loadData();
  };

  const handleConfirmReassign = async () => {
    if (!reassignModalOpen || !selectedDoctorId) return;
    await supabase.from('appointments').update({ 
      professional_id: selectedDoctorId,
      status: 'SCHEDULED' // Automatically approve when reassigning as per professional flow
    }).eq('id', reassignModalOpen);
    setReassignModalOpen(null);
    setSelectedDoctorId('');
    loadData();
  };

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close fullscreen with Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
        setActiveTab(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreen]);

  const tabs = [
    { id: 'requests' as const, icon: 'Mail', label: 'Solicitudes', color: '#7C4DFF' },
    { id: 'queue' as const, icon: 'Users', label: 'Cola', color: '#1E88E5' },
    { id: 'alerts' as const, icon: 'Bell', label: 'Alertas', color: '#F44336' },
    { id: 'staff' as const, icon: 'Stethoscope', label: 'Médicos', color: '#4CAF50' },
    { id: 'stats' as const, icon: 'BarChart3', label: 'Stats', color: '#FF9800' },
  ];

  const handleTabClick = (tabId: TabId) => {
    if (collapsed) {
      onToggle();
    }
    setActiveTab(tabId);
    setFullscreen(true);
  };

  const closeFullscreen = () => {
    setFullscreen(false);
    setActiveTab(null);
  };

  const currentTab = tabs.find(t => t.id === activeTab);

  // ─── Fullscreen Overlay ───────────────────────────────────────────────────
  if (fullscreen && activeTab) {
    return (
      <>
        {/* Backdrop */}
        <div
          onClick={closeFullscreen}
          style={{
            position: 'fixed',
            inset: 0,
            top: 'var(--topnav-height)',
            background: 'rgba(6, 13, 26, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 48,
            animation: 'fade-in 0.2s ease forwards',
          }}
        />

        {/* Full panel */}
        <div
          style={{
            position: 'fixed',
            top: 'var(--topnav-height)',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 49,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-primary)',
            animation: 'panel-expand 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            overflow: 'hidden',
          }}
        >
          {/* Header bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '0 24px',
            height: 60,
            borderBottom: '1px solid var(--border-primary)',
            background: 'var(--bg-leftnav)',
            flexShrink: 0,
          }}>
            {/* Back button */}
            <button
              onClick={closeFullscreen}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-secondary)',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }}
            >
              <Icon name="ChevronRight" size={15} />
              Cerrar panel
            </button>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `${currentTab?.color}18`,
                border: `1px solid ${currentTab?.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={currentTab?.icon || 'Inbox'} size={16} style={{ color: currentTab?.color }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  PANEL CLÍNICO — {currentTab?.label?.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div className="live-dot" style={{ width: 6, height: 6 }} />
                  EN TIEMPO REAL
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Tab switcher in header */}
            <div style={{ display: 'flex', gap: 4 }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 7,
                    background: activeTab === t.id ? `${t.color}18` : 'transparent',
                    border: activeTab === t.id ? `1px solid ${t.color}35` : '1px solid transparent',
                    color: activeTab === t.id ? t.color : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    transition: 'all var(--transition-fast)',
                    position: 'relative',
                  }}
                >
                  <Icon name={t.icon} size={13} />
                  {t.label}
                  {t.id === 'requests' && pendingRequests.length > 0 && (
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: 16, height: 16, borderRadius: 8,
                      background: '#7C4DFF', color: '#fff',
                      fontSize: 9, fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                    }}>{pendingRequests.length}</div>
                  )}
                </button>
              ))}
            </div>

            {/* Reload + clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
              <button
                onClick={loadData}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--color-teal)',
                }}
                title="Actualizar datos"
              >
                <Icon name="RefreshCw" size={14} />
              </button>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--color-teal)', letterSpacing: '0.05em' }}>
                {now ? now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
              </div>
            </div>

            {/* ESC hint */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>ESC</kbd>
              para cerrar
            </div>
          </div>

          {/* REASSIGN MODAL OVERLAY */}
          {reassignModalOpen && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(6, 13, 26, 0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'fade-in 0.2s ease forwards',
            }}>
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                borderRadius: 16, width: 420, padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Reasignar Profesional</h3>
                  <button onClick={() => setReassignModalOpen(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Icon name="X" size={20} />
                  </button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Selecciona a un profesional en turno para reasignar y aprobar esta solicitud.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', marginBottom: 20 }}>
                  {doctors.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No hay médicos en turno</div>
                  ) : doctors.map(doc => {
                    const docName = doc.user_profiles?.full_name || 'Médico';
                    const isSelected = selectedDoctorId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        style={{
                          padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                          background: isSelected ? 'rgba(124,77,255,0.1)' : 'var(--bg-surface)',
                          border: `1px solid ${isSelected ? '#7C4DFF' : 'var(--border-secondary)'}`,
                          display: 'flex', alignItems: 'center', gap: 12,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 700,
                        }}>
                          {docName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{docName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.specialties?.name || 'General'}</div>
                        </div>
                        {isSelected && <Icon name="CheckCircle2" size={18} style={{ color: '#7C4DFF', marginLeft: 'auto' }} />}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setReassignModalOpen(null)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)',
                    color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer'
                  }}>Cancelar</button>
                  <button 
                    onClick={handleConfirmReassign}
                    disabled={!selectedDoctorId}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8,
                      background: '#7C4DFF', border: 'none',
                      color: '#fff', fontWeight: 600, cursor: selectedDoctorId ? 'pointer' : 'not-allowed',
                      opacity: selectedDoctorId ? 1 : 0.5
                    }}
                  >Reasignar y Aprobar</button>
                </div>
              </div>
            </div>
          )}

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

              {/* SOLICITUDES */}
              {activeTab === 'requests' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Solicitudes de Atención
                      </h1>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Citas solicitadas desde la App que requieren aprobación
                      </p>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#7C4DFF' }}>
                      {pendingRequests.length} <span style={{ fontSize: 13, fontWeight: 600 }}>pendientes</span>
                    </span>
                  </div>

                  <div style={{
                    marginBottom: 24, padding: '14px 18px',
                    background: 'rgba(124,77,255,0.06)', border: '1px solid rgba(124,77,255,0.2)',
                    borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <Icon name="Info" size={16} style={{ color: '#7C4DFF', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      Las solicitudes de cita desde la App llegan aquí. Se pueden{' '}
                      <strong style={{ color: '#4CAF50' }}>aprobar</strong>,{' '}
                      <strong style={{ color: '#FF9800' }}>reasignar</strong> o{' '}
                      <strong style={{ color: '#F44336' }}>rechazar</strong>.
                    </div>
                  </div>

                  {pendingRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
                        background: 'var(--bg-surface)', border: '1px dashed var(--border-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="Inbox" size={32} style={{ opacity: 0.4 }} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Sin solicitudes pendientes</div>
                      <div style={{ fontSize: 13, opacity: 0.6 }}>Las nuevas solicitudes de la App aparecerán aquí en tiempo real</div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const grouped = pendingRequests.reduce((acc, req) => {
                          const spec = req.specialties?.name || 'Medicina General';
                          if (!acc[spec]) acc[spec] = [];
                          acc[spec].push(req);
                          return acc;
                        }, {} as Record<string, any[]>);

                        if (!selectedSpecialtyView) {
                          // MASTER VIEW: Grid of Specialties
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                              {ALL_SPECIALTIES.map((specialtyName) => {
                                const requests = grouped[specialtyName] || [];
                                const bgImage = SPECIALTY_IMAGES[specialtyName];
                                return (
                                <div
                                  key={specialtyName}
                                  onClick={() => setSelectedSpecialtyView(specialtyName)}
                                  style={{
                                    backgroundImage: bgImage 
                                      ? `linear-gradient(to bottom, rgba(6,13,26,0.3), rgba(6,13,26,0.9)), url('${encodeURI(bgImage)}')` 
                                      : 'none', 
                                    backgroundColor: 'var(--bg-card)',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center center',
                                    backgroundRepeat: 'no-repeat',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    minHeight: 160
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.borderColor = '#7C4DFF';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,77,255,0.15)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                  }}
                                >
                                  {!bgImage && (
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#7C4DFF15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                      <Icon name="Stethoscope" size={24} style={{ color: '#7C4DFF' }} />
                                    </div>
                                  )}
                                  <h2 style={{ fontSize: 16, fontWeight: 700, color: bgImage ? '#fff' : 'var(--text-primary)', textAlign: 'center', marginBottom: 8, textShadow: bgImage ? '0 2px 4px rgba(0,0,0,0.8)' : 'none' }}>{specialtyName}</h2>
                                  <div style={{ background: requests.length > 0 ? '#FF9800' : 'rgba(255,255,255,0.1)', color: requests.length > 0 ? '#fff' : (bgImage ? '#fff' : 'var(--text-muted)'), border: requests.length === 0 && !bgImage ? '1px solid var(--border-secondary)' : 'none', fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                                    {requests.length} pendiente{requests.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              )})}
                            </div>
                          );
                        } else {
                          // DETAIL VIEW: Table for selected specialty
                          const requests = grouped[selectedSpecialtyView] || [];
                          return (
                            <div className="animate-fade-in">
                              <button
                                onClick={() => setSelectedSpecialtyView(null)}
                                style={{
                                  background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600,
                                  cursor: 'pointer', marginBottom: 20, padding: 0
                                }}
                              >
                                <Icon name="ArrowLeft" size={16} /> Volver a Especialidades
                              </button>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border-primary)' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#7C4DFF15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Icon name="Stethoscope" size={16} style={{ color: '#7C4DFF' }} />
                                </div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSpecialtyView}</h2>
                                <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-muted)' }}>
                                  {requests.length} en espera
                                </span>
                              </div>
                              
                              {requests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed var(--border-secondary)', borderRadius: 12, background: 'var(--bg-card)' }}>
                                  <Icon name="CheckCircle2" size={32} style={{ color: '#4CAF50', marginBottom: 12, opacity: 0.5 }} />
                                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Todo al día</div>
                                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>No hay solicitudes pendientes en {selectedSpecialtyView}.</div>
                                </div>
                              ) : (
                                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-surface)' }}>
                                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Fecha / Hora</th>
                                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Paciente</th>
                                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Médico Asignado</th>
                                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Motivo</th>
                                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {requests.map((req: any) => {
                                        const pat = req.patients ? `${req.patients.first_name} ${req.patients.last_name}` : 'Paciente';
                                        const doc = req.professionals ? `${req.professionals.title || ''} ${req.professionals.user_profiles?.full_name || ''}`.trim() : 'Sin asignar';
                                        return (
                                          <tr key={req.id} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                                              {new Date(req.starts_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}{' '}
                                              <span style={{ color: 'var(--text-muted)' }}>{new Date(req.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{pat}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{doc}</td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', fontStyle: req.reason ? 'italic' : 'normal' }}>{req.reason ? `"${req.reason}"` : '--'}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleUpdateStatus(req.id, 'SCHEDULED')} title="Aprobar" style={{ width: 32, height: 32, borderRadius: 6, background: '#4CAF5015', border: '1px solid #4CAF5030', color: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#4CAF5025'} onMouseLeave={e => e.currentTarget.style.background = '#4CAF5015'}>
                                                  <Icon name="Check" size={15} />
                                                </button>
                                                <button onClick={() => { setReassignModalOpen(req.id); setSelectedDoctorId(req.professionals?.id || ''); }} title="Reasignar" style={{ width: 32, height: 32, borderRadius: 6, background: '#FF980015', border: '1px solid #FF980030', color: '#FF9800', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#FF980025'} onMouseLeave={e => e.currentTarget.style.background = '#FF980015'}>
                                                  <Icon name="RefreshCw" size={15} />
                                                </button>
                                                <button onClick={() => handleUpdateStatus(req.id, 'CANCELLED')} title="Rechazar" style={{ width: 32, height: 32, borderRadius: 6, background: '#F4433615', border: '1px solid #F4433630', color: '#F44336', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F4433625'} onMouseLeave={e => e.currentTarget.style.background = '#F4433615'}>
                                                  <Icon name="X" size={15} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* TRIAGE QUEUE */}
              {activeTab === 'queue' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Cola de Emergencias — Triage Manchester
                      </h1>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Pacientes en espera ordenados por prioridad clínica
                      </p>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#1E88E5' }}>
                      {triageQueue.length} <span style={{ fontSize: 13, fontWeight: 600 }}>activos</span>
                    </span>
                  </div>

                  {triageQueue.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
                        background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="ShieldCheck" size={32} style={{ color: '#4CAF50' }} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Sin pacientes en cola</div>
                      <div style={{ fontSize: 13, opacity: 0.6 }}>La sala de emergencias está libre</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                      {triageQueue.map((p) => {
                        const cfg = TRIAGE_CONFIG[p.level as keyof typeof TRIAGE_CONFIG] || TRIAGE_CONFIG.GREEN;
                        const waitMin = Math.floor((new Date().getTime() - new Date(p.arrived_at).getTime()) / 60000);
                        return (
                          <div key={p.id} style={{
                            padding: '18px 20px',
                            background: 'var(--bg-card)',
                            border: `1px solid ${cfg.color}30`,
                            borderLeft: `4px solid ${cfg.color}`,
                            borderRadius: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5,
                                background: `${cfg.color}20`, color: cfg.text,
                              }}>{cfg.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: waitMin > 30 ? '#F44336' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {waitMin <= 0 ? 'AHORA' : `${waitMin}m espera`}
                              </span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                              {p.patients ? `${p.patients.first_name} ${p.patients.last_name}` : 'Paciente Anónimo'}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.chief_complaint}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* VIRTUAL QUEUE SECTION */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 40 }}>
                    <div>
                      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Fila Virtual (App PWA)
                      </h1>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Pacientes en espera desde la aplicación
                      </p>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#9C27B0' }}>
                      {virtualQueue.length} <span style={{ fontSize: 13, fontWeight: 600 }}>activos</span>
                    </span>
                  </div>

                  {virtualQueue.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Sin pacientes virtuales</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                      {virtualQueue.map((v) => {
                        const waitMin = Math.floor((new Date().getTime() - new Date(v.created_at).getTime()) / 60000);
                        return (
                          <div key={v.id} style={{
                            padding: '18px 20px',
                            background: 'var(--bg-card)',
                            border: `1px solid #9C27B030`,
                            borderLeft: `4px solid #9C27B0`,
                            borderRadius: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <span style={{
                                fontSize: 14, fontWeight: 800, padding: '3px 10px', borderRadius: 5,
                                background: `#9C27B020`, color: '#9C27B0', letterSpacing: '0.05em'
                              }}>{v.token_number}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: waitMin > 30 ? '#F44336' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                                {waitMin <= 0 ? 'AHORA' : `${waitMin}m espera`}
                              </span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                              {v.patients ? `${v.patients.first_name} ${v.patients.last_name}` : 'Paciente Anónimo'}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Estado: {v.status === 'WAITING' ? 'En espera' : 'Llamado'}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ALERTS */}
              {activeTab === 'alerts' && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Alertas Críticas
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Stock bajo en farmacia y alertas del sistema
                    </p>
                  </div>

                  {alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
                        background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="BellOff" size={32} style={{ color: '#4CAF50' }} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No hay alertas críticas</div>
                      <div style={{ fontSize: 13, opacity: 0.6 }}>El sistema opera con normalidad</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
                      {alerts.map((a) => (
                        <div key={a.id} style={{
                          padding: '16px 20px',
                          background: 'var(--bg-card)',
                          border: `1px solid ${a.severity === 'critical' ? 'rgba(244,67,54,0.3)' : 'rgba(255,152,0,0.3)'}`,
                          borderLeft: `4px solid ${a.severity === 'critical' ? '#F44336' : '#FF9800'}`,
                          borderRadius: 12,
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: a.severity === 'critical' ? 'rgba(244,67,54,0.1)' : 'rgba(255,152,0,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Icon name="AlertTriangle" size={20} style={{ color: a.severity === 'critical' ? '#FF5252' : '#FFAB40' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: a.severity === 'critical' ? '#FF5252' : '#FFAB40', marginBottom: 4 }}>{a.type}</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{a.message}</div>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.time}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                    marginTop: 32, padding: '16px 20px',
                    background: 'rgba(30,136,229,0.06)', border: '1px solid rgba(30,136,229,0.2)',
                    borderRadius: 12, maxWidth: 720,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-blue-light)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="Shield" size={14} />
                      Sistema de Auditoría
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      Todos los eventos quedan registrados con timestamp, usuario e IP para cumplimiento normativo.
                    </div>
                  </div>
                </div>
              )}

              {/* STAFF ON DUTY */}
              {activeTab === 'staff' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Médicos en Turno
                      </h1>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Personal médico activo en este momento
                      </p>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#4CAF50' }}>
                      {doctors.length} <span style={{ fontSize: 13, fontWeight: 600 }}>activos</span>
                    </span>
                  </div>

                  {doctors.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
                        background: 'var(--bg-surface)', border: '1px dashed var(--border-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name="UserX" size={32} style={{ opacity: 0.4 }} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No hay médicos activos</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {doctors.map((d, i) => {
                        const dName = d.user_profiles?.full_name || 'Dr. Desconocido';
                        return (
                          <div key={i} style={{
                            padding: '18px 20px',
                            background: 'var(--bg-card)', border: '1px solid var(--border-secondary)',
                            borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14,
                          }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: 12,
                              background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>
                              {dName.split(' ')[0]?.[0]}{dName.split(' ')[1]?.[0] || ''}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {dName}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{d.specialties?.name || 'General'}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF50' }} />
                              <span style={{ fontSize: 9, color: '#4CAF50', fontWeight: 600 }}>ACTIVO</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STATS */}
              {activeTab === 'stats' && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Estadísticas Rápidas
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Métricas operacionales en tiempo real
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                    {[
                      { label: 'Pacientes activos', value: stats.activePatients, icon: 'Users', color: '#1E88E5' },
                      { label: 'Médicos en turno', value: stats.doctorsOnDuty, icon: 'Stethoscope', color: '#4CAF50' },
                      { label: 'Especialidades', value: 20, icon: 'LayoutDashboard', color: '#FF9800' },
                      { label: 'Camas disponibles', value: 47, icon: 'Bed', color: '#9C27B0' },
                      { label: 'Labs hoy', value: stats.labsToday, icon: 'FlaskConical', color: '#00BCD4' },
                      { label: 'Imágenes hoy', value: stats.imagingToday, icon: 'ScanLine', color: '#607D8B' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        padding: '20px', background: 'var(--bg-card)',
                        border: `1px solid ${s.color}20`, borderRadius: 12,
                        borderTop: `3px solid ${s.color}`,
                      }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <Icon name={s.icon} size={18} style={{ color: s.color }} />
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '24px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 20 }}>OCUPACIÓN POR ALA</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
                      {[
                        { label: 'Ala Norte', pct: 82, color: '#1E88E5' },
                        { label: 'Ala Sur', pct: 91, color: '#F44336' },
                        { label: 'Ala Este', pct: 74, color: '#4CAF50' },
                        { label: 'Ala Oeste', pct: 68, color: '#FF9800' },
                      ].map((w) => (
                        <div key={w.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{w.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: w.color }}>{w.pct}%</span>
                          </div>
                          <div className="progress-bar" style={{ height: 8 }}>
                            <div className="progress-fill" style={{ width: `${w.pct}%`, background: `linear-gradient(90deg, ${w.color}, ${w.color}aa)` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Normal collapsed/expanded sidebar ───────────────────────────────────
  return (
    <aside
      style={{
        width: isMobile ? 'var(--sidebar-right-width)' : (collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-right-width)'),
        minHeight: '100vh',
        background: 'var(--bg-leftnav)',
        borderLeft: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-normal), transform var(--transition-normal)',
        overflow: 'hidden',
        position: 'fixed',
        top: 'var(--topnav-height)',
        right: 0,
        bottom: 0,
        zIndex: 60,
        transform: isMobile && collapsed ? 'translateX(100%)' : 'translateX(0)',
      }}
    >
      {/* Toggle button */}
      <div style={{
        padding: '16px 14px',
        borderBottom: '1px solid var(--border-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={onToggle}
          style={{
            width: 32,
            height: 32,
            background: 'var(--nav-hover-bg)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            transition: 'all var(--transition-fast)'
          }}
          className="hover:text-blue-500"
        >
          <Icon name={collapsed ? 'Menu' : 'ChevronLeft'} size={14} />
        </button>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>PANEL CLÍNICO</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              <div className="live-dot" style={{ width: 6, height: 6 }} />
              EN TIEMPO REAL
            </div>
          </div>
        )}
      </div>

      {collapsed ? (
        /* Collapsed icons — click opens fullscreen */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 10 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                width: 40, height: 40, borderRadius: 8,
                background: `${tab.color}10`,
                border: '1px solid var(--border-secondary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: tab.color, transition: 'all var(--transition-fast)',
                position: 'relative',
              }}
              title={tab.label}
            >
              <Icon name={tab.icon} size={15} />
              {tab.id === 'requests' && pendingRequests.length > 0 && (
                <div style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#7C4DFF', color: '#fff',
                  fontSize: 8, fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>{pendingRequests.length}</div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Tab Bar — click opens fullscreen */}
          <div style={{ padding: '10px 10px 0', display: 'flex', gap: 3 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                title={`Abrir ${t.label} en pantalla completa`}
                style={{
                  flex: 1, padding: '7px 4px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 7, cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 9.5, fontWeight: 600, transition: 'all var(--transition-fast)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = `${t.color}12`;
                  btn.style.borderColor = `${t.color}30`;
                  btn.style.color = t.color;
                }}
                onMouseLeave={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = 'transparent';
                  btn.style.borderColor = 'transparent';
                  btn.style.color = 'var(--text-muted)';
                }}
              >
                <Icon name={t.icon} size={13} />
                {t.label}
                {t.id === 'requests' && pendingRequests.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 2, right: 4,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#7C4DFF', color: '#fff',
                    fontSize: 7, fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>{pendingRequests.length}</div>
                )}
              </button>
            ))}
          </div>

          {/* Preview hint */}
          <div style={{
            margin: '10px 10px 0',
            padding: '10px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="Maximize2" size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Haz clic en una tab para abrir en <strong style={{ color: 'var(--text-secondary)' }}>pantalla completa</strong>
            </span>
          </div>

          {/* Quick stats preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              RESUMEN
            </div>
            {[
              { label: 'Solicitudes', value: pendingRequests.length, icon: 'Inbox', color: '#7C4DFF', tab: 'requests' as TabId },
              { label: 'En cola', value: triageQueue.length + virtualQueue.length, icon: 'Users', color: '#1E88E5', tab: 'queue' as TabId },
              { label: 'Alertas', value: alerts.length, icon: 'Bell', color: '#F44336', tab: 'alerts' as TabId },
              { label: 'Médicos', value: doctors.length, icon: 'Stethoscope', color: '#4CAF50', tab: 'staff' as TabId },
              { label: 'Pacientes', value: stats.activePatients, icon: 'Activity', color: '#FF9800', tab: 'stats' as TabId },
            ].map((s) => (
              <div
                key={s.tab}
                onClick={() => handleTabClick(s.tab)}
                className="stat-row"
                style={{ cursor: 'pointer', borderRadius: 6, padding: '8px 4px', transition: 'background var(--transition-fast)' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={12} style={{ color: s.color }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
                  <Icon name="ChevronLeft" size={11} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom clock */}
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border-secondary)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-teal)', letterSpacing: '0.05em' }}>
              {now ? now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {now ? now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Cargando...'}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

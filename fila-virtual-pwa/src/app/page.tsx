'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { 
  Siren, 
  FlaskConical, 
  Pill, 
  Smartphone, 
  BellRing, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Tv,
  Info,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  ThumbsUp,
  Award,
  Activity,
  Check,
  Search
} from 'lucide-react';

const DEPARTMENTS = [
  { 
    id: 'EMERGENCY', 
    label: 'Urgencias', 
    description: 'Triage Manchester 24/7',
    icon: Siren, 
    color: '#EF5350', 
    limit: 100,
    prefix: 'E'
  },
  { 
    id: 'LAB', 
    label: 'Laboratorio', 
    description: 'Análisis clínicos y LIS',
    icon: FlaskConical, 
    color: '#66BB6A', 
    limit: 50,
    prefix: 'L'
  },
  { 
    id: 'PHARMACY', 
    label: 'Farmacia', 
    description: 'Dispensación de recetas',
    icon: Pill, 
    color: '#FFA726', 
    limit: 80,
    prefix: 'F'
  }
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00'
];

export default function PwaPage() {
  const [step, setStep] = useState<'welcome' | 'select_dept' | 'form' | 'ticket' | 'monitor' | 'book_appt_specialties' | 'book_appt_datetime' | 'book_appt_form' | 'book_appt_confirm'>('welcome');
  const [selectedDept, setSelectedDept] = useState<typeof DEPARTMENTS[0] | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Form fields (Queue & Appointments)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('MALE');
  const [ciPassport, setCiPassport] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Appointment specific fields
  const [apptSpecialties, setApptSpecialties] = useState<any[]>([]);
  const [selectedApptSpecialty, setSelectedApptSpecialty] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [confirmedAppt, setConfirmedAppt] = useState<any | null>(null);
  const [specialtySearch, setSpecialtySearch] = useState('');

  // Feedback fields
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Active Ticket state
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [peopleAhead, setPeopleAhead] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  // Monitor state
  const [monitorTickets, setMonitorTickets] = useState<any[]>([]);

  const supabase = createClient();

  // Load theme and ticket on mount
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('faro_theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Active Ticket
    const savedTicket = localStorage.getItem('faro_active_ticket');
    if (savedTicket) {
      try {
        const parsed = JSON.parse(savedTicket);
        setActiveTicket(parsed);
      } catch (e) {
        console.error('Error parsing saved ticket:', e);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('faro_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Recalculate people ahead and check ticket status
  const updateTicketStatus = useCallback(async (ticketId: string, deptId: string, createdAt: string) => {
    try {
      const { data: ticket, error: ticketError } = await supabase
        .from('virtual_queue')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      if (ticket) {
        setActiveTicket(ticket);
        localStorage.setItem('faro_active_ticket', JSON.stringify(ticket));

        if (ticket.status === 'ATTENDED' || ticket.status === 'CANCELLED') {
          // If we had feedback submitted, clear storage. Otherwise keep it so user can rate.
          if (ticket.status === 'CANCELLED') {
            localStorage.removeItem('faro_active_ticket');
          }
        } else {
          // Count people ahead
          const { count, error: countError } = await supabase
            .from('virtual_queue')
            .select('*', { count: 'exact', head: true })
            .eq('department', deptId)
            .eq('status', 'WAITING')
            .lt('created_at', createdAt)
            .gte('created_at', new Date().toISOString().split('T')[0]);

          if (countError) throw countError;
          setPeopleAhead(count || 0);
        }
      }
    } catch (err) {
      console.error('Error updating queue status:', err);
    }
  }, [supabase]);

  // Fetch all tickets for Waiting Room Monitor
  const fetchMonitorTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_queue')
        .select('*')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setMonitorTickets(data || []);
    } catch (err) {
      console.error('Error fetching monitor data:', err);
    }
  }, [supabase]);

  // Fetch booking specialties with active doctors
  const fetchBookingSpecialties = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_booking_specialties');
      if (error) throw error;
      setApptSpecialties(data || []);
    } catch (err: any) {
      console.error('Error fetching booking specialties:', err);
      // Fallback in case of DB issues
      setApptSpecialties([
        { id: 'ffad3c40-119c-433f-bf9d-de34d7fe1ce2', name: 'Cardiología', code: 'CARD', color: '#F44336' },
        { id: 'ead469f6-e84e-41f9-8036-b8d77f022e69', name: 'Pediatría', code: 'PED', color: '#FF9800' },
        { id: '92add572-1e0d-4d41-9e7a-c1300ae1b76e', name: 'Medicina Interna', code: 'MINT', color: '#1E88E5' },
        { id: '6fa57cf2-db4e-4b41-887d-61a4060a745e', name: 'Otorrinolaringología', code: 'ORL', color: '#8BC34A' }
      ]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Real-time listener for ticket monitor & active status
  useEffect(() => {
    if (step === 'monitor' || step === 'welcome') {
      fetchMonitorTickets();
    }

    const channel = supabase
      .channel('pwa_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'virtual_queue',
        },
        (payload: any) => {
          console.log('[Realtime] Cambio detectado:', payload);
          
          // Trigger vibration if active ticket was called
          if (
            activeTicket &&
            payload.new && 
            payload.new.id === activeTicket.id && 
            payload.new.status === 'CALLED' && 
            activeTicket.status !== 'CALLED'
          ) {
            triggerVibration();
          }

          // Refresh active ticket status if matching
          if (activeTicket && payload.new && payload.new.id === activeTicket.id) {
            updateTicketStatus(activeTicket.id, activeTicket.department, activeTicket.created_at);
          } else if (activeTicket) {
            updateTicketStatus(activeTicket.id, activeTicket.department, activeTicket.created_at);
          }

          // Always refresh monitor view
          fetchMonitorTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, activeTicket, fetchMonitorTickets, updateTicketStatus, supabase]);

  const triggerVibration = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  };

  const handleSelectDept = (dept: typeof DEPARTMENTS[0]) => {
    setSelectedDept(dept);
    setErrorMsg(null);
    setStep('form');
  };

  const handleClaimToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.rpc('register_and_claim_token', {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_birth_date: birthDate,
        p_gender: gender,
        p_ci_passport: ciPassport.trim(),
        p_phone: phone.trim(),
        p_email: email.trim() || null,
        p_department: selectedDept.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const ticket = data[0];
        setActiveTicket(ticket);
        setUserRating(0);
        setFeedbackComments('');
        setFeedbackSubmitted(false);
        localStorage.setItem('faro_active_ticket', JSON.stringify(ticket));
        setStep('ticket');
        triggerVibration();
      } else {
        throw new Error('No se pudo generar el turno.');
      }
    } catch (err: any) {
      console.error('Error claiming token:', err);
      setErrorMsg(err.message || 'Error en el servidor al emitir el turno.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicket = async () => {
    if (!activeTicket) return;
    if (!confirm('¿Estás seguro de que deseas cancelar tu turno?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('virtual_queue')
        .update({ status: 'CANCELLED' })
        .eq('id', activeTicket.id);

      if (error) throw error;

      localStorage.removeItem('faro_active_ticket');
      setActiveTicket(null);
      setStep('welcome');
    } catch (err: any) {
      alert('Error al cancelar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!activeTicket || userRating === 0) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('virtual_queue')
        .update({
          rating: userRating,
          feedback_comments: feedbackComments.trim() || null,
          feedback_submitted_at: new Date().toISOString()
        })
        .eq('id', activeTicket.id);

      if (error) throw error;
      setFeedbackSubmitted(true);
      setTimeout(() => {
        localStorage.removeItem('faro_active_ticket');
        setActiveTicket(null);
        setStep('welcome');
      }, 2500);
    } catch (err: any) {
      alert('Error al enviar valoración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptSpecialty || !selectedDate || !selectedTime) return;

    setLoading(true);
    setErrorMsg(null);

    // Build starts_at timestamptz string (ISO format in local time)
    const startTimestamp = `${selectedDate}T${selectedTime}:00`;

    try {
      const { data, error } = await supabase.rpc('register_and_book_appointment', {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_birth_date: birthDate,
        p_gender: gender,
        p_ci_passport: ciPassport.trim(),
        p_phone: phone.trim(),
        p_email: email.trim() || null,
        p_specialty_id: selectedApptSpecialty.id,
        p_starts_at: startTimestamp
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setConfirmedAppt(data[0]);
        setStep('book_appt_confirm');
      } else {
        throw new Error('No se pudo confirmar la cita médica.');
      }
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      setErrorMsg(err.message || 'Error en el servidor al agendar la cita.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNew = () => {
    localStorage.removeItem('faro_active_ticket');
    setActiveTicket(null);
    setSelectedDept(null);
    setErrorMsg(null);
    setStep('select_dept');
  };

  const manualRefresh = async () => {
    if (!activeTicket) return;
    setRefreshing(true);
    await updateTicketStatus(activeTicket.id, activeTicket.department, activeTicket.created_at);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Get tomorrow's date string for input min attribute
  const getTomorrowString = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  };

  return (
    <main className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full px-4 py-6 transition-colors duration-300">
      {/* Dynamic Header */}
      <header className="flex items-center justify-between border-b border-[var(--header-border)] pb-4 mb-6 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E88E5] to-[#00BCD4] flex items-center justify-center shadow-lg transform hover:rotate-6 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-[var(--foreground)]">FARO FILA VIRTUAL</h1>
            <p className="text-[9px] text-[#556B8D] dark:text-[#8AA3C8] font-bold tracking-wider uppercase">San Juan de Dios</p>
          </div>
        </div>
        
        {/* Actions Menu */}
        <div className="flex items-center gap-2">
          {/* Day/Night Toggler */}
          <button 
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] flex items-center justify-center text-[var(--foreground)] transition-all shadow-md active:scale-95 cursor-pointer"
            title="Cambiar Modo Día/Noche"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-800" />}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--badge-bg)] border border-[var(--card-border)]">
            <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
            <span className="text-[10px] font-bold text-[var(--badge-text)] uppercase tracking-wider">PWA</span>
          </div>
        </div>
      </header>

      {/* STEP 1: Welcome Portal / Dashboard */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col justify-center animate-fade-in space-y-4">
          
          {/* Hospital Presentation Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E88E5] to-[#00BCD4] text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-15">
              <ShieldCheck className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <span className="text-[9px] font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded-full uppercase">PORTAL DEL PACIENTE</span>
              <h2 className="text-[17px] font-black mt-1.5 leading-tight">Hospital San Juan de Dios</h2>
              <p className="text-[11px] text-white/80 mt-0.5">Admisión digital para turnos rápidos en tiempo real.</p>
              
              <div className="mt-3 flex items-center gap-1.5 bg-black/10 border border-white/10 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>Atención Fluida Hoy · Espera prom. 10m</span>
              </div>
            </div>
          </div>

          {/* Active Ticket Banner Shortcut */}
          {activeTicket && (
            <button 
              onClick={() => setStep('ticket')}
              className="w-full p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-between transition-all shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <BellRing className="w-4 h-4 text-amber-500 animate-swing" />
                <div className="text-left">
                  <div className="text-[11px] font-black">
                    {activeTicket.status === 'ATTENDED' ? 'VALORAR ATENCIÓN COMPLETADA' : 'TIENES UN TICKET ACTIVO'}
                  </div>
                  <div className="text-[9px] opacity-80">
                    {activeTicket.status === 'ATTENDED' 
                      ? 'Ayúdanos con tu opinión del servicio' 
                      : `Turno ${activeTicket.token_number} · Pulsa para ver estado`}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Main Actions Options */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Solicitar Turno Button */}
            <button
              onClick={() => setStep('select_dept')}
              className="p-4 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] shadow-md transition-all flex flex-col items-start text-left group active:scale-[0.99] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#EF5350]/15 to-[#F44336]/15 flex items-center justify-center text-[#EF5350] mb-2.5">
                <Activity className="w-5 h-5 text-[#EF5350]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">Unirse a Fila</h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-snug">Saca tu ticket digital y espera en vivo</p>
              </div>
            </button>

            {/* Agendar Cita Médica (Doctoralia Style) */}
            <button
              onClick={() => {
                fetchBookingSpecialties();
                setStep('book_appt_specialties');
              }}
              className="p-4 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] shadow-md transition-all flex flex-col items-start text-left group active:scale-[0.99] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1E88E5]/15 to-[#00BCD4]/15 flex items-center justify-center text-[#1E88E5] mb-2.5">
                <Calendar className="w-5 h-5 text-[#1E88E5] dark:text-[#00BCD4]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">Reservar Cita</h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-snug">Agenda consulta médica de especialista</p>
              </div>
            </button>

            {/* Ver Monitor de Sala Button */}
            <button
              onClick={() => setStep('monitor')}
              className="col-span-2 p-3.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] shadow-md transition-all flex items-center justify-between text-left group active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#66BB6A]/15 to-[#4CAF50]/15 flex items-center justify-center text-[#66BB6A]">
                  <Tv className="w-4 h-4 text-[#66BB6A]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">Ver Monitor de Sala</h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Sigue los turnos llamados en pantalla gigante</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#66BB6A] transition-colors" />
            </button>
          </div>

          {/* Hospital Information Blocks */}
          <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md space-y-3">
            <h4 className="text-[11px] font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#1E88E5]" />
              Información del Hospital
            </h4>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)]">
                <div className="flex items-center gap-1.5 text-[#1E88E5] text-[9px] font-extrabold uppercase">
                  <Calendar className="w-3 h-3" />
                  Horarios
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5">Lunes a Domingo<br />Consulta: 7:00 - 20:00</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)]">
                <div className="flex items-center gap-1.5 text-[#66BB6A] text-[9px] font-extrabold uppercase">
                  <MapPin className="w-3 h-3" />
                  Ubicación
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5">Av. Centenario<br />Primer Anillo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Select Department */}
      {step === 'select_dept' && (
        <div className="flex-1 flex flex-col justify-center animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setStep('welcome')}
              className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
            >
              &larr; Volver al Inicio
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)]">Elige el Servicio</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Selecciona el área donde deseas realizar tu atención o análisis clínico.
            </p>
          </div>

          <div className="space-y-4">
            {DEPARTMENTS.map((dept) => {
              const IconComp = dept.icon;
              return (
                <button
                  key={dept.id}
                  onClick={() => handleSelectDept(dept)}
                  className="w-full text-left p-5 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] transition-all duration-300 shadow-md flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{ backgroundColor: `${dept.color}15` }}
                    >
                      <IconComp className="w-6 h-6" style={{ color: dept.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--foreground)]">{dept.label}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{dept.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[#00BCD4] transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Admission Form */}
      {step === 'form' && selectedDept && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => setStep('select_dept')}
                className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
              >
                &larr; Volver
              </button>
              <div className="h-4 w-px bg-[rgba(255,255,255,0.15)]" />
              <span className="text-xs text-[var(--text-muted)] font-bold">
                Servicio: <span style={{ color: selectedDept.color }}>{selectedDept.label}</span>
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-black text-[var(--foreground)]">Datos del Paciente</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Ingresa tus datos válidos para registrar tu ticket en el sistema.</p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-4 rounded-xl bg-[rgba(244,67,54,0.1)] border border-[rgba(244,67,54,0.25)] flex gap-3 items-start animate-pulse">
                <AlertCircle className="w-5 h-5 text-[#EF5350] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#EF5350]">No se pudo emitir el turno</h4>
                  <p className="text-xs text-[#EF5350]/80 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleClaimToken} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Nombre</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    placeholder="Ej. Juan" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Apellidos</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    placeholder="Ej. Pérez" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">DNI / Pasaporte / Cédula</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all font-mono"
                  placeholder="Ej. 12345678" 
                  value={ciPassport} 
                  onChange={e => setCiPassport(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    value={birthDate} 
                    onChange={e => setBirthDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Género</label>
                  <select 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                  >
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Femenino</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Número de Teléfono</label>
                <input 
                  type="tel" 
                  required 
                  className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                  placeholder="Ej. +1 555-0199" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Correo Electrónico (Opcional)</label>
                <input 
                  type="email" 
                  className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                  placeholder="Ej. correo@sjdios.org" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white font-extrabold text-sm tracking-wide shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-6 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Procesando Turno...' : 'Generar Ficha Virtual'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 4: Ticket Details / Countdown */}
      {step === 'ticket' && activeTicket && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setStep('welcome')}
                className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
              >
                &larr; Volver al Portal
              </button>
            </div>

            {/* Ticket Card */}
            <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl relative overflow-hidden text-center">
              {/* Dynamic Glow Line */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ 
                  background: activeTicket.status === 'CALLED' 
                    ? 'linear-gradient(90deg, #EF5350, #FFA726)' 
                    : activeTicket.status === 'ATTENDED'
                    ? 'linear-gradient(90deg, #66BB6A, #4CAF50)'
                    : 'linear-gradient(90deg, #1E88E5, #00BCD4)' 
                }}
              />

              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase">FICHA HOSPITALARIA</span>
                {activeTicket.status !== 'ATTENDED' && (
                  <button 
                    onClick={manualRefresh}
                    disabled={refreshing}
                    className="p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] text-[#00BCD4] active:scale-95 transition-transform cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              <div className="text-xs text-[var(--text-muted)] font-semibold mt-2">
                DEPARTAMENTO DE{' '}
                <span className="font-extrabold uppercase" style={{ color: DEPARTMENTS.find(d => d.id === activeTicket.department)?.color }}>
                  {DEPARTMENTS.find(d => d.id === activeTicket.department)?.label}
                </span>
              </div>

              {/* Huge Ticket Code */}
              <div className="my-6">
                <div className="text-6xl font-black tracking-tighter text-[var(--foreground)] font-mono drop-shadow-[0_4px_6px_rgba(0,0,0,0.08)]">
                  {activeTicket.token_number}
                </div>
                <div className="text-[9px] font-mono text-[var(--text-muted)] mt-2">ID: {activeTicket.id}</div>
              </div>

              {/* Status Section */}
              <div className="py-4 border-t border-b border-[var(--card-border)] my-4">
                {activeTicket.status === 'WAITING' && (
                  <div className="flex flex-col items-center">
                    <span className="px-3 py-1 rounded-full bg-[rgba(30,136,229,0.1)] text-[#1E88E5] font-extrabold text-xs flex items-center gap-1.5 border border-[rgba(30,136,229,0.2)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1E88E5] animate-ping" />
                      ESPERANDO EN COLA
                    </span>
                    <div className="mt-4">
                      <div className="text-3xl font-black text-[var(--foreground)]">{peopleAhead}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">Personas por delante</div>
                    </div>
                  </div>
                )}

                {activeTicket.status === 'CALLED' && (
                  <div className="flex flex-col items-center py-2 animate-bounce">
                    <span className="px-4 py-2 rounded-full bg-[rgba(239,83,80,0.15)] text-[#EF5350] font-extrabold text-sm flex items-center gap-2 border border-[rgba(239,83,80,0.3)] shadow-md">
                      <BellRing className="w-4 h-4 text-[#EF5350] animate-swing" />
                      ¡SU TURNO FUE LLAMADO!
                    </span>
                    <p className="text-xs text-[var(--foreground)] mt-3 font-bold leading-relaxed">
                      Por favor, diríjase al módulo de atención de forma inmediata.
                    </p>
                  </div>
                )}

                {activeTicket.status === 'ATTENDED' && (
                  <div className="flex flex-col items-center py-2">
                    {feedbackSubmitted ? (
                      <div className="flex flex-col items-center text-center py-4 animate-fade-in">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 mb-3">
                          <Check className="w-6 h-6 text-green-500" />
                        </div>
                        <span className="text-sm font-black text-green-500">¡GRACIAS POR TU TIEMPO!</span>
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                          Tus respuestas nos ayudan a mejorar la atención. Retornando al portal...
                        </p>
                      </div>
                    ) : (
                      <div className="w-full text-left space-y-4">
                        <span className="px-3 py-1.5 rounded-full bg-[rgba(102,187,106,0.15)] text-[#66BB6A] font-extrabold text-xs flex items-center gap-1.5 border border-[rgba(102,187,106,0.3)] mx-auto w-max">
                          <CheckCircle className="w-4 h-4 text-[#66BB6A]" />
                          ATENCIÓN COMPLETADA
                        </span>
                        
                        {/* Rating block (Doctoralia style) */}
                        <div className="p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-center space-y-3">
                          <h4 className="text-xs font-black text-[var(--foreground)]">Califica tu experiencia con nosotros</h4>
                          
                          {/* Star buttons */}
                          <div className="flex items-center justify-center gap-1.5 py-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setUserRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="focus:outline-none transition-transform active:scale-90 cursor-pointer"
                              >
                                <Star 
                                  className={`w-7 h-7 transition-colors duration-150 ${
                                    star <= (hoverRating || userRating)
                                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                                      : 'text-[var(--text-muted)]'
                                  }`} 
                                />
                              </button>
                            ))}
                          </div>

                          <textarea
                            className="w-full p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all resize-none h-20"
                            placeholder="Escribe un comentario sobre el servicio médico (opcional)..."
                            value={feedbackComments}
                            onChange={(e) => setFeedbackComments(e.target.value)}
                          />

                          <button
                            onClick={handleSendFeedback}
                            disabled={loading || userRating === 0}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#66BB6A] to-[#4CAF50] text-white font-extrabold text-xs tracking-wider uppercase shadow-md hover:brightness-110 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                            Enviar Valoración
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTicket.status === 'CANCELLED' && (
                  <div className="flex flex-col items-center py-2">
                    <span className="px-3 py-1.5 rounded-full bg-[rgba(239,83,80,0.1)] text-[#EF5350] font-extrabold text-xs flex items-center gap-1.5 border border-[rgba(239,83,80,0.2)]">
                      <AlertCircle className="w-4 h-4 text-[#EF5350]" />
                      TURNO CANCELADO
                    </span>
                    <p className="text-xs text-[var(--text-muted)] mt-3">
                      Este ticket ha sido cancelado y ya no es válido.
                    </p>
                  </div>
                )}
              </div>

              {/* Patient details */}
              <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] px-1">
                <span>Cédula: <strong className="text-[var(--foreground)] font-mono">{activeTicket.patient_dni}</strong></span>
                <span>Paciente: <strong className="text-[var(--foreground)]">{activeTicket.patient_name}</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {(activeTicket.status === 'WAITING' || activeTicket.status === 'CALLED') && (
                <button
                  onClick={handleCancelTicket}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/30 text-[#EF5350] font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancelar Turno Virtual
                </button>
              )}

              {activeTicket.status === 'CANCELLED' && (
                <button
                  onClick={handleRequestNew}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white font-extrabold text-sm tracking-wide shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Solicitar un Nuevo Turno
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Live Waiting Room Monitor */}
      {step === 'monitor' && (
        <div className="flex-1 flex flex-col justify-start animate-fade-in space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setStep('welcome')}
              className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
            >
              &larr; Volver al Portal
            </button>
            <span className="text-[10px] font-bold text-[#6BBF70] bg-[#6BBF70]/10 border border-[#6BBF70]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6BBF70] animate-ping" />
              SALA EN VIVO
            </span>
          </div>

          <div className="text-left">
            <h2 className="text-xl font-black text-[var(--foreground)]">Pantalla de Turnos Llamados</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Monitor de atención en tiempo real sincronizado con consultorios.</p>
          </div>

          {/* Department Main Grid (Shows last called ticket for each) */}
          <div className="grid grid-cols-3 gap-3">
            {DEPARTMENTS.map(dept => {
              const IconComp = dept.icon;
              const lastCalled = monitorTickets.find(t => t.department === dept.id && t.status === 'CALLED');
              return (
                <div 
                  key={dept.id} 
                  className="p-4 rounded-xl border flex flex-col items-center justify-between text-center transition-all duration-300"
                  style={{ 
                    backgroundColor: 'var(--card-bg)',
                    borderColor: lastCalled ? dept.color : 'var(--card-border)',
                    boxShadow: lastCalled ? `0 0 12px ${dept.color}20` : 'var(--shadow)'
                  }}
                >
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${dept.color}12` }}>
                    <IconComp className="w-5 h-5" style={{ color: dept.color }} />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase mt-2" style={{ color: dept.color }}>{dept.label}</span>
                  
                  <div className="text-2xl font-black font-mono text-[var(--foreground)] my-2">
                    {lastCalled ? lastCalled.token_number : '---'}
                  </div>

                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)]">
                    {lastCalled ? 'LLAMADO' : 'SIN LLAMAR'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recent Queue Table */}
          <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md text-left flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[var(--foreground)] mb-3 pb-2 border-b border-[var(--card-border)]">
                Cola Reciente (Hoy)
              </h4>
              
              {monitorTickets.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No hay turnos registrados el día de hoy.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {monitorTickets.map((ticket, index) => {
                    const dept = DEPARTMENTS.find(d => d.id === ticket.department);
                    return (
                      <div 
                        key={ticket.id} 
                        className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold font-mono text-[var(--foreground)]">
                            {ticket.token_number}
                          </span>
                          <div className="h-4 w-px bg-[var(--card-border)]" />
                          <div>
                            <div className="text-[10px] font-bold text-[var(--foreground)] truncate max-w-[120px]">{ticket.patient_name}</div>
                            <div className="text-[8px] font-bold uppercase" style={{ color: dept?.color }}>{dept?.label}</div>
                          </div>
                        </div>

                        {/* Status pill */}
                        {ticket.status === 'WAITING' && (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[#1E88E5]/10 text-[#1E88E5] border border-[#1E88E5]/20">ESPERANDO</span>
                        )}
                        {ticket.status === 'CALLED' && (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">LLAMADO</span>
                        )}
                        {ticket.status === 'ATTENDED' && (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">ATENDIDO</span>
                        )}
                        {ticket.status === 'CANCELLED' && (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">CANCELADO</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <p className="text-[9px] text-[var(--text-muted)] italic text-center mt-4">
              * La pantalla se actualiza en tiempo real de forma automática.
            </p>
          </div>
        </div>
      )}

      {/* APPOINTMENT STEP 1: Select Specialty */}
      {step === 'book_appt_specialties' && (
        <div className="flex-1 flex flex-col justify-start animate-fade-in space-y-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setStep('welcome')}
              className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
            >
              &larr; Volver al Portal
            </button>
          </div>

          <div className="text-left">
            <h2 className="text-lg font-black text-[var(--foreground)]">Selecciona la Especialidad</h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-semibold">Elige la rama de la medicina para tu consulta médica programada.</p>
          </div>

          {/* Search Specialty Filter Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar especialidad (ej. Cardiología)..."
              value={specialtySearch}
              onChange={(e) => setSpecialtySearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00BCD4] transition-all"
            />
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#00BCD4]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {(() => {
                const filtered = apptSpecialties.filter(spec => 
                  spec.name.toLowerCase().includes(specialtySearch.toLowerCase()) ||
                  (spec.code && spec.code.toLowerCase().includes(specialtySearch.toLowerCase()))
                );
                
                if (filtered.length === 0) {
                  return (
                    <div className="col-span-2 text-center py-10 text-xs text-[var(--text-muted)] font-semibold">
                      No se encontraron especialidades que coincidan con la búsqueda.
                    </div>
                  );
                }

                return filtered.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setSelectedApptSpecialty(spec);
                      setStep('book_appt_datetime');
                    }}
                    className="w-full text-left p-3 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] shadow-sm transition-all flex items-center gap-2.5 group cursor-pointer active:scale-[0.99]"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[8px] text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: spec.color || '#1E88E5' }}
                    >
                      {spec.code || spec.name.substring(0,3).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-[12px] text-[var(--foreground)] truncate leading-tight group-hover:text-[#00BCD4] transition-colors">
                        {spec.name}
                      </h3>
                      <p className="text-[9px] text-[var(--text-muted)] font-semibold truncate mt-0.5">Consultorio Disp.</p>
                    </div>
                  </button>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENT STEP 2: Select Date & Time Slot */}
      {step === 'book_appt_datetime' && selectedApptSpecialty && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => setStep('book_appt_specialties')}
                className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
              >
                &larr; Volver
              </button>
              <div className="h-4 w-px bg-[rgba(255,255,255,0.15)]" />
              <span className="text-xs text-[var(--text-muted)] font-bold">
                Especialidad: <span style={{ color: selectedApptSpecialty.color }}>{selectedApptSpecialty.name}</span>
              </span>
            </div>

            <div className="text-left mb-6">
              <h2 className="text-xl font-black text-[var(--foreground)]">Fecha y Hora de la Cita</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Escoge el día y la franja horaria que mejor se adapten a ti.</p>
            </div>

            <div className="space-y-5">
              {/* Date Input */}
              <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm space-y-2">
                <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider">1. Elige una fecha (desde mañana)</label>
                <input 
                  type="date"
                  required
                  min={getTomorrowString()}
                  className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all font-semibold"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Time Slots (Only enabled if date selected) */}
              {selectedDate && (
                <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm space-y-3">
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider">2. Selecciona un horario disponible</label>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          selectedTime === slot
                            ? 'bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] border-transparent text-white shadow-md'
                            : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--card-hover)]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedDate && selectedTime && (
            <button
              onClick={() => setStep('book_appt_form')}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white font-extrabold text-sm tracking-wide shadow-lg hover:brightness-110 active:scale-[0.98] transition-all mt-6 flex items-center justify-center gap-2 cursor-pointer"
            >
              Continuar al Formulario &rarr;
            </button>
          )}
        </div>
      )}

      {/* APPOINTMENT STEP 3: Admission Form */}
      {step === 'book_appt_form' && selectedApptSpecialty && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => setStep('book_appt_datetime')}
                className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
              >
                &larr; Volver
              </button>
              <div className="h-4 w-px bg-[rgba(255,255,255,0.15)]" />
              <span className="text-xs text-[var(--text-muted)] font-bold">
                Cita: <span style={{ color: selectedApptSpecialty.color }}>{selectedApptSpecialty.name}</span> el {selectedDate} ({selectedTime})
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-black text-[var(--foreground)]">Identificación del Paciente</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Completa el formulario para registrar la cita médica a tu nombre.</p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-4 rounded-xl bg-[rgba(244,67,54,0.1)] border border-[rgba(244,67,54,0.25)] flex gap-3 items-start animate-pulse">
                <AlertCircle className="w-5 h-5 text-[#EF5350] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#EF5350]">No se pudo programar la cita</h4>
                  <p className="text-xs text-[#EF5350]/80 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Nombre</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    placeholder="Ej. Juan" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Apellidos</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    placeholder="Ej. Pérez" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">DNI / Pasaporte / Cédula</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all font-mono"
                  placeholder="Ej. 12345678" 
                  value={ciPassport} 
                  onChange={e => setCiPassport(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    value={birthDate} 
                    onChange={e => setBirthDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Género</label>
                  <select 
                    className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                    value={gender} 
                    onChange={e => setGender(e.target.value)}
                  >
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Femenino</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Número de Teléfono</label>
                <input 
                  type="tel" 
                  required 
                  className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                  placeholder="Ej. +1 555-0199" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Correo Electrónico (Opcional)</label>
                <input 
                  type="email" 
                  className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                  placeholder="Ej. correo@sjdios.org" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white font-extrabold text-sm tracking-wide shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-6 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Confirmando Reserva...' : 'Confirmar Cita Médica'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* APPOINTMENT STEP 4: Confirmation screen */}
      {step === 'book_appt_confirm' && confirmedAppt && selectedApptSpecialty && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in text-center">
          <div className="space-y-6 py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 mx-auto shadow-md">
              <Check className="w-8 h-8 text-green-500 animate-pulse" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[var(--foreground)]">Cita Agendada con Éxito</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">Tu consulta ha sido confirmada en el sistema Faro HIS.</p>
            </div>

            {/* Ticket Card Info */}
            <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl relative text-left space-y-4">
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: selectedApptSpecialty.color || '#1E88E5' }}
              />

              <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] pb-2 border-b border-[var(--card-border)]">
                <span>COMPROBANTE DE CITA</span>
                <span className="font-mono text-[var(--foreground)]">ID: {confirmedAppt.appointment_id.substring(0,8).toUpperCase()}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Especialidad</span>
                  <div className="text-sm font-extrabold text-[var(--foreground)] flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedApptSpecialty.color || '#1E88E5' }} />
                    {selectedApptSpecialty.name}
                  </div>
                </div>

                <div>
                  <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Médico Asignado</span>
                  <div className="text-sm font-black text-[var(--foreground)] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    {confirmedAppt.professional_name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Fecha</span>
                    <div className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#1E88E5]" />
                      {selectedDate}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Hora</span>
                    <div className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00BCD4]" />
                      {selectedTime}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[var(--card-border)] flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)] font-semibold">Nro de Historial (MRN)</span>
                  <span className="font-mono font-black text-[var(--foreground)] bg-[var(--input-bg)] border border-[var(--card-border)] px-2 py-0.5 rounded">{confirmedAppt.patient_mrn}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 text-left">
              <Info className="w-5 h-5 text-[#1E88E5] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Hemos enviado un comprobante de confirmación a tu teléfono y correo. Por favor, preséntate en el módulo de recepción 15 minutos antes de la hora acordada.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmedAppt(null);
              setSelectedApptSpecialty(null);
              setSelectedDate('');
              setSelectedTime('');
              setStep('welcome');
            }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white font-extrabold text-sm tracking-wide shadow-lg hover:brightness-110 transition-all cursor-pointer"
          >
            Volver al Portal Principal
          </button>
        </div>
      )}

      {/* Footer / Info */}
      <footer className="text-center text-[10px] text-[#4A6080] dark:text-[#8AA3C8] border-t border-[rgba(139,163,200,0.06)] pt-4 mt-6">
        Hospital San Juan de Dios · Project Faro v2.4 · FHIR Compliant
      </footer>
    </main>
  );
}

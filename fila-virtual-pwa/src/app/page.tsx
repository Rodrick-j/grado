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
  Search,
  Stethoscope,
  CalendarCheck,
  Video,
  User,
  X
} from 'lucide-react';
import PatientTelemedicine from '@/components/PatientTelemedicine';
import BottomNav from '@/components/BottomNav';

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
  const [step, setStep] = useState<'splash' | 'welcome' | 'select_dept' | 'form' | 'ticket' | 'monitor' | 'book_appt_specialties' | 'book_appt_datetime' | 'book_appt_form' | 'book_appt_confirm' | 'telemedicina'>('splash');
  const [currentTab, setCurrentTab] = useState<'home' | 'servicios' | 'monitor' | 'perfil'>('home');
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
  
  // Professional Medical Record Fields
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bloodType, setBloodType] = useState('UNKNOWN');
  
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

  // Ambulance request states
  const [showAmbulanceModal, setShowAmbulanceModal] = useState(false);
  const [ambulanceTriageLevel, setAmbulanceTriageLevel] = useState<'RED' | 'ORANGE' | 'YELLOW' | null>(null);
  const [ambulanceComplaint, setAmbulanceComplaint] = useState('');
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [sendingAmbulanceReq, setSendingAmbulanceReq] = useState(false);
  const [ambulanceSuccess, setAmbulanceSuccess] = useState(false);
  const [isLeveCase, setIsLeveCase] = useState(false);

  const supabase = createClient();

  // Load theme and ticket on mount
  useEffect(() => {
    // Prefill patient data if previously saved
    const savedFN = localStorage.getItem('faro_patient_firstName') || '';
    const savedLN = localStorage.getItem('faro_patient_lastName') || '';
    const savedCI = localStorage.getItem('faro_patient_ci') || '';
    const savedPhone = localStorage.getItem('faro_patient_phone') || '';
    const savedBD = localStorage.getItem('faro_patient_birthDate') || '';
    if (savedFN) setFirstName(savedFN);
    if (savedLN) setLastName(savedLN);
    if (savedCI) setCiPassport(savedCI);
    if (savedPhone) setPhone(savedPhone);
    if (savedBD) setBirthDate(savedBD);

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

  const handleAmbulanceClick = () => {
    setGpsError(null);
    setGpsLocation(null);
    setAmbulanceSuccess(false);
    setAmbulanceTriageLevel(null);
    setAmbulanceComplaint('');
    setIsLeveCase(false);
    
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('La geolocalización no está soportada por su navegador.');
      setShowAmbulanceModal(true);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setShowAmbulanceModal(true);
      },
      (error) => {
        let msg = 'Error al obtener ubicación.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permiso de ubicación denegado. Active el GPS para despachar la ambulancia a su posición exacta.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Señal de GPS no disponible en este momento.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tiempo de espera agotado al obtener ubicación GPS.';
        }
        setGpsError(msg);
        setShowAmbulanceModal(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSendAmbulanceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpsLocation) {
      alert('Se requiere ubicación GPS válida para despachar la ambulancia.');
      return;
    }
    if (!ambulanceTriageLevel) {
      alert('Por favor seleccione la gravedad de su emergencia.');
      return;
    }
    if (!firstName || !lastName || !ciPassport || !phone || !birthDate) {
      alert('Por favor complete todos sus datos de identificación para el registro de emergencia.');
      return;
    }

    setSendingAmbulanceReq(true);
    try {
      const { data, error } = await supabase.rpc('register_and_request_ambulance', {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_birth_date: birthDate,
        p_gender: gender,
        p_ci_passport: ciPassport.trim(),
        p_phone: phone.trim(),
        p_email: email.trim() || null,
        p_latitude: gpsLocation.latitude,
        p_longitude: gpsLocation.longitude,
        p_triage_level: ambulanceTriageLevel,
        p_chief_complaint: ambulanceComplaint.trim() || `Código Emergencia: ${ambulanceTriageLevel}`
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setAmbulanceSuccess(true);
        // Prefill forms for future calls
        localStorage.setItem('faro_patient_firstName', firstName);
        localStorage.setItem('faro_patient_lastName', lastName);
        localStorage.setItem('faro_patient_ci', ciPassport);
        localStorage.setItem('faro_patient_phone', phone);
        localStorage.setItem('faro_patient_birthDate', birthDate);
      } else {
        throw new Error('Error al procesar solicitud de ambulancia.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error al enviar la solicitud: ' + (err.message || err));
    } finally {
      setSendingAmbulanceReq(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptSpecialty || !selectedDate || !selectedTime) return;

    setLoading(true);
    setErrorMsg(null);

    // Build starts_at timestamptz string (ISO format in local time)
    const startTimestamp = `${selectedDate}T${selectedTime}:00`;

    // Age Validation: Must be >= 18
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    if (age < 18) {
      setErrorMsg('Error: Solo las personas mayores de 18 años pueden agendar citas por este medio. Contacte a recepción para pacientes pediátricos.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('register_and_book_appointment', {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_birth_date: birthDate,
        p_gender: gender,
        p_ci_passport: ciPassport.trim(),
        p_phone: phone.trim(),
        p_email: email.trim() || null,
        p_address_line1: addressLine1.trim() || null,
        p_city: city.trim() || null,
        p_emergency_name: emergencyName.trim() || null,
        p_emergency_phone: emergencyPhone.trim() || null,
        p_blood_type: bloodType,
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
    <main className="flex flex-col h-[100dvh] max-w-md mx-auto w-full bg-transparent overflow-hidden relative transition-colors duration-300">
      <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar px-4 pt-4 pb-[90px]">
      
      {/* STEP 0: Splash / Landing Screen */}
      {step === 'splash' && (
        <div className="absolute inset-0 z-[100] flex flex-col justify-between bg-black overflow-hidden sm:rounded-none">
          <img 
            src="/landing-bg.png" 
            alt="Fondo" 
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          
          {/* Top content: Hospital Name */}
          <div className="relative z-10 w-full p-8 pt-12 text-center drop-shadow-md">
            <h2 className="text-white/80 text-sm font-extrabold uppercase tracking-[0.2em] mb-2">Hospital</h2>
            <h1 className="text-white text-4xl font-black leading-none tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">San Juan<br/>De Dios</h1>
            <div className="w-12 h-1 bg-[#00BCD4] mx-auto mt-6 rounded-full shadow-[0_0_10px_rgba(0,188,212,0.8)]" />
          </div>

          {/* Middle content: Features with Icons */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-6 space-y-4">
            <div className="flex items-center gap-4 bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                <Stethoscope className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-lg leading-tight">+20 Especialidades</h3>
                <p className="text-white/70 text-xs font-semibold mt-1">Cardiología, Pediatría, Neurología...</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 border border-teal-500/30">
                <CalendarCheck className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-lg leading-tight">Fichas en Línea</h3>
                <p className="text-white/70 text-xs font-semibold mt-1">Reserva y gestiona tus citas al instante.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-lg leading-tight">Atención Rápida</h3>
                <p className="text-white/70 text-xs font-semibold mt-1">Seguimiento en tiempo real sin filas.</p>
              </div>
            </div>
          </div>

          {/* Bottom content: Button */}
          <div className="relative z-10 w-full px-6 pb-12 pt-8 bg-gradient-to-t from-black via-black/80 to-transparent">
            <button 
              onClick={() => setStep('welcome')}
              className="w-full py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-extrabold text-lg tracking-wide shadow-[0_8px_32px_rgba(0,188,212,0.3)] hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Entrar al Portal <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-center text-white/40 text-[9px] mt-4 font-bold uppercase tracking-widest">Tu Salud, Nuestra Prioridad</p>
          </div>
        </div>
      )}

      {/* Dynamic Header */}
      {step !== 'splash' && (
      <header className="flex-none flex items-center justify-between pb-3 mb-4 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1E88E5] to-[#00BCD4] flex items-center justify-center shadow-[0_4px_15px_rgba(30,136,229,0.3)] transform hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold text-sm tracking-tight text-[var(--foreground)] leading-tight">FARO VIRTUAL</h1>
            <p className="text-[9px] text-[var(--text-muted)] font-bold tracking-wider uppercase">San Juan de Dios</p>
          </div>
        </div>
        
        {/* Actions Menu */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--badge-bg)] border border-[var(--card-border)] backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
            <span className="text-[9px] font-black text-[var(--badge-text)] uppercase tracking-wider">ON</span>
          </div>
        </div>
      </header>
      )}

      {/* STEP 1: Welcome Portal / Dashboard */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col justify-start animate-fade-in space-y-4">
          
          {currentTab === 'home' && (
            <div className="space-y-3 animate-slide-up">
              {/* Hospital Presentation Card */}
              <div className="p-4 rounded-[1.25rem] bg-gradient-to-tr from-[#1E88E5] to-[#00BCD4] text-white shadow-[0_8px_20px_rgba(30,136,229,0.3)] relative overflow-hidden transition-all">
                <div className="absolute right-[-20px] bottom-[-20px] opacity-10 transform -rotate-12">
                  <ShieldCheck className="w-28 h-28" />
                </div>
                <div className="relative z-10">
                  <span className="text-[8px] font-black tracking-widest bg-white/20 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full uppercase shadow-sm">PORTAL DEL PACIENTE</span>
                  <h2 className="text-[16px] font-black mt-2 leading-tight">Hospital San Juan de Dios</h2>
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

              {/* Hospital Information Blocks */}
              <div className="glass-panel p-3.5 space-y-2.5">
                <h4 className="text-[10px] font-black text-[var(--foreground)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Info className="w-3 h-3 text-[#1E88E5]" />
                  Info Rápida
                </h4>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] transition-colors hover:bg-[var(--card-hover)]">
                    <div className="flex items-center gap-1.5 text-[#1E88E5] text-[9px] font-extrabold uppercase tracking-wide">
                      <Calendar className="w-3 h-3" />
                      Horarios
                    </div>
                    <p className="text-[9px] text-[var(--text-muted)] font-semibold mt-1 leading-tight">Lun - Dom<br />7:00 - 20:00</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] transition-colors hover:bg-[var(--card-hover)]">
                    <div className="flex items-center gap-1.5 text-[#66BB6A] text-[9px] font-extrabold uppercase tracking-wide">
                      <MapPin className="w-3 h-3" />
                      Ubicación
                    </div>
                    <p className="text-[9px] text-[var(--text-muted)] font-semibold mt-1 leading-tight">Av. Centenario<br />Primer Anillo</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'servicios' && (
            <div className="space-y-4 animate-slide-up">
              <h3 className="text-[13px] font-extrabold text-[var(--foreground)] px-1 uppercase tracking-wider text-center mb-2">Servicios Disponibles</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Emergency / Ambulance Request Card */}
                <button
                  onClick={handleAmbulanceClick}
                  className="col-span-2 p-4 rounded-xl bg-gradient-to-r from-red-950/30 to-rose-900/30 hover:from-red-800/40 hover:to-rose-800/40 border border-red-500/30 shadow-[0_0_15px_rgba(244,67,54,0.15)] transition-all flex items-center justify-between text-left group active:scale-[0.99] cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-11 h-11 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30 relative">
                      <Siren className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-red-500 dark:text-red-400 leading-tight">SOLICITAR AMBULANCIA</h3>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Urgencia médica con ubicación GPS exacta</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-500 group-hover:text-red-300 transition-colors relative z-10" />
                </button>
                {/* Solicitar Turno Button */}
                <button
                  onClick={() => setStep('select_dept')}
                  className="p-4 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] shadow-md transition-all flex flex-col items-start text-left group active:scale-[0.99] cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#EF5350]/15 to-[#F44336]/15 flex items-center justify-center text-[#EF5350] mb-3">
                    <Activity className="w-5 h-5 text-[#EF5350]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">Fila Virtual</h3>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-snug">Saca tu ticket digital ahora mismo</p>
                  </div>
                </button>

                {/* Agendar Cita Médica */}
                <button
                  onClick={() => {
                    fetchBookingSpecialties();
                    setStep('book_appt_specialties');
                  }}
                  className="p-4 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--card-border)] shadow-md transition-all flex flex-col items-start text-left group active:scale-[0.99] cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1E88E5]/15 to-[#00BCD4]/15 flex items-center justify-center text-[#1E88E5] mb-3">
                    <Calendar className="w-5 h-5 text-[#1E88E5] dark:text-[#00BCD4]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--foreground)] leading-tight">Reservar Cita</h3>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-snug">Agenda consulta especialista</p>
                  </div>
                </button>

                {/* Telemedicina Button */}
                <button
                  onClick={() => setStep('telemedicina')}
                  className="col-span-2 p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-cyan-900/30 hover:from-blue-800/40 hover:to-cyan-800/40 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,188,212,0.15)] transition-all flex items-center justify-between text-left group active:scale-[0.99] cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-11 h-11 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30 relative">
                      <Video className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#0F172A]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-cyan-500 dark:text-cyan-400 leading-tight">Consultorio Virtual</h3>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Ingresar a Telemedicina en vivo</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-cyan-500 group-hover:text-cyan-300 transition-colors relative z-10" />
                </button>
              </div>
            </div>
          )}

          {currentTab === 'perfil' && (
            <div className="space-y-4 animate-slide-up">
              <h3 className="text-[13px] font-extrabold text-[var(--foreground)] px-1 uppercase tracking-wider text-center mb-2">Mi Perfil</h3>
              
              <div className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-[var(--foreground)] border border-slate-500/20">
                  <User className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[15px] text-[var(--foreground)]">Paciente Anónimo</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Usando acceso rápido</p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md divide-y divide-[var(--card-border)]">
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[var(--foreground)]">
                    <div className="w-8 h-8 rounded-lg bg-[var(--card-hover)] flex items-center justify-center">
                      {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    </div>
                    <span className="text-[12px] font-bold">Modo Oscuro</span>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${theme === 'dark' ? 'bg-[#00BCD4]' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}
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
        <div className="flex-1 flex flex-col justify-start animate-fade-in space-y-6 pb-[80px]">
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

          <div className="text-left mb-2">
            <h2 className="text-xl font-black text-[var(--foreground)]">Directorio Médico</h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 font-semibold">Encuentra a los mejores especialistas para tu atención médica.</p>
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
            <div className="grid grid-cols-2 gap-3 pb-8">
              {(() => {
                const filtered = apptSpecialties.filter(spec => 
                  spec.name.toLowerCase().includes(specialtySearch.toLowerCase()) ||
                  (spec.code && spec.code.toLowerCase().includes(specialtySearch.toLowerCase()))
                );
                
                if (filtered.length === 0) {
                  return (
                    <div className="col-span-2 text-center py-12 px-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-md">
                      <Search className="w-8 h-8 text-[var(--text-muted)] opacity-50 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-[var(--foreground)]">Sin resultados</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1">No se encontraron especialidades médicas con esa búsqueda.</p>
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
                    className="glass-panel p-3.5 flex flex-col items-center justify-center text-center gap-2 group cursor-pointer active:scale-95"
                  >
                    <div className="relative mb-1">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1E88E5]/10 to-[#00BCD4]/10 flex items-center justify-center border border-[var(--card-border)] group-hover:scale-110 transition-transform duration-300">
                        <User className="w-5 h-5 text-[#00BCD4]" />
                      </div>
                      <div 
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--card-bg)] shadow-sm"
                        style={{ backgroundColor: spec.color || '#1E88E5' }}
                      />
                    </div>
                    <div className="w-full">
                      <h3 className="font-extrabold text-[12px] text-[var(--foreground)] group-hover:text-[#00BCD4] transition-colors leading-tight line-clamp-2">
                        {spec.name}
                      </h3>
                      <div className="flex justify-center mt-1 text-amber-400">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </div>
                      <p className="text-[9px] text-[#00BCD4] bg-[#00BCD4]/10 px-1.5 py-0.5 rounded uppercase tracking-wider mt-2 font-black flex items-center justify-center gap-1 mx-auto w-fit">
                        <CalendarCheck className="w-3 h-3" /> Turnos
                      </p>
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
            <div className="flex items-center gap-3 mb-4">
              <button 
                onClick={() => setStep('book_appt_specialties')}
                className="text-xs font-bold text-[#00BCD4] hover:underline cursor-pointer"
              >
                &larr; Volver
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-black text-[var(--foreground)] leading-tight">Fecha y Hora</h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 font-semibold">Selecciona cuándo deseas ser atendido por el especialista.</p>
            </div>

            {/* Selected Specialty Summary Card */}
            <div className="mb-6 glass-panel p-4 flex items-center gap-4 relative overflow-hidden shadow-md">
              <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] transform rotate-12 pointer-events-none">
                <User className="w-24 h-24" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1E88E5]/10 to-[#00BCD4]/10 flex items-center justify-center border border-[var(--card-border)] flex-shrink-0 relative z-10">
                <User className="w-6 h-6 text-[#00BCD4]" />
                <div 
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--card-bg)] flex items-center justify-center text-[6px] font-bold text-white shadow-sm" 
                  style={{ backgroundColor: selectedApptSpecialty.color || '#1E88E5' }} 
                />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <h3 className="font-extrabold text-[15px] text-[var(--foreground)] truncate">{selectedApptSpecialty.name}</h3>
                <p className="text-[10px] text-emerald-500 mt-1.5 font-bold flex items-center gap-1.5 uppercase tracking-wider bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Asignación Automática
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Date Input */}
              <div className="glass-panel p-4 space-y-3">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-[#1E88E5] uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" /> 1. Fecha de Cita
                </label>
                <div className="relative group">
                  <input 
                    type="date"
                    required
                    min={getTomorrowString()}
                    className="w-full p-3.5 pl-11 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-sm outline-none focus:border-[#00BCD4] focus:ring-2 focus:ring-[#00BCD4]/20 transition-all font-bold cursor-pointer shadow-inner group-hover:border-[#1E88E5]/50"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime(''); // Reset time when date changes
                    }}
                  />
                  <Calendar className="w-4 h-4 text-[#1E88E5] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Time Slots (Only enabled if date selected) */}
              {selectedDate && (
                <div className="glass-panel p-4 space-y-3 animate-slide-up">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-[#00BCD4] uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" /> 2. Horario Disponible
                  </label>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2.5 rounded-xl text-[12px] font-extrabold transition-all duration-300 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                          selectedTime === slot
                            ? 'bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white shadow-[0_4px_15px_rgba(0,188,212,0.4)] scale-[1.02] border-transparent'
                            : 'bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[#00BCD4]/50 hover:bg-[#00BCD4]/5'
                        }`}
                      >
                        {selectedTime === slot && <Sparkles className="w-3 h-3" />}
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedDate && selectedTime && (
            <div className="mt-8 animate-slide-up pb-4">
              <button
                onClick={() => setStep('book_appt_form')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white font-extrabold text-sm tracking-wide shadow-[0_8px_25px_rgba(30,136,229,0.4)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">Continuar al Formulario <ChevronRight className="w-4 h-4" /></span>
              </button>
            </div>
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

              <div className="pt-4 border-t border-[var(--card-border)] mt-4">
                <h3 className="text-xs font-black text-[var(--foreground)] mb-3">Información Médica y Contacto</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Dirección</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                      placeholder="Ej. Av. Principal 123" 
                      value={addressLine1} 
                      onChange={e => setAddressLine1(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Ciudad</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                      placeholder="Ej. Santa Cruz" 
                      value={city} 
                      onChange={e => setCity(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Contacto de Emergencia</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                      placeholder="Nombre del familiar" 
                      value={emergencyName} 
                      onChange={e => setEmergencyName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Teléfono Emergencia</label>
                    <input 
                      type="tel" 
                      required 
                      className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                      placeholder="Ej. 777-12345" 
                      value={emergencyPhone} 
                      onChange={e => setEmergencyPhone(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Tipo de Sangre</label>
                    <select 
                      className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                      value={bloodType} 
                      onChange={e => setBloodType(e.target.value)}
                    >
                      <option value="UNKNOWN">Desconocido</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#556B8D] dark:text-[#8AA3C8] uppercase tracking-wider mb-1.5">Correo (Opcional)</label>
                    <input 
                      type="email" 
                      className="w-full p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] text-xs outline-none focus:border-[#00BCD4] transition-all"
                      placeholder="Ej. correo@sjdios.org" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>
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
      {(step === 'welcome' || step === 'monitor') && (
        <BottomNav 
          currentTab={step === 'monitor' ? 'monitor' : currentTab} 
          onChangeTab={(tab) => {
            if (tab === 'monitor') {
              setStep('monitor');
            } else {
              setStep('welcome');
              setCurrentTab(tab);
            }
          }} 
        />
      )}

      {/* TELEMEDICINA OVERLAY */}
      {step === 'telemedicina' && (
        <PatientTelemedicine 
          onClose={() => setStep('welcome')}
          patientName={activeTicket?.patient_name}
        />
      )}

      {/* AMBULANCE REQUEST MODAL */}
      {showAmbulanceModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0b1329] border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 text-left max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Siren className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="text-white font-extrabold text-base">Solicitud de Ambulancia</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAmbulanceModal(false)}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gpsError ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-xs text-red-400 font-semibold">{gpsError}</p>
                <button 
                  type="button"
                  onClick={handleAmbulanceClick}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg cursor-pointer mx-auto block"
                >
                  Reintentar GPS
                </button>
              </div>
            ) : ambulanceSuccess ? (
              <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border border-green-500/30">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h4 className="text-green-500 font-extrabold text-lg">¡Solicitud Enviada!</h4>
                  <p className="text-xs text-white/70 mt-2 leading-relaxed">
                    Hemos recibido sus coordenadas GPS exactas. Un despachador de emergencias médicas se está comunicando con usted a su teléfono <strong>{phone}</strong> de inmediato.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAmbulanceModal(false)}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Step 1: Select Triage Level */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-white/80 block uppercase tracking-wider">Gravedad del Caso *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAmbulanceTriageLevel('RED');
                        setIsLeveCase(false);
                      }}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        ambulanceTriageLevel === 'RED' 
                          ? 'bg-red-500/20 border-red-500 text-red-500 shadow-md scale-[1.03]' 
                          : 'bg-black/20 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 block animate-ping" />
                      <span className="text-[10px] font-black uppercase">Crítico</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setAmbulanceTriageLevel('ORANGE');
                        setIsLeveCase(false);
                      }}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        ambulanceTriageLevel === 'ORANGE' 
                          ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-md scale-[1.03]' 
                          : 'bg-black/20 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block" />
                      <span className="text-[10px] font-black uppercase">Grave</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setAmbulanceTriageLevel(null);
                        setIsLeveCase(true);
                      }}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        isLeveCase 
                          ? 'bg-green-500/20 border-green-500 text-green-500 shadow-md scale-[1.03]' 
                          : 'bg-black/20 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" />
                      <span className="text-[10px] font-black uppercase">Leve</span>
                    </button>
                  </div>
                </div>

                {isLeveCase ? (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-3">
                    <Info className="w-6 h-6 text-green-500 mx-auto" />
                    <p className="text-xs text-green-400 font-semibold leading-relaxed">
                      Los casos leves no califican para despacho de ambulancia médica. Le sugerimos agendar una consulta normal o ingresar al Consultorio Virtual de Telemedicina.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAmbulanceModal(false);
                          fetchBookingSpecialties();
                          setStep('book_appt_specialties');
                        }}
                        className="flex-1 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-600 text-center"
                      >
                        Reservar Cita
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAmbulanceModal(false);
                          setStep('telemedicina');
                        }}
                        className="flex-1 py-2 bg-cyan-500 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-cyan-600 text-center"
                      >
                        Telemedicina
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Patient identity fields */}
                    <div className="space-y-3 border-t border-white/10 pt-3">
                      <label className="text-[10px] font-extrabold text-white/40 block uppercase tracking-wider">Identificación del Afectado</label>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-white/60 block mb-1">Nombre *</label>
                          <input 
                            type="text" 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                            placeholder="Nombre"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/60 block mb-1">Apellido *</label>
                          <input 
                            type="text" 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                            placeholder="Apellido"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-white/60 block mb-1">Documento CI *</label>
                          <input 
                            type="text" 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono" 
                            placeholder="DNI / Cédula"
                            value={ciPassport}
                            onChange={(e) => setCiPassport(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/60 block mb-1">Celular Contacto *</label>
                          <input 
                            type="tel" 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                            placeholder="Celular"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-white/60 block mb-1">Fecha Nacimiento *</label>
                          <input 
                            type="date" 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white" 
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/60 block mb-1">Género *</label>
                          <select 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" 
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                          >
                            <option value="MALE">Masculino</option>
                            <option value="FEMALE">Femenino</option>
                            <option value="OTHER">Otro</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Complaint/Details */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-white/60 block">Sintomatología o Detalle del Caso</label>
                      <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white h-16 resize-none" 
                        placeholder="Ej. Dolor torácico, dificultad para respirar..."
                        value={ambulanceComplaint}
                        onChange={(e) => setAmbulanceComplaint(e.target.value)}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      disabled={sendingAmbulanceReq}
                      onClick={handleSendAmbulanceRequest}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(239,83,80,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {sendingAmbulanceReq ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando Emergencia...
                        </>
                      ) : (
                        <>
                          <Siren className="w-4 h-4" />
                          Despachar Ambulancia
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
      </div>
    </main>
  );
}

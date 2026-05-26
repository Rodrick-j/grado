'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import './login.css';

/* ── Role config ─────────────────────────────────────────────────────────── */
const ROLE_META: Record<string, { label: string; icon: string; color: string; greeting: string }> = {
  SUPER_ADMIN:      { label: 'Super Administrador', icon: 'ShieldCheck',    color: '#7C4DFF', greeting: 'Bienvenido al control total del sistema' },
  MEDICAL_DIRECTOR: { label: 'Director Médico',      icon: 'Award',          color: '#00BCD4', greeting: 'Bienvenido, dirección médica del hospital' },
  DOCTOR:           { label: 'Médico',               icon: 'Stethoscope',    color: '#1E88E5', greeting: 'Bienvenido al sistema clínico' },
  NURSE:            { label: 'Enfermería',            icon: 'Heart',          color: '#E91E63', greeting: 'Bienvenida al módulo de enfermería' },
  LAB_TECHNICIAN:   { label: 'Laboratorio',           icon: 'FlaskConical',   color: '#4CAF50', greeting: 'Bienvenido al sistema de laboratorio' },
  RADIOLOGIST:      { label: 'Radiología',            icon: 'ScanLine',       color: '#00ACC1', greeting: 'Bienvenido al módulo de imágenes' },
  PHARMACIST:       { label: 'Farmacia',              icon: 'Pill',           color: '#FF9800', greeting: 'Bienvenido al sistema de farmacia' },
  RECEPTIONIST:     { label: 'Recepción',             icon: 'ClipboardList',  color: '#26C6DA', greeting: 'Bienvenido al módulo de recepción' },
  BILLING:          { label: 'Caja / Facturación',    icon: 'Receipt',        color: '#FFC107', greeting: 'Bienvenido al módulo de caja' },
  AUDITOR:          { label: 'Auditor',               icon: 'FileSearch',     color: '#78909C', greeting: 'Bienvenido al módulo de auditoría' },
};

/* ── Status Indicator Component ─────────────────────────────────────────── */
function SystemStatusIndicator({ label, value, icon, color, progress }: { label: string; value: string; icon: string; color: string; progress: number }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={14} style={{ color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{value}</span>
      </div>
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${progress}%`, height: '100%', background: color, borderRadius: 2,
          boxShadow: `0 0 10px ${color}`
        }} />
      </div>
    </div>
  );
}

/* ── Welcome card shown when user is recognized ─────────────────────────── */
function WelcomeCard({ profile, specialty }: { profile: { full_name: string; role: string } | null; specialty?: string }) {
  if (!profile) return null;
  const meta = ROLE_META[profile.role] || { label: profile.role, icon: 'User', color: '#607D8B', greeting: 'Bienvenido al sistema' };

  return (
    <div className="welcome-card-login" style={{
      padding:'14px 16px', borderRadius:12, marginBottom:18,
      background:`${meta.color}0d`, border:`1px solid ${meta.color}30`,
      borderLeft:`3px solid ${meta.color}`,
      animation:'slideDown 0.35s cubic-bezier(0.4,0,0.2,1) forwards',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:42, height:42, borderRadius:11, background:`${meta.color}20`,
          border:`1px solid ${meta.color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name={meta.icon} size={20} style={{ color: meta.color }} />
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#fff',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:2 }}>
            {profile.full_name}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:12,
              background:`${meta.color}20`, color: meta.color, letterSpacing:'0.06em' }}>
              {meta.label}
            </span>
            {specialty && (
              <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>
                · {specialty}
              </span>
            )}
          </div>
        </div>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#4CAF50', flexShrink:0,
          animation:'pulseDot 1.5s infinite', boxShadow:'0 0 6px #4CAF50' }} />
      </div>
      <div style={{ marginTop:10, fontSize:12, color:'rgba(255,255,255,0.45)',
        fontStyle:'italic', paddingLeft:2 }}>
        {meta.greeting}, <span style={{ color: meta.color, fontStyle:'normal', fontWeight:600 }}>
          {profile.full_name.split(' ')[0]}
        </span>. Sistema listo.
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [mounted, setMounted]       = useState(false);
  const [welcomeActive, setWelcomeActive] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass]   = useState(false);

  // Time & Live stats
  const [time, setTime] = useState('');
  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    updateTime();
    const int = setInterval(updateTime, 1000);
    return () => clearInterval(int);
  }, []);

  // Welcome lookup state
  const [lookingUp, setLookingUp]   = useState(false);
  const [profile, setProfile]       = useState<{ full_name: string; role: string } | null>(null);
  const [specialty, setSpecialty]   = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const lookupByEmail = useCallback(async (emailVal: string) => {
    if (!emailVal.includes('@') || emailVal.length < 5) {
      setProfile(null); setSpecialty(undefined); return;
    }
    setLookingUp(true);
    try {
      const res = await fetch(`/api/lookup-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.found) {
          setProfile({ full_name: json.full_name, role: json.role });
          setSpecialty(json.specialty || undefined);
        } else {
          setProfile(null); setSpecialty(undefined);
        }
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
    setLookingUp(false);
  }, []);

  useEffect(() => {
    setProfile(null); setSpecialty(undefined);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!email || !email.includes('@')) return;
    debounceRef.current = setTimeout(() => lookupByEmail(email), 650);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [email, lookupByEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Credenciales incorrectas. Verifique su email y contraseña.');
      setLoading(false);
    } else {
      setWelcomeActive(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    }
  };

  const inputStyle = (focused: boolean, extraPadding?: string): React.CSSProperties => ({
    width:'100%', padding: extraPadding || `13px 16px 13px 44px`,
    backgroundColor: focused ? 'rgba(0,188,212,0.07)' : 'rgba(255,255,255,0.05)',
    border:`1px solid ${focused ? 'rgba(0,188,212,0.5)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius:11, color:'#ffffff', fontSize:13.5,
    fontFamily:'Inter,sans-serif', outline:'none',
    transition:'all 0.2s ease',
    boxShadow: focused ? '0 0 0 3px rgba(0,188,212,0.12)' : 'none',
    caretColor:'#00BCD4', boxSizing:'border-box', WebkitAppearance:'none',
  });

  const fadeStyle = (delay = 0): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(18px)',
    transition:`opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
  });

  return (
    <>
      <div style={{ height:'100vh', display:'flex', flexDirection:'column',
        fontFamily:'Inter,sans-serif', position:'relative', overflow:'hidden', background:'#040e20' }}>

        {/* BG */}
        <div style={{ position:'absolute', inset:0, zIndex:0,
          backgroundImage:'url(/hospital-bg.png)', backgroundSize:'cover', backgroundPosition:'center 25%',
          filter:'brightness(0.65) saturate(0.9)' }} />
        <div style={{ position:'absolute', inset:0, zIndex:1,
          background:'linear-gradient(160deg,rgba(4,14,32,0.4) 0%,rgba(4,14,32,0.6) 60%,rgba(4,14,32,0.85) 100%)' }} />
        <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none',
          backgroundImage:`linear-gradient(rgba(0,188,212,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,188,212,0.025) 1px,transparent 1px)`,
          backgroundSize:'70px 70px' }} />
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(0,188,212,0.06) 0%,transparent 70%)',
          top:'-250px', left:'-200px', zIndex:2, pointerEvents:'none', animation:'float1 9s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(30,136,229,0.07) 0%,transparent 70%)',
          bottom:'-150px', right:'-100px', zIndex:2, pointerEvents:'none', animation:'float2 11s ease-in-out infinite' }} />

        {/* TOP BAR */}
        <div className="login-top-bar" style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'10px 36px',
          borderBottom:'1px solid rgba(255,255,255,0.05)',
          background:'rgba(4,14,32,0.5)', backdropFilter:'blur(12px)', ...fadeStyle(0) }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10,
              display:'flex', alignItems:'center', justifyContent:'center',
              background: 'rgba(255,255,255,0.05)',
              boxShadow:'0 0 14px rgba(0,188,212,0.2)' }}>
              <img src="/logo.png" alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <Icon name="Clock" size={11} style={{ color:'rgba(0,188,212,0.55)' }} />
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{time || '00:00:00'}</span>
            </div>
            {[{icon:'Wifi',text:'Conexión Segura'},{icon:'Server',text:'Uptime 99.9%'}].map(b=>(
              <div key={b.text} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Icon name={b.icon} size={11} style={{ color:'rgba(0,188,212,0.55)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontWeight:500 }}>{b.text}</span>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#4CAF50', animation:'pulseDot 1.5s infinite' }} />
              <span style={{ fontSize:11, color:'#4CAF50', fontWeight:600 }}>SISTEMA ACTIVO</span>
            </div>
          </div>
        </div>

        {/* MAIN ROW */}
        <div className="login-main-row" style={{ position:'relative', zIndex:10, flex:1, display:'flex',
          alignItems:'center', padding:'10px 36px', gap:20 }}>

          {/* LEFT: Branding */}
          <div className="login-branding" style={{ flex:1, display:'flex', flexDirection:'column', gap:16, ...fadeStyle(0.1) }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ height:1, width:32, background:'linear-gradient(90deg,transparent,#00BCD4)' }} />
              <span style={{ fontSize:10, color:'#00BCD4', fontWeight:700, letterSpacing:'0.2em' }}>SISTEMA HOSPITALARIO INTEGRADO</span>
            </div>
            <div>
              <h1 style={{ fontSize:'clamp(26px,3.2vw,48px)', fontWeight:900, color:'#fff',
                lineHeight:1.1, letterSpacing:'-0.025em', marginBottom:12 }}>
                Hospital Clínico<br />
                <span style={{ background:'linear-gradient(135deg,#00BCD4,#42A5F5)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  San Juan de Dios
                </span>
              </h1>
              <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.48)', lineHeight:1.7, maxWidth:360 }}>
                Plataforma integral de gestión clínica. Acceso unificado de alta seguridad a todos los servicios.
              </p>
            </div>
            
            {/* Quick stats row */}
            <div className="login-stats" style={{ display:'flex', gap:9, maxWidth:420, width: '100%' }}>
              {[
                {icon:'Calendar', value:'115', label:'Años', color:'#00BCD4'},
                {icon:'Stethoscope', value:'20', label:'Especialidades', color:'#42A5F5'},
                {icon:'Activity', value:'24/7', label:'Emergencias', color:'#7C4DFF'},
                {icon:'Users', value:'500+', label:'Personal', color:'#FF9800'},
              ].map(s=>(
                <div key={s.label} style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  gap:4, padding:'12px 10px', background:'rgba(255,255,255,0.04)',
                  border:`1px solid ${s.color}22`, borderTop:`2px solid ${s.color}`,
                  borderRadius:12, flex:1 }}>
                  <Icon name={s.icon} size={15} style={{ color:s.color }} />
                  <span style={{ fontSize:18, fontWeight:900, color:'#fff', lineHeight:1 }}>{s.value}</span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.42)', fontWeight:500,
                    textAlign:'center', letterSpacing:'0.04em' }}>{s.label}</span>
                </div>
              ))}
            </div>
            
            {/* Tagline block */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'16px 18px', maxWidth:420,
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }}>
              <div style={{ width:3, height:40, borderRadius:2,
                background:'linear-gradient(180deg,#00BCD4,#1E88E5)', flexShrink:0, marginTop:2 }} />
              <div>
                <div style={{ fontSize:13.5, fontStyle:'italic', color:'rgba(255,255,255,0.55)',
                  lineHeight:1.65, marginBottom:6 }}>
                  "Nuestra misión es cuidarte.<br/>Nuestra vocación es sanarte."
                </div>
                <div style={{ fontSize:10.5, color:'rgba(0,188,212,0.55)', fontWeight:600, letterSpacing:'0.06em' }}>
                  — Hospital Clínico San Juan de Dios · Desde 1910
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: LOGIN CARD */}
          <div style={{ width:'100%', maxWidth:400, flexShrink:0, ...fadeStyle(0.2) }}>
            <div className="glass-card-center" style={{
              background:'rgba(5,15,35,0.93)', backdropFilter:'blur(28px)',
              WebkitBackdropFilter:'blur(28px)', border:'1px solid rgba(0,188,212,0.16)',
              borderRadius:26, padding:'24px 28px 20px',
              boxShadow:'0 40px 100px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)',
              position:'relative', overflow:'hidden',
            }}>
              {/* Scan line */}
              <div style={{ position:'absolute', left:0, right:0, height:1,
                background:'linear-gradient(90deg,transparent,rgba(0,188,212,0.45),transparent)',
                animation:'scanLine 4.5s linear infinite', zIndex:3, pointerEvents:'none' }} />
              {/* Top accent */}
              <div style={{ position:'absolute', top:0, left:'12%', right:'12%', height:2,
                background:'linear-gradient(90deg,transparent,#00BCD4,#1E88E5,transparent)' }} />

              {/* Header */}
              <div style={{ textAlign:'center', marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                  <div style={{ position:'relative', width:50, height:50 }}>
                    <div style={{ position:'absolute', inset:-4, borderRadius:'50%',
                      border:'1.5px solid rgba(0,188,212,0.15)', borderTopColor:'#00BCD4',
                      animation:'spinRing 2.5s linear infinite' }} />
                    <div style={{ position:'absolute', inset:-9, borderRadius:'50%',
                      border:'1px solid rgba(30,136,229,0.07)', borderBottomColor:'rgba(30,136,229,0.35)',
                      animation:'spinRing 5s linear infinite reverse' }} />
                    <div style={{ width:'100%', height:'100%', borderRadius:14,
                      background:'rgba(255,255,255,0.05)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:'0 0 32px rgba(0,188,212,0.15)' }}>
                      <img src="/logo.png" alt="Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:5,
                  padding:'3px 12px', background:'rgba(0,188,212,0.1)',
                  border:'1px solid rgba(0,188,212,0.2)', borderRadius:20 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#00BCD4', animation:'pulseDot 1.5s infinite' }} />
                  <span style={{ fontSize:9, fontWeight:700, color:'#00BCD4', letterSpacing:'0.18em' }}>ACCESO INSTITUCIONAL</span>
                </div>
              </div>

              <div style={{ height:1, marginBottom:22,
                background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)' }} />

              {/* Welcome card */}
              <WelcomeCard profile={profile} specialty={specialty} />

              {/* Error */}
              {error && (
                <div style={{ background:'rgba(244,67,54,0.08)', border:'1px solid rgba(244,67,54,0.28)',
                  borderLeft:'3px solid #F44336', borderRadius:10, padding:'11px 14px', marginBottom:16,
                  display:'flex', alignItems:'flex-start', gap:9 }}>
                  <Icon name="AlertCircle" size={15} style={{ color:'#FF5252', flexShrink:0, marginTop:1 }} />
                  <span style={{ fontSize:12.5, color:'#FF8A80', lineHeight:1.5 }}>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:15 }}>
                {/* Email */}
                <div>
                  <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:10.5,
                    fontWeight:700, letterSpacing:'0.1em',
                    color: focusEmail ? '#00BCD4':'rgba(255,255,255,0.38)', marginBottom:6, transition:'color 0.2s' }}>
                    <Icon name="Mail" size={10} /> EMAIL INSTITUCIONAL
                    {lookingUp && <Icon name="Loader2" size={10} style={{ marginLeft:'auto', animation:'spin 1s linear infinite', color:'rgba(0,188,212,0.5)' }} />}
                  </label>
                  <div style={{ position:'relative' }}>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                      onFocus={()=>setFocusEmail(true)} onBlur={()=>setFocusEmail(false)}
                      required placeholder="usuario@sjdios.org" autoComplete="email"
                      style={inputStyle(focusEmail)} />
                    <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                      color: focusEmail ? '#00BCD4':'rgba(255,255,255,0.28)', transition:'color 0.2s',
                      display:'flex', pointerEvents:'none' }}>
                      {profile
                        ? <Icon name="UserCheck" size={15} style={{ color:'#4CAF50' }} />
                        : <Icon name="User" size={15} />}
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:10.5,
                    fontWeight:700, letterSpacing:'0.1em',
                    color: focusPass ? '#00BCD4':'rgba(255,255,255,0.38)', marginBottom:6, transition:'color 0.2s' }}>
                    <Icon name="Lock" size={10} /> CONTRASEÑA
                  </label>
                  <div style={{ position:'relative' }}>
                    <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                      onFocus={()=>setFocusPass(true)} onBlur={()=>setFocusPass(false)}
                      required placeholder="••••••••" autoComplete="current-password"
                      style={inputStyle(focusPass, '13px 50px 13px 44px')} />
                    <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                      color: focusPass ? '#00BCD4':'rgba(255,255,255,0.28)', transition:'color 0.2s',
                      display:'flex', pointerEvents:'none' }}>
                      <Icon name="KeyRound" size={15} />
                    </div>
                    <button type="button" onClick={()=>setShowPass(v=>!v)} tabIndex={-1}
                      style={{ position:'absolute', right:0, top:0, bottom:0, width:46,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background:'rgba(255,255,255,0.05)', border:'none',
                        borderLeft:'1px solid rgba(255,255,255,0.08)',
                        borderRadius:'0 11px 11px 0', cursor:'pointer',
                        color: showPass ? '#00BCD4':'rgba(255,255,255,0.55)', transition:'color 0.2s, background 0.2s' }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color='#00BCD4';(e.currentTarget as HTMLButtonElement).style.background='rgba(0,188,212,0.1)';}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color=showPass?'#00BCD4':'rgba(255,255,255,0.55)';(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.05)';}}>
                      <Icon name={showPass?'EyeOff':'Eye'} size={18} />
                    </button>
                  </div>
                </div>

                {/* Button */}
                <button type="submit" id="login-submit-btn" disabled={loading}
                  style={{ width:'100%', padding:'15px', marginTop:2,
                    background: loading ? 'rgba(0,188,212,0.25)' : 'linear-gradient(135deg,#00ACC1 0%,#1565C0 100%)',
                    border:'1px solid rgba(0,188,212,0.3)', borderRadius:13, color:'#fff',
                    fontSize:14, fontWeight:700, cursor: loading?'not-allowed':'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    transition:'all 0.25s ease', fontFamily:'Inter,sans-serif', letterSpacing:'0.02em',
                    boxShadow: loading?'none':'0 6px 24px rgba(0,188,212,0.25)' }}
                  onMouseEnter={e=>{ if(!loading){(e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLButtonElement).style.boxShadow='0 10px 32px rgba(0,188,212,0.38)';}}}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform='translateY(0)';(e.currentTarget as HTMLButtonElement).style.boxShadow=loading?'none':'0 6px 24px rgba(0,188,212,0.25)'; }}>
                  {loading
                    ? <><Icon name="Loader2" size={17} className="animate-spin" />Autenticando...</>
                    : <><Icon name="LogIn" size={17} />{profile ? `Ingresar como ${profile.full_name.split(' ')[0]}` : 'Ingresar al Sistema'}</>}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Live Operations Panel */}
          <div className="login-right-panel" style={{ flex:1, flexDirection:'column', gap:16, alignItems:'flex-end', ...fadeStyle(0.3) }}>
            <div style={{ width:'100%', maxWidth:330, background:'rgba(4,14,32,0.7)',
              backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:22,
              boxShadow:'0 20px 40px rgba(0,0,0,0.5)' }}>
              
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Icon name="Activity" size={14} style={{ color:'#00BCD4' }} />
                  <span style={{ fontSize:10, fontWeight:800, color:'#00BCD4', letterSpacing:'0.15em' }}>ESTADO OPERATIVO</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#4CAF50', animation:'pulseLine 1.5s infinite' }} />
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:700 }}>LIVE</span>
                </div>
              </div>

              {/* Status Bars */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <SystemStatusIndicator label="CAPACIDAD CAMAS" value="87%" icon="Bed" color="#F44336" progress={87} />
                <SystemStatusIndicator label="FLUJO URGENCIAS" value="Normal" icon="Ambulance" color="#4CAF50" progress={35} />
                <SystemStatusIndicator label="CARGA SERVIDORES" value="28%" icon="Server" color="#00BCD4" progress={28} />
                <SystemStatusIndicator label="RED INTERNA" value="Óptima" icon="Activity" color="#4CAF50" progress={100} />
              </div>

              {/* Footer info */}
              <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <Icon name="ShieldCheck" size={13} style={{ color:'rgba(255,255,255,0.4)' }} />
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>Cifrado End-to-End Activo</span>
                </div>
                <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.3)', lineHeight:1.5 }}>
                  Todos los accesos al sistema HIS son auditados bajo normativas de privacidad de datos en salud.
                </div>
              </div>
            </div>
            
            {/* Security Badges Group */}
            <div style={{ width:'100%', maxWidth:330, display:'flex', gap:8 }}>
              {[{label:'ISO 27001', icon:'Shield'}, {label:'HIPAA Compliant', icon:'FileCheck'}].map(b => (
                <div key={b.label} style={{ flex:1, background:'rgba(255,255,255,0.02)',
                  border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'10px',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <Icon name={b.icon} size={12} style={{ color:'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.3)' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="login-bottom-bar" style={{ position:'relative', zIndex:10, padding:'10px 36px',
          background:'rgba(4,14,32,0.85)', backdropFilter:'blur(12px)',
          borderTop:'1px solid rgba(255,255,255,0.05)',
          display:'flex', alignItems:'center', justifyContent:'space-between', ...fadeStyle(0.4) }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>
            © 2025 Hospital Clínico San Juan de Dios · Todos los derechos reservados
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
             <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>Project FARO HIS v2.4</span>
             <span style={{ fontSize:11, color:'rgba(255,255,255,0.15)' }}>|</span>
             <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>Soporte TI: Ext. 4040</span>
          </div>
        </div>
      </div>
      
      {/* WELCOME ANIMATION OVERLAY */}
      {welcomeActive && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background: `linear-gradient(135deg, rgba(4,14,32,0.95) 0%, ${ROLE_META[profile?.role || 'DOCTOR']?.color || '#1E88E5'}40 100%)`,
          backdropFilter:'blur(20px)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          animation:'fadeIn 0.3s ease forwards'
        }}>
           <div style={{
             width: 100, height: 100, borderRadius:'50%', background:`${ROLE_META[profile?.role || 'DOCTOR']?.color || '#1E88E5'}20`,
             display:'flex', alignItems:'center', justifyContent:'center', marginBottom: 24,
             animation:'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards, pulseDot 2s infinite'
           }}>
             <Icon name={ROLE_META[profile?.role || 'DOCTOR']?.icon || 'Check'} size={48} style={{ color: ROLE_META[profile?.role || 'DOCTOR']?.color || '#1E88E5' }} />
           </div>
           <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 12, animation:'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s forwards', opacity:0 }}>
             {ROLE_META[profile?.role || 'DOCTOR']?.greeting || 'Bienvenido al sistema'}
           </h1>
           <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', animation:'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards', opacity:0 }}>
             {profile?.full_name || 'Autenticando usuario...'}
           </p>
           <div style={{ marginTop: 40, animation:'fadeIn 0.5s ease 0.6s forwards', opacity:0 }}>
             <Icon name="Loader2" size={24} className="animate-spin" style={{ color: ROLE_META[profile?.role || 'DOCTOR']?.color || '#1E88E5' }} />
           </div>
        </div>
      )}
    </>
  );
}

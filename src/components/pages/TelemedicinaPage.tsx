"use client";

import React, { useState } from "react";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MonitorUp, 
  PhoneOff, 
  MessageCircle, 
  FileText, 
  Send,
  User,
  Settings,
  MoreVertical,
  Maximize
} from "lucide-react";

export default function TelemedicinaPage() {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("chat");

  const toggleMic = () => setMicOn(!micOn);
  const toggleVideo = () => setVideoOn(!videoOn);

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 80px)', width: '100%', display: 'flex', backgroundColor: '#020617', color: 'white', overflow: 'hidden', padding: '16px', gap: '16px' }}>
      
      {/* LEFT: Main Video Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '1rem', overflow: 'hidden', backgroundColor: '#0f172a', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Main Video (Patient) */}
        <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'linear-gradient(to bottom right, #1e293b, #0f172a)' }}>
          <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', padding: '8px 16px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#ef4444', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span>
              00:15:23
            </div>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', padding: '8px 16px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)' }}>
              Paciente: Juan Pérez (ID: 98321)
            </div>
          </div>
          
          <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
             <button style={{ borderRadius: '9999px', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
               <Maximize style={{ width: '16px', height: '16px' }} />
             </button>
          </div>

          {/* Avatar Placeholder for Patient */}
          <div style={{ width: '192px', height: '192px', borderRadius: '9999px', backgroundColor: 'rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid rgba(71, 85, 105, 0.3)', backdropFilter: 'blur(24px)', position: 'relative', overflow: 'hidden' }}>
            <User style={{ width: '80px', height: '80px', color: '#94a3b8' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top right, rgba(59, 130, 246, 0.1), transparent)' }}></div>
          </div>

          {/* PIP Video (Doctor/You) */}
          <div style={{ position: 'absolute', bottom: '24px', right: '24px', width: '256px', height: '160px', backgroundColor: '#1e293b', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '2px solid rgba(51, 65, 85, 0.5)', zIndex: 20 }}>
            {videoOn ? (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom right, #334155, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                 <User style={{ width: '48px', height: '48px', color: '#94a3b8' }} />
                 <div style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                   Tú (Dr. López)
                 </div>
                 {!micOn && (
                   <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#ef4444', borderRadius: '9999px', padding: '4px' }}>
                     <MicOff style={{ width: '12px', height: '12px', color: 'white' }} />
                   </div>
                 )}
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '9999px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User style={{ width: '24px', height: '24px', color: '#64748b' }} />
                </div>
                 <div style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                   Tú (Dr. López)
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Bottom Bar */}
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', zIndex: 30 }}>
          
          <button 
            onClick={toggleMic}
            style={{ borderRadius: '9999px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: micOn ? 'none' : '1px solid rgba(239, 68, 68, 0.5)', cursor: 'pointer', backgroundColor: micOn ? '#334155' : 'rgba(239, 68, 68, 0.2)', color: micOn ? 'white' : '#ef4444' }}
          >
            {micOn ? <Mic style={{ width: '20px', height: '20px' }} /> : <MicOff style={{ width: '20px', height: '20px' }} />}
          </button>

          <button 
            onClick={toggleVideo}
            style={{ borderRadius: '9999px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: videoOn ? 'none' : '1px solid rgba(239, 68, 68, 0.5)', cursor: 'pointer', backgroundColor: videoOn ? '#334155' : 'rgba(239, 68, 68, 0.2)', color: videoOn ? 'white' : '#ef4444' }}
          >
            {videoOn ? <Video style={{ width: '20px', height: '20px' }} /> : <VideoOff style={{ width: '20px', height: '20px' }} />}
          </button>

          <button style={{ borderRadius: '9999px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155', color: 'white', border: 'none', cursor: 'pointer' }}>
            <MonitorUp style={{ width: '20px', height: '20px' }} />
          </button>

          <button style={{ borderRadius: '9999px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155', color: 'white', border: 'none', cursor: 'pointer' }}>
            <Settings style={{ width: '20px', height: '20px' }} />
          </button>

          <button style={{ borderRadius: '9999px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155', color: 'white', border: 'none', cursor: 'pointer' }}>
            <MoreVertical style={{ width: '20px', height: '20px' }} />
          </button>

          <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>

          <button style={{ borderRadius: '9999px', padding: '0 24px', height: '48px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#dc2626', color: 'white', fontWeight: 500, border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.2)' }}>
            <PhoneOff style={{ width: '20px', height: '20px' }} />
            Terminar
          </button>
        </div>
      </div>

      {/* RIGHT: Side Panel */}
      <div style={{ width: '380px', height: '100%', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        
        <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ display: 'flex', backgroundColor: '#1e293b', padding: '4px', borderRadius: '8px' }}>
            <button 
              onClick={() => setActiveTab('chat')}
              style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'chat' ? '#2563eb' : 'transparent', color: activeTab === 'chat' ? 'white' : '#94a3b8', fontSize: '14px', fontWeight: 500 }}
            >
              <MessageCircle style={{ width: '16px', height: '16px' }} />
              Chat
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'notes' ? '#2563eb' : 'transparent', color: activeTab === 'notes' ? 'white' : '#94a3b8', fontSize: '14px', fontWeight: 500 }}
            >
              <FileText style={{ width: '16px', height: '16px' }} />
              Notas Médicas
            </button>
          </div>
        </div>

        {activeTab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>Paciente - 10:02 AM</span>
                <div style={{ backgroundColor: '#1e293b', padding: '8px 16px', borderRadius: '16px', borderTopLeftRadius: '4px', fontSize: '14px', color: '#e2e8f0', border: '1px solid rgba(51, 65, 85, 0.5)', maxWidth: '85%' }}>
                  Buenos días doctor, sí, he sentido mucho dolor en la garganta desde ayer.
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '8px' }}>Tú - 10:04 AM</span>
                <div style={{ backgroundColor: '#2563eb', padding: '8px 16px', borderRadius: '16px', borderTopRightRadius: '4px', fontSize: '14px', color: 'white', maxWidth: '85%' }}>
                  Comprendo Juan. ¿Has tenido fiebre o dificultad para tragar?
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>Paciente - 10:05 AM</span>
                <div style={{ backgroundColor: '#1e293b', padding: '8px 16px', borderRadius: '16px', borderTopLeftRadius: '4px', fontSize: '14px', color: '#e2e8f0', border: '1px solid rgba(51, 65, 85, 0.5)', maxWidth: '85%' }}>
                  Un poco de fiebre anoche, unos 38 grados.
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderTop: '1px solid #1e293b' }}>
              <form 
                style={{ display: 'flex', gap: '8px' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatMessage.trim()) setChatMessage("");
                }}
              >
                <input 
                  placeholder="Escribe un mensaje..." 
                  style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '9999px', padding: '0 16px', fontSize: '14px', outline: 'none' }}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                />
                <button type="submit" style={{ borderRadius: '9999px', backgroundColor: '#2563eb', color: 'white', border: 'none', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Send style={{ width: '16px', height: '16px' }} />
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ fontWeight: 500, color: '#60a5fa', marginBottom: '4px', fontSize: '14px', margin: 0 }}>Plantilla: Consulta General</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Las notas se guardarán automáticamente en la historia clínica del paciente.</p>
            </div>
            <textarea 
              placeholder="Motivo de consulta, síntomas, observaciones..."
              style={{ flex: 1, resize: 'none', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '16px', borderRadius: '12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                Limpiar
              </button>
              <button style={{ backgroundColor: '#2563eb', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>
                Guardar Nota
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}


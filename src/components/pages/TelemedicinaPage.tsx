"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  MessageCircle, 
  FileText, 
  Send,
} from "lucide-react";
import { JitsiMeeting } from '@jitsi/react-sdk';

export default function TelemedicinaPage() {
  const [chatMessage, setChatMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<any[]>([]);
  const [callId, setCallId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    // We get or create an active call for the mock demo
    const initCall = async () => {
      const { data: existing } = await supabase.from('telemedicine_calls').select('*').eq('status', 'ACTIVE').limit(1).single();
      if (existing) {
        setCallId(existing.id);
        setNotes(existing.notes || "");
      } else {
        const { data: newCall } = await supabase.from('telemedicine_calls').insert([{ status: 'ACTIVE' }]).select().single();
        if (newCall) {
          setCallId(newCall.id);
        }
      }
    };
    initCall();
  }, [supabase]);

  useEffect(() => {
    if (!callId) return;

    const fetchMessages = async () => {
      const { data } = await supabase.from('telemedicine_messages').select('*').eq('call_id', callId).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase.channel('chat_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemedicine_messages', filter: `call_id=eq.${callId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !callId) return;

    await supabase.from('telemedicine_messages').insert([{
      call_id: callId,
      sender: 'DOCTOR',
      message: chatMessage
    }]);

    setChatMessage("");
  };

  const handleSaveNotes = async () => {
    if (!callId) return;
    const { error } = await supabase.from('telemedicine_calls').update({ notes }).eq('id', callId);
    if (!error) {
      alert("Notas guardadas correctamente.");
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 80px)', width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden', padding: '16px', gap: '20px' }}>
      
      {/* LEFT: Main Video Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '24px', overflow: 'hidden', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', boxShadow: 'var(--shadow-lg)' }}>
        {React.useMemo(() => (
          <JitsiMeeting
              domain="alpha.jitsi.net"
              roomName={`Faro-Consulta-ID-98321-${callId?.substring(0,6) || 'demo'}`}
              configOverwrite={{
                  startWithAudioMuted: false,
                  startWithVideoMuted: false,
                  prejoinPageEnabled: false,
                  prejoinConfig: { enabled: false },
                  disableDeepLinking: true,
              }}
              interfaceConfigOverwrite={{
                  DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                  HIDE_INVITE_MORE_HEADER: true,
                  MOBILE_APP_PROMO: false,
                  SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                  SHOW_CHROME_EXTENSION_BANNER: false
              }}
              userInfo={{
                  displayName: 'Dr. Administrador',
                  email: 'admin@hospital.com'
              }}
              getIFrameRef={(iframeRef) => {
                  iframeRef.style.height = '100%';
                  iframeRef.style.width = '100%';
                  iframeRef.style.border = 'none';
              }}
          />
        ), [callId])}
      </div>

      {/* RIGHT: Side Panel */}
      <div style={{ width: isMobile ? '100%' : '420px', height: isMobile ? '50%' : '100%', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', borderRadius: '24px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-primary)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-secondary)' }}>
            <button 
              onClick={() => setActiveTab('chat')}
              style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'chat' ? 'linear-gradient(135deg, var(--color-blue), var(--color-blue-dark))' : 'transparent', color: activeTab === 'chat' ? 'white' : 'var(--text-muted)', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', boxShadow: activeTab === 'chat' ? 'var(--shadow-sm)' : 'none' }}
            >
              <MessageCircle style={{ width: '16px', height: '16px' }} />
              Chat
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'notes' ? 'linear-gradient(135deg, var(--color-blue), var(--color-blue-dark))' : 'transparent', color: activeTab === 'notes' ? 'white' : 'var(--text-muted)', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', boxShadow: activeTab === 'notes' ? 'var(--shadow-sm)' : 'none' }}
            >
              <FileText style={{ width: '16px', height: '16px' }} />
              Notas Médicas
            </button>
          </div>
        </div>

        {activeTab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--bg-primary)', border: '1px dashed var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
                  </div>
                  No hay mensajes en esta consulta.
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isDoctor = msg.sender === 'DOCTOR';
                  return (
                    <div key={idx} className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isDoctor ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: isDoctor ? 0 : '8px', marginRight: isDoctor ? '8px' : 0, fontWeight: 600 }}>
                        {isDoctor ? 'Tú (Dr. Administrador)' : 'Paciente'} - {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div style={{ background: isDoctor ? 'linear-gradient(135deg, var(--color-blue), var(--color-blue-dark))' : 'var(--bg-primary)', padding: '10px 16px', borderRadius: isDoctor ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '13px', color: isDoctor ? 'white' : 'var(--text-primary)', border: isDoctor ? 'none' : '1px solid var(--border-secondary)', maxWidth: '85%', boxShadow: isDoctor ? 'var(--shadow-glow-blue)' : 'var(--shadow-sm)' }}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-secondary)' }}>
              <form 
                style={{ display: 'flex', gap: '8px' }}
                onSubmit={handleSendMessage}
              >
                <input 
                  placeholder="Escribe un mensaje..." 
                  style={{ flex: 1, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', borderRadius: '9999px', padding: '0 16px', fontSize: '13px', outline: 'none', transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-secondary)'}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                />
                <button type="submit" style={{ borderRadius: '9999px', background: 'linear-gradient(135deg, var(--color-blue), var(--color-blue-dark))', color: 'white', border: 'none', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow-glow-blue)' }}>
                  <Send style={{ width: '16px', height: '16px', marginLeft: '-2px' }} />
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(30, 136, 229, 0.08)', border: '1px solid rgba(30, 136, 229, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: 'rgba(30, 136, 229, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText style={{ width: 16, height: 16, color: 'var(--color-blue)' }} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--color-blue)', marginBottom: '4px', fontSize: '13px', margin: 0 }}>Plantilla: Consulta General</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>Las notas se guardarán automáticamente en la historia clínica del paciente al finalizar la consulta.</p>
              </div>
            </div>
            <textarea 
              placeholder="Escriba aquí el motivo de consulta, síntomas presentados y observaciones médicas..."
              style={{ flex: 1, resize: 'none', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', padding: '16px', borderRadius: '12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, transition: 'all 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-blue)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-secondary)'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setNotes("")} className="btn-ghost" style={{ padding: '10px 20px' }}>
                Limpiar
              </button>
              <button onClick={handleSaveNotes} className="btn-primary" style={{ padding: '10px 20px' }}>
                Guardar Nota Médica
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}


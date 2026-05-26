"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { MessageCircle, Send, X, Video } from "lucide-react";
import { JitsiMeeting } from '@jitsi/react-sdk';

interface PatientTelemedicineProps {
  onClose: () => void;
  patientName?: string;
}

export default function PatientTelemedicine({ onClose, patientName }: PatientTelemedicineProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [callId, setCallId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    // Buscar la llamada activa
    const initCall = async () => {
      const { data: existing } = await supabase.from('telemedicine_calls').select('*').eq('status', 'ACTIVE').limit(1).single();
      if (existing) {
        setCallId(existing.id);
      } else {
        const { data: newCall } = await supabase.from('telemedicine_calls').insert([{ status: 'ACTIVE' }]).select().single();
        if (newCall) setCallId(newCall.id);
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

    const channel = supabase.channel('patient_chat_changes')
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
      sender: 'PATIENT',
      message: chatMessage
    }]);

    setChatMessage("");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in max-w-md mx-auto w-full">
      {/* Header */}
      <div className="bg-[#1E293B] text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
            <Video className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wide">Videoconsulta</h2>
            <p className="text-[10px] text-blue-300 font-bold">Conectado con Faro HIS</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/30 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-black/90">
        {callId ? (
          <JitsiMeeting
            domain="alpha.jitsi.net"
            roomName={`Faro-Consulta-ID-98321-${callId.substring(0,6)}`}
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
              displayName: patientName || 'Paciente PWA',
              email: 'paciente@pwa.com'
            }}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = '100%';
              iframeRef.style.width = '100%';
              iframeRef.style.border = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
            Conectando con el consultorio...
          </div>
        )}
      </div>

      {/* Toggle Chat Button (Mobile overlay style) */}
      <div className="absolute bottom-6 right-4 z-10">
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-[#00BCD4] text-white flex items-center justify-center shadow-[0_0_20px_rgba(0,188,212,0.5)] active:scale-95 transition-all cursor-pointer relative"
        >
          <MessageCircle className="w-6 h-6" />
          {messages.length > 0 && !isChatOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse" />
          )}
        </button>
      </div>

      {/* Chat Overlay */}
      {isChatOpen && (
        <div className="absolute bottom-24 right-4 w-[calc(100%-32px)] max-w-[350px] h-[400px] bg-[#1E293B] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-slide-up z-20">
          <div className="p-3 bg-[#0F172A] border-b border-white/10 flex justify-between items-center">
            <h3 className="text-white text-xs font-bold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#00BCD4]" /> Chat Médico
            </h3>
            <button onClick={() => setIsChatOpen(false)} className="text-white/50 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <p className="text-center text-white/30 text-xs mt-10">No hay mensajes aún.</p>
            ) : (
              messages.map((msg, idx) => {
                const isPatient = msg.sender === 'PATIENT';
                return (
                  <div key={idx} className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-white/40 mb-1 font-semibold">{isPatient ? 'Tú' : 'Doctor'}</span>
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs shadow-md ${isPatient ? 'bg-gradient-to-r from-[#1E88E5] to-[#00BCD4] text-white rounded-tr-sm' : 'bg-[#334155] text-white/90 rounded-tl-sm'}`}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-[#0F172A] border-t border-white/10">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text"
                placeholder="Escribe al doctor..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 bg-[#1E293B] border border-white/10 rounded-full px-4 text-xs text-white focus:outline-none focus:border-[#00BCD4] transition-colors"
              />
              <button 
                type="submit"
                disabled={!chatMessage.trim()}
                className="w-9 h-9 rounded-full bg-[#00BCD4] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4 -ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

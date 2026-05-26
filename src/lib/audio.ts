// Utility to play synthesized sounds using the Web Audio API
// This avoids needing external audio files, prevents 404 loading errors,
// and works reliably for premium UI alerts and notifications.

export function playNotificationSound(type: 'alert' | 'notification' = 'notification') {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    if (type === 'alert') {
      // Urgent hospital alert sound: professional triple beep alarm
      const playBeep = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, startTime); // A5 note
        
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      };
      
      playBeep(ctx.currentTime);
      playBeep(ctx.currentTime + 0.35);
      playBeep(ctx.currentTime + 0.7);
    } else {
      // Premium WhatsApp-like double-tone chime sound
      // Tone 1: Bright high note E6 (1318.51 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, ctx.currentTime);
      
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Tone 2: Harmonious high note A6 (1760.00 Hz) slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760.00, ctx.currentTime + 0.08);
      
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      // Start and stop playbacks
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.4);
    }
  } catch (error) {
    console.warn("Could not play notification sound", error);
  }
}

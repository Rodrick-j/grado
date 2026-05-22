// Utility to play sounds using the Web Audio API
// This avoids needing external mp3 files and works reliably for UI notifications

// Utility to play sounds
// We use a simple HTMLAudioElement pointing to our generated beep.wav

let audioInstance: HTMLAudioElement | null = null;

export function playNotificationSound(type: 'alert' | 'notification' = 'notification') {
  if (typeof window === 'undefined') return;
  
  try {
    if (!audioInstance) {
      audioInstance = new Audio('/sounds/beep.wav');
      // Preload the audio
      audioInstance.load();
    }
    
    // Clone node so we can play overlapping sounds if needed
    const sound = audioInstance.cloneNode() as HTMLAudioElement;
    
    if (type === 'alert') {
      sound.volume = 1.0;
      sound.play().catch(e => console.warn("Audio autoplay blocked:", e));
      
      // Play a second beep shortly after for an alert pattern
      setTimeout(() => {
        const sound2 = audioInstance!.cloneNode() as HTMLAudioElement;
        sound2.volume = 1.0;
        sound2.play().catch(() => {});
      }, 150);
    } else {
      sound.volume = 0.6;
      sound.play().catch(e => console.warn("Audio autoplay blocked:", e));
    }
  } catch (error) {
    console.warn("Could not play notification sound", error);
  }
}

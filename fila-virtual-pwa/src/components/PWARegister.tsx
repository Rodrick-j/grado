'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSW = async () => {
        // En desarrollo local (localhost), desregistramos el SW para evitar problemas de caché obsoleto
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('[PWA] Service Worker desregistrado para evitar caché en localhost.');
          }
          return;
        }

        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('[PWA] Service Worker registrado con éxito. Scope:', registration.scope);
        } catch (error) {
          console.error('[PWA] Error registrando el Service Worker:', error);
        }
      };

      if (document.readyState === 'complete') {
        handleSW();
      } else {
        window.addEventListener('load', handleSW);
        return () => window.removeEventListener('load', handleSW);
      }
    }
  }, []);

  return null;
}

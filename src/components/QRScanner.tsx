'use client';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Icon } from '@/components/Icon';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('qr-reader');
    
    scannerRef.current.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scannerRef.current?.stop();
        onScanSuccess(decodedText);
      },
      (err) => {
        // Ignorar errores de "no encontrado en frame" para no spam la consola
      }
    ).catch(err => {
      setError('No se pudo acceder a la cámara. Revisa los permisos.');
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, padding: 20 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: -30, right: 20, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <Icon name="X" size={24} />
        </button>
        
        <div style={{ background: 'white', padding: 10, borderRadius: 16 }}>
          <div id="qr-reader" style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
        </div>
        
        {error ? (
          <div style={{ marginTop: 20, color: '#FF5252', textAlign: 'center', fontSize: 14 }}>{error}</div>
        ) : (
          <div style={{ marginTop: 20, color: 'white', textAlign: 'center', fontSize: 14 }}>
            Apunta la cámara al código QR o Cédula del paciente
          </div>
        )}
      </div>
    </div>
  );
}

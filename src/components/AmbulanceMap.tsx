'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AmbulanceMapProps {
  latitude: number;
  longitude: number;
  triageLevel: 'RED' | 'ORANGE' | 'YELLOW';
  patientName: string;
}

type MapType = 'google-roadmap' | 'google-hybrid' | 'carto-dark';

export default function AmbulanceMap({ latitude, longitude, triageLevel, patientName }: AmbulanceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapType, setMapType] = useState<MapType>('google-roadmap');

  // Tile layer configuration mapping
  const tileProviders = {
    'google-roadmap': {
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '© Google Maps'
    },
    'google-hybrid': {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '© Google Maps Satellite'
    },
    'carto-dark': {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap contributors, © CartoDB'
    }
  };

  // Switch map tile provider when mapType state changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const provider = tileProviders[mapType];
    tileLayerRef.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: 20,
    }).addTo(mapRef.current);
  }, [mapType]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 17);

      const provider = tileProviders[mapType];
      tileLayerRef.current = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: 20,
      }).addTo(mapRef.current);
    } else {
      // If already initialized, update view
      mapRef.current.setView([latitude, longitude], 17);
    }

    // Update marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    const color = triageLevel === 'RED' ? '#FF5252' : triageLevel === 'ORANGE' ? '#FF9800' : '#FFD600';
    const html = `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: ${color};
          opacity: 0.6;
          animation: map-pulsate 1.5s ease-out infinite;
        "></div>
        <div style="
          position: relative;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        "></div>
      </div>
    `;

    // Add CSS rule dynamically for keyframes if not exists
    if (!document.getElementById('map-pulsate-style')) {
      const style = document.createElement('style');
      style.id = 'map-pulsate-style';
      style.innerHTML = `
        @keyframes map-pulsate {
          0% { transform: scale(0.3); opacity: 1; }
          80% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const customIcon = L.divIcon({
      html,
      className: 'custom-gps-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    markerRef.current = L.marker([latitude, longitude], { icon: customIcon })
      .addTo(mapRef.current)
      .bindPopup(`<strong>${patientName}</strong><br/>Triage: ${triageLevel === 'RED' ? '🔴 Emergencia' : triageLevel === 'ORANGE' ? '🟠 Muy Urgente' : '🟡 Urgente'}`)
      .openPopup();

  }, [latitude, longitude, triageLevel, patientName]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map selector control */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'rgba(6, 13, 26, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        padding: '4px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        {[
          { id: 'google-roadmap' as const, label: 'Google Mapa' },
          { id: 'google-hybrid' as const, label: 'Google Satélite' },
          { id: 'carto-dark' as const, label: 'Modo Oscuro' },
        ].map((t) => {
          const isActive = mapType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setMapType(t.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? 'var(--color-teal)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '12px',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }} 
      />
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase';

export function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const supabase = createClient();

  const defaultSections = [
    {
      title: 'Información del Hospital', key: 'hospital_info', icon: 'Building2', color: '#1E88E5',
      fields: [
        { label: 'Nombre del Hospital', value: 'Hospital San Juan de Dios' },
        { label: 'ID Institucional', value: 'SJD-USA-001' },
        { label: 'Zona Horaria', value: 'America/New_York (GMT-4)' },
        { label: 'Dirección', value: '1234 Medical Center Blvd, Miami, FL 33101' },
        { label: 'Teléfono', value: '+1 (305) 555-HOSP' },
        { label: 'Versión Sistema', value: 'Project FARO v2.4.1' },
      ],
    },
    {
      title: 'Estándares & Cumplimiento', key: 'compliance', icon: 'ShieldCheck', color: '#4CAF50',
      fields: [
        { label: 'Estándar de Interoperabilidad', value: 'HL7 FHIR R4' },
        { label: 'Codificación Diagnóstica', value: 'ICD-11 (OMS 2024)' },
        { label: 'Marco de Privacidad', value: 'HIPAA 1996 + Enmiendas 2013' },
        { label: 'Auditoría', value: 'Append-only · Inmutable' },
        { label: 'Retención de Datos', value: '25 años (registros clínicos)' },
        { label: 'Cifrado', value: 'AES-256 en reposo · TLS 1.3 en tránsito' },
      ],
    },
    {
      title: 'Notificaciones & Alertas', key: 'notifications', icon: 'Bell', color: '#FF9800',
      fields: [
        { label: 'Alerta valores críticos Lab', value: 'Activo — SMS + App + Email' },
        { label: 'Alerta stock farmacia', value: 'Activo — Umbral: ≤ 30% del mínimo' },
        { label: 'Triage RED auto-alert', value: 'Activo — Inmediato' },
        { label: 'Sesión inactiva', value: 'Auto-logout 15 minutos' },
        { label: 'Backup automático', value: 'Cada 4 horas — Storage redundante' },
      ],
    },
    {
      title: 'Motor de Scheduling', key: 'scheduling', icon: 'CalendarDays', color: '#9C27B0',
      fields: [
        { label: 'Máx. horas consecutivas', value: '12 horas' },
        { label: 'Descanso mínimo entre turnos', value: '11 horas' },
        { label: 'Anti-Overbooking', value: 'Activo — Bloqueo automático' },
        { label: 'Guardia de emergencia', value: 'Rotación equitativa por semana' },
        { label: 'Festivos 2026', value: '12 días configurados' },
      ],
    },
  ];

  useEffect(() => {
    fetchSettings();
  }, [supabase]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    
    // Merge DB settings with default settings
    let mergedSections = [...defaultSections];
    if (data && data.length > 0) {
      mergedSections = mergedSections.map(section => {
        const dbSetting = data.find(d => d.key === section.key);
        if (dbSetting && dbSetting.value) {
          // If value is an array of fields
          if (Array.isArray(dbSetting.value)) {
             return { ...section, fields: dbSetting.value };
          }
        }
        return section;
      });
    }
    setSettings(mergedSections);
  };
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Configuración del Sistema</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Project FARO v2.4 — Hospital San Juan de Dios · Ajustes globales del sistema</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {settings.length > 0 ? settings.map(section => (
          <div key={section.title} className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${section.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={section.icon} size={16} style={{ color: section.color }} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{section.title}</h3>
            </div>
            {section.fields.map((f: any) => (
              <div key={f.label} className="stat-row">
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%' }}>{f.value}</span>
              </div>
            ))}
            <button className="btn-ghost" style={{ marginTop: 14, width: '100%', justifyContent: 'center', fontSize: 12 }}>
              <Icon name="Edit" size={12} /> Editar
            </button>
          </div>
        )) : <div style={{ color: 'var(--text-muted)' }}>Cargando configuración...</div>}
      </div>

      {/* System Health */}
      <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(76,175,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Activity" size={16} style={{ color: '#4CAF50' }} />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Estado del Sistema</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.25)' }}>
            <div className="live-dot" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4CAF50' }}>TODOS LOS SISTEMAS OPERACIONALES</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {[
            { label: 'Base de Datos', status: 'ok', latency: '2ms' },
            { label: 'API FHIR', status: 'ok', latency: '8ms' },
            { label: 'LIS Connector', status: 'ok', latency: '15ms' },
            { label: 'RIS/PACS', status: 'ok', latency: '22ms' },
            { label: 'Backup Service', status: 'ok', latency: '—' },
            { label: 'Audit Logger', status: 'ok', latency: '1ms' },
          ].map(s => (
            <div key={s.label} style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(76,175,80,0.15)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF50', margin: '0 auto 8px', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
              <div style={{ fontSize: 10, color: '#4CAF50', marginTop: 2 }}>{s.latency}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

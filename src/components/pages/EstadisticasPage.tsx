'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';

export default function EstadisticasPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    patients: 0,
    professionals: 0,
    recibos: 0,
    camasOcupadas: 0,
    camasTotal: 0,
    ingresosHoy: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [
          { count: patients },
          { count: professionals },
          { data: recibos },
          { data: camas }
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
          supabase.from('recibos').select('monto_total, estado, created_at'),
          supabase.from('camas').select('estado')
        ]);

        const hoy = new Date().toISOString().split('T')[0];
        const ingresosHoy = (recibos || [])
          .filter(r => r.estado === 'PAGADO' && r.created_at.startsWith(hoy))
          .reduce((sum, r) => sum + Number(r.monto_total), 0);

        setStats({
          patients: patients || 0,
          professionals: professionals || 0,
          recibos: (recibos || []).length,
          camasOcupadas: (camas || []).filter(c => c.estado === 'OCUPADA').length,
          camasTotal: (camas || []).length,
          ingresosHoy
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <Icon name="Loader2" size={32} className="animate-spin" />
        <span style={{ marginLeft: 12 }}>Cargando estadísticas...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="BarChart3" size={22} style={{ color: '#00BCD4' }} /> Estadísticas & Reportes
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Métricas clave del Hospital San Juan de Dios</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[
          { label: 'Pacientes Registrados', value: stats.patients, icon: 'Users', color: '#1E88E5' },
          { label: 'Personal Médico', value: stats.professionals, icon: 'UserCog', color: '#9C27B0' },
          { label: 'Recibos Emitidos', value: stats.recibos, icon: 'Receipt', color: '#FF9800' },
          { label: 'Ingresos Hoy (Bs.)', value: stats.ingresosHoy.toFixed(2), icon: 'TrendingUp', color: '#4CAF50' },
          { label: 'Ocupación Camas', value: `${stats.camasOcupadas} / ${stats.camasTotal}`, icon: 'BedDouble', color: '#F44336' }
        ].map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={k.icon} size={28} style={{ color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{k.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="glass-card" style={{ marginTop: 24, padding: 32, textAlign: 'center' }}>
        <Icon name="PieChart" size={48} style={{ color: '#00BCD4', opacity: 0.3, marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>Módulo de Reportes Avanzados</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
          En próximas fases se agregarán gráficas dinámicas de morbilidad, reportes de ocupación histórica y exportación a Excel/PDF.
        </p>
      </div>
    </div>
  );
}

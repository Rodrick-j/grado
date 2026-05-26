'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Icon } from '@/components/Icon';
import { useRouter } from 'next/navigation';

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  status: string;
  camas?: { bed_code: string; ala: string; piso: number }[];
};

type DietInfo = {
  tipo: string;
  restricciones: string;
  updated_at: string;
};

export default function DietasPage() {
  const router = useRouter();
  const supabase = createClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dietData, setDietData] = useState<Record<string, DietInfo>>({});
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formTipo, setFormTipo] = useState('General');
  const [formRestricciones, setFormRestricciones] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: patientsData } = await supabase
      .from('patients')
      .select('id, first_name, last_name, mrn, status, camas(bed_code, ala, piso)')
      .eq('status', 'HOSPITALIZED');

    if (patientsData) {
      setPatients(patientsData as any[]);
      setDietData(prev => {
        const newData = { ...prev };
        patientsData.forEach(p => {
          if (!newData[p.id]) {
            newData[p.id] = { tipo: 'General', restricciones: 'Ninguna', updated_at: new Date().toISOString() };
          }
        });
        return newData;
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrescribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatient) {
      setDietData(prev => ({
        ...prev,
        [selectedPatient.id]: {
          tipo: formTipo,
          restricciones: formRestricciones,
          updated_at: new Date().toISOString()
        }
      }));
      setShowModal(false);
      setSelectedPatient(null);
    }
  };

  const openModal = (patient: Patient) => {
    setSelectedPatient(patient);
    const currentDiet = dietData[patient.id] || { tipo: 'General', restricciones: '' };
    setFormTipo(currentDiet.tipo);
    setFormRestricciones(currentDiet.restricciones);
    setShowModal(true);
  };

  const getDietBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'NPO': return 'badge badge-error';
      case 'General': return 'badge badge-active';
      case 'Blanda': return 'badge badge-warning';
      case 'Líquida': return 'badge badge-info';
      default: return 'badge badge-inactive';
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '8px', flexShrink: 0 }}>
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="max-sm:text-lg">
              <Icon name="Utensils" size={20} style={{ color: '#4CAF50', flexShrink: 0 }} /> Nutrición y Dietas
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Gestión de dietas hospitalarias para pacientes internados</p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Icon name="Loader2" className="animate-spin" size={28} /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PACIENTE</th>
                <th>CAMA / UBICACIÓN</th>
                <th>DIETA ACTUAL</th>
                <th>RESTRICCIONES</th>
                <th style={{ textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>No hay pacientes hospitalizados.</td></tr>
              ) : patients.map(p => {
                const bed = p.camas && p.camas.length > 0 ? p.camas[0] : null;
                const diet = dietData[p.id] || { tipo: 'Desconocida', restricciones: '—' };
                
                return (
                  <tr key={p.id}>
                    <td>
                      <div>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 'normal' }}>MRN: {p.mrn}</div>
                    </td>
                    <td>
                      {bed ? (
                        <>
                          <span style={{ fontWeight: 700, color: 'var(--color-blue)' }}>{bed.bed_code}</span> — Piso {bed.piso} ({bed.ala})
                        </>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Sin cama asignada</span>
                      )}
                    </td>
                    <td>
                      <span className={getDietBadgeClass(diet.tipo)}>
                        {diet.tipo}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {diet.restricciones || 'Ninguna'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => openModal(p)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                        Prescribir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedPatient && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
          <div className="glass-card animate-fade-in" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 440, zIndex: 101, padding: 24, boxShadow: 'var(--shadow-card)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="Utensils" size={20} style={{ color: 'var(--color-green)' }} />
                Prescribir Dieta
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost" style={{ padding: 6, border: 'none' }}><Icon name="X" size={18} /></button>
            </div>
            
            <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-secondary)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Paciente</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedPatient.first_name} {selectedPatient.last_name} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: 12 }}>(MRN: {selectedPatient.mrn})</span></div>
            </div>

            <form onSubmit={handlePrescribe} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Tipo de Dieta</label>
                <select value={formTipo} onChange={e => setFormTipo(e.target.value)} className="input-field">
                  <option value="General">General</option>
                  <option value="NPO">NPO (Nada por vía oral)</option>
                  <option value="Blanda">Blanda</option>
                  <option value="Líquida">Líquida</option>
                  <option value="Diabética">Diabética</option>
                  <option value="Hiposódica">Hiposódica</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Indicaciones Especiales / Restricciones</label>
                <textarea 
                  value={formRestricciones} 
                  onChange={e => setFormRestricciones(e.target.value)} 
                  className="input-field"
                  style={{ height: 100, resize: 'none' }}
                  placeholder="Ej. Alergia a mariscos, sin lactosa, etc."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--color-green)' }}>
                  Guardar Dieta
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

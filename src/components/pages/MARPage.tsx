'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Clock, CheckCircle, AlertTriangle, XCircle, Sun, Sunset, Moon, X, Check, ChevronDown, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type MarStatus = 'PENDING' | 'GIVEN' | 'OMITTED' | 'REFUSED' | 'HELD';
type MarShift = 'MORNING' | 'AFTERNOON' | 'NIGHT';
type RouteType = 'oral' | 'IV' | 'IM' | 'SC' | 'topical' | 'inhaled';

interface Patient {
  id: string;
  full_name: string;
  document_number?: string;
}

interface MedicationAdministration {
  id: string;
  patient_id: string;
  prescription_id: string | null;
  nurse_id: string | null;
  clinical_record_id: string | null;
  drug_name: string;
  dose: string;
  route: string;
  scheduled_at: string;
  administered_at: string | null;
  status: MarStatus;
  right_patient: boolean;
  right_drug: boolean;
  right_dose: boolean;
  right_route: boolean;
  right_time: boolean;
  five_rights_verified: boolean;
  omission_reason: string | null;
  notes: string | null;
  shift: MarShift;
  created_at: string;
  patients?: { full_name: string };
}

interface FiveRightsState {
  right_patient: boolean;
  right_drug: boolean;
  right_dose: boolean;
  right_route: boolean;
  right_time: boolean;
}

const OMISSION_REASONS = [
  'Paciente ausente',
  'En ayuno',
  'Medicamento no disponible',
  'Paciente lo rechazó',
  'Otro',
];

const SHIFT_CONFIG: Record<MarShift, { label: string; color: string; Icon: React.ElementType }> = {
  MORNING:   { label: 'Mañana',  color: '#FF9800', Icon: Sun },
  AFTERNOON: { label: 'Tarde',   color: '#1E88E5', Icon: Sunset },
  NIGHT:     { label: 'Noche',   color: '#9C27B0', Icon: Moon },
};

const STATUS_CONFIG: Record<MarStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:  { label: 'Pendiente',  color: '#F9A825', bg: 'rgba(249,168,37,0.12)',  border: 'rgba(249,168,37,0.3)' },
  GIVEN:    { label: 'Administrado', color: '#4CAF50', bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.3)' },
  OMITTED:  { label: 'Omitido',    color: '#FF9800', bg: 'rgba(255,152,0,0.12)',   border: 'rgba(255,152,0,0.3)' },
  REFUSED:  { label: 'Rechazado',  color: '#F44336', bg: 'rgba(244,67,54,0.12)',   border: 'rgba(244,67,54,0.3)' },
  HELD:     { label: 'Retenido',   color: '#607D8B', bg: 'rgba(96,125,139,0.12)',  border: 'rgba(96,125,139,0.3)' },
};

const ROUTES: { value: RouteType; label: string }[] = [
  { value: 'oral',    label: 'Oral' },
  { value: 'IV',      label: 'Intravenosa (IV)' },
  { value: 'IM',      label: 'Intramuscular (IM)' },
  { value: 'SC',      label: 'Subcutánea (SC)' },
  { value: 'topical', label: 'Tópica' },
  { value: 'inhaled', label: 'Inhalada' },
];

// ─── Progress color helper ─────────────────────────────────────────────────────
function getProgressColor(count: number): string {
  if (count <= 1) return '#F44336';
  if (count <= 2) return '#FF5722';
  if (count <= 3) return '#FF9800';
  if (count <= 4) return '#FFC107';
  return '#4CAF50';
}

function progressGradient(count: number): string {
  return `linear-gradient(90deg, #F44336 0%, ${getProgressColor(count)} 100%)`;
}

// ─── Five Rights Labels ────────────────────────────────────────────────────────
const FIVE_RIGHTS_LABELS: { key: keyof FiveRightsState; label: string; description: string }[] = [
  { key: 'right_patient', label: 'Paciente correcto', description: 'Verificar nombre e ID del paciente' },
  { key: 'right_drug',    label: 'Medicamento correcto', description: 'Confirmar nombre del fármaco' },
  { key: 'right_dose',    label: 'Dosis correcta', description: 'Verificar la cantidad prescrita' },
  { key: 'right_route',   label: 'Vía correcta', description: 'Confirmar la vía de administración' },
  { key: 'right_time',    label: 'Hora correcta', description: 'Verificar la hora programada' },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MARPage() {
  const supabase = createClient();

  const [shift, setShift] = useState<MarShift>('MORNING');
  const [records, setRecords] = useState<MedicationAdministration[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [adminModal, setAdminModal] = useState<MedicationAdministration | null>(null);
  const [omitModal, setOmitModal]   = useState<MedicationAdministration | null>(null);
  const [newModal, setNewModal]     = useState(false);

  // Five Rights state
  const [fiveRights, setFiveRights] = useState<FiveRightsState>({
    right_patient: false, right_drug: false, right_dose: false,
    right_route: false, right_time: false,
  });

  // Omit form
  const [omitReason, setOmitReason] = useState('');
  const [omitPreset, setOmitPreset] = useState('');

  // New entry form
  const [newForm, setNewForm] = useState({
    patient_id: '',
    drug_name: '',
    dose: '',
    route: 'oral' as RouteType,
    scheduled_at: '',
    shift: 'MORNING' as MarShift,
    notes: '',
  });

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medication_administrations')
      .select('*, patients(full_name)')
      .eq('shift', shift)
      .order('scheduled_at', { ascending: true });
    if (!error && data) setRecords(data as MedicationAdministration[]);
    setLoading(false);
  }, [shift, supabase]);

  const loadPatients = useCallback(async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, full_name, document_number')
      .order('full_name');
    if (data) setPatients(data as Patient[]);
  }, [supabase]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { loadPatients(); }, [loadPatients]);

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  const kpiTotal    = records.length;
  const kpiPending  = records.filter(r => r.status === 'PENDING').length;
  const kpiGiven    = records.filter(r => r.status === 'GIVEN').length;
  const kpiOmitted  = records.filter(r => r.status === 'OMITTED' || r.status === 'REFUSED').length;

  // ─── Five Rights verified count ──────────────────────────────────────────────
  const rightsCount = Object.values(fiveRights).filter(Boolean).length;

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function openAdminModal(rec: MedicationAdministration) {
    setFiveRights({ right_patient: false, right_drug: false, right_dose: false, right_route: false, right_time: false });
    setAdminModal(rec);
  }

  async function confirmAdministration() {
    if (!adminModal) return;
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('medication_administrations')
      .update({
        right_patient: fiveRights.right_patient,
        right_drug:    fiveRights.right_drug,
        right_dose:    fiveRights.right_dose,
        right_route:   fiveRights.right_route,
        right_time:    fiveRights.right_time,
        status:        'GIVEN',
        administered_at: now,
      })
      .eq('id', adminModal.id);
    setSaving(false);
    if (!error) { setAdminModal(null); loadRecords(); }
  }

  async function confirmOmit() {
    if (!omitModal) return;
    const reason = omitPreset === 'Otro' ? omitReason : (omitPreset || omitReason);
    if (!reason.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('medication_administrations')
      .update({ status: 'OMITTED', omission_reason: reason })
      .eq('id', omitModal.id);
    setSaving(false);
    if (!error) { setOmitModal(null); setOmitReason(''); setOmitPreset(''); loadRecords(); }
  }

  async function submitNewEntry() {
    if (!newForm.patient_id || !newForm.drug_name || !newForm.dose || !newForm.scheduled_at) return;
    setSaving(true);
    const { error } = await supabase
      .from('medication_administrations')
      .insert({
        patient_id:   newForm.patient_id,
        drug_name:    newForm.drug_name,
        dose:         newForm.dose,
        route:        newForm.route,
        scheduled_at: new Date(newForm.scheduled_at).toISOString(),
        shift:        newForm.shift,
        notes:        newForm.notes || null,
        status:       'PENDING',
        right_patient: false, right_drug: false, right_dose: false,
        right_route: false, right_time: false,
      });
    setSaving(false);
    if (!error) {
      setNewModal(false);
      setNewForm({ patient_id: '', drug_name: '', dose: '', route: 'oral', scheduled_at: '', shift: 'MORNING', notes: '' });
      loadRecords();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <Pill size={24} color="#00BCD4" />
          </div>
          <div>
            <h1 style={styles.headerTitle}>MAR — Registro de Administración de Medicamentos</h1>
            <p style={styles.headerSubtitle}>Hoja de Medicación y Control de los 5 Correctos</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          {/* Shift selector */}
          <div style={styles.shiftBar}>
            {(Object.keys(SHIFT_CONFIG) as MarShift[]).map(s => {
              const cfg = SHIFT_CONFIG[s];
              const active = shift === s;
              return (
                <button
                  key={s}
                  id={`shift-btn-${s}`}
                  style={{
                    ...styles.shiftBtn,
                    background: active ? `${cfg.color}22` : 'transparent',
                    color: active ? cfg.color : 'var(--text-muted)',
                    border: `1px solid ${active ? cfg.color : 'transparent'}`,
                  }}
                  onClick={() => setShift(s)}
                >
                  <cfg.Icon size={14} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <button
            id="mar-add-btn"
            style={styles.addBtn}
            onClick={() => setNewModal(true)}
          >
            <Plus size={16} />
            Agregar Registro MAR
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={styles.kpiGrid} className="animate-fade-in">
        <KpiCard icon={<Pill size={20} />}       label="Total del Turno"      value={kpiTotal}   color="#1E88E5" />
        <KpiCard icon={<Clock size={20} />}      label="Pendientes"           value={kpiPending} color="#FF9800" />
        <KpiCard icon={<CheckCircle size={20} />} label="Administrados"       value={kpiGiven}   color="#4CAF50" />
        <KpiCard icon={<XCircle size={20} />}    label="Omitidos / Rechazados" value={kpiOmitted} color="#F44336" />
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="glass-card animate-fade-in" style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={styles.tableTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="live-dot" />
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {records.length} registro{records.length !== 1 ? 's' : ''} — Turno {SHIFT_CONFIG[shift].label}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <Loader2 size={32} color="var(--color-blue)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Cargando registros MAR…</p>
          </div>
        ) : records.length === 0 ? (
          <div style={styles.emptyState}>
            <Pill size={40} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>No hay registros para este turno.</p>
            <button style={styles.addBtn} onClick={() => setNewModal(true)}>
              <Plus size={14} /> Crear primer registro
            </button>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Medicamento</th>
                  <th>Dosis</th>
                  <th>Vía</th>
                  <th>Hora Programada</th>
                  <th>Turno</th>
                  <th>Estado</th>
                  <th>5 Correctos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <MARRow
                    key={rec.id}
                    rec={rec}
                    onAdminister={() => openAdminModal(rec)}
                    onOmit={() => { setOmitPreset(''); setOmitReason(''); setOmitModal(rec); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Administrar (5 Correctos) ───────────────────────────────── */}
      {adminModal && (
        <div style={styles.modalOverlay} onClick={() => setAdminModal(null)}>
          <div style={styles.adminModalBox} onClick={e => e.stopPropagation()} className="animate-fade-in">
            {/* Modal header */}
            <div style={styles.adminModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={styles.adminModalHeaderIcon}>
                  <Pill size={22} color="#fff" />
                </div>
                <div>
                  <h2 style={styles.adminModalTitle}>Verificación de los 5 Correctos</h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Confirme cada ítem antes de administrar</p>
                </div>
              </div>
              <button style={styles.closeBtn} onClick={() => setAdminModal(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Reference info */}
            <div style={styles.adminRefGrid}>
              <RefCard label="Paciente"    value={adminModal.patients?.full_name ?? adminModal.patient_id} color="#00BCD4" />
              <RefCard label="Medicamento" value={adminModal.drug_name} color="#4CAF50" />
              <RefCard label="Dosis"       value={adminModal.dose}      color="#FF9800" />
              <RefCard label="Vía"         value={adminModal.route}     color="#9C27B0" />
            </div>

            {/* Progress bar */}
            <div style={styles.progressSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Correctos verificados</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: getProgressColor(rightsCount) }}>
                  {rightsCount}/5
                </span>
              </div>
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressFill,
                  width: `${(rightsCount / 5) * 100}%`,
                  background: progressGradient(rightsCount),
                }} />
              </div>
            </div>

            {/* Five rights checkboxes */}
            <div style={styles.rightsGrid}>
              {FIVE_RIGHTS_LABELS.map(({ key, label, description }, idx) => {
                const checked = fiveRights[key];
                return (
                  <label key={key} style={{ ...styles.rightItem, background: checked ? 'rgba(76,175,80,0.12)' : 'rgba(255,255,255,0.04)' }}>
                    <div style={styles.rightIndex}>{idx + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: checked ? '#66BB6A' : '#fff' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{description}</div>
                    </div>
                    <div style={{
                      ...styles.rightCheckbox,
                      background: checked ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                      border: `2px solid ${checked ? '#4CAF50' : 'rgba(255,255,255,0.2)'}`,
                    }}
                      onClick={() => setFiveRights(prev => ({ ...prev, [key]: !prev[key] }))}
                    >
                      {checked && <Check size={14} color="#fff" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      id={`right-${key}`}
                      checked={checked}
                      onChange={e => setFiveRights(prev => ({ ...prev, [key]: e.target.checked }))}
                      style={{ display: 'none' }}
                    />
                  </label>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={styles.adminModalFooter}>
              <button style={styles.cancelBtn} onClick={() => setAdminModal(null)}>Cancelar</button>
              <button
                id="confirm-admin-btn"
                style={{
                  ...styles.confirmAdminBtn,
                  opacity: rightsCount < 5 ? 0.4 : 1,
                  cursor: rightsCount < 5 ? 'not-allowed' : 'pointer',
                }}
                disabled={rightsCount < 5 || saving}
                onClick={confirmAdministration}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                {saving ? 'Guardando…' : 'Confirmar Administración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Omitir ───────────────────────────────────────────────────── */}
      {omitModal && (
        <div style={styles.modalOverlay} onClick={() => setOmitModal(null)}>
          <div style={styles.smallModalBox} onClick={e => e.stopPropagation()} className="animate-fade-in">
            <div style={styles.smallModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} color="#FF9800" />
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Omitir Medicamento</h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setOmitModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '0 24px 24px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 20 }}>
                <strong style={{ color: '#FF9800' }}>{omitModal.drug_name}</strong> — {omitModal.dose} / {omitModal.route}
              </p>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Razón predefinida</label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="omit-preset-select"
                    className="input-field"
                    value={omitPreset}
                    onChange={e => setOmitPreset(e.target.value)}
                  >
                    <option value="">Seleccionar razón…</option>
                    {OMISSION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {(omitPreset === 'Otro' || !omitPreset) && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Razón de omisión {!omitPreset ? '(requerido)' : '(opcional)'}</label>
                  <textarea
                    id="omit-reason-textarea"
                    className="input-field"
                    rows={3}
                    placeholder="Describa la razón de omisión…"
                    value={omitReason}
                    onChange={e => setOmitReason(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}

              <div style={styles.smallModalFooter}>
                <button style={styles.cancelBtn} onClick={() => setOmitModal(null)}>Cancelar</button>
                <button
                  id="confirm-omit-btn"
                  style={{
                    ...styles.omitConfirmBtn,
                    opacity: (!omitPreset && !omitReason.trim()) ? 0.4 : 1,
                    cursor: (!omitPreset && !omitReason.trim()) ? 'not-allowed' : 'pointer',
                  }}
                  disabled={!omitPreset && !omitReason.trim()}
                  onClick={confirmOmit}
                >
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
                  Confirmar Omisión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva entrada MAR ─────────────────────────────────────────── */}
      {newModal && (
        <div style={styles.modalOverlay} onClick={() => setNewModal(false)}>
          <div style={styles.newModalBox} onClick={e => e.stopPropagation()} className="animate-fade-in">
            <div style={styles.newModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Plus size={20} color="#00BCD4" />
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Nueva Entrada MAR</h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setNewModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={styles.newModalBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Paciente <span style={{ color: '#F44336' }}>*</span></label>
                  <select
                    id="new-mar-patient-select"
                    className="input-field"
                    value={newForm.patient_id}
                    onChange={e => setNewForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  >
                    <option value="">Seleccionar paciente…</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Turno</label>
                  <select
                    id="new-mar-shift-select"
                    className="input-field"
                    value={newForm.shift}
                    onChange={e => setNewForm(prev => ({ ...prev, shift: e.target.value as MarShift }))}
                  >
                    {(Object.keys(SHIFT_CONFIG) as MarShift[]).map(s => (
                      <option key={s} value={s}>{SHIFT_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Medicamento <span style={{ color: '#F44336' }}>*</span></label>
                <input
                  id="new-mar-drug-input"
                  type="text"
                  className="input-field"
                  placeholder="Nombre del fármaco…"
                  value={newForm.drug_name}
                  onChange={e => setNewForm(prev => ({ ...prev, drug_name: e.target.value }))}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Dosis <span style={{ color: '#F44336' }}>*</span></label>
                  <input
                    id="new-mar-dose-input"
                    type="text"
                    className="input-field"
                    placeholder="ej. 500mg"
                    value={newForm.dose}
                    onChange={e => setNewForm(prev => ({ ...prev, dose: e.target.value }))}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Vía de administración</label>
                  <select
                    id="new-mar-route-select"
                    className="input-field"
                    value={newForm.route}
                    onChange={e => setNewForm(prev => ({ ...prev, route: e.target.value as RouteType }))}
                  >
                    {ROUTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Fecha y hora programada <span style={{ color: '#F44336' }}>*</span></label>
                <input
                  id="new-mar-datetime-input"
                  type="datetime-local"
                  className="input-field"
                  value={newForm.scheduled_at}
                  onChange={e => setNewForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Notas (opcional)</label>
                <textarea
                  id="new-mar-notes-textarea"
                  className="input-field"
                  rows={2}
                  placeholder="Instrucciones adicionales…"
                  value={newForm.notes}
                  onChange={e => setNewForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={styles.newModalFooter}>
                <button style={styles.cancelBtn} onClick={() => setNewModal(false)}>Cancelar</button>
                <button
                  id="confirm-new-mar-btn"
                  style={{
                    ...styles.newEntryBtn,
                    opacity: (!newForm.patient_id || !newForm.drug_name || !newForm.dose || !newForm.scheduled_at) ? 0.4 : 1,
                    cursor: (!newForm.patient_id || !newForm.drug_name || !newForm.dose || !newForm.scheduled_at) ? 'not-allowed' : 'pointer',
                  }}
                  disabled={!newForm.patient_id || !newForm.drug_name || !newForm.dose || !newForm.scheduled_at || saving}
                  onClick={submitNewEntry}
                >
                  {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                  {saving ? 'Guardando…' : 'Crear Registro MAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="metric-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function MARRow({
  rec,
  onAdminister,
  onOmit,
}: {
  rec: MedicationAdministration;
  onAdminister: () => void;
  onOmit: () => void;
}) {
  const sc = STATUS_CONFIG[rec.status];
  const shiftCfg = SHIFT_CONFIG[rec.shift];
  const rights = [rec.right_patient, rec.right_drug, rec.right_dose, rec.right_route, rec.right_time];
  const scheduledDate = new Date(rec.scheduled_at);

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {rec.patients?.full_name ?? rec.patient_id.slice(0, 8) + '…'}
        </div>
      </td>
      <td>
        <div style={{ fontWeight: 600, color: 'var(--color-teal)' }}>{rec.drug_name}</div>
      </td>
      <td>{rec.dose}</td>
      <td>
        <span style={styles.routeBadge}>{rec.route}</span>
      </td>
      <td>
        <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
          {scheduledDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {scheduledDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </td>
      <td>
        <span style={{ color: shiftCfg.color, fontSize: 12, fontWeight: 600 }}>{shiftCfg.label}</span>
      </td>
      <td>
        <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
          {sc.label}
        </span>
      </td>
      <td>
        <div style={styles.rightsContainer}>
          {rec.five_rights_verified ? (
            <span style={styles.fiveRightsVerified}>✓ 5/5</span>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              {rights.map((v, i) => (
                <div
                  key={i}
                  title={FIVE_RIGHTS_LABELS[i].label}
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: v ? '#4CAF50' : 'rgba(139,163,200,0.2)',
                    border: `1px solid ${v ? '#4CAF50' : 'rgba(139,163,200,0.15)'}`,
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          {rec.status === 'PENDING' && (
            <>
              <button
                id={`administer-btn-${rec.id}`}
                style={styles.actionBtnGreen}
                onClick={onAdminister}
              >
                <Check size={12} /> Administrar
              </button>
              <button
                id={`omit-btn-${rec.id}`}
                style={styles.actionBtnOrange}
                onClick={onOmit}
              >
                <XCircle size={12} /> Omitir
              </button>
            </>
          )}
          {rec.status === 'GIVEN' && (
            <span style={styles.givenText}>✓ Administrado</span>
          )}
          {(rec.status === 'OMITTED' || rec.status === 'REFUSED') && (
            <span style={styles.omittedText}>✗ {STATUS_CONFIG[rec.status].label}</span>
          )}
          {rec.status === 'HELD' && (
            <span style={styles.heldText}>⏸ Retenido</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function RefCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${color}99`, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '24px',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: '12px',
    background: 'rgba(0,188,212,0.12)',
    border: '1px solid rgba(0,188,212,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  headerSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  shiftBar: {
    display: 'flex',
    gap: '4px',
    background: 'var(--bg-surface)',
    padding: '4px',
    borderRadius: '10px',
  },
  shiftBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '7px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  tableCard: {
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    gap: '12px',
  },
  routeBadge: {
    background: 'rgba(30,136,229,0.1)',
    border: '1px solid rgba(30,136,229,0.2)',
    color: 'var(--color-blue-light)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    textTransform: 'uppercase',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 10px',
    letterSpacing: '0.02em',
  },
  rightsContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  fiveRightsVerified: {
    color: '#4CAF50',
    fontSize: '12px',
    fontWeight: 700,
  },
  givenText: {
    color: '#4CAF50',
    fontSize: '12px',
    fontWeight: 700,
  },
  omittedText: {
    color: '#FF9800',
    fontSize: '12px',
    fontWeight: 700,
  },
  heldText: {
    color: '#607D8B',
    fontSize: '12px',
    fontWeight: 700,
  },
  actionBtnGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    background: 'rgba(76,175,80,0.12)',
    color: '#66BB6A',
    border: '1px solid rgba(76,175,80,0.3)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  actionBtnOrange: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    background: 'rgba(255,152,0,0.12)',
    color: '#FFA726',
    border: '1px solid rgba(255,152,0,0.3)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  // ── Modals ──────────────────────────────────────────────────────────────
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  adminModalBox: {
    background: 'linear-gradient(145deg, #0d1f3c 0%, #0a1628 100%)',
    border: '1px solid rgba(0,188,212,0.3)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '640px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(0,188,212,0.15)',
    overflow: 'hidden',
  },
  adminModalHeader: {
    padding: '24px 28px',
    background: 'linear-gradient(135deg, rgba(0,188,212,0.15) 0%, rgba(0,0,0,0) 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminModalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00BCD4, #0097A7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(0,188,212,0.4)',
  },
  adminModalTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
  },
  adminRefGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    padding: '20px 28px',
  },
  progressSection: {
    padding: '0 28px 20px',
  },
  progressTrack: {
    height: '12px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.4s ease, background 0.4s ease',
  },
  rightsGrid: {
    padding: '0 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rightItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  rightIndex: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    flexShrink: 0,
  },
  rightCheckbox: {
    width: 28,
    height: 28,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    flexShrink: 0,
  },
  adminModalFooter: {
    padding: '20px 28px 24px',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    marginTop: '16px',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmAdminBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #4CAF50, #388E3C)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(76,175,80,0.3)',
  },
  // ── Small modal ─────────────────────────────────────────────────────────
  smallModalBox: {
    background: 'linear-gradient(145deg, #0d1f3c 0%, #0a1628 100%)',
    border: '1px solid rgba(255,152,0,0.25)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
    overflow: 'hidden',
  },
  smallModalHeader: {
    padding: '20px 24px',
    background: 'rgba(255,152,0,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallModalFooter: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  omitConfirmBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #FF9800, #F57C00)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    transition: 'all 0.2s ease',
  },
  // ── New entry modal ─────────────────────────────────────────────────────
  newModalBox: {
    background: 'linear-gradient(145deg, #0d1f3c 0%, #0a1628 100%)',
    border: '1px solid rgba(0,188,212,0.2)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
    overflow: 'hidden',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  newModalHeader: {
    padding: '20px 24px',
    background: 'rgba(0,188,212,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  newModalBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  newModalFooter: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  newEntryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #00BCD4, #0097A7)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  formRow: {
    display: 'flex',
    gap: '14px',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.5)',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};

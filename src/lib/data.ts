// ============================================================
// HOSPITAL SAN JUAN DE DIOS — PROJECT FARO
// Master Data Layer (Types, Constants, Mock Structures)
// ============================================================

// ─── Medical Specialties ────────────────────────────────────
export interface Specialty {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  wing: string;
  floor: number;
  rooms: string[];
  headDoctor: string;
  activeDoctors: number;
  activePatients: number;
  avgWaitMin: number;
  color: string;
  emergencyCapable: boolean;
}

export const SPECIALTIES: Specialty[] = [
  {
    id: "SP-001", code: "CARD", name: "Cardiología",
    description: "Diagnóstico y tratamiento de enfermedades cardiovasculares, arritmias e insuficiencia cardíaca.",
    icon: "Heart", wing: "Ala Norte", floor: 3,
    rooms: ["CN-301", "CN-302", "CN-303", "CN-304"],
    headDoctor: "Dr. Roberto Medina", activeDoctors: 6, activePatients: 24, avgWaitMin: 18,
    color: "#F44336", emergencyCapable: true,
  },
  {
    id: "SP-002", code: "PED", name: "Pediatría",
    description: "Atención médica integral para pacientes desde recién nacidos hasta 18 años.",
    icon: "Baby", wing: "Ala Este", floor: 2,
    rooms: ["CE-201", "CE-202", "CE-203", "CE-204", "CE-205"],
    headDoctor: "Dra. Ana Sofía Torres", activeDoctors: 8, activePatients: 31, avgWaitMin: 12,
    color: "#FF9800", emergencyCapable: true,
  },
  {
    id: "SP-003", code: "CIRUG", name: "Cirugía General",
    description: "Procedimientos quirúrgicos abdominales, laparoscópicos y de urgencias.",
    icon: "Scissors", wing: "Ala Sur", floor: 4,
    rooms: ["CS-401", "CS-402", "CS-403"],
    headDoctor: "Dr. Carlos Espinoza", activeDoctors: 7, activePatients: 18, avgWaitMin: 45,
    color: "#9C27B0", emergencyCapable: true,
  },
  {
    id: "SP-004", code: "MINT", name: "Medicina Interna",
    description: "Diagnóstico y manejo de enfermedades sistémicas complejas en adultos.",
    icon: "Stethoscope", wing: "Ala Norte", floor: 2,
    rooms: ["CN-201", "CN-202", "CN-203", "CN-204", "CN-205", "CN-206"],
    headDoctor: "Dra. Valentina Cruz", activeDoctors: 10, activePatients: 42, avgWaitMin: 22,
    color: "#1E88E5", emergencyCapable: false,
  },
  {
    id: "SP-005", code: "GOBS", name: "Ginecología & Obstetricia",
    description: "Salud de la mujer, control prenatal, partos y cirugías ginecológicas.",
    icon: "UserCheck", wing: "Ala Este", floor: 3,
    rooms: ["CE-301", "CE-302", "CE-303", "CE-304"],
    headDoctor: "Dra. María Fernanda Ríos", activeDoctors: 6, activePatients: 22, avgWaitMin: 15,
    color: "#E91E63", emergencyCapable: true,
  },
  {
    id: "SP-006", code: "TRAU", name: "Traumatología & Ortopedia",
    description: "Lesiones óseas, musculares y articulares. Cirugía reconstructiva y protésica.",
    icon: "Bone", wing: "Ala Sur", floor: 2,
    rooms: ["CS-201", "CS-202", "CS-203", "CS-204"],
    headDoctor: "Dr. Alejandro Fuentes", activeDoctors: 5, activePatients: 19, avgWaitMin: 35,
    color: "#795548", emergencyCapable: true,
  },
  {
    id: "SP-007", code: "ONCO", name: "Oncología",
    description: "Diagnóstico, tratamiento y seguimiento de neoplasias malignas y benignas.",
    icon: "Microscope", wing: "Ala Oeste", floor: 5,
    rooms: ["CO-501", "CO-502", "CO-503"],
    headDoctor: "Dra. Lorena Pacheco", activeDoctors: 5, activePatients: 28, avgWaitMin: 40,
    color: "#673AB7", emergencyCapable: false,
  },
  {
    id: "SP-008", code: "GAST", name: "Gastroenterología",
    description: "Enfermedades del aparato digestivo: endoscopias, colonoscopias y tratamiento.",
    icon: "Activity", wing: "Ala Norte", floor: 3,
    rooms: ["CN-305", "CN-306"],
    headDoctor: "Dr. Hernán Salcedo", activeDoctors: 4, activePatients: 16, avgWaitMin: 28,
    color: "#4CAF50", emergencyCapable: false,
  },
  {
    id: "SP-009", code: "NEFR", name: "Nefrología",
    description: "Enfermedades renales, hemodiálisis, trasplante renal y riñón crónico.",
    icon: "Droplets", wing: "Ala Oeste", floor: 3,
    rooms: ["CO-301", "CO-302", "CO-303"],
    headDoctor: "Dr. Samuel Arango", activeDoctors: 4, activePatients: 14, avgWaitMin: 32,
    color: "#00BCD4", emergencyCapable: false,
  },
  {
    id: "SP-010", code: "RAD", name: "Radiología & Imágenes",
    description: "Diagnóstico por imágenes: RX, TAC, RM, Ecografías e intervencionismo radiológico.",
    icon: "ScanLine", wing: "Ala Sur", floor: 1,
    rooms: ["CS-101", "CS-102", "CS-103", "CS-104"],
    headDoctor: "Dra. Camila Vásquez", activeDoctors: 6, activePatients: 0, avgWaitMin: 55,
    color: "#607D8B", emergencyCapable: true,
  },
  {
    id: "SP-011", code: "NEUR", name: "Neurología",
    description: "Sistema nervioso central y periférico. ACV, epilepsia, Parkinson y demencias.",
    icon: "Brain", wing: "Ala Norte", floor: 4,
    rooms: ["CN-401", "CN-402", "CN-403"],
    headDoctor: "Dr. Andrés Molina", activeDoctors: 5, activePatients: 20, avgWaitMin: 38,
    color: "#FF5722", emergencyCapable: true,
  },
  {
    id: "SP-012", code: "PSIQ", name: "Psiquiatría",
    description: "Salud mental: depresión, ansiedad, psicosis y trastornos bipolares.",
    icon: "HeartHandshake", wing: "Ala Oeste", floor: 4,
    rooms: ["CO-401", "CO-402", "CO-403"],
    headDoctor: "Dra. Natalia Reyes", activeDoctors: 4, activePatients: 17, avgWaitMin: 20,
    color: "#3F51B5", emergencyCapable: false,
  },
  {
    id: "SP-013", code: "DERM", name: "Dermatología",
    description: "Enfermedades de la piel, dermatoscopía, cirugía dermatológica y estética médica.",
    icon: "Sun", wing: "Ala Este", floor: 1,
    rooms: ["CE-101", "CE-102"],
    headDoctor: "Dra. Isabel Guzmán", activeDoctors: 3, activePatients: 11, avgWaitMin: 10,
    color: "#FFC107", emergencyCapable: false,
  },
  {
    id: "SP-014", code: "OFTAL", name: "Oftalmología",
    description: "Salud ocular: cataratas, glaucoma, cirugía refractiva y retina.",
    icon: "Eye", wing: "Ala Este", floor: 2,
    rooms: ["CE-206", "CE-207"],
    headDoctor: "Dr. Pablo Herrera", activeDoctors: 3, activePatients: 9, avgWaitMin: 14,
    color: "#009688", emergencyCapable: false,
  },
  {
    id: "SP-015", code: "ORL", name: "Otorrinolaringología",
    description: "Oído, nariz y garganta: sinusitis, amígdalas, audición y endoscopía nasal.",
    icon: "Ear", wing: "Ala Norte", floor: 2,
    rooms: ["CN-207", "CN-208"],
    headDoctor: "Dra. Claudia Morales", activeDoctors: 3, activePatients: 10, avgWaitMin: 16,
    color: "#8BC34A", emergencyCapable: false,
  },
  {
    id: "SP-016", code: "UROL", name: "Urología",
    description: "Sistema urinario masculino y femenino. Próstata, litiasis renal y cirugía mínima invasiva.",
    icon: "Shield", wing: "Ala Sur", floor: 3,
    rooms: ["CS-301", "CS-302"],
    headDoctor: "Dr. Rodrigo Peña", activeDoctors: 4, activePatients: 13, avgWaitMin: 30,
    color: "#2196F3", emergencyCapable: false,
  },
  {
    id: "SP-017", code: "NEUM", name: "Neumología",
    description: "Enfermedades respiratorias: asma, EPOC, fibrosis pulmonar y sueño.",
    icon: "Wind", wing: "Ala Oeste", floor: 2,
    rooms: ["CO-201", "CO-202"],
    headDoctor: "Dr. Juan Pablo Toro", activeDoctors: 4, activePatients: 15, avgWaitMin: 25,
    color: "#00BCD4", emergencyCapable: true,
  },
  {
    id: "SP-018", code: "ENDO", name: "Endocrinología",
    description: "Sistema endocrino: diabetes, tiroides, suprarrenales y metabolismo.",
    icon: "Gauge", wing: "Ala Norte", floor: 1,
    rooms: ["CN-101", "CN-102"],
    headDoctor: "Dra. Sofía Mendoza", activeDoctors: 3, activePatients: 18, avgWaitMin: 22,
    color: "#FF9800", emergencyCapable: false,
  },
  {
    id: "SP-019", code: "REUM", name: "Reumatología",
    description: "Artritis, lupus, fibromialgia y enfermedades autoinmunes del sistema musculoesquelético.",
    icon: "Bone", wing: "Ala Oeste", floor: 1,
    rooms: ["CO-101", "CO-102"],
    headDoctor: "Dra. Patricia Alarcón", activeDoctors: 3, activePatients: 12, avgWaitMin: 35,
    color: "#E91E63", emergencyCapable: false,
  },
  {
    id: "SP-020", code: "EMER", name: "Medicina de Emergencias",
    description: "Urgencias médicas 24/7. Trauma mayor, reanimación y cuidados críticos de guardia.",
    icon: "Siren", wing: "Acceso Principal", floor: 0,
    rooms: ["ER-001", "ER-002", "ER-003", "ER-004", "ER-005", "ER-006", "ER-007", "ER-008"],
    headDoctor: "Dr. Gabriel Medrano", activeDoctors: 12, activePatients: 38, avgWaitMin: 5,
    color: "#F44336", emergencyCapable: true,
  },
];

// ─── RBAC Roles ──────────────────────────────────────────────
export type UserRole =
  | "SUPER_ADMIN"
  | "MEDICAL_DIRECTOR"
  | "DOCTOR"
  | "RESIDENT"
  | "NURSE"
  | "LAB_TECHNICIAN"
  | "RADIOLOGIST"
  | "PHARMACIST"
  | "RECEPTIONIST"
  | "BILLING"
  | "AUDITOR";

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Administrador",
  MEDICAL_DIRECTOR: "Director Médico",
  DOCTOR: "Médico Especialista",
  RESIDENT: "Médico Residente",
  NURSE: "Enfermero/a",
  LAB_TECHNICIAN: "Técnico de Laboratorio",
  RADIOLOGIST: "Radiólogo",
  PHARMACIST: "Farmacéutico",
  RECEPTIONIST: "Recepcionista",
  BILLING: "Facturación",
  AUDITOR: "Auditor Clínico",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "#F44336",
  MEDICAL_DIRECTOR: "#9C27B0",
  DOCTOR: "#1E88E5",
  RESIDENT: "#2196F3",
  NURSE: "#00BCD4",
  LAB_TECHNICIAN: "#4CAF50",
  RADIOLOGIST: "#607D8B",
  PHARMACIST: "#FF9800",
  RECEPTIONIST: "#8BC34A",
  BILLING: "#795548",
  AUDITOR: "#FF5722",
};

export const ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  '/': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGIST', 'PHARMACIST', 'RECEPTIONIST', 'BILLING', 'AUDITOR'],
  '/especialidades': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/profesionales': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'AUDITOR'],
  '/agenda': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGIST', 'RECEPTIONIST', 'AUDITOR'],
  '/adt': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'RECEPTIONIST', 'AUDITOR'],
  '/emergencias': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/historia-clinica': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGIST', 'PHARMACIST', 'AUDITOR'],
  '/laboratorio': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'LAB_TECHNICIAN', 'AUDITOR'],
  '/imagenes': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'RADIOLOGIST', 'AUDITOR'],
  '/farmacia': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'PHARMACIST', 'AUDITOR'],
  '/documentos': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE'],
  '/interconsultas': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'RADIOLOGIST', 'AUDITOR'],
  '/camas': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'AUDITOR'],
  '/uci': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'NURSE', 'AUDITOR'],
  '/quirofano': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/enfermeria/mar': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/recibos': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'BILLING', 'RECEPTIONIST', 'AUDITOR'],
  '/caja': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'BILLING', 'RECEPTIONIST', 'AUDITOR'],
  '/estadisticas': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'AUDITOR'],
  '/auditoria': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'AUDITOR'],
  '/roles': ['SUPER_ADMIN', 'AUDITOR'],
  '/configuracion': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR'],
  '/registro-paciente': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'RECEPTIONIST', 'DOCTOR', 'NURSE'],
  '/registro-personal': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR'],
  '/enfermeria/balance-hidrico': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/dietas': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/monitor': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/sepsis': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/telemedicina': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/epidemiologia': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR'],
  '/rrhh-inteligente': ['SUPER_ADMIN', 'MEDICAL_DIRECTOR'],
};

// ─── Triage ──────────────────────────────────────────────────
export type TriageLevel = "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE";
export const TRIAGE_CONFIG = {
  RED:    { label: "Inmediato",   color: "#D32F2F", text: "#FF5252", maxWaitMin: 0,  description: "Riesgo vital inmediato" },
  ORANGE: { label: "Muy urgente", color: "#F57C00", text: "#FFAB40", maxWaitMin: 10, description: "Situación de riesgo" },
  YELLOW: { label: "Urgente",     color: "#F9A825", text: "#FFD740", maxWaitMin: 60, description: "Urgencia media" },
  GREEN:  { label: "Poco urgente",color: "#388E3C", text: "#69F0AE", maxWaitMin: 120,description: "Urgencia menor" },
  BLUE:   { label: "No urgente",  color: "#1565C0", text: "#82B1FF", maxWaitMin: 240,description: "Revisión programable" },
};

// ─── Navigation ──────────────────────────────────────────────
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number | string;
  badgeColor?: string;
  description?: string;
  section: string;
  color?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/", section: "PRINCIPAL", description: "Panel de control general", color: "#1E88E5" },
  { id: "specialties", label: "Especialidades", icon: "Stethoscope", href: "/especialidades", section: "PRINCIPAL", description: "Catálogo de 20 especialidades", color: "#00BCD4" },
  { id: "professionals", label: "Registro Profesional", icon: "UserCog", href: "/profesionales", section: "PRINCIPAL", description: "Médicos y personal de salud", color: "#9C27B0" },
  { id: "schedule", label: "Agenda & Turnos", icon: "CalendarDays", href: "/agenda", section: "PRINCIPAL", description: "Calendario y gestión de citas", color: "#FF9800" },
  { id: "adt", label: "Administración ADT", icon: "ClipboardList", href: "/adt", section: "PACIENTES", description: "Admisión, traslado y alta", color: "#4CAF50" },
  { id: "triage", label: "Sala de Emergencias", icon: "Siren", href: "/emergencias", badge: "LIVE", badgeColor: "#F44336", section: "PACIENTES", description: "Triage Manchester 24/7", color: "#F44336" },
  { id: "ehr", label: "Historia Clínica (EHR)", icon: "FileText", href: "/historia-clinica", section: "PACIENTES", description: "Registro electrónico de salud", color: "#2196F3" },
  { id: "interconsultas", label: "Interconsultas", icon: "MessageSquare", href: "/interconsultas", section: "PACIENTES", description: "Referidos entre especialidades", color: "#E91E63" },
  { id: "camas", label: "Camas & Hospitalización", icon: "BedDouble", href: "/camas", section: "PACIENTES", description: "Mapa de camas por piso y ala", color: "#009688" },
  { id: "uci", label: "UCI / Intensivos", icon: "HeartPulse", href: "/uci", badge: "LIVE", badgeColor: "#9C27B0", section: "PACIENTES", description: "Pacientes críticos en tiempo real", color: "#9C27B0" },
  { id: "quirofano", label: "Quirófano & Cirugía", icon: "Scissors", href: "/quirofano", section: "PACIENTES", description: "Programación quirúrgica y WHO checklist", color: "#9C27B0" },
  { id: "mar", label: "MAR — Medicación", icon: "Pill", href: "/enfermeria/mar", section: "ENFERMERIA", description: "Registro de administración de medicamentos", color: "#00BCD4" },
  { id: "lab", label: "Laboratorio (LIS)", icon: "FlaskConical", href: "/laboratorio", section: "SERVICIOS", description: "Órdenes y resultados", color: "#4CAF50" },
  { id: "imaging", label: "Imágenes (RIS/PACS)", icon: "ScanLine", href: "/imagenes", section: "SERVICIOS", description: "RX, TAC, RM, Ecografías", color: "#607D8B" },
  { id: "pharmacy", label: "Farmacia & Stock", icon: "Pill", href: "/farmacia", section: "SERVICIOS", description: "Dispensación e inventario", color: "#FF9800" },
  { id: 'dietas', label: 'Nutrición y Dietas', icon: 'Utensils', href: '/dietas', section: 'SERVICIOS', description: 'Gestión de dietas hospitalarias', color: '#4CAF50' },
  { id: 'documentos', label: 'Documentos Clínicos', icon: 'FileText', href: '/documentos', section: 'PACIENTES', description: 'Epicrisis, certificados, bajas médicas, recetas imprimibles', color: '#607D8B' },
  { id: "caja", label: "Caja y Facturación", icon: "Landmark", href: "/caja", section: "SERVICIOS", description: "Corte diario e ingresos", color: "#795548" },
  { id: "recibos", label: "Recibos & Caja", icon: "Receipt", href: "/recibos", section: "SERVICIOS", description: "Recibos de pago y caja diaria", color: "#FF5722" },
  { id: "balance-hidrico", label: "Balance Hídrico", icon: "Droplets", href: "/enfermeria/balance-hidrico", section: "ENFERMERIA", description: "Control de ingresos y egresos hídricos", color: "#00BCD4" },
  { id: 'sepsis', label: 'Calculadora NEWS', icon: 'Activity', href: '/sepsis', section: 'ENFERMERIA', description: 'Screening de deterioro y sepsis', color: '#F44336' },
  { id: 'telemedicina', label: 'Telemedicina', icon: 'Video', href: '/telemedicina', section: 'PACIENTES', description: 'Consultas virtuales y videoconferencia', color: '#1E88E5' },
  { id: "estadisticas", label: "Estadísticas & Reportes", icon: "BarChart3", href: "/estadisticas", section: "SISTEMA", description: "KPIs, gráficas y reportes", color: "#2196F3" },
  { id: "audit", label: "Auditoría & Logs", icon: "ShieldCheck", href: "/auditoria", section: "SISTEMA", description: "Trazabilidad de accesos", color: "#00BCD4" },
  { id: "rbac", label: "Roles & Permisos", icon: "Lock", href: "/roles", section: "SISTEMA", description: "Control de acceso por rol", color: "#673AB7" },
  { id: "settings", label: "Configuración", icon: "Settings", href: "/configuracion", section: "SISTEMA", description: "Ajustes del sistema", color: "#607D8B" },
  { id: 'monitor', label: 'Monitor Vital', icon: 'HeartPulse', href: '/monitor', section: 'URGENCIAS', description: 'Monitorización ECG en tiempo real', color: '#00E676' },
  { id: 'epidemiologia', label: 'Epidemiología', icon: 'Map', href: '/epidemiologia', section: 'SISTEMA', description: 'Vigilancia epidemiológica y mapa de calor', color: '#FF5722' },
  { id: 'rrhh-inteligente', label: 'RRHH Inteligente', icon: 'Users', href: '/rrhh-inteligente', section: 'SISTEMA', description: 'AI Staffing, guardias y proyecciones', color: '#9C27B0' },
];

// ─── KPI Stats (structure only) ─────────────────────────────
export interface KpiCard {
  id: string;
  label: string;
  value: string | number;
  change: number;
  unit?: string;
  icon: string;
  color: string;
  trend: "up" | "down" | "neutral";
}

export const DASHBOARD_KPIS: KpiCard[] = [
  { id: "total_patients", label: "Pacientes Activos", value: 347, change: 4.2, icon: "Users", color: "#1E88E5", trend: "up" },
  { id: "er_waiting", label: "En Espera (ER)", value: 18, change: -2.1, icon: "Clock", color: "#F44336", trend: "down" },
  { id: "surgeries_today", label: "Cirugías Hoy", value: 9, change: 0, icon: "Scissors", color: "#9C27B0", trend: "neutral" },
  { id: "bed_occupancy", label: "Ocupación de Camas", value: "87%", change: 3.5, icon: "Bed", color: "#FF9800", trend: "up" },
  { id: "lab_pending", label: "Labs Pendientes", value: 42, change: -8.3, icon: "FlaskConical", color: "#4CAF50", trend: "down" },
  { id: "pharmacy_alerts", label: "Alertas Farmacia", value: 3, change: 0, icon: "AlertTriangle", color: "#FF5722", trend: "neutral" },
];

// ─── Wing / Floor Map ────────────────────────────────────────
export const HOSPITAL_WINGS = ["Ala Norte", "Ala Sur", "Ala Este", "Ala Oeste", "Acceso Principal"];
export const HOSPITAL_FLOORS = [
  { level: 0, label: "Planta Baja", description: "Emergencias, Accesos, Farmacia" },
  { level: 1, label: "Piso 1",      description: "Consultas Externas, Endocrinología, ORL, Reumatología" },
  { level: 2, label: "Piso 2",      description: "Medicina Interna, Pediatría, Traumatología, Neumología" },
  { level: 3, label: "Piso 3",      description: "Cardiología, Gastroenterología, Ginecología, Nefrología" },
  { level: 4, label: "Piso 4",      description: "Neurología, Psiquiatría, Cirugía General" },
  { level: 5, label: "Piso 5",      description: "Oncología, UCI, Área Restringida" },
];

// ─── Audit Event Types ───────────────────────────────────────
export type AuditEventType =
  | "LOGIN" | "LOGOUT" | "EHR_ACCESS" | "EHR_WRITE" | "EHR_ADDENDUM"
  | "PRESCRIPTION_CREATE" | "LAB_ORDER" | "IMAGING_ORDER" | "TRIAGE_UPDATE"
  | "PATIENT_ADMIT" | "PATIENT_DISCHARGE" | "ROLE_CHANGE" | "EXPORT_DATA";

// ─── ICD-11 Sample Codes (structure) ────────────────────────
export interface ICD11Code {
  code: string;
  title: string;
  category: string;
}

export const SAMPLE_ICD11_CODES: ICD11Code[] = [
  { code: "BA80",  title: "Infarto agudo de miocardio", category: "Enfermedades circulatorias" },
  { code: "BA41",  title: "Hipertensión arterial esencial", category: "Enfermedades circulatorias" },
  { code: "5A10",  title: "Diabetes mellitus tipo 1", category: "Endocrinología" },
  { code: "5A11",  title: "Diabetes mellitus tipo 2", category: "Endocrinología" },
  { code: "CA22",  title: "Asma, no especificada", category: "Enfermedades respiratorias" },
  { code: "1A00",  title: "Cólera", category: "Infecciones" },
  { code: "MD91",  title: "Fractura de fémur", category: "Traumatología" },
  { code: "8B21",  title: "Accidente cerebrovascular isquémico", category: "Neurología" },
  { code: "2C90",  title: "Carcinoma de pulmón", category: "Oncología" },
  { code: "GA14",  title: "Parto normal", category: "Obstetricia" },
];

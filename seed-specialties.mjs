import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SPECIALTIES = [
  {
    code: "CARD", name: "Cardiología",
    description: "Diagnóstico y tratamiento de enfermedades cardiovasculares, arritmias e insuficiencia cardíaca.",
    wing: "Ala Norte", floor: 3,
    rooms: ["CN-301", "CN-302", "CN-303", "CN-304"],
    color: "#F44336", emergency_capable: true,
  },
  {
    code: "PED", name: "Pediatría",
    description: "Atención médica integral para pacientes desde recién nacidos hasta 18 años.",
    wing: "Ala Este", floor: 2,
    rooms: ["CE-201", "CE-202", "CE-203", "CE-204", "CE-205"],
    color: "#FF9800", emergency_capable: true,
  },
  {
    code: "CIRUG", name: "Cirugía General",
    description: "Procedimientos quirúrgicos abdominales, laparoscópicos y de urgencias.",
    wing: "Ala Sur", floor: 4,
    rooms: ["CS-401", "CS-402", "CS-403"],
    color: "#9C27B0", emergency_capable: true,
  },
  {
    code: "MINT", name: "Medicina Interna",
    description: "Diagnóstico y manejo de enfermedades sistémicas complejas en adultos.",
    wing: "Ala Norte", floor: 2,
    rooms: ["CN-201", "CN-202", "CN-203", "CN-204", "CN-205", "CN-206"],
    color: "#1E88E5", emergency_capable: false,
  },
  {
    code: "GOBS", name: "Ginecología & Obstetricia",
    description: "Salud de la mujer, control prenatal, partos y cirugías ginecológicas.",
    wing: "Ala Este", floor: 3,
    rooms: ["CE-301", "CE-302", "CE-303", "CE-304"],
    color: "#E91E63", emergency_capable: true,
  },
  {
    code: "TRAU", name: "Traumatología & Ortopedia",
    description: "Lesiones óseas, musculares y articulares. Cirugía reconstructiva y protésica.",
    wing: "Ala Sur", floor: 2,
    rooms: ["CS-201", "CS-202", "CS-203", "CS-204"],
    color: "#795548", emergency_capable: true,
  },
  {
    code: "ONCO", name: "Oncología",
    description: "Diagnóstico, tratamiento y seguimiento de neoplasias malignas y benignas.",
    wing: "Ala Oeste", floor: 5,
    rooms: ["CO-501", "CO-502", "CO-503"],
    color: "#673AB7", emergency_capable: false,
  },
  {
    code: "GAST", name: "Gastroenterología",
    description: "Enfermedades del aparato digestivo: endoscopias, colonoscopias y tratamiento.",
    wing: "Ala Norte", floor: 3,
    rooms: ["CN-305", "CN-306"],
    color: "#4CAF50", emergency_capable: false,
  },
  {
    code: "NEFR", name: "Nefrología",
    description: "Enfermedades renales, hemodiálisis, trasplante renal y riñón crónico.",
    wing: "Ala Oeste", floor: 3,
    rooms: ["CO-301", "CO-302", "CO-303"],
    color: "#00BCD4", emergency_capable: false,
  },
  {
    code: "RAD", name: "Radiología & Imágenes",
    description: "Diagnóstico por imágenes: RX, TAC, RM, Ecografías e intervencionismo radiológico.",
    wing: "Ala Sur", floor: 1,
    rooms: ["CS-101", "CS-102", "CS-103", "CS-104"],
    color: "#607D8B", emergency_capable: true,
  },
  {
    code: "NEUR", name: "Neurología",
    description: "Sistema nervioso central y periférico. ACV, epilepsia, Parkinson y demencias.",
    wing: "Ala Norte", floor: 4,
    rooms: ["CN-401", "CN-402", "CN-403"],
    color: "#FF5722", emergency_capable: true,
  },
  {
    code: "PSIQ", name: "Psiquiatría",
    description: "Salud mental: depresión, ansiedad, psicosis y trastornos bipolares.",
    wing: "Ala Oeste", floor: 4,
    rooms: ["CO-401", "CO-402", "CO-403"],
    color: "#3F51B5", emergency_capable: false,
  },
  {
    code: "DERM", name: "Dermatología",
    description: "Enfermedades de la piel, dermatoscopía, cirugía dermatológica y estética médica.",
    wing: "Ala Este", floor: 1,
    rooms: ["CE-101", "CE-102"],
    color: "#FFC107", emergency_capable: false,
  },
  {
    code: "OFTAL", name: "Oftalmología",
    description: "Salud ocular: cataratas, glaucoma, cirugía refractiva y retina.",
    wing: "Ala Este", floor: 2,
    rooms: ["CE-206", "CE-207"],
    color: "#009688", emergency_capable: false,
  },
  {
    code: "ORL", name: "Otorrinolaringología",
    description: "Oído, nariz y garganta: sinusitis, amígdalas, audición y endoscopía nasal.",
    wing: "Ala Norte", floor: 2,
    rooms: ["CN-207", "CN-208"],
    color: "#8BC34A", emergency_capable: false,
  },
  {
    code: "UROL", name: "Urología",
    description: "Sistema urinario masculino y femenino. Próstata, litiasis renal y cirugía mínima invasiva.",
    wing: "Ala Sur", floor: 3,
    rooms: ["CS-301", "CS-302"],
    color: "#2196F3", emergency_capable: false,
  },
  {
    code: "NEUM", name: "Neumología",
    description: "Enfermedades respiratorias: asma, EPOC, fibrosis pulmonar y sueño.",
    wing: "Ala Oeste", floor: 2,
    rooms: ["CO-201", "CO-202"],
    color: "#00BCD4", emergency_capable: true,
  },
  {
    code: "ENDO", name: "Endocrinología",
    description: "Sistema endocrino: diabetes, tiroides, suprarrenales y metabolismo.",
    wing: "Ala Norte", floor: 1,
    rooms: ["CN-101", "CN-102"],
    color: "#FF9800", emergency_capable: false,
  },
  {
    code: "REUM", name: "Reumatología",
    description: "Artritis, lupus, fibromialgia y enfermedades autoinmunes del sistema musculoesquelético.",
    wing: "Ala Oeste", floor: 1,
    rooms: ["CO-101", "CO-102"],
    color: "#E91E63", emergency_capable: false,
  },
  {
    code: "EMER", name: "Medicina de Emergencias",
    description: "Urgencias médicas 24/7. Trauma mayor, reanimación y cuidados críticos de guardia.",
    wing: "Acceso Principal", floor: 0,
    rooms: ["ER-001", "ER-002", "ER-003", "ER-004", "ER-005", "ER-006", "ER-007", "ER-008"],
    color: "#F44336", emergency_capable: true,
  },
];

async function seed() {
  const { error } = await supabase.from('specialties').insert(SPECIALTIES);
  if (error) console.error('Error seeding specialties:', error);
  else console.log('Successfully seeded 20 specialties!');
}

seed();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const bedsConfig = [
  // Piso 0: Urgencias (14 beds)
  { piso: 0, ala: 'Urgencias', count: 4, tipo: 'Shock Room', prefix: 'SHK' },
  { piso: 0, ala: 'Urgencias', count: 10, tipo: 'Observación', prefix: 'OBS' },
  // Piso 1: Materno-Infantil (40 beds)
  { piso: 1, ala: 'Materno-Infantil', count: 15, tipo: 'Obstétrica', prefix: 'OBS' },
  { piso: 1, ala: 'Materno-Infantil', count: 5, tipo: 'ARO', prefix: 'ARO' },
  { piso: 1, ala: 'Materno-Infantil', count: 10, tipo: 'Pediátrica', prefix: 'PED' },
  { piso: 1, ala: 'Materno-Infantil', count: 5, tipo: 'Cuna', prefix: 'CUN' },
  { piso: 1, ala: 'Materno-Infantil', count: 5, tipo: 'Incubadora (UCIN)', prefix: 'INC' },
  // Piso 2: Medicina Interna (40 beds)
  { piso: 2, ala: 'Medicina Interna', count: 20, tipo: 'Clínica Varones', prefix: 'CMV' },
  { piso: 2, ala: 'Medicina Interna', count: 20, tipo: 'Clínica Mujeres', prefix: 'CMM' },
  // Piso 3: Bloque Quirúrgico (20 beds)
  { piso: 3, ala: 'Bloque Quirúrgico', count: 20, tipo: 'Quirúrgica Adultos', prefix: 'QIR' },
  // Piso 4: Psiquiatría (10 beds)
  { piso: 4, ala: 'Psiquiatría', count: 10, tipo: 'Seguridad Psiquiátrica', prefix: 'PSI' },
  // Piso 5: Cuidados Críticos (16 beds)
  { piso: 5, ala: 'Cuidados Críticos', count: 6, tipo: 'UTI', prefix: 'UTI' },
  { piso: 5, ala: 'Cuidados Críticos', count: 4, tipo: 'UCI', prefix: 'UCI' },
  { piso: 5, ala: 'Cuidados Críticos', count: 4, tipo: 'UCO', prefix: 'UCO' },
  { piso: 5, ala: 'Cuidados Críticos', count: 2, tipo: 'Aislamiento', prefix: 'AIS' }
];

async function run() {
  console.log('Clearing existing beds...');
  await supabase.from('camas').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  let totalInserted = 0;
  console.log('Seeding beds...');
  
  const bedsToInsert = [];
  
  for (const block of bedsConfig) {
    for (let i = 1; i <= block.count; i++) {
      const codeStr = i.toString().padStart(2, '0');
      const bedCode = `${block.piso}${block.prefix}-${codeStr}`;
      bedsToInsert.push({
        bed_code: bedCode,
        numero: codeStr,
        ala: block.ala,
        piso: block.piso,
        tipo: block.tipo,
        estado: 'DISPONIBLE'
      });
    }
  }

  const { error } = await supabase.from('camas').insert(bedsToInsert);
  if (error) {
    console.error('Error seeding beds:', error);
  } else {
    totalInserted = bedsToInsert.length;
    console.log(`Successfully seeded ${totalInserted} beds!`);
  }
}
run();

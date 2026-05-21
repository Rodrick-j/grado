const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runTest() {
  console.log("Iniciando prueba de concurrencia de Fila Virtual...");
  
  // Realizar 5 peticiones concurrentes simulando clicks simultáneos en el botón
  const requests = Array.from({ length: 5 }).map((_, i) => {
    const randomCI = Math.floor(Math.random() * 90000000) + 10000000;
    return supabase.rpc('register_and_claim_token', {
      p_first_name: 'PacienteConcurrent',
      p_last_name: `Test-${i}`,
      p_birth_date: '1995-05-15',
      p_gender: 'FEMALE',
      p_ci_passport: `TEST-CI-${randomCI}`,
      p_phone: '+591 70000000',
      p_email: null,
      p_department: 'EMERGENCY'
    });
  });

  console.log("Enviando 5 solicitudes concurrentes a la base de datos...");
  const start = Date.now();
  const results = await Promise.all(requests);
  const duration = Date.now() - start;
  console.log(`Todas las solicitudes respondieron en ${duration}ms.\n`);

  results.forEach((res, idx) => {
    if (res.error) {
      console.error(`[Solicitud ${idx}] FALLIDA:`, res.error.message);
    } else {
      console.log(`[Solicitud ${idx}] EXITOSA! Turno Asignado:`, res.data[0].token_number, "| DNI:", res.data[0].patient_dni);
    }
  });
}

runTest();

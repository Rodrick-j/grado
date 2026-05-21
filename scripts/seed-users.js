const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if(key && value.length > 0) env[key.trim()] = value.join('=').trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createDemoUsers() {
  const users = [
    { email: 'admin@faro.com', password: 'password123', name: 'Ing. Carlos Admin', role: 'SUPER_ADMIN' },
    { email: 'director@faro.com', password: 'password123', name: 'Dr. Roberto Medina', role: 'MEDICAL_DIRECTOR' },
    { email: 'medico@faro.com', password: 'password123', name: 'Dra. Ana Sofía Torres', role: 'DOCTOR' },
    { email: 'enfermeria@faro.com', password: 'password123', name: 'Lic. Marta Gómez', role: 'NURSE' },
    { email: 'lab@faro.com', password: 'password123', name: 'Tec. Luis Ramírez', role: 'LAB_TECHNICIAN' },
    { email: 'recepcion@faro.com', password: 'password123', name: 'Valeria Castro', role: 'RECEPTIONIST' },
    { email: 'caja@faro.com', password: 'password123', name: 'Lic. Fernando Rojas', role: 'BILLING' }
  ];

  for (const u of users) {
    console.log(`Creating user ${u.email}...`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        full_name: u.name,
        role: u.role
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error(`Error creating auth user ${u.email}:`, authError.message);
      continue;
    }

    let uid = authData?.user?.id;
    if (!uid) {
        // If already registered, fetch the user id
        const { data: usersData } = await supabase.auth.admin.listUsers();
        uid = usersData.users.find(x => x.email === u.email)?.id;
    }

    if (uid) {
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: uid,
        full_name: u.name,
        role: u.role
      });

      if (profileError) {
        console.error(`Error creating profile for ${u.email}:`, profileError.message);
      } else {
        console.log(`Successfully created/updated profile for ${u.email}`);
      }
    }
  }
}

createDemoUsers().then(() => console.log('Done.')).catch(console.error);

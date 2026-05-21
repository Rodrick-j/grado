import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

    if (authError) {
      console.error(`Error creating auth user ${u.email}:`, authError.message);
      continue;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: authData.user.id,
        full_name: u.name,
        role: u.role,
        is_active: true
      });

      if (profileError) {
        console.error(`Error creating profile for ${u.email}:`, profileError.message);
      } else {
        console.log(`Successfully created user & profile for ${u.email}`);
      }
    }
  }
}

createDemoUsers().then(() => console.log('Done.')).catch(console.error);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: specialties } = await supabase.from('specialties').select('*');
  const { data: professionals } = await supabase.from('professionals').select('specialty_id');
  
  const specCounts = {};
  specialties.forEach(s => specCounts[s.id] = 0);
  professionals.forEach(p => {
    if (specCounts[p.specialty_id] !== undefined) specCounts[p.specialty_id]++;
  });
  
  const emptySpecialties = specialties.filter(s => specCounts[s.id] === 0);
  console.log(`Found ${emptySpecialties.length} empty specialties. Seeding...`);
  
  for (const sp of emptySpecialties) {
    const email = `dr.${sp.code.toLowerCase().replace(/[^a-z0-9]/g, '')}@sjdios.org`;
    const pwd = 'Password123!';
    
    let userId = null;
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true
    });
    
    if (authErr && authErr.message !== 'User already registered') {
      // Find if exists
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users.users.find(u => u.email === email);
      if (existing) userId = existing.id;
      else {
        console.error('Auth error for', email, authErr);
        continue;
      }
    } else if (authUser?.user?.id) {
      userId = authUser.user.id;
    }
    
    if (!userId) continue;

    const fullName = `Dr. Especialista en ${sp.name}`;
    
    await supabase.from('user_profiles').upsert({
      id: userId,
      full_name: fullName,
      role: 'DOCTOR',
      specialty_id: sp.id,
      phone: '+1 (555) 000-0000',
      active: true
    });
    
    await supabase.from('professionals').upsert({
      user_id: userId,
      license_number: `MP-${sp.code}-${Math.floor(Math.random()*10000)}`,
      specialty_id: sp.id,
      years_experience: 5,
      status: 'active'
    });
    
    console.log(`Created doctor for ${sp.name}`);
  }
  console.log('Seeding complete!');
}
run();

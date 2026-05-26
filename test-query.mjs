import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      id,
      creator:user_profiles!patients_created_by_fkey (
        full_name,
        professionals!professionals_user_id_fkey (
          specialty:specialties!professionals_specialty_id_fkey (name)
        )
      )
    `)
    .limit(2);
    
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

run();

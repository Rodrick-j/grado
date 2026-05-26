import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('patients').select('id, first_name, last_name, mrn').limit(5);
  console.log(data?.length || 0, 'patients found');
  if (data?.length > 0) {
    console.log(data);
  } else {
    console.log(error);
  }
}
test();

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

fetch(`${url}/rest/v1/user_profiles?select=id,full_name,role,active,visible_password,professionals!professionals_user_id_fkey(license_number)`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
}).then(async res => {
  console.log(res.status);
  console.log(await res.text());
}).catch(console.error);

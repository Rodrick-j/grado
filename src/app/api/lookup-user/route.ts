import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  // Use service role key to bypass RLS and access the RPC
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabaseAdmin.rpc('get_profile_by_email', {
      p_email: email,
    });

    if (error) {
      console.error('Error looking up user by email:', error);
      return NextResponse.json({ found: false }, { status: 500 });
    }

    if (data && data.found) {
      return NextResponse.json({
        found: true,
        full_name: data.full_name,
        role: data.role,
        specialty: data.specialty,
      });
    }

    return NextResponse.json({ found: false }, { status: 200 });
  } catch (err) {
    console.error('Exception looking up user:', err);
    return NextResponse.json({ found: false }, { status: 500 });
  }
}

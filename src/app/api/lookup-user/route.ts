import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — safe on server only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email || !email.includes('@')) {
    return NextResponse.json({ found: false });
  }

  try {
    // 1. Find user by email in auth.users
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (authErr) return NextResponse.json({ found: false });

    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) return NextResponse.json({ found: false });

    // 2. Get user profile (role + full_name)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profile) return NextResponse.json({ found: false });

    // 3. Get specialty if DOCTOR or RADIOLOGIST
    let specialty: string | null = null;
    if (['DOCTOR', 'RADIOLOGIST'].includes(profile.role)) {
      const { data: prof } = await supabase
        .from('professionals')
        .select('specialties(name)')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (prof && (prof as any).specialties?.name) {
        specialty = (prof as any).specialties.name;
      }
    }

    return NextResponse.json({
      found: true,
      full_name: profile.full_name,
      role: profile.role,
      specialty,
    });

  } catch {
    return NextResponse.json({ found: false });
  }
}

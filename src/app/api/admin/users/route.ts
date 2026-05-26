import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'FETCH_ALL') {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          full_name,
          role,
          active,
          visible_password,
          professionals!professionals_user_id_fkey(license_number)
        `);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      const merged = data.map((profile: any) => {
        const authUser = authData?.users.find((u: any) => u.id === profile.id);
        return {
          ...profile,
          email: authUser?.email || 'usuario@sjdios.org'
        };
      });

      return NextResponse.json(merged);
    }

    const { email, password, full_name, role, specialty_id, license_number } = body;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Error creating user' }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. The trigger in 002_security.sql might auto-create a user_profiles row.
    // If it does, we need to UPDATE it instead of INSERT. Let's try UPDATE first.
    let { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name,
        role,
        specialty_id: specialty_id || null,
        must_change_pwd: true,
        visible_password: password,
      })
      .eq('id', userId);

    if (profileError) {
      // If it fails because the trigger didn't exist or row isn't there, we INSERT
      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          full_name,
          role,
          specialty_id: specialty_id || null,
          must_change_pwd: true,
          visible_password: password,
        });
      if (insertError) {
        // Rollback auth user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: 'Error creating profile: ' + insertError.message }, { status: 500 });
      }
    }

    // 3. Create professional record if applicable
    const clinicalRoles = ['DOCTOR', 'MEDICAL_DIRECTOR', 'RESIDENT', 'NURSE', 'RADIOLOGIST'];
    if (clinicalRoles.includes(role) && license_number && specialty_id) {
      const { error: profError } = await supabaseAdmin
        .from('professionals')
        .insert({
          user_id: userId,
          license_number,
          specialty_id,
          title: role === 'NURSE' ? 'Lic.' : 'Dr.',
        });
      
      if (profError) {
        console.error('Error creating professional record', profError);
        // We do not rollback user, just log error for demo
      }
    }

    return NextResponse.json({ success: true, user_id: userId });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { user_id, action, password } = body;

    if (!user_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'TOGGLE_ACTIVE') {
      const { data: profile } = await supabaseAdmin.from('user_profiles').select('active').eq('id', user_id).single();
      if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      
      await supabaseAdmin.from('user_profiles').update({ active: !profile.active }).eq('id', user_id);
      return NextResponse.json({ success: true, active: !profile.active });
    }

    if (action === 'RESET_PASSWORD') {
      if (!password) return NextResponse.json({ error: 'New password required' }, { status: 400 });
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      
      await supabaseAdmin.from('user_profiles').update({ must_change_pwd: true, visible_password: password }).eq('id', user_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

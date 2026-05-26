export async function onRequestPost(context) {
  const { request, env } = context;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://otnxrygdyuklaygqelpe.supabase.co';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_eK21zg-nyRMdHyTL8CfLCA_vzFcYwut';

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'FETCH_ALL') {
      const res = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=id,full_name,role,active,visible_password,professionals!professionals_user_id_fkey(license_number)`, {
        headers
      });
      if (!res.ok) throw new Error('Error fetching profiles');
      const data = await res.json();
      return Response.json(data);
    }

    const { email, password, full_name, role, specialty_id, license_number } = body;

    if (!email || !password || !full_name || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create Auth User
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      })
    });

    if (!authRes.ok) {
      const err = await authRes.json();
      return Response.json({ error: err.message || 'Error creating user' }, { status: 400 });
    }
    const authData = await authRes.json();
    const userId = authData.id;

    // 2. Update or Insert Profile
    const profileData = {
      full_name,
      role,
      specialty_id: specialty_id || null,
      must_change_pwd: true,
      visible_password: password
    };

    // Try update first
    let profRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(profileData)
    });

    if (!profRes.ok) {
      // Insert if update failed
      profRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ id: userId, ...profileData })
      });
      if (!profRes.ok) {
        // We can't rollback auth easily here without another fetch, so we just return error
        return Response.json({ error: 'Error creating profile' }, { status: 500 });
      }
    }

    // 3. Create professional record
    const clinicalRoles = ['DOCTOR', 'MEDICAL_DIRECTOR', 'RESIDENT', 'NURSE', 'RADIOLOGIST'];
    if (clinicalRoles.includes(role) && license_number && specialty_id) {
      await fetch(`${supabaseUrl}/rest/v1/professionals`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          license_number,
          specialty_id,
          title: role === 'NURSE' ? 'Lic.' : 'Dr.'
        })
      });
    }

    return Response.json({ success: true, user_id: userId });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://otnxrygdyuklaygqelpe.supabase.co';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_eK21zg-nyRMdHyTL8CfLCA_vzFcYwut';

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { user_id, action, password } = body;

    if (!user_id || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'TOGGLE_ACTIVE') {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${user_id}&select=active`, { headers });
      const data = await getRes.json();
      if (!data || data.length === 0) return Response.json({ error: 'User not found' }, { status: 404 });
      
      const newActive = !data[0].active;
      await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${user_id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ active: newActive })
      });
      return Response.json({ success: true, active: newActive });
    }

    if (action === 'RESET_PASSWORD') {
      if (!password) return Response.json({ error: 'New password required' }, { status: 400 });
      
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password })
      });
      if (!authRes.ok) return Response.json({ error: 'Failed to update auth password' }, { status: 400 });
      
      await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${user_id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ must_change_pwd: true, visible_password: password })
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

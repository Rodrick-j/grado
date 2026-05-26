export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email || !email.includes('@')) {
    return Response.json({ found: false });
  }

  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://otnxrygdyuklaygqelpe.supabase.co';
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_eK21zg-nyRMdHyTL8CfLCA_vzFcYwut';

    // Buscar usuario
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    const { users } = await listRes.json();
    const authUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) return Response.json({ found: false });

    // Obtener perfil
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles?id=eq.${authUser.id}&select=full_name,role`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const profiles = await profileRes.json();
    const profile = profiles?.[0];
    if (!profile) return Response.json({ found: false });

    // Especialidad
    let specialty = null;
    if (['DOCTOR', 'RADIOLOGIST'].includes(profile.role)) {
      const profRes = await fetch(
        `${supabaseUrl}/rest/v1/professionals?user_id=eq.${authUser.id}&select=specialties(name)`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      const profs = await profRes.json();
      specialty = profs?.[0]?.specialties?.name || null;
    }

    return Response.json({ found: true, full_name: profile.full_name, role: profile.role, specialty });
  } catch (err) {
    return Response.json({ found: false, error: err.message });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.json();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://otnxrygdyuklaygqelpe.supabase.co';
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_eK21zg-nyRMdHyTL8CfLCA_vzFcYwut';

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };

    // Especialidad map
    const SPECIALTY_CODE_MAP = {
      'SP-001': 'CARD', 'SP-002': 'PED',  'SP-003': 'CIRUG', 'SP-004': 'MINT',
      'SP-005': 'GOBS', 'SP-006': 'TRAU', 'SP-007': 'ONCO',  'SP-008': 'GAST',
      'SP-009': 'NEFR', 'SP-010': 'RAD',  'SP-011': 'NEUR',  'SP-012': 'PSIQ',
      'SP-013': 'DERM', 'SP-014': 'OFTAL','SP-015': 'ORL',   'SP-016': 'UROL',
      'SP-017': 'NEUM', 'SP-018': 'ENDO', 'SP-019': 'REUM',  'SP-020': 'EMER',
    };
    const specialtyCode = SPECIALTY_CODE_MAP[formData.specialty_id] || 'CARD';

    // 1. Get Real Specialty ID
    const specRes = await fetch(`${supabaseUrl}/rest/v1/specialties?code=eq.${specialtyCode}&select=id`, { headers });
    const specData = await specRes.json();
    if (!specData || specData.length === 0) throw new Error(`Especialidad no encontrada: ${specialtyCode}`);
    const realSpecialtyId = specData[0].id;

    // 2. Create Auth User
    const tempPassword = `FARO-${Math.random().toString(36).slice(2, 10).toUpperCase()}!`;
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: formData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: formData.full_name, role: formData.role }
      })
    });
    
    if (!authRes.ok) {
      const err = await authRes.json();
      throw new Error(err.message || 'Error creando usuario en Auth.');
    }
    const authData = await authRes.json();
    const userId = authData.id;

    // We will let the frontend handle the image uploads later since they can just use the regular supabase client for storage 
    // if we allow it, but we can also just save the data. For simplicity in Cloudflare Pages functions, we skip base64 images here
    // or let the frontend do it after the user is created.
    // Actually, let's just update the profile and professional records directly.

    // 3. Update User Profile
    const profileUpdate = {
      specialty_id: realSpecialtyId,
      phone: formData.phone,
      must_change_pwd: true,
    };

    const profUpdateRes = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(profileUpdate)
    });

    if (!profUpdateRes.ok) throw new Error('Error actualizando perfil');

    // 4. Insert Professional
    const certArray = formData.certifications ? formData.certifications.split(',').map(c => c.trim()).filter(Boolean) : [];
    const roomsArray = formData.consulting_rooms ? formData.consulting_rooms.split(',').map(r => r.trim()).filter(Boolean) : [];

    const profInsertData = {
      user_id: userId,
      title: formData.title || 'Dr.',
      license_number: formData.license_number,
      license_country: formData.license_country || 'VE',
      license_expires: formData.license_expires || null,
      license_verified: false,
      specialty_id: realSpecialtyId,
      subspecialty: formData.subspecialty || null,
      certifications: certArray,
      years_experience: Number(formData.years_experience) || 1,
      graduated_from: formData.graduated_from || null,
      graduation_year: Number(formData.graduation_year) || null,
      contract_type: formData.contract_type || 'PERMANENT',
      hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
      shift_preference: formData.shift_preference || 'MORNING',
      max_weekly_hours: Number(formData.max_weekly_hours) || 48,
      on_call: formData.on_call || false,
      consulting_rooms: roomsArray,
      status: 'active'
    };

    const profInsertRes = await fetch(`${supabaseUrl}/rest/v1/professionals`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(profInsertData)
    });

    if (!profInsertRes.ok) throw new Error('Error creando perfil profesional');

    return Response.json({ success: true, tempPassword, userId });

  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Error desconocido' }, { status: 400 });
  }
}

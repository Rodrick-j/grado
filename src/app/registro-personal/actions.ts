'use server';

import { createClient } from '@supabase/supabase-js';

export interface ProfessionalFormData {
  // Step 1 - Datos Personales
  full_name: string;
  email: string;
  phone: string;
  ci_passport: string;
  title: string;
  role: string;
  photo_base64?: string;
  // Step 2 - Credenciales
  license_number: string;
  license_country: string;
  license_expires: string;
  degree_base64?: string;
  // Step 3 - Perfil Clínico
  specialty_id: string; // This is the MOCK id like SP-001, we'll map to real UUID
  subspecialty: string;
  years_experience: number;
  graduated_from: string;
  graduation_year: number;
  certifications: string; // comma-separated
  // Step 4 - Contrato
  contract_type: string;
  hire_date: string;
  shift_preference: string;
  max_weekly_hours: number;
  on_call: boolean;
  consulting_rooms: string; // comma-separated
}

// Map from mock specialty code to real specialty code (both use the same codes like CARD, PED, etc.)
// The mock uses SP-001 style IDs but the codes match
const SPECIALTY_CODE_MAP: Record<string, string> = {
  'SP-001': 'CARD', 'SP-002': 'PED',  'SP-003': 'CIRUG', 'SP-004': 'MINT',
  'SP-005': 'GOBS', 'SP-006': 'TRAU', 'SP-007': 'ONCO',  'SP-008': 'GAST',
  'SP-009': 'NEFR', 'SP-010': 'RAD',  'SP-011': 'NEUR',  'SP-012': 'PSIQ',
  'SP-013': 'DERM', 'SP-014': 'OFTAL','SP-015': 'ORL',   'SP-016': 'UROL',
  'SP-017': 'NEUM', 'SP-018': 'ENDO', 'SP-019': 'REUM',  'SP-020': 'EMER',
};

export async function createProfessionalAction(formData: ProfessionalFormData) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Resolve specialty UUID
    const specialtyCode = SPECIALTY_CODE_MAP[formData.specialty_id] || 'CARD';
    const { data: specData, error: specError } = await supabase
      .from('specialties').select('id').eq('code', specialtyCode).single();

    if (specError || !specData) throw new Error(`Especialidad no encontrada: ${specialtyCode}`);
    const realSpecialtyId = specData.id;

    // Generate a random temporary password
    const tempPassword = `FARO-${Math.random().toString(36).slice(2, 10).toUpperCase()}!`;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: formData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: formData.full_name, role: formData.role }
    });

    if (authError || !authData?.user) throw new Error(authError?.message || 'Error creando usuario en Auth.');
    const userId = authData.user.id;

    let avatarUrl = null;
    let degreeUrl = null;

    // Subir Foto del Profesional si está presente
    if (formData.photo_base64) {
      try {
        const photoBuffer = Buffer.from(formData.photo_base64.split(',')[1], 'base64');
        const { error: photoErr } = await supabase.storage
          .from('professionals')
          .upload(`${userId}/photo.png`, photoBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        if (!photoErr) {
          const { data: publicUrlData } = supabase.storage.from('professionals').getPublicUrl(`${userId}/photo.png`);
          avatarUrl = publicUrlData.publicUrl;
        } else {
          console.error('Error al subir foto de especialista:', photoErr);
        }
      } catch (uploadErr) {
        console.error('Excepción al subir foto de especialista:', uploadErr);
      }
    }

    // Subir Foto del Título si está presente
    if (formData.degree_base64) {
      try {
        const degreeBuffer = Buffer.from(formData.degree_base64.split(',')[1], 'base64');
        const { error: degreeErr } = await supabase.storage
          .from('professionals')
          .upload(`${userId}/degree.png`, degreeBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        if (!degreeErr) {
          const { data: publicUrlData } = supabase.storage.from('professionals').getPublicUrl(`${userId}/degree.png`);
          degreeUrl = publicUrlData.publicUrl;
        } else {
          console.error('Error al subir título profesional:', degreeErr);
        }
      } catch (uploadErr) {
        console.error('Excepción al subir título profesional:', uploadErr);
      }
    }

    // Update the auto-created user_profile with extra data
    const profileUpdate: any = {
      specialty_id: realSpecialtyId,
      phone: formData.phone,
      must_change_pwd: true,
    };
    if (avatarUrl) {
      profileUpdate.avatar_url = avatarUrl;
    }

    const { error: profileError } = await supabase.from('user_profiles').update(profileUpdate).eq('id', userId);

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Error actualizando perfil: ${profileError.message}`);
    }

    // Insert into professionals table
    const certArray = formData.certifications
      ? formData.certifications.split(',').map(c => c.trim()).filter(Boolean)
      : [];
    const roomsArray = formData.consulting_rooms
      ? formData.consulting_rooms.split(',').map(r => r.trim()).filter(Boolean)
      : [];

    const { error: profError } = await supabase.from('professionals').insert({
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
      status: 'active',
      degree_url: degreeUrl
    });

    if (profError) {
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Error creando perfil profesional: ${profError.message}`);
    }

    return { success: true, tempPassword };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

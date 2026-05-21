'use server';

import { createClient } from '@supabase/supabase-js';

export interface PatientFormData {
  ci_passport: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  phone_primary: string;
  email?: string;
  address_line1?: string;
  city?: string;
  emergency_name?: string;
  emergency_phone?: string;
  insurance_provider?: string;
  insurance_policy_num?: string;
  consent_treatment: boolean;
  consent_data: boolean;
  consent_signature_url?: string;
  photo_base64?: string;
  id_card_base64?: string;
}

export async function createPatientAction(formData: PatientFormData) {
  try {
    // Usamos SERVICE_ROLE para poder insertar independientemente de la sesión del cliente
    // (ideal para cuando el recepcionista aún no tiene los permisos 100% configurados)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Formatear datos
    const payload = {
      ci_passport: formData.ci_passport,
      first_name: formData.first_name,
      last_name: formData.last_name,
      birth_date: formData.birth_date,
      gender: formData.gender,
      phone_primary: formData.phone_primary,
      email: formData.email || null,
      address_line1: formData.address_line1 || null,
      city: formData.city || null,
      emergency_name: formData.emergency_name || null,
      emergency_phone: formData.emergency_phone || null,
      insurance_provider: formData.insurance_provider || null,
      insurance_policy_num: formData.insurance_policy_num || null,
      consent_treatment: formData.consent_treatment,
      consent_data: formData.consent_data,
      consent_signature_url: formData.consent_signature_url || null,
      consent_signed_at: formData.consent_treatment ? new Date().toISOString() : null,
      status: 'ACTIVE'
    };

    const { data, error } = await supabase
      .from('patients')
      .insert(payload)
      .select('id, mrn, first_name, last_name')
      .single();

    if (error) {
      console.error('Error insertando paciente:', error);
      throw new Error(error.message);
    }

    const patientId = data.id;
    let photo_url = null;
    let id_card_url = null;

    // Subir Foto de Perfil si está presente
    if (formData.photo_base64) {
      try {
        const photoBuffer = Buffer.from(formData.photo_base64.split(',')[1], 'base64');
        const { error: photoErr } = await supabase.storage
          .from('patients')
          .upload(`${patientId}/photo.png`, photoBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        if (!photoErr) {
          const { data: publicUrlData } = supabase.storage.from('patients').getPublicUrl(`${patientId}/photo.png`);
          photo_url = publicUrlData.publicUrl;
        } else {
          console.error('Error al subir foto de perfil:', photoErr);
        }
      } catch (uploadErr) {
        console.error('Excepción al subir foto de perfil:', uploadErr);
      }
    }

    // Subir Carnet de Identidad si está presente
    if (formData.id_card_base64) {
      try {
        const idCardBuffer = Buffer.from(formData.id_card_base64.split(',')[1], 'base64');
        const { error: idCardErr } = await supabase.storage
          .from('patients')
          .upload(`${patientId}/id_card.png`, idCardBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        if (!idCardErr) {
          const { data: publicUrlData } = supabase.storage.from('patients').getPublicUrl(`${patientId}/id_card.png`);
          id_card_url = publicUrlData.publicUrl;
        } else {
          console.error('Error al subir carnet:', idCardErr);
        }
      } catch (uploadErr) {
        console.error('Excepción al subir carnet:', uploadErr);
      }
    }

    // Actualizar registro del paciente con las URLs públicas
    if (photo_url || id_card_url) {
      const updatePayload: any = {};
      if (photo_url) updatePayload.photo_url = photo_url;
      if (id_card_url) updatePayload.id_card_url = id_card_url;

      const { error: updateErr } = await supabase
        .from('patients')
        .update(updatePayload)
        .eq('id', patientId);
      
      if (updateErr) {
        console.error('Error al actualizar urls de fotos en paciente:', updateErr);
      }
    }

    return { success: true, patient: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error desconocido al registrar paciente.' };
  }
}

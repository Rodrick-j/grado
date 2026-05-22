import { createClient } from '@/lib/supabase';

export interface ProfessionalFormData {
  full_name: string;
  email: string;
  phone: string;
  ci_passport: string;
  title: string;
  role: string;
  photo_base64?: string;
  license_number: string;
  license_country: string;
  license_expires: string;
  degree_base64?: string;
  specialty_id: string;
  subspecialty: string;
  years_experience: number;
  graduated_from: string;
  graduation_year: number;
  certifications: string;
  contract_type: string;
  hire_date: string;
  shift_preference: string;
  max_weekly_hours: number;
  on_call: boolean;
  consulting_rooms: string;
}

export async function createProfessionalAction(formData: ProfessionalFormData) {
  try {
    // 1. Call Cloudflare Pages Function to create auth user and records
    const res = await fetch('/api/create-professional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al crear profesional');
    }

    const userId = data.userId;
    const supabase = createClient();
    
    // 2. Client-side image upload using the current admin session
    let avatarUrl = null;
    let degreeUrl = null;

    if (formData.photo_base64) {
      try {
        const photoRes = await fetch(formData.photo_base64);
        const photoBlob = await photoRes.blob();
        await supabase.storage.from('professionals').upload(`${userId}/photo.png`, photoBlob, { contentType: 'image/png', upsert: true });
        const { data: pData } = supabase.storage.from('professionals').getPublicUrl(`${userId}/photo.png`);
        avatarUrl = pData.publicUrl;
      } catch (e) { console.error('Error foto:', e); }
    }

    if (formData.degree_base64) {
      try {
        const degreeRes = await fetch(formData.degree_base64);
        const degreeBlob = await degreeRes.blob();
        await supabase.storage.from('professionals').upload(`${userId}/degree.png`, degreeBlob, { contentType: 'image/png', upsert: true });
        const { data: dData } = supabase.storage.from('professionals').getPublicUrl(`${userId}/degree.png`);
        degreeUrl = dData.publicUrl;
      } catch (e) { console.error('Error titulo:', e); }
    }

    // 3. Update records with image URLs if successful
    if (avatarUrl) {
      await supabase.from('user_profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
    }
    if (degreeUrl) {
      await supabase.from('professionals').update({ degree_url: degreeUrl }).eq('user_id', userId);
    }

    return { success: true, tempPassword: data.tempPassword };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error desconocido' };
  }
}

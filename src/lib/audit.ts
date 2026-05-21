import { createClient } from './supabase';

export async function logAuditEvent({
  action,
  resource_type,
  resource_id,
  old_values = null,
  new_values = null,
  outcome = 'SUCCESS',
  error_detail = null
}: {
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  outcome?: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  error_detail?: string | null;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      user_role: user.user_metadata?.role || 'RECEPTIONIST',
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      outcome,
      error_detail,
      ip_address: '127.0.0.1',
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
    }]);
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

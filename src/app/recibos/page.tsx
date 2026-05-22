import { RoleGuard } from '@/components/RoleGuard';
import RecibosPage from '@/components/pages/RecibosPage';
import { AppShell } from '@/components/AppShell';

export const metadata = { title: 'Recibos & Caja — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','BILLING','RECEPTIONIST','AUDITOR']}>
        <RecibosPage />
      </RoleGuard>
    </AppShell>
  );
}

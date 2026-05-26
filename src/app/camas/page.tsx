import { AppShell } from '@/components/AppShell';
import { RoleGuard } from '@/components/RoleGuard';
import CamasPage from '@/components/pages/CamasPage';

export const metadata = { title: 'Gestión de Camas — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE','RECEPTIONIST','AUDITOR']}>
        <CamasPage />
      </RoleGuard>
    </AppShell>
  );
}

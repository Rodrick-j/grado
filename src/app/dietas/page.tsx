import { AppShell } from '@/components/AppShell';
import DietasPage from '@/components/pages/DietasPage';
import { RoleGuard } from '@/components/RoleGuard';

export const metadata = { title: 'Nutrición y Dietética — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN', 'MEDICAL_DIRECTOR', 'DOCTOR', 'RESIDENT', 'NURSE', 'AUDITOR']}>
        <DietasPage />
      </RoleGuard>
    </AppShell>
  );
}

import { AppShell } from '@/components/AppShell';
import { RoleGuard } from '@/components/RoleGuard';
import UCIPage from '@/components/pages/UCIPage';

export const metadata = { title: 'Unidad de Cuidados Intensivos — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE','AUDITOR']}>
        <UCIPage />
      </RoleGuard>
    </AppShell>
  );
}

import { AppShell } from '@/components/AppShell';
import { RoleGuard } from '@/components/RoleGuard';
import RecibosPage from '@/components/pages/RecibosPage';

export const metadata = {
  title: 'Emisión de Recibos — Caja Central — Hospital San Juan de Dios',
};

export default function Page() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','BILLING','RECEPTIONIST','AUDITOR']}>
        <RecibosPage />
      </RoleGuard>
    </AppShell>
  );
}

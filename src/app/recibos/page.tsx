import { RoleGuard } from '@/components/RoleGuard';
import RecibosPage from '@/components/pages/RecibosPage';

export const metadata = { title: 'Recibos & Caja — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','BILLING','RECEPTIONIST','AUDITOR']}>
      <RecibosPage />
    </RoleGuard>
  );
}

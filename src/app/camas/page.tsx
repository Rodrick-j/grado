import { RoleGuard } from '@/components/RoleGuard';
import CamasPage from '@/components/pages/CamasPage';

export const metadata = { title: 'Camas & Hospitalización — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE','RECEPTIONIST','AUDITOR']}>
      <CamasPage />
    </RoleGuard>
  );
}

import { RoleGuard } from '@/components/RoleGuard';
import UCIPage from '@/components/pages/UCIPage';

export const metadata = { title: 'UCI / Cuidados Intensivos — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','DOCTOR','NURSE','AUDITOR']}>
      <UCIPage />
    </RoleGuard>
  );
}

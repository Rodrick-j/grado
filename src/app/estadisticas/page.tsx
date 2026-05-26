import { AppShell } from '@/components/AppShell';
import { RoleGuard } from '@/components/RoleGuard';
import EstadisticasPage from '@/components/pages/EstadisticasPage';

export const metadata = { title: 'Estadísticas & Reportes — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN','MEDICAL_DIRECTOR','AUDITOR']}>
        <EstadisticasPage />
      </RoleGuard>
    </AppShell>
  );
}

import { AppShell } from '@/components/AppShell';
import { RoleGuard } from '@/components/RoleGuard';
import { RBACPage } from '@/components/pages/RBACPage';

export const metadata = { title: 'Gestión de Accesos (RBAC) — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN']}>
        <RBACPage />
      </RoleGuard>
    </AppShell>
  );
}

import { AppShell } from '@/components/AppShell';
import { RBACPage } from '@/components/pages/RBACPage';
import { RoleGuard } from '@/components/RoleGuard';

export default function RolesRoute() {
  return (
    <AppShell>
      <RoleGuard allowedRoles={['SUPER_ADMIN']}>
        <RBACPage />
      </RoleGuard>
    </AppShell>
  );
}

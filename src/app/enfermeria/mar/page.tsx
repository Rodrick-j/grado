import { AppShell } from '@/components/AppShell';
import MARPage from '@/components/pages/MARPage';

export const metadata = { title: 'MAR — Medicación | Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <MARPage />
    </AppShell>
  );
}

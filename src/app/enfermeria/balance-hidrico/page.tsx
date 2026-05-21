import { AppShell } from '@/components/AppShell';
import BalanceHidricoPage from '@/components/pages/BalanceHidricoPage';

export const metadata = { title: 'Balance Hídrico — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <BalanceHidricoPage />
    </AppShell>
  );
}

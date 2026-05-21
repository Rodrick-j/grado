import { AppShell } from '@/components/AppShell';
import { QuirofanoPage } from '@/components/pages/QuirofanoPage';

export const metadata = { title: 'Quirófano & Cirugía — Hospital San Juan de Dios' };

export default function Page() {
  return (
    <AppShell>
      <QuirofanoPage />
    </AppShell>
  );
}

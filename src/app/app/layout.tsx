import { AppShell } from '@/components/layout';
import { ActiveSessionProvider } from '@/lib/offline';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ActiveSessionProvider>
      <AppShell>{children}</AppShell>
    </ActiveSessionProvider>
  );
}

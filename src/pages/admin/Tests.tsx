import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { TestManager } from '../../components/TestManager';

export default function AdminTests() {
  const user = useGuard('admin');
  if (!user) return null;
  return (
    <AppShell role="admin" title="Tests" subtitle="Publish, review and retire assessments">
      <TestManager scope="admin" />
    </AppShell>
  );
}

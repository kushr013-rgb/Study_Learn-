import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { TestManager } from '../../components/TestManager';

export default function FacultyTests() {
  const user = useGuard('faculty');
  if (!user) return null;
  return (
    <AppShell role="faculty" title="Test Builder" subtitle="Assemble and publish assessments">
      <TestManager scope="faculty" />
    </AppShell>
  );
}

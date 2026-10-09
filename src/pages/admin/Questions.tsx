import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { QuestionManager } from '../../components/QuestionManager';

export default function AdminQuestions() {
  const user = useGuard('admin');
  if (!user) return null;
  return (
    <AppShell role="admin" title="Questions" subtitle="Complete control over the question bank">
      <QuestionManager scope="admin" authorId={user.id} />
    </AppShell>
  );
}

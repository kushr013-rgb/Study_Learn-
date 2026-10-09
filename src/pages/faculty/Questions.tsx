import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { QuestionManager } from '../../components/QuestionManager';

export default function FacultyQuestions() {
  const user = useGuard('faculty');
  if (!user) return null;
  return (
    <AppShell role="faculty" title="Question Bank" subtitle="Author, review and publish questions">
      <QuestionManager scope="faculty" authorId={user.id} />
    </AppShell>
  );
}

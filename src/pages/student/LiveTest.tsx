import { useMemo } from 'react';
import { useMatch, useRouter } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { testService } from '../../services/testService';
import { attemptService } from '../../services/attemptService';
import { useDB } from '../../services/db';
import { Button, Card, EmptyState } from '../../components/ui';
import { QuestionPlayer, type PlayerResult } from '../../components/QuestionPlayer';
import { useToast } from '../../components/ui/Toast';

export default function LiveTest() {
  const user = useGuard('student');
  const { navigate } = useRouter();
  const toast = useToast();
  const db = useDB();
  const m = useMatch('/student/test/:id');
  const testId = m?.id;

  const test = useMemo(() => {
    const item = testId ? testService.getById(testId) : undefined;
    return item?.exam === user?.exam ? item : undefined;
  }, [testId, db.tests, user?.exam]);
  const questions = useMemo(() => (test ? testService.questions(test.id, user?.exam) : []), [test, db.questions, user?.exam]);

  if (!user) return null;

  if (!test) {
    return (
      <AppShell role="student" title="Test">
        <Card>
          <EmptyState
            icon="alert"
            title="Test not found"
            message="This test may have been unpublished or removed. Browse the available tests instead."
            action={<Button size="sm" onClick={() => navigate('/student/tests')}>Browse Tests</Button>}
          />
        </Card>
      </AppShell>
    );
  }

  if (test.status !== 'Published' || questions.length === 0) {
    return (
      <AppShell role="student" title={test.name}>
        <Card>
          <EmptyState
            icon="clock"
            title="This test is not available yet"
            message="The test is still in draft or has no published questions attached."
            action={<Button size="sm" onClick={() => navigate('/student/tests')}>Back to Tests</Button>}
          />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell role="student" title={test.name} subtitle={`${test.exam} · ${test.type}`}>
      <QuestionPlayer
        questions={questions}
        mode="test"
        title={test.name}
        subtitle={`${questions.length} questions · ${test.duration} minutes · ${test.totalMarks} marks`}
        durationSeconds={test.duration * 60}
        onExit={() => navigate('/student/tests')}
        onSubmit={(res: PlayerResult) => {
          const attempt = attemptService.submit({
            userId: user.id,
            mode: 'test',
            testId: test.id,
            testName: test.name,
            questionIds: questions.map((q) => q.id),
            answers: res.answers,
            timeTaken: res.timeTaken,
          });
          toast.success('Test submitted ✓', `Score ${Math.round(attempt.score)}/${attempt.maxScore} · ${attempt.accuracy}% accuracy`);
          navigate(`/student/result/${attempt.id}`);
        }}
      />
    </AppShell>
  );
}



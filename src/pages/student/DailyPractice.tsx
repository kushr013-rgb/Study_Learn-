import { useMemo, useState } from 'react';
import { useRouter } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { questionService } from '../../services/questionService';
import { attemptService } from '../../services/attemptService';
import { analyticsService } from '../../services/analyticsService';
import { SUBJECTS } from '../../data/taxonomy';
import type { Question } from '../../lib/types';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ProgressBar, StatCard } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { QuestionPlayer, type PlayerResult } from '../../components/QuestionPlayer';
import { useToast } from '../../components/ui/Toast';
import { useDB } from '../../services/db';

export default function DailyPractice() {
  const user = useGuard('student');
  const { navigate } = useRouter();
  const toast = useToast();
  const db = useDB();
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const exam = user?.exam as keyof typeof SUBJECTS | undefined;
  const subjects = useMemo(() => (exam ? SUBJECTS[exam] ?? [] : []).slice(0, 3), [exam]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const solvedToday = useMemo(
    () => (user ? attemptService.listByUser(user.id) : []).filter((a) => a.submittedAt.slice(0, 10) === todayKey)
      .reduce((s, a) => s + a.correct + a.wrong, 0),
    [db.attempts, db.questions, db.users, user?.id, todayKey],
  );

  const streak = db.users.find((u) => u.id === user?.id)?.streak ?? 0;
  const weekly = useMemo(() => (user ? analyticsService.weeklyActivity(user.id) : []), [user]);

  if (!user) return null;

  if (!user.exam) {
    return (
      <AppShell role="student" title="Daily Practice">
        <Card><EmptyState icon="layers" title="Choose your exam first" message="Daily practice will be built from your selected exam." /></Card>
      </AppShell>
    );
  }

  if (questions) {
    return (
      <AppShell role="student" title="Daily Practice" subtitle="30 questions · 3 subjects">
        <QuestionPlayer
          questions={questions}
          mode="practice"
          title="Today's Practice"
          subtitle={`${questions.length} questions · approx ${Math.ceil(questions.length * 1.2)} minutes`}
          onExit={() => { setQuestions(null); navigate('/student/daily-practice'); }}
          onSubmit={(res: PlayerResult) => {
            const attempt = attemptService.submit({
              userId: user.id,
              mode: 'daily',
              testName: 'Daily Practice Set',
              questionIds: questions.map((q) => q.id),
              answers: res.answers,
              timeTaken: res.timeTaken,
            });
            toast.success('Daily practice complete ✓', `${attempt.correct}/${questions.length} correct · ${attempt.accuracy}% accuracy`);
            setQuestions(null);
            navigate(`/student/result/${attempt.id}`);
          }}
        />
      </AppShell>
    );
  }

  const start = () => {
    const set = subjects.flatMap((s) => questionService.practiceSet({ exam: user.exam as keyof typeof SUBJECTS, subject: s, difficulty: 'Mixed', count: 10 }));
    if (set.length === 0) {
      toast.error('Not enough questions', 'Ask your faculty to publish questions for this exam.');
      return;
    }
    setQuestions(set);
  };

  const goal = subjects.length * 10;
  const progress = Math.min(100, Math.round((solvedToday / goal) * 100));

  return (
    <AppShell
      role="student"
      title="Daily Practice"
      subtitle="One balanced set every day builds the habit that wins exams"
      actions={streak > 0 ? <Badge tone="warning" dot>{streak} day streak</Badge> : null}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Progress" value={`${solvedToday}/${goal}`} icon="checkCircle" tone="brand" hint={`${progress}% of the daily goal`} />
        <StatCard label="Current Streak" value={`${streak} days`} icon="flame" tone="warning" hint="Keep it alive with one set a day" />
        <StatCard label="Approx. Duration" value="~35 min" icon="clock" tone="info" hint="Around 70 seconds per question" />
        <StatCard label="Subjects Covered" value={subjects.length} icon="layers" tone="success" hint={subjects.join(' · ')} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Today's Practice" subtitle={`${goal} questions across ${subjects.length} subjects`} icon="bolt" />
          <CardBody>
            <div className="mb-5">
              <ProgressBar value={progress} label="Daily goal" />
            </div>
            <ul className="space-y-3">
              {subjects.map((s) => {
                const count = questionService.practiceSet({ exam: user.exam as keyof typeof SUBJECTS, subject: s, difficulty: 'Mixed', count: 10 }).length;
                return (
                  <li key={s} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 p-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon name="layers" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-900">{s}</p>
                      <p className="text-[11px] text-ink-500">{Math.min(10, count)} Questions · Mixed difficulty</p>
                    </div>
                    <Badge tone={count >= 10 ? 'success' : 'warning'}>{count} available</Badge>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-ink-900">{goal} Questions · Approx. 35 Minutes</p>
                <p className="text-[11px] text-ink-500">Mixed difficulty, drawn from your published syllabus</p>
              </div>
              <Button size="lg" icon="bolt" onClick={start}>Start Daily Practice</Button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="This week" subtitle="Questions solved per day" icon="chart" />
            <CardBody>
              <ul className="space-y-2">
                {weekly.map((w) => (
                  <li key={w.label} className="flex items-center gap-3">
                    <span className="w-9 text-[11px] font-semibold text-ink-500">{w.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (w.value / Math.max(1, Math.max(...weekly.map((x) => x.value)))) * 100)}%` }} />
                    </div>
                    <span className="w-6 text-right text-[11px] font-bold text-ink-900">{w.value}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Why daily practice?" icon="sparkles" />
            <CardBody className="space-y-2.5">
              {['Spaced repetition improves long-term recall.', 'Mixed sets expose cross-chapter weaknesses.', 'A fixed 35-minute habit beats long, irregular sessions.'].map((t) => (
                <p key={t} className="flex gap-2 text-xs leading-relaxed text-ink-600">
                  <Icon name="checkCircle" size={14} className="mt-0.5 shrink-0 text-emerald-500" />{t}
                </p>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {subjects.length === 0 && (
        <Card className="mt-6"><EmptyState icon="layers" title="No subjects configured" message="Update your exam in the profile page to see a daily set." /></Card>
      )}
    </AppShell>
  );
}

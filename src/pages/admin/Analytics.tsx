import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { analyticsService } from '../../services/analyticsService';
import { attemptService } from '../../services/attemptService';
import { useAsync } from '../../lib/hooks';
import { useDB } from '../../services/db';
import { Avatar, Badge, Card, CardBody, CardHeader, CardSkeleton, EmptyState, ErrorState, ProgressBar, StatCard } from '../../components/ui';
import { AreaChart, BarChart, DonutChart, HBarList } from '../../components/ui/Charts';
import { formatDateTime } from '../../lib/hooks';

export default function AdminAnalytics() {
  const user = useGuard('admin');
  const db = useDB();
  const { data, loading, error, retry } = useAsync(
    () => {
      if (!user) return null;
      return {
        overview: analyticsService.platformOverview(),
        registrations: analyticsService.registrationsByMonth(),
        attempts: analyticsService.attemptsByDay(),
        examScores: analyticsService.averageScoresByExam(),
        subjects: analyticsService.subjectPerformancePlatform(),
        usage: analyticsService.questionUsage(8),
        batches: analyticsService.batches(),
        recent: attemptService.listAll().slice(0, 8),
      };
    },
    [user?.id, db.attempts, db.questions, db.users],
  );

  if (!user) return null;

  if (loading) {
    return (
      <AppShell role="admin" title="Analytics">
        <CardSkeleton count={4} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="skeleton h-72" /><div className="skeleton h-72" /></div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell role="admin" title="Analytics">
        <Card><ErrorState message="Unable to load analytics." onRetry={retry} /></Card>
      </AppShell>
    );
  }

  const { overview, registrations, attempts, examScores, subjects, usage, batches, recent } = data;

  return (
    <AppShell role="admin" title="Analytics" subtitle="Platform intelligence across learners, content and assessments">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={overview.students.toLocaleString('en-IN')} icon="users" tone="brand" />
        <StatCard label="Questions" value={overview.questions.toLocaleString('en-IN')} icon="layers" tone="info" />
        <StatCard label="Tests" value={overview.tests} icon="quiz" tone="warning" />
        <StatCard label="Attempts Today" value={overview.attemptsToday.toLocaleString('en-IN')} icon="bolt" tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Student Registrations" subtitle="Monthly growth" icon="users" />
          <CardBody><BarChart labels={registrations.map((r) => r.label)} values={registrations.map((r) => r.value)} height={200} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Test Attempts" subtitle="Last 7 days" icon="bolt" />
          <CardBody><AreaChart labels={attempts.map((a) => a.label)} series={[{ name: 'Attempts', color: '#f59e0b', values: attempts.map((a) => a.value) }]} height={200} /></CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Average Scores" subtitle="By exam" icon="chart" />
          <CardBody>
            <DonutChart segments={examScores.map((e, i) => ({ label: e.key, value: e.accuracy, color: ['#573ec9', '#14b8a6', '#f59e0b', '#f43f5e'][i] }))} size={170} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Subject Performance" icon="layers" />
          <CardBody>
            {subjects.length === 0 ? <EmptyState icon="layers" title="No data yet" /> : <HBarList items={subjects.map((s) => ({ label: s.key, value: s.accuracy, meta: `${s.attempted}q` }))} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Question Usage" subtitle="Top 8 most attempted" icon="bolt" />
          <CardBody>
            <ul className="space-y-3">
              {usage.map((u) => (
                <li key={u.id}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="truncate text-ink-600">{u.label}</span>
                    <span className="font-bold text-ink-900">{u.usage}</span>
                  </div>
                  <ProgressBar value={(u.usage / Math.max(1, usage[0].usage)) * 100} size="sm" />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Batch Performance" icon="grid" />
          <ul className="divide-y divide-ink-100">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-900">{b.name}</p>
                  <p className="text-[10px] text-ink-500">{b.students} students · {b.mentor}</p>
                </div>
                <div className="w-32"><ProgressBar value={b.accuracy} size="sm" /></div>
                <span className="w-10 text-right text-xs font-bold text-ink-900">{b.accuracy}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Latest Submissions" icon="clock" />
          {recent.length === 0 ? (
            <EmptyState icon="clock" title="No submissions yet" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {recent.map((a) => {
                const s = db.users.find((u) => u.id === a.userId);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={s?.name ?? 'Student'} size={26} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink-900">{s?.name}</p>
                      <p className="truncate text-[10px] text-ink-400">{a.testName} · {formatDateTime(a.submittedAt)}</p>
                    </div>
                    <span className="text-xs font-bold text-ink-900">{Math.round(a.score)}/{a.maxScore}</span>
                    <Badge tone={a.accuracy >= 75 ? 'success' : a.accuracy >= 55 ? 'warning' : 'danger'}>{a.accuracy}%</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

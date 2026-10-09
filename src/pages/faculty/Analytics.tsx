import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { analyticsService } from '../../services/analyticsService';
import { useAsync } from '../../lib/hooks';
import { useDB } from '../../services/db';
import { Avatar, Badge, Card, CardBody, CardHeader, CardSkeleton, EmptyState, ErrorState, ProgressBar, StatCard } from '../../components/ui';
import { AreaChart, BarChart, DonutChart, HBarList } from '../../components/ui/Charts';

export default function FacultyAnalytics() {
  const user = useGuard('faculty');
  const db = useDB();
  const { data, loading, error, retry } = useAsync(
    () => {
      if (!user) return null;
      return {
        overview: analyticsService.facultyOverview(user.id),
        subjects: analyticsService.subjectPerformancePlatform(),
        weak: analyticsService.facultyWeakTopics(),
        tests: analyticsService.facultyTestPerformance(),
        usage: analyticsService.questionUsage(6),
        attempts: analyticsService.attemptsByDay(),
        leaderboard: analyticsService.facultyStudentActivity(8),
      };
    },
    [user?.id, db.attempts, db.questions],
  );

  if (!user) return null;

  if (loading) {
    return (
      <AppShell role="faculty" title="Analytics">
        <CardSkeleton count={4} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="skeleton h-72" /><div className="skeleton h-72" /></div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell role="faculty" title="Analytics">
        <Card><ErrorState message="Unable to load analytics." onRetry={retry} /></Card>
      </AppShell>
    );
  }

  const { overview, subjects, weak, tests, usage, attempts, leaderboard } = data;

  return (
    <AppShell role="faculty" title="Analytics" subtitle="Learner, content and assessment insights">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={overview.students} icon="users" tone="brand" />
        <StatCard label="Questions in Bank" value={overview.questions} icon="layers" tone="info" hint={`${overview.published} published`} />
        <StatCard label="Tests" value={overview.tests} icon="quiz" tone="warning" />
        <StatCard label="Average Accuracy" value={`${overview.batchAccuracy}%`} icon="target" tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Platform Attempts" subtitle="Last 7 days" icon="chart" />
          <CardBody>
            <AreaChart labels={attempts.map((a) => a.label)} series={[{ name: 'Attempts', color: '#573ec9', values: attempts.map((a) => a.value) }]} height={210} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Subject Performance" icon="layers" />
          <CardBody>
            {subjects.length === 0 ? <EmptyState icon="layers" title="No data" /> : <HBarList items={subjects.map((s) => ({ label: s.key, value: s.accuracy, meta: `${s.attempted}q` }))} />}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weak Topics" subtitle="Chapters that need new content or revision" icon="alert" />
          <CardBody>
            {weak.length === 0 ? <EmptyState icon="checkCircle" title="No weak topics detected" /> : <HBarList items={weak.map((w) => ({ label: w.key, value: w.accuracy, meta: `${w.attempted}q` }))} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Test Performance" subtitle="Average score by test" icon="quiz" />
          <CardBody>
            {tests.length === 0 ? <EmptyState icon="quiz" title="No tests yet" /> : (
              <BarChart labels={tests.map((t) => t.name.split(' ')[0])} values={tests.map((t) => t.avg)} suffix="%" height={200} color="#f59e0b" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Most Used Questions" subtitle="High-traffic content" icon="bolt" />
          <CardBody>
            {usage.length === 0 ? <EmptyState icon="bolt" title="No usage yet" /> : (
              <DonutChart segments={usage.map((u, i) => ({ label: u.label, value: u.usage, color: ['#573ec9', '#14b8a6', '#f59e0b', '#f43f5e', '#6366f1', '#10b981'][i] }))} size={170} />
            )}
          </CardBody>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Learner Leaderboard" subtitle="By average accuracy" icon="trophy" />
          <ul className="divide-y divide-ink-100">
            {leaderboard.length === 0 && <EmptyState icon="users" title="No learners yet" />}
            {leaderboard.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-ink-200 text-ink-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-ink-100 text-ink-500'}`}>{i + 1}</span>
                <Avatar name={s.name} size={26} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-900">{s.name}</span>
                <span className="hidden text-[10px] text-ink-400 sm:block">{s.tests} tests</span>
                <Badge tone={s.accuracy >= 75 ? 'success' : s.accuracy >= 55 ? 'warning' : 'danger'}>{s.accuracy}%</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Content Coverage" subtitle="Questions authored and published by difficulty" icon="layers" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          {[
            ['Authored by you', overview.myQuestions, 'brand'],
            ['Published', overview.published, 'success'],
            ['Drafts pending', overview.drafts, 'warning'],
          ].map(([l, v, tone]) => (
            <div key={l as string}>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-medium text-ink-600">{l}</span>
                <span className="font-bold text-ink-900">{v as number}</span>
              </div>
              <ProgressBar value={Math.min(100, ((v as number) / Math.max(1, overview.myQuestions)) * 100)} size="sm" tone={tone as 'brand'} />
            </div>
          ))}
        </CardBody>
      </Card>
    </AppShell>
  );
}

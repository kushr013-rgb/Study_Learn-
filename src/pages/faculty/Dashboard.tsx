import { Link } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { analyticsService } from '../../services/analyticsService';
import { questionService } from '../../services/questionService';
import { useAsync } from '../../lib/hooks';
import { useDB } from '../../services/db';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, ProgressBar, StatCard } from '../../components/ui';
import { BarChart, DonutChart, HBarList } from '../../components/ui/Charts';
import { formatDateTime } from '../../lib/hooks';
import type { Column } from '../../components/ui';
import { DataTable } from '../../components/ui';

export default function FacultyDashboard() {
  const user = useGuard('faculty');
  const db = useDB();
  const { data, loading } = useAsync(
    () => {
      if (!user) return null;
      return {
        overview: analyticsService.facultyOverview(user.id),
        weak: analyticsService.facultyWeakTopics(),
        activity: analyticsService.facultyStudentActivity(6),
        testPerf: analyticsService.facultyTestPerformance(),
        batches: analyticsService.batches(),
        qStats: questionService.stats(),
        subjectPerf: analyticsService.subjectPerformancePlatform(),
      };
    },
    [user?.id, db.questions, db.attempts],
  );

  if (!user) return null;
  if (loading || !data) {
    return (
      <AppShell role="faculty" title="Dashboard">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}</div>
      </AppShell>
    );
  }

  const { overview, weak, activity, testPerf, batches, qStats, subjectPerf } = data;

  const activityColumns: Column<typeof activity[number]>[] = [
    {
      key: 'name', header: 'Student',
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={s.name} size={28} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink-900">{s.name}</p>
            <p className="text-[10px] text-ink-400">{s.exam}</p>
          </div>
        </div>
      ),
    },
    { key: 'tests', header: 'Tests', render: (s) => <span className="text-xs">{s.tests}</span> },
    { key: 'accuracy', header: 'Accuracy', render: (s) => <Badge tone={s.accuracy >= 75 ? 'success' : s.accuracy >= 55 ? 'warning' : 'danger'}>{s.accuracy}%</Badge> },
    { key: 'last', header: 'Last Active', className: 'hidden md:table-cell', render: (s) => <span className="text-xs text-ink-500">{formatDateTime(s.lastActive)}</span> },
  ];

  return (
    <AppShell
      role="faculty"
      title="Faculty Dashboard"
      subtitle="Content, learners and performance at a glance"
      actions={<Link to="/faculty/questions/create"><Button size="sm" icon="plus">Create Question</Button></Link>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={overview.students} icon="users" tone="brand" hint="Across all batches" />
        <StatCard label="Questions" value={overview.questions} icon="layers" tone="info" hint={`${overview.myQuestions} authored by you`} />
        <StatCard label="Tests" value={overview.tests} icon="quiz" tone="warning" hint={`${testPerf.filter((t) => t.status === 'Published').length} published`} />
        <StatCard label="Average Batch Accuracy" value={`${overview.batchAccuracy}%`} icon="target" tone="success" hint="Across all attempts" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader title="Recent Student Activity" subtitle="Latest attempts across your batches" icon="users"
            action={<Link to="/faculty/students"><Button size="sm" variant="outline">View All</Button></Link>} />
          {activity.length === 0 ? (
            <EmptyState icon="users" title="No activity yet" message="Student attempts will appear here." />
          ) : (
            <DataTable columns={activityColumns} rows={activity} keyFn={(s) => s.id} empty={null} />
          )}
        </Card>

        <Card>
          <CardHeader title="Question Statistics" subtitle="Bank composition" icon="layers" />
          <CardBody>
            <DonutChart
              segments={[
                { label: 'Easy', value: qStats.easy, color: '#10b981' },
                { label: 'Medium', value: qStats.medium, color: '#573ec9' },
                { label: 'Hard', value: qStats.hard, color: '#f43f5e' },
              ]}
              centerValue={String(qStats.total)}
              centerLabel="Questions"
              size={168}
            />
            <div className="mt-4 space-y-2">
              {[
                ['Published', qStats.published],
                ['Drafts', qStats.draft],
                ['Archived', qStats.archived],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between text-xs">
                  <span className="text-ink-500">{l}</span>
                  <span className="font-bold text-ink-900">{v as number}</span>
                </div>
              ))}
            </div>
            <Link to="/faculty/questions" className="mt-4 block"><Button size="sm" variant="outline" fullWidth>Open Question Bank</Button></Link>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weak Topics" subtitle="Chapters below 65% accuracy" icon="alert" />
          <CardBody>
            {weak.length === 0 ? (
              <EmptyState icon="checkCircle" title="No weak topics" message="Learners are performing above threshold across the board." />
            ) : (
              <HBarList items={weak.map((w) => ({ label: w.key, value: w.accuracy, meta: `${w.attempted}q` }))} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Test Performance" subtitle="Average score per test" icon="chart" />
          <CardBody>
            {testPerf.length === 0 ? (
              <EmptyState icon="quiz" title="No tests yet" message="Build your first test to start tracking performance." />
            ) : (
              <BarChart labels={testPerf.map((t) => t.name.split(' ')[0])} values={testPerf.map((t) => t.avg)} suffix="%" height={200} color="#14b8a6" />
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Batch Performance" subtitle="Accuracy by batch" icon="grid" action={<Link to="/faculty/batches"><Button size="sm" variant="outline">Manage Batches</Button></Link>} />
        <ul className="divide-y divide-ink-100">
          {batches.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{b.name}</p>
                <p className="text-[11px] text-ink-500">{b.exam} · {b.students} students · Mentor: {b.mentor}</p>
              </div>
              <div className="w-40"><ProgressBar value={b.accuracy} size="sm" /></div>
              <span className="w-12 text-right text-xs font-bold text-ink-900">{b.accuracy}%</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Subject Performance" subtitle="Platform-wide accuracy by subject" icon="chart" />
        <CardBody>
          {subjectPerf.length === 0 ? (
            <EmptyState icon="chart" title="No attempts recorded" message="Once students attempt questions, subject performance appears here." />
          ) : (
            <HBarList items={subjectPerf.map((s) => ({ label: s.key, value: s.accuracy, meta: `${s.attempted}q` }))} />
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}

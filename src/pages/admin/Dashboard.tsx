import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { analyticsService } from '../../services/analyticsService';
import { questionService } from '../../services/questionService';
import { testService } from '../../services/testService';
import { attemptService } from '../../services/attemptService';
import { useAsync } from '../../lib/hooks';
import { useDB } from '../../services/db';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, CardSkeleton, EmptyState, ErrorState, ProgressBar, StatCard, statusTone } from '../../components/ui';
import { Link } from '../../lib/router';
import { AreaChart, BarChart, DonutChart, HBarList } from '../../components/ui/Charts';
import { formatDateTime } from '../../lib/hooks';

export default function AdminDashboard() {
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
        usage: analyticsService.questionUsage(5),
        qStats: questionService.stats(),
        tStats: testService.stats(),
        pending: db.users.filter((u) => u.role === 'student' && u.status === 'pending'),
        recent: attemptService.listAll().slice(0, 6),
      };
    },
    [user?.id, db.users, db.attempts, db.questions, db.tests],
  );

  if (!user) return null;

  if (loading) {
    return (
      <AppShell role="admin" title="Dashboard">
        <CardSkeleton count={4} />
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="skeleton h-72" /><div className="skeleton h-72" /></div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell role="admin" title="Dashboard">
        <Card><ErrorState message="Unable to load platform analytics." onRetry={retry} /></Card>
      </AppShell>
    );
  }

  const { overview, registrations, attempts, examScores, subjects, usage, qStats, tStats, pending, recent } = data;

  return (
    <AppShell
      role="admin"
      title="Admin Dashboard"
      subtitle="Platform-wide health, content and learner metrics"
      actions={<Link to="/admin/verification"><Button size="sm" icon="shield">Verification ({pending.length})</Button></Link>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value={overview.students.toLocaleString('en-IN')} icon="users" tone="brand" hint={`${overview.verified.toLocaleString('en-IN')} verified`} />
        <StatCard label="Faculty" value={overview.faculty} icon="user" tone="info" />
        <StatCard label="Questions" value={overview.questions.toLocaleString('en-IN')} icon="layers" tone="success" hint={`${overview.publishedQuestions.toLocaleString('en-IN')} published`} />
        <StatCard label="Attempts Today" value={overview.attemptsToday.toLocaleString('en-IN')} icon="bolt" tone="warning" hint={`${tStats.total} tests live`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tests" value={overview.tests} icon="quiz" tone="brand" hint={`${tStats.published} published · ${tStats.draft} draft`} />
        <StatCard label="Pending Verification" value={pending.length} icon="shield" tone="danger" hint="Awaiting approval" />
        <StatCard label="Draft Questions" value={qStats.draft} icon="edit" tone="warning" hint="Not visible to students" />
        <StatCard label="Archived Questions" value={qStats.archived} icon="layers" tone="neutral" hint="Retired content" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Student Registrations" subtitle="Last 6 months" icon="users" />
          <CardBody>
            <BarChart labels={registrations.map((r) => r.label)} values={registrations.map((r) => r.value)} height={200} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Test Attempts" subtitle="Last 7 days" icon="bolt" />
          <CardBody>
            <AreaChart labels={attempts.map((a) => a.label)} series={[{ name: 'Attempts', color: '#14b8a6', values: attempts.map((a) => a.value) }]} height={200} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Average Scores by Exam" icon="chart" />
          <CardBody>
            <DonutChart
              segments={examScores.map((e, i) => ({ label: e.key, value: e.accuracy, color: ['#573ec9', '#14b8a6', '#f59e0b', '#f43f5e'][i] }))}
              size={170}
              centerValue={`${Math.round(examScores.reduce((s, e) => s + e.accuracy, 0) / Math.max(1, examScores.length))}%`}
              centerLabel="Avg"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Subject Performance" icon="layers" />
          <CardBody>
            {subjects.length === 0 ? <EmptyState icon="layers" title="No data yet" /> : <HBarList items={subjects.map((s) => ({ label: s.key, value: s.accuracy, meta: `${s.attempted}q` }))} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Question Usage" subtitle="Most attempted content" icon="bolt" />
          <CardBody>
            {usage.length === 0 ? <EmptyState icon="bolt" title="No usage yet" /> : (
              <ul className="space-y-2.5">
                {usage.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-ink-600">{u.label}</span>
                    <span className="font-bold text-ink-900">{u.usage}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Pending Verification" subtitle="New registrations awaiting approval" icon="shield"
            action={<Link to="/admin/verification"><Button size="sm" variant="outline">Review All</Button></Link>} />
          {pending.length === 0 ? (
            <EmptyState icon="checkCircle" title="Nothing to review" message="All student registrations have been processed." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {pending.slice(0, 4).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={s.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink-900">{s.name}</p>
                    <p className="truncate text-[10px] text-ink-400">{s.email} · {s.exam} · {s.classLevel}</p>
                  </div>
                  <Badge tone={statusTone(s.status)} dot>{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Recent Activity" subtitle="Latest submissions across the platform" icon="clock" />
          {recent.length === 0 ? (
            <EmptyState icon="clock" title="No activity yet" message="Student attempts will stream in here." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {recent.map((a) => {
                const student = db.users.find((u) => u.id === a.userId);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <Avatar name={student?.name ?? 'Student'} size={26} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink-900">{student?.name}</p>
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

      <Card className="mt-6">
        <CardHeader title="Content Health" subtitle="Published vs draft across the question bank" icon="layers" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          {[
            ['Published', qStats.published, qStats.total],
            ['Drafts', qStats.draft, qStats.total],
            ['Archived', qStats.archived, qStats.total],
          ].map(([l, v, t]) => (
            <div key={l as string}>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-medium text-ink-600">{l}</span>
                <span className="font-bold text-ink-900">{v as number}</span>
              </div>
              <ProgressBar value={((v as number) / Math.max(1, t as number)) * 100} size="sm" />
            </div>
          ))}
        </CardBody>
      </Card>
    </AppShell>
  );
}

import { Link } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { analyticsService } from '../../services/analyticsService';
import { recommendationService } from '../../services/recommendationService';
import { useAsync } from '../../lib/hooks';
import { useDB } from '../../services/db';
import { Badge, Button, Card, CardBody, CardHeader, CardSkeleton, EmptyState, ErrorState, ProgressBar, SectionTitle, StatCard } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { AreaChart, BarChart, DonutChart, HBarList } from '../../components/ui/Charts';

export default function Analytics() {
  const user = useGuard('student');
  const db = useDB();
  const { data, loading, error, retry } = useAsync(
    () => {
      if (!user) return null;
      return {
        overview: analyticsService.overview(user.id),
        trends: analyticsService.trends(user.id, 8),
        subjects: analyticsService.subjectPerformance(user.id),
        chapters: analyticsService.chapterPerformance(user.id),
        difficulty: analyticsService.difficultyPerformance(user.id),
        time: analyticsService.timeAnalysis(user.id),
        weak: analyticsService.weakAreas(user.id, db.settings.weakAreaThreshold),
        weekly: analyticsService.weeklyActivity(user.id),
        recs: recommendationService.recommend(user.id, 3),
      };
    },
    [user?.id, user?.exam, db.settings.weakAreaThreshold],
  );

  if (!user) return null;

  if (!user.exam) {
    return (
      <AppShell role="student" title="Performance Analytics">
        <Card><EmptyState icon="layers" title="Choose your exam first" message="Performance analytics will appear after you select an exam." action={<Link to="/student/profile"><Button size="sm">Select Exam</Button></Link>} /></Card>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell role="student" title="Performance Analytics">
        <CardSkeleton />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-72" /><div className="skeleton h-72" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell role="student" title="Performance Analytics">
        <Card><ErrorState message={error ?? 'Unable to load analytics.'} onRetry={retry} /></Card>
      </AppShell>
    );
  }

  const { overview, trends, subjects, chapters, difficulty, time, weak, weekly, recs } = data;

  return (
    <AppShell role="student" title="Performance Analytics" subtitle="Everything you need to know about how you are performing">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Questions Solved" value={overview.solved.toLocaleString('en-IN')} icon="checkCircle" tone="brand" />
        <StatCard label="Tests Attempted" value={overview.tests} icon="quiz" tone="info" />
        <StatCard label="Overall Accuracy" value={`${overview.accuracy}%`} icon="target" tone="success" />
        <StatCard label="Average Score" value={`${overview.avgScore}%`} icon="trophy" tone="warning" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Score & Accuracy Trend" subtitle="Your last 8 attempts" icon="chart" />
          <CardBody>
            {trends.length === 0 ? (
              <EmptyState icon="chart" title="No attempts yet" message="Attempt a test or practice set to see your trend." action={<Link to="/student/tests"><Button size="sm">Take a Test</Button></Link>} />
            ) : (
              <AreaChart
                labels={trends.map((t) => t.label)}
                series={[
                  { name: 'Accuracy', color: '#573ec9', values: trends.map((t) => t.accuracy) },
                  { name: 'Score', color: '#14b8a6', values: trends.map((t) => t.score) },
                ]}
                suffix="%"
                max={100}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Questions Solved" subtitle="Last 7 days" icon="bolt" />
          <CardBody>
            <BarChart labels={weekly.map((w) => w.label)} values={weekly.map((w) => w.value)} color="#14b8a6" height={200} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Subject Performance" subtitle="Accuracy by subject" icon="layers" />
          <CardBody>
            {subjects.length === 0 ? (
              <EmptyState icon="layers" title="No data yet" message="Attempt questions to build your subject profile." />
            ) : (
              <HBarList items={subjects.map((s) => ({ label: s.key, value: s.accuracy, meta: `${s.attempted}q` }))} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Difficulty Split" subtitle="Accuracy by difficulty band" icon="target" />
          <CardBody>
            {difficulty.every((d) => d.attempted === 0) ? (
              <EmptyState icon="target" title="No data yet" message="Difficulty splits appear after your first attempt." />
            ) : (
              <DonutChart
                segments={difficulty.filter((d) => d.attempted > 0).map((d, i) => ({
                  label: d.key, value: d.accuracy, color: ['#10b981', '#573ec9', '#f43f5e'][i] ?? '#573ec9',
                }))}
                centerValue={`${overview.accuracy}%`}
                centerLabel="Accuracy"
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Time Analysis" subtitle={`Target: ${db.settings.targetTimePerQuestion}s per question`} icon="clock" />
          <CardBody>
            {time.length === 0 ? (
              <EmptyState icon="clock" title="No timing data" message="Attempt questions to see your pace." />
            ) : (
              <ul className="space-y-4">
                {time.map((t) => {
                  const over = t.avgTime > db.settings.targetTimePerQuestion;
                  return (
                    <li key={t.key}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-800">{t.key}</span>
                        <span className={over ? 'font-bold text-rose-600' : 'font-bold text-ink-900'}>{t.avgTime} sec</span>
                      </div>
                      <ProgressBar value={Math.min(100, (t.avgTime / (db.settings.targetTimePerQuestion * 2)) * 100)} tone={over ? 'danger' : 'success'} size="sm" />
                      {over && <p className="mt-1 text-[10px] font-medium text-rose-600">Above target — needs speed practice</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Chapter performance */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Chapter Performance" subtitle={`${chapters.length} chapters attempted`} icon="bookOpen" />
        <CardBody>
          {chapters.length === 0 ? (
            <EmptyState icon="bookOpen" title="No chapter data yet" message="Attempt questions to build chapter-level insights." action={<Link to="/student/practice"><Button size="sm">Start Practice</Button></Link>} />
          ) : (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {chapters.slice(0, 12).map((c) => (
                <div key={c.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-ink-800">{c.key}</span>
                    <span className="shrink-0 text-ink-500">{c.accuracy}% · {c.attempted}q</span>
                  </div>
                  <ProgressBar value={c.accuracy} size="sm" />
                  <p className="mt-1 text-[10px] text-ink-400">{c.subject}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Weak areas */}
      <div className="mt-6">
        <SectionTitle
          eyebrow="Weak area detection"
          title="Chapters that need attention"
          subtitle={`Chapters below the ${db.settings.weakAreaThreshold}% accuracy threshold are flagged automatically.`}
        />
        {weak.length === 0 ? (
          <Card>
            <EmptyState icon="checkCircle" title="No weak areas detected" message="All chapters you attempted are above the configured threshold. Keep it up!" />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {weak.map((w) => (
              <Card key={w.key} className="p-4" hover>
                <div className="flex items-center gap-2">
                  <Badge tone="danger" dot>Weak Area</Badge>
                  <span className="ml-auto text-[11px] text-ink-400">{w.attempted} questions</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink-900">{w.key}</h3>
                <p className="text-xs text-ink-500">{w.subject} · {w.accuracy}% accuracy</p>
                <div className="mt-3"><ProgressBar value={w.accuracy} size="sm" /></div>
                <Link
                  to={`/student/practice?exam=${encodeURIComponent(user.exam ?? 'JEE')}&subject=${encodeURIComponent(w.subject ?? '')}&chapter=${encodeURIComponent(w.key)}&difficulty=Medium&count=10`}
                  className="mt-3 block"
                >
                  <Button size="sm" fullWidth icon="bolt">Practice Now</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <CardHeader title="Recommendation Engine" subtitle="Rule-based suggestions generated from your data" icon="sparkles" />
          <ul className="divide-y divide-ink-100">
            {recs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">{r.title}</p>
                  <p className="text-xs text-ink-500">{r.description}</p>
                  <code className="mt-1 inline-block rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600">{r.rule}</code>
                </div>
                <Link to={r.to}><Button size="sm" variant="outline" trailing="arrowRight">{r.cta}</Button></Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {trends.length === 0 && (
        <Card className="mt-6">
          <EmptyState
            icon="chart"
            title="Analytics unlock after your first attempt"
            message="Practice a set or take a mock test — your trends, subject splits and weak areas appear here instantly."
            action={<Link to="/student/practice"><Button size="sm" icon="bolt">Start Practising</Button></Link>}
          />
        </Card>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
        <Icon name="sparkles" size={12} /> Analytics are computed from your attempts — no external service is used.
      </p>
    </AppShell>
  );
}

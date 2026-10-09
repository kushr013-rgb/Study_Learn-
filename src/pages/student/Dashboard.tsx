import { useMemo } from 'react';
import { Link } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { analyticsService } from '../../services/analyticsService';
import { recommendationService } from '../../services/recommendationService';
import { attemptService } from '../../services/attemptService';
import { useAsync } from '../../lib/hooks';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ProgressBar, SectionTitle, StatCard } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { AreaChart, HBarList } from '../../components/ui/Charts';
import { formatDateTime } from '../../lib/hooks';

export default function StudentDashboard() {
  const user = useGuard('student');
  const { data, loading, error, retry } = useAsync(
    () => {
      if (!user) return null;
      return {
        overview: analyticsService.overview(user.id),
        weak: analyticsService.weakAreas(user.id, 70),
        chapters: analyticsService.chapterPerformance(user.id).slice(0, 6),
        recent: analyticsService.recentTests(user.id, 5),
        recommendations: recommendationService.recommend(user.id, 4),
        mistakes: attemptService.mistakesFor(user.id).filter((m) => !m.resolved).length,
        weekly: analyticsService.weeklyActivity(user.id),
      };
    },
    [user?.id, user?.exam],
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }, []);

  if (!user) return null;

  if (!user.exam) {
    return (
      <AppShell role="student" title="Dashboard">
        <EmptyState icon="layers" title="Choose your exam to begin" message="Your dashboard will show preparation activities and progress for your selected exam." action={<Link to="/student/profile"><Button size="sm">Select Exam</Button></Link>} />
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell role="student" title="Dashboard">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell role="student" title="Dashboard">
        <EmptyState icon="alert" title="Could not load your dashboard" message={error ?? 'Please try again.'} action={<Button size="sm" onClick={retry}>Try Again</Button>} />
      </AppShell>
    );
  }

  const { overview, weak, chapters, recent, recommendations, mistakes, weekly } = data;
  const continueItem = chapters.find((c) => c.accuracy < 95) ?? chapters[0];

  return (
    <AppShell
      role="student"
      title="Dashboard"
      subtitle={`${user.exam} Preparation · ${user.classLevel ?? ''}`}
      actions={<Link to="/student/practice"><Button size="sm" icon="bolt">Start Practice</Button></Link>}
    >
      {/* Greeting + stats */}
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
          {greeting}, {user.name.split(' ')[0]} <span aria-hidden="true">👋</span>
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {mistakes > 0
            ? `You have ${mistakes} unresolved mistake${mistakes === 1 ? '' : 's'} waiting in your mistake book.`
            : 'Your mistake book is clear. Keep the streak alive!'}
        </p>
      </div>

      {/* Primary actions — always visible, always one tap away */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/student/practice', icon: 'bolt' as const, label: 'Practice', hint: 'Pick a chapter', tone: 'from-brand-500 to-indigo-600' },
          { to: '/student/daily-practice', icon: 'flame' as const, label: 'Daily Set', hint: `${overview.streak} day streak`, tone: 'from-amber-500 to-orange-600' },
          { to: '/student/tests', icon: 'quiz' as const, label: 'Mock Test', hint: 'Timed, exam pattern', tone: 'from-teal-500 to-emerald-600' },
          { to: '/student/mistakes', icon: 'book' as const, label: 'Mistakes', hint: mistakes > 0 ? `${mistakes} to fix` : 'All clear', tone: 'from-rose-500 to-pink-600' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="group">
            <Card className="flex items-center gap-3 p-3.5" hover>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${a.tone} text-white shadow-sm`}>
                <Icon name={a.icon} size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">{a.label}</span>
                <span className="block truncate text-[11px] text-ink-500">{a.hint}</span>
              </span>
              <Icon name="chevronRight" size={16} className="shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Questions Solved" value={overview.solved.toLocaleString('en-IN')} icon="checkCircle" tone="brand" hint={`Rank #${overview.rank} among demo students`} />
        <StatCard label="Tests Attempted" value={overview.tests} icon="quiz" tone="info" hint={`${recent.length} recent in this session`} />
        <StatCard label="Accuracy" value={`${overview.accuracy}%`} icon="target" tone="success" trend={overview.accuracy - 74} />
        <StatCard label="Average Score" value={`${overview.avgScore}%`} icon="trophy" tone="warning" hint={`Streak: ${overview.streak} days`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Continue practice */}
        <Card className="lg:col-span-2">
          <CardHeader title="Continue Practice" subtitle="Pick up where you left off" icon="practice" />
          <CardBody>
            {continueItem ? (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-ink-200 p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name="layers" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">{continueItem.key}</p>
                  <p className="text-xs text-ink-500">{continueItem.subject} · {continueItem.attempted} questions attempted</p>
                  <div className="mt-2.5 max-w-sm"><ProgressBar value={continueItem.accuracy} label="Progress" /></div>
                </div>
                <Link to={`/student/practice?exam=${encodeURIComponent(user.exam)}&subject=${encodeURIComponent(continueItem.subject ?? '')}&chapter=${encodeURIComponent(continueItem.key)}&difficulty=Mixed&count=10`}>
                  <Button>Continue</Button>
                </Link>
              </div>
            ) : (
              <EmptyState icon="practice" title="No practice history yet" message="Start a practice set to build your progress trail." action={<Link to="/student/practice"><Button size="sm">Start Practice</Button></Link>} />
            )}

            <div className="mt-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Weekly activity</h3>
              <AreaChart labels={weekly.map((w) => w.label)} series={[{ name: 'Questions', color: '#573ec9', values: weekly.map((w) => w.value) }]} height={170} />
            </div>
          </CardBody>
        </Card>

        {/* Weak areas */}
        <Card>
          <CardHeader title="Weak Areas" subtitle="Chapters below 70% accuracy" icon="alert" />
          <CardBody>
            {weak.length === 0 ? (
              <EmptyState icon="checkCircle" title="No weak areas" message="Every chapter you attempted is above the threshold. Nice work." />
            ) : (
              <HBarList items={weak.slice(0, 5).map((w) => ({ label: w.key, value: w.accuracy, meta: `${w.attempted}q` }))} />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recommendations */}
      <div className="mt-6">
        <SectionTitle
          eyebrow="Recommended for you"
          title="Your next best move"
          subtitle="Rule-based suggestions generated from your own accuracy and timing data."
          action={<Link to="/student/analytics"><Button size="sm" variant="outline" trailing="arrowRight">View analytics</Button></Link>}
        />
        {recommendations.length === 0 ? (
          <Card><EmptyState icon="sparkles" title="No recommendations yet" message="Attempt a few questions and we will suggest what to do next." /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recommendations.map((r) => (
              <Card key={r.id} className="flex flex-col p-4" hover>
                <div className="flex items-center gap-2">
                  <Badge tone={r.severity === 'high' ? 'danger' : r.severity === 'medium' ? 'warning' : 'brand'} dot>{r.kind}</Badge>
                  <Icon name="sparkles" size={13} className="ml-auto text-ink-300" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink-900">{r.title}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-500">{r.description}</p>
                <p className="mt-3 text-[11px] font-semibold text-brand-600">{r.meta}</p>
                <Link to={r.to} className="mt-3"><Button size="sm" fullWidth trailing="arrowRight">{r.cta}</Button></Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent tests */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Recent Tests" subtitle="Your latest attempts with score and accuracy" icon="quiz"
          action={<Link to="/student/tests"><Button size="sm" variant="outline">All Tests</Button></Link>} />
        {recent.length === 0 ? (
          <EmptyState icon="quiz" title="No tests attempted yet" message="Take a mock test to unlock your performance analytics."
            action={<Link to="/student/tests"><Button size="sm">Browse Tests</Button></Link>} />
        ) : (
          <ul className="divide-y divide-ink-100">
            {recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-brand-50/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{a.testName}</p>
                  <p className="text-[11px] text-ink-500">{formatDateTime(a.submittedAt)} · {a.mode}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-right">
                    <span className="block font-bold text-ink-900">{Math.round(a.score)}/{a.maxScore}</span>
                    <span className="text-[10px] text-ink-500">Score</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-bold text-ink-900">{a.accuracy}%</span>
                    <span className="text-[10px] text-ink-500">Accuracy</span>
                  </span>
                  <Badge tone={a.accuracy >= 75 ? 'success' : a.accuracy >= 55 ? 'warning' : 'danger'}>{a.accuracy >= 75 ? 'Strong' : a.accuracy >= 55 ? 'Improving' : 'Needs work'}</Badge>
                  <Link to={`/student/result/${a.id}`}><Button size="sm" variant="outline">View Result</Button></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}

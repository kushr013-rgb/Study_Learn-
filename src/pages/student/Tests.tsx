import { useMemo, useState } from 'react';
import { Link } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { testService } from '../../services/testService';
import { attemptService } from '../../services/attemptService';
import { useDB } from '../../services/db';
import type { TestType } from '../../lib/types';
import { Badge, Button, Card, CardBody, EmptyState, SearchInput, Tabs } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { formatDateTime } from '../../lib/hooks';
import type { Exam } from '../../lib/types';

const TYPES: (TestType | 'All')[] = ['All', 'Topic Test', 'Chapter Test', 'Subject Test', 'Full Mock Test'];

export default function Tests() {
  const user = useGuard('student');
  const db = useDB();
  const [tab, setTab] = useState<TestType | 'All'>('All');
  const [search, setSearch] = useState('');

  const tests = useMemo(() => user?.exam ? testService.list({ exam: user.exam as Exam, status: 'Published' }) : [], [user?.exam, db.tests]);
  const filtered = useMemo(
    () => tests.filter((t) => (tab === 'All' || t.type === tab) && t.name.toLowerCase().includes(search.toLowerCase())),
    [tests, tab, search],
  );

  if (!user) return null;

  if (!user.exam) {
    return (
      <AppShell role="student" title="Mock Tests">
        <Card><EmptyState icon="layers" title="Choose your exam first" message="Published tests will be shown for your selected exam." /></Card>
      </AppShell>
    );
  }

  const counts = TYPES.map((t) => ({ id: t, label: t === 'All' ? 'All Tests' : t.replace(' Test', ''), count: t === 'All' ? tests.length : tests.filter((x) => x.type === t).length }));

  return (
    <AppShell role="student" title="Mock Tests" subtitle={`${user.exam} · exam-pattern papers with live timer and CBT interface`}>
      <div className="mb-5 flex flex-wrap gap-3">
        <Tabs tabs={counts} active={tab} onChange={setTab} className="flex-1" />
        <SearchInput value={search} onChange={setSearch} placeholder="Search tests…" className="w-full sm:w-64" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="quiz"
            title="No tests available yet"
            message="No published test matches your filters. Try another category or check back soon."
            action={<Button size="sm" onClick={() => { setTab('All'); setSearch(''); }}>Clear filters</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const myAttempts = db.attempts.filter((a) => a.userId === user.id && a.testId === t.id);
            const best = myAttempts.length ? Math.max(...myAttempts.map((a) => Math.round((a.score / (a.maxScore || 1)) * 100))) : null;
            return (
              <Card key={t.id} className="flex flex-col overflow-hidden" hover>
                <CardBody className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{t.type}</Badge>
                    <Badge tone={t.difficulty === 'Easy' ? 'success' : t.difficulty === 'Medium' ? 'warning' : 'danger'}>{t.difficulty}</Badge>
                    {best !== null && <Badge tone="success">Best {best}%</Badge>}
                  </div>
                  <h3 className="mt-3 text-sm font-bold leading-snug text-ink-900">{t.name}</h3>
                  <p className="mt-1 text-xs text-ink-500">{t.subject} · {t.exam}</p>

                  <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-3 text-center">
                    {[
                      ['Questions', t.questionIds.length],
                      ['Minutes', t.duration],
                      ['Marks', t.totalMarks],
                    ].map(([l, v]) => (
                      <div key={l as string}>
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-ink-500">{l}</dt>
                        <dd className="text-sm font-bold text-ink-900">{v as number}</dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
                    <Icon name="users" size={13} /> {t.attempts.toLocaleString('en-IN')} attempts
                    {myAttempts.length > 0 && <> · you attempted {myAttempts.length}×</>}
                  </p>
                </CardBody>
                <div className="border-t border-ink-200 p-3">
                  <Link to={`/student/test/${t.id}`}><Button fullWidth icon="bolt">Start Test</Button></Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-4 py-3">
          <h2 className="text-sm font-bold text-ink-900">Your recent attempts</h2>
        </div>
        <AttemptList userId={user.id} />
      </Card>
    </AppShell>
  );
}

function AttemptList({ userId }: { userId: string }) {
  const attempts = attemptService.listByUser(userId).slice(0, 6);
  if (attempts.length === 0) {
    return <EmptyState icon="clock" title="No attempts yet" message="Once you submit a test, it appears here with a full result breakdown." />;
  }
  return (
    <ul className="divide-y divide-ink-100">
      {attempts.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{a.testName}</p>
            <p className="text-[11px] text-ink-500">{formatDateTime(a.submittedAt)} · {a.mode}</p>
          </div>
          <span className="text-xs font-bold text-ink-900">{Math.round(a.score)}/{a.maxScore}</span>
          <Badge tone={a.accuracy >= 75 ? 'success' : a.accuracy >= 55 ? 'warning' : 'danger'}>{a.accuracy}%</Badge>
          <Link to={`/student/result/${a.id}`}><Button size="sm" variant="outline">View Result</Button></Link>
        </li>
      ))}
    </ul>
  );
}



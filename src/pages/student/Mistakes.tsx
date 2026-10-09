import { useMemo, useState } from 'react';
import { Link } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { attemptService } from '../../services/attemptService';
import { questionService } from '../../services/questionService';
import { useDB } from '../../services/db';
import type { Mistake, Question } from '../../lib/types';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ProgressBar, StatCard, Tabs } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';
import { formatDate } from '../../lib/hooks';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export default function Mistakes() {
  const user = useGuard('student');
  const db = useDB();
  const toast = useToast();
  const [tab, setTab] = useState<'open' | 'resolved' | 'all'>('open');
  const [subject, setSubject] = useState('All');

  const mistakes = useMemo(() => attemptService.mistakesFor(user?.id ?? ''), [user?.id, db.mistakes]);
  const questions = useMemo(() => {
    const map = new Map<string, Question>();
    mistakes.forEach((m) => {
      const q = questionService.getById(m.questionId);
      if (q) map.set(q.id, q);
    });
    return map;
  }, [mistakes, db.questions]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    mistakes.forEach((m) => {
      const q = questions.get(m.questionId);
      if (q) set.add(q.subject);
    });
    return ['All', ...[...set]];
  }, [mistakes, questions]);

  const filtered = useMemo(
    () => mistakes.filter((m) => {
      if (tab === 'open' && m.resolved) return false;
      if (tab === 'resolved' && !m.resolved) return false;
      const q = questions.get(m.questionId);
      return subject === 'All' || q?.subject === subject;
    }),
    [mistakes, tab, subject, questions],
  );

  if (!user) return null;

  if (!user.exam) {
    return (
      <AppShell role="student" title="Mistake Book">
        <Card><EmptyState icon="layers" title="Choose your exam first" message="Your mistake book will track questions from your selected exam." /></Card>
      </AppShell>
    );
  }

  const open = mistakes.filter((m) => !m.resolved);
  const resolved = mistakes.filter((m) => m.resolved);

  const perSubject = ['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology', 'Science', 'Biology']
    .map((s) => ({
      subject: s,
      count: open.filter((m) => questions.get(m.questionId)?.subject === s).length,
    }))
    .filter((s) => s.count > 0);

  const resolutionRate = mistakes.length ? Math.round((resolved.length / mistakes.length) * 100) : 0;

  return (
    <AppShell role="student" title="Mistake Book" subtitle="Every wrong answer becomes a revision task">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Mistakes" value={mistakes.length} icon="book" tone="danger" hint={`${open.length} still open`} />
        <StatCard label="Resolved" value={resolved.length} icon="checkCircle" tone="success" hint={`${resolutionRate}% resolution rate`} />
        <StatCard label="Open Subjects" value={perSubject.length} icon="layers" tone="warning" hint={perSubject.map((s) => s.subject).join(', ') || '—'} />
        <StatCard label="Re-attempts" value={mistakes.reduce((s, m) => s + m.attemptCount, 0)} icon="refresh" tone="brand" hint="Total practice attempts on mistakes" />
      </div>

      {perSubject.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Open mistakes by subject" icon="layers" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              {perSubject.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-semibold text-ink-800">{s.subject}</span>
                    <span className="font-bold text-ink-900">{s.count}</span>
                  </div>
                  <ProgressBar value={(s.count / Math.max(1, open.length)) * 100} tone="warning" size="sm" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 mt-6 flex flex-wrap gap-3">
        <Tabs
          tabs={[
            { id: 'open', label: 'Unresolved', count: open.length },
            { id: 'resolved', label: 'Resolved', count: resolved.length },
            { id: 'all', label: 'All', count: mistakes.length },
          ]}
          active={tab}
          onChange={setTab}
        />
        {subjects.length > 2 && (
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={subject === s}
                onClick={() => setSubject(s)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  subject === s ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200')}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === 'resolved' ? 'checkCircle' : 'book'}
            title={tab === 'resolved' ? 'No resolved mistakes yet' : 'No mistakes found'}
            message={tab === 'resolved'
              ? 'Re-attempt an unresolved question and answer it correctly to resolve it.'
              : 'Your mistake book is empty. Wrong answers from tests and practice sets appear here automatically.'}
            action={<Link to="/student/practice"><Button size="sm" icon="bolt">Start Practice</Button></Link>}
          />
        </Card>
      ) : (
        <ul className="space-y-4">
          {filtered.map((m) => {
            const q = questions.get(m.questionId);
            if (!q) return null;
            return <MistakeCard key={m.id} mistake={m} question={q} userId={user.id} onToast={toast} />;
          })}
        </ul>
      )}
    </AppShell>
  );
}

function MistakeCard({ mistake, question: q, userId, onToast }: { mistake: Mistake; question: Question; userId: string; onToast: ReturnType<typeof useToast> }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [practising, setPractising] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const attemptAnswer = (i: number) => {
    setPicked(i);
    const ok = attemptService.resolveMistake(userId, q.id, i);
    if (ok) {
      onToast.success('Mistake Resolved ✓', `${q.chapter} removed from your open mistakes.`);
      setPractising(false);
      setPicked(null);
    } else {
      onToast.error('Not quite', 'Check the explanation and try again — this stays in your mistake book.');
    }
  };

  return (
    <Card className={cn('overflow-hidden', mistake.resolved && 'border-emerald-200')}>
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
        <Badge tone="neutral">{q.subject}</Badge>
        <Badge tone="neutral">{q.chapter}</Badge>
        <Badge tone={mistake.resolved ? 'success' : 'danger'} dot>{mistake.resolved ? 'Resolved' : 'Unresolved'}</Badge>
        <span className="ml-auto text-[11px] text-ink-400">
          Attempts: {mistake.attemptCount} · {formatDate(mistake.createdAt)}
          {mistake.sourceTest ? ` · ${mistake.sourceTest}` : ''}
        </span>
      </div>
      <CardBody>
        <p className="text-sm font-medium leading-relaxed text-ink-900">{q.text}</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Your previous answer</p>
            <p className="text-xs font-semibold text-rose-800">
              {mistake.wrongAnswer === null || mistake.wrongAnswer === undefined
                ? 'Not attempted'
                : `${OPTION_KEYS[Number(mistake.wrongAnswer)]}. ${q.options[Number(mistake.wrongAnswer)]}`}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Correct answer</p>
            <p className="text-xs font-semibold text-emerald-800">{OPTION_KEYS[Number(q.answer)]}. {q.options[Number(q.answer)]}</p>
          </div>
        </div>

        {!mistake.resolved && !practising && (
          <div className="mt-4">
            <Button size="sm" icon="refresh" onClick={() => setPractising(true)}>Practice Again</Button>
          </div>
        )}

        {practising && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
            <p className="mb-2.5 text-xs font-bold text-ink-900">Re-attempt this question</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => attemptAnswer(i)}
                  className={cn('flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-xs transition',
                    picked === i ? 'border-brand-400 ring-2 ring-brand-100' : 'border-ink-200 hover:border-brand-300')}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-100 text-[10px] font-bold">{OPTION_KEYS[i]}</span>
                  {opt}
                </button>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setPractising(false); setPicked(null); }}>Cancel</Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowExplanation((s) => !s)}
          aria-expanded={showExplanation}
          className="mt-4 flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
        >
          <Icon name="bookOpen" size={14} />
          {showExplanation ? 'Hide explanation' : 'View explanation'}
        </button>
        {showExplanation && (
          <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-relaxed text-ink-700">{q.explanation}</p>
        )}
      </CardBody>
    </Card>
  );
}

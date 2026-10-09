import { useMemo, useState } from 'react';
import { Link, useMatch, useRouter } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { attemptService } from '../../services/attemptService';
import { questionService } from '../../services/questionService';
import { useDB } from '../../services/db';
import type { Attempt, Question } from '../../lib/types';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Tabs } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { BarChart, HBarList } from '../../components/ui/Charts';
import { formatTime } from '../../lib/hooks';
import { cn } from '../../utils/cn';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

type Filter = 'all' | 'correct' | 'wrong' | 'skipped';

export default function Result() {
  const user = useGuard('student');
  const db = useDB();
  const { navigate } = useRouter();
  const m = useMatch('/student/result/:id');
  const attempt = useMemo(() => {
    const item = m?.id ? attemptService.getById(m.id) : undefined;
    if (!item || item.userId !== user?.id || !user.exam) return undefined;
    const questions = item.questionIds.map((id) => db.questions.find((question) => question.id === id));
    return questions.length > 0 && questions.every((question) => question?.exam === user.exam) ? item : undefined;
  }, [m?.id, db.attempts, db.questions, user?.id, user?.exam]);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);

  if (!user) return null;

  if (!attempt) {
    return (
      <AppShell role="student" title="Result">
        <Card>
          <EmptyState
            icon="alert"
            title="Result not found"
            message="This attempt no longer exists in the local demo data."
            action={<Button size="sm" onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>}
          />
        </Card>
      </AppShell>
    );
  }

  const questions = attempt.questionIds
    .map((id) => questionService.getById(id))
    .filter((q): q is Question => Boolean(q));

  const bySubject = new Map<string, { attempted: number; correct: number }>();
  const byDifficulty = new Map<string, { attempted: number; correct: number }>();
  questions.forEach((q) => {
    const a = attempt.answers[q.id];
    if (!a) return;
    const s = bySubject.get(q.subject) ?? { attempted: 0, correct: 0 };
    const d = byDifficulty.get(q.difficulty) ?? { attempted: 0, correct: 0 };
    if (a.selected !== null) {
      s.attempted += 1; d.attempted += 1;
      if (a.correct) { s.correct += 1; d.correct += 1; }
    }
    bySubject.set(q.subject, s);
    byDifficulty.set(q.difficulty, d);
  });

  const subjectStats = [...bySubject.entries()].map(([key, v]) => ({
    label: key,
    value: v.attempted ? Math.round((v.correct / v.attempted) * 100) : 0,
    meta: `${v.correct}/${v.attempted}`,
  }));

  const diffOrder = ['Easy', 'Medium', 'Hard'];
  const diffStats = diffOrder
    .filter((d) => byDifficulty.has(d))
    .map((d) => {
      const v = byDifficulty.get(d)!;
      return { label: d, value: v.attempted ? Math.round((v.correct / v.attempted) * 100) : 0, meta: `${v.correct}/${v.attempted}` };
    });

  const visible = questions.filter((q) => {
    const a = attempt.answers[q.id];
    if (filter === 'correct') return a?.correct;
    if (filter === 'wrong') return a && !a.correct && a.selected !== null;
    if (filter === 'skipped') return a?.selected === null || !a;
    return true;
  });

  const counts = {
    all: questions.length,
    correct: attempt.correct,
    wrong: attempt.wrong,
    skipped: attempt.skipped,
  };

  const pct = Math.round((attempt.score / (attempt.maxScore || 1)) * 100);

  return (
    <AppShell
      role="student"
      title="Result"
      subtitle={attempt.testName}
      actions={
        <>
          <Link to="/student/dashboard"><Button size="sm" variant="outline">Dashboard</Button></Link>
          <Link to="/student/mistakes"><Button size="sm" icon="book">Mistake Book</Button></Link>
        </>
      }
    >
      {/* Hero summary */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-7 text-center sm:px-8">
          <p className="text-2xl font-extrabold text-white sm:text-3xl">Test Completed 🎉</p>
          <p className="mt-1 text-sm text-brand-100">{attempt.testName} · {new Date(attempt.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Score', `${Math.round(attempt.score)} / ${attempt.maxScore}`],
              ['Accuracy', `${attempt.accuracy}%`],
              ['Correct', attempt.correct],
              ['Wrong', attempt.wrong],
              ['Skipped', attempt.skipped],
              ['Time Taken', formatTime(attempt.timeTaken)],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-white/10 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-100">{l}</p>
                <p className="mt-0.5 text-lg font-bold text-white">{v as string}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-5 max-w-md">
            <div className="mb-1 flex justify-between text-[11px] font-medium text-brand-100">
              <span>Score percentage</span><span>{pct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Subject Performance" subtitle="Accuracy per subject in this attempt" icon="layers" />
          <CardBody>
            {subjectStats.length === 0 ? <EmptyState icon="layers" title="Not enough data" message="Attempt more questions to see subject-level splits." /> : <HBarList items={subjectStats} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Difficulty Performance" subtitle="How you handled Easy, Medium and Hard questions" icon="target" />
          <CardBody>
            {diffStats.length === 0 ? (
              <EmptyState icon="target" title="Not enough data" message="Difficulty splits appear once you attempt questions." />
            ) : (
              <>
                <BarChart labels={diffStats.map((d) => d.label)} values={diffStats.map((d) => d.value)} suffix="%" height={190} />
                <div className="mt-3 space-y-2">
                  {diffStats.map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-700">{d.label}</span>
                      <span className="text-ink-500">{d.value}% · {d.meta} correct</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Question review */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Question Review"
          subtitle="Expand any question to see the correct answer and explanation"
          icon="bookOpen"
          action={
            <Tabs
              tabs={[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'correct', label: 'Correct', count: counts.correct },
                { id: 'wrong', label: 'Wrong', count: counts.wrong },
                { id: 'skipped', label: 'Skipped', count: counts.skipped },
              ]}
              active={filter}
              onChange={setFilter}
            />
          }
        />
        {visible.length === 0 ? (
          <EmptyState icon="checkCircle" title="Nothing here" message="No questions match this filter." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {visible.map((q) => (
              <QuestionReviewRow
                key={q.id}
                index={attempt.questionIds.indexOf(q.id) + 1}
                question={q}
                attempt={attempt}
                open={open === q.id}
                onToggle={() => setOpen(open === q.id ? null : q.id)}
              />
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}

function QuestionReviewRow({
  index, question: q, attempt, open, onToggle,
}: { index: number; question: Question; attempt: Attempt; open: boolean; onToggle: () => void }) {
  const a = attempt.answers[q.id];
  const selected = a?.selected;
  const skipped = selected === null || selected === undefined;
  const correct = Boolean(a?.correct);

  return (
    <li className="px-4 py-3.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold',
          correct ? 'bg-emerald-100 text-emerald-700' : skipped ? 'bg-ink-100 text-ink-500' : 'bg-rose-100 text-rose-700')}>
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-relaxed text-ink-900">{q.text}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <span className="text-ink-500">Your answer: <b className={correct ? 'text-emerald-600' : 'text-rose-600'}>{skipped ? 'Not attempted' : `${OPTION_KEYS[Number(selected)]}. ${q.options[Number(selected)]}`}</b></span>
            <span className="text-ink-500">Correct: <b className="text-emerald-600">{OPTION_KEYS[Number(q.answer)]}. {q.options[Number(q.answer)]}</b></span>
            {!correct && !skipped && <Badge tone="danger">❌ Incorrect</Badge>}
            {correct && <Badge tone="success">✓ Correct</Badge>}
            {skipped && <Badge tone="neutral">– Skipped</Badge>}
            <span className="text-ink-400">{a?.timeSpent ?? 0}s</span>
          </span>
        </span>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} className="mt-1 shrink-0 text-ink-400" />
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50 p-3.5">
          <p className="text-xs font-semibold text-ink-900">Explanation</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-700">{q.explanation}</p>
          <ul className="mt-3 space-y-1.5">
            {q.options.map((opt, i) => (
              <li
                key={i}
                className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs',
                  i === Number(q.answer) ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-ink-600',
                  String(selected) === String(i) && !correct ? 'bg-rose-50 font-semibold text-rose-700' : '')}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold shadow-sm">{OPTION_KEYS[i]}</span>
                {opt}
                {i === Number(q.answer) && <Icon name="check" size={13} className="ml-auto text-emerald-600" />}
                {String(selected) === String(i) && !correct && <Icon name="x" size={13} className="ml-auto text-rose-600" />}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[10px] text-ink-400">{q.subject} · {q.chapter} · {q.topic} · {q.difficulty}</p>
        </div>
      )}
    </li>
  );
}

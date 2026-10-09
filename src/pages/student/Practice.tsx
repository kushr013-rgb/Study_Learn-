import { useMemo, useState } from 'react';
import { useRouter } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { questionService } from '../../services/questionService';
import { attemptService } from '../../services/attemptService';
import { curriculumService } from '../../services/curriculumService';
import { analyticsService } from '../../services/analyticsService';
import { useDB } from '../../services/db';
import type { Difficulty, Exam, Question } from '../../lib/types';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from '../../components/ui';
import { PillGroup, SearchableList, Step } from '../../components/ui/Stepper';
import { Icon, type IconName } from '../../components/ui/Icons';
import { QuestionPlayer, type PlayerResult } from '../../components/QuestionPlayer';
import { useToast } from '../../components/ui/Toast';
import { EXAMS } from '../../data/taxonomy';
import { authService } from '../../services/authService';

const COUNTS = [5, 10, 15, 20];
const DIFFICULTIES: (Difficulty | 'Mixed')[] = ['Easy', 'Medium', 'Hard', 'Mixed'];

export default function Practice() {
  const user = useGuard('student');
  const { path, navigate } = useRouter();
  const toast = useToast();
  const db = useDB();
  const qs = useMemo(() => new URLSearchParams(path.includes('?') ? path.split('?')[1] : ''), [path]);

  const initialExam = (user?.exam as Exam) || 'JEE';
  const requestedSubject = qs.get('subject');
  const initialSubject = requestedSubject && curriculumService.subjects(initialExam).includes(requestedSubject)
    ? requestedSubject
    : curriculumService.subjects(initialExam)[0] || 'Physics';

  const [exam, setExam] = useState<Exam>(initialExam);
  const [subject, setSubject] = useState(initialSubject);
  const [chapter, setChapter] = useState(qs.get('chapter') || (curriculumService.chapters(initialExam, initialSubject)[0] ?? ''));
  const [difficulty, setDifficulty] = useState<Difficulty | 'Mixed'>((qs.get('difficulty') as Difficulty) || 'Mixed');
  const [count, setCount] = useState(Number(qs.get('count')) || 10);
  const [timed, setTimed] = useState(qs.get('timed') === '1');
  const [openStep, setOpenStep] = useState(qs.get('chapter') ? 3 : 1);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const subjects = useMemo(() => curriculumService.subjects(exam), [exam, db.curriculum, db.questions]);
  const chapters = useMemo(
    () => curriculumService.chapters(exam, subject).map((c) => ({ value: c, count: questionService.published({ exam, subject, chapter: c }).length })),
    [exam, subject, db.curriculum, db.questions],
  );
  const available = useMemo(
    () => questionService.practiceSet({ exam, subject, chapter, difficulty, count }).length,
    [exam, subject, chapter, difficulty, count, db.questions],
  );
  const weak = useMemo(() => (user ? analyticsService.weakAreas(user.id, 70)[0] : undefined), [user, db.attempts]);

  const launch = (set: Question[], label: string, withTimer: boolean) => {
    if (set.length === 0) {
      toast.error('No questions available', 'Try another chapter or difficulty.');
      return;
    }
    setTimed(withTimer);
    setQuestions(set);
    toast.info(`Starting ${label}`, `${set.length} questions loaded.`);
  };

  const quickStart = (kind: 'weak' | 'random' | 'mixed') => {
    if (!user) return;
    if (kind === 'weak' && weak) {
      launch(questionService.practiceSet({ exam, subject: weak.subject ?? subject, chapter: weak.key, difficulty: 'Mixed', count: 10 }), weak.key, false);
      return;
    }
    if (kind === 'mixed') {
      const set = subjects.slice(0, 3).flatMap((s) => questionService.practiceSet({ exam, subject: s, difficulty: 'Mixed', count: 5 }));
      launch(set, 'mixed revision', false);
      return;
    }
    launch(questionService.practiceSet({ exam, subject, difficulty: 'Mixed', count: 10 }), `${subject} practice`, false);
  };

  if (!user) return null;

  if (!user.exam) {
    return (
      <AppShell role="student" title="Practice">
        <Card><EmptyState icon="layers" title="Choose your exam first" message="Practice questions and quizzes will appear after you select an exam." /></Card>
      </AppShell>
    );
  }

  /* ------------------------------ Player ------------------------------ */
  if (questions) {
    return (
      <AppShell role="student" title="Practice Session" subtitle={`${subject} · ${chapter || 'Mixed'}`}>
        <QuestionPlayer
          questions={questions}
          mode="practice"
          title={`${exam} · ${chapter || subject}`}
          subtitle={`${questions.length} questions${timed ? ' · timed' : ''}`}
          durationSeconds={timed ? questions.length * 60 : undefined}
          onExit={() => { setQuestions(null); navigate('/student/practice'); }}
          onSubmit={(res: PlayerResult) => {
            const attempt = attemptService.submit({
              userId: user.id,
              mode: 'practice',
              testName: `${subject} · ${chapter || 'Mixed'} Practice`,
              questionIds: questions.map((q) => q.id),
              answers: res.answers,
              timeTaken: res.timeTaken,
            });
            toast.success('Practice submitted ✓', `${attempt.correct} correct · ${attempt.accuracy}% accuracy`);
            setQuestions(null);
            navigate(`/student/result/${attempt.id}`);
          }}
        />
      </AppShell>
    );
  }

  const QUICK: { id: 'weak' | 'random' | 'mixed'; icon: IconName; title: string; body: string; tone: string }[] = [
    { id: 'weak', icon: 'target', title: weak ? `Fix ${weak.key}` : 'Fix weak areas', body: weak ? `Your accuracy here is ${weak.accuracy}%` : 'Attempt a few questions first', tone: 'from-rose-500 to-orange-500' },
    { id: 'random', icon: 'bolt', title: `Quick ${subject}`, body: '10 mixed questions, no timer', tone: 'from-brand-500 to-indigo-600' },
    { id: 'mixed', icon: 'layers', title: 'All subjects mix', body: '15 questions across your syllabus', tone: 'from-teal-500 to-emerald-600' },
  ];

  return (
    <AppShell role="student" title="Practice" subtitle="Start in one tap, or build your own set">
      {/* ------------------------- Quick start ------------------------- */}
      <section aria-labelledby="quick-start">
        <h2 id="quick-start" className="mb-3 text-sm font-bold text-ink-900">Start practising now</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => quickStart(q.id)}
              disabled={q.id === 'weak' && !weak}
              className="group overflow-hidden rounded-2xl border border-ink-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${q.tone} text-white shadow-sm`}>
                <Icon name={q.icon} size={19} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink-900">{q.title}</p>
              <p className="mt-0.5 text-xs text-ink-500">{q.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                Start <Icon name="arrowRight" size={13} className="transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------- Custom builder ------------------------- */}
      <section aria-labelledby="builder" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="builder" className="text-sm font-bold text-ink-900">Or build your own set</h2>
          <span className="text-xs text-ink-500">{available} question{available === 1 ? '' : 's'} ready</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            <Step n={1} label="Exam" summary={exam} active={openStep === 1} done={Boolean(exam)} onOpen={() => setOpenStep(openStep === 1 ? 0 : 1)}>
              <PillGroup
                label="Exam"
                columns
                value={exam}
                options={EXAMS.map((e) => ({ value: e, label: e }))}
                onChange={async (e) => {
                  if (!user || e === user.exam) return;
                  try {
                    const updated = await authService.updateProfile(user.id, { exam: e });
                    if (!updated) throw new Error('Exam selection could not be saved.');
                    setExam(e);
                    const s = curriculumService.subjects(e)[0] ?? '';
                    setSubject(s);
                    setChapter(curriculumService.chapters(e, s)[0] ?? '');
                    setQuestions(null);
                    setOpenStep(2);
                    toast.success('Exam updated', `Your preparation is now set to ${e}.`);
                  } catch {
                    toast.error('Exam not updated', 'Could not save your exam selection. Please try again.');
                  }
                }}
              />
            </Step>

            <Step n={2} label="Subject" summary={subject || 'Choose a subject'} active={openStep === 2} done={Boolean(subject)} onOpen={() => setOpenStep(openStep === 2 ? 0 : 2)}>
              <PillGroup
                label="Subject"
                value={subject}
                options={subjects.map((s) => ({ value: s, label: s }))}
                onChange={(s) => {
                  setSubject(s);
                  setChapter(curriculumService.chapters(exam, s)[0] ?? '');
                  setOpenStep(3);
                }}
              />
            </Step>

            <Step n={3} label="Chapter" summary={chapter || 'Choose a chapter'} active={openStep === 3} done={Boolean(chapter)} onOpen={() => setOpenStep(openStep === 3 ? 0 : 3)}>
              <SearchableList
                items={chapters}
                value={chapter}
                onChange={(c) => { setChapter(c); setOpenStep(4); }}
                placeholder="Search chapters…"
                emptyLabel="No chapters yet for this subject."
              />
            </Step>

            <Step
              n={4}
              label="Options"
              summary={`${difficulty} · ${count} questions${timed ? ' · timed' : ''}`}
              active={openStep === 4}
              done
              onOpen={() => setOpenStep(openStep === 4 ? 0 : 4)}
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-700">Difficulty</p>
                  <PillGroup label="Difficulty" columns value={difficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: d }))} onChange={setDifficulty} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-700">How many questions?</p>
                  <PillGroup label="Question count" columns value={count} options={COUNTS.map((c) => ({ value: c, label: String(c) }))} onChange={setCount} />
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 px-3.5 py-3">
                  <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 rounded border-ink-300 accent-brand-600" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink-900">Practise with a timer</span>
                    <span className="block text-[11px] text-ink-500">60 seconds per question — builds exam speed</span>
                  </span>
                  <Icon name="clock" size={16} className="text-ink-400" />
                </label>
              </div>
            </Step>
          </div>

          {/* Summary rail (desktop) */}
          <aside className="hidden lg:block">
            <Card className="sticky top-24 overflow-hidden">
              <CardHeader title="Your set" icon="target" />
              <CardBody className="space-y-2.5">
                {[['Exam', exam], ['Subject', subject || '—'], ['Chapter', chapter || '—'], ['Difficulty', difficulty], ['Questions', String(count)], ['Timer', timed ? 'On' : 'Off']].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-xs text-ink-500">{k}</span>
                    <span className="truncate text-xs font-bold text-ink-900">{v}</span>
                  </div>
                ))}
                <Button
                  fullWidth size="lg" icon="bolt" disabled={available === 0}
                  onClick={() => launch(questionService.practiceSet({ exam, subject, chapter, difficulty, count }), chapter || subject, timed)}
                >
                  Start Practice
                </Button>
                {available === 0 && <p className="text-center text-[11px] text-amber-600">No questions match. Try another chapter.</p>}
              </CardBody>
            </Card>
          </aside>
        </div>
      </section>

      {/* Preview */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader title="What's inside" subtitle={chapter ? `Sample from ${chapter}` : 'Choose a chapter to preview'} icon="layers" />
        <ChapterPreview exam={exam} subject={subject} chapter={chapter} />
      </Card>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Button
          fullWidth size="lg" icon="bolt" disabled={available === 0}
          onClick={() => launch(questionService.practiceSet({ exam, subject, chapter, difficulty, count }), chapter || subject, timed)}
        >
          Start {count} questions
        </Button>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </AppShell>
  );
}

function ChapterPreview({ exam, subject, chapter }: { exam: Exam; subject: string; chapter: string }) {
  const list = useMemo(() => questionService.published({ exam, subject, chapter }).slice(0, 3), [exam, subject, chapter]);
  if (list.length === 0) {
    return <EmptyState icon="layers" title="No published questions here" message="Pick another chapter, or ask your faculty to publish questions for this one." />;
  }
  return (
    <ul className="divide-y divide-ink-100">
      {list.map((q) => (
        <li key={q.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{q.topic}</Badge>
            <Badge tone={q.difficulty === 'Easy' ? 'success' : q.difficulty === 'Medium' ? 'warning' : 'danger'}>{q.difficulty}</Badge>
          </div>
          <p className="mt-1.5 text-xs text-ink-700">{q.text}</p>
        </li>
      ))}
    </ul>
  );
}

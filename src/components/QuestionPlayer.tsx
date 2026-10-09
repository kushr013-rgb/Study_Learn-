import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttemptAnswer, Question } from '../lib/types';
import { cn } from '../utils/cn';
import { Badge, Button, Card, ConfirmModal, ProgressBar } from './ui';
import { Icon } from './ui/Icons';
import { formatTime, useCountdown } from '../lib/hooks';

export interface PlayerResult {
  answers: Record<string, AttemptAnswer>;
  timeTaken: number;
}

interface Props {
  questions: Question[];
  mode: 'practice' | 'test' | 'mistake';
  title: string;
  subtitle?: string;
  durationSeconds?: number;
  onSubmit: (result: PlayerResult) => void;
  onExit: () => void;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export function QuestionPlayer({ questions, mode, title, subtitle, durationSeconds, onSubmit, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AttemptAnswer>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [visible, setVisible] = useState(true);

  const perQuestion = useRef<Record<string, number>>({});
  const lastSwitch = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const submitted = useRef(false);

  const current = questions[index];
  const isTimed = typeof durationSeconds === 'number' && durationSeconds > 0;

  const finalise = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    const now = Date.now();
    const total = Math.round((now - startedAt.current) / 1000);
    const merged: Record<string, AttemptAnswer> = {};
    questions.forEach((q, i) => {
      const a = answers[q.id];
      const extra = i === index ? Math.round((now - lastSwitch.current) / 1000) : 0;
      merged[q.id] = a
        ? { ...a, timeSpent: (a.timeSpent ?? 0) + (i === index ? extra : 0) }
        : { selected: null, correct: false, timeSpent: perQuestion.current[q.id] ?? 0, status: 'skipped' };
    });
    onSubmit({ answers: merged, timeTaken: isTimed ? Math.min(total, durationSeconds!) : total });
  }, [answers, questions, index, onSubmit, isTimed, durationSeconds]);

  const secondsLeft = useCountdown(durationSeconds ?? 0, finalise, isTimed);

  // Stopwatch for untimed practice
  useEffect(() => {
    if (isTimed) return;
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [isTimed]);

  const goto = useCallback((next: number) => {
    if (current) {
      const spent = Math.round((Date.now() - lastSwitch.current) / 1000);
      perQuestion.current[current.id] = (perQuestion.current[current.id] ?? 0) + spent;
      setAnswers((prev) => {
        const a = prev[current.id];
        return a ? { ...prev, [current.id]: { ...a, timeSpent: (a.timeSpent ?? 0) + spent } } : prev;
      });
    }
    lastSwitch.current = Date.now();
    setIndex(Math.max(0, Math.min(questions.length - 1, next)));
  }, [current, questions.length]);

  const select = (optionIndex: number) => {
    if (!current) return;
    setAnswers((prev) => {
      const existing = prev[current.id];
      const isSame = String(existing?.selected) === String(optionIndex);
      return {
        ...prev,
        [current.id]: {
          selected: isSame ? null : optionIndex,
          correct: false,
          timeSpent: existing?.timeSpent ?? 0,
          status: isSame ? 'skipped' : 'answered',
        },
      };
    });
  };

  const markForReview = () => {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { selected: prev[current.id]?.selected ?? null, correct: false, timeSpent: prev[current.id]?.timeSpent ?? 0, status: 'marked' },
    }));
    if (index < questions.length - 1) goto(index + 1);
  };

  const clearResponse = () => {
    if (!current) return;
    setAnswers((prev) => {
      const { [current.id]: _dropped, ...rest } = prev;
      return rest;
    });
  };

  // Keyboard shortcuts: 1–4 select, arrows navigate, R marks review
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (['1', '2', '3', '4'].includes(e.key)) { select(Number(e.key) - 1); return; }
      if (e.key === 'ArrowRight') goto(index + 1);
      if (e.key === 'ArrowLeft') goto(index - 1);
      if (e.key.toLowerCase() === 'r') markForReview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current, answers]);

  const stats = useMemo(() => {
    let answered = 0;
    let marked = 0;
    questions.forEach((q) => {
      const a = answers[q.id];
      if (a?.selected !== null && a?.selected !== undefined) answered += 1;
      if (a?.status === 'marked') marked += 1;
    });
    return { answered, marked, notAnswered: questions.length - answered - marked + marked };
  }, [answers, questions]);

  if (!current) return null;

  const selected = answers[current.id]?.selected;
  const marked = answers[current.id]?.status === 'marked';
  const progress = ((index + 1) / questions.length) * 100;
  const timerLabel = isTimed ? formatTime(secondsLeft) : formatTime(elapsed);
  const lowTime = isTimed && secondsLeft <= 300;

  const paletteState = (i: number) => {
    const a = answers[questions[i].id];
    if (i === index) return 'current';
    if (a?.status === 'marked') return 'marked';
    if (a?.selected !== null && a?.selected !== undefined) return 'answered';
    return 'unanswered';
  };

  const PALETTE_CLASS: Record<string, string> = {
    current: 'bg-brand-600 text-white ring-2 ring-brand-200',
    marked: 'bg-amber-400 text-amber-950',
    answered: 'bg-emerald-500 text-white',
    unanswered: 'bg-white text-ink-500 border border-ink-200',
  };

  return (
    <div className="mx-auto max-w-[1320px]">
      {/* ------------------------- Sticky header ------------------------- */}
      <header className="sticky top-16 z-20 -mx-4 mb-4 border-b border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-ink-900">{title}</h1>
            {subtitle && <p className="truncate text-[11px] text-ink-500">{subtitle}</p>}
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold tabular-nums', lowTime ? 'bg-rose-50 text-rose-600' : 'bg-ink-100 text-ink-800')}>
            <Icon name="clock" size={15} />
            {timerLabel}
            {!isTimed && <span className="ml-1 text-[10px] font-medium text-ink-500">elapsed</span>}
          </div>
          <Button size="sm" variant="outline" onClick={() => setConfirmExit(true)}>Exit</Button>
          <Button size="sm" onClick={() => setConfirmSubmit(true)}>
            Submit {mode === 'test' ? 'Test' : 'Set'}
          </Button>
        </div>
        <div className="mt-2.5">
          <ProgressBar value={progress} size="sm" label={`Question ${index + 1} of ${questions.length}`} />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* ------------------------ Question panel ------------------------ */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
            <span className="text-xs font-bold text-ink-700">Question {index + 1}</span>
            <Badge tone="neutral">{current.subject}</Badge>
            <Badge tone="neutral">{current.chapter}</Badge>
            <Badge tone={current.difficulty === 'Easy' ? 'success' : current.difficulty === 'Medium' ? 'warning' : 'danger'}>{current.difficulty}</Badge>
            <span className="ml-auto text-[11px] font-semibold text-ink-500">+{current.marks} / −{current.negative}</span>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-[15px] font-medium leading-relaxed text-ink-900 sm:text-base">{current.text}</p>

            <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Answer options">
              {current.options.map((opt, i) => {
                const isSelected = String(selected) === String(i);
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => select(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all',
                      isSelected
                        ? 'border-brand-400 bg-brand-50 text-brand-900 shadow-[inset_0_0_0_1px_var(--color-brand-400)]'
                        : 'border-ink-200 text-ink-700 hover:border-brand-200 hover:bg-ink-50',
                    )}
                  >
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold', isSelected ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-300 text-ink-500')}>
                      {OPTION_KEYS[i]}
                    </span>
                    <span className="flex-1">{opt}</span>
                    <span className="hidden text-[10px] font-semibold text-ink-400 sm:block">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-ink-200 bg-ink-50 px-4 py-3">
            <Button variant="outline" size="sm" icon="chevronLeft" onClick={() => goto(index - 1)} disabled={index === 0}>Previous</Button>
            <Button variant="outline" size="sm" icon="flag" onClick={markForReview} className={marked ? 'border-amber-400 bg-amber-50 text-amber-700' : ''}>
              Mark for Review
            </Button>
            <Button variant="ghost" size="sm" onClick={clearResponse} disabled={selected === null || selected === undefined}>Clear</Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" trailing="chevronRight" onClick={() => goto(index + 1)} disabled={index === questions.length - 1}>
                Save &amp; Next
              </Button>
              {index === questions.length - 1 && (
                <Button size="sm" variant="success" icon="check" onClick={() => setConfirmSubmit(true)}>Submit</Button>
              )}
            </div>
          </div>
        </Card>

        {/* --------------------------- Palette --------------------------- */}
        <aside className="hidden lg:block">
          <Card className="sticky top-40 overflow-hidden">
            <div className="border-b border-ink-200 px-4 py-3">
              <h2 className="text-sm font-bold text-ink-900">Question Navigator</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { n: stats.answered, label: 'Answered', cls: 'bg-emerald-500' },
                  { n: stats.marked, label: 'Marked', cls: 'bg-amber-400' },
                  { n: questions.length - stats.answered - stats.marked, label: 'Unanswered', cls: 'bg-ink-200' },
                  { n: questions.length, label: 'Total', cls: 'bg-brand-600' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span className={cn('h-2.5 w-2.5 rounded-sm', s.cls)} />
                    <span className="font-semibold text-ink-900">{s.n}</span>
                    <span className="text-ink-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="max-h-[46vh] overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goto(i)}
                    aria-label={`Go to question ${i + 1}`}
                    aria-current={i === index ? 'true' : undefined}
                    className={cn('grid h-9 place-items-center rounded-lg text-xs font-bold transition', PALETTE_CLASS[paletteState(i)])}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-ink-200 p-3">
              <Button fullWidth variant="success" icon="check" onClick={() => setConfirmSubmit(true)}>Submit {mode === 'test' ? 'Test' : 'Set'}</Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* -------------------- Mobile palette (bottom sheet) -------------------- */}
      <div className="fixed inset-x-0 bottom-16 z-30 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setPaletteOpen((o) => !o)}
          className="mx-auto flex w-full max-w-md items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-semibold shadow-lift"
          aria-expanded={paletteOpen}
        >
          <span className="flex items-center gap-2">
            <Icon name="grid" size={15} className="text-brand-600" /> Question Navigator
          </span>
          <span className="flex items-center gap-3 text-[11px] text-ink-500">
            <span className="text-emerald-600">{stats.answered}✓</span>
            <span className="text-amber-600">{stats.marked}?</span>
            <Icon name={paletteOpen ? 'chevronDown' : 'chevronRight'} size={14} />
          </span>
        </button>
        {paletteOpen && (
          <Card className="mt-2 max-h-[42vh] overflow-y-auto p-3">
            <div className="grid grid-cols-6 gap-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => { goto(i); setPaletteOpen(false); }}
                  aria-label={`Go to question ${i + 1}`}
                  className={cn('grid h-9 place-items-center rounded-lg text-xs font-bold transition', PALETTE_CLASS[paletteState(i)])}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* --------------------------- Modals --------------------------- */}
      <ConfirmModal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        onConfirm={onExit}
        title="Exit this session?"
        message="Your answers will not be saved and no result will be recorded."
        confirmLabel="Exit"
      />

      <ConfirmModal
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={finalise}
        tone="primary"
        title={`Submit ${mode === 'test' ? 'test' : 'set'}?`}
        message={`You have answered ${stats.answered} of ${questions.length} questions${stats.marked ? `, ${stats.marked} marked for review` : ''}. Once submitted, the result is final.`}
        confirmLabel="Submit"
      />

      {/* Practice-only helper: explanation toggle */}
      {mode === 'practice' && (
        <Card className="mt-4">
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            aria-expanded={visible}
          >
            <span className="flex items-center gap-2 text-xs font-bold text-ink-900">
              <Icon name="bookOpen" size={15} className="text-brand-600" /> Explanation
            </span>
            <Icon name={visible ? 'chevronDown' : 'chevronRight'} size={16} className="text-ink-400" />
          </button>
          {visible && (
            <div className="border-t border-ink-200 px-4 py-3 text-sm leading-relaxed text-ink-700">
              <b className="text-emerald-600">Correct answer: {OPTION_KEYS[Number(current.answer)]}. {current.options[Number(current.answer)]}</b>
              <p className="mt-1.5">{current.explanation}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

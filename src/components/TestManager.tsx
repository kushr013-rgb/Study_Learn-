import { useMemo, useState, type FormEvent } from 'react';
import type { Difficulty, Exam, Test, TestType } from '../lib/types';
import { testService } from '../services/testService';
import { questionService } from '../services/questionService';
import { useDB } from '../services/db';
import { curriculumService } from '../services/curriculumService';
import { Badge, Button, Card, CardHeader, ConfirmModal, DataTable, EmptyState, Field, Input, Modal, SearchInput, Select, Tabs, statusTone } from './ui';
import { Icon } from './ui/Icons';
import { useToast } from './ui/Toast';
import { formatDate } from '../lib/hooks';
import type { Column } from './ui';
import { EXAMS } from '../data/taxonomy';

const TYPES: TestType[] = ['Topic Test', 'Chapter Test', 'Subject Test', 'Full Mock Test'];
const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];

/* ============================== Test Form ============================== */

export function TestForm({ onCancel, onSaved, createdBy = 'F-001' }: { onCancel: () => void; onSaved: (t: Test) => void; createdBy?: string }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [exam, setExam] = useState<Exam>('JEE');
  const [subject, setSubject] = useState('Physics');
  const [type, setType] = useState<TestType>('Chapter Test');
  const [duration, setDuration] = useState('30');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [mode, setMode] = useState<'manual' | 'random'>('random');
  const [counts, setCounts] = useState({ easy: 5, medium: 10, hard: 5 });
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const pool = useMemo(
    () => questionService.published({ exam, subject }),
    [exam, subject, useDB().questions],
  );
  const total = mode === 'random' ? counts.easy + counts.medium + counts.hard : manualIds.length;

  const submit = (publish: boolean) => (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 4) { setError('Give the test a descriptive name.'); return; }
    if (total === 0) { setError('Select at least one question.'); return; }
    setError('');
    const ids = mode === 'random'
      ? testService.generateRandom({ exam, subject, easy: counts.easy, medium: counts.medium, hard: counts.hard })
      : manualIds;
    const test = testService.create({
      name: name.trim(), exam, subject, type, duration: Number(duration) || 30, difficulty, questionIds: ids,
    }, createdBy);
    if (publish) testService.setStatus(test.id, 'Published');
    toast.success(
      publish ? 'Test published ✓' : 'Test saved as draft ✓',
      `${test.name} · ${ids.length} questions · ${test.totalMarks} marks`,
    );
    onSaved(test);
  };

  return (
    <form className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Test Name" required className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. JEE Physics Mock Test 02" />
        </Field>
        <Field label="Exam">
          <Select value={exam} onChange={(e) => { const x = e.target.value as Exam; setExam(x); setSubject(curriculumService.subjects(x)[0] ?? ''); }}>
            {EXAMS.map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Subject">
          <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {curriculumService.subjects(exam).map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Test Type">
          <Select value={type} onChange={(e) => setType(e.target.value as TestType)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Duration (minutes)">
          <Input type="number" min={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Field label="Difficulty">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink-700">Question selection <span className="text-rose-500">*</span></p>
        <Tabs tabs={[{ id: 'random', label: 'Random Selection' }, { id: 'manual', label: 'Manual Selection' }]} active={mode} onChange={setMode} />
      </div>

      {mode === 'random' ? (
        <div className="rounded-xl border border-ink-200 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(['easy', 'medium', 'hard'] as const).map((k) => (
              <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} Questions`}>
                <Input type="number" min={0} value={counts[k]} onChange={(e) => setCounts((c) => ({ ...c, [k]: Math.max(0, Number(e.target.value) || 0) }))} />
              </Field>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs">
            <span className="text-ink-600">
              Easy: {counts.easy} · Medium: {counts.medium} · Hard: {counts.hard}
            </span>
            <span className="font-bold text-ink-900">Total: {total} questions · {total * 4} marks</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-ink-200">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5">
            <p className="text-xs font-semibold text-ink-700">Select questions ({manualIds.length} selected)</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setManualIds(manualIds.length === pool.length ? [] : pool.map((q) => q.id))}
            >
              {manualIds.length === pool.length ? 'Clear all' : 'Select all'}
            </Button>
          </div>
          <ul className="max-h-72 divide-y divide-ink-100 overflow-y-auto">
            {pool.length === 0 && <EmptyState icon="layers" title="No published questions" message="Publish questions for this exam and subject first." />}
            {pool.map((q) => (
              <li key={q.id}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 transition hover:bg-ink-50">
                  <input
                    type="checkbox"
                    checked={manualIds.includes(q.id)}
                    onChange={() => setManualIds((prev) => (prev.includes(q.id) ? prev.filter((x) => x !== q.id) : [...prev, q.id]))}
                    className="mt-0.5 h-4 w-4 rounded border-ink-300 accent-brand-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink-900">{q.text}</span>
                    <span className="mt-0.5 flex gap-2 text-[10px] text-ink-400">
                      <span>{q.chapter}</span><span>·</span><span>{q.difficulty}</span><span>·</span><span>{q.id}</span>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="outline" onClick={submit(false)}>Save Draft</Button>
        <Button type="button" onClick={submit(true)} icon="check">Publish Test</Button>
      </div>
    </form>
  );
}

/* ============================ Test Manager ============================ */

export function TestManager({ scope }: { scope: 'faculty' | 'admin' }) {
  const db = useDB();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TestType | 'All'>('All');
  const [status, setStatus] = useState<Test['status'] | 'All'>('All');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Test | null>(null);
  const [viewing, setViewing] = useState<Test | null>(null);

  const tests = useMemo(
    () => testService.list({ type, status, search }),
    [type, status, search, db.tests],
  );

  const columns: Column<Test>[] = [
    {
      key: 'name', header: 'Test',
      render: (t) => (
        <div className="max-w-xs">
          <p className="truncate text-xs font-semibold text-ink-900">{t.name}</p>
          <p className="text-[11px] text-ink-400">{t.exam} · {t.subject}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (t) => <Badge tone="brand">{t.type}</Badge> },
    { key: 'q', header: 'Questions', className: 'hidden md:table-cell', render: (t) => <span className="text-xs">{t.questionIds.length}</span> },
    { key: 'duration', header: 'Duration', className: 'hidden lg:table-cell', render: (t) => <span className="text-xs">{t.duration} min</span> },
    { key: 'marks', header: 'Marks', className: 'hidden lg:table-cell', render: (t) => <span className="text-xs">{t.totalMarks}</span> },
    { key: 'difficulty', header: 'Difficulty', className: 'hidden sm:table-cell', render: (t) => <Badge tone={statusTone(t.difficulty)}>{t.difficulty}</Badge> },
    { key: 'status', header: 'Status', render: (t) => <Badge tone={statusTone(t.status)} dot>{t.status}</Badge> },
    {
      key: 'actions', header: 'Actions', headerClassName: 'text-right', className: 'text-right',
      render: (t) => (
        <div className="flex justify-end gap-1">
          <button type="button" aria-label="View test questions" title="View" onClick={() => setViewing(t)} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-brand-600"><Icon name="eye" size={15} /></button>
          {t.status === 'Published' ? (
            <button type="button" aria-label="Unpublish test" title="Unpublish" onClick={() => { testService.setStatus(t.id, 'Draft'); toast.info('Test unpublished', t.name); }} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-amber-600"><Icon name="xCircle" size={15} /></button>
          ) : (
            <button type="button" aria-label="Publish test" title="Publish" onClick={() => { testService.setStatus(t.id, 'Published'); toast.success('Test published ✓', 'Students can now attempt it.'); }} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-emerald-600"><Icon name="checkCircle" size={15} /></button>
          )}
          <button type="button" aria-label="Delete test" title="Delete" onClick={() => setDeleting(t)} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"><Icon name="trash" size={15} /></button>
        </div>
      ),
    },
  ];

  const totalQuestions = tests.reduce((s, t) => s + t.questionIds.length, 0);

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-ink-500">Tests</p><p className="mt-1 text-xl font-bold text-ink-900">{tests.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-ink-500">Published</p><p className="mt-1 text-xl font-bold text-ink-900">{tests.filter((t) => t.status === 'Published').length}</p></Card>
        <Card className="p-4"><p className="text-xs text-ink-500">Questions linked</p><p className="mt-1 text-xl font-bold text-ink-900">{totalQuestions}</p></Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Tests"
          subtitle="Build and publish topic, chapter, subject and full mock tests"
          icon="quiz"
          action={<Button size="sm" icon="plus" onClick={() => setCreating(true)}>Create Test</Button>}
        />
        <div className="flex flex-wrap gap-3 border-b border-ink-200 bg-ink-50 px-4 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tests…" className="min-w-48 flex-1" />
          <Select value={type} onChange={(e) => setType(e.target.value as TestType | 'All')} aria-label="Filter by type">
            <option value="All">All Types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as Test['status'] | 'All')} aria-label="Filter by status">
            <option value="All">All Status</option>
            <option>Published</option><option>Draft</option><option>Archived</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={tests}
          keyFn={(t) => t.id}
          empty={<EmptyState icon="quiz" title="No tests found" message="Create your first test using random or manual question selection." action={<Button size="sm" icon="plus" onClick={() => setCreating(true)}>Create Test</Button>} />}
        />
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Create Test" size="xl" icon="plus">
        <TestForm createdBy={scope === 'admin' ? 'A-001' : 'F-001'} onCancel={() => setCreating(false)} onSaved={() => setCreating(false)} />
      </Modal>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.name ?? 'Test'} size="lg" icon="eye">
        {viewing && (
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="brand">{viewing.type}</Badge>
              <Badge tone={statusTone(viewing.difficulty)}>{viewing.difficulty}</Badge>
              <Badge tone={statusTone(viewing.status)} dot>{viewing.status}</Badge>
              <span className="text-[11px] text-ink-500">{viewing.duration} min · {viewing.totalMarks} marks · {viewing.attempts} attempts</span>
            </div>
            {viewing.questionIds.length === 0 ? (
              <EmptyState icon="layers" title="No questions linked" message="Edit this test to attach questions." />
            ) : (
              <ol className="space-y-2">
                {viewing.questionIds.map((id, i) => {
                  const q = questionService.getById(id);
                  return (
                    <li key={id} className="rounded-lg border border-ink-200 px-3 py-2">
                      <p className="text-xs text-ink-800"><b>{i + 1}.</b> {q?.text ?? 'Question removed'}</p>
                      {q && <p className="mt-0.5 text-[10px] text-ink-400">{q.subject} · {q.chapter} · {q.difficulty}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-3 text-[11px] text-ink-400">Created {formatDate(viewing.createdAt)} by {viewing.createdBy}</p>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) { testService.remove(deleting.id); toast.success('Test deleted', deleting.name); }
          setDeleting(null);
        }}
        title="Delete Test?"
        message="Attempt history stays intact, but students will no longer be able to open this test. This cannot be undone."
        confirmLabel="Delete"
      />
    </>
  );
}





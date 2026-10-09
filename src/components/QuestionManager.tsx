import { useMemo, useState, type FormEvent } from 'react';
import type { Difficulty, Exam, Question, QuestionStatus } from '../lib/types';
import { questionService } from '../services/questionService';
import { curriculumService } from '../services/curriculumService';
import { importService } from '../services/importService';
import { downloadFile } from '../lib/csv';
import { useDB } from '../services/db';
import { BulkUpload } from './BulkUpload';
import { Badge, Button, Card, CardHeader, ConfirmModal, DataTable, EmptyState, Field, Input, Modal, Pagination, SearchInput, Select, Textarea, statusTone } from './ui';
import { Icon } from './ui/Icons';
import { useToast } from './ui/Toast';
import { formatDate } from '../lib/hooks';
import type { Column } from './ui';
import { EXAMS } from '../data/taxonomy';

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const STATUSES: QuestionStatus[] = ['Draft', 'Published', 'Archived'];
const ADD_NEW = '__add_new__';

export const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/**
 * A select that also lets the user type a brand-new value.
 * This is what makes the curriculum fully extensible from inside the app —
 * faculty never has to wait for a developer to add a chapter.
 */
function CreatableSelect({
  label, value, options, onChange, placeholder, required,
}: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  if (adding) {
    return (
      <Field label={label} required={required} hint="Press Add to save this new entry">
        <div className="flex gap-2">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder ?? `New ${label.toLowerCase()}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) { onChange(draft.trim()); setAdding(false); setDraft(''); } }
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
          />
          <Button type="button" size="sm" onClick={() => { if (draft.trim()) { onChange(draft.trim()); setAdding(false); setDraft(''); } }}>Add</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setDraft(''); }}>Cancel</Button>
        </div>
      </Field>
    );
  }

  return (
    <Field label={label} required={required}>
      <Select
        value={options.includes(value) ? value : (value ? ADD_NEW : '')}
        onChange={(e) => { if (e.target.value === ADD_NEW) { setAdding(true); setDraft(value); } else onChange(e.target.value); }}
      >
        {!options.includes(value) && value && <option value={ADD_NEW}>{value} (new)</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={ADD_NEW}>+ Add new…</option>
      </Select>
    </Field>
  );
}

/* ============================ Question Form ============================ */

export function QuestionForm({
  initial, onSave, onCancel, busy, authorId = 'F-001',
}: {
  initial?: Question;
  onSave: (payload: Omit<Question, 'id' | 'usage' | 'createdAt'>) => void;
  onCancel: () => void;
  busy?: boolean;
  authorId?: string;
}) {
  useDB(); // keep curriculum options reactive
  const [exam, setExam] = useState<Exam>(initial?.exam ?? 'JEE');
  const [subject, setSubject] = useState(initial?.subject ?? curriculumService.subjects('JEE')[0] ?? 'Physics');
  const [chapter, setChapter] = useState(initial?.chapter ?? '');
  const [topic, setTopic] = useState(initial?.topic ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'Medium');
  const [text, setText] = useState(initial?.text ?? '');
  const [options, setOptions] = useState<string[]>(initial?.options ?? ['', '', '', '']);
  const [answer, setAnswer] = useState(initial ? Number(initial.answer) : 0);
  const [marks, setMarks] = useState(String(initial?.marks ?? 4));
  const [negative, setNegative] = useState(String(initial?.negative ?? 1));
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subjects = curriculumService.subjects(exam);
  const chapters = curriculumService.chapters(exam, subject);
  const topics = curriculumService.topics(exam, subject, chapter || chapters[0] || '');

  const effectiveChapter = chapter || chapters[0] || '';
  const effectiveTopic = topic || topics[0] || 'Concept Review';

  const submit = (publish: boolean) => (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (text.trim().length < 10) errs.text = 'Enter the question statement (min 10 characters).';
    if (options.some((o) => o.trim() === '')) errs.options = 'All four options are required.';
    if (!subject.trim()) errs.subject = 'Subject is required.';
    if (!effectiveChapter.trim()) errs.chapter = 'Chapter is required.';
    if (explanation.trim().length < 5) errs.explanation = 'Add a short explanation.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    // Register any newly typed curriculum nodes so they appear everywhere.
    curriculumService.add({ exam, subject }, authorId);
    curriculumService.add({ exam, subject, chapter: effectiveChapter }, authorId);
    curriculumService.add({ exam, subject, chapter: effectiveChapter, topic: effectiveTopic }, authorId);

    onSave({
      exam, subject: subject.trim(), chapter: effectiveChapter.trim(), topic: effectiveTopic.trim(), difficulty,
      type: 'MCQ', text: text.trim(), options: options.map((o) => o.trim()), answer,
      marks: Number(marks) || 4, negative: Number(negative) || 0,
      explanation: explanation.trim(),
      status: publish ? 'Published' : 'Draft',
      createdBy: initial?.createdBy ?? authorId,
    });
  };

  return (
    <form className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Exam" required>
          <Select value={exam} onChange={(e) => { const x = e.target.value as Exam; setExam(x); setSubject(curriculumService.subjects(x)[0] ?? ''); setChapter(''); setTopic(''); }}>
            {EXAMS.map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
        <CreatableSelect
          label="Subject" required value={subject} options={subjects}
          onChange={(v) => { setSubject(v); setChapter(''); setTopic(''); }}
          placeholder="e.g. Physics"
        />
        <CreatableSelect
          label="Chapter" required value={effectiveChapter} options={chapters}
          onChange={(v) => { setChapter(v); setTopic(''); }}
          placeholder="e.g. Kinematics"
        />
        <CreatableSelect
          label="Topic" value={effectiveTopic} options={topics}
          onChange={setTopic} placeholder="e.g. Projectile Motion"
        />
        <Field label="Difficulty">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Question Type">
          <Select value="MCQ" aria-label="Question type"><option>MCQ</option></Select>
        </Field>
      </div>
      {(errors.subject || errors.chapter) && (
        <p className="text-[11px] font-medium text-rose-600">{errors.subject ?? errors.chapter}</p>
      )}

      <Field label="Question Text" required error={errors.text}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="A particle starts from rest and moves with a constant acceleration of 4 m/s²…" />
      </Field>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink-700">Options <span className="text-rose-500">*</span></p>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnswer(i)}
                aria-pressed={answer === i}
                aria-label={`Mark option ${OPTION_KEYS[i]} as correct`}
                title="Mark as correct answer"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-xs font-bold transition ${
                  answer === i ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-ink-300 text-ink-500 hover:border-brand-300'
                }`}
              >
                {OPTION_KEYS[i]}
              </button>
              <Input value={opt} onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))} placeholder={`Option ${OPTION_KEYS[i]}`} />
            </div>
          ))}
        </div>
        {errors.options && <p className="mt-1 text-[11px] font-medium text-rose-600">{errors.options}</p>}
        <p className="mt-1.5 text-[11px] text-ink-400">Click a letter to mark it as correct. Current answer: <b className="text-emerald-600">{OPTION_KEYS[answer]}</b></p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Marks"><Input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} min={1} /></Field>
        <Field label="Negative Marks"><Input type="number" value={negative} onChange={(e) => setNegative(e.target.value)} min={0} /></Field>
        <Field label="Current Status"><Input value={initial ? initial.status : 'New question'} readOnly className="bg-ink-50" /></Field>
      </div>

      <Field label="Explanation" required error={errors.explanation}>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explain the concept and the steps to the answer." />
      </Field>

      <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="outline" loading={busy} onClick={submit(false)}>Save Draft</Button>
        <Button type="button" loading={busy} onClick={submit(true)} icon="check">Publish Question</Button>
      </div>
    </form>
  );
}

/* ========================== Question Manager ========================== */

export function QuestionManager({ scope, authorId }: { scope: 'faculty' | 'admin'; authorId: string }) {
  const db = useDB();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState<Exam | 'All'>('All');
  const [subject, setSubject] = useState('All');
  const [chapter, setChapter] = useState('All');
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>('All');
  const [status, setStatus] = useState<QuestionStatus | 'All'>('All');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Question | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkPublish, setBulkPublish] = useState<'publish' | 'unpublish' | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 8;

  const activeFilters = [exam, subject, chapter, difficulty, status].filter((f) => f !== 'All').length;

  const clearFilters = () => {
    setExam('All'); setSubject('All'); setChapter('All');
    setDifficulty('All'); setStatus('All'); setPage(1);
  };

  const all = useMemo(
    () => questionService.list({ search, exam, subject, chapter, difficulty, status }),
    [search, exam, subject, chapter, difficulty, status, db.questions],
  );

  const subjects = exam === 'All'
    ? [...new Set(db.questions.map((q) => q.subject))].sort()
    : curriculumService.subjects(exam);
  const chapters = exam === 'All' || subject === 'All'
    ? [...new Set(db.questions.filter((q) => subject === 'All' || q.subject === subject).map((q) => q.chapter))].sort()
    : curriculumService.chapters(exam, subject);

  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<Question>[] = [
    { key: 'id', header: 'ID', className: 'hidden xl:table-cell', render: (q) => <span className="font-mono text-[11px] text-ink-500">{q.id}</span> },
    {
      key: 'text', header: 'Question',
      render: (q) => (
        <div className="max-w-md">
          <p className="truncate text-xs font-medium text-ink-900">{q.text}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">{q.chapter} · {q.topic}</p>
        </div>
      ),
    },
    { key: 'exam', header: 'Exam', render: (q) => <Badge tone="neutral">{q.exam}</Badge> },
    { key: 'subject', header: 'Subject', className: 'hidden md:table-cell', render: (q) => <span className="text-xs">{q.subject}</span> },
    { key: 'difficulty', header: 'Difficulty', render: (q) => <Badge tone={statusTone(q.difficulty)}>{q.difficulty}</Badge> },
    { key: 'status', header: 'Status', render: (q) => <Badge tone={statusTone(q.status)} dot>{q.status}</Badge> },
    {
      key: 'actions', header: 'Actions', headerClassName: 'text-right', className: 'text-right',
      render: (q) => (
        <div className="flex justify-end gap-1">
          <button type="button" aria-label="Preview question" title="Preview" onClick={() => setPreview(q)} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-brand-600"><Icon name="eye" size={15} /></button>
          <button type="button" aria-label="Edit question" title="Edit" onClick={() => setEditing(q)} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-brand-600"><Icon name="edit" size={15} /></button>
          {q.status === 'Published' ? (
            <button type="button" aria-label="Unpublish question" title="Unpublish" onClick={() => { questionService.setStatus(q.id, 'Draft'); toast.info('Question unpublished', `${q.id} moved to Draft.`); }} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-amber-600"><Icon name="xCircle" size={15} /></button>
          ) : (
            <button type="button" aria-label="Publish question" title="Publish" onClick={() => { questionService.setStatus(q.id, 'Published'); toast.success('Question published ✓', 'Students can now see it in practice.'); }} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-emerald-600"><Icon name="checkCircle" size={15} /></button>
          )}
          <button type="button" aria-label="Delete question" title="Delete" onClick={() => setDeleting(q)} className="rounded-lg p-1.5 text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"><Icon name="trash" size={15} /></button>
        </div>
      ),
    },
  ];

  const applyBulkStatus = () => {
    if (!bulkPublish) return;
    const next: QuestionStatus = bulkPublish === 'publish' ? 'Published' : 'Draft';
    all.forEach((q) => questionService.setStatus(q.id, next));
    toast.success(
      bulkPublish === 'publish' ? `${all.length} questions published ✓` : `${all.length} questions unpublished`,
      'Applied to every question matching the current filters.',
    );
    setBulkPublish(null);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader
          title="Question Bank"
          subtitle={`${all.length} question${all.length === 1 ? '' : 's'} match your filters`}
          icon="layers"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon="download" onClick={() => setUploading(true)}>Bulk Upload</Button>
              <Button size="sm" icon="plus" onClick={() => setCreating(true)}>Create Question</Button>
            </div>
          }
        />
        {/* Search + collapsible filters keep the toolbar light by default */}
        <div className="border-b border-ink-200 bg-ink-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search questions…" className="min-w-48 flex-1" />
            <Button
              size="md"
              variant={activeFilters > 0 ? 'subtle' : 'outline'}
              icon="filter"
              onClick={() => setShowFilters((f) => !f)}
              aria-expanded={showFilters}
            >
              Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>
            {activeFilters > 0 && (
              <Button size="md" variant="ghost" icon="x" onClick={clearFilters}>Clear</Button>
            )}
            <Button size="md" variant="outline" icon="download" disabled={all.length === 0}
              onClick={() => { downloadFile(`astra-prep-questions-${Date.now()}.csv`, importService.exportQuestions(all)); toast.success('Export ready ✓', `${all.length} questions downloaded as CSV.`); }}>
              Export
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={exam} onChange={(e) => { setExam(e.target.value as Exam | 'All'); setSubject('All'); setChapter('All'); setPage(1); }} aria-label="Filter by exam">
                <option value="All">All Exams</option>{EXAMS.map((x) => <option key={x}>{x}</option>)}
              </Select>
              <Select value={subject} onChange={(e) => { setSubject(e.target.value); setChapter('All'); setPage(1); }} aria-label="Filter by subject">
                <option value="All">All Subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}
              </Select>
              <Select value={chapter} onChange={(e) => { setChapter(e.target.value); setPage(1); }} aria-label="Filter by chapter">
                <option value="All">All Chapters</option>{chapters.map((c) => <option key={c}>{c}</option>)}
              </Select>
              <Select value={difficulty} onChange={(e) => { setDifficulty(e.target.value as Difficulty | 'All'); setPage(1); }} aria-label="Filter by difficulty">
                <option value="All">All Levels</option>{DIFFS.map((d) => <option key={d}>{d}</option>)}
              </Select>
              <Select value={status} onChange={(e) => { setStatus(e.target.value as QuestionStatus | 'All'); setPage(1); }} aria-label="Filter by status">
                <option value="All">All Status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
          )}

          {/* Bulk actions only surface once a filter narrows the set */}
          {activeFilters > 0 && all.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
              <span className="text-[11px] font-semibold text-brand-800">{all.length} question{all.length === 1 ? '' : 's'} selected by these filters</span>
              <Button size="sm" variant="ghost" icon="checkCircle" onClick={() => setBulkPublish('publish')}>Publish all</Button>
              <Button size="sm" variant="ghost" icon="xCircle" onClick={() => setBulkPublish('unpublish')}>Unpublish all</Button>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          keyFn={(q) => q.id}
          empty={<EmptyState icon="layers" title="No questions found" message="No questions match your search. Adjust the filters, create one, or bulk upload a CSV." action={<div className="flex gap-2"><Button size="sm" variant="outline" icon="download" onClick={() => setUploading(true)}>Bulk Upload</Button><Button size="sm" icon="plus" onClick={() => setCreating(true)}>Create Question</Button></div>} />}
        />
        <Pagination page={page} totalPages={totalPages} onPage={setPage} totalItems={all.length} pageSize={PAGE_SIZE} />
      </Card>

      <BulkUpload open={uploading} onClose={() => setUploading(false)} createdBy={authorId} onDone={() => setPage(1)} />

      {/* Preview */}
      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="Question Preview" size="lg" icon="eye">
        {preview && (
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="neutral">{preview.exam}</Badge>
              <Badge tone="neutral">{preview.subject}</Badge>
              <Badge tone="neutral">{preview.chapter}</Badge>
              <Badge tone={statusTone(preview.difficulty)}>{preview.difficulty}</Badge>
              <Badge tone={statusTone(preview.status)} dot>{preview.status}</Badge>
            </div>
            <p className="text-sm font-medium text-ink-900">{preview.text}</p>
            <ul className="mt-3 space-y-2">
              {preview.options.map((o, i) => (
                <li key={i} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs ${i === Number(preview.answer) ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-800' : 'border-ink-200 text-ink-700'}`}>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-bold shadow-sm">{OPTION_KEYS[i]}</span>{o}
                  {i === Number(preview.answer) && <Icon name="check" size={13} className="ml-auto" />}
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg bg-ink-50 px-3 py-2.5">
              <p className="text-[11px] font-bold text-ink-900">Explanation</p>
              <p className="mt-1 text-xs text-ink-700">{preview.explanation}</p>
            </div>
            <p className="mt-3 text-[11px] text-ink-400">Marks +{preview.marks} / −{preview.negative} · Used {preview.usage} times · Created {formatDate(preview.createdAt)}</p>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Question" size="xl" icon="edit">
        {editing && (
          <QuestionForm
            initial={editing}
            authorId={authorId}
            onCancel={() => setEditing(null)}
            onSave={(payload) => {
              questionService.update(editing.id, payload);
              toast.success('Question saved ✓', 'Changes are live for students.');
              setEditing(null);
            }}
          />
        )}
      </Modal>

      {/* Create */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Create Question" size="xl" icon="plus">
        <QuestionForm
          authorId={authorId}
          onCancel={() => setCreating(false)}
          onSave={(payload) => {
            const created = questionService.create({ ...payload, createdBy: authorId });
            toast.success(
              payload.status === 'Published' ? 'Question published ✓' : 'Draft saved ✓',
              `${created.id} · ${created.chapter} — ${payload.status === 'Published' ? 'students can attempt it now' : 'publish it when ready'}`,
            );
            setCreating(false);
          }}
        />
      </Modal>

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            questionService.remove(deleting.id);
            toast.success('Question deleted', `${deleting.id} was removed from the bank.`);
          }
          setDeleting(null);
        }}
        title="Delete Question?"
        message="This action cannot be undone. The question will also be removed from any test that contains it."
        confirmLabel="Delete"
      />

      <ConfirmModal
        open={Boolean(bulkPublish)}
        onClose={() => setBulkPublish(null)}
        onConfirm={applyBulkStatus}
        tone={bulkPublish === 'publish' ? 'primary' : 'danger'}
        title={bulkPublish === 'publish' ? `Publish ${all.length} questions?` : `Unpublish ${all.length} questions?`}
        message={bulkPublish === 'publish'
          ? 'Every question matching the current filters becomes visible to students immediately.'
          : 'Every question matching the current filters moves to Draft and disappears from student practice.'}
        confirmLabel={bulkPublish === 'publish' ? 'Publish All' : 'Unpublish All'}
      />

      <p className="mt-3 text-center text-[11px] text-ink-400">
        Scope: {scope === 'admin' ? 'platform-wide question bank' : 'faculty workspace'} · all changes save instantly to the local demo database
      </p>
    </>
  );
}

import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useSession } from '../../lib/session';
import { curriculumService } from '../../services/curriculumService';
import { questionService } from '../../services/questionService';
import { useDB } from '../../services/db';
import type { Exam } from '../../lib/types';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmModal, EmptyState, Field, Input, Modal, Select, StatCard } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';
import { EXAMS } from '../../data/taxonomy';

type AddKind = 'subject' | 'chapter' | 'topic';

/**
 * Curriculum manager — lets Admin and Faculty build the entire syllabus tree
 * (subjects → chapters → topics) without touching any source file.
 */
export default function Curriculum() {
  const { user } = useSession();
  const db = useDB();
  const toast = useToast();
  const [exam, setExam] = useState<Exam>('JEE');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [adding, setAdding] = useState<AddKind | null>(null);
  const [draft, setDraft] = useState('');
  const [removing, setRemoving] = useState<{ id: string; label: string } | null>(null);

  const subjects = useMemo(() => curriculumService.subjects(exam), [exam, db.curriculum, db.questions]);
  const activeSubject = subject || subjects[0] || '';
  const chapters = useMemo(() => curriculumService.chapters(exam, activeSubject), [exam, activeSubject, db.curriculum, db.questions]);
  const activeChapter = chapter || chapters[0] || '';
  const topics = useMemo(() => curriculumService.topics(exam, activeSubject, activeChapter), [exam, activeSubject, activeChapter, db.curriculum, db.questions]);
  const custom = db.curriculum;

  if (!user || user.role === 'student') return null;
  const role = user.role as 'faculty' | 'admin';

  const submitAdd = () => {
    const value = draft.trim();
    if (!value) return;
    const payload =
      adding === 'subject' ? { exam, subject: value }
        : adding === 'chapter' ? { exam, subject: activeSubject, chapter: value }
          : { exam, subject: activeSubject, chapter: activeChapter, topic: value };

    const ok = curriculumService.add(payload, user.id);
    if (!ok) {
      toast.error('Already exists', `"${value}" is already part of this ${adding}.`);
      return;
    }
    toast.success(`${adding![0].toUpperCase()}${adding!.slice(1)} added ✓`, `"${value}" is now available when creating questions and tests.`);
    if (adding === 'subject') setSubject(value);
    if (adding === 'chapter') setChapter(value);
    setDraft('');
    setAdding(null);
  };

  const Column = ({
    title, items, active, onSelect, onAdd, countFor, disabled,
  }: {
    title: string; items: string[]; active: string; onSelect: (v: string) => void;
    onAdd: () => void; countFor: (v: string) => number; disabled?: boolean;
  }) => (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader
        title={title}
        subtitle={`${items.length} entries`}
        action={<Button size="sm" variant="outline" icon="plus" onClick={onAdd} disabled={disabled}>Add</Button>}
      />
      <div className="max-h-96 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <EmptyState icon="layers" title={`No ${title.toLowerCase()} yet`} message={disabled ? 'Select a parent item first.' : 'Add the first one to get started.'} />
        ) : (
          <ul className="divide-y divide-ink-100">
            {items.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-current={active === item ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition',
                    active === item ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-50',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{item}</span>
                  <Badge tone="neutral">{countFor(item)}q</Badge>
                  {active === item && <Icon name="chevronRight" size={13} className="text-brand-500" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );

  return (
    <AppShell
      role={role}
      title="Curriculum"
      subtitle="Build the syllabus — subjects, chapters and topics — directly from the app"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subjects" value={subjects.length} icon="layers" tone="brand" hint={exam} />
        <StatCard label="Chapters" value={chapters.length} icon="bookOpen" tone="info" hint={activeSubject || '—'} />
        <StatCard label="Topics" value={topics.length} icon="pin" tone="warning" hint={activeChapter || '—'} />
        <StatCard label="Custom Entries" value={custom.length} icon="plus" tone="success" hint="Added from inside the app" />
      </div>

      <Card className="mt-6">
        <CardBody className="flex flex-wrap items-end gap-4">
          <Field label="Exam" className="w-48">
            <Select value={exam} onChange={(e) => { setExam(e.target.value as Exam); setSubject(''); setChapter(''); }}>
              {EXAMS.map((x) => <option key={x}>{x}</option>)}
            </Select>
          </Field>
          <p className="flex-1 text-xs text-ink-500">
            Anything you add here becomes instantly selectable in <b>Create Question</b>, <b>Bulk Upload</b>,
            <b> Test Builder</b> and the student <b>Practice</b> selector. No code changes, no deployment.
          </p>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Column
          title="Subjects"
          items={subjects}
          active={activeSubject}
          onSelect={(v) => { setSubject(v); setChapter(''); }}
          onAdd={() => { setAdding('subject'); setDraft(''); }}
          countFor={(v) => curriculumService.counts(exam, v)}
        />
        <Column
          title="Chapters"
          items={chapters}
          active={activeChapter}
          onSelect={setChapter}
          onAdd={() => { setAdding('chapter'); setDraft(''); }}
          countFor={(v) => curriculumService.counts(exam, activeSubject, v)}
          disabled={!activeSubject}
        />
        <Column
          title="Topics"
          items={topics}
          active=""
          onSelect={() => {}}
          onAdd={() => { setAdding('topic'); setDraft(''); }}
          countFor={(v) => questionService.list({ exam, subject: activeSubject, chapter: activeChapter }).filter((q) => q.topic === v).length}
          disabled={!activeChapter}
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Custom Entries" subtitle="Items added through the app (built-in syllabus cannot be removed)" icon="plus" />
        {custom.length === 0 ? (
          <EmptyState icon="layers" title="No custom entries yet" message="Use the Add buttons above to extend the syllabus. Bulk uploads also register new entries automatically." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {custom.slice(0, 30).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <Badge tone="brand">{c.exam}</Badge>
                <span className="text-xs text-ink-700">
                  {c.subject}
                  {c.chapter && <> <span className="text-ink-300">›</span> {c.chapter}</>}
                  {c.topic && <> <span className="text-ink-300">›</span> {c.topic}</>}
                </span>
                <Badge tone="neutral">{c.topic ? 'Topic' : c.chapter ? 'Chapter' : 'Subject'}</Badge>
                <span className="ml-auto text-[11px] text-ink-400">{c.createdAt}</span>
                <Button
                  size="sm" variant="ghost" icon="trash"
                  aria-label="Remove custom entry"
                  onClick={() => setRemoving({ id: c.id, label: c.topic ?? c.chapter ?? c.subject })}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(adding)}
        onClose={() => { setAdding(null); setDraft(''); }}
        title={`Add ${adding ?? ''}`}
        description={
          adding === 'subject' ? `A new subject under ${exam}.`
            : adding === 'chapter' ? `A new chapter under ${exam} › ${activeSubject}.`
              : `A new topic under ${exam} › ${activeSubject} › ${activeChapter}.`
        }
        size="sm"
        icon="plus"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAdding(null); setDraft(''); }}>Cancel</Button>
            <Button icon="check" onClick={submitAdd} disabled={!draft.trim()}>Add</Button>
          </>
        }
      >
        <Field label={`${adding ?? ''} name`} required>
          <Input
            data-autofocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAdd(); } }}
            placeholder={adding === 'subject' ? 'e.g. Computer Science' : adding === 'chapter' ? 'e.g. Rotational Dynamics' : 'e.g. Torque and Angular Momentum'}
          />
        </Field>
      </Modal>

      <ConfirmModal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            curriculumService.remove(removing.id);
            toast.success('Entry removed', `"${removing.label}" was removed from the custom curriculum.`);
          }
          setRemoving(null);
        }}
        title="Remove curriculum entry?"
        message="Existing questions keep their tags and stay searchable. Only the custom syllabus entry is removed."
        confirmLabel="Remove"
      />
    </AppShell>
  );
}

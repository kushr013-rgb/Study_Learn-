import { useRef, useState, type DragEvent } from 'react';
import { api } from '../services/apiClient';
import { USE_API } from '../services/config';
import { mutate } from '../services/db';
import { Badge, Button, Field, Input, Modal, Select, Tabs, Textarea } from './ui';
import { Icon } from './ui/Icons';
import { useToast } from './ui/Toast';
import { cn } from '../utils/cn';
import type { Question, QuestionStatus } from '../lib/types';
import { EXAMS, SUBJECTS } from '../data/taxonomy';

interface ExtractedItem {
  id?: string;
  text: string;
  options: string[];
  answer: number | string;
  marks: number;
  negative: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'MCQ' | 'Numerical';
  chapter?: string;
  topic?: string;
  explanation?: string;
  valid?: boolean;
}

export function BulkUpload({
  open,
  onClose,
  createdBy,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  createdBy: string;
  onDone?: (count: number) => void;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  // Metadata fields per requirement 6
  const [exam, setExam] = useState<string>('JEE');
  const [subject, setSubject] = useState<string>('Physics');
  const [course, setCourse] = useState('Standard Academic');
  const [semester, setSemester] = useState('1');
  const [assessmentType, setAssessmentType] = useState('Chapter Test');
  const [targetClass, setTargetClass] = useState('Class 12');
  const [status, setStatus] = useState<QuestionStatus>('Published');

  // Preview & Approval State
  const [paperId, setPaperId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExtractedItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const reset = () => {
    setSelectedFile(null);
    setFileName('');
    setPasted('');
    setPaperId(null);
    setQuestions([]);
    setEditingIdx(null);
    setDragging(false);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large', 'Please keep uploads under 25 MB.');
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const validExts = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.csv', '.json'];
    if (!validExts.includes(ext)) {
      toast.error('Unsupported file format', 'Please upload a PDF (.pdf), Excel (.xlsx/.xls), or Word (.docx) document.');
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Upload and Parse document on backend
  const uploadAndParse = async () => {
    if (mode === 'upload' && !selectedFile) {
      toast.error('No file chosen', 'Please pick a PDF, Excel, or Word file.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('subject', subject);
        formData.append('course', course);
        formData.append('semester', semester);
        formData.append('assessmentType', assessmentType);
        formData.append('targetClass', targetClass);

        const res = await api.upload<{
          paper: { _id: string; extractedQuestions: ExtractedItem[] };
          parseSummary: { totalParsed: number; validCount: number; warnings: string[] };
        }>('/question-papers/upload', formData);

        if (res && res.paper) {
          setPaperId(res.paper._id);
          const parsed = res.paper.extractedQuestions || [];
          setQuestions(parsed);
          toast.success(
            `Extracted ${parsed.length} questions ✓`,
            `Review and approve questions below before publishing.`
          );
        }
      } else if (mode === 'paste' && pasted.trim()) {
        // Fallback or text parsing
        const lines = pasted.split('\n').filter(Boolean);
        const parsed: ExtractedItem[] = [];
        let curr: Partial<ExtractedItem> = {};
        for (const line of lines) {
          if (/^\d+[\.:\)]/.test(line.trim())) {
            if (curr.text) parsed.push(curr as ExtractedItem);
            curr = {
              text: line.trim(),
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              answer: 0,
              marks: 4,
              negative: 1,
              difficulty: 'Medium',
              type: 'MCQ',
              valid: true,
            };
          }
        }
        if (curr.text) parsed.push(curr as ExtractedItem);
        setQuestions(parsed);
        toast.info(`${parsed.length} questions parsed`, 'Review questions before committing.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload and parsing failed.';
      toast.error('Parsing failed', msg);
    } finally {
      setBusy(false);
    }
  };

  // Approve questions and persist to MongoDB Question collection
  const approveAndCommit = async () => {
    if (questions.length === 0) return;
    setBusy(true);

    try {
      // Also sync to local database cache
      const approvedDocs: Question[] = questions.map((q, idx) => ({
        id: `Q-${Date.now()}-${idx + 1}`,
        exam: exam as Question['exam'],
        subject,
        chapter: q.chapter || `${subject} Chapter`,
        topic: q.topic || 'Concept Test',
        difficulty: q.difficulty || 'Medium',
        type: q.type || 'MCQ',
        text: q.text,
        options: q.options && q.options.length === 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: q.answer,
        marks: q.marks || 4,
        negative: q.negative || 1,
        explanation: q.explanation || 'Answer verified from source paper.',
        status,
        createdBy,
        createdAt: new Date().toISOString().slice(0, 10),
        usage: 0,
      }));

      if (paperId) {
        await api.post(`/question-papers/${paperId}/approve`, {
          questions,
          exam,
          subject,
          publish: status === 'Published',
        });
      } else if (USE_API) {
        await Promise.all(approvedDocs.map(({ id: _id, ...question }) => api.post('/questions', question)));
      }

      mutate((d) => {
        approvedDocs.forEach((q) => d.questions.unshift(q));
      });

      toast.success(
        `Imported ${questions.length} questions ✓`,
        status === 'Published' ? 'Questions are live for students now.' : 'Saved as drafts in question bank.'
      );

      onDone?.(questions.length);
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed.';
      toast.error('Error saving questions', msg);
    } finally {
      setBusy(false);
    }
  };

  const updateQuestionItem = (idx: number, patch: Partial<ExtractedItem>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const removeQuestionItem = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Upload Question Paper (PDF, Excel, Word)"
      description="Upload documents to extract, preview, edit, and approve questions directly into the database."
      size="xl"
      icon="download"
      footer={
        questions.length > 0 ? (
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" onClick={reset}>Start over</Button>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-600" htmlFor="import-status">Publish status</label>
              <Select id="import-status" value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)} className="h-9 w-32">
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </Select>
              <Button icon="check" loading={busy} onClick={approveAndCommit}>
                Approve &amp; Save {questions.length} Questions
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full justify-between">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button icon="layers" loading={busy} disabled={!selectedFile && !pasted.trim()} onClick={uploadAndParse}>
              Extract Questions
            </Button>
          </div>
        )
      }
    >
      {questions.length === 0 ? (
        <div className="space-y-4">
          {/* Metadata selectors */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Target Exam">
              <Select value={exam} onChange={(e) => setExam(e.target.value)}>
                {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                {(SUBJECTS[exam as keyof typeof SUBJECTS] || ['Physics', 'Chemistry', 'Mathematics']).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Class / Batch">
              <Select value={targetClass} onChange={(e) => setTargetClass(e.target.value)}>
                {['Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper'].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Assessment Type">
              <Select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}>
                {['Chapter Test', 'Topic Test', 'Subject Test', 'Full Mock Test'].map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Course / Program">
              <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. JEE Main / NEET UG" />
            </Field>
            <Field label="Semester / Term">
              <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
                {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Tabs
            tabs={[
              { id: 'upload', label: 'Document File (PDF / Word / Excel)' },
              { id: 'paste', label: 'Paste Text / Markdown' },
            ]}
            active={mode}
            onChange={(m) => setMode(m as 'upload' | 'paste')}
          />

          {mode === 'upload' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'rounded-2xl border-2 border-dashed px-6 py-9 text-center transition',
                dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-300 bg-ink-50',
              )}
            >
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <Icon name="download" size={22} />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-900">Drag &amp; drop question paper document</p>
              <p className="mt-1 text-xs text-ink-500">
                PDF (.pdf) · Excel (.xlsx, .xls) · Word (.docx) · up to 25 MB
              </p>
              {fileName && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
                  <Icon name="checkCircle" size={14} /> {fileName}
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" size="sm" icon="plus" onClick={() => fileInput.current?.click()}>
                  Browse File
                </Button>
              </div>
            </div>
          ) : (
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste formatted questions (e.g. 1. What is...? A) ... B) ... C) ... D) ... Ans: B)"
              className="min-h-44 font-mono text-xs"
            />
          )}
        </div>
      ) : (
        /* Extraction Preview and Edit Table */
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3 text-xs text-brand-900">
            <div>
              <span className="font-bold">{questions.length} questions extracted</span> from {fileName || 'input'}.
              <p className="text-[11px] text-brand-700">Review, edit, or remove items before approving to database.</p>
            </div>
            <Badge tone="success" dot>Extraction Ready</Badge>
          </div>

          <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div key={idx} className="rounded-xl border border-ink-200 bg-white p-3.5 shadow-xs transition hover:border-brand-200">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-700">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {editingIdx === idx ? (
                      <div className="space-y-2">
                        <Input
                          value={q.text}
                          onChange={(e) => updateQuestionItem(idx, { text: e.target.value })}
                          className="text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold">{String.fromCharCode(65 + oIdx)}:</span>
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const opts = [...q.options];
                                  opts[oIdx] = e.target.value;
                                  updateQuestionItem(idx, { options: opts });
                                }}
                                className="h-7 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <label className="flex items-center gap-1">
                            Correct:
                            <Select
                              value={String(q.answer)}
                              onChange={(e) => updateQuestionItem(idx, { answer: Number(e.target.value) })}
                              className="h-7 w-20"
                            >
                              <option value="0">A</option>
                              <option value="1">B</option>
                              <option value="2">C</option>
                              <option value="3">D</option>
                            </Select>
                          </label>
                          <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)}>Done</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-ink-900">{q.text}</p>
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-ink-600">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={cn(
                                'rounded px-2 py-0.5',
                                Number(q.answer) === oIdx ? 'bg-emerald-50 font-bold text-emerald-800' : 'bg-ink-50'
                              )}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}>
                      {editingIdx === idx ? 'Close' : 'Edit'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeQuestionItem(idx)}>
                      <Icon name="x" size={14} className="text-rose-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

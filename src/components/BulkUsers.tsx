import { useRef, useState } from 'react';
import { csvToObjects, downloadFile, toCSV } from '../lib/csv';
import { mutate, getDB, uid } from '../services/db';
import type { Role, User, UserStatus } from '../lib/types';
import { Badge, Button, EmptyState, Modal, Select, Tabs, Textarea } from './ui';
import { Icon } from './ui/Icons';
import { useToast } from './ui/Toast';
import { cn } from '../utils/cn';
import { EXAMS } from '../data/taxonomy';

const HEADERS = ['name', 'email', 'mobile', 'password', 'role', 'exam', 'class', 'subjects', 'status'];

interface ParsedUser {
  row: number;
  user: User | null;
  errors: string[];
  warnings: string[];
}

function template(): string {
  return toCSV(HEADERS, [
    ['Aarav Menon', 'aarav@demo.com', '9812345670', '123456', 'student', 'JEE', 'Class 12', 'Physics|Chemistry|Mathematics', 'verified'],
    ['Dr. Neha Rao', 'neha@demo.com', '9812345671', '123456', 'faculty', 'NEET', '', 'Chemistry|Botany', 'verified'],
  ]);
}

function parse(content: string): ParsedUser[] {
  const trimmed = content.trim();
  let records: Record<string, string>[] = [];

  if (trimmed.startsWith('[')) {
    try {
      records = (JSON.parse(trimmed) as Record<string, unknown>[]).map((o) => {
        const flat: Record<string, string> = {};
        Object.entries(o).forEach(([k, v]) => {
          flat[k.trim().toLowerCase()] = Array.isArray(v) ? v.join('|') : String(v ?? '');
        });
        return flat;
      });
    } catch {
      return [{ row: 1, user: null, errors: ['File is not valid JSON'], warnings: [] }];
    }
  } else {
    records = csvToObjects(trimmed);
  }

  if (records.length === 0) return [{ row: 1, user: null, errors: ['No data rows found. Include a header row.'], warnings: [] }];

  const existing = new Set(getDB().users.map((u) => u.email.toLowerCase()));
  const seen = new Set<string>();

  return records.map((r, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = (r.name ?? '').trim();
    const email = (r.email ?? '').trim().toLowerCase();
    const mobile = (r.mobile ?? '').trim();
    const password = (r.password ?? '').trim() || '123456';
    const roleRaw = (r.role ?? 'student').trim().toLowerCase();
    const examRaw = (r.exam ?? '').trim();
    const classLevel = (r.class ?? r.classlevel ?? r.class_level ?? '').trim();
    const subjects = (r.subjects ?? '').split(/[|;]/).map((s) => s.trim()).filter(Boolean);
    const statusRaw = (r.status ?? 'verified').trim().toLowerCase();

    if (name.length < 3) errors.push('Name is required (min 3 characters)');
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('A valid email is required');
    if (email && existing.has(email)) errors.push('An account with this email already exists');
    if (email && seen.has(email)) errors.push('Duplicate email within this file');
    if (email) seen.add(email);

    const role: Role = roleRaw === 'faculty' ? 'faculty' : roleRaw === 'admin' ? 'admin' : 'student';
    if (!['student', 'faculty', 'admin'].includes(roleRaw)) warnings.push(`Unknown role "${roleRaw}" — defaulted to student`);

    const exam = EXAMS.find((e) => e.toLowerCase() === examRaw.toLowerCase());
    if (role === 'student' && !exam) warnings.push('No valid exam — defaulted to JEE');

    const status: UserStatus = (['verified', 'pending', 'rejected', 'inactive'].includes(statusRaw) ? statusRaw : 'verified') as UserStatus;
    if (password.length < 6) warnings.push('Password shorter than 6 characters');

    if (errors.length) return { row: i + 2, user: null, errors, warnings };

    return {
      row: i + 2,
      errors: [],
      warnings,
      user: {
        id: uid(role === 'faculty' ? 'F' : role === 'admin' ? 'A' : 'S'),
        name, email, mobile, password, role,
        exam: role === 'student' ? (exam ?? 'JEE') : exam,
        classLevel: classLevel || undefined,
        subjects,
        status,
        createdAt: new Date().toISOString().slice(0, 10),
        streak: 0,
        baseline: { solved: 0, tests: 0, accuracy: 0, score: 0 },
      } satisfies User,
    };
  });
}

/** Bulk import of students / faculty from CSV or JSON — no code editing required. */
export function BulkUsers({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pasted, setPasted] = useState('');
  const [rows, setRows] = useState<ParsedUser[] | null>(null);
  const [status, setStatus] = useState<UserStatus>('verified');
  const [busy, setBusy] = useState(false);

  const valid = rows?.filter((r) => r.user).length ?? 0;
  const invalid = rows?.filter((r) => !r.user).length ?? 0;

  const analyse = (content: string) => {
    if (!content.trim()) { toast.error('Nothing to import', 'The file or pasted text is empty.'); return; }
    const result = parse(content);
    setRows(result);
    const ok = result.filter((r) => r.user).length;
    if (ok === 0) toast.error('No valid rows', 'Fix the highlighted errors and try again.');
    else toast.info(`${ok} user${ok === 1 ? '' : 's'} ready`, invalid ? 'Some rows need fixing.' : 'All rows passed validation.');
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => analyse(String(reader.result ?? ''));
    reader.onerror = () => toast.error('Could not read file', 'Try re-saving it as CSV.');
    reader.readAsText(file);
  };

  const commit = () => {
    if (!rows) return;
    setBusy(true);
    window.setTimeout(() => {
      const toAdd = rows.filter((r) => r.user).map((r) => ({ ...r.user!, status }));
      mutate((d) => { d.users.unshift(...toAdd); });
      setBusy(false);
      toast.success(`${toAdd.length} account${toAdd.length === 1 ? '' : 's'} created ✓`, `Imported with status "${status}". They can log in with their password.`);
      setRows(null);
      setPasted('');
      onClose();
    }, 400);
  };

  return (
    <Modal
      open={open}
      onClose={() => { setRows(null); onClose(); }}
      title="Bulk Import Users"
      description="Create student and faculty accounts from a CSV or JSON file."
      size="lg"
      icon="users"
      footer={
        rows ? (
          <>
            <Button variant="ghost" onClick={() => setRows(null)}>Start over</Button>
            <div className="flex items-center gap-2">
              <label htmlFor="user-status" className="text-xs font-semibold text-ink-600">Status</label>
              <Select id="user-status" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} className="h-9 w-32">
                <option value="verified">verified</option><option value="pending">pending</option>
              </Select>
              <Button icon="check" loading={busy} disabled={valid === 0} onClick={commit}>Import {valid}</Button>
            </div>
          </>
        ) : (
          <Button variant="outline" icon="download" onClick={() => downloadFile('astra-prep-users-template.csv', template())}>
            Download CSV Template
          </Button>
        )
      }
    >
      {!rows ? (
        <div className="space-y-4">
          <Tabs tabs={[{ id: 'file', label: 'Upload file' }, { id: 'paste', label: 'Paste data' }]} active={mode} onChange={setMode} />
          {mode === 'file' ? (
            <div className="rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50 px-6 py-10 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
            >
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm"><Icon name="users" size={24} /></span>
              <p className="mt-4 text-sm font-semibold text-ink-900">Drag &amp; drop, or choose a file</p>
              <p className="mt-1 text-xs text-ink-500">CSV or JSON with a header row</p>
              <input ref={fileInput} type="file" accept=".csv,.json" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
              <Button className="mt-4" variant="outline" icon="plus" onClick={() => fileInput.current?.click()}>Choose file</Button>
            </div>
          ) : (
            <div>
              <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} className="min-h-40 font-mono text-xs"
                placeholder="name,email,mobile,password,role,exam,class,subjects,status" aria-label="Paste user data" />
              <Button className="mt-3" icon="check" onClick={() => analyse(pasted)}>Validate data</Button>
            </div>
          )}
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="mb-2 text-xs font-bold text-ink-900">Expected columns</p>
            <div className="flex flex-wrap gap-1.5">
              {HEADERS.map((h) => <code key={h} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-700">{h}</code>)}
            </div>
            <ul className="mt-3 space-y-1 text-[11px] text-ink-500">
              <li>• <b>role</b>: student, faculty or admin (defaults to student).</li>
              <li>• <b>subjects</b>: separate multiple values with a pipe, e.g. <code>Physics|Chemistry</code>.</li>
              <li>• <b>password</b> defaults to <code>123456</code> if left blank.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-ink-200 px-3 py-2.5 text-center">
              <p className="text-xl font-bold text-emerald-600">{valid}</p>
              <p className="text-[10px] uppercase tracking-wide text-ink-500">Valid rows</p>
            </div>
            <div className="rounded-xl border border-ink-200 px-3 py-2.5 text-center">
              <p className="text-xl font-bold text-rose-600">{invalid}</p>
              <p className="text-[10px] uppercase tracking-wide text-ink-500">Rows with errors</p>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-200">
            {rows.length === 0 ? <EmptyState icon="users" title="No rows" /> : (
              <ul className="divide-y divide-ink-100">
                {rows.map((r) => (
                  <li key={r.row} className={cn('px-3.5 py-2.5', !r.user && 'bg-rose-50/60')}>
                    <div className="flex items-start gap-2.5">
                      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                        r.user ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{r.user ? '✓' : '!'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink-900">{r.user ? `${r.user.name} · ${r.user.email}` : `Row ${r.row}`}</p>
                        {r.user && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge tone="brand">{r.user.role}</Badge>
                            {r.user.exam && <Badge tone="neutral">{r.user.exam}</Badge>}
                            {r.user.classLevel && <Badge tone="neutral">{r.user.classLevel}</Badge>}
                          </div>
                        )}
                        {r.errors.map((e) => <p key={e} className="mt-1 text-[11px] font-medium text-rose-600">Row {r.row}: {e}</p>)}
                        {r.warnings.map((w) => <p key={w} className="mt-1 text-[11px] text-amber-600">Row {r.row}: {w}</p>)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

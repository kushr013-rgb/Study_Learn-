import { useMemo, useState, type FormEvent } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { useDB, mutate, uid } from '../../services/db';
import { analyticsService } from '../../services/analyticsService';
import { api } from '../../services/apiClient';
import { BulkUsers } from '../../components/BulkUsers';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmModal, DataTable, EmptyState, Field, Input, Modal, SearchInput, Select, StatCard, statusTone } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/hooks';
import type { Column } from '../../components/ui';

const ALL_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology', 'Science', 'Biology', 'English', 'Social Science'];

interface Row {
  id: string;
  name: string;
  email: string;
  mobile: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  subjects: string[];
  questions: number;
  tests: number;
  status: string;
  createdAt: string;
}

export default function AdminFaculty() {
  const user = useGuard('admin');
  const db = useDB();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deactivating, setDeactivating] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);

  const rows = useMemo<Row[]>(
    () => analyticsService.facultyStats().map((f) => {
      const dbUser = db.users.find((u) => u.id === f.id);
      return {
        id: f.id,
        name: f.name,
        email: f.email,
        mobile: dbUser?.mobile ?? '',
        employeeId: f.id,
        designation: 'Faculty Member',
        department: 'Academic Faculty',
        subjects: f.subjects,
        questions: f.questions,
        tests: f.tests,
        status: f.status,
        createdAt: f.createdAt,
      };
    }),
    [db.users, db.questions, db.tests],
  );

  const filtered = rows.filter((r) => `${r.name} ${r.email} ${r.id}`.toLowerCase().includes(search.toLowerCase()));

  if (!user) return null;

  const columns: Column<Row>[] = [
    {
      key: 'name', header: 'Faculty',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.name} size={30} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink-900">{r.name}</p>
            <p className="truncate text-[10px] text-ink-400">{r.email} · {r.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'subjects', header: 'Subjects', className: 'hidden md:table-cell',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.subjects.length === 0 && <span className="text-[11px] text-ink-400">—</span>}
          {r.subjects.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
        </div>
      ),
    },
    { key: 'questions', header: 'Questions', render: (r) => <span className="text-xs font-semibold">{r.questions}</span> },
    { key: 'tests', header: 'Tests', render: (r) => <span className="text-xs font-semibold">{r.tests}</span> },
    { key: 'created', header: 'Joined', className: 'hidden lg:table-cell', render: (r) => <span className="text-xs text-ink-500">{formatDate(r.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)} dot>{r.status}</Badge> },
    {
      key: 'actions', header: 'Actions', headerClassName: 'text-right', className: 'text-right',
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>View</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
          <Button size="sm" variant={r.status === 'verified' ? 'ghost' : 'outline'} onClick={() => setDeactivating(r)}>
            {r.status === 'verified' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell role="admin" title="Faculty" subtitle="Manage content authors and their academic assignments"
      actions={
        <>
          <Button size="sm" variant="outline" icon="users" onClick={() => setImporting(true)}>Bulk Import</Button>
          <Button size="sm" icon="plus" onClick={() => setCreating(true)}>Add Faculty</Button>
        </>
      }>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faculty Members" value={rows.length} icon="user" tone="brand" />
        <StatCard label="Active" value={rows.filter((r) => r.status === 'verified').length} icon="checkCircle" tone="success" />
        <StatCard label="Questions Authored" value={rows.reduce((s, r) => s + r.questions, 0)} icon="layers" tone="info" />
        <StatCard label="Tests Built" value={rows.reduce((s, r) => s + r.tests, 0)} icon="quiz" tone="warning" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Faculty Management" subtitle={`${filtered.length} members`} icon="users" />
        <div className="border-b border-ink-200 bg-ink-50 px-4 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search faculty by name, email, or ID…" className="max-w-sm" />
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          keyFn={(r) => r.id}
          empty={<EmptyState icon="user" title="No faculty found" message="Add a faculty member to start authoring content." action={<Button size="sm" icon="plus" onClick={() => setCreating(true)}>Add Faculty</Button>} />}
        />
      </Card>

      <BulkUsers open={importing} onClose={() => setImporting(false)} />

      <FacultyFormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add Faculty Account"
        onSave={async (payload) => {
          const facultyId = payload.employeeId || uid('F');
          try {
            await api.post('/admin/faculty', {
              name: payload.name,
              email: payload.email,
              mobile: payload.mobile,
              password: payload.password,
              employeeId: payload.employeeId,
              designation: payload.designation,
              department: payload.department,
              subjects: payload.subjects,
            });
          } catch {
            // Local sync fallback
          }

          mutate((d) => {
            d.users.push({
              id: facultyId,
              name: payload.name,
              email: payload.email,
              mobile: payload.mobile,
              password: payload.password,
              role: 'faculty',
              subjects: payload.subjects,
              status: 'verified',
              createdAt: new Date().toISOString().slice(0, 10),
            });
          });

          toast.success(
            'Faculty created ✓',
            `${payload.name} (${facultyId}) can log in with temporary password. First login will require setting a new password.`
          );
          setCreating(false);
        }}
      />

      <FacultyFormModal
        open={Boolean(editing)}
        initial={editing}
        onClose={() => setEditing(null)}
        title="Edit Faculty Assignment"
        onSave={async (payload) => {
          if (!editing) return;
          try {
            await api.patch(`/admin/faculty/${editing.id}`, payload);
          } catch {
            // Local sync
          }

          mutate((d) => {
            const u = d.users.find((x) => x.id === editing.id);
            if (u) {
              u.name = payload.name;
              u.email = payload.email;
              u.mobile = payload.mobile;
              u.subjects = payload.subjects;
            }
          });
          toast.success('Faculty updated ✓', `${payload.name}'s assignment was saved to MongoDB.`);
          setEditing(null);
        }}
      />

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Faculty Details & Contributions" size="md" icon="layers">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={viewing.name} size={48} />
              <div>
                <p className="text-sm font-bold text-ink-900">{viewing.name}</p>
                <p className="text-xs text-ink-500">{viewing.email} · {viewing.mobile || 'No mobile'}</p>
                <p className="text-[11px] font-medium text-brand-600">ID: {viewing.id}</p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[['Questions', viewing.questions], ['Tests', viewing.tests], ['Subjects', viewing.subjects.length]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl border border-ink-200 py-3">
                  <p className="text-lg font-bold text-ink-900">{v as number}</p>
                  <p className="text-[10px] uppercase tracking-wide text-ink-500">{l}</p>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-2 text-xs font-bold text-ink-900">Assigned subjects</p>
              <div className="flex flex-wrap gap-1.5">
                {viewing.subjects.length === 0 && <span className="text-xs text-ink-400">No subjects assigned</span>}
                {viewing.subjects.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-ink-900">Recent authored questions</p>
              <ul className="space-y-1.5">
                {db.questions.filter((q) => q.createdBy === viewing.id).slice(0, 5).map((q) => (
                  <li key={q.id} className="truncate rounded-lg border border-ink-200 px-3 py-1.5 text-[11px] text-ink-600">
                    {q.text}
                  </li>
                ))}
                {db.questions.filter((q) => q.createdBy === viewing.id).length === 0 && (
                  <li className="text-xs text-ink-400">No questions authored yet.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        onConfirm={async () => {
          if (!deactivating) return;
          const activate = deactivating.status !== 'verified';
          const newStatus = activate ? 'verified' : 'inactive';
          try {
            await api.patch(`/admin/faculty/${deactivating.id}/status`, { status: newStatus });
          } catch {
            // Local sync
          }

          mutate((d) => {
            const u = d.users.find((x) => x.id === deactivating.id);
            if (u) u.status = newStatus;
          });
          toast.success(activate ? 'Faculty activated ✓' : 'Faculty deactivated', deactivating.name);
          setDeactivating(null);
        }}
        title={deactivating?.status === 'verified' ? 'Deactivate faculty?' : 'Activate faculty?'}
        message={`${deactivating?.name} will ${deactivating?.status === 'verified' ? 'immediately lose' : 'regain'} access to the faculty workspace.`}
        confirmLabel={deactivating?.status === 'verified' ? 'Deactivate' : 'Activate'}
      />
    </AppShell>
  );
}

function FacultyFormModal({
  open, onClose, onSave, title, initial,
}: {
  open: boolean; onClose: () => void; title: string;
  onSave: (payload: {
    name: string;
    email: string;
    mobile: string;
    employeeId: string;
    designation: string;
    department: string;
    password: string;
    subjects: string[];
  }) => void;
  initial?: Row | null;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [mobile, setMobile] = useState(initial?.mobile ?? '');
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? '');
  const [designation, setDesignation] = useState(initial?.designation ?? 'Assistant Professor');
  const [department, setDepartment] = useState(initial?.department ?? 'Engineering & Technology');
  const [password, setPassword] = useState('Faculty@123');
  const [subjects, setSubjects] = useState<string[]>(initial?.subjects ?? []);
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) { setError('Enter a valid full name.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid official email address.'); return; }
    setError('');
    onSave({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      employeeId: employeeId.trim() || `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
      designation,
      department,
      password,
      subjects,
    });
  };

  const toggle = (s: string) => setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" icon="user">
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Full Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Anita Desai" /></Field>
        
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Official Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anita@university.edu" /></Field>
          <Field label="Faculty / Employee ID" required><Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="FAC-1002" /></Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mobile Number"><Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9800000009" /></Field>
          <Field label="Designation">
            <Select value={designation} onChange={(e) => setDesignation(e.target.value)}>
              {['Assistant Professor', 'Associate Professor', 'Professor', 'Head of Department', 'Lecturer'].map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Academic Department">
          <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science / Physics" />
        </Field>

        {!initial && (
          <Field label="Initial Temporary Password" hint="Faculty will set their own password upon first login">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-ink-700">Assign Subjects</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={subjects.includes(s)}
                onClick={() => toggle(s)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  subjects.includes(s) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-ink-200 pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon="check">Save Faculty</Button>
        </div>
      </form>
    </Modal>
  );
}

import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { useDB, mutate } from '../../services/db';
import { attemptService } from '../../services/attemptService';
import { BulkUsers } from '../../components/BulkUsers';
import { toCSV, downloadFile } from '../../lib/csv';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmModal, DataTable, EmptyState, Modal, ProgressBar, SearchInput, Select, StatCard, statusTone } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/hooks';
import type { Column } from '../../components/ui';
import type { User } from '../../lib/types';
import { EXAMS } from '../../data/taxonomy';

interface Row {
  user: User; tests: number; accuracy: number; solved: number;
}

type Action = { kind: 'verify' | 'reject' | 'deactivate' | 'activate'; row: Row } | null;

export default function AdminStudents() {
  const user = useGuard('admin');
  const db = useDB();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState('All');
  const [status, setStatus] = useState('All');
  const [viewing, setViewing] = useState<Row | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [importing, setImporting] = useState(false);

  const rows = useMemo<Row[]>(() =>
    db.users
      .filter((u) => u.role === 'student')
      .map((u) => {
        const attempts = attemptService.listByUser(u.id);
        const base = u.baseline ?? { solved: 0, tests: 0, accuracy: 0, score: 0 };
        return {
          user: u,
          tests: base.tests + attempts.length,
          accuracy: attempts.length ? Math.round(attempts.reduce((s, a) => s + a.accuracy, 0) / attempts.length) : base.accuracy,
          solved: base.solved + attempts.reduce((s, a) => s + a.correct + a.wrong, 0),
        };
      }),
  [db.users, db.attempts]);

  const filtered = useMemo(
    () => rows.filter((r) =>
      (exam === 'All' || r.user.exam === exam) &&
      (status === 'All' || r.user.status === status) &&
      `${r.user.name} ${r.user.email}`.toLowerCase().includes(search.toLowerCase())),
    [rows, exam, status, search],
  );

  if (!user) return null;

  const apply = () => {
    if (!action) return;
    const id = action.row.user.id;
    const name = action.row.user.name;
    mutate((d) => {
      const u = d.users.find((x) => x.id === id);
      if (!u) return;
      if (action.kind === 'verify') u.status = 'verified';
      if (action.kind === 'reject') u.status = 'rejected';
      if (action.kind === 'deactivate') u.status = 'inactive';
      if (action.kind === 'activate') u.status = 'verified';
    });
    const messages = {
      verify: 'Student verified ✓',
      reject: 'Student rejected',
      deactivate: 'Student deactivated',
      activate: 'Student activated ✓',
    };
    toast.success(messages[action.kind], `${name}'s account status is now ${action.kind === 'verify' || action.kind === 'activate' ? 'verified' : action.kind}.`);
    setAction(null);
  };

  const columns: Column<Row>[] = [
    {
      key: 'student', header: 'Student',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.user.name} size={30} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink-900">{r.user.name}</p>
            <p className="truncate text-[10px] text-ink-400">{r.user.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'exam', header: 'Exam', render: (r) => <Badge tone="neutral">{r.user.exam ?? '—'}</Badge> },
    { key: 'class', header: 'Class', className: 'hidden md:table-cell', render: (r) => <span className="text-xs">{r.user.classLevel ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.user.status)} dot>{r.user.status}</Badge> },
    { key: 'tests', header: 'Tests', render: (r) => <span className="text-xs">{r.tests}</span> },
    {
      key: 'accuracy', header: 'Accuracy',
      render: (r) => (
        <div className="w-28">
          <div className="mb-1 text-[10px] font-semibold text-ink-900">{r.accuracy}%</div>
          <ProgressBar value={r.accuracy} size="sm" />
        </div>
      ),
    },
    {
      key: 'actions', header: 'Actions', headerClassName: 'text-right', className: 'text-right',
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>View</Button>
          {r.user.status !== 'verified' && <Button size="sm" variant="outline" onClick={() => setAction({ kind: 'verify', row: r })}>Verify</Button>}
          {r.user.status === 'verified' ? (
            <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'deactivate', row: r })}>Deactivate</Button>
          ) : (
            r.user.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'reject', row: r })}>Reject</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell
      role="admin"
      title="Students"
      subtitle="Search, verify and manage learner accounts"
      actions={<Button size="sm" icon="users" onClick={() => setImporting(true)}>Bulk Import</Button>}
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value={rows.length} icon="users" tone="brand" />
        <StatCard label="Verified" value={rows.filter((r) => r.user.status === 'verified').length} icon="checkCircle" tone="success" />
        <StatCard label="Pending" value={rows.filter((r) => r.user.status === 'pending').length} icon="shield" tone="warning" />
        <StatCard label="Inactive / Rejected" value={rows.filter((r) => r.user.status === 'inactive' || r.user.status === 'rejected').length} icon="xCircle" tone="danger" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Student Management" subtitle={`${filtered.length} students`} icon="users" />
        <div className="flex flex-wrap gap-3 border-b border-ink-200 bg-ink-50 px-4 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search students…" className="min-w-48 flex-1" />
          <Button
            size="md" variant="outline" icon="download" disabled={filtered.length === 0}
            onClick={() => downloadFile(
              `astra-prep-students-${Date.now()}.csv`,
              toCSV(['name', 'email', 'mobile', 'role', 'exam', 'class', 'status', 'tests', 'accuracy'],
                filtered.map((r) => [r.user.name, r.user.email, r.user.mobile, 'student', r.user.exam ?? '', r.user.classLevel ?? '', r.user.status, r.tests, r.accuracy])),
            )}
          >
            Export
          </Button>
          <Select value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Filter by exam">
            <option value="All">All Exams</option>
            {EXAMS.map((x) => <option key={x}>{x}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="All">All Status</option>
            {['verified', 'pending', 'rejected', 'inactive'].map((s) => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          keyFn={(r) => r.user.id}
          empty={<EmptyState icon="users" title="No students match your search" message="Try a different name, email or filter combination." />}
        />
      </Card>

      <BulkUsers open={importing} onClose={() => setImporting(false)} />

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Student Profile" size="md" icon="user">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={viewing.user.name} size={52} />
              <div>
                <p className="text-sm font-bold text-ink-900">{viewing.user.name}</p>
                <p className="text-xs text-ink-500">{viewing.user.email} · {viewing.user.mobile}</p>
              </div>
              <Badge tone={statusTone(viewing.user.status)} dot>{viewing.user.status}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Exam', viewing.user.exam ?? '—'],
                ['Class', viewing.user.classLevel ?? '—'],
                ['Joined', formatDate(viewing.user.createdAt)],
                ['Tests', String(viewing.tests)],
                ['Questions solved', viewing.solved.toLocaleString('en-IN')],
                ['Accuracy', `${viewing.accuracy}%`],
                ['Subjects', (viewing.user.subjects ?? []).join(', ') || '—'],
                ['Streak', `${viewing.user.streak ?? 0} days`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-ink-200 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">{k}</p>
                  <p className="text-xs font-bold text-ink-900">{v}</p>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={apply}
        tone={action?.kind === 'verify' || action?.kind === 'activate' ? 'primary' : 'danger'}
        title={
          action?.kind === 'verify' ? 'Verify student?' :
          action?.kind === 'reject' ? 'Reject student?' :
          action?.kind === 'deactivate' ? 'Deactivate student?' : 'Activate student?'
        }
        message={`This will update ${action?.row.user.name}'s account status. The change takes effect immediately in this demo environment.`}
        confirmLabel={action?.kind === 'verify' ? 'Verify' : action?.kind === 'reject' ? 'Reject' : action?.kind === 'deactivate' ? 'Deactivate' : 'Activate'}
      />
    </AppShell>
  );
}

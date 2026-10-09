import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { attemptService } from '../../services/attemptService';
import { useDB } from '../../services/db';
import { Avatar, Badge, Button, Card, CardHeader, DataTable, EmptyState, Modal, ProgressBar, SearchInput, Select, StatCard, statusTone } from '../../components/ui';
import { formatDate, formatDateTime } from '../../lib/hooks';
import type { Column } from '../../components/ui';
import { EXAMS } from '../../data/taxonomy';

interface Row {
  id: string; name: string; email: string; exam: string; classLevel: string;
  status: string; tests: number; accuracy: number; solved: number; lastActive: string; joined: string;
}

export default function FacultyStudents() {
  const user = useGuard('faculty');
  const db = useDB();
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState('All');
  const [viewing, setViewing] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!user) return [];
    return db.users
      .filter((u) => u.role === 'student')
      .map((u) => {
        const attempts = attemptService.listByUser(u.id);
        const base = u.baseline ?? { solved: 0, tests: 0, accuracy: 0, score: 0 };
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          exam: u.exam ?? '—',
          classLevel: u.classLevel ?? '—',
          status: u.status,
          tests: base.tests + attempts.length,
          accuracy: attempts.length
            ? Math.round(attempts.reduce((s, a) => s + a.accuracy, 0) / attempts.length)
            : base.accuracy,
          solved: base.solved + attempts.reduce((s, a) => s + a.correct + a.wrong, 0),
          lastActive: attempts[0]?.submittedAt ?? u.createdAt,
          joined: u.createdAt,
        };
      });
  }, [db.users, db.attempts, user]);

  const filtered = useMemo(
    () => rows.filter((r) => (exam === 'All' || r.exam === exam) && `${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase())),
    [rows, exam, search],
  );

  if (!user) return null;

  const columns: Column<Row>[] = [
    {
      key: 'name', header: 'Student',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.name} size={30} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink-900">{r.name}</p>
            <p className="truncate text-[10px] text-ink-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'exam', header: 'Exam', render: (r) => <Badge tone="neutral">{r.exam}</Badge> },
    { key: 'class', header: 'Class', className: 'hidden md:table-cell', render: (r) => <span className="text-xs">{r.classLevel}</span> },
    { key: 'solved', header: 'Solved', className: 'hidden lg:table-cell', render: (r) => <span className="text-xs">{r.solved.toLocaleString('en-IN')}</span> },
    { key: 'tests', header: 'Tests', render: (r) => <span className="text-xs">{r.tests}</span> },
    {
      key: 'accuracy', header: 'Accuracy',
      render: (r) => (
        <div className="w-28">
          <div className="mb-1 flex justify-between text-[10px]"><span className="font-semibold text-ink-900">{r.accuracy}%</span></div>
          <ProgressBar value={r.accuracy} size="sm" />
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)} dot>{r.status}</Badge> },
    {
      key: 'actions', header: 'Actions', headerClassName: 'text-right', className: 'text-right',
      render: (r) => <Button size="sm" variant="outline" onClick={() => setViewing(r)}>View</Button>,
    },
  ];

  const avgAccuracy = rows.length ? Math.round(rows.reduce((s, r) => s + r.accuracy, 0) / rows.length) : 0;
  const totalSolved = rows.reduce((s, r) => s + r.solved, 0);

  return (
    <AppShell role="faculty" title="Students" subtitle="Track learner progress across batches">
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value={rows.length} icon="users" tone="brand" />
        <StatCard label="Average Accuracy" value={`${avgAccuracy}%`} icon="target" tone="success" />
        <StatCard label="Questions Solved" value={totalSolved.toLocaleString('en-IN')} icon="checkCircle" tone="info" />
        <StatCard label="At Risk (<60%)" value={rows.filter((r) => r.accuracy < 60).length} icon="alert" tone="danger" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Student Roster" subtitle={`${filtered.length} students`} icon="users" />
        <div className="flex flex-wrap gap-3 border-b border-ink-200 bg-ink-50 px-4 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" className="min-w-48 flex-1" />
          <Select value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Filter by exam">
            <option value="All">All Exams</option>
            {EXAMS.map((e) => <option key={e}>{e}</option>)}
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          keyFn={(r) => r.id}
          empty={<EmptyState icon="users" title="No students match your search" message="Try a different name, email or exam filter." />}
        />
      </Card>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.name ?? 'Student'} size="md" icon="user">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={viewing.name} size={48} />
              <div>
                <p className="text-sm font-bold text-ink-900">{viewing.name}</p>
                <p className="text-xs text-ink-500">{viewing.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Exam', viewing.exam],
                ['Class', viewing.classLevel],
                ['Status', viewing.status],
                ['Joined', formatDate(viewing.joined)],
                ['Tests', String(viewing.tests)],
                ['Solved', viewing.solved.toLocaleString('en-IN')],
                ['Accuracy', `${viewing.accuracy}%`],
                ['Last active', formatDateTime(viewing.lastActive)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-ink-200 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">{k}</p>
                  <p className="text-xs font-bold text-ink-900">{v}</p>
                </div>
              ))}
            </dl>
            <div className="rounded-xl bg-ink-50 px-3 py-2.5">
              <p className="text-[11px] text-ink-600">
                Cohort context: platform average accuracy is {avgAccuracy}%.
                {viewing.accuracy < avgAccuracy ? ' This student is below the cohort average — consider assigning targeted practice.' : ' This student is at or above the cohort average.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}



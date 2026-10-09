import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { useDB, mutate } from '../../services/db';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmModal, EmptyState, Modal, Tabs } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/hooks';
import type { User } from '../../lib/types';

type Action = { kind: 'approve' | 'reject'; user: User } | null;

export default function Verification() {
  const user = useGuard('admin');
  const db = useDB();
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [viewing, setViewing] = useState<User | null>(null);
  const [action, setAction] = useState<Action>(null);

  const students = useMemo(() => db.users.filter((u) => u.role === 'student'), [db.users]);
  const pending = students.filter((u) => u.status === 'pending');
  const approved = students.filter((u) => u.status === 'verified');
  const rejected = students.filter((u) => u.status === 'rejected');

  const list = tab === 'pending' ? pending : tab === 'approved' ? approved : rejected;

  if (!user) return null;

  const apply = () => {
    if (!action) return;
    mutate((d) => {
      const u = d.users.find((x) => x.id === action.user.id);
      if (u) u.status = action.kind === 'approve' ? 'verified' : 'rejected';
    });
    toast.success(
      action.kind === 'approve' ? 'Student verified ✓' : 'Student rejected',
      `${action.user.name} can ${action.kind === 'approve' ? 'now log in and practise' : 'no longer access the platform'}.`,
    );
    setAction(null);
  };

  return (
    <AppShell role="admin" title="Verification" subtitle="Review and approve new student registrations">
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'pending', label: 'Pending', count: pending.length },
            { id: 'approved', label: 'Approved', count: approved.length },
            { id: 'rejected', label: 'Rejected', count: rejected.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={tab === 'pending' ? 'Pending Verification' : tab === 'approved' ? 'Approved Students' : 'Rejected Students'}
          subtitle={`${list.length} records`}
          icon="shield"
        />
        {list.length === 0 ? (
          <EmptyState
            icon={tab === 'pending' ? 'checkCircle' : 'shield'}
            title={tab === 'pending' ? 'Nothing pending' : `No ${tab} students`}
            message={tab === 'pending' ? 'Every registration has been reviewed. New sign-ups appear here instantly.' : 'Records will appear here as you process registrations.'}
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-brand-50/30">
                <Avatar name={s.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{s.name}</p>
                  <p className="truncate text-[11px] text-ink-500">{s.email} · {s.mobile}</p>
                </div>
                <div className="hidden items-center gap-4 text-xs sm:flex">
                  <span className="text-ink-500">{s.classLevel}</span>
                  <Badge tone="neutral">{s.exam ?? '—'}</Badge>
                  <span className="text-ink-400">{formatDate(s.createdAt)}</span>
                </div>
                <Badge tone={s.status === 'verified' ? 'success' : s.status === 'pending' ? 'warning' : 'danger'} dot>{s.status}</Badge>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" icon="eye" onClick={() => setViewing(s)}>View</Button>
                  {tab === 'pending' && (
                    <>
                      <Button size="sm" icon="check" onClick={() => setAction({ kind: 'approve', user: s })}>Approve</Button>
                      <Button size="sm" variant="danger" icon="x" onClick={() => setAction({ kind: 'reject', user: s })}>Reject</Button>
                    </>
                  )}
                  {tab !== 'pending' && s.status !== 'verified' && (
                    <Button size="sm" variant="outline" onClick={() => setAction({ kind: 'approve', user: s })}>Approve</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="Registration Details" size="md" icon="user">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={viewing.name} size={52} />
              <div>
                <p className="text-sm font-bold text-ink-900">{viewing.name}</p>
                <p className="text-xs text-ink-500">{viewing.email}</p>
              </div>
              <Badge tone={viewing.status === 'verified' ? 'success' : viewing.status === 'pending' ? 'warning' : 'danger'} dot>{viewing.status}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Mobile', viewing.mobile],
                ['Class', viewing.classLevel ?? '—'],
                ['Exam', viewing.exam ?? '—'],
                ['Registered', formatDate(viewing.createdAt)],
                ['Subjects', (viewing.subjects ?? []).join(', ') || '—'],
                ['User ID', viewing.id],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-ink-200 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">{k}</p>
                  <p className="text-xs font-bold text-ink-900">{v}</p>
                </div>
              ))}
            </dl>
            <p className="flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-[11px] text-ink-600">
              <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
              Verification state is stored in the local demo database and persists until you reset demo data.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={apply}
        tone={action?.kind === 'approve' ? 'primary' : 'danger'}
        title={action?.kind === 'approve' ? 'Approve this student?' : 'Reject this student?'}
        message={`${action?.user.name} (${action?.user.email}) — ${action?.kind === 'approve' ? 'they will be able to log in and start practising.' : 'they will not be able to log in.'}`}
        confirmLabel={action?.kind === 'approve' ? 'Approve' : 'Reject'}
      />
    </AppShell>
  );
}

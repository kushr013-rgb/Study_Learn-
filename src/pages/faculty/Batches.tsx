import { useMemo } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { analyticsService } from '../../services/analyticsService';
import { useDB } from '../../services/db';
import { Avatar, Badge, Card, CardBody, CardHeader, EmptyState, ProgressBar } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';

export default function Batches() {
  const user = useGuard('faculty');
  const db = useDB();
  const batches = useMemo(() => analyticsService.batches(), [db.users, db.attempts]);

  if (!user) return null;

  return (
    <AppShell role="faculty" title="Batches" subtitle="Learner groups by exam and mentor">
      {batches.length === 0 ? (
        <Card><EmptyState icon="grid" title="No batches yet" message="Batches are created automatically from enrolled students." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {batches.map((b) => {
            const students = db.users.filter((u) => u.role === 'student' && u.exam === b.exam);
            return (
              <Card key={b.id} className="overflow-hidden" hover>
                <CardHeader title={b.name} subtitle={`${b.exam} · ${b.students} students`} icon="grid" />
                <CardBody>
                  <div className="mb-3">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-medium text-ink-600">Batch accuracy</span>
                      <span className="font-bold text-ink-900">{b.accuracy}%</span>
                    </div>
                    <ProgressBar value={b.accuracy} size="sm" />
                  </div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-500">
                    <Icon name="user" size={12} /> Mentor: {b.mentor}
                  </p>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">Learners</p>
                  <ul className="space-y-2">
                    {students.length === 0 && <li className="text-xs text-ink-400">No learners enrolled yet.</li>}
                    {students.slice(0, 5).map((s) => {
                      const attempts = db.attempts.filter((a) => a.userId === s.id);
                      const acc = attempts.length ? Math.round(attempts.reduce((x, a) => x + a.accuracy, 0) / attempts.length) : (s.baseline?.accuracy ?? 0);
                      return (
                        <li key={s.id} className="flex items-center gap-2.5">
                          <Avatar name={s.name} size={26} />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-800">{s.name}</span>
                          <Badge tone={acc >= 75 ? 'success' : acc >= 55 ? 'warning' : 'danger'}>{acc}%</Badge>
                        </li>
                      );
                    })}
                    {students.length > 5 && <li className="text-[11px] text-ink-400">+{students.length - 5} more learners</li>}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

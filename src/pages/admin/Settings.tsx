import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard, useSession } from '../../lib/session';
import { useDB, mutate, resetDB, getDB } from '../../services/db';
import { questionService } from '../../services/questionService';
import { testService } from '../../services/testService';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmModal, Field, Input, StatCard, Toggle } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { useToast } from '../../components/ui/Toast';

export default function AdminSettings() {
  const user = useGuard('admin');
  const db = useDB();
  const toast = useToast();
  const { logout } = useSession();
  const [platformName, setPlatformName] = useState(db.settings.platformName);
  const [threshold, setThreshold] = useState(String(db.settings.weakAreaThreshold));
  const [targetTime, setTargetTime] = useState(String(db.settings.targetTimePerQuestion));
  const [maintenance, setMaintenance] = useState(db.settings.maintenance);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!user) return null;

  const save = () => {
    mutate((d) => {
      d.settings.platformName = platformName.trim() || 'Astra Prep';
      d.settings.weakAreaThreshold = Math.max(10, Math.min(95, Number(threshold) || 60));
      d.settings.targetTimePerQuestion = Math.max(20, Math.min(300, Number(targetTime) || 60));
      d.settings.maintenance = maintenance;
    });
    toast.success('Settings saved ✓', 'Recommendation thresholds updated across the platform.');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getDB(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astra-prep-demo-data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Demo data exported', 'A JSON snapshot was downloaded to your device.');
  };

  const qStats = questionService.stats();
  const tStats = testService.stats();

  return (
    <AppShell role="admin" title="Settings" subtitle="Platform configuration and demo data management">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={db.users.length} icon="users" tone="brand" />
        <StatCard label="Questions" value={qStats.total} icon="layers" tone="info" hint={`${qStats.published} published`} />
        <StatCard label="Tests" value={tStats.total} icon="quiz" tone="warning" />
        <StatCard label="Attempts" value={db.attempts.length} icon="bolt" tone="success" hint={`${db.mistakes.length} mistakes tracked`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Platform Settings" subtitle="Branding and behaviour" icon="settings" />
          <CardBody className="space-y-4">
            <Field label="Platform Name" hint="Shown in the dashboard and emails">
              <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Weak Area Threshold (%)" hint="Chapters below this accuracy are flagged">
                <Input type="number" min={10} max={95} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              </Field>
              <Field label="Target Time / Question (sec)" hint="Used by the speed recommendation rule">
                <Input type="number" min={20} max={300} value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
              </Field>
            </div>
            <Toggle checked={maintenance} onChange={setMaintenance} label="Maintenance mode (shows a notice to students)" />
            <div className="flex justify-end"><Button icon="check" onClick={save}>Save Settings</Button></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recommendation Engine" subtitle="Active rule set" icon="sparkles" />
          <CardBody>
            <ul className="space-y-2.5">
              {[
                `IF chapter accuracy < ${db.settings.weakAreaThreshold}% THEN recommend chapter practice`,
                'IF unresolved mistakes >= 3 THEN recommend mistake revision',
                `IF avg time per question > ${db.settings.targetTimePerQuestion}s THEN recommend timed practice`,
                'IF days since last test > 5 THEN recommend a full mock test',
                'ALWAYS recommend a daily mixed practice set',
              ].map((r) => (
                <li key={r} className="flex gap-2 rounded-lg bg-ink-50 px-3 py-2">
                  <Icon name="bolt" size={14} className="mt-0.5 shrink-0 text-brand-600" />
                  <code className="text-[11px] leading-relaxed text-ink-700">{r}</code>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-ink-500">
              The engine is a pure rule registry. Replace <code className="rounded bg-ink-100 px-1">recommendationService.recommend()</code> with
              an ML service call to upgrade it — no UI changes required.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Demo Data" subtitle="Everything lives in your browser's localStorage" icon="layers" />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Icon name="alert" size={16} className="shrink-0 text-amber-600" />
            <p className="flex-1 text-xs text-amber-800">
              This prototype uses no database. All users, questions, tests, attempts and mistakes are stored locally.
              Resetting restores the original seed dataset.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon="download" onClick={exportData}>Export JSON Snapshot</Button>
            <Button variant="danger" icon="refresh" onClick={() => setConfirmReset(true)}>Reset Demo Data</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['Users', db.users.length],
              ['Questions', db.questions.length],
              ['Tests', db.tests.length],
              ['Attempts', db.attempts.length],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl border border-ink-200 px-3 py-2.5">
                <p className="text-lg font-bold text-ink-900">{v as number}</p>
                <p className="text-[10px] uppercase tracking-wide text-ink-500">{l}</p>
              </div>
            ))}
          </div>
          <Badge tone="neutral">Storage key: astraprep.db.v1</Badge>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Architecture Notes" subtitle="How this prototype maps to a real backend" icon="shield" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold text-ink-900">Current (mock)</p>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 px-4 py-3 text-[11px] leading-relaxed text-ink-100">
{`UI  →  Page component
     →  service layer
     →  mock DB (localStorage)`}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-ink-900">Future (real)</p>
              <pre className="overflow-x-auto rounded-xl bg-ink-900 px-4 py-3 text-[11px] leading-relaxed text-ink-100">
{`UI  →  Page component
     →  service layer  (unchanged)
     →  REST API
     →  MongoDB`}
              </pre>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ink-500">
            Authentication is isolated in <code className="rounded bg-ink-100 px-1">authService.demoAuth</code>. Swap it for{' '}
            <code className="rounded bg-ink-100 px-1">realAuthAPI</code> (server-side verification, httpOnly session cookie) without touching any screen.
          </p>
        </CardBody>
      </Card>

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDB();
          toast.success('Demo data reset ✓', 'The original seed dataset has been restored.');
          setConfirmReset(false);
          logout();
        }}
        title="Reset Demo Data?"
        message="All local changes — created questions, tests, attempts, mistakes and verification decisions — will be permanently discarded and the seed dataset restored. You will be logged out."
        confirmLabel="Reset Everything"
      />
    </AppShell>
  );
}

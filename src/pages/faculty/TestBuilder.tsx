import { useRouter } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { TestForm } from '../../components/TestManager';
import { Card, CardBody, CardHeader } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';

export default function TestBuilder() {
  const user = useGuard('faculty');
  const { navigate } = useRouter();
  if (!user) return null;

  return (
    <AppShell role="faculty" title="Create Test" subtitle="Random or manual question selection">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader title="Test Configuration" subtitle="Name, pattern and question selection" icon="quiz" />
          <CardBody>
            <TestForm createdBy={user.id} onCancel={() => navigate('/faculty/tests')} onSaved={() => navigate('/faculty/tests')} />
          </CardBody>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Test patterns" icon="layers" />
            <CardBody>
              <ul className="space-y-2.5 text-xs text-ink-600">
                {[
                  ['Topic Test', '10 questions · 20 minutes'],
                  ['Chapter Test', '20 questions · 30–45 minutes'],
                  ['Subject Test', '35–45 questions · 60–120 minutes'],
                  ['Full Mock Test', '50 questions · 180 minutes'],
                ].map(([t, d]) => (
                  <li key={t} className="flex justify-between gap-3">
                    <span className="font-semibold text-ink-800">{t}</span>
                    <span className="text-ink-500">{d}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tips" icon="sparkles" />
            <CardBody className="space-y-2.5">
              {['Mix difficulties 20 / 60 / 20 for a balanced paper.', 'Random selection draws only published questions.', 'Publish to make the test visible to students.'].map((t) => (
                <p key={t} className="flex gap-2 text-xs leading-relaxed text-ink-600">
                  <Icon name="check" size={14} className="mt-0.5 shrink-0 text-brand-500" />{t}
                </p>
              ))}
            </CardBody>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

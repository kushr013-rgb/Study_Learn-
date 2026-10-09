import { useRouter } from '../../lib/router';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { QuestionForm } from '../../components/QuestionManager';
import { questionService } from '../../services/questionService';
import { Card, CardBody, CardHeader } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { Icon } from '../../components/ui/Icons';

export default function CreateQuestion() {
  const user = useGuard('faculty');
  const { navigate } = useRouter();
  const toast = useToast();
  if (!user) return null;

  return (
    <AppShell role="faculty" title="Create Question" subtitle="Add a new question to the bank">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader title="Question Details" subtitle="All fields marked * are required" icon="plus" />
          <CardBody>
            <QuestionForm
              onCancel={() => navigate('/faculty/questions')}
              onSave={(payload) => {
                const created = questionService.create({ ...payload, createdBy: user.id });
                toast.success(
                  payload.status === 'Published' ? 'Question published ✓' : 'Draft saved ✓',
                  `${created.id} · ${created.exam} ${created.subject} — ${created.chapter}`,
                );
                navigate('/faculty/questions');
              }}
            />
          </CardBody>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Authoring guidelines" icon="sparkles" />
            <CardBody className="space-y-2.5">
              {[
                'Write an unambiguous stem — no double negatives.',
                'Keep all four distractors plausible and of similar length.',
                'Explain the method, not just the final answer.',
                'Tag the exact chapter and topic for accurate analytics.',
                'Use Hard for multi-step, exam-grade problems only.',
              ].map((t) => (
                <p key={t} className="flex gap-2 text-xs leading-relaxed text-ink-600">
                  <Icon name="checkCircle" size={14} className="mt-0.5 shrink-0 text-emerald-500" />{t}
                </p>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Demo flow" icon="bolt" />
            <CardBody>
              <ol className="space-y-2 text-xs text-ink-600">
                {['Publish a question here', 'Log in as student', 'Practise the same chapter', 'Attempt it and submit', 'Check analytics & mistake book'].map((s, i) => (
                  <li key={s} className="flex gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

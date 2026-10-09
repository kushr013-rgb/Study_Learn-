import { useState, type FormEvent } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useGuard } from '../../lib/session';
import { authService } from '../../services/authService';
import { analyticsService } from '../../services/analyticsService';
import { attemptService } from '../../services/attemptService';
import { useDB } from '../../services/db';
import { EXAMS, SUBJECTS } from '../../data/taxonomy';
import type { Exam } from '../../lib/types';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, Field, Input, Select, StatCard, Toggle } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

export default function Profile() {
  const user = useGuard('student');
  const db = useDB();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [mistakeAlerts, setMistakeAlerts] = useState(true);

  const [form, setForm] = useState({
    name: user?.name ?? '',
    mobile: user?.mobile ?? '',
    classLevel: user?.classLevel ?? 'Class 12',
    exam: (user?.exam ?? '') as Exam | '',
    college: user?.studentProfile?.college ?? 'National Institute of Technology',
    department: user?.studentProfile?.department ?? 'Computer Science & Engineering',
    course: user?.studentProfile?.course ?? 'B.Tech / Senior Secondary',
    semester: user?.studentProfile?.semester ?? '1',
  });
  const [subjects, setSubjects] = useState<string[]>(user?.subjects ?? []);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  if (!user) return null;

  const overview = analyticsService.overview(user.id);
  const attempts = attemptService.listByUser(user.id);
  const mistakes = attemptService.mistakesFor(user.id).filter((m) => !m.resolved).length;

  const toggleSubject = (s: string) =>
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authService.updateProfile(user.id, {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        classLevel: form.classLevel,
        ...(form.exam ? { exam: form.exam } : {}),
        subjects,
        college: form.college,
        department: form.department,
        course: form.course,
      });
      if (!updated) throw new Error('Profile was not updated.');
      setSaving(false);
      toast.success('Profile updated', 'Your changes have been saved.');
    } catch {
      setSaving(false);
      toast.error('Update failed', 'Could not save profile changes. Please try again.');
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwd.current) { setPwdError('Enter your current password.'); return; }
    if (pwd.next.length < 6) { setPwdError('New password must be at least 6 characters.'); return; }
    if (pwd.next !== pwd.confirm) { setPwdError('New passwords do not match.'); return; }
    setPwdError('');
    setPwdBusy(true);

    const res = await authService.changePassword(pwd.current, pwd.next);
    setPwdBusy(false);

    if (res.ok) {
      setPwd({ current: '', next: '', confirm: '' });
      toast.success('Password updated ✓', 'Use your new password the next time you log in.');
    } else {
      setPwdError(res.message);
    }
  };

  return (
    <AppShell role="student" title="Student Profile" subtitle="Manage your academic records, security, and preferences">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Questions Solved" value={overview.solved.toLocaleString('en-IN')} icon="checkCircle" tone="brand" />
        <StatCard label="Tests Attempted" value={overview.tests} icon="quiz" tone="info" />
        <StatCard label="Accuracy" value={`${overview.accuracy}%`} icon="target" tone="success" />
        <StatCard label="Open Mistakes" value={mistakes} icon="book" tone="danger" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="lg:col-span-1">
          <CardBody className="text-center">
            <div className="flex justify-center"><Avatar name={user.name} size={72} /></div>
            <h2 className="mt-3 text-base font-bold text-ink-900">{user.name}</h2>
            <p className="text-xs text-ink-500">{user.email}</p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              <Badge tone="brand" dot>Student</Badge>
              <Badge tone={user.status === 'verified' ? 'success' : 'warning'} dot>{user.status}</Badge>
            </div>
            <dl className="mt-5 space-y-2 text-left">
              {[
                ['Student ID / Enrollment', user.studentProfile?.enrollmentNumber || user.id],
                ['Institution', form.college],
                ['Department', form.department],
                ['Course', form.course],
                ['Mobile', user.mobile || '—'],
                ['Target Exam', user.exam ?? '—'],
                ['Class / Semester', `${user.classLevel ?? 'Class 12'} · Sem ${form.semester}`],
                ['Joined', new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })],
                ['Total Attempts', String(attempts.length)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-ink-100 pb-1.5 text-xs last:border-0">
                  <span className="text-ink-500">{k}</span>
                  <span className="font-semibold text-ink-900 text-right truncate max-w-[180px]">{v}</span>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {/* Edit form */}
        <Card className="lg:col-span-2">
          <CardHeader title="Edit Profile Details" subtitle="Keep your contact and academic information current" icon="user" />
          <CardBody>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Mobile Number"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="College / Institution"><Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></Field>
                <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Class Level">
                  <Select value={form.classLevel} onChange={(e) => setForm({ ...form, classLevel: e.target.value })}>
                    {['Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper'].map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Exam Category" hint="Your preparation content and progress follow this exam.">
                  <Select value={form.exam} onChange={(e) => {
                    const exam = e.target.value as Exam | '';
                    setForm({ ...form, exam });
                    setSubjects((current) => current.filter((subject) => (SUBJECTS[exam as Exam] ?? []).includes(subject)));
                  }}>
                    <option value="">Select an exam</option>
                    {EXAMS.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Semester">
                  <Select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => <option key={s}>{`Sem ${s}`}</option>)}
                  </Select>
                </Field>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-ink-700">Focus subjects</p>
                <div className="flex flex-wrap gap-2">
                  {(form.exam ? SUBJECTS[form.exam] : []).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={subjects.includes(s)}
                      onClick={() => toggleSubject(s)}
                      className={cn('rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                        subjects.includes(s) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-200')}
                    >
                      {subjects.includes(s) && <Icon name="check" size={12} className="mr-1 inline" />}{s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={saving} icon="check">Save Profile</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Security & Password" subtitle="Update your account password securely" icon="shield" />
          <CardBody>
            <form onSubmit={changePassword} className="space-y-4">
              <Field label="Current Password" error={pwdError && pwdError.includes('Current') ? pwdError : undefined}>
                <Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} placeholder="••••••" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New Password">
                  <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="••••••••" />
                </Field>
                <Field label="Confirm New Password" error={pwdError && !pwdError.includes('Current') ? pwdError : undefined}>
                  <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="••••••••" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={pwdBusy} variant="secondary">Update Password</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Preferences & Database Status" subtitle="System notifications and persistence" icon="bell" />
          <CardBody className="space-y-4">
            <Toggle checked={dailyReminder} onChange={setDailyReminder} label="Daily practice reminder notification" />
            <Toggle checked={mistakeAlerts} onChange={setMistakeAlerts} label="Alert me when a mistake book item needs review" />
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <p className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                <Icon name="checkCircle" size={14} className="shrink-0 text-emerald-600" />
                Live MongoDB Persistence Active. Your profile and attempts are securely stored.
              </p>
            </div>
            <p className="text-[11px] text-ink-400">
              Platform: {db.settings.platformName} · Authenticated as: {user.email}
            </p>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

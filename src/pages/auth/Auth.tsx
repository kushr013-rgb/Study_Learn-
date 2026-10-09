import { useState, type FormEvent } from 'react';
import { Link, useRouter } from '../../lib/router';
import { authService } from '../../services/authService';
import { ROLE_HOME } from '../../lib/session';
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui';
import { Icon } from '../../components/ui/Icons';
import { Logo } from '../../components/layout/AppShell';
import { EXAMS, SUBJECTS } from '../../data/taxonomy';
import { USE_API } from '../../services/config';
import { cn } from '../../utils/cn';

const DEMO = [
  { role: 'Student', email: 'student@demo.com', hint: 'Rahul Sharma · JEE', icon: 'user' as const },
  { role: 'Faculty', email: 'faculty@demo.com', hint: 'Dr. Priya Nair · Physics', icon: 'users' as const },
  { role: 'Admin', email: 'admin@demo.com', hint: 'Platform administrator', icon: 'shield' as const },
];

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-ink-50 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-900 p-12 lg:flex lg:flex-col">
        <div className="absolute inset-0 grid-noise opacity-70" aria-hidden="true" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-white">
            <Logo compact />
            <span className="text-base font-extrabold">Astra<span className="text-brand-400">Prep</span></span>
          </Link>
        </div>
        <div className="relative my-auto max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
            Practice Smarter.<br />Prepare Better.<br />
            <span className="text-brand-400">Perform Your Best.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            Join students preparing for JEE, NEET, Class 10, Class 12 and MH-CET practising topic by topic,
            testing under real conditions and tracking every improvement.
          </p>
          <ul className="mt-8 space-y-3">
            {['115+ curated questions across five exam categories', 'Real CBT test engine with live timer', 'Automatic mistake book & weak-area detection'].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink-200">
                <Icon name="checkCircle" size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-ink-500">
          Production build · MongoDB Atlas &amp; Mongoose powered · JWT Secure Session
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-4 py-8 sm:px-8 lg:px-16 overflow-y-auto max-h-screen">
        <div className="mx-auto w-full max-w-md my-auto">
          <div className="mb-6 lg:hidden">
            <Link to="/"><Logo /></Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* ================================ Login ================================ */

export function Login() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState(USE_API ? '' : 'student@demo.com');
  const [password, setPassword] = useState(USE_API ? '' : '123456');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);

    try {
      const res = await authService.login(email, password);
      setBusy(false);
      if (!res.ok || !res.user) {
        setError(res.message ?? 'Login failed. Please check credentials.');
        return;
      }
      navigate(ROLE_HOME[res.user.role]);
    } catch {
      setBusy(false);
      setError('Server unreachable. Please check network connection.');
    }
  };

  const useDemo = (emailAddr: string) => {
    setEmail(emailAddr);
    setPassword('123456');
    setError('');
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Log in to continue your preparation."
      footer={<>Don&apos;t have an account? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Register</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            <Icon name="alert" size={15} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        <Field label="Email / Mobile">
          <Input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username" required />
        </Field>
        <Field label="Password">
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
              className="pr-16"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-ink-500 hover:bg-ink-100"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-ink-600">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-ink-300 accent-brand-600" defaultChecked /> Remember me
          </label>
          <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">Forgot Password?</Link>
        </div>
        <Button type="submit" fullWidth size="lg" loading={busy}>Login</Button>
      </form>

      {!USE_API && <Card className="mt-6 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="sparkles" size={15} className="text-brand-600" />
          <p className="text-xs font-bold text-ink-900">Demo credentials (verified in MongoDB)</p>
        </div>
        <ul className="space-y-2">
          {DEMO.map((d) => (
            <li key={d.role}>
              <button
                type="button"
                onClick={() => useDemo(d.email)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition',
                  email === d.email ? 'border-brand-300 bg-brand-50' : 'border-ink-200 hover:border-brand-200 hover:bg-ink-50',
                )}
              >
                <Icon name={d.icon} size={16} className="text-ink-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-ink-900">{d.role}</span>
                  <span className="block truncate text-[11px] text-ink-500">{d.email} · {d.hint}</span>
                </span>
                <Badge tone="neutral">123456</Badge>
              </button>
            </li>
          ))}
        </ul>
      </Card>}
    </AuthShell>
  );
}

/* ============================== Register ============================== */

export function Register() {
  const { navigate } = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    enrollmentNumber: '',
    college: '',
    department: 'Computer Science & Engineering',
    course: 'B.Tech / Senior Secondary',
    classLevel: 'Class 12',
    semester: '1',
    academicYear: '2026-2027',
    password: '',
    confirmPassword: '',
    exam: 'JEE' as (typeof EXAMS)[number],
    subject: 'Physics',
    dateOfBirth: '',
    gender: '',
    state: '',
    city: '',
    targetExam: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 3) errs.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, ''))) errs.mobile = 'Enter a 10-digit mobile number.';
    if (!form.enrollmentNumber.trim()) errs.enrollmentNumber = 'Enter Student ID / Enrollment number.';
    if (!form.college.trim()) errs.college = 'Enter college or institution name.';
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) errs.password = 'Use 8+ characters with uppercase, lowercase, and a number.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.dateOfBirth) errs.dateOfBirth = 'Enter your date of birth.';
    if (!form.gender) errs.gender = 'Select your gender.';
    if (!form.state.trim()) errs.state = 'Enter your state.';
    if (!form.city.trim()) errs.city = 'Enter your city.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await authService.register(form);
      setBusy(false);
      if (!res.ok) {
        setErrors({ email: res.message ?? 'Registration failed.' });
        return;
      }
      navigate('/student/dashboard');
    } catch {
      setBusy(false);
      setErrors({ email: 'Registration service currently unavailable.' });
    }
  };

  return (
    <AuthShell
      title="Create Student Account"
      subtitle="Complete your academic registration in seconds."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Login</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-3.5">
        <Field label="Full Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Rahul Sharma" autoComplete="name" />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" required error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="rahul@example.com" autoComplete="email" />
          </Field>
          <Field label="Mobile Number" required error={errors.mobile}>
            <Input type="tel" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="9876543210" autoComplete="tel" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date of Birth" required error={errors.dateOfBirth}>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} autoComplete="bday" />
          </Field>
          <Field label="Gender" required error={errors.gender}>
            <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="State" required error={errors.state}>
            <Input value={form.state} onChange={(e) => set('state', e.target.value)} autoComplete="address-level1" />
          </Field>
          <Field label="City" required error={errors.city}>
            <Input value={form.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Student / Enrollment ID" required error={errors.enrollmentNumber}>
            <Input value={form.enrollmentNumber} onChange={(e) => set('enrollmentNumber', e.target.value)} placeholder="ENR-2026-881" />
          </Field>
          <Field label="College / Institution" required error={errors.college}>
            <Input value={form.college} onChange={(e) => set('college', e.target.value)} placeholder="National Institute of Technology" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Department">
            <Input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Computer Science" />
          </Field>
          <Field label="Course / Program">
            <Input value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="B.Tech / Standard" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Class Level">
            <Select value={form.classLevel} onChange={(e) => set('classLevel', e.target.value)}>
              {['Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={form.semester} onChange={(e) => set('semester', e.target.value)}>
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => <option key={s}>{`Sem ${s}`}</option>)}
            </Select>
          </Field>
          <Field label="Academic Year" required>
            <Input value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} placeholder="2026-2027" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Exam Category" required>
            <Select value={form.exam} onChange={(e) => set('exam', e.target.value as typeof form.exam)}>
              {EXAMS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Preferred Focus Subject">
          <Select value={form.subject} onChange={(e) => set('subject', e.target.value)}>
            {(SUBJECTS[form.exam] || []).map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>

        <Field label="Target Exam" hint="Optional, if you are preparing for a specific exam or board.">
          <Input value={form.targetExam} onChange={(e) => set('targetExam', e.target.value)} placeholder="For example, JEE Main or Maharashtra HSC" />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Password" required error={errors.password} hint="8+ characters with uppercase, lowercase, and a number">
            <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••" autoComplete="new-password" />
          </Field>
          <Field label="Confirm Password" required error={errors.confirmPassword}>
            <Input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="••••••" autoComplete="new-password" />
          </Field>
        </div>

        <Button type="submit" fullWidth size="lg" loading={busy} className="mt-2">Register Student Account</Button>
        <p className="text-center text-[11px] text-ink-400">
          All data is securely validated and persisted in MongoDB.
        </p>
      </form>
    </AuthShell>
  );
}

/* ============================ Forgot Password ============================ */

export function ForgotPassword() {
  const [email, setEmail] = useState('student@demo.com');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setMsg(null);

    const res = await authService.forgotPassword(email);
    setBusy(false);
    setMsg({ ok: res.ok, text: res.message });
    if (res.ok) {
      if (res.codePreview) setOtp(res.codePreview);
      setStep('reset');
    }
  };

  const confirmReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || newPassword.length < 6) {
      setMsg({ ok: false, text: 'Please enter the 6-digit recovery code and a new password (min 6 chars).' });
      return;
    }
    setBusy(true);
    setMsg(null);

    const res = await authService.resetPassword({ email, otp, newPassword });
    setBusy(false);
    setMsg({ ok: res.ok, text: res.message });
  };

  return (
    <AuthShell
      title="Forgot Password?"
      subtitle={step === 'request' ? 'Enter your registered email to receive a recovery code.' : 'Enter the code and choose a new password.'}
      footer={<Link to="/login" className="font-semibold text-brand-600 hover:underline">Back to Login</Link>}
    >
      {step === 'request' ? (
        <form onSubmit={requestReset} className="space-y-4">
          <Field label="Registered Email / Login ID" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Button type="submit" fullWidth size="lg" loading={busy}>Send Recovery Code</Button>
        </form>
      ) : (
        <form onSubmit={confirmReset} className="space-y-4">
          <Field label="Registered Email" required>
            <Input type="email" value={email} disabled className="bg-ink-100" />
          </Field>
          <Field label="6-Digit Recovery Code / OTP" required>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} className="font-mono text-center tracking-widest text-base" />
          </Field>
          <Field label="New Password" required hint="Minimum 6 characters">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Button type="submit" fullWidth size="lg" loading={busy}>Update Password</Button>
        </form>
      )}

      {msg && (
        <div className={cn('mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs', msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')} role="status">
          <Icon name={msg.ok ? 'checkCircle' : 'alert'} size={15} className="mt-0.5 shrink-0" />
          {msg.text}
        </div>
      )}
    </AuthShell>
  );
}

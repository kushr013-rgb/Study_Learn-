import { Link } from '../lib/router';
import { Footer, PublicNav } from '../components/layout/Public';
import { AreaChart, BarChart, DonutChart, HBarList } from '../components/ui/Charts';
import { Badge, Button, Card, CardBody, ProgressBar, SectionTitle } from '../components/ui';
import { Icon, type IconName } from '../components/ui/Icons';
import { EXAM_META, EXAMS } from '../data/taxonomy';
import type { Exam } from '../lib/types';

const STATS = [
  { value: '18,450', label: 'Practice questions' },
  { value: '125+', label: 'Mock tests' },
  { value: '2,430', label: 'Active learners' },
  { value: '78%', label: 'Average accuracy' },
];

const PRACTICE_FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'layers', title: 'Topic-wise practice', body: 'Drill down from exam to subject to chapter to topic, then choose Easy, Medium or Hard.' },
  { icon: 'bolt', title: 'Daily practice sets', body: 'A balanced 30-question set across your three core subjects every single day, ~35 minutes.' },
  { icon: 'clock', title: 'Timed sessions', body: 'Practise with a per-question target so speed stops costing you marks in the real exam.' },
  { icon: 'target', title: 'Difficulty control', body: 'Move from concept-building Easy questions to exam-grade Hard problems at your own pace.' },
  { icon: 'checkCircle', title: 'Instant evaluation', body: 'Every attempt is scored with marking scheme, accuracy and a full explanation for each question.' },
  { icon: 'book', title: 'Explanation library', body: 'Every question ships with a worked explanation so you learn the method, not just the answer.' },
];

const TEST_FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'grid', title: 'Real CBT interface', body: 'Question palette, mark for review, save & next — exactly like the computer-based exam.' },
  { icon: 'clock', title: 'Live countdown timer', body: 'A working timer that auto-submits the paper the moment it hits zero.' },
  { icon: 'flag', title: 'Mark for review', body: 'Flag tough questions and come back to them without losing your place in the paper.' },
  { icon: 'chart', title: 'Instant result analysis', body: 'Score, accuracy, subject split, difficulty split and a question-by-question review.' },
];

const STEPS = [
  { n: '01', title: 'Pick your exam', body: 'Choose JEE, NEET, Class 10 or Class 12 and your focus subjects.' },
  { n: '02', title: 'Practise by topic', body: 'Select chapter, topic and difficulty, then attempt a focused set.' },
  { n: '03', title: 'Test yourself', body: 'Take chapter tests and full mock tests in a realistic timed environment.' },
  { n: '04', title: 'Fix your weak areas', body: 'Analytics flags weak chapters; your mistakes become a revision queue.' },
];

const BENEFITS = [
  'Personalised practice paths driven by your own accuracy data',
  'Every wrong answer is captured in a searchable mistake book',
  'Faculty-authored question bank with difficulty tagging',
  'Works beautifully on desktop, tablet and mobile',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="grid-noise relative overflow-hidden border-b border-ink-200">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="animate-rise">
            <Badge tone="brand" dot>JEE · NEET · Class 10 · Class 12</Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.4rem]">
              Practice Smarter.<br />
              <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">Prepare Better.</span><br />
              Perform Your Best.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
              A personalised practice and assessment platform for JEE, NEET, Class 10 and Class 12 students.
              Practise topic by topic, attempt real exam-pattern mock tests and turn every mistake into a
              measurable improvement.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" icon="bolt">Start Practicing</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" icon="quiz">Take a Mock Test</Button>
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs font-medium text-ink-500">{s.label}</dt>
                  <dd className="mt-0.5 text-xl font-bold tracking-tight text-ink-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero preview card */}
          <div className="animate-rise [animation-delay:120ms]">
            <Card className="overflow-hidden p-0 shadow-card">
              <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[11px] font-semibold text-ink-500">JEE Physics · Live Test</span>
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">42:16</span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-600">Question 12 of 50</span>
                  <Badge tone="warning">Medium</Badge>
                </div>
                <p className="mt-3 text-sm font-medium leading-relaxed text-ink-900">
                  A particle moves with a constant acceleration of 4 m/s² from rest. The distance covered by it
                  during the 5th second is
                </p>
                <ul className="mt-4 space-y-2">
                  {['18 m', '20 m', '36 m', '22 m'].map((opt, i) => (
                    <li
                      key={opt}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                        i === 0 ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-700'
                      }`}
                    >
                      <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-bold ${
                        i === 0 ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-300 text-ink-500'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                      {i === 0 && <Icon name="check" size={14} className="ml-auto text-brand-600" />}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Save & Next', 'Mark for Review', 'Clear'].map((b, i) => (
                    <span key={b} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                      i === 0 ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
                    }`}>{b}</span>
                  ))}
                </div>
              </div>
              <div className="border-t border-ink-200 px-5 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">Question palette</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span
                      key={i}
                      className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold ${
                        i === 11 ? 'bg-brand-600 text-white' : i % 7 === 3 ? 'bg-amber-100 text-amber-700' : i % 3 === 0 ? 'bg-emerald-500 text-white' : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* -------------------------- Exam categories -------------------------- */}
      <section className="border-b border-ink-200 bg-ink-50/60 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle
            eyebrow="Choose your path"
            title="Built around the exam you are preparing for"
            subtitle="Pick your goal and the entire platform adapts — subjects, chapters, difficulty bands and test patterns."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMS.map((exam: Exam) => {
              const meta = EXAM_META[exam];
              return (
                <Link key={exam} to="/register" className="group">
                  <Card className="h-full p-5" hover>
                    <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${meta.color} text-xl text-white shadow-sm`}>
                      {meta.icon}
                    </span>
                    <h3 className="mt-4 text-base font-bold text-ink-900">{exam}</h3>
                    <p className="mt-1 text-xs text-ink-500">{meta.tagline}</p>
                    <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                      Explore syllabus <Icon name="arrowRight" size={13} className="transition group-hover:translate-x-0.5" />
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------- Features ---------------------------- */}
      <section id="features" className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle
            eyebrow="Practice engine"
            title="Everything you need to build exam-grade accuracy"
            subtitle="Structured practice with granular filters, instant evaluation and explanations for every question."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRACTICE_FEATURES.map((f) => (
              <Card key={f.title} className="p-5" hover>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={f.icon} size={18} />
                </span>
                <h3 className="mt-4 text-sm font-bold text-ink-900">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- Mock tests ---------------------------- */}
      <section id="tests" className="border-y border-ink-200 bg-ink-900 py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <Badge tone="brand" dot>Mock test engine</Badge>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Attempt tests in a real computer-based exam environment
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-300">
              Topic tests, chapter tests, subject tests and full mock tests — each with a live timer,
              question palette, review marking and automatic submission.
            </p>
            <ul className="mt-7 grid gap-4 sm:grid-cols-2">
              {TEST_FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-200">
                    <Icon name={f.icon} size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{f.title}</h3>
                    <p className="mt-0.5 text-xs text-ink-400">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Card className="overflow-hidden border-0 p-0">
            <div className="border-b border-ink-200 px-5 py-3.5">
              <h3 className="text-sm font-bold text-ink-900">JEE Physics Mock Test 01</h3>
              <p className="text-xs text-ink-500">50 Questions · 60 Minutes · 200 Marks</p>
            </div>
            <CardBody className="space-y-4">
              {[
                { label: 'Physics', value: 82 },
                { label: 'Chemistry', value: 74 },
                { label: 'Mathematics', value: 61 },
              ].map((s) => (
                <ProgressBar key={s.label} value={s.value} label={s.label} />
              ))}
              <div className="grid grid-cols-3 gap-3 border-t border-ink-200 pt-4 text-center">
                {[['135', 'Score'], ['80%', 'Accuracy'], ['42:16', 'Time']].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-lg font-bold text-ink-900">{v}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">{l}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* ---------------------------- Analytics ---------------------------- */}
      <section id="analytics" className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle
            eyebrow="Performance analytics"
            title="Know exactly where you stand — and why"
            subtitle="Accuracy trends, chapter-level heat maps, time analysis and automatic weak-area detection."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-bold text-ink-900">Accuracy trend</h3>
              <p className="mb-2 text-xs text-ink-500">Last 8 attempts (sample data)</p>
              <AreaChart
                labels={['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']}
                series={[
                  { name: 'Accuracy', color: '#573ec9', values: [58, 63, 61, 70, 68, 74, 79, 82] },
                  { name: 'Score', color: '#14b8a6', values: [52, 55, 60, 64, 66, 70, 74, 78] },
                ]}
                suffix="%"
                max={100}
              />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold text-ink-900">Difficulty split</h3>
              <DonutChart
                segments={[
                  { label: 'Easy', value: 92, color: '#10b981' },
                  { label: 'Medium', value: 76, color: '#573ec9' },
                  { label: 'Hard', value: 43, color: '#f43f5e' },
                ]}
                centerValue="72%"
                centerLabel="Overall"
              />
            </Card>
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-bold text-ink-900">Chapter performance</h3>
              <HBarList items={[
                { label: 'Optics', value: 78 },
                { label: 'Organic Chemistry', value: 61 },
                { label: 'Integration', value: 56 },
                { label: 'Kinematics', value: 52 },
              ]} />
            </Card>
            <Card className="p-5 lg:col-span-2">
              <h3 className="mb-2 text-sm font-bold text-ink-900">Questions solved this week</h3>
              <BarChart labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} values={[42, 58, 35, 71, 64, 88, 53]} />
            </Card>
          </div>
        </div>
      </section>

      {/* ---------------------------- Mistake book ---------------------------- */}
      <section className="border-y border-ink-200 bg-ink-50/60 py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <Badge tone="danger" dot>Mistake book</Badge>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Every mistake becomes a revision task
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-600">
              Wrong answers are captured automatically with the answer you gave, the correct answer and the
              explanation. Re-attempt until you resolve them — the mistake book updates itself.
            </p>
            <ul className="mt-6 space-y-2.5">
              {['Auto-captured from every test and practice set', 'Re-attempt with immediate feedback', 'Resolved mistakes are archived automatically'].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <Icon name="checkCircle" size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">My Mistakes</h3>
              <Badge tone="danger">53 open</Badge>
            </div>
            <div className="space-y-3">
              {[
                { q: 'A solid sphere rolls without slipping. Fraction of KE that is rotational is', yours: '5/7', correct: '2/7', subject: 'Physics' },
                { q: '∫₀^(π/2) sin²x dx equals', yours: 'π/2', correct: 'π/4', subject: 'Mathematics' },
                { q: 'The IUPAC name of [Co(NH₃)₆]Cl₃ is', yours: 'Hexaamminecobalt(II) chloride', correct: 'Hexaamminecobalt(III) chloride', subject: 'Chemistry' },
              ].map((m) => (
                <div key={m.q} className="rounded-xl border border-ink-200 p-3.5">
                  <p className="text-xs font-medium text-ink-800">{m.q}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-rose-600">Your answer: <b>{m.yours}</b></span>
                    <span className="text-emerald-600">Correct: <b>{m.correct}</b></span>
                    <span className="text-ink-400">{m.subject}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ---------------------------- How it works ---------------------------- */}
      <section id="how" className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle eyebrow="How it works" title="Four steps from practice to performance" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <Card key={s.n} className="p-5">
                <span className="text-3xl font-extrabold text-brand-100">{s.n}</span>
                <h3 className="mt-2 text-sm font-bold text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{s.body}</p>
              </Card>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------- CTA ---------------------------- */}
      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-teal-600 px-6 py-12 text-center shadow-lift sm:px-12 sm:py-16">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Start practising in under a minute</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-brand-50 sm:text-base">
            Create a free account, or explore the live demo with a ready-made student, faculty or admin profile.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register"><Button size="lg" variant="secondary" icon="bolt">Create Free Account</Button></Link>
            <Link to="/login"><Button size="lg" className="bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25" variant="outline" icon="arrowRight">Explore Demo</Button></Link>
          </div>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-2 text-left sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-xs text-brand-50">
                <Icon name="check" size={15} className="mt-0.5 shrink-0" />{b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}

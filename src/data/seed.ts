import type { Attempt, AttemptAnswer, Database, Mistake, Question, Test } from '../lib/types';
import { SEED_USERS } from './users';
import { seedQuestions } from './questions';

/* Deterministic PRNG so the demo data is identical on every load. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Takes up to `count` unique ids, preserving order (never repeats a question). */
const pick = <T,>(arr: T[], _start: number, count: number): T[] => [...new Set(arr)].slice(0, count);

export function seedTests(questions: Question[]): Test[] {
  const byExam = (exam: string, subject?: string) =>
    questions.filter((q) => q.exam === exam && (!subject || q.subject === subject)).map((q) => q.id);

  const defs: Array<Omit<Test, 'questionIds' | 'id' | 'attempts'> & { id: string; ids: string[]; attempts: number }> = [
    {
      id: 'T-001', name: 'JEE Physics Mock Test 01', exam: 'JEE', subject: 'Physics', type: 'Full Mock Test',
      duration: 60, totalMarks: 200, difficulty: 'Medium', status: 'Published', createdBy: 'F-001', createdAt: '2025-11-04',
      ids: byExam('JEE', 'Physics'), attempts: 412,
    },
    {
      id: 'T-002', name: 'Kinematics Chapter Test', exam: 'JEE', subject: 'Physics', type: 'Chapter Test',
      duration: 30, totalMarks: 120, difficulty: 'Medium', status: 'Published', createdBy: 'F-001', createdAt: '2025-11-10',
      ids: byExam('JEE', 'Physics').filter((_, i) => i % 2 === 0).concat(byExam('JEE', 'Physics')), attempts: 268,
    },
    {
      id: 'T-003', name: 'Integration Mastery Test', exam: 'JEE', subject: 'Mathematics', type: 'Chapter Test',
      duration: 45, totalMarks: 160, difficulty: 'Hard', status: 'Published', createdBy: 'F-002', createdAt: '2025-11-18',
      ids: byExam('JEE', 'Mathematics'), attempts: 197,
    },
    {
      id: 'T-004', name: 'Chemical Bonding Topic Test', exam: 'JEE', subject: 'Chemistry', type: 'Topic Test',
      duration: 20, totalMarks: 80, difficulty: 'Easy', status: 'Published', createdBy: 'F-003', createdAt: '2025-11-22',
      ids: byExam('JEE', 'Chemistry'), attempts: 154,
    },
    {
      id: 'T-005', name: 'JEE Full Mock Test 01', exam: 'JEE', subject: 'All Subjects', type: 'Full Mock Test',
      duration: 180, totalMarks: 300, difficulty: 'Hard', status: 'Published', createdBy: 'F-001', createdAt: '2025-12-01',
      ids: byExam('JEE'), attempts: 731,
    },
    {
      id: 'T-006', name: 'NEET Biology Mock Test 01', exam: 'NEET', subject: 'Botany', type: 'Subject Test',
      duration: 45, totalMarks: 180, difficulty: 'Medium', status: 'Published', createdBy: 'F-003', createdAt: '2025-12-06',
      ids: byExam('NEET', 'Botany').concat(byExam('NEET', 'Zoology')), attempts: 322,
    },
    {
      id: 'T-007', name: 'NEET Full Mock Test 01', exam: 'NEET', subject: 'All Subjects', type: 'Full Mock Test',
      duration: 200, totalMarks: 720, difficulty: 'Medium', status: 'Published', createdBy: 'F-003', createdAt: '2025-12-12',
      ids: byExam('NEET'), attempts: 604,
    },
    {
      id: 'T-008', name: 'Class 10 Science Half Yearly', exam: 'Class 10', subject: 'Science', type: 'Subject Test',
      duration: 120, totalMarks: 80, difficulty: 'Medium', status: 'Published', createdBy: 'F-003', createdAt: '2025-12-18',
      ids: byExam('Class 10', 'Science'), attempts: 288,
    },
    {
      id: 'T-009', name: 'Class 10 Mathematics Chapter Test', exam: 'Class 10', subject: 'Mathematics', type: 'Chapter Test',
      duration: 40, totalMarks: 40, difficulty: 'Easy', status: 'Published', createdBy: 'F-002', createdAt: '2026-01-03',
      ids: byExam('Class 10', 'Mathematics'), attempts: 176,
    },
    {
      id: 'T-010', name: 'Class 12 Physics Board Pattern', exam: 'Class 12', subject: 'Physics', type: 'Subject Test',
      duration: 180, totalMarks: 70, difficulty: 'Medium', status: 'Published', createdBy: 'F-001', createdAt: '2026-01-08',
      ids: byExam('Class 12', 'Physics'), attempts: 241,
    },
    {
      id: 'T-011', name: 'Class 12 Chemistry Unit Test', exam: 'Class 12', subject: 'Chemistry', type: 'Chapter Test',
      duration: 60, totalMarks: 50, difficulty: 'Medium', status: 'Published', createdBy: 'F-003', createdAt: '2026-01-15',
      ids: byExam('Class 12', 'Chemistry'), attempts: 132,
    },
    {
      id: 'T-012', name: 'Projectile Motion Topic Test', exam: 'JEE', subject: 'Physics', type: 'Topic Test',
      duration: 25, totalMarks: 100, difficulty: 'Hard', status: 'Draft', createdBy: 'F-001', createdAt: '2026-01-21',
      ids: byExam('JEE', 'Physics').concat(byExam('JEE', 'Physics')), attempts: 0,
    },
  ];

  return defs.map(({ ids, ...rest }) => {
    const questionIds = pick(ids, 0, Math.min(ids.length, rest.type === 'Full Mock Test' ? 50 : rest.type === 'Topic Test' ? 10 : 20));
    return {
      ...rest,
      questionIds,
      // Keep declared marks consistent with the engine's +4 per question scheme.
      totalMarks: questionIds.length * 4,
    };
  });
}

const DAY = 86400000;

function makeAttempt(args: {
  id: string; userId: string; test: Test; mode: Attempt['mode']; daysAgo: number;
  accuracy: number; seed: number; questionMap: Record<string, Question>;
}): Attempt {
  const { id, userId, test, mode, daysAgo, accuracy, seed, questionMap } = args;
  const rand = mulberry32(seed);
  const questionIds = test.questionIds;
  const answers: Record<string, AttemptAnswer> = {};
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  questionIds.forEach((qid) => {
    const q = questionMap[qid];
    const r = rand();
    if (r > accuracy + 0.12) {
      answers[qid] = { selected: null, correct: false, timeSpent: Math.round(4 + rand() * 12), status: 'skipped' };
      skipped += 1;
    } else {
      const isCorrect = rand() < accuracy + 0.08;
      const wrongIndex = q ? ((q.answer as number) + 1 + Math.floor(rand() * 3)) % 4 : 1;
      answers[qid] = {
        selected: isCorrect ? (q ? q.answer : 0) : wrongIndex,
        correct: isCorrect,
        timeSpent: Math.round(20 + rand() * 95),
        status: 'answered',
      };
      if (isCorrect) correct += 1;
      else wrong += 1;
    }
  });

  const marks = questionIds.reduce((s, qid) => s + (questionMap[qid]?.marks ?? 4), 0);
  const neg = questionIds.reduce((s, qid) => s + (questionMap[qid]?.negative ?? 1), 0);
  const score = correct * (marks / questionIds.length) - wrong * (neg / questionIds.length);
  const timeTaken = Math.round(Object.values(answers).reduce((s, a) => s + a.timeSpent, 0));

  return {
    id,
    userId,
    testId: test.id,
    testName: test.name,
    mode,
    questionIds,
    answers,
    score: Math.round(score),
    maxScore: marks,
    correct,
    wrong,
    skipped,
    accuracy: questionIds.length ? Math.round(((correct + wrong) / (correct + wrong + skipped)) * 100) : 0,
    timeTaken,
    submittedAt: new Date(Date.now() - daysAgo * DAY - Math.floor(rand() * 6) * 3600000).toISOString(),
  };
}

export function seedAttempts(tests: Test[], questions: Question[]): Attempt[] {
  const questionMap: Record<string, Question> = {};
  questions.forEach((q) => { questionMap[q.id] = q; });

  const students = SEED_USERS.filter((u) => u.role === 'student' && (u.baseline?.tests ?? 0) > 0);
  const attempts: Attempt[] = [];
  let n = 0;

  students.forEach((student, si) => {
    const total = Math.min(student.baseline?.tests ?? 0, 8);
    const baseAccuracy = (student.baseline?.accuracy ?? 70) / 100;
    for (let i = 0; i < total; i++) {
      // Older attempts are slightly weaker → visible improvement trend.
      const progress = total === 1 ? 1 : i / (total - 1);
      const acc = Math.min(0.95, Math.max(0.35, baseAccuracy - 0.14 + progress * 0.2 + (si % 3) * 0.01));
      const test = tests[(si * 3 + i) % tests.length];
      n += 1;
      attempts.push(makeAttempt({
        id: `AT-${String(n).padStart(4, '0')}`,
        userId: student.id,
        test,
        mode: i === total - 1 ? 'test' : i % 3 === 0 ? 'practice' : 'test',
        daysAgo: (total - i) * 4 + si,
        accuracy: acc,
        seed: 1000 + n * 17,
        questionMap,
      }));
    }
  });

  return attempts;
}

export function seedMistakes(attempts: Attempt[]): Mistake[] {
  const mistakes: Mistake[] = [];
  const seen = new Set<string>();
  let n = 0;
  [...attempts]
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
    .forEach((a) => {
      Object.entries(a.answers).forEach(([qid, ans]) => {
        const key = `${a.userId}|${qid}`;
        if (!ans.correct && !seen.has(key) && mistakes.filter((m) => m.userId === a.userId).length < 12) {
          seen.add(key);
          n += 1;
          mistakes.push({
            id: `M-${String(n).padStart(4, '0')}`,
            userId: a.userId,
            questionId: qid,
            wrongAnswer: ans.selected,
            attemptCount: 1,
            resolved: n % 5 === 0,
            createdAt: a.submittedAt,
            resolvedAt: n % 5 === 0 ? a.submittedAt : undefined,
            sourceTest: a.testName,
          });
        }
      });
    });
  return mistakes;
}

export function createSeedDatabase(): Database {
  const questions = seedQuestions();
  const tests = seedTests(questions);
  const attempts = seedAttempts(tests, questions);
  const mistakes = seedMistakes(attempts);
  return {
    users: SEED_USERS,
    questions,
    tests,
    attempts,
    mistakes,
    curriculum: [],
    settings: { platformName: 'Astra Prep', weakAreaThreshold: 60, targetTimePerQuestion: 60, maintenance: false },
  };
}

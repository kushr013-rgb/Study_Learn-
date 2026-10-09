/**
 * Domain model for the Astra Prep prototype.
 * These types mirror what a future REST API would return, so the service layer
 * can be swapped from localStorage-backed mock data to real HTTP calls without
 * touching the UI.
 */

export type Role = 'student' | 'faculty' | 'admin';
export type Exam = 'JEE' | 'NEET' | 'Class 10' | 'Class 12' | 'MH-CET';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionStatus = 'Draft' | 'Published' | 'Archived';
export type UserStatus = 'verified' | 'pending' | 'rejected' | 'inactive';
export type TestType = 'Topic Test' | 'Chapter Test' | 'Subject Test' | 'Full Mock Test';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: Role;
  exam?: Exam;
  examId?: string;
  classLevel?: string;
  subjects?: string[];
  status: UserStatus;
  createdAt: string;
  /** Seed values so a fresh demo account never looks empty. */
  baseline?: { solved: number; tests: number; accuracy: number; score: number };
  examProgress?: Record<string, { solved: number; tests: number; accuracy: number; score: number }>;
  streak?: number;
}

export interface Question {
  id: string;
  exam: Exam;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: Difficulty;
  type: 'MCQ' | 'Numerical';
  text: string;
  options: string[];
  /** Index of the correct option (MCQ) or the numeric answer string (Numerical). */
  answer: number | string;
  marks: number;
  negative: number;
  explanation: string;
  status: QuestionStatus;
  createdBy: string;
  createdAt: string;
  usage: number;
}

export interface Test {
  id: string;
  name: string;
  exam: Exam;
  subject: string;
  type: TestType;
  duration: number; // minutes
  totalMarks: number;
  difficulty: Difficulty;
  questionIds: string[];
  status: 'Draft' | 'Published' | 'Archived';
  createdBy: string;
  createdAt: string;
  attempts: number;
}

export interface AttemptAnswer {
  selected: number | string | null;
  correct: boolean;
  timeSpent: number; // seconds
  status: 'answered' | 'skipped' | 'marked';
}

export interface Attempt {
  id: string;
  userId: string;
  testId: string;
  testName: string;
  mode: 'test' | 'practice' | 'mistake' | 'daily';
  questionIds: string[];
  answers: Record<string, AttemptAnswer>;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  timeTaken: number; // seconds
  submittedAt: string;
}

export interface Mistake {
  id: string;
  userId: string;
  questionId: string;
  wrongAnswer: number | string | null;
  attemptCount: number;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
  sourceTest?: string;
}

/**
 * Curriculum entries created from inside the app (Admin/Faculty → Curriculum).
 * These are merged on top of the built-in academic taxonomy, so the syllabus can
 * grow without anyone editing a source file.
 */
export interface CurriculumEntry {
  id: string;
  exam: Exam;
  subject: string;
  chapter?: string;
  topic?: string;
  createdBy: string;
  createdAt: string;
}

export interface Database {
  users: User[];
  questions: Question[];
  tests: Test[];
  attempts: Attempt[];
  mistakes: Mistake[];
  curriculum: CurriculumEntry[];
  settings: { platformName: string; weakAreaThreshold: number; targetTimePerQuestion: number; maintenance: boolean };
}

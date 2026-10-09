import type { Difficulty, Exam, Question, Test, TestType } from '../lib/types';
import { getDB, mutate, uid } from './db';
import { questionService } from './questionService';

export interface TestFilters {
  exam?: Exam | 'All';
  subject?: string | 'All';
  type?: TestType | 'All';
  difficulty?: Difficulty | 'All';
  status?: Test['status'] | 'All';
  search?: string;
}

export interface TestDraft {
  name: string;
  exam: Exam;
  subject: string;
  type: TestType;
  duration: number;
  difficulty: Difficulty;
  questionIds: string[];
}

export const testService = {
  list(filters: TestFilters = {}): Test[] {
    return getDB().tests.filter((t) => {
      if (filters.exam && filters.exam !== 'All' && t.exam !== filters.exam) return false;
      if (filters.subject && filters.subject !== 'All' && t.subject !== filters.subject) return false;
      if (filters.type && filters.type !== 'All' && t.type !== filters.type) return false;
      if (filters.difficulty && filters.difficulty !== 'All' && t.difficulty !== filters.difficulty) return false;
      if (filters.status && filters.status !== 'All' && t.status !== filters.status) return false;
      if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  },

  getById(id: string): Test | undefined {
    return getDB().tests.find((t) => t.id === id);
  },

  questions(testId: string, exam?: Exam): Question[] {
    const t = testService.getById(testId);
    if (!t || (exam && t.exam !== exam)) return [];
    return t.questionIds
      .map((id) => questionService.getById(id))
      .filter((q): q is Question => Boolean(q && q.exam === t.exam && q.status === 'Published'));
  },

  stats() {
    const all = getDB().tests;
    return {
      total: all.length,
      published: all.filter((t) => t.status === 'Published').length,
      draft: all.filter((t) => t.status === 'Draft').length,
      attempts: all.reduce((s, t) => s + t.attempts, 0),
    };
  },

  /** Random selection honouring an easy / medium / hard composition. */
  generateRandom(opts: { exam: Exam; subject: string; easy: number; medium: number; hard: number }): string[] {
    const ids = (d: Difficulty, n: number): string[] => {
      if (n <= 0) return [];
      const pool = questionService.published({ exam: opts.exam, subject: opts.subject === 'All Subjects' ? 'All' : opts.subject, difficulty: d });
      if (pool.length === 0) return [];
      const out: string[] = [];
      for (let i = 0; i < n; i++) out.push(pool[(i * 7 + d.length) % pool.length].id);
      return out;
    };
    return [...ids('Easy', opts.easy), ...ids('Medium', opts.medium), ...ids('Hard', opts.hard)];
  },

  create(draft: TestDraft, createdBy: string): Test {
    const marks = draft.questionIds.length * 4;
    const test: Test = {
      ...draft,
      id: uid('T'),
      totalMarks: marks,
      status: 'Draft',
      createdBy,
      createdAt: new Date().toISOString().slice(0, 10),
      attempts: 0,
    };
    mutate((d) => { d.tests.unshift(test); });
    return test;
  },

  update(id: string, patch: Partial<Test>): void {
    mutate((d) => {
      const t = d.tests.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
    });
  },

  setStatus(id: string, status: Test['status']): void {
    testService.update(id, { status });
  },

  remove(id: string): void {
    mutate((d) => { d.tests = d.tests.filter((t) => t.id !== id); });
  },
};

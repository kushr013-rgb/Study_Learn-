import type { Difficulty, Exam, Question, QuestionStatus } from '../lib/types';
import { getDB, mutate, uid } from './db';
import { EXAMS } from '../data/taxonomy';

export interface QuestionFilters {
  exam?: Exam | 'All';
  subject?: string | 'All';
  chapter?: string | 'All';
  topic?: string | 'All';
  difficulty?: Difficulty | 'All';
  status?: QuestionStatus | 'All';
  createdBy?: string | 'All';
  search?: string;
}

export type QuestionInput = Omit<Question, 'id' | 'usage' | 'createdAt'>;

const matches = (q: Question, f: QuestionFilters): boolean => {
  if (f.exam && f.exam !== 'All' && q.exam !== f.exam) return false;
  if (f.subject && f.subject !== 'All' && q.subject !== f.subject) return false;
  if (f.chapter && f.chapter !== 'All' && q.chapter !== f.chapter) return false;
  if (f.topic && f.topic !== 'All' && q.topic !== f.topic) return false;
  if (f.difficulty && f.difficulty !== 'All' && q.difficulty !== f.difficulty) return false;
  if (f.status && f.status !== 'All' && q.status !== f.status) return false;
  if (f.createdBy && f.createdBy !== 'All' && q.createdBy !== f.createdBy) return false;
  if (f.search) {
    const s = f.search.toLowerCase();
    if (!`${q.text} ${q.chapter} ${q.topic} ${q.subject} ${q.id}`.toLowerCase().includes(s)) return false;
  }
  return true;
};

export const questionService = {
  list(filters: QuestionFilters = {}): Question[] {
    const db = getDB();
    return db.questions.filter((q) => matches(q, filters));
  },

  /** Only questions a student can actually attempt. */
  published(filters: QuestionFilters = {}): Question[] {
    return questionService.list({ ...filters, status: 'Published' });
  },

  getById(id: string): Question | undefined {
    return getDB().questions.find((q) => q.id === id);
  },

  stats() {
    const all = getDB().questions;
    return {
      total: all.length,
      published: all.filter((q) => q.status === 'Published').length,
      draft: all.filter((q) => q.status === 'Draft').length,
      archived: all.filter((q) => q.status === 'Archived').length,
      easy: all.filter((q) => q.difficulty === 'Easy').length,
      medium: all.filter((q) => q.difficulty === 'Medium').length,
      hard: all.filter((q) => q.difficulty === 'Hard').length,
      byExam: EXAMS.map((e) => ({
        exam: e,
        count: all.filter((q) => q.exam === e).length,
      })),
    };
  },

  /** Chapters with the number of published questions (drives practice selector). */
  chapterCounts(exam: Exam, subject: string) {
    const pool = questionService.published({ exam, subject });
    const map = new Map<string, number>();
    pool.forEach((q) => map.set(q.chapter, (map.get(q.chapter) ?? 0) + 1));
    return [...map.entries()]
      .map(([chapter, count]) => ({ chapter, count }))
      .sort((a, b) => b.count - a.count);
  },

  topicCounts(exam: Exam, subject: string, chapter: string) {
    const pool = questionService.published({ exam, subject, chapter });
    const map = new Map<string, number>();
    pool.forEach((q) => map.set(q.topic, (map.get(q.topic) ?? 0) + 1));
    return [...map.entries()].map(([topic, count]) => ({ topic, count }));
  },

  /** Builds a practice set. Falls back to related questions when a filter is too narrow. */
  practiceSet(opts: {
    exam: Exam; subject: string; chapter?: string; topic?: string;
    difficulty: Difficulty | 'Mixed'; count: number;
  }): Question[] {
    const base = questionService.published({ exam: opts.exam, subject: opts.subject, chapter: opts.chapter });
    let pool = opts.topic && opts.topic !== 'All Topics' ? base.filter((q) => q.topic === opts.topic) : base;
    if (pool.length === 0) pool = base;
    if (pool.length === 0) pool = questionService.published({ exam: opts.exam });
    if (opts.difficulty !== 'Mixed') {
      const filtered = pool.filter((q) => q.difficulty === opts.difficulty);
      if (filtered.length >= Math.min(3, opts.count)) pool = filtered;
    }
    // Rotate so repeated practice shows different questions.
    const start = new Date().getDate() % Math.max(1, pool.length);
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    return rotated.slice(0, opts.count);
  },

  create(input: QuestionInput): Question {
    const q: Question = {
      ...input,
      id: uid('Q'),
      usage: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    mutate((d) => { d.questions.unshift(q); });
    return q;
  },

  update(id: string, patch: Partial<Question>): void {
    mutate((d) => {
      const q = d.questions.find((x) => x.id === id);
      if (q) Object.assign(q, patch);
    });
  },

  setStatus(id: string, status: QuestionStatus): void {
    questionService.update(id, { status });
  },

  remove(id: string): void {
    mutate((d) => {
      d.questions = d.questions.filter((q) => q.id !== id);
      d.tests = d.tests.map((t) => ({ ...t, questionIds: t.questionIds.filter((qid) => qid !== id) }));
    });
  },

  registerUsage(ids: string[]): void {
    mutate((d) => {
      ids.forEach((id) => {
        const q = d.questions.find((x) => x.id === id);
        if (q) q.usage += 1;
      });
    });
  },
};

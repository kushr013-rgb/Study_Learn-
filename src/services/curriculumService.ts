import type { CurriculumEntry, Exam } from '../lib/types';
import { getDB, mutate, uid } from './db';
import { CHAPTERS, SUBJECTS, TOPICS, EXAMS } from '../data/taxonomy';

/* ---------------------------------------------------------------------------
 * Curriculum service.
 *
 * The built-in academic taxonomy (src/data/taxonomy.ts) is the starting point.
 * Anything Admin or Faculty adds through the Curriculum screen is stored in the
 * database and merged on top — so the syllabus is fully editable from the UI and
 * nobody ever has to touch a source file.
 * ------------------------------------------------------------------------- */

const uniqSorted = (values: string[]): string[] =>
  [...new Set(values.filter((v) => v && v.trim()))].sort((a, b) => a.localeCompare(b));

export const curriculumService = {
  exams(): Exam[] {
    return EXAMS;
  },

  /** Built-in subjects + subjects introduced by curriculum entries or questions. */
  subjects(exam: Exam): string[] {
    const db = getDB();
    return uniqSorted([
      ...(SUBJECTS[exam] ?? []),
      ...db.curriculum.filter((c) => c.exam === exam).map((c) => c.subject),
      ...db.questions.filter((q) => q.exam === exam).map((q) => q.subject),
    ]);
  },

  chapters(exam: Exam, subject: string): string[] {
    const db = getDB();
    return uniqSorted([
      ...(CHAPTERS[`${exam}|${subject}`] ?? []),
      ...db.curriculum.filter((c) => c.exam === exam && c.subject === subject && c.chapter).map((c) => c.chapter!),
      ...db.questions.filter((q) => q.exam === exam && q.subject === subject).map((q) => q.chapter),
    ]);
  },

  topics(exam: Exam, subject: string, chapter: string): string[] {
    const db = getDB();
    const builtIn = TOPICS[chapter] ?? ['Concept Review', 'Formula Application', 'Previous Year Questions', 'Advanced Problems'];
    return uniqSorted([
      ...builtIn,
      ...db.curriculum
        .filter((c) => c.exam === exam && c.subject === subject && c.chapter === chapter && c.topic)
        .map((c) => c.topic!),
      ...db.questions
        .filter((q) => q.exam === exam && q.subject === subject && q.chapter === chapter)
        .map((q) => q.topic),
    ]);
  },

  /** Adds a subject / chapter / topic. Returns false when it already exists. */
  add(entry: { exam: Exam; subject: string; chapter?: string; topic?: string }, createdBy: string): boolean {
    const subject = entry.subject.trim();
    const chapter = entry.chapter?.trim();
    const topic = entry.topic?.trim();
    if (!subject) return false;

    const existing = topic
      ? curriculumService.topics(entry.exam, subject, chapter ?? '')
      : chapter
        ? curriculumService.chapters(entry.exam, subject)
        : curriculumService.subjects(entry.exam);
    const candidate = topic ?? chapter ?? subject;
    if (existing.some((v) => v.toLowerCase() === candidate.toLowerCase())) return false;

    const record: CurriculumEntry = {
      id: uid('CUR'),
      exam: entry.exam,
      subject,
      chapter,
      topic,
      createdBy,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    mutate((d) => { d.curriculum.unshift(record); });
    return true;
  },

  /** Custom entries only — built-in taxonomy cannot be deleted. */
  custom(): CurriculumEntry[] {
    return getDB().curriculum;
  },

  remove(id: string): void {
    mutate((d) => { d.curriculum = d.curriculum.filter((c) => c.id !== id); });
  },

  /** Question counts per node, used by the curriculum explorer. */
  counts(exam: Exam, subject?: string, chapter?: string): number {
    return getDB().questions.filter((q) =>
      q.exam === exam &&
      (!subject || q.subject === subject) &&
      (!chapter || q.chapter === chapter)).length;
  },
};

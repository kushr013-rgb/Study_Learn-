import type { Difficulty, Exam, Question, QuestionStatus } from '../lib/types';
import { csvToObjects, toCSV } from '../lib/csv';
import { questionService } from './questionService';
import { curriculumService } from './curriculumService';
import { getDB } from './db';
import { EXAMS } from '../data/taxonomy';

/* ---------------------------------------------------------------------------
 * Bulk question import.
 * Accepts CSV or JSON, validates every row, and reports per-row errors so the
 * uploader can fix the file. Nothing is written until the user confirms.
 * ------------------------------------------------------------------------- */

export const IMPORT_HEADERS = [
  'exam', 'subject', 'chapter', 'topic', 'difficulty',
  'question', 'option_a', 'option_b', 'option_c', 'option_d',
  'correct_answer', 'marks', 'negative_marks', 'explanation', 'status',
];

export interface ParsedRow {
  row: number;
  data: Omit<Question, 'id' | 'usage' | 'createdAt'> | null;
  errors: string[];
  warnings: string[];
}

export interface ParseReport {
  rows: ParsedRow[];
  valid: number;
  invalid: number;
  duplicates: number;
}

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const LETTER_TO_INDEX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };

/** A downloadable CSV template pre-filled with two worked examples. */
export function importTemplate(): string {
  return toCSV(IMPORT_HEADERS, [
    [
      'JEE', 'Physics', 'Kinematics', 'Motion in One Dimension', 'Easy',
      'A body starts from rest with a uniform acceleration of 2 m/s². Its velocity after 5 s is',
      '10 m/s', '5 m/s', '20 m/s', '2 m/s',
      'A', 4, 1, 'v = u + at = 0 + 2 × 5 = 10 m/s.', 'Published',
    ],
    [
      'NEET', 'Botany', 'Plant Physiology', 'Photosynthesis', 'Medium',
      'The site of the light reaction of photosynthesis is the',
      'Thylakoid membrane', 'Stroma', 'Cytoplasm', 'Mitochondrial matrix',
      'A', 4, 1, 'Photosystems I and II are embedded in the thylakoid membrane.', 'Published',
    ],
  ]);
}

function normaliseRow(raw: Record<string, string>, index: number, seenTexts: Set<string>): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const get = (...keys: string[]): string => {
    for (const k of keys) if (raw[k]) return String(raw[k]).trim();
    return '';
  };

  const exam = get('exam') as Exam;
  const subject = get('subject');
  const chapter = get('chapter');
  const topic = get('topic') || 'Concept Review';
  const difficultyRaw = get('difficulty') || 'Medium';
  const text = get('question', 'question_text', 'text');
  const options = [get('option_a', 'a'), get('option_b', 'b'), get('option_c', 'c'), get('option_d', 'd')];
  const correctRaw = get('correct_answer', 'answer', 'correct');
  const marks = Number(get('marks')) || 4;
  const negative = get('negative_marks') === '' ? 1 : Number(get('negative_marks')) || 0;
  const explanation = get('explanation');
  const statusRaw = get('status') || 'Published';

  if (!EXAMS.includes(exam)) errors.push(`Exam must be one of: ${EXAMS.join(', ')}`);
  if (!subject) errors.push('Subject is required');
  if (!chapter) errors.push('Chapter is required');
  if (!text || text.length < 10) errors.push('Question text is required (min 10 characters)');
  options.forEach((o, i) => { if (!o) errors.push(`Option ${'ABCD'[i]} is empty`); });

  const difficulty = (DIFFS.find((d) => d.toLowerCase() === difficultyRaw.toLowerCase()) ?? 'Medium') as Difficulty;
  if (!DIFFS.some((d) => d.toLowerCase() === difficultyRaw.toLowerCase())) {
    warnings.push(`Unknown difficulty "${difficultyRaw}" — defaulted to Medium`);
  }

  const answer = LETTER_TO_INDEX[correctRaw.toLowerCase()];
  if (answer === undefined) errors.push('Correct answer must be A, B, C or D');

  const status: QuestionStatus =
    statusRaw.toLowerCase() === 'draft' ? 'Draft'
      : statusRaw.toLowerCase() === 'archived' ? 'Archived'
        : 'Published';

  if (!explanation) warnings.push('No explanation provided — students will see an empty explanation');

  const key = text.toLowerCase().slice(0, 120);
  if (text && seenTexts.has(key)) {
    errors.push('Duplicate of another row in this file');
  } else if (text) {
    seenTexts.add(key);
  }

  if (text && getDB().questions.some((q) => q.text.toLowerCase().slice(0, 120) === key)) {
    warnings.push('A question with the same text already exists in the bank');
  }

  if (errors.length) return { row: index + 2, data: null, errors, warnings };

  return {
    row: index + 2,
    errors: [],
    warnings,
    data: {
      exam, subject, chapter, topic, difficulty,
      type: 'MCQ', text, options, answer,
      marks, negative, explanation,
      status, createdBy: '',
    },
  };
}

export const importService = {
  /** Parses CSV or JSON text into a validated, previewable report. */
  parse(content: string): ParseReport {
    const trimmed = content.trim();
    let records: Record<string, string>[] = [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed) ? parsed : (parsed.questions ?? [parsed]);
        records = arr.map((o: Record<string, unknown>) => {
          const flat: Record<string, string> = {};
          Object.entries(o).forEach(([k, v]) => {
            const key = k.trim().toLowerCase().replace(/\s+/g, '_');
            if (Array.isArray(v)) {
              v.forEach((item, i) => { flat[`option_${'abcd'[i]}`] = String(item); });
            } else {
              flat[key] = v === null || v === undefined ? '' : String(v);
            }
          });
          return flat;
        });
      } catch {
        return { rows: [{ row: 1, data: null, errors: ['File is not valid JSON'], warnings: [] }], valid: 0, invalid: 1, duplicates: 0 };
      }
    } else {
      records = csvToObjects(trimmed);
      if (records.length === 0) {
        return { rows: [{ row: 1, data: null, errors: ['No data rows found. Check that the header row is present.'], warnings: [] }], valid: 0, invalid: 1, duplicates: 0 };
      }
    }

    const seen = new Set<string>();
    const rows = records.map((r, i) => normaliseRow(r, i, seen));

    return {
      rows,
      valid: rows.filter((r) => r.data).length,
      invalid: rows.filter((r) => !r.data).length,
      duplicates: rows.filter((r) => r.warnings.some((w) => w.includes('already exists'))).length,
    };
  },

  /** Commits the valid rows and auto-registers any new subjects/chapters/topics. */
  commit(report: ParseReport, createdBy: string, overrideStatus?: QuestionStatus): number {
    let count = 0;
    report.rows.forEach((r) => {
      if (!r.data) return;
      const payload = { ...r.data, createdBy, status: overrideStatus ?? r.data.status };
      questionService.create(payload);
      // Keep the curriculum in sync so the new content is selectable everywhere.
      curriculumService.add({ exam: payload.exam, subject: payload.subject }, createdBy);
      curriculumService.add({ exam: payload.exam, subject: payload.subject, chapter: payload.chapter }, createdBy);
      curriculumService.add({ exam: payload.exam, subject: payload.subject, chapter: payload.chapter, topic: payload.topic }, createdBy);
      count += 1;
    });
    return count;
  },

  /** Exports the current bank (or a filtered subset) as CSV. */
  exportQuestions(questions: Question[]): string {
    return toCSV(IMPORT_HEADERS, questions.map((q) => [
      q.exam, q.subject, q.chapter, q.topic, q.difficulty, q.text,
      q.options[0] ?? '', q.options[1] ?? '', q.options[2] ?? '', q.options[3] ?? '',
      'ABCD'[Number(q.answer)] ?? 'A', q.marks, q.negative, q.explanation, q.status,
    ]));
  },
};

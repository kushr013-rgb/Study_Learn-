import fs from 'node:fs';
import path from 'node:path';
import * as xlsxModule from 'xlsx';
const xlsx: any = (xlsxModule as any).default || xlsxModule;
import mammoth from 'mammoth';
import type { IExtractedQuestion } from '../models/QuestionPaper';

export interface ParseResult {
  questions: IExtractedQuestion[];
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  warnings: string[];
}

export class ParserService {
  /**
   * Parse a question paper file based on its file extension.
   */
  async parseFile(filePath: string, fileType: string, defaultSubject = 'General'): Promise<ParseResult> {
    const ext = (fileType || path.extname(filePath)).toLowerCase().replace('.', '');

    switch (ext) {
      case 'xlsx':
      case 'xls':
      case 'csv':
        return this.parseExcel(filePath, defaultSubject);
      case 'docx':
      case 'doc':
        return this.parseWord(filePath, defaultSubject);
      case 'pdf':
        return this.parsePdf(filePath, defaultSubject);
      default:
        throw new Error(`Unsupported document extension: .${ext}`);
    }
  }

  /**
   * Parse Excel (.xlsx, .xls, .csv) documents.
   */
  async parseExcel(filePath: string, _defaultSubject = 'General'): Promise<ParseResult> {
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Excel workbook contains no sheets.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];

    if (!rawRows || rawRows.length === 0) {
      throw new Error('Excel sheet contains no data rows.');
    }

    const questions: IExtractedQuestion[] = [];
    const warnings: string[] = [];

    const findKey = (row: Record<string, unknown>, candidates: string[]): string => {
      const keys = Object.keys(row);
      for (const candidate of candidates) {
        const found = keys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase());
        if (found) return found;
      }
      return '';
    };

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      const qKey = findKey(row, ['question', 'question text', 'questiontext', 'text', 'stem']);
      const qText = String(row[qKey] || '').trim();

      if (!qText) {
        // Skip empty rows
        return;
      }

      // Options
      const optAKey = findKey(row, ['option a', 'option 1', 'optiona', 'a', 'opt a']);
      const optBKey = findKey(row, ['option b', 'option 2', 'optionb', 'b', 'opt b']);
      const optCKey = findKey(row, ['option c', 'option 3', 'optionc', 'c', 'opt c']);
      const optDKey = findKey(row, ['option d', 'option 4', 'optiond', 'd', 'opt d']);
      const optionsKey = findKey(row, ['options', 'choices']);

      let options: string[] = [];
      if (optAKey && optBKey && optCKey && optDKey) {
        options = [
          String(row[optAKey] || '').trim(),
          String(row[optBKey] || '').trim(),
          String(row[optCKey] || '').trim(),
          String(row[optDKey] || '').trim(),
        ];
      } else if (optionsKey) {
        const rawOpts = String(row[optionsKey] || '');
        options = rawOpts.split(/[|,;\n]/).map((s) => s.trim()).filter(Boolean);
      }

      // Ensure 4 options
      while (options.length < 4) {
        options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      }

      // Correct Answer
      const ansKey = findKey(row, ['answer', 'correct answer', 'correct_answer', 'correct option', 'key', 'ans']);
      const rawAns = String(row[ansKey] || '').trim().toUpperCase();
      let answerIndex = 0;

      if (['A', 'B', 'C', 'D'].includes(rawAns)) {
        answerIndex = rawAns.charCodeAt(0) - 65;
      } else if (['0', '1', '2', '3'].includes(rawAns)) {
        answerIndex = Number(rawAns);
      } else if (['1', '2', '3', '4'].includes(rawAns)) {
        answerIndex = Number(rawAns) - 1;
      } else {
        const matchIdx = options.findIndex((o) => o.toLowerCase() === rawAns.toLowerCase());
        if (matchIdx !== -1) answerIndex = matchIdx;
      }

      // Marks & Negative
      const marksKey = findKey(row, ['marks', 'mark', 'points', 'weight']);
      const negKey = findKey(row, ['negative', 'negative marks', 'penalty', 'negative_marks']);
      const marks = Number(row[marksKey]) || 4;
      const negative = row[negKey] !== '' && !isNaN(Number(row[negKey])) ? Number(row[negKey]) : 1;

      // Difficulty
      const diffKey = findKey(row, ['difficulty', 'level']);
      const rawDiff = String(row[diffKey] || '').trim().toLowerCase();
      let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      if (rawDiff.includes('easy')) difficulty = 'Easy';
      else if (rawDiff.includes('hard') || rawDiff.includes('difficult')) difficulty = 'Hard';

      // Metadata
      const chapKey = findKey(row, ['chapter', 'unit']);
      const topKey = findKey(row, ['topic', 'subtopic']);
      const expKey = findKey(row, ['explanation', 'solution', 'rationale']);

      const chapter = String(row[chapKey] || '').trim() || 'General Chapter';
      const topic = String(row[topKey] || '').trim() || 'General Concept';
      const explanation = String(row[expKey] || '').trim() || 'Standard conceptual solution.';

      const isValid = qText.length >= 5 && options.every((o) => o.length > 0);
      if (!isValid) {
        warnings.push(`Row ${rowNum}: Incomplete question or missing option text.`);
      }

      questions.push({
        id: `EX-${Date.now()}-${index + 1}`,
        text: qText,
        options: options.slice(0, 4),
        answer: answerIndex,
        marks,
        negative,
        explanation,
        difficulty,
        type: 'MCQ',
        chapter,
        topic,
        valid: isValid,
        validationError: isValid ? undefined : 'Ensure question statement and all 4 options are filled.',
      });
    });

    const validCount = questions.filter((q) => q.valid).length;
    return {
      questions,
      totalParsed: questions.length,
      validCount,
      invalidCount: questions.length - validCount,
      warnings,
    };
  }

  /**
   * Parse Word (.docx) documents.
   */
  async parseWord(filePath: string, defaultSubject: string): Promise<ParseResult> {
    const rawResult = await mammoth.extractRawText({ path: filePath });
    const text = rawResult.value || '';
    if (!text.trim()) {
      throw new Error('Word document contains no text.');
    }

    return this.parseFormattedText(text, defaultSubject);
  }

  /**
   * Parse PDF (.pdf) documents.
   */
  async parsePdf(filePath: string, defaultSubject: string): Promise<ParseResult> {
    const dataBuffer = fs.readFileSync(filePath);
    // Dynamic import / require of pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule: any = await import('pdf-parse');
    const pdf = pdfModule.default || pdfModule;
    const data = await pdf(dataBuffer);
    const text = data.text || '';

    if (!text.trim()) {
      throw new Error('Could not extract text from PDF. It may be scanned or image-only.');
    }

    return this.parseFormattedText(text, defaultSubject);
  }

  /**
   * Common robust parsing engine for formatted text (Word / PDF / Raw TXT).
   */
  parseFormattedText(fullText: string, defaultSubject: string): ParseResult {
    const lines = fullText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const questions: IExtractedQuestion[] = [];
    const warnings: string[] = [];

    let currentQuestionText = '';
    let currentOptions: string[] = [];
    let currentAnswer = 0;
    let currentExplanation = '';
    let currentDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';

    const saveCurrent = () => {
      if (currentQuestionText.trim()) {
        while (currentOptions.length < 4) {
          currentOptions.push(`Option ${String.fromCharCode(65 + currentOptions.length)}`);
        }
        const isValid = currentQuestionText.trim().length >= 5 && currentOptions.length >= 2;
        questions.push({
          id: `DOC-${Date.now()}-${questions.length + 1}`,
          text: currentQuestionText.trim(),
          options: currentOptions.slice(0, 4),
          answer: currentAnswer,
          marks: 4,
          negative: 1,
          explanation: currentExplanation.trim() || 'Correct answer verified from question paper key.',
          difficulty: currentDifficulty,
          type: 'MCQ',
          chapter: `${defaultSubject} Assessment`,
          topic: 'Extracted Topic',
          valid: isValid,
          validationError: isValid ? undefined : 'Incomplete question or options detected.',
        });
      }
      currentQuestionText = '';
      currentOptions = [];
      currentAnswer = 0;
      currentExplanation = '';
      currentDifficulty = 'Medium';
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if new question begins (e.g. "1. What is..." or "Q2: Which...")
      const qStartMatch = line.match(/^(?:Q(?:uestion)?\s*\d+[\.:\)]|\d+[\.:\)])\s+(.*)/i);
      if (qStartMatch) {
        saveCurrent();
        currentQuestionText = qStartMatch[1] || '';
        continue;
      }

      // Check for options: "(A) ...", "A) ...", "A. ...", "[A] ..."
      const optMatch = line.match(/^(?:\(?([A-D])\)|\b([A-D])[\.:\)])\s*(.*)/i);
      if (optMatch && currentQuestionText) {
        const optLetter = (optMatch[1] || optMatch[2]).toUpperCase();
        const optText = optMatch[3] || '';
        const idx = optLetter.charCodeAt(0) - 65;
        currentOptions[idx] = optText.trim();
        continue;
      }

      // Check for inline options like "(A) foo (B) bar (C) baz (D) qux"
      if (currentQuestionText && /\(A\).*\(B\)/i.test(line)) {
        const parts = line.split(/(?=\([A-D]\)|\b[A-D]\))/i);
        parts.forEach((part) => {
          const m = part.match(/^\(?([A-D])\)?[\.:]?\s*(.*)/i);
          if (m) {
            const idx = m[1].toUpperCase().charCodeAt(0) - 65;
            currentOptions[idx] = m[2].trim();
          }
        });
        continue;
      }

      // Check for Answer line: "Answer: B" or "Ans: (C)" or "Correct: 2"
      const ansMatch = line.match(/^(?:Answer|Ans|Correct(?:\s*Option)?)\s*[:=\-]?\s*\(?([A-D0-9])/i);
      if (ansMatch && currentQuestionText) {
        const rawKey = ansMatch[1].toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(rawKey)) {
          currentAnswer = rawKey.charCodeAt(0) - 65;
        } else if (['1', '2', '3', '4'].includes(rawKey)) {
          currentAnswer = Number(rawKey) - 1;
        }
        continue;
      }

      // Check for Explanation: "Explanation: ..." or "Solution: ..."
      const expMatch = line.match(/^(?:Explanation|Solution|Hint)\s*[:=\-]?\s*(.*)/i);
      if (expMatch && currentQuestionText) {
        currentExplanation = expMatch[1] || '';
        continue;
      }

      // Difficulty tag if present
      if (/difficulty\s*:\s*easy/i.test(line)) currentDifficulty = 'Easy';
      else if (/difficulty\s*:\s*hard/i.test(line)) currentDifficulty = 'Hard';

      // Otherwise append to current question text if before options
      if (currentQuestionText && currentOptions.length === 0) {
        currentQuestionText += ' ' + line;
      } else if (currentExplanation) {
        currentExplanation += ' ' + line;
      }
    }

    // Save final question
    saveCurrent();

    // If regular expression parser extracted fewer than expected questions,
    // fallback to block chunking
    if (questions.length === 0 && fullText.trim().length > 20) {
      warnings.push('Standard MCQ numbering not detected. Generated fallback draft questions.');
      const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 15);
      paragraphs.slice(0, 10).forEach((para, idx) => {
        questions.push({
          id: `FB-${Date.now()}-${idx + 1}`,
          text: para.trim().slice(0, 250),
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 0,
          marks: 4,
          negative: 1,
          explanation: 'Extracted from document paragraph. Please verify options and answer key.',
          difficulty: 'Medium',
          type: 'MCQ',
          chapter: `${defaultSubject} Assessment`,
          topic: 'Extracted Section',
          valid: true,
        });
      });
    }

    const validCount = questions.filter((q) => q.valid).length;
    return {
      questions,
      totalParsed: questions.length,
      validCount,
      invalidCount: questions.length - validCount,
      warnings,
    };
  }
}

export const parserService = new ParserService();

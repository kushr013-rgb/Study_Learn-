import type { Exam } from '../lib/types';
import { getDB } from './db';
import { analyticsService } from './analyticsService';
import { attemptService } from './attemptService';

/* ---------------------------------------------------------------------------
 * Rule-based recommendation engine.
 * Pure functions + a documented rule registry, so an ML service can replace
 * `recommend()` with an API call without changing any consuming component.
 * ------------------------------------------------------------------------- */

export interface Recommendation {
  id: string;
  rule: string;
  kind: 'chapter' | 'speed' | 'revision' | 'test' | 'mistake';
  title: string;
  description: string;
  meta: string;
  cta: string;
  to: string;
  priority: number;
  severity: 'high' | 'medium' | 'low';
}

interface Ctx {
  userId: string;
  exam: Exam;
  threshold: number;
  targetTime: number;
}

type Rule = (ctx: Ctx) => Recommendation[];

/** RULE 1 — chapter accuracy below threshold ⇒ targeted chapter practice. */
const weakChapterRule: Rule = ({ userId, exam, threshold }) => {
  return analyticsService
    .weakAreas(userId, threshold)
    .slice(0, 3)
    .map((w, i) => ({
      id: `rec-chapter-${w.key}`,
      rule: `IF chapterAccuracy < ${threshold}% THEN recommend chapter practice`,
      kind: 'chapter' as const,
      title: `Improve ${w.key}`,
      description: `Your accuracy in ${w.key} is ${w.accuracy}% across ${w.attempted} questions.`,
      meta: `10 Medium Questions · ${w.subject ?? ''}`.trim(),
      cta: 'Start Practice',
      to: `/student/practice?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(w.subject ?? '')}&chapter=${encodeURIComponent(w.key)}&difficulty=Medium&count=10`,
      priority: 100 - w.accuracy + i,
      severity: w.accuracy < threshold - 15 ? 'high' as const : 'medium' as const,
    }));
};

/** RULE 2 — average time per question above target ⇒ timed speed practice. */
const speedRule: Rule = ({ userId, exam, targetTime }) => {
  return analyticsService
    .timeAnalysis(userId)
    .filter((t) => t.avgTime > targetTime)
    .slice(0, 2)
    .map((t) => ({
      id: `rec-speed-${t.key}`,
      rule: `IF avgTimePerQuestion > ${targetTime}s THEN recommend timed practice`,
      kind: 'speed' as const,
      title: `Improve speed in ${t.key}`,
      description: `You are spending ${t.avgTime}s per ${t.key} question — above the ${targetTime}s target.`,
      meta: '15 Questions · Timed',
      cta: 'Timed Practice',
      to: `/student/practice?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(t.key)}&difficulty=Mixed&count=15&timed=1`,
      priority: 80 + Math.round((t.avgTime - targetTime) / 5),
      severity: t.avgTime > targetTime * 1.5 ? ('high' as const) : ('medium' as const),
    }));
};

/** RULE 3 — unresolved mistakes ⇒ re-attempt before new attempts. */
const mistakeRule: Rule = ({ userId }) => {
  const open = attemptService.mistakesFor(userId).filter((m) => !m.resolved);
  if (open.length < 3) return [];
  return [{
    id: 'rec-mistake',
    rule: 'IF unresolvedMistakes >= 3 THEN recommend mistake revision',
    kind: 'mistake',
    title: 'Clear your mistake book',
    description: `${open.length} questions are still unresolved. Re-attempting them is the fastest accuracy gain.`,
    meta: `${open.length} questions pending`,
    cta: 'Practice Mistakes',
    to: '/student/mistakes',
    priority: 90,
    severity: 'high',
  }];
};

/** RULE 4 — no test in the last 7 days ⇒ schedule a full mock test. */
const mockTestRule: Rule = ({ userId }) => {
  const last = attemptService.listByUser(userId)[0];
  const days = last ? Math.floor((Date.now() - new Date(last.submittedAt).getTime()) / 86400000) : 99;
  if (days < 5) return [];
  return [{
    id: 'rec-test',
    rule: 'IF daysSinceLastTest > 5 THEN recommend a full mock test',
    kind: 'test',
    title: days > 90 ? 'Attempt your first mock test' : 'Attempt a full mock test',
    description: days > 90
      ? 'You have not attempted a mock test yet. A baseline test unlocks your analytics.'
      : `It has been ${days} days since your last test. Benchmark yourself again.`,
    meta: '50 Questions · 60 Minutes',
    cta: 'View Tests',
    to: '/student/tests',
    priority: 70,
    severity: 'medium',
  }];
};

/** RULE 5 — always provide a daily practice nudge for the weakest subject. */
const dailyRule: Rule = ({ userId }) => {
  const subjects = analyticsService.subjectPerformance(userId);
  const weakest = subjects.length
    ? [...subjects].sort((a, b) => a.accuracy - b.accuracy)[0]
    : null;
  return [{
    id: 'rec-daily',
    rule: 'ALWAYS recommend a daily mixed practice set',
    kind: 'revision',
    title: weakest ? `Daily revision · ${weakest.key}` : 'Start your daily practice',
    description: weakest
      ? `A 10 question mixed set keeps ${weakest.key} fresh in memory.`
      : 'Build the habit: 30 questions across three subjects every day.',
    meta: '10 Questions · Mixed',
    cta: 'Start Now',
    to: '/student/daily-practice',
    priority: 50,
    severity: 'low',
  }];
};

const RULES: Rule[] = [weakChapterRule, mistakeRule, speedRule, mockTestRule, dailyRule];

export const recommendationService = {
  /** Returns recommendations sorted by priority (highest first). */
  recommend(userId: string, limit = 5): Recommendation[] {
    const db = getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return [];
    const ctx: Ctx = {
      userId,
      exam: user.exam ?? 'JEE',
      threshold: db.settings.weakAreaThreshold,
      targetTime: db.settings.targetTimePerQuestion,
    };
    return RULES.flatMap((r) => r(ctx))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  },

  /** Exposed so admin settings can explain / tune the engine. */
  rules() {
    return RULES.map((r) => r.name);
  },
};

import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { createSeedDatabase } from '../src/data/seed';
import { config } from './config';
import { connectDB, closeDB } from './config/db';
import { connectRedis, closeRedis } from './lib/redis';
import { authService } from './services/authService';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';
import {
  User,
  StudentProfile,
  FacultyProfile,
  Question,
  Assessment,
  AssessmentAttempt,
  Mistake,
  Curriculum,
  Exam,
  Subject,
  Settings,
} from './models';
import { EXAMS, SUBJECTS } from '../src/data/taxonomy';

const app = express();
const port = config.port;

async function initializeExamCatalog() {
  const catalog = await Promise.all(EXAMS.map((code) =>
    Exam.findOneAndUpdate(
      { code },
      { $setOnInsert: { code, name: code, subjects: SUBJECTS[code], active: true } },
      { upsert: true, new: true }
    )
  ));

  for (const exam of catalog) {
    const missingReference = { $or: [{ examId: { $exists: false } }, { examId: null }] };
    await Promise.all([
      User.updateMany({ exam: exam.code, ...missingReference }, { $set: { examId: exam._id } }),
      Question.updateMany({ exam: exam.code, ...missingReference }, { $set: { examId: exam._id } }),
      Assessment.updateMany({ exam: exam.code, ...missingReference }, { $set: { examId: exam._id } }),
      AssessmentAttempt.updateMany({ exam: exam.code, ...missingReference }, { $set: { examId: exam._id } }),
      Curriculum.updateMany({ exam: exam.code, ...missingReference }, { $set: { examId: exam._id } }),
      Subject.updateMany({ exam: exam.code, ...missingReference }, { $set: { examId: exam._id } }),
    ]);
  }

  const legacyAttempts = await AssessmentAttempt.find({ exam: { $exists: false } }).select('_id testId questionIds').lean();
  for (const attempt of legacyAttempts) {
    const test = attempt.testId === 'practice' ? null : await Assessment.findById(attempt.testId).select('exam examId').lean();
    const questions = test ? [] : await Question.find({ _id: { $in: attempt.questionIds } }).select('exam examId').lean();
    const examCode = test?.exam ?? (questions.length === attempt.questionIds.length && questions.every((question) => question.exam === questions[0]?.exam) ? questions[0]?.exam : undefined);
    const examId = test?.examId ?? questions[0]?.examId ?? catalog.find((item) => item.code === examCode)?._id;
    if (examCode && examId) {
      await AssessmentAttempt.updateOne({ _id: attempt._id }, { $set: { exam: examCode, examId } });
    }
  }
}

// Trust proxy for rate limiting / secure cookies
app.set('trust proxy', 1);

// Security & Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // allow Vite dev / single-page assets
    crossOriginEmbedderPolicy: false,
  })
);
app.use(pinoHttp({ level: config.isProduction ? 'info' : 'warn' }));
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || config.corsOrigin.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // permissive in development for developer convenience
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directory exists and serve files securely
const uploadDir = path.resolve(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Mount REST API Router
app.use('/api/v1', apiRouter);

// Central error handler
app.use(errorHandler);

export async function seedDatabase() {
  await initializeExamCatalog();
  const seed = createSeedDatabase();
  const users = await Promise.all(
    seed.users.map(async (user) => ({
      ...user,
      _id: user.id,
      passwordHash: await bcrypt.hash(user.password, 12),
      password: undefined,
    }))
  );

  const upsertSeeds = <T extends { _id: string }>(documents: T[]) =>
    documents.map((document) => ({
      updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true },
    }));

  const bulkSafe = async (model: mongoose.Model<any>, docs: any[]) => {
    if (!docs || docs.length === 0) return { upsertedCount: 0 };
    return model.collection.bulkWrite(upsertSeeds(docs) as never[], { ordered: false });
  };

  const [userResult, questionResult, testResult, attemptResult] = await Promise.all([
    bulkSafe(User, users),
    bulkSafe(Question, seed.questions.map((question) => ({ ...question, _id: question.id }))),
    bulkSafe(Assessment, seed.tests.map((test) => ({ ...test, _id: test.id }))),
    bulkSafe(AssessmentAttempt, seed.attempts.map((attempt) => ({ ...attempt, _id: attempt.id, submissionKey: `seed-${attempt.id}` }))),
    bulkSafe(Mistake, seed.mistakes.map((mistake) => ({ ...mistake, _id: mistake.id }))),
    bulkSafe(Curriculum, (seed.curriculum || []).map((entry) => ({ ...entry, _id: entry.id }))),
    Settings.updateOne({ _id: 'settings' }, { $setOnInsert: { _id: 'settings', ...seed.settings } }, { upsert: true }),
  ]);

  // Seed associated profiles for initial students and faculty
  for (const u of seed.users) {
    if (u.role === 'student') {
      await StudentProfile.updateOne(
        { userId: u.id },
        {
          $setOnInsert: {
            userId: u.id,
            enrollmentNumber: `ENR-${u.id}`,
            college: 'National Institute of Technology',
            department: 'Science & Engineering',
            course: `${u.exam || 'JEE'} Academic Preparation`,
            classLevel: u.classLevel || 'Class 12',
            semester: '1',
            academicYear: '2025-2026',
          },
        },
        { upsert: true }
      );
    } else if (u.role === 'faculty') {
      await FacultyProfile.updateOne(
        { userId: u.id },
        {
          $setOnInsert: {
            userId: u.id,
            employeeId: u.id,
            designation: 'Senior Faculty',
            department: 'Academic Faculty',
            assignedSubjects: u.subjects || ['Physics'],
            assignedClasses: ['Class 11', 'Class 12'],
            accountStatus: 'verified',
          },
        },
        { upsert: true }
      );
    }
  }

  // Ensure Permanent Super Admin exists
  await authService.ensureSuperAdmin();
  await initializeExamCatalog();

  return {
    users: userResult.upsertedCount,
    questions: questionResult.upsertedCount,
    tests: testResult.upsertedCount,
    attempts: attemptResult.upsertedCount,
  };
}

async function start() {
  await connectDB();
  await connectRedis();
  await initializeExamCatalog();

  // Ensure permanent Super Admin on every startup
  await authService.ensureSuperAdmin();

  if (process.argv.includes('--seed-only')) {
    console.log('[Seed] Seeding database...');
    const result = await seedDatabase();
    console.log('[Seed] Seeding complete:', result);
    await closeRedis();
    await closeDB();
    process.exit(0);
  }

  const server = app.listen(port, () => {
    console.log(`=======================================================`);
    console.log(` Student Assessment Management System - Enterprise API `);
    console.log(` Listening on: http://localhost:${port}/api/v1         `);
    console.log(` MongoDB: Connected                                    `);
    console.log(` Permanent Super Admin: ${config.adminEmail}          `);
    console.log(`=======================================================`);
  });

  const shutdown = async () => {
    console.log('\nGracefully shutting down server...');
    server.close();
    await closeRedis();
    await closeDB();
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

start().catch((error) => {
  console.error('Fatal API initialization error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
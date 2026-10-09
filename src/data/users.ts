import type { User } from '../lib/types';

/** Seed users. Demo logins: student@demo.com / faculty@demo.com / admin@demo.com — password 123456 */
export const SEED_USERS: User[] = [
  {
    id: 'S-001', name: 'Rahul Sharma', email: 'student@demo.com', mobile: '9876543210', password: '123456',
    role: 'student', exam: 'JEE', classLevel: 'Class 12', subjects: ['Physics', 'Chemistry', 'Mathematics'],
    status: 'verified', createdAt: '2025-04-12', streak: 12,
    baseline: { solved: 1245, tests: 24, accuracy: 78, score: 72 },
  },
  {
    id: 'S-002', name: 'Ananya Iyer', email: 'ananya@demo.com', mobile: '9876543211', password: '123456',
    role: 'student', exam: 'NEET', classLevel: 'Class 12', subjects: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
    status: 'verified', createdAt: '2025-05-02', streak: 7, baseline: { solved: 980, tests: 19, accuracy: 74, score: 69 },
  },
  {
    id: 'S-003', name: 'Rohan Gupta', email: 'rohan@demo.com', mobile: '9876543212', password: '123456',
    role: 'student', exam: 'JEE', classLevel: 'Class 12', subjects: ['Physics', 'Chemistry', 'Mathematics'],
    status: 'verified', createdAt: '2025-03-21', streak: 3, baseline: { solved: 1560, tests: 31, accuracy: 81, score: 77 },
  },
  {
    id: 'S-004', name: 'Sneha Patel', email: 'sneha@demo.com', mobile: '9876543213', password: '123456',
    role: 'student', exam: 'Class 10', classLevel: 'Class 10', subjects: ['Science', 'Mathematics'],
    status: 'pending', createdAt: '2026-01-14', streak: 0, baseline: { solved: 210, tests: 4, accuracy: 66, score: 61 },
  },
  {
    id: 'S-005', name: 'Arjun Mehta', email: 'arjun@demo.com', mobile: '9876543214', password: '123456',
    role: 'student', exam: 'Class 12', classLevel: 'Class 12', subjects: ['Physics', 'Chemistry', 'Mathematics'],
    status: 'verified', createdAt: '2025-06-18', streak: 21, baseline: { solved: 1890, tests: 38, accuracy: 84, score: 80 },
  },
  {
    id: 'S-006', name: 'Kavya Reddy', email: 'kavya@demo.com', mobile: '9876543215', password: '123456',
    role: 'student', exam: 'NEET', classLevel: 'Class 12', subjects: ['Botany', 'Zoology'],
    status: 'verified', createdAt: '2025-07-09', streak: 5, baseline: { solved: 640, tests: 11, accuracy: 71, score: 65 },
  },
  {
    id: 'S-007', name: 'Vikram Singh', email: 'vikram@demo.com', mobile: '9876543216', password: '123456',
    role: 'student', exam: 'JEE', classLevel: 'Class 12', subjects: ['Physics', 'Mathematics'],
    status: 'pending', createdAt: '2026-01-18', streak: 0, baseline: { solved: 45, tests: 1, accuracy: 58, score: 52 },
  },
  {
    id: 'S-008', name: 'Meera Nair', email: 'meera@demo.com', mobile: '9876543217', password: '123456',
    role: 'student', exam: 'Class 10', classLevel: 'Class 10', subjects: ['Science', 'Social Science'],
    status: 'verified', createdAt: '2025-08-01', streak: 9, baseline: { solved: 430, tests: 7, accuracy: 79, score: 74 },
  },
  {
    id: 'S-009', name: 'Aditya Joshi', email: 'aditya@demo.com', mobile: '9876543218', password: '123456',
    role: 'student', exam: 'Class 12', classLevel: 'Class 12', subjects: ['Biology', 'Chemistry'],
    status: 'inactive', createdAt: '2025-02-11', streak: 0, baseline: { solved: 320, tests: 6, accuracy: 62, score: 57 },
  },
  {
    id: 'S-010', name: 'Divya Kapoor', email: 'divya@demo.com', mobile: '9876543219', password: '123456',
    role: 'student', exam: 'JEE', classLevel: 'Class 11', subjects: ['Physics', 'Chemistry', 'Mathematics'],
    status: 'verified', createdAt: '2025-09-15', streak: 15, baseline: { solved: 1120, tests: 22, accuracy: 76, score: 71 },
  },
  {
    id: 'S-011', name: 'Karan Malhotra', email: 'karan@demo.com', mobile: '9876543220', password: '123456',
    role: 'student', exam: 'NEET', classLevel: 'Class 11', subjects: ['Physics', 'Botany', 'Zoology'],
    status: 'verified', createdAt: '2025-10-03', streak: 2, baseline: { solved: 505, tests: 9, accuracy: 68, score: 63 },
  },
  {
    id: 'S-012', name: 'Ishita Bose', email: 'ishita@demo.com', mobile: '9876543221', password: '123456',
    role: 'student', exam: 'Class 10', classLevel: 'Class 10', subjects: ['Mathematics', 'English'],
    status: 'rejected', createdAt: '2025-11-27', streak: 0, baseline: { solved: 30, tests: 0, accuracy: 0, score: 0 },
  },
  {
    id: 'S-013', name: 'Harsh Vardhan', email: 'harsh@demo.com', mobile: '9876543222', password: '123456',
    role: 'student', exam: 'JEE', classLevel: 'Class 12', subjects: ['Physics', 'Chemistry', 'Mathematics'],
    status: 'verified', createdAt: '2025-12-05', streak: 4, baseline: { solved: 275, tests: 5, accuracy: 70, score: 66 },
  },
  {
    id: 'S-014', name: 'Nisha Agarwal', email: 'nisha@demo.com', mobile: '9876543223', password: '123456',
    role: 'student', exam: 'Class 12', classLevel: 'Class 12', subjects: ['Physics', 'Mathematics'],
    status: 'pending', createdAt: '2026-01-20', streak: 0, baseline: { solved: 12, tests: 0, accuracy: 0, score: 0 },
  },
  {
    id: 'S-015', name: 'Yash Chauhan', email: 'yash@demo.com', mobile: '9876543224', password: '123456',
    role: 'student', exam: 'Class 10', classLevel: 'Class 10', subjects: ['Science', 'Mathematics'],
    status: 'verified', createdAt: '2025-06-30', streak: 11, baseline: { solved: 700, tests: 13, accuracy: 75, score: 70 },
  },
  {
    id: 'F-001', name: 'Dr. Priya Nair', email: 'faculty@demo.com', mobile: '9800000001', password: '123456',
    role: 'faculty', exam: 'JEE', subjects: ['Physics', 'Mathematics'], status: 'verified', createdAt: '2024-11-02',
  },
  {
    id: 'F-002', name: 'Prof. Rajesh Kumar', email: 'rajesh@demo.com', mobile: '9800000002', password: '123456',
    role: 'faculty', exam: 'JEE', subjects: ['Mathematics'], status: 'verified', createdAt: '2025-01-19',
  },
  {
    id: 'F-003', name: 'Dr. Sonal Sharma', email: 'sonal@demo.com', mobile: '9800000003', password: '123456',
    role: 'faculty', exam: 'NEET', subjects: ['Chemistry', 'Botany'], status: 'verified', createdAt: '2025-02-24',
  },
  {
    id: 'A-001', name: 'Admin User', email: 'admin@demo.com', mobile: '9800000000', password: '123456',
    role: 'admin', status: 'verified', createdAt: '2024-09-01',
  },
];

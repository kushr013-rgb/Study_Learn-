import type { IconName } from '../components/ui/Icons';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Sidebar navigation.
 * Kept deliberately short — "create" screens are reachable from a primary
 * button inside their parent page, so they are not repeated here.
 */
export const NAV: Record<'student' | 'faculty' | 'admin', NavGroup[]> = {
  student: [
    {
      title: 'Study',
      items: [
        { to: '/student/dashboard', label: 'Home', icon: 'dashboard', end: true },
        { to: '/student/practice', label: 'Practice', icon: 'practice' },
        { to: '/student/daily-practice', label: 'Daily Practice', icon: 'bolt' },
        { to: '/student/tests', label: 'Mock Tests', icon: 'quiz' },
      ],
    },
    {
      title: 'Improve',
      items: [
        { to: '/student/analytics', label: 'My Performance', icon: 'chart' },
        { to: '/student/mistakes', label: 'Mistake Book', icon: 'book' },
        { to: '/student/profile', label: 'Profile', icon: 'user' },
      ],
    },
  ],
  faculty: [
    {
      title: 'Teach',
      items: [
        { to: '/faculty/dashboard', label: 'Home', icon: 'dashboard', end: true },
        { to: '/faculty/questions', label: 'Questions', icon: 'layers' },
        { to: '/faculty/tests', label: 'Tests', icon: 'quiz' },
        { to: '/faculty/curriculum', label: 'Curriculum', icon: 'bookOpen' },
      ],
    },
    {
      title: 'Learners',
      items: [
        { to: '/faculty/students', label: 'Students', icon: 'users' },
        { to: '/faculty/batches', label: 'Batches', icon: 'grid' },
        { to: '/faculty/analytics', label: 'Analytics', icon: 'chart' },
      ],
    },
  ],
  admin: [
    {
      title: 'Overview',
      items: [
        { to: '/admin/dashboard', label: 'Home', icon: 'dashboard', end: true },
        { to: '/admin/analytics', label: 'Analytics', icon: 'chart' },
      ],
    },
    {
      title: 'People',
      items: [
        { to: '/admin/students', label: 'Students', icon: 'users' },
        { to: '/admin/faculty', label: 'Faculty', icon: 'user' },
        { to: '/admin/verification', label: 'Verification', icon: 'shield' },
      ],
    },
    {
      title: 'Content',
      items: [
        { to: '/admin/questions', label: 'Questions', icon: 'layers' },
        { to: '/admin/tests', label: 'Tests', icon: 'quiz' },
        { to: '/admin/curriculum', label: 'Curriculum', icon: 'bookOpen' },
        { to: '/admin/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
};

/** Compact bottom navigation shown on phones. */
export const MOBILE_NAV: Record<string, NavItem[]> = {
  student: [
    { to: '/student/dashboard', label: 'Home', icon: 'dashboard', end: true },
    { to: '/student/practice', label: 'Practice', icon: 'practice' },
    { to: '/student/tests', label: 'Tests', icon: 'quiz' },
    { to: '/student/mistakes', label: 'Mistakes', icon: 'book' },
    { to: '/student/analytics', label: 'Stats', icon: 'chart' },
  ],
  faculty: [
    { to: '/faculty/dashboard', label: 'Home', icon: 'dashboard', end: true },
    { to: '/faculty/questions', label: 'Questions', icon: 'layers' },
    { to: '/faculty/tests', label: 'Tests', icon: 'quiz' },
    { to: '/faculty/students', label: 'Students', icon: 'users' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Home', icon: 'dashboard', end: true },
    { to: '/admin/students', label: 'Students', icon: 'users' },
    { to: '/admin/questions', label: 'Questions', icon: 'layers' },
    { to: '/admin/verification', label: 'Verify', icon: 'shield' },
  ],
};

export const ROLE_LABEL: Record<string, string> = { student: 'Student', faculty: 'Faculty', admin: 'Administrator' };

/** First-run guidance shown once per role. */
export const ROLE_TOUR: Record<string, { title: string; steps: { icon: IconName; title: string; body: string; to: string }[] }> = {
  student: {
    title: 'Welcome to Astra Prep',
    steps: [
      { icon: 'bolt', title: 'Practice in one tap', body: 'Use a quick-start card, or build a custom set by chapter and difficulty.', to: '/student/practice' },
      { icon: 'quiz', title: 'Take a mock test', body: 'Real exam interface with a live timer, question palette and auto-submit.', to: '/student/tests' },
      { icon: 'book', title: 'Fix your mistakes', body: 'Every wrong answer lands in your Mistake Book. Re-attempt until it is resolved.', to: '/student/mistakes' },
    ],
  },
  faculty: {
    title: 'Welcome, faculty',
    steps: [
      { icon: 'layers', title: 'Add questions', body: 'Create them one by one, or bulk upload a CSV. New chapters are created automatically.', to: '/faculty/questions' },
      { icon: 'quiz', title: 'Build a test', body: 'Pick questions manually or auto-generate by easy / medium / hard counts.', to: '/faculty/tests' },
      { icon: 'chart', title: 'Track your batches', body: 'See weak topics, batch accuracy and who needs help.', to: '/faculty/analytics' },
    ],
  },
  admin: {
    title: 'Welcome, admin',
    steps: [
      { icon: 'shield', title: 'Verify students', body: 'Approve or reject new registrations from the Verification queue.', to: '/admin/verification' },
      { icon: 'layers', title: 'Manage all content', body: 'Bulk upload questions, publish in one click, and edit the curriculum.', to: '/admin/questions' },
      { icon: 'settings', title: 'Tune the platform', body: 'Set the weak-area threshold, export data, or reset the demo.', to: '/admin/settings' },
    ],
  },
};

import { RouterProvider, useRouter } from './lib/router';
import { SessionProvider } from './lib/session';
import { ToastProvider } from './components/ui/Toast';
import { Card, EmptyState, Button } from './components/ui';
import { Link } from './lib/router';

import Landing from './pages/Landing';
import { ForgotPassword, Login, Register } from './pages/auth/Auth';

import StudentDashboard from './pages/student/Dashboard';
import Practice from './pages/student/Practice';
import DailyPractice from './pages/student/DailyPractice';
import Tests from './pages/student/Tests';
import LiveTest from './pages/student/LiveTest';
import Result from './pages/student/Result';
import StudentAnalytics from './pages/student/Analytics';
import Mistakes from './pages/student/Mistakes';
import StudentProfile from './pages/student/Profile';

import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyQuestions from './pages/faculty/Questions';
import CreateQuestion from './pages/faculty/CreateQuestion';
import FacultyTests from './pages/faculty/Tests';
import TestBuilder from './pages/faculty/TestBuilder';
import FacultyStudents from './pages/faculty/Students';
import Batches from './pages/faculty/Batches';
import FacultyAnalytics from './pages/faculty/Analytics';

import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminFaculty from './pages/admin/Faculty';
import AdminQuestions from './pages/admin/Questions';
import AdminTests from './pages/admin/Tests';
import Verification from './pages/admin/Verification';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';
import Curriculum from './pages/shared/Curriculum';

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4">
      <Card className="max-w-md p-8">
        <EmptyState
          icon="alert"
          title="Page not found"
          message="The page you are looking for does not exist in this prototype."
          action={<Link to="/"><Button size="sm">Back to Home</Button></Link>}
        />
      </Card>
    </div>
  );
}

function Routes() {
  const { path } = useRouter();
  const p = path.split('?')[0];

  // ---- Public ----
  if (p === '/') return <Landing />;
  if (p === '/login') return <Login />;
  if (p === '/register') return <Register />;
  if (p === '/forgot-password') return <ForgotPassword />;

  // ---- Student ----
  if (p === '/student/dashboard') return <StudentDashboard />;
  if (p === '/student/practice') return <Practice />;
  if (p === '/student/daily-practice') return <DailyPractice />;
  if (p === '/student/tests') return <Tests />;
  if (p === '/student/analytics') return <StudentAnalytics />;
  if (p === '/student/mistakes') return <Mistakes />;
  if (p === '/student/profile') return <StudentProfile />;
  if (p.startsWith('/student/test/')) return <LiveTest />;
  if (p.startsWith('/student/result/')) return <Result />;

  // ---- Faculty ----
  if (p === '/faculty/dashboard') return <FacultyDashboard />;
  if (p === '/faculty/questions') return <FacultyQuestions />;
  if (p === '/faculty/questions/create') return <CreateQuestion />;
  if (p === '/faculty/tests') return <FacultyTests />;
  if (p === '/faculty/tests/create') return <TestBuilder />;
  if (p === '/faculty/students') return <FacultyStudents />;
  if (p === '/faculty/batches') return <Batches />;
  if (p === '/faculty/analytics') return <FacultyAnalytics />;
  if (p === '/faculty/curriculum') return <Curriculum />;

  // ---- Admin ----
  if (p === '/admin/dashboard') return <AdminDashboard />;
  if (p === '/admin/students') return <AdminStudents />;
  if (p === '/admin/faculty') return <AdminFaculty />;
  if (p === '/admin/questions') return <AdminQuestions />;
  if (p === '/admin/tests') return <AdminTests />;
  if (p === '/admin/verification') return <Verification />;
  if (p === '/admin/analytics') return <AdminAnalytics />;
  if (p === '/admin/settings') return <AdminSettings />;
  if (p === '/admin/curriculum') return <Curriculum />;

  return <NotFound />;
}

export default function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <SessionProvider>
          <Routes />
        </SessionProvider>
      </ToastProvider>
    </RouterProvider>
  );
}

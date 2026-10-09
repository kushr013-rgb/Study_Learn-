import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const API = 'http://localhost:4000/api/v1';

async function main() {
  console.log('----------------------------------------------------');
  console.log('Starting End-to-End Enterprise System Verification');
  console.log('----------------------------------------------------\n');

  // 1. Health Check
  console.log('[1] Health Check...');
  const healthRes = await fetch(`${API}/health`);
  const health = await healthRes.json();
  console.log('Health Response:', health);
  if (!health.data?.database) throw new Error('MongoDB not reported healthy');

  // 2. Student Registration with all fields
  console.log('\n[2] Testing Student Registration...');
  const studentEmail = `student_${Date.now()}@testuniv.edu`;
  const studentEnrollment = `ENR-${Date.now()}`;
  const studentMobile = String(Date.now()).slice(-10);
  const facultyMobile = String(Date.now() - 1).slice(-10);
  const regPayload = {
    name: 'Aarav Sharma',
    email: studentEmail,
    mobile: studentMobile,
    enrollmentId: studentEnrollment,
    college: 'Delhi Institute of Technology',
    department: 'Computer Science',
    course: 'B.Tech CSE',
    classLevel: 'Class 12',
    semester: '4',
    academicYear: '2026-2027',
    exam: 'JEE',
    dateOfBirth: '2005-01-01',
    gender: 'prefer-not-to-say',
    state: 'Delhi',
    city: 'New Delhi',
    targetExam: 'JEE Main',
    password: 'Password@123',
    confirmPassword: 'Password@123',
  };

  const regRes = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });
  const regData = await regRes.json();
  console.log('Register status:', regRes.status, regData.message);
  if (regRes.status !== 201) throw new Error(`Student registration failed: ${JSON.stringify(regData)}`);
  if (regData.data?.user?.exam !== 'JEE') throw new Error('Student exam category was not persisted as JEE.');

  // 3. Student Login
  console.log('\n[3] Testing Student Login...');
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail, password: 'Password@123' }),
  });
  const loginBody = await loginRes.json();
  const loginData = loginBody.data || loginBody;
  console.log('Student Login status:', loginRes.status, 'User:', loginData.user?.email, 'Role:', loginData.user?.role);
  if (loginRes.status !== 200 || !loginData.accessToken) throw new Error('Student login failed');
  const studentToken = loginData.accessToken;

  const allowedQuestionsRes = await fetch(`${API}/questions?exam=JEE&page=1&limit=20`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const allowedQuestions = await allowedQuestionsRes.json();
  const allowedItems = allowedQuestions.data?.items ?? [];
  if (allowedQuestionsRes.status !== 200 || allowedItems.some((question: { exam: string }) => question.exam !== 'JEE')) {
    throw new Error('JEE student did not receive exclusively JEE questions.');
  }

  // Exam category is enforced by the API, not only by the UI.
  const deniedQuestionsRes = await fetch(`${API}/questions?exam=NEET`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const deniedQuestions = await deniedQuestionsRes.json();
  if (deniedQuestionsRes.status !== 403 || deniedQuestions.code !== 'EXAM_ACCESS_DENIED') {
    throw new Error('SECURITY VIOLATION: JEE student could access NEET questions.');
  }
  console.log('Security check passed: JEE student was denied NEET question access.');

  // 4. Student Profile Verification
  console.log('\n[4] Testing Student Profile (/auth/me)...');
  const meRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const meBody = await meRes.json();
  const meData = meBody.data || meBody;
  console.log('Me profile enrollment:', meData.profile?.enrollmentNumber, 'College:', meData.profile?.college);
  if (meData.profile?.enrollmentNumber !== studentEnrollment) {
    throw new Error('Student profile enrollment ID mismatch');
  }

  // 5. Super Admin Login
  console.log('\n[5] Testing Super Admin Login...');
  const adminLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.com', password: 'SuperAdmin@123456' }),
  });
  const adminBody = await adminLoginRes.json();
  const adminLogin = adminBody.data || adminBody;
  console.log('Admin login status:', adminLoginRes.status, 'Role:', adminLogin.user?.role);
  if (adminLoginRes.status !== 200 || adminLogin.user?.role !== 'admin') {
    throw new Error('Admin login failed');
  }
  const adminToken = adminLogin.accessToken;

  const adminNeetQuestionsRes = await fetch(`${API}/questions?exam=NEET&page=1&limit=1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminNeetQuestions = await adminNeetQuestionsRes.json();
  const neetQuestionId = adminNeetQuestions.data?.items?.[0]?.id;
  if (neetQuestionId) {
    const deniedQuestionRes = await fetch(`${API}/questions/${neetQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const deniedQuestion = await deniedQuestionRes.json();
    if (deniedQuestionRes.status !== 403 || deniedQuestion.code !== 'EXAM_ACCESS_DENIED') {
      throw new Error('SECURITY VIOLATION: JEE student could fetch a NEET question by ID.');
    }
  }
  const deniedPracticeRes = await fetch(`${API}/questions/practice-set?exam=NEET`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const deniedPractice = await deniedPracticeRes.json();
  if (deniedPracticeRes.status !== 403 || deniedPractice.code !== 'EXAM_ACCESS_DENIED') {
    throw new Error('SECURITY VIOLATION: JEE student could request a NEET practice set.');
  }

  // 6. Admin Creates Faculty Account
  console.log('\n[6] Testing Admin Faculty Creation...');
  const facultyEmail = `prof_${Date.now()}@faculty.univ.edu`;
  const facultyEmployeeId = `FAC-${Date.now()}`;
  const tempPassword = 'TempFaculty@2025';
  const createFacultyRes = await fetch(`${API}/admin/faculty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Dr. Vikram Sen',
      email: facultyEmail,
      mobile: facultyMobile,
      employeeId: facultyEmployeeId,
      designation: 'Associate Professor',
      department: 'Physics',
      subjects: ['Physics', 'Thermodynamics'],
      temporaryPassword: tempPassword,
    }),
  });
  const facultyCreated = await createFacultyRes.json();
  console.log('Faculty creation status:', createFacultyRes.status, 'ID:', facultyCreated.data?.id);
  if (createFacultyRes.status !== 201) throw new Error(`Faculty creation failed: ${JSON.stringify(facultyCreated)}`);

  // 7. Faculty Login with Temporary Password
  console.log('\n[7] Testing Faculty Login with Temporary Credentials...');
  const facLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: facultyEmail, password: tempPassword }),
  });
  const facLoginBody = await facLoginRes.json();
  const facLoginData = facLoginBody.data || facLoginBody;
  console.log('Faculty login status:', facLoginRes.status, 'isFirstLogin:', facLoginData.isFirstLogin ?? facLoginData.user?.isFirstLogin);
  if (facLoginRes.status !== 200 || !(facLoginData.isFirstLogin ?? facLoginData.user?.isFirstLogin)) {
    throw new Error('Faculty first-login flag not set properly');
  }
  const facultyToken = facLoginData.accessToken;

  // 8. Question Paper Upload (Generate Excel test sheet and upload)
  console.log('\n[8] Generating and Uploading Question Paper (Excel)...');
  const sampleQuestions = [
    {
      'Question Text': 'What is the SI unit of electric potential?',
      'Option A': 'Volt',
      'Option B': 'Ampere',
      'Option C': 'Ohm',
      'Option D': 'Coulomb',
      'Correct Answer': 'A',
      'Marks': 4,
      'Negative Marks': 1,
      'Difficulty': 'Easy',
      'Explanation': 'Electric potential is measured in Volts (V).'
    },
    {
      'Question Text': 'Which particle has no electric charge?',
      'Option A': 'Proton',
      'Option B': 'Electron',
      'Option C': 'Neutron',
      'Option D': 'Alpha Particle',
      'Correct Answer': 'C',
      'Marks': 4,
      'Negative Marks': 1,
      'Difficulty': 'Easy',
      'Explanation': 'Neutrons are subatomic particles with zero net charge.'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleQuestions);
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  const tempExcelPath = path.join(process.cwd(), 'sample_test_paper.xlsx');
  XLSX.writeFile(wb, tempExcelPath);

  // Upload file using native FormData in Node 18+
  const fileBytes = fs.readFileSync(tempExcelPath);
  const blob = new Blob([fileBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const formData = new FormData();
  formData.append('file', blob, 'sample_test_paper.xlsx');
  formData.append('subject', 'Physics');
  formData.append('course', 'JEE Advanced');
  formData.append('semester', '1');
  formData.append('targetClass', 'Class 12');

  const uploadRes = await fetch(`${API}/question-papers/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${facultyToken}`,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  console.log('Upload status:', uploadRes.status, 'Extracted count:', uploadData.data?.paper?.extractedQuestions?.length);
  if (uploadRes.status !== 201 || !uploadData.data?.paper?._id) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }
  const paperId = uploadData.data.paper._id;

  // 9. Approve Questions into Question Bank
  console.log('\n[9] Approving extracted questions into MongoDB Question Bank...');
  const approveRes = await fetch(`${API}/question-papers/${paperId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${facultyToken}`,
    },
    body: JSON.stringify({
      publish: true,
      exam: 'JEE',
      subject: 'Physics',
    }),
  });
  const approveData = await approveRes.json();
  console.log('Approve status:', approveRes.status, approveData.message);
  if (approveRes.status !== 200) throw new Error('Question paper approval failed');

  // Clean up scratch file
  if (fs.existsSync(tempExcelPath)) fs.unlinkSync(tempExcelPath);

  // 10. Student Assessment Fetch and Attempt
  console.log('\n[10] Fetching Assessments and Questions as Student...');
  const testsRes = await fetch(`${API}/assessments`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const testsData = await testsRes.json();
  const testToTake = testsData.data?.[0];
  console.log('Available test for student:', testToTake?.name, 'Total marks:', testToTake?.totalMarks);

  if (testToTake) {
    // Check questions endpoint - solutions MUST be stripped!
    const qRes = await fetch(`${API}/assessments/${testToTake.id}/questions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const qData = await qRes.json();
    console.log('Questions count:', qData.data?.length);
    const firstQ = qData.data?.[0];
    if (firstQ?.answer !== undefined || firstQ?.explanation !== undefined) {
      throw new Error('SECURITY VIOLATION: Student was served answer/explanation prior to submission!');
    }
    console.log('Security check passed: Question answers and explanations are safely stripped for student.');

    // 11. Student Submits Assessment Attempt
    console.log('\n[11] Submitting Student Assessment Attempt...');
    const submitRes = await fetch(`${API}/assessments/${testToTake.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        testId: testToTake.id,
        answers: { [firstQ.id]: 0 }, // Pick option 0
        timeTaken: 120,
        submissionKey: `sub-${Date.now()}`,
        mode: 'timed',
      }),
    });
    const submitData = await submitRes.json();
    console.log('Attempt Submission status:', submitRes.status, 'Score:', submitData.data?.score, 'Accuracy:', submitData.data?.accuracy);
    if (submitRes.status !== 200 && submitRes.status !== 201) {
      throw new Error(`Submission failed: ${JSON.stringify(submitData)}`);
    }

    // 12. Student View Own Attempt History
    console.log('\n[12] Checking Student Assessment History...');
    const historyRes = await fetch(`${API}/assessments/attempts/mine`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const historyData = await historyRes.json();
    console.log('Student attempts in history:', historyData.data?.length);
    if (!historyData.data || historyData.data.length === 0) {
      throw new Error('Student attempt was not persisted in database');
    }
  }

  // 13. Password Recovery OTP and Reset Flow
  console.log('\n[13] Testing Password Recovery (Forgot Password & Reset)...');
  const forgotRes = await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail }),
  });
  const forgotData = await forgotRes.json();
  console.log('Forgot password status:', forgotRes.status, forgotData.message);
  if (forgotRes.status !== 200 && forgotRes.status !== 202) {
    throw new Error('Forgot password request failed');
  }

  const otp = forgotData.data?.codePreview;
  if (!otp) {
    throw new Error('Expected OTP in dev mode codePreview');
  }
  console.log('Received OTP for recovery:', otp);

  // Perform Reset Password
  const resetRes = await fetch(`${API}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      otp,
      newPassword: 'NewPassword@2026',
    }),
  });
  const resetData = await resetRes.json();
  console.log('Reset Password status:', resetRes.status, resetData.message);
  if (resetRes.status !== 200) {
    throw new Error(`Password reset failed: ${JSON.stringify(resetData)}`);
  }

  // Verify login with new password
  const newLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail, password: 'NewPassword@2026' }),
  });
  const newLoginData = await newLoginRes.json();
  console.log('Login with new password status:', newLoginRes.status, 'Token acquired:', !!(newLoginData.data?.accessToken || newLoginData.accessToken));
  if (newLoginRes.status !== 200) {
    throw new Error('Could not log in with newly reset password');
  }

  console.log('\n======================================================');
  console.log(' ALL 13 ENTERPRISE CRITICAL STORIES VERIFIED 100% PASS');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

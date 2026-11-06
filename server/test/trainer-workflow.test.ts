import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-trainer-workflow-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let trainerToken: string;
let anotherTrainerToken: string;
let learnerToken: string;
let adminToken: string;

async function register(email: string, role: 'trainer' | 'learner') {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Workflow Tester', email, password: 'TrainerFlow!2026', role }),
  });
  assert.equal(response.status, 201);
  return (await response.json() as { token: string }).token;
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test API did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
  trainerToken = await register('trainer@example.com', 'trainer');
  anotherTrainerToken = await register('another-trainer@example.com', 'trainer');
  learnerToken = await register('learner@example.com', 'learner');
  store.users.create({
    name: 'Workflow Administrator',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('TrainerFlow!2026', 4),
    role: 'admin',
  });
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'TrainerFlow!2026' }),
  });
  assert.equal(adminLogin.status, 200);
  adminToken = (await adminLogin.json() as { token: string }).token;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('trainers save real assessment questions, submit drafts, and cannot self-approve', async () => {
  const createResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Trainer Workflow Course',
      category: 'Crop Production',
      description: 'A practical introduction to crop scouting.',
      objectives: 'Identify field indicators',
      skills: ['  Crop scouting  ', 'Integrated pest management'],
      lessons: [],
      level: 'Beginner',
      status: 'draft',
    }),
  });

  assert.equal(createResponse.status, 201);
  const { course } = await createResponse.json() as { course: { id: string; status: string; skills: string[] } };
  assert.equal(course.status, 'draft');
  assert.deepEqual(course.skills, ['Crop scouting', 'Integrated pest management']);

  const duplicateSkillsResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Duplicate Skills Course',
      category: 'Crop Production',
      skills: ['Crop scouting', ' crop SCOUTING '],
    }),
  });
  assert.equal(duplicateSkillsResponse.status, 400);

  const invalidAssessmentResponse = await fetch(`${baseUrl}/api/courses/${course.id}/assessments`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passingScore: 70,
      questions: [{ prompt: 'Too short', options: ['A', 'B'], correctOption: 2 }],
    }),
  });
  assert.equal(invalidAssessmentResponse.status, 400);

  const assessmentResponse = await fetch(`${baseUrl}/api/courses/${course.id}/assessments`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passingScore: 70,
      questions: [{
        prompt: 'Which sign may indicate early crop stress?',
        options: ['Leaf discoloration', 'A clean tool', 'A labelled seed bag'],
        correctOption: 0,
      }],
    }),
  });
  assert.equal(assessmentResponse.status, 200);
  const { assessment } = await assessmentResponse.json() as {
    assessment: { id: string; questions: Array<{ correctOption: number }> };
  };
  assert.equal(assessment.questions[0].correctOption, 0);

  const forbiddenAssessmentResponse = await fetch(`${baseUrl}/api/courses/${course.id}/assessments`, {
    headers: { Authorization: `Bearer ${anotherTrainerToken}` },
  });
  assert.equal(forbiddenAssessmentResponse.status, 403);

  const lesson = { title: 'Field scouting basics', type: 'Reading', duration: '8 min' };
  const secondLesson = { title: 'Recognizing crop stress', type: 'Reading', duration: '6 min' };
  const lessonSaveResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessons: [lesson, secondLesson],
      assessment: { assessmentId: assessment.id, questionCount: 1, passMark: 70 },
    }),
  });
  assert.equal(lessonSaveResponse.status, 200);
  const savedCoursesResponse = await fetch(`${baseUrl}/api/courses`);
  const savedCourses = (await savedCoursesResponse.json() as { courses: Array<Record<string, unknown>> }).courses;
  const savedCourse = savedCourses.find((item) => item.id === course.id);
  assert.ok(Array.isArray(savedCourse?.lessons), JSON.stringify(savedCourse));
  assert.ok(savedCourse?.assessment, JSON.stringify(savedCourse));
  assert.deepEqual(savedCourse?.skills, ['Crop scouting', 'Integrated pest management']);
  const savedAssessmentResponse = await fetch(`${baseUrl}/api/courses/${course.id}/assessments`, {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  assert.ok((await savedAssessmentResponse.json() as { assessment: unknown }).assessment);

  const submitResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'submitted' }),
  });
  const submittedCourse = await submitResponse.json() as { course?: { status: string }; error?: string };
  assert.equal(submitResponse.status, 200, submittedCourse.error);
  assert.equal(submittedCourse.course?.status, 'submitted');

  const editSubmittedResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Edited while under review' }),
  });
  assert.equal(editSubmittedResponse.status, 409);

  const selfApproveResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(selfApproveResponse.status, 403);

  const unavailableAssessmentResponse = await fetch(`${baseUrl}/api/courses/${course.id}/learner-assessment`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(unavailableAssessmentResponse.status, 404);

  const unpublishedLessonCompleteResponse = await fetch(`${baseUrl}/api/courses/${course.id}/lessons/0/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(unpublishedLessonCompleteResponse.status, 404);

  const unpublishedAttemptResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [0] }),
  });
  assert.equal(unpublishedAttemptResponse.status, 404);

  const approveForLearnerResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(approveForLearnerResponse.status, 200);

  const outOfOrderLessonResponse = await fetch(`${baseUrl}/api/courses/${course.id}/lessons/1/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(outOfOrderLessonResponse.status, 409);

  const prematureAssessmentResponse = await fetch(`${baseUrl}/api/courses/${course.id}/learner-assessment`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(prematureAssessmentResponse.status, 409);

  const prematureAttemptResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [0] }),
  });
  assert.equal(prematureAttemptResponse.status, 409);

  const lessonCompleteResponse = await fetch(`${baseUrl}/api/courses/${course.id}/lessons/0/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(lessonCompleteResponse.status, 200);
  assert.equal((await lessonCompleteResponse.json() as { completed: boolean }).completed, false);

  const repeatedLessonCompleteResponse = await fetch(`${baseUrl}/api/courses/${course.id}/lessons/0/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(repeatedLessonCompleteResponse.status, 200);

  const finalLessonCompleteResponse = await fetch(`${baseUrl}/api/courses/${course.id}/lessons/1/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(finalLessonCompleteResponse.status, 200);
  assert.equal((await finalLessonCompleteResponse.json() as { completed: boolean }).completed, true);

  const learnerAssessmentResponse = await fetch(`${baseUrl}/api/courses/${course.id}/learner-assessment`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(learnerAssessmentResponse.status, 200);
  const learnerAssessment = await learnerAssessmentResponse.json() as {
    assessment: { id: string; questions: Array<{ prompt: string; options: string[]; correctOption?: number }> };
  };
  assert.equal(learnerAssessment.assessment.questions.length, 1);
  assert.equal('correctOption' in learnerAssessment.assessment.questions[0], false);

  const incompleteAttemptResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(incompleteAttemptResponse.status, 400);

  const invalidOptionResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [3] }),
  });
  assert.equal(invalidOptionResponse.status, 400);

  const failedAttemptResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [1] }),
  });
  assert.equal(failedAttemptResponse.status, 201);
  const failedAttempt = await failedAttemptResponse.json() as {
    attempt: { passed: boolean };
    certificate: unknown;
  };
  assert.equal(failedAttempt.attempt.passed, false);
  assert.equal(failedAttempt.certificate, null);

  const learnerAttemptResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [0] }),
  });
  assert.equal(learnerAttemptResponse.status, 201);
  const { attempt, certificate } = await learnerAttemptResponse.json() as {
    attempt: { score: number; passed: boolean; userId: string };
    certificate: {
      userId: string;
      courseId: string;
      courseTitle: string;
      skills: string[];
      issuedAt: string;
      credentialId: string;
    } | null;
  };
  assert.equal(attempt.score, 100);
  assert.equal(attempt.passed, true);
  assert.equal(certificate?.courseId, course.id);
  assert.equal(certificate?.courseTitle, 'Trainer Workflow Course');
  assert.equal(certificate?.userId, attempt.userId);
  assert.deepEqual(certificate?.skills, ['Crop scouting', 'Integrated pest management']);
  assert.ok(certificate?.issuedAt);
  assert.ok(certificate?.credentialId);

  const repeatedAttemptResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [0] }),
  });
  assert.equal(repeatedAttemptResponse.status, 201);
  const repeatedCertificate = (await repeatedAttemptResponse.json() as {
    certificate: { credentialId: string } | null;
  }).certificate;
  assert.equal(repeatedCertificate?.credentialId, certificate?.credentialId);

  const certificatesResponse = await fetch(`${baseUrl}/api/certificates`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  const certificates = (await certificatesResponse.json() as {
    certificates: Array<{ courseId: string; skills: string[] }>;
  }).certificates;
  const courseCertificates = certificates.filter((item) => item.courseId === course.id);
  assert.equal(courseCertificates.length, 1);
  assert.deepEqual(courseCertificates[0].skills, ['Crop scouting', 'Integrated pest management']);

  const approveResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(approveResponse.status, 200);
  assert.equal((await approveResponse.json() as { course: { status: string } }).course.status, 'approved');
});

test('course owners can only save assessments for their own courses', async () => {
  const createResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Assessment Ownership Course',
      category: 'Crop Production',
      description: '',
      objectives: '',
      lessons: [],
      level: 'Beginner',
      status: 'draft',
    }),
  });
  assert.equal(createResponse.status, 201);
  const { course } = await createResponse.json() as { course: { id: string } };
  const response = await fetch(`${baseUrl}/api/courses/${course.id}/assessments`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${anotherTrainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passingScore: 70,
      questions: [{ prompt: 'Who owns this course?', options: ['Trainer', 'Nobody'], correctOption: 0 }],
    }),
  });
  assert.equal(response.status, 403);
});

test('learners discover published courses and enrol once through the published course flow', async () => {
  const course = store.create('courses', {
    title: 'Published Enrolment Test Course',
    category: 'Crop Production',
    description: 'A published course for learner enrolment.',
    objectives: 'Practice crop monitoring',
    skills: ['Crop monitoring'],
    lessons: [{ title: 'Crop monitoring basics', type: 'Reading', duration: '10 min' }],
    level: 'Beginner',
    status: 'approved',
    ownerId: 'workflow-trainer',
  });
  const draft = store.create('courses', {
    title: 'Unpublished Draft Course',
    category: 'Crop Production',
    status: 'draft',
    ownerId: 'workflow-trainer',
  });

  const publishedResponse = await fetch(`${baseUrl}/api/courses?published=true`);
  assert.equal(publishedResponse.status, 200);
  const publishedCourses = (await publishedResponse.json() as { courses: Array<{ id: string }> }).courses;
  assert.ok(publishedCourses.some((item) => item.id === course.id));
  assert.ok(!publishedCourses.some((item) => item.id === draft.id));

  const enrolResponse = await fetch(`${baseUrl}/api/courses/${course.id}/enrol`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(enrolResponse.status, 201);
  const firstEnrolment = await enrolResponse.json() as {
    progress: { courseId: string; userId: string; completedLessons: number[]; enrolledAt: string };
    enrolled: boolean;
  };
  assert.equal(firstEnrolment.enrolled, true);
  assert.equal(firstEnrolment.progress.courseId, course.id);
  assert.deepEqual(firstEnrolment.progress.completedLessons, []);
  assert.ok(firstEnrolment.progress.enrolledAt);

  const duplicateEnrolResponse = await fetch(`${baseUrl}/api/courses/${course.id}/enrol`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(duplicateEnrolResponse.status, 200);
  const duplicateEnrolment = await duplicateEnrolResponse.json() as { enrolled: boolean };
  assert.equal(duplicateEnrolment.enrolled, false);
  assert.equal(store.list('progress').filter((item) =>
    item.courseId === course.id && item.userId === store.users.findByEmail('learner@example.com')?.id).length, 1);

  const draftEnrolResponse = await fetch(`${baseUrl}/api/courses/${draft.id}/enrol`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(draftEnrolResponse.status, 404);

  const forbiddenEnrolResponse = await fetch(`${baseUrl}/api/courses/${course.id}/enrol`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  assert.equal(forbiddenEnrolResponse.status, 403);
});

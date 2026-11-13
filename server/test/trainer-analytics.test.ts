import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-trainer-analytics-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let trainerToken: string;
let otherTrainerToken: string;
let learnerToken: string;
let emptyTrainerToken: string;

async function createToken(email: string, role: 'trainer' | 'learner') {
  store.users.create({
    name: `${role} ${email}`,
    email,
    passwordHash: await bcrypt.hash('TrainerAnalytics!2026', 4),
    role,
  });
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TrainerAnalytics!2026' }),
  });
  assert.equal(response.status, 200);
  return (await response.json() as { token: string }).token;
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test API did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  trainerToken = await createToken('trainer-one@example.com', 'trainer');
  otherTrainerToken = await createToken('trainer-two@example.com', 'trainer');
  learnerToken = await createToken('learner-one@example.com', 'learner');
  emptyTrainerToken = await createToken('trainer-empty@example.com', 'trainer');

  const users = store.users.all();
  const learner = users.find((user) => user.email === 'learner-one@example.com');
  assert.ok(learner);
  store.users.updateProfile(learner.id, { name: 'Jordan Mokoena' });
  const secondLearner = store.users.create({
    name: 'Learner Two',
    email: 'learner-two@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'learner',
  });
  const employer = store.users.create({
    name: 'Employer Account',
    email: 'employer@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'employer',
  });
  const trainer = users.find((user) => user.email === 'trainer-one@example.com');
  const otherTrainer = users.find((user) => user.email === 'trainer-two@example.com');
  assert.ok(trainer);
  assert.ok(otherTrainer);

  const ownedCourse = store.create('courses', {
    title: 'Owned farming course',
    ownerId: trainer.id,
    status: 'approved',
    lessons: [{ title: 'Soil preparation' }, { title: 'Seed selection' }, { title: 'Planting' }],
  });
  const pendingCourse = store.create('courses', {
    title: 'Course awaiting review',
    ownerId: trainer.id,
    status: 'submitted',
    lessons: [{ title: 'Not published' }],
  });
  const otherCourse = store.create('courses', {
    title: 'Another trainer course',
    ownerId: otherTrainer.id,
    status: 'approved',
    lessons: [{ title: 'Private course lesson' }],
  });
  const assessment = store.create('assessments', {
    courseId: ownedCourse.id,
    ownerId: trainer.id,
    passingScore: 70,
    questions: [{ prompt: 'Private question', correctOption: 'secret-answer' }],
  });
  const otherAssessment = store.create('assessments', {
    courseId: otherCourse.id,
    ownerId: otherTrainer.id,
    passingScore: 70,
    questions: [],
  });
  store.create('progress', {
    courseId: ownedCourse.id,
    userId: learner.id,
    completedLessons: [0],
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  });
  store.create('progress', {
    courseId: ownedCourse.id,
    userId: secondLearner.id,
    completedLessons: [0, 1],
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  });
  store.create('progress', {
    courseId: otherCourse.id,
    userId: learner.id,
    completedLessons: [0],
  });
  store.create('progress', {
    courseId: ownedCourse.id,
    userId: employer.id,
    completedLessons: [0, 1, 2],
  });
  store.create('attempts', {
    assessmentId: assessment.id,
    userId: learner.id,
    score: 80,
    passed: true,
    answers: ['secret-answer'],
  });
  const secondAttempt = store.create('attempts', {
    assessmentId: assessment.id,
    userId: secondLearner.id,
    score: 50,
    passed: false,
    answers: ['private-answer'],
  });
  store.update('attempts', String(secondAttempt.id), {
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  });
  store.create('attempts', {
    assessmentId: otherAssessment.id,
    userId: learner.id,
    score: 100,
    passed: true,
  });
  store.create('certificates', { courseId: ownedCourse.id, userId: learner.id });
  store.create('certificates', { courseId: otherCourse.id, userId: learner.id });
  assert.ok(pendingCourse);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('trainer analytics only aggregates the trainer’s approved courses without learner or answer data', async () => {
  const response = await fetch(`${baseUrl}/api/trainer/analytics`, {
    headers: { Authorization: 'Bearer ' + trainerToken },
  });
  assert.equal(response.status, 200);
  const body = await response.json() as {
    generatedAt: string;
    activeLearnerWindowDays: number;
    summary: {
      publishedCourses: number;
      enrollmentCount: number;
      activeLearnerCount: number;
      averageCompletionRate: number | null;
      assessmentAttemptCount: number;
      averageAssessmentScore: number | null;
      assessmentPassRate: number | null;
      certificatesEarned: number;
    };
    courses: Array<{
      title: string;
      enrollmentCount: number;
      activeLearnerCount: number;
      averageCompletionRate: number | null;
      lessons: Array<{ title: string; completedCount: number; completionRate: number | null }>;
      assessment: { attemptCount: number; averageScore: number | null; passedCount: number; passRate: number | null };
      certificatesEarned: number;
    }>;
  };

  assert.equal(body.activeLearnerWindowDays, 30);
  assert.ok(!Number.isNaN(Date.parse(body.generatedAt)));
  assert.deepEqual(body.summary, {
    publishedCourses: 1,
    enrollmentCount: 2,
    activeLearnerCount: 1,
    averageCompletionRate: 50,
    assessmentAttemptCount: 2,
    averageAssessmentScore: 65,
    assessmentPassRate: 50,
    certificatesEarned: 1,
  });
  assert.equal(body.courses.length, 1);
  assert.equal(body.courses[0]?.title, 'Owned farming course');
  assert.equal(body.courses[0]?.activeLearnerCount, 1);
  assert.equal(body.courses[0]?.averageCompletionRate, 50);
  assert.deepEqual(body.courses[0]?.lessons, [
    { title: 'Soil preparation', completedCount: 2, completionRate: 100 },
    { title: 'Seed selection', completedCount: 1, completionRate: 50 },
    { title: 'Planting', completedCount: 0, completionRate: 0 },
  ]);
  assert.deepEqual(body.courses[0]?.assessment, {
    attemptCount: 2,
    averageScore: 65,
    passedCount: 1,
    passRate: 50,
  });
  assert.equal(body.courses[0]?.certificatesEarned, 1);
  const serialized = JSON.stringify(body);
  assert.equal(/"(?:userId|learnerId|email|answers|passwordHash|name)"\s*:/.test(serialized), false);
  for (const privateValue of [
    'learner-one@example.com',
    'learner-two@example.com',
    'Private question',
    'secret-answer',
    'private-answer',
    'Another trainer course',
    'Course awaiting review',
  ]) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test('trainer analytics returns an explicit empty dataset for trainers without published courses', async () => {
  const response = await fetch(`${baseUrl}/api/trainer/analytics`, {
    headers: { Authorization: 'Bearer ' + emptyTrainerToken },
  });
  assert.equal(response.status, 200);
  const body = await response.json() as {
    summary: { publishedCourses: number; enrollmentCount: number; averageCompletionRate: number | null };
    courses: unknown[];
  };
  assert.equal(body.summary.publishedCourses, 0);
  assert.equal(body.summary.enrollmentCount, 0);
  assert.equal(body.summary.averageCompletionRate, null);
  assert.deepEqual(body.courses, []);
});

test('active learner details return names on demand for recent activity in owned approved courses only', async () => {
  const response = await fetch(`${baseUrl}/api/trainer/analytics/active-learners`, {
    headers: { Authorization: 'Bearer ' + trainerToken },
  });
  assert.equal(response.status, 200);
  const body = await response.json() as {
    activeLearnerWindowDays: number;
    courses: Array<{ id: string; title: string; activeLearners: Array<{ name: string }> }>;
  };
  assert.equal(body.activeLearnerWindowDays, 30);
  assert.equal(body.courses.length, 1);
  assert.equal(body.courses[0]?.title, 'Owned farming course');
  assert.deepEqual(body.courses[0]?.activeLearners, [{ name: 'Jordan Mokoena' }]);

  const serialized = JSON.stringify(body);
  assert.equal(/"(?:userId|learnerId|email|answers|passwordHash)"\s*:/.test(serialized), false);
  for (const privateValue of [
    'learner-one@example.com',
    'learner-two@example.com',
    'Another trainer course',
    'Course awaiting review',
    'secret-answer',
    'private-answer',
  ]) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test('trainer analytics requires authentication and denies non-trainers', async () => {
  const anonymousResponse = await fetch(`${baseUrl}/api/trainer/analytics`);
  assert.equal(anonymousResponse.status, 401);

  const learnerResponse = await fetch(`${baseUrl}/api/trainer/analytics`, {
    headers: { Authorization: 'Bearer ' + learnerToken },
  });
  assert.equal(learnerResponse.status, 403);

  const otherTrainerResponse = await fetch(`${baseUrl}/api/trainer/analytics`, {
    headers: { Authorization: 'Bearer ' + otherTrainerToken },
  });
  assert.equal(otherTrainerResponse.status, 200);
  const otherTrainerBody = await otherTrainerResponse.json() as { courses: Array<{ title: string }> };
  assert.deepEqual(otherTrainerBody.courses.map((course) => course.title), ['Another trainer course']);

  const anonymousNamesResponse = await fetch(`${baseUrl}/api/trainer/analytics/active-learners`);
  assert.equal(anonymousNamesResponse.status, 401);

  const learnerNamesResponse = await fetch(`${baseUrl}/api/trainer/analytics/active-learners`, {
    headers: { Authorization: 'Bearer ' + learnerToken },
  });
  assert.equal(learnerNamesResponse.status, 403);
});

import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-admin-reports-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let adminToken: string;
let learnerToken: string;

async function createToken(email: string, role: 'admin' | 'learner') {
  store.users.create({
    name: `${role} user`,
    email,
    passwordHash: await bcrypt.hash('AdminReports!2026', 4),
    role,
  });
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'AdminReports!2026' }),
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

  adminToken = await createToken('admin@example.com', 'admin');
  learnerToken = await createToken('learner-one@example.com', 'learner');
  const learner = store.users.all().find((user) => user.email === 'learner-one@example.com');
  assert.ok(learner);
  const secondLearner = store.users.create({
    name: 'Second learner',
    email: 'learner-two@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'learner',
  });
  const trainer = store.users.create({
    name: 'Trainer User',
    email: 'trainer@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'trainer',
  });
  const course = store.create('courses', {
    title: 'Progress report course',
    ownerId: trainer.id,
    status: 'approved',
    lessons: [
      { title: 'Lesson one' },
      { title: 'Lesson two' },
      { title: 'Lesson three' },
      { title: 'Lesson four' },
    ],
  });
  store.create('progress', { courseId: course.id, userId: learner.id, completedLessons: [0, 1] });
  store.create('progress', { courseId: course.id, userId: secondLearner.id, completedLessons: [0, 1, 2, 3] });
  store.create('attempts', { assessmentId: 'assessment-one', userId: learner.id, score: 80, passed: true });
  store.create('certificates', { courseId: course.id, userId: learner.id });
  store.create('certificates', { courseId: course.id, userId: secondLearner.id });
  store.create('jobs', { title: 'Open vacancy', status: 'open', ownerId: 'employer-one' });
  store.create('jobs', { title: 'Closed vacancy', status: 'closed', ownerId: 'employer-one' });
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('admin reports calculate active learners, seven-day activity, completion, certificates, and open jobs from stored records', async () => {
  const response = await fetch(`${baseUrl}/api/admin/reports`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(response.status, 200);
  const report = await response.json() as {
    generatedAt: string;
    activeLearners: number;
    activeLearnerWindowDays: number;
    learningPerformance: Array<{ day: string; activeLearners: number }>;
    certificatesIssued: number;
    averageCompletionRate: number | null;
    completionRateEnrollmentCount: number;
    activeOpportunities: number;
  };

  assert.equal(report.activeLearners, 2);
  assert.equal(report.activeLearnerWindowDays, 30);
  assert.equal(report.learningPerformance.length, 7);
  assert.equal(report.learningPerformance.at(-1)?.activeLearners, 2);
  assert.equal(report.certificatesIssued, 2);
  assert.equal(report.averageCompletionRate, 75);
  assert.equal(report.completionRateEnrollmentCount, 2);
  assert.equal(report.activeOpportunities, 1);
  assert.ok(!Number.isNaN(Date.parse(report.generatedAt)));
});

test('admin reports are not available to unauthenticated or learner accounts', async () => {
  const anonymousResponse = await fetch(`${baseUrl}/api/admin/reports`);
  assert.equal(anonymousResponse.status, 401);

  const learnerResponse = await fetch(`${baseUrl}/api/admin/reports`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(learnerResponse.status, 403);
});

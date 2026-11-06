import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-roles-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let learnerToken: string;
let employerToken: string;
let secondEmployerToken: string;
let trainerToken: string;
let adminToken: string;

async function register(name: string, email: string, role: 'learner' | 'employer' | 'trainer') {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'RoleTest!2026', role }),
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

  [learnerToken, employerToken, secondEmployerToken, trainerToken] = await Promise.all([
    register('Role Learner', 'learner@roles.example', 'learner'),
    register('Role Employer', 'employer@roles.example', 'employer'),
    register('Second Employer', 'second-employer@roles.example', 'employer'),
    register('Role Trainer', 'trainer@roles.example', 'trainer'),
  ]);
  store.users.create({
    name: 'Role Administrator',
    email: 'admin@roles.example',
    passwordHash: await bcrypt.hash('RoleTest!2026', 4),
    role: 'admin',
  });
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@roles.example', password: 'RoleTest!2026' }),
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

test('public registration allows learner, employer, and trainer roles but not administrator', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Untrusted Administrator',
      email: 'untrusted-admin@roles.example',
      password: 'RoleTest!2026',
      role: 'admin',
    }),
  });
  assert.equal(response.status, 400);

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'untrusted-admin@roles.example', password: 'RoleTest!2026' }),
  });
  assert.equal(loginResponse.status, 401);
});

test('employers publish jobs, learners apply once, and application lists are role-scoped', async () => {
  const createResponse = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Field Coordinator',
      location: 'Gauteng',
      description: 'Coordinate local agricultural field projects.',
      type: 'Full-time',
    }),
  });
  assert.equal(createResponse.status, 201);
  const { job } = await createResponse.json() as { job: { id: string } };

  const secondJobResponse = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondEmployerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Farm Assistant',
      location: 'Limpopo',
      description: 'Support daily farming and field operations.',
      type: 'Part-time',
    }),
  });
  assert.equal(secondJobResponse.status, 201);
  const { job: secondJob } = await secondJobResponse.json() as { job: { id: string } };

  const thirdJobResponse = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondEmployerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Market Assistant',
      location: 'Free State',
      description: 'Help coordinate local agricultural market activity.',
      type: 'Contract',
    }),
  });
  assert.equal(thirdJobResponse.status, 201);
  const { job: thirdJob } = await thirdJobResponse.json() as { job: { id: string } };

  const unauthorizedJobResponse = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Unauthorized Job',
      location: 'Gauteng',
      description: 'A learner must not be able to publish a job.',
    }),
  });
  assert.equal(unauthorizedJobResponse.status, 403);

  const applyResponse = await fetch(`${baseUrl}/api/jobs/${job.id}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(applyResponse.status, 201);
  const secondApplyResponse = await fetch(`${baseUrl}/api/jobs/${secondJob.id}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(secondApplyResponse.status, 201);
  const employerApplyResponse = await fetch(`${baseUrl}/api/jobs/${thirdJob.id}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employerToken}` },
  });
  assert.equal(employerApplyResponse.status, 201);
  const { application: employerApplication } = await employerApplyResponse.json() as {
    application: { id: string; jobId: string };
  };
  assert.equal(employerApplication.jobId, thirdJob.id);
  const thirdJobLearnerApplication = await fetch(`${baseUrl}/api/jobs/${thirdJob.id}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(thirdJobLearnerApplication.status, 201);
  const duplicateResponse = await fetch(`${baseUrl}/api/jobs/${job.id}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(duplicateResponse.status, 409);

  const employerApplicationsResponse = await fetch(`${baseUrl}/api/applications`, {
    headers: { Authorization: `Bearer ${employerToken}` },
  });
  assert.equal(employerApplicationsResponse.status, 200);
  const employerApplications = (await employerApplicationsResponse.json() as {
    applications: Array<{ id: string; jobId: string; userId: string }>;
  }).applications;
  assert.equal(employerApplications.length, 2);
  assert.ok(employerApplications.some((item) => item.jobId === job.id));
  assert.ok(!employerApplications.some((item) => item.jobId === secondJob.id));
  assert.ok(employerApplications.some((item) => item.id === employerApplication.id && item.jobId === thirdJob.id));
  assert.equal(employerApplications.filter((item) => item.jobId === thirdJob.id).length, 1);

  const learnerApplicationsResponse = await fetch(`${baseUrl}/api/applications`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(learnerApplicationsResponse.status, 200);
  const learnerApplications = (await learnerApplicationsResponse.json() as {
    applications: Array<{ jobId: string }>;
  }).applications;
  assert.equal(learnerApplications.length, 3);

  const adminApplicationsResponse = await fetch(`${baseUrl}/api/applications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminApplicationsResponse.status, 200);
  assert.equal((await adminApplicationsResponse.json() as { applications: unknown[] }).applications.length, 4);

  const trainerApplicationsResponse = await fetch(`${baseUrl}/api/applications`, {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  assert.equal(trainerApplicationsResponse.status, 403);
});

test('trainers manage courses and administrators can review them', async () => {
  const learnerCourseResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Learner Course', category: 'Farming' }),
  });
  assert.equal(learnerCourseResponse.status, 403);

  const createResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${trainerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Soil Health Basics',
      category: 'Soil Management',
      description: 'An introductory soil health course.',
      lessons: [{ title: 'Soil basics', type: 'Reading', duration: '20 min' }],
    }),
  });
  assert.equal(createResponse.status, 201);
  const { course } = await createResponse.json() as { course: { id: string; status: string } };
  assert.equal(course.status, 'draft');

  const approvalResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(approvalResponse.status, 200);
  assert.equal((await approvalResponse.json() as { course: { status: string } }).course.status, 'approved');

  const usersResponse = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(usersResponse.status, 200);
  const adminUsers = (await usersResponse.json() as { users: Array<Record<string, unknown>> }).users;
  assert.ok(adminUsers.some((user) => user.role === 'learner'));
  assert.ok(adminUsers.every((user) => !('passwordHash' in user)));

  const forbiddenUsersResponse = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(forbiddenUsersResponse.status, 403);

  const [learnerProfileResponse, employerProfileResponse, trainerProfileResponse] = await Promise.all([
    fetch(`${baseUrl}/api/me`, { headers: { Authorization: `Bearer ${learnerToken}` } }),
    fetch(`${baseUrl}/api/me`, { headers: { Authorization: `Bearer ${employerToken}` } }),
    fetch(`${baseUrl}/api/me`, { headers: { Authorization: `Bearer ${trainerToken}` } }),
  ]);
  const learnerId = (await learnerProfileResponse.json() as { user: { id: string } }).user.id;
  const employerId = (await employerProfileResponse.json() as { user: { id: string } }).user.id;
  const trainerId = (await trainerProfileResponse.json() as { user: { id: string } }).user.id;

  const assessment = store.create('assessments', {
    courseId: course.id,
    ownerId: trainerId,
    questions: [{ prompt: 'Which practice protects soil?', options: ['Mulching', 'Burning'], correctOption: 0 }],
    passingScore: 100,
  });
  const employerLessonCompleteResponse = await fetch(`${baseUrl}/api/courses/${course.id}/lessons/0/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employerToken}` },
  });
  assert.equal(employerLessonCompleteResponse.status, 200);
  const employerAttemptResponse = await fetch(`${baseUrl}/api/assessments/${assessment.id}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [0] }),
  });
  assert.equal(employerAttemptResponse.status, 201);
  assert.equal((await employerAttemptResponse.json() as { attempt: { passed: boolean } }).attempt.passed, true);

  store.create('certificates', { userId: learnerId, courseId: course.id });
  const [learnerCertificatesResponse, employerCertificatesResponse] = await Promise.all([
    fetch(`${baseUrl}/api/certificates`, { headers: { Authorization: `Bearer ${learnerToken}` } }),
    fetch(`${baseUrl}/api/certificates`, { headers: { Authorization: `Bearer ${employerToken}` } }),
  ]);
  const learnerCertificates = (await learnerCertificatesResponse.json() as { certificates: Array<{ userId: string }> }).certificates;
  const employerCertificates = (await employerCertificatesResponse.json() as { certificates: Array<{ userId: string }> }).certificates;
  assert.equal(learnerCertificates.length, 1);
  assert.equal(learnerCertificates[0].userId, learnerId);
  assert.equal(employerCertificates.length, 1);
  assert.equal(employerCertificates[0].userId, employerId);
});

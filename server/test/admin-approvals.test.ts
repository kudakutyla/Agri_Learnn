import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-admin-approvals-test-'));
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
let trainerToken: string;
let submittedCourseId: string;
let secondCourseId: string;
let draftCourseId: string;

async function createToken(email: string, role: 'admin' | 'learner' | 'trainer', name = `${role} user`) {
  store.users.create({
    name,
    email,
    passwordHash: await bcrypt.hash('AdminApprovals!2026', 4),
    role,
  });
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'AdminApprovals!2026' }),
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
  learnerToken = await createToken('learner@example.com', 'learner');
  trainerToken = await createToken('trainer@example.com', 'trainer', 'Course Author');
  const trainer = store.users.all().find((user) => user.role === 'trainer');
  assert.ok(trainer);
  submittedCourseId = String(store.create('courses', {
    title: 'Submitted course',
    ownerId: trainer.id,
    description: 'A course under administrative review.',
    status: 'submitted',
    lessons: [{ title: 'Lesson one', type: 'Reading' }],
    assessment: { questionCount: 1, passMark: 70 },
  }).id);
  secondCourseId = String(store.create('courses', {
    title: 'Another submitted course',
    ownerId: trainer.id,
    status: 'submitted',
  }).id);
  draftCourseId = String(store.create('courses', {
    title: 'Draft course',
    ownerId: trainer.id,
    status: 'draft',
  }).id);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('admin approval queue returns only submitted and reviewed courses with author and review history', async () => {
  const anonymousResponse = await fetch(`${baseUrl}/api/admin/approvals`);
  assert.equal(anonymousResponse.status, 401);

  const response = await fetch(`${baseUrl}/api/admin/approvals`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(response.status, 200);
  const { courses } = await response.json() as {
    courses: Array<{ id: string; ownerName: string; reviews: unknown[] }>;
  };
  assert.deepEqual(new Set(courses.map((course) => course.id)), new Set([submittedCourseId, secondCourseId]));
  assert.ok(courses.every((course) => course.ownerName === 'Course Author'));
  assert.ok(courses.every((course) => course.reviews.length === 0));
});

test('only admins can list and review; returned courses require feedback and record a review audit', async () => {
  const forbiddenResponse = await fetch(`${baseUrl}/api/admin/approvals`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(forbiddenResponse.status, 403);

  const missingNoteResponse = await fetch(`${baseUrl}/api/admin/approvals/${submittedCourseId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected', note: 'no' }),
  });
  assert.equal(missingNoteResponse.status, 400);

  const returnResponse = await fetch(`${baseUrl}/api/admin/approvals/${submittedCourseId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected', note: 'Please add clear learning outcomes.' }),
  });
  assert.equal(returnResponse.status, 200);
  const returned = await returnResponse.json() as {
    course: { status: string; reviewNote: string; reviewedBy?: string };
    review: { status: string; note: string; reviewerId: string };
  };
  assert.equal(returned.course.status, 'rejected');
  assert.equal(returned.review.status, 'rejected');
  assert.equal(returned.review.note, 'Please add clear learning outcomes.');
  assert.ok(returned.review.reviewerId);
  assert.equal(returned.course.reviewedBy, undefined);

  const approveResponse = await fetch(`${baseUrl}/api/admin/approvals/${secondCourseId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(approveResponse.status, 200);
  assert.equal((await approveResponse.json() as { course: { status: string } }).course.status, 'approved');

  const draftReviewResponse = await fetch(`${baseUrl}/api/admin/approvals/${draftCourseId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(draftReviewResponse.status, 409);

  const duplicateReviewResponse = await fetch(`${baseUrl}/api/admin/approvals/${secondCourseId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected', note: 'This course was already reviewed.' }),
  });
  assert.equal(duplicateReviewResponse.status, 409);

  const queueResponse = await fetch(`${baseUrl}/api/admin/approvals`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const { courses } = await queueResponse.json() as {
    courses: Array<{ id: string; status: string; reviewNote?: string; reviews: Array<{ status: string }> }>;
  };
  const returnedCourse = courses.find((course) => course.id === submittedCourseId);
  assert.equal(returnedCourse?.status, 'rejected');
  assert.equal(returnedCourse?.reviewNote, 'Please add clear learning outcomes.');
  assert.deepEqual(returnedCourse?.reviews.map((review) => review.status), ['rejected']);
  const approvedCourse = courses.find((course) => course.id === secondCourseId);
  assert.equal(approvedCourse?.status, 'approved');
  assert.deepEqual(approvedCourse?.reviews.map((review) => review.status), ['approved']);

  const trainerCoursesResponse = await fetch(`${baseUrl}/api/trainer/courses`, {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  assert.equal(trainerCoursesResponse.status, 200);
  const trainerCourses = (await trainerCoursesResponse.json() as {
    courses: Array<{ id: string; reviewNote?: string }>;
  }).courses;
  assert.equal(trainerCourses.find((course) => course.id === submittedCourseId)?.reviewNote, 'Please add clear learning outcomes.');

  const learnerCoursesResponse = await fetch(`${baseUrl}/api/trainer/courses`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(learnerCoursesResponse.status, 403);

  const publicCoursesResponse = await fetch(`${baseUrl}/api/courses`);
  const publicCourses = (await publicCoursesResponse.json() as {
    courses: Array<{ id: string; reviewNote?: string; reviewedBy?: string }>;
  }).courses;
  const publicReturnedCourse = publicCourses.find((course) => course.id === submittedCourseId);
  assert.equal(publicReturnedCourse?.reviewNote, undefined);
  assert.equal(publicReturnedCourse?.reviewedBy, undefined);
});

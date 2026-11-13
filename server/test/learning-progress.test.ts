import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-learning-progress-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let learnerToken: string;
let secondLearnerToken: string;
let trainerToken: string;
let learnerId: string;
let trainerId: string;

async function register(name: string, email: string, role: 'learner' | 'trainer' = 'learner') {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'LearningProgress!2026', role }),
  });
  assert.equal(response.status, 201);
  return await response.json() as { user: { id: string }; token: string };
}

function createCourse(title: string, status = 'approved') {
  return store.create('courses', {
    title,
    category: 'Soil health',
    description: 'A course used to verify learner-specific progress.',
    objectives: '',
    skills: ['Soil assessment'],
    lessons: [
      { title: 'Reading your soil', type: 'Reading', duration: '10 min' },
      { title: 'Building healthy soil', type: 'Reading', duration: '15 min' },
    ],
    files: [],
    level: 'Beginner',
    status,
    ownerId: trainerId,
  });
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test API did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const [learner, secondLearner, trainer] = await Promise.all([
    register('Progress Learner', 'progress-learner@example.com'),
    register('Second Progress Learner', 'second-progress-learner@example.com'),
    register('Progress Trainer', 'progress-trainer@example.com', 'trainer'),
  ]);
  learnerToken = learner.token;
  learnerId = learner.user.id;
  secondLearnerToken = secondLearner.token;
  trainerToken = trainer.token;
  trainerId = trainer.user.id;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('new learners have no in-progress courses until they enrol', async () => {
  const response = await fetch(`${baseUrl}/api/me/progress`, {
    headers: { Authorization: ['Bearer', learnerToken].join(' ') },
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json() as { courses: unknown[] }).courses, []);
});

test('learner progress lists only their approved enrolments with sanitized lesson progress', async () => {
  const startedCourse = createCourse('My started course');
  const enrolledCourse = createCourse('My enrolled course');
  const anotherLearnerCourse = createCourse('Another learner course');
  const draftCourse = createCourse('Unpublished course', 'draft');

  store.create('progress', {
    courseId: startedCourse.id,
    userId: learnerId,
    completedLessons: [0, 0, -1, 8, 'invalid'],
  });
  store.create('progress', {
    courseId: enrolledCourse.id,
    userId: learnerId,
    completedLessons: [],
  });
  store.create('progress', {
    courseId: anotherLearnerCourse.id,
    userId: 'another-user',
    completedLessons: [0],
  });
  store.create('progress', {
    courseId: draftCourse.id,
    userId: learnerId,
    completedLessons: [0],
  });

  const response = await fetch(`${baseUrl}/api/me/progress`, {
    headers: { Authorization: ['Bearer', learnerToken].join(' ') },
  });
  assert.equal(response.status, 200);
  const result = await response.json() as {
    courses: Array<{
      course: { id: string; title: string };
      completedLessons: number[];
      progressPercent: number;
      nextLessonIndex: number;
    }>;
  };
  assert.deepEqual(result.courses.map((item) => item.course.id), [enrolledCourse.id, startedCourse.id]);
  assert.deepEqual(result.courses[0], {
    course: result.courses[0].course,
    completedLessons: [],
    progressPercent: 0,
    nextLessonIndex: 0,
    lastLessonIndex: null,
    resumeLessonIndex: 0,
  });
  assert.equal(result.courses[0].course.title, 'My enrolled course');
  assert.deepEqual(result.courses[1].completedLessons, [0]);
  assert.equal(result.courses[1].progressPercent, 50);
  assert.equal(result.courses[1].nextLessonIndex, 1);
});

test('saving a lesson position creates or updates the learner enrolment and resumes there', async () => {
  const course = createCourse('Saved position course');
  const saveResponse = await fetch(`${baseUrl}/api/courses/${course.id}/progress`, {
    method: 'PUT',
    headers: {
      Authorization: ['Bearer', learnerToken].join(' '),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lessonIndex: 1 }),
  });
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json() as {
    progress: { userId: string; courseId: string; completedLessons: number[]; lastLessonIndex: number };
  };
  assert.equal(saved.progress.userId, learnerId);
  assert.equal(saved.progress.courseId, course.id);
  assert.deepEqual(saved.progress.completedLessons, []);
  assert.equal(saved.progress.lastLessonIndex, 1);

  const resumeResponse = await fetch(`${baseUrl}/api/courses/${course.id}/progress`, {
    headers: { Authorization: ['Bearer', learnerToken].join(' ') },
  });
  assert.equal(resumeResponse.status, 200);
  assert.deepEqual(await resumeResponse.json(), {
    completedLessons: [],
    nextLessonIndex: 0,
    resumeLessonIndex: 1,
  });

  const listResponse = await fetch(`${baseUrl}/api/me/progress`, {
    headers: { Authorization: ['Bearer', learnerToken].join(' ') },
  });
  const summaries = (await listResponse.json() as {
    courses: Array<{ course: { id: string }; progressPercent: number; lastLessonIndex: number | null; resumeLessonIndex: number }>;
  }).courses;
  assert.deepEqual(summaries.find((item) => item.course.id === course.id), {
    course,
    completedLessons: [],
    progressPercent: 0,
    nextLessonIndex: 0,
    lastLessonIndex: 1,
    resumeLessonIndex: 1,
  });

  const invalidPosition = await fetch(`${baseUrl}/api/courses/${course.id}/progress`, {
    method: 'PUT',
    headers: {
      Authorization: ['Bearer', learnerToken].join(' '),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lessonIndex: 2 }),
  });
  assert.equal(invalidPosition.status, 400);
});

test('learner progress requires authentication and learner or employer role', async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/me/progress`);
  assert.equal(unauthenticated.status, 401);

  const trainerResponse = await fetch(`${baseUrl}/api/me/progress`, {
    headers: { Authorization: ['Bearer', trainerToken].join(' ') },
  });
  assert.equal(trainerResponse.status, 403);

  const secondLearnerResponse = await fetch(`${baseUrl}/api/me/progress`, {
    headers: { Authorization: ['Bearer', secondLearnerToken].join(' ') },
  });
  assert.equal(secondLearnerResponse.status, 200);
  assert.deepEqual((await secondLearnerResponse.json() as { courses: unknown[] }).courses, []);
});

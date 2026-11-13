import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-video-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');
process.env.R2_MAX_VIDEO_BYTES = '1048576';
for (const name of [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT',
]) process.env[name] = '';

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let trainerToken: string;
let learnerToken: string;
let adminToken: string;
let courseId: string;

async function register(name: string, email: string, role: 'trainer' | 'learner') {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'VideoTest!2026', role }),
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

  [trainerToken, learnerToken] = await Promise.all([
    register('Video Trainer', 'video-trainer@example.com', 'trainer'),
    register('Video Learner', 'video-learner@example.com', 'learner'),
  ]);
  store.users.create({
    name: 'Video Administrator',
    email: 'video-admin@example.com',
    passwordHash: await bcrypt.hash('VideoTest!2026', 4),
    role: 'admin',
  });
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'video-admin@example.com', password: 'VideoTest!2026' }),
  });
  assert.equal(adminLogin.status, 200);
  adminToken = (await adminLogin.json() as { token: string }).token;

  const courseResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', trainerToken].join(' '), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'R2 video test course',
      category: 'Crop production',
      description: '',
      objectives: '',
      lessons: [{ title: 'Video lesson', type: 'Video', duration: '5 min' }],
      level: 'Beginner',
      status: 'draft',
    }),
  });
  assert.equal(courseResponse.status, 201);
  courseId = (await courseResponse.json() as { course: { id: string } }).course.id;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('requires trainer authorization and rejects invalid video metadata', async () => {
  const details = {
    lessonIndex: 0,
    fileName: 'lesson.mp4',
    mimeType: 'video/mp4',
    fileSize: 1024,
  };
  const unauthenticated = await fetch(`${baseUrl}/api/courses/${courseId}/videos/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  });
  assert.equal(unauthenticated.status, 401);

  const learnerResponse = await fetch(`${baseUrl}/api/courses/${courseId}/videos/uploads`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', learnerToken].join(' '), 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  });
  assert.equal(learnerResponse.status, 403);

  const invalidType = await fetch(`${baseUrl}/api/courses/${courseId}/videos/uploads`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', trainerToken].join(' '), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...details, fileName: 'lesson.webm', mimeType: 'video/webm' }),
  });
  assert.equal(invalidType.status, 415);

  const invalidSize = await fetch(`${baseUrl}/api/courses/${courseId}/videos/uploads`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', trainerToken].join(' '), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...details, fileSize: 1_048_577 }),
  });
  assert.equal(invalidSize.status, 413);

  const oldUploadRoute = await fetch(`${baseUrl}/api/courses/${courseId}/uploads`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', trainerToken].join(' '), 'X-Upload-Kind': 'video' },
  });
  assert.equal(oldUploadRoute.status, 410);
});

test('returns a clear configuration error when R2 is missing', async () => {
  const response = await fetch(`${baseUrl}/api/courses/${courseId}/videos/uploads`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', trainerToken].join(' '), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonIndex: 0,
      fileName: 'lesson.mp4',
      mimeType: 'video/mp4',
      fileSize: 1024,
    }),
  });
  assert.equal(response.status, 503);
  assert.match((await response.json() as { error: string }).error, /not configured/i);
  assert.equal(store.list('videos').length, 0);
});

test('restricts playback to enrolled learners and keeps storage keys private', async () => {
  const course = store.list('courses').find((item) => item.id === courseId);
  assert.ok(course);
  const video = store.create('videos', {
    courseId,
    lessonIndex: 0,
    originalFileName: 'lesson.mp4',
    storageKey: `videos/${courseId}/private-random-object.mp4`,
    mimeType: 'video/mp4',
    fileSize: 1024,
    status: 'uploaded',
    uploadedBy: store.users.findByEmail('video-trainer@example.com')?.id,
  });
  const lessons = course.lessons as Array<Record<string, unknown>>;
  store.update('courses', courseId, {
    status: 'approved',
    lessons: lessons.map((lesson, index) => index === 0
      ? { ...lesson, file: { id: video.id, name: 'lesson.mp4', mimeType: 'video/mp4', size: 1024 } }
      : lesson),
  });

  const notEnrolled = await fetch(`${baseUrl}/api/videos/${video.id}/playback-url`, {
    headers: { Authorization: ['Bearer', learnerToken].join(' ') },
  });
  assert.equal(notEnrolled.status, 403);

  const learnerId = store.users.findByEmail('video-learner@example.com')?.id;
  assert.ok(learnerId);
  store.create('progress', { courseId, userId: learnerId, completedLessons: [], enrolledAt: new Date().toISOString() });
  const enrolledWithoutStorage = await fetch(`${baseUrl}/api/videos/${video.id}/playback-url`, {
    headers: { Authorization: ['Bearer', learnerToken].join(' ') },
  });
  assert.equal(enrolledWithoutStorage.status, 503);
  assert.match((await enrolledWithoutStorage.json() as { error: string }).error, /not configured/i);

  const adminList = await fetch(`${baseUrl}/api/admin/videos`, {
    headers: { Authorization: ['Bearer', adminToken].join(' ') },
  });
  assert.equal(adminList.status, 200);
  const returnedVideo = (await adminList.json() as { videos: Array<Record<string, unknown>> }).videos[0];
  assert.equal(returnedVideo.id, video.id);
  assert.equal(returnedVideo.courseTitle, 'R2 video test course');
  assert.equal('storageKey' in returnedVideo, false);
  assert.equal('multipartUploadId' in returnedVideo, false);

  const learnerAdminList = await fetch(`${baseUrl}/api/admin/videos`, {
    headers: { Authorization: ['Bearer', learnerToken].join(' ') },
  });
  assert.equal(learnerAdminList.status, 403);
});

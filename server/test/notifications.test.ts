import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-notifications-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let firstUser: { id: string; token: string };
let secondUser: { id: string; token: string };

async function register(name: string, email: string) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'NotificationTest!2026' }),
  });
  assert.equal(response.status, 201);
  return (await response.json() as { user: { id: string }; token: string });
}

async function getNotifications(token: string) {
  const response = await fetch(`${baseUrl}/api/me/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  return (await response.json() as {
    notifications: Array<{ id: string; title: string; message: string; createdAt: string }>;
  }).notifications;
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test API did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const [first, second] = await Promise.all([
    register('First Learner', 'first-notifications@example.com'),
    register('Second Learner', 'second-notifications@example.com'),
  ]);
  firstUser = { id: first.user.id, token: first.token };
  secondUser = { id: second.user.id, token: second.token };
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('notifications list includes only notifications belonging to the authenticated user', async () => {
  const course = store.create('courses', {
    title: 'User-specific Soil Course',
    category: 'Soil health',
    description: 'A course used to verify user-specific notifications.',
    lessons: [{ title: 'Healthy soil', type: 'Reading', duration: '10 min' }],
    level: 'Beginner',
    status: 'approved',
    ownerId: 'trainer-id',
  });
  const enrollResponse = await fetch(`${baseUrl}/api/courses/${course.id}/enrol`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${firstUser.token}` },
  });
  assert.equal(enrollResponse.status, 201);

  const completeLesson = () => fetch(`${baseUrl}/api/courses/${course.id}/lessons/0/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${firstUser.token}` },
  });
  assert.equal((await completeLesson()).status, 200);
  assert.equal((await completeLesson()).status, 200);

  const [firstNotifications, secondNotifications] = await Promise.all([
    getNotifications(firstUser.token),
    getNotifications(secondUser.token),
  ]);
  assert.deepEqual(firstNotifications.map(({ title }) => title), [
    'Course progress saved',
    'Course enrolled',
    'Welcome to AgriLearn',
  ]);
  assert.deepEqual(secondNotifications.map(({ title }) => title), ['Welcome to AgriLearn']);
  assert.match(firstNotifications.at(-1)?.message ?? '', /First Learner/);
  assert.equal(firstNotifications.some((notification) => notification.message.includes('Second Learner')), false);
  assert.equal('userId' in firstNotifications[0], false);
});

test('listing notifications requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/me/notifications`);
  assert.equal(response.status, 401);
});

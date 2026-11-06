import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-admin-overview-test-'));
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
    passwordHash: await bcrypt.hash('AdminOverview!2026', 4),
    role,
  });
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'AdminOverview!2026' }),
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
  const learner = store.users.all().find((user) => user.role === 'learner');
  assert.ok(learner);
  const trainer = store.users.create({
    name: 'Trainer User',
    email: 'trainer@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'trainer',
  });
  const employer = store.users.create({
    name: 'Employer User',
    email: 'employer@example.com',
    passwordHash: 'not-used-in-this-test',
    role: 'employer',
  });
  store.create('courses', { title: 'Published course', ownerId: trainer.id, status: 'approved' });
  store.create('courses', { title: 'Submitted course', ownerId: trainer.id, status: 'submitted' });
  store.create('courses', { title: 'Draft course', ownerId: trainer.id, status: 'draft' });
  store.create('certificates', { userId: learner.id, courseId: 'published-course' });
  store.create('jobs', { title: 'Open vacancy', ownerId: employer.id, status: 'open' });
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('admin overview summarizes persisted platform data', async () => {
  const response = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(response.status, 200);
  const overview = await response.json() as {
    metrics: Record<string, number>;
    learnerGrowth: { month: string; learners: number }[];
    recentActivity: { type: string; title: string; createdAt: string }[];
  };

  assert.deepEqual(overview.metrics, {
    registeredLearners: 1,
    publishedModules: 1,
    certificatesIssued: 1,
    registeredSMMEs: 1,
    pendingApprovals: 1,
  });
  assert.equal(overview.learnerGrowth.length, 6);
  assert.equal(overview.learnerGrowth.reduce((total, item) => total + item.learners, 0), 1);
  assert.equal(overview.recentActivity.length, 3);
  assert.ok(overview.recentActivity.some((activity) => activity.type === 'approval' && activity.title.includes('Trainer User')));
  assert.ok(overview.recentActivity.some((activity) => activity.type === 'learner'));
  assert.ok(overview.recentActivity.some((activity) => activity.type === 'vacancy' && activity.title.includes('Employer User')));
});

test('admin overview is unavailable to unauthenticated and learner accounts', async () => {
  const anonymousResponse = await fetch(`${baseUrl}/api/admin/overview`);
  assert.equal(anonymousResponse.status, 401);

  const learnerResponse = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(learnerResponse.status, 403);
});

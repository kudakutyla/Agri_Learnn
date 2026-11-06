import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-opportunities-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const { app } = await import('../src/index.js');

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let employerToken: string;
let learnerToken: string;
let trainerToken: string;

async function register(name: string, email: string, role: 'employer' | 'learner' | 'trainer') {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'OpportunityTest!2026', role }),
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
  employerToken = await register('Opportunity Employer', 'employer@example.com', 'employer');
  learnerToken = await register('Opportunity Learner', 'learner@example.com', 'learner');
  trainerToken = await register('Opportunity Trainer', 'trainer@example.com', 'trainer');
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('learners can browse published opportunities and submit one application', async () => {
  const createResponse = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Field Coordinator',
      location: 'Gauteng',
      description: 'Coordinate local agricultural field projects.',
      requiredSkills: ['Crop monitoring', 'Irrigation scheduling', 'Farm record keeping'],
      type: 'Full-time',
    }),
  });
  assert.equal(createResponse.status, 201);
  const { job } = await createResponse.json() as {
    job: { id: string; title: string; requiredSkills: string[] };
  };
  assert.deepEqual(job.requiredSkills, ['Crop monitoring', 'Irrigation scheduling', 'Farm record keeping']);

  const listResponse = await fetch(`${baseUrl}/api/jobs`);
  assert.equal(listResponse.status, 200);
  const listedJobs = (await listResponse.json() as {
    jobs: Array<{ id: string; requiredSkills?: string[] }>;
  }).jobs;
  assert.deepEqual(listedJobs.find((item) => item.id === job.id)?.requiredSkills, job.requiredSkills);

  const invalidSkillsResponse = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${employerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Field Assistant',
      location: 'Gauteng',
      description: 'Support agricultural field work during the growing season.',
      requiredSkills: ['x'],
    }),
  });
  assert.equal(invalidSkillsResponse.status, 400);

  const submitResponse = await fetch(`${baseUrl}/api/jobs/${job.id}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(submitResponse.status, 201);
  const { application } = await submitResponse.json() as { application: { jobId: string; userId: string; status: string } };
  assert.equal(application.jobId, job.id);
  assert.equal(application.status, 'submitted');

  const applicationsResponse = await fetch(`${baseUrl}/api/applications`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(applicationsResponse.status, 200);
  const applications = (await applicationsResponse.json() as { applications: Array<{ jobId: string; userId: string }> }).applications;
  assert.equal(applications.filter((item) => item.jobId === job.id && item.userId === application.userId).length, 1);

  const duplicateResponse = await fetch(`${baseUrl}/api/jobs/${job.id}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(duplicateResponse.status, 409);
});

test('opportunity applications reject unauthenticated and trainer requests', async () => {
  const unauthenticatedResponse = await fetch(`${baseUrl}/api/jobs/unknown/applications`, { method: 'POST' });
  assert.equal(unauthenticatedResponse.status, 401);

  const trainerResponse = await fetch(`${baseUrl}/api/jobs/unknown/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  assert.equal(trainerResponse.status, 403);
});

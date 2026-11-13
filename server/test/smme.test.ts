import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-smme-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const [{ app }] = await Promise.all([import('../src/index.js')]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let employerToken: string;
let secondEmployerToken: string;
let learnerToken: string;

async function register(name: string, email: string, role: 'learner' | 'employer') {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'SMMeTest!2026', role }),
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
  [employerToken, secondEmployerToken, learnerToken] = await Promise.all([
    register('SMME Owner', 'smme@roles.example', 'employer'),
    register('Second SMME', 'second-smme@roles.example', 'employer'),
    register('SMME Learner', 'smme-learner@roles.example', 'learner'),
  ]);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

const diagnostic = {
  registrationLegalForm: 3,
  managementGovernance: 2,
  financeRecordKeeping: 1,
  marketReadiness: 2,
  technologyAdoption: 3,
  skillsProfile: 2,
  regulatoryCompliance: 3,
  productionCapability: 4,
  logistics: 2,
  fundingReadiness: 1,
  digitalMaturity: 2,
};

test('SMME plan saves private business profile, diagnostic history, and development progress', async () => {
  const path = `${baseUrl}/api/smme/plan`;
  const headers = { Authorization: `Bearer ${employerToken}`, 'Content-Type': 'application/json' };

  const emptyResponse = await fetch(path, { headers });
  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(await emptyResponse.json(), { plan: null });

  const profileResponse = await fetch(path, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      businessName: 'Green Valley Co-operative',
      legalForm: 'Co-operative',
      province: 'Gauteng',
      sector: 'Vegetable production',
      productsServices: 'Fresh vegetables',
      businessDescription: 'A small vegetable producer.',
    }),
  });
  assert.equal(profileResponse.status, 200);
  const { plan: profilePlan } = await profileResponse.json() as { plan: { id: string; businessName: string } };
  assert.equal(profilePlan.businessName, 'Green Valley Co-operative');
  assert.equal(typeof profilePlan.id, 'string');

  const updateResponse = await fetch(path, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      diagnostic,
      fundingChecklist: ['registration', 'financial-records'],
      mentorRequested: true,
    }),
  });
  assert.equal(updateResponse.status, 200);
  const { plan } = await updateResponse.json() as {
    plan: {
      assessmentHistory: { maturityScore: number }[];
      diagnostic: typeof diagnostic;
      fundingChecklist: string[];
      mentorRequested: boolean;
    };
  };
  assert.deepEqual(plan.diagnostic, diagnostic);
  assert.equal(plan.assessmentHistory.length, 1);
  assert.equal(plan.assessmentHistory[0].maturityScore, 45);
  assert.deepEqual(plan.fundingChecklist, ['registration', 'financial-records']);
  assert.equal(plan.mentorRequested, true);

  const reassessmentResponse = await fetch(path, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ diagnostic: { ...diagnostic, financeRecordKeeping: 4 } }),
  });
  assert.equal(reassessmentResponse.status, 200);
  const { plan: reassessedPlan } = await reassessmentResponse.json() as { plan: typeof plan };
  assert.equal(reassessedPlan.assessmentHistory.length, 2);

  const otherOwnerResponse = await fetch(path, {
    headers: { Authorization: `Bearer ${secondEmployerToken}` },
  });
  assert.deepEqual(await otherOwnerResponse.json(), { plan: null });
});

test('SMME plan rejects invalid data and non-employer access', async () => {
  const path = `${baseUrl}/api/smme/plan`;
  const invalidResponse = await fetch(path, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${employerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: 'A', diagnostic: { ...diagnostic, digitalMaturity: 6 } }),
  });
  assert.equal(invalidResponse.status, 400);

  const learnerResponse = await fetch(path, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(learnerResponse.status, 403);

  const anonymousResponse = await fetch(path);
  assert.equal(anonymousResponse.status, 401);
});

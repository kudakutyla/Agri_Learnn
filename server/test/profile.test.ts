import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-profile-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');

const { app } = await import('../src/index.js');

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let token: string;
const initialPassword = 'ProfileTest!2026';

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test API did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Profile Tester',
      email: 'profile-tester@example.com',
      password: initialPassword,
      mobileNumber: '+27 82 123 4567',
      province: 'Gauteng',
      category: 'Farmer',
      primaryInterest: 'Soil health',
      language: 'isiXhosa',
    }),
  });
  assert.equal(response.status, 201);
  const registeredUser = await response.json() as { token: string; user: { language: string } };
  token = registeredUser.token;
  assert.equal(registeredUser.user.language, 'isiXhosa');
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('registration rejects unsupported preferred languages', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Invalid Language',
      email: 'invalid-language@example.com',
      password: initialPassword,
      language: 'Klingon',
    }),
  });
  assert.equal(response.status, 400);
});

test('registration details can be edited and retrieved from the authenticated profile', async () => {
  const updateResponse = await fetch(`${baseUrl}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Updated Profile Name',
      email: 'profile-updated@example.com',
      mobileNumber: '+27 82 555 0101',
      province: 'Western Cape',
      category: 'Agricultural worker',
      primaryInterest: 'Irrigation',
      language: 'Setswana',
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updatedUser = (await updateResponse.json() as { user: Record<string, string> }).user;
  assert.equal(updatedUser.name, 'Updated Profile Name');
  assert.equal(updatedUser.email, 'profile-updated@example.com');
  assert.equal(updatedUser.mobileNumber, '+27 82 555 0101');
  assert.equal(updatedUser.province, 'Western Cape');
  assert.equal(updatedUser.category, 'Agricultural worker');
  assert.equal(updatedUser.primaryInterest, 'Irrigation');
  assert.equal(updatedUser.language, 'Setswana');
  assert.equal('passwordHash' in updatedUser, false);

  const profileResponse = await fetch(`${baseUrl}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(profileResponse.status, 200);
  const savedUser = (await profileResponse.json() as { user: Record<string, string> }).user;
  assert.equal(savedUser.name, 'Updated Profile Name');
  assert.equal(savedUser.email, 'profile-updated@example.com');
  assert.equal(savedUser.primaryInterest, 'Irrigation');
  assert.equal(savedUser.language, 'Setswana');
});

test('profile updates require authentication and a valid name', async () => {
  const unauthenticatedResponse = await fetch(`${baseUrl}/api/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Updated Name' }),
  });
  assert.equal(unauthenticatedResponse.status, 401);

  const invalidResponse = await fetch(`${baseUrl}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: ' ',
      email: 'profile-updated@example.com',
      mobileNumber: '',
      province: '',
      category: '',
      primaryInterest: '',
    }),
  });
  assert.equal(invalidResponse.status, 400);
});

test('profile updates reject an email already used by another account', async () => {
  const secondAccountResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another Profile',
      email: 'another-profile@example.com',
      password: initialPassword,
    }),
  });
  assert.equal(secondAccountResponse.status, 201);
  assert.equal((await secondAccountResponse.json() as { user: { language: string } }).user.language, 'English');

  const response = await fetch(`${baseUrl}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Profile Tester',
      email: 'another-profile@example.com',
      mobileNumber: '',
      province: '',
      category: '',
      primaryInterest: '',
    }),
  });
  assert.equal(response.status, 409);
});

test('changing password requires the current password and invalidates the old password', async () => {
  const missingCurrentPasswordResponse = await fetch(`${baseUrl}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Updated Profile Name',
      email: 'profile-updated@example.com',
      mobileNumber: '+27 82 555 0101',
      province: 'Western Cape',
      category: 'Agricultural worker',
      primaryInterest: 'Irrigation',
      newPassword: 'NewProfileTest!2026',
    }),
  });
  assert.equal(missingCurrentPasswordResponse.status, 400);

  const changeResponse = await fetch(`${baseUrl}/api/me`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Updated Profile Name',
      email: 'profile-updated@example.com',
      mobileNumber: '+27 82 555 0101',
      province: 'Western Cape',
      category: 'Agricultural worker',
      primaryInterest: 'Irrigation',
      currentPassword: initialPassword,
      newPassword: 'NewProfileTest!2026',
    }),
  });
  assert.equal(changeResponse.status, 200);

  const oldLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'profile-updated@example.com', password: initialPassword }),
  });
  assert.equal(oldLoginResponse.status, 401);

  const newLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'profile-updated@example.com', password: 'NewProfileTest!2026' }),
  });
  assert.equal(newLoginResponse.status, 200);
});

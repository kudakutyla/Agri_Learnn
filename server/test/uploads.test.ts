import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-upload-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');
process.env.UPLOADS_DIR = join(testDirectory, 'uploads');

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let token: string;
let adminToken: string;

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
      name: 'Upload Tester',
      email: 'upload-tester@example.com',
      password: 'UploadTest!2026',
      role: 'trainer',
    }),
  });
  assert.equal(response.status, 201);
  token = (await response.json() as { token: string }).token;
  store.users.create({
    name: 'Upload Test Admin',
    email: 'upload-admin@example.com',
    passwordHash: await bcrypt.hash('UploadTest!2026', 4),
    role: 'admin',
  });
  const adminResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'upload-admin@example.com',
      password: 'UploadTest!2026',
    }),
  });
  assert.equal(adminResponse.status, 200);
  adminToken = (await adminResponse.json() as { token: string }).token;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('trainers upload PDF notes and retrieve saved lesson files', async () => {
  const courseResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Upload test course',
      category: 'Crop production',
      description: '',
      objectives: '',
      lessons: [],
      level: 'Beginner',
      status: 'draft',
    }),
  });
  assert.equal(courseResponse.status, 201);
  const { course } = await courseResponse.json() as { course: { id: string } };

  const attachments = [
    { kind: 'pdf', mimeType: 'application/pdf', name: 'notes.pdf', data: '%PDF-1.7 notes' },
  ] as const;
  const files: Array<{ id: string; name: string; mimeType: string; size: number }> = [];
  for (const attachment of attachments) {
    const form = new FormData();
    form.append('file', new Blob([attachment.data], { type: attachment.mimeType }), attachment.name);
    const response = await fetch(`${baseUrl}/api/courses/${course.id}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Upload-Kind': attachment.kind },
      body: form,
    });
    assert.equal(response.status, 201);
    files.push((await response.json() as { file: { id: string; name: string; mimeType: string; size: number } }).file);
  }
  assert.deepEqual(files.map((file) => file.name), ['notes.pdf']);
  const privateFileResponse = await fetch(`${baseUrl}/api/courses/${course.id}/files/${files[0].id}`);
  assert.equal(privateFileResponse.status, 401);
  const ownerFileResponse = await fetch(`${baseUrl}/api/courses/${course.id}/files/${files[0].id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(ownerFileResponse.status, 200);

  const lessons = attachments.map((_attachment, index) => ({
    title: 'PDF notes',
    type: 'Reading',
    duration: '8 min',
    file: files[index],
  }));
  const updateResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessons }),
  });
  assert.equal(updateResponse.status, 200);

  for (const [index, file] of files.entries()) {
    const adminFileResponse = await fetch(`${baseUrl}/api/courses/${course.id}/files/${file.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminFileResponse.status, 200);
    assert.equal(adminFileResponse.headers.get('content-type')?.split(';')[0], file.mimeType);
    assert.ok((await adminFileResponse.arrayBuffer()).byteLength > 0, `Admin could not read uploaded ${attachments[index].kind}`);
  }

  const approveResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(approveResponse.status, 200);

  const learnerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Course Learner',
      email: 'course-learner@example.com',
      password: 'UploadTest!2026',
      role: 'learner',
    }),
  });
  assert.equal(learnerResponse.status, 201);
  const learnerToken = (await learnerResponse.json() as { token: string }).token;

  for (const [index, file] of files.entries()) {
    const response = await fetch(`${baseUrl}/api/courses/${course.id}/files/${file.id}`, {
      headers: { Authorization: ['Bearer', learnerToken].join(' ') },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type')?.split(';')[0], file.mimeType);
    if (index === 1) {
      assert.doesNotMatch(response.headers.get('content-disposition') ?? '', /attachment/i);
    }
    assert.ok((await response.arrayBuffer()).byteLength > 0);

    if (index === 0) {
      const downloadResponse = await fetch(`${baseUrl}/api/courses/${course.id}/files/${file.id}?download=1`, {
        headers: { Authorization: ['Bearer', learnerToken].join(' ') },
      });
      assert.equal(downloadResponse.status, 200);
      assert.match(downloadResponse.headers.get('content-disposition') ?? '', /attachment/i);
      assert.equal(downloadResponse.headers.get('content-type')?.split(';')[0], file.mimeType);
      assert.ok((await downloadResponse.arrayBuffer()).byteLength > 0);
    }
  }

  const deleteResponse = await fetch(`${baseUrl}/api/courses/${course.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(deleteResponse.status, 204);
});

test('rejects unauthenticated, mismatched, and oversized file uploads', async () => {
  const courseResponse = await fetch(`${baseUrl}/api/courses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Upload access test',
      category: 'Crop production',
      description: '',
      objectives: '',
      lessons: [],
      level: 'Beginner',
      status: 'draft',
    }),
  });
  const { course } = await courseResponse.json() as { course: { id: string } };

  const form = new FormData();
  form.append('file', new Blob(['not a PDF'], { type: 'text/plain' }), 'notes.txt');
  const unauthenticatedResponse = await fetch(`${baseUrl}/api/courses/${course.id}/uploads`, {
    method: 'POST',
    headers: { 'X-Upload-Kind': 'pdf' },
    body: form,
  });
  assert.equal(unauthenticatedResponse.status, 401);

  const secondTrainerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another Trainer',
      email: 'another-trainer@example.com',
      password: 'UploadTest!2026',
      role: 'trainer',
    }),
  });
  const secondTrainerToken = (await secondTrainerResponse.json() as { token: string }).token;
  const otherTrainerResponse = await fetch(`${baseUrl}/api/courses/${course.id}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secondTrainerToken}`, 'X-Upload-Kind': 'pdf' },
    body: form,
  });
  assert.equal(otherTrainerResponse.status, 403);

  const mismatchedResponse = await fetch(`${baseUrl}/api/courses/${course.id}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Upload-Kind': 'pdf' },
    body: form,
  });
  assert.equal(mismatchedResponse.status, 415);

  const legacyVideoForm = new FormData();
  legacyVideoForm.append('file', new Blob(['video bytes'], { type: 'video/mp4' }), 'lesson.mp4');
  const legacyVideoResponse = await fetch(`${baseUrl}/api/courses/${course.id}/uploads`, {
    method: 'POST',
    headers: { Authorization: ['Bearer', token].join(' '), 'X-Upload-Kind': 'video' },
    body: legacyVideoForm,
  });
  assert.equal(legacyVideoResponse.status, 410);

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob([new Uint8Array(25 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'large.pdf');
  const oversizedResponse = await fetch(`${baseUrl}/api/courses/${course.id}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Upload-Kind': 'pdf' },
    body: oversizedForm,
  });
  assert.equal(oversizedResponse.status, 413);
});

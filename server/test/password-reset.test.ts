import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer as createSmtpServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const testDirectory = mkdtempSync(join(tmpdir(), 'agrilearn-password-reset-test-'));
const smtpServer = createSmtpServer((socket) => {
  let buffer = '';
  let receivingMessage = false;
  const messageLines: string[] = [];

  socket.write('220 localhost AgriLearn test SMTP\r\n');
  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    let lineEnd = buffer.indexOf('\r\n');
    while (lineEnd !== -1) {
      const line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 2);
      if (receivingMessage) {
        if (line === '.') {
          receivingMessage = false;
          sentMessages.push(messageLines.join('\n'));
          messageLines.length = 0;
          socket.write('250 Message accepted\r\n');
        } else {
          messageLines.push(line.startsWith('..') ? line.slice(1) : line);
        }
      } else if (/^(EHLO|HELO)\s/i.test(line)) {
        socket.write('250-localhost\r\n250 SIZE 10485760\r\n');
      } else if (/^(MAIL FROM|RCPT TO):/i.test(line)) {
        socket.write('250 Accepted\r\n');
      } else if (line.toUpperCase() === 'DATA') {
        receivingMessage = true;
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (line.toUpperCase() === 'QUIT') {
        socket.write('221 Bye\r\n');
        socket.end();
      } else {
        socket.write('250 Accepted\r\n');
      }
      lineEnd = buffer.indexOf('\r\n');
    }
  });
});
const sentMessages: string[] = [];
await new Promise<void>((resolve, reject) => {
  smtpServer.once('error', reject);
  smtpServer.listen(0, '127.0.0.1', resolve);
});
const smtpAddress = smtpServer.address();
if (!smtpAddress || typeof smtpAddress === 'string') throw new Error('Test SMTP server did not bind to a TCP port.');
process.env.NODE_ENV = 'test';
process.env.DATA_FILE = join(testDirectory, 'data.json');
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = String(smtpAddress.port);
process.env.SMTP_SECURE = 'false';
process.env.SMTP_FROM = 'AgriLearn <no-reply@example.test>';
process.env.PASSWORD_RESET_URL = 'agrilearn:///reset-password';

const [{ app }, { store }] = await Promise.all([
  import('../src/index.js'),
  import('../src/store.js'),
]);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let initialPassword = 'PasswordReset!2026';

async function post(path: string, body: Record<string, string>) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function resetTokenFromLatestEmail() {
  const message = sentMessages.at(-1);
  assert.ok(message, 'Expected a reset email to be sent.');
  const decodedMessage = message
    .replace(/=\r?\n/g, '')
    .replace(/=([a-f0-9]{2})/gi, (_encoded, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
  const match = decodedMessage.match(/agrilearn:\/\/\/reset-password\?token=([a-f0-9]{64})/i);
  assert.ok(match, `Expected the email to include a reset link with a token. Email: ${decodedMessage.replace(/[a-f0-9]{64}/gi, '[redacted]')}`);
  return match[1];
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test API did not bind to a TCP port.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const response = await post('/api/auth/register', {
    name: 'Password Reset Tester',
    email: 'password-reset@example.test',
    password: initialPassword,
  });
  assert.equal(response.status, 201);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  await new Promise<void>((resolve, reject) => {
    smtpServer.close((error) => error ? reject(error) : resolve());
  });
  rmSync(testDirectory, { recursive: true, force: true });
});

test('forgot password sends a hashed, one-hour token without disclosing account existence', async () => {
  const knownResponse = await post('/api/auth/forgot-password', { email: 'password-reset@example.test' });
  const unknownResponse = await post('/api/auth/forgot-password', { email: 'unknown@example.test' });
  assert.equal(knownResponse.status, 200);
  assert.equal(unknownResponse.status, 200);
  assert.deepEqual(await knownResponse.json(), await unknownResponse.json());
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0], /Reset your AgriLearn password/);

  const token = resetTokenFromLatestEmail();
  const reset = store.list('passwordResets')[0];
  assert.equal(reset.tokenHash, (await import('node:crypto')).createHash('sha256').update(token).digest('hex'));
  assert.notEqual(reset.tokenHash, token);
  assert.ok(Date.parse(String(reset.expiresAt)) > Date.now());
  assert.ok(Date.parse(String(reset.expiresAt)) <= Date.now() + 60 * 60 * 1000);
});

test('reset password requires matching values and rejects invalid, expired, and reused tokens', async () => {
  await post('/api/auth/forgot-password', { email: 'password-reset@example.test' });
  const token = resetTokenFromLatestEmail();

  const mismatchResponse = await post('/api/auth/reset-password', {
    token,
    newPassword: 'NewPassword!2026',
    confirmPassword: 'OtherPassword!2026',
  });
  assert.equal(mismatchResponse.status, 400);

  const invalidResponse = await post('/api/auth/reset-password', {
    token: 'not-a-reset-token',
    newPassword: 'NewPassword!2026',
    confirmPassword: 'NewPassword!2026',
  });
  assert.equal(invalidResponse.status, 400);

  const resetResponse = await post('/api/auth/reset-password', {
    token,
    newPassword: 'NewPassword!2026',
    confirmPassword: 'NewPassword!2026',
  });
  assert.equal(resetResponse.status, 200);

  const reusedResponse = await post('/api/auth/reset-password', {
    token,
    newPassword: 'AnotherPassword!2026',
    confirmPassword: 'AnotherPassword!2026',
  });
  assert.equal(reusedResponse.status, 400);

  const oldLoginResponse = await post('/api/auth/login', {
    email: 'password-reset@example.test',
    password: initialPassword,
  });
  assert.equal(oldLoginResponse.status, 401);
  initialPassword = 'NewPassword!2026';
  const newLoginResponse = await post('/api/auth/login', {
    email: 'password-reset@example.test',
    password: initialPassword,
  });
  assert.equal(newLoginResponse.status, 200);
});

test('reset links expire and the newest request replaces older links', async () => {
  await post('/api/auth/forgot-password', { email: 'password-reset@example.test' });
  const olderToken = resetTokenFromLatestEmail();
  await post('/api/auth/forgot-password', { email: 'password-reset@example.test' });
  const currentToken = resetTokenFromLatestEmail();
  assert.notEqual(currentToken, olderToken);

  const oldLinkResponse = await post('/api/auth/reset-password', {
    token: olderToken,
    newPassword: 'ExpiredPassword!2026',
    confirmPassword: 'ExpiredPassword!2026',
  });
  assert.equal(oldLinkResponse.status, 400);

  const reset = store.list('passwordResets')[0];
  assert.equal(reset.tokenHash, (await import('node:crypto')).createHash('sha256').update(currentToken).digest('hex'));
  const expiredAt = new Date(Date.now() - 1000).toISOString();
  assert.equal(store.update('passwordResets', String(reset.id), { expiresAt: expiredAt })?.expiresAt, expiredAt);
  const expiredResponse = await post('/api/auth/reset-password', {
    token: currentToken,
    newPassword: 'ExpiredPassword!2026',
    confirmPassword: 'ExpiredPassword!2026',
  });
  assert.equal(expiredResponse.status, 400);
});

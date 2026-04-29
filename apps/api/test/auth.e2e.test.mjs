import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
process.env.BREVO_API_KEY = '';
process.env.BREVO_SMS_SENDER = process.env.BREVO_SMS_SENDER || 'CarloiV4';
process.env.BREVO_EMAIL_SENDER = process.env.BREVO_EMAIL_SENDER || 'no-reply@example.com';

const require = createRequire(import.meta.url);
const { PrismaClient, VerificationCodePurpose } = require('@prisma/client');
const { createApp } = require('../dist/app.factory.js');
const { BrevoService } = require('../dist/modules/auth/brevo.service.js');

const prisma = new PrismaClient();

async function postJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-name': 'auth-e2e',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  return {
    status: response.status,
    payload,
  };
}

test('register, verify, login and reset password flow works end to end', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();

  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const brevoService = app.get(BrevoService);
  const uniqueSuffix = Date.now().toString();
  const email = `auth-${uniqueSuffix}@example.com`;
  const phone = `90555${uniqueSuffix.slice(-7)}`;
  const username = `authuser${uniqueSuffix.slice(-8)}`;
  const password = 'StrongPass123!';
  const newPassword = 'NewStrongPass456!';

  try {
    const registerResponse = await postJson(baseUrl, '/auth/register', {
      userType: 'INDIVIDUAL',
      firstName: 'Test',
      lastName: 'User',
      username,
      email,
      phone,
      password,
    });

    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.payload.verificationRequired, true);
    assert.equal(registerResponse.payload.user.username, username);
    assert.equal(registerResponse.payload.user.isVerified, false);

    const blockedLoginResponse = await postJson(baseUrl, '/auth/login', {
      identifier: username,
      password,
    });

    assert.equal(blockedLoginResponse.status, 403);
    assert.equal(blockedLoginResponse.payload.verificationRequired, true);

    const sendCodeResponse = await postJson(baseUrl, '/auth/send-verification-code', {
      identifier: email,
      channel: 'EMAIL',
    });

    assert.equal(sendCodeResponse.status, 201);
    assert.equal(sendCodeResponse.payload.success, true);

    const verificationCode = brevoService.peekLatestCode(email, VerificationCodePurpose.SIGN_UP);
    assert.match(verificationCode ?? '', /^[0-9]{6}$/);

    const verifyResponse = await postJson(baseUrl, '/auth/verify-code', {
      identifier: email,
      code: verificationCode,
    });

    assert.equal(verifyResponse.status, 201);
    assert.ok(verifyResponse.payload.accessToken);
    assert.ok(verifyResponse.payload.refreshToken);
    assert.equal(verifyResponse.payload.user.isVerified, true);

    const loginResponse = await postJson(baseUrl, '/auth/login', {
      identifier: phone,
      password,
    });

    assert.equal(loginResponse.status, 201);
    assert.ok(loginResponse.payload.accessToken);
    assert.ok(loginResponse.payload.refreshToken);
    assert.equal(loginResponse.payload.user.email, email);

    const forgotPasswordResponse = await postJson(baseUrl, '/auth/forgot-password', {
      identifier: email,
    });

    assert.equal(forgotPasswordResponse.status, 201);
    assert.equal(forgotPasswordResponse.payload.success, true);

    const resetCode = brevoService.peekLatestCode(email, VerificationCodePurpose.PASSWORD_RESET);
    assert.match(resetCode ?? '', /^[0-9]{6}$/);

    const resetPasswordResponse = await postJson(baseUrl, '/auth/reset-password', {
      identifier: email,
      code: resetCode,
      newPassword,
    });

    assert.equal(resetPasswordResponse.status, 201);
    assert.equal(resetPasswordResponse.payload.success, true);

    const oldPasswordLoginResponse = await postJson(baseUrl, '/auth/login', {
      identifier: email,
      password,
    });

    assert.equal(oldPasswordLoginResponse.status, 401);

    const newPasswordLoginResponse = await postJson(baseUrl, '/auth/login', {
      identifier: email,
      password: newPassword,
    });

    assert.equal(newPasswordLoginResponse.status, 201);
    assert.ok(newPasswordLoginResponse.payload.accessToken);
    assert.ok(newPasswordLoginResponse.payload.refreshToken);
  } finally {
    await prisma.verificationCode.deleteMany({
      where: {
        targetValue: {
          in: [email, phone],
        },
      },
    });
    await prisma.passwordResetToken.deleteMany({
      where: {
        user: {
          email,
        },
      },
    });
    await prisma.accountSession.deleteMany({
      where: {
        user: {
          email,
        },
      },
    });
    await prisma.commercialApplication.deleteMany({
      where: {
        user: {
          email,
        },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        user: {
          email,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ email }, { phone }, { username }],
      },
    });
    await app.close();
  }
});

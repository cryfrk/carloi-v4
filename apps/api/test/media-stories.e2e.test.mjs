import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
process.env.BREVO_API_KEY = '';
process.env.BREVO_SMS_SENDER = process.env.BREVO_SMS_SENDER || 'CarloiV4';
process.env.BREVO_EMAIL_SENDER = process.env.BREVO_EMAIL_SENDER || 'no-reply@example.com';
process.env.MEDIA_STORAGE_PROVIDER = 'local';
process.env.LOCAL_UPLOAD_DIR = 'uploads-test';
process.env.PUBLIC_MEDIA_BASE_URL = 'http://localhost:4000/uploads-test';

const require = createRequire(import.meta.url);
const { PrismaClient, VerificationCodePurpose } = require('@prisma/client');
const { createApp } = require('../dist/app.factory.js');
const { BrevoService } = require('../dist/modules/auth/brevo.service.js');

const prisma = new PrismaClient();
const workspaceRoot = resolve(process.cwd(), '../..');
const uploadRoot = join(workspaceRoot, process.env.LOCAL_UPLOAD_DIR);
const tinyPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZQw0AAAAASUVORK5CYII=',
  'base64',
);

async function postJson(baseUrl, path, body, accessToken) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-name': 'media-stories-e2e',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function getJson(baseUrl, path, accessToken) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'x-device-name': 'media-stories-e2e',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function uploadFile(baseUrl, accessToken, purpose, blob, fileName) {
  const formData = new FormData();
  formData.append('purpose', purpose);
  formData.append('file', blob, fileName);

  const response = await fetch(`${baseUrl}/media/upload`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-device-name': 'media-stories-e2e',
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function createVerifiedUser(baseUrl, brevoService, prefix) {
  const uniqueSuffix = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `${uniqueSuffix}@example.com`;
  const username = uniqueSuffix.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24);
  const password = 'StrongPass123!';

  const registerResponse = await postJson(baseUrl, '/auth/register', {
    userType: 'INDIVIDUAL',
    firstName: 'Test',
    lastName: 'User',
    username,
    email,
    password,
  });

  assert.equal(registerResponse.status, 201);

  const sendCodeResponse = await postJson(baseUrl, '/auth/send-verification-code', {
    identifier: email,
    channel: 'EMAIL',
  });

  assert.equal(sendCodeResponse.status, 201);

  const verificationCode = brevoService.peekLatestCode(email, VerificationCodePurpose.SIGN_UP);
  assert.match(verificationCode ?? '', /^[0-9]{6}$/);

  const verifyResponse = await postJson(baseUrl, '/auth/verify-code', {
    identifier: email,
    code: verificationCode,
  });

  assert.equal(verifyResponse.status, 201);
  assert.ok(verifyResponse.payload.accessToken);

  return {
    email,
    username,
    userId: verifyResponse.payload.user.id,
    accessToken: verifyResponse.payload.accessToken,
  };
}

test('media upload and stories flow works end to end', async () => {
  if (existsSync(uploadRoot)) {
    rmSync(uploadRoot, { force: true, recursive: true });
  }

  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();

  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const brevoService = app.get(BrevoService);
  const primary = await createVerifiedUser(baseUrl, brevoService, 'story-owner');
  const secondary = await createVerifiedUser(baseUrl, brevoService, 'story-viewer');

  try {
    const imageUploadResponse = await uploadFile(
      baseUrl,
      primary.accessToken,
      'STORY_MEDIA',
      new Blob([tinyPngBuffer], { type: 'image/png' }),
      'story.png',
    );

    assert.equal(imageUploadResponse.status, 201);
    assert.equal(imageUploadResponse.payload.purpose, 'STORY_MEDIA');
    assert.equal(imageUploadResponse.payload.mimeType, 'image/png');
    assert.match(imageUploadResponse.payload.url, /uploads|media\/assets/);

    const invalidMimeResponse = await uploadFile(
      baseUrl,
      primary.accessToken,
      'POST_MEDIA',
      new Blob(['plain text'], { type: 'text/plain' }),
      'note.txt',
    );

    assert.equal(invalidMimeResponse.status, 400);

    const oversizedImageResponse = await uploadFile(
      baseUrl,
      primary.accessToken,
      'POST_MEDIA',
      new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)], { type: 'image/png' }),
      'large.png',
    );

    assert.equal(oversizedImageResponse.status, 400);

    const invalidPurposeResponse = await uploadFile(
      baseUrl,
      primary.accessToken,
      'INVALID_PURPOSE',
      new Blob([tinyPngBuffer], { type: 'image/png' }),
      'wrong.png',
    );

    assert.equal(invalidPurposeResponse.status, 400);

    const createStoryResponse = await postJson(baseUrl, '/stories', {
      caption: 'Carloi story testi',
      locationText: 'Istanbul',
      media: {
        url: imageUploadResponse.payload.url,
        mediaAssetId: imageUploadResponse.payload.id,
        mediaType: 'IMAGE',
      },
    }, primary.accessToken);

    assert.equal(createStoryResponse.status, 201);
    assert.equal(createStoryResponse.payload.success, true);
    assert.equal(createStoryResponse.payload.story.viewedByMe, false);

    const storyId = createStoryResponse.payload.story.id;

    const feedResponse = await getJson(baseUrl, '/stories/feed', primary.accessToken);
    assert.equal(feedResponse.status, 200);
    assert.ok(feedResponse.payload.items.some((group) => group.owner.id === primary.userId));

    const viewResponse = await postJson(baseUrl, `/stories/${storyId}/view`, {}, secondary.accessToken);
    assert.equal(viewResponse.status, 201);
    assert.equal(viewResponse.payload.success, true);

    const storyView = await prisma.storyView.findUnique({
      where: {
        storyId_viewerId: {
          storyId,
          viewerId: secondary.userId,
        },
      },
    });

    assert.ok(storyView);

    const forbiddenViewersResponse = await getJson(baseUrl, `/stories/${storyId}/viewers`, secondary.accessToken);
    assert.equal(forbiddenViewersResponse.status, 404);

    const ownerViewersResponse = await getJson(baseUrl, `/stories/${storyId}/viewers`, primary.accessToken);
    assert.equal(ownerViewersResponse.status, 200);
    assert.ok(ownerViewersResponse.payload.items.some((item) => item.viewer.id === secondary.userId));

    await prisma.story.update({
      where: { id: storyId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expiredFeedResponse = await getJson(baseUrl, '/stories/feed', primary.accessToken);
    assert.equal(expiredFeedResponse.status, 200);
    assert.ok(
      expiredFeedResponse.payload.items.every((group) =>
        group.stories.every((story) => story.id !== storyId),
      ),
    );
  } finally {
    await prisma.storyView.deleteMany({
      where: {
        OR: [
          { viewerId: primary.userId },
          { viewerId: secondary.userId },
        ],
      },
    });
    await prisma.storyMedia.deleteMany({
      where: {
        story: {
          ownerId: {
            in: [primary.userId, secondary.userId],
          },
        },
      },
    });
    await prisma.story.deleteMany({
      where: {
        ownerId: {
          in: [primary.userId, secondary.userId],
        },
      },
    });
    await prisma.mediaAsset.deleteMany({
      where: {
        ownerId: {
          in: [primary.userId, secondary.userId],
        },
      },
    });
    await prisma.verificationCode.deleteMany({
      where: {
        targetValue: {
          in: [primary.email, secondary.email],
        },
      },
    });
    await prisma.accountSession.deleteMany({
      where: {
        userId: {
          in: [primary.userId, secondary.userId],
        },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        userId: {
          in: [primary.userId, secondary.userId],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [primary.userId, secondary.userId],
        },
      },
    });

    if (existsSync(uploadRoot)) {
      rmSync(uploadRoot, { force: true, recursive: true });
    }

    await app.close();
  }
});

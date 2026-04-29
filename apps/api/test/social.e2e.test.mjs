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
const { PrismaClient, UserType } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createApp } = require('../dist/app.factory.js');

const prisma = new PrismaClient();

async function requestJson(baseUrl, path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-device-name': 'social-e2e',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  return {
    status: response.status,
    payload,
  };
}

async function createVerifiedUser({
  email,
  username,
  password,
  firstName,
  lastName,
  phone,
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      userType: UserType.INDIVIDUAL,
      email,
      phone,
      username,
      passwordHash,
      firstName,
      lastName,
      isVerified: true,
      isCommercialApproved: false,
      profile: {
        create: {
          avatarUrl: `https://example.com/${username}.jpg`,
        },
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });
}

test('social feed flow works end to end', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const password = 'StrongPass123!';

  const userOne = {
    email: `social-a-${suffix}@example.com`,
    phone: `90541${suffix.slice(-7)}`,
    username: `sociala${suffix.slice(-8)}`,
  };
  const userTwo = {
    email: `social-b-${suffix}@example.com`,
    phone: `90542${suffix.slice(-7)}`,
    username: `socialb${suffix.slice(-8)}`,
  };
  const userThree = {
    email: `social-c-${suffix}@example.com`,
    phone: `90543${suffix.slice(-7)}`,
    username: `socialc${suffix.slice(-8)}`,
  };

  let userOneRecord;
  let userTwoRecord;
  let userThreeRecord;

  try {
    userOneRecord = await createVerifiedUser({
      ...userOne,
      password,
      firstName: 'Ada',
      lastName: 'One',
    });
    userTwoRecord = await createVerifiedUser({
      ...userTwo,
      password,
      firstName: 'Bora',
      lastName: 'Two',
    });
    userThreeRecord = await createVerifiedUser({
      ...userThree,
      password,
      firstName: 'Cem',
      lastName: 'Three',
    });

    const loginOne = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { identifier: userOne.username, password },
    });
    const loginTwo = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { identifier: userTwo.email, password },
    });
    const loginThree = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { identifier: userThree.phone, password },
    });

    assert.equal(loginOne.status, 201);
    assert.equal(loginTwo.status, 201);
    assert.equal(loginThree.status, 201);

    const userOneToken = loginOne.payload.accessToken;
    const userTwoToken = loginTwo.payload.accessToken;
    const userThreeToken = loginThree.payload.accessToken;

    const followResponse = await requestJson(baseUrl, `/users/${userTwoRecord.id}/follow`, {
      method: 'POST',
      token: userOneToken,
    });

    assert.equal(followResponse.status, 201);
    assert.equal(followResponse.payload.following, true);

    const sellerPost = await requestJson(baseUrl, '/posts', {
      method: 'POST',
      token: userTwoToken,
      body: {
        caption: 'Takip edilen kullanicidan gelen post',
        locationText: 'Istanbul',
        media: [
          { url: 'https://images.example.com/car-1.jpg' },
          { url: 'https://videos.example.com/car-clip.mp4' },
        ],
      },
    });

    const discoveryPost = await requestJson(baseUrl, '/posts', {
      method: 'POST',
      token: userThreeToken,
      body: {
        caption: 'Kesif postu',
        locationText: 'Ankara',
        media: [{ url: 'https://images.example.com/car-2.jpg' }],
      },
    });

    assert.equal(sellerPost.status, 201);
    assert.equal(discoveryPost.status, 201);
    assert.equal(sellerPost.payload.post.media.length, 2);

    const feedWindow = await requestJson(baseUrl, '/feed?limit=10', {
      token: userOneToken,
    });

    assert.equal(feedWindow.status, 200);
    const followedIndex = feedWindow.payload.items.findIndex(
      (item) => item.owner.id === userTwoRecord.id,
    );
    const discoveryIndex = feedWindow.payload.items.findIndex(
      (item) => item.owner.id === userThreeRecord.id,
    );
    assert.ok(followedIndex >= 0);
    assert.ok(discoveryIndex >= 0);
    assert.ok(followedIndex < discoveryIndex);

    const firstFeedPage = await requestJson(baseUrl, '/feed?limit=1', {
      token: userOneToken,
    });

    assert.equal(firstFeedPage.status, 200);
    assert.equal(firstFeedPage.payload.items.length, 1);
    assert.equal(firstFeedPage.payload.items[0].owner.id, userTwoRecord.id);
    assert.equal(firstFeedPage.payload.items[0].owner.isFollowing, true);
    assert.ok(firstFeedPage.payload.nextCursor);

    const secondFeedPage = await requestJson(
      baseUrl,
      `/feed?limit=1&cursor=${encodeURIComponent(firstFeedPage.payload.nextCursor)}`,
      {
        token: userOneToken,
      },
    );

    assert.equal(secondFeedPage.status, 200);
    assert.equal(secondFeedPage.payload.items.length, 1);
    assert.notEqual(secondFeedPage.payload.items[0].id, firstFeedPage.payload.items[0].id);

    const postId = sellerPost.payload.post.id;

    const likeResponse = await requestJson(baseUrl, `/posts/${postId}/like`, {
      method: 'POST',
      token: userOneToken,
    });

    assert.equal(likeResponse.status, 201);
    assert.equal(likeResponse.payload.isLiked, true);
    assert.equal(likeResponse.payload.likeCount, 1);

    const saveResponse = await requestJson(baseUrl, `/posts/${postId}/save`, {
      method: 'POST',
      token: userOneToken,
    });

    assert.equal(saveResponse.status, 201);
    assert.equal(saveResponse.payload.isSaved, true);

    const commentResponse = await requestJson(baseUrl, `/posts/${postId}/comments`, {
      method: 'POST',
      token: userOneToken,
      body: {
        body: 'Bu araci yakindan takip ediyorum.',
      },
    });

    assert.equal(commentResponse.status, 201);
    assert.equal(commentResponse.payload.comment.owner.id, userOneRecord.id);

    const commentsResponse = await requestJson(baseUrl, `/posts/${postId}/comments`, {
      token: userOneToken,
    });

    assert.equal(commentsResponse.status, 200);
    assert.equal(commentsResponse.payload.items.length, 1);
    assert.equal(commentsResponse.payload.items[0].id, commentResponse.payload.comment.id);

    const likeCommentResponse = await requestJson(
      baseUrl,
      `/posts/${postId}/comments/${commentResponse.payload.comment.id}/like`,
      {
        method: 'POST',
        token: userTwoToken,
      },
    );

    assert.equal(likeCommentResponse.status, 201);
    assert.equal(likeCommentResponse.payload.isLiked, true);
    assert.equal(likeCommentResponse.payload.likeCount, 1);

    const unlikeResponse = await requestJson(baseUrl, `/posts/${postId}/like`, {
      method: 'DELETE',
      token: userOneToken,
    });
    const unsaveResponse = await requestJson(baseUrl, `/posts/${postId}/save`, {
      method: 'DELETE',
      token: userOneToken,
    });
    const unfollowResponse = await requestJson(baseUrl, `/users/${userTwoRecord.id}/follow`, {
      method: 'DELETE',
      token: userOneToken,
    });

    assert.equal(unlikeResponse.status, 200);
    assert.equal(unlikeResponse.payload.isLiked, false);
    assert.equal(unsaveResponse.status, 200);
    assert.equal(unsaveResponse.payload.isSaved, false);
    assert.equal(unfollowResponse.status, 200);
    assert.equal(unfollowResponse.payload.following, false);

    const notificationTypes = await prisma.notification.findMany({
      where: {
        userId: userTwoRecord.id,
      },
      select: {
        type: true,
      },
    });

    assert.deepEqual(
      notificationTypes.map((item) => item.type).sort(),
      ['comment', 'follow', 'like'],
    );
  } finally {
    const identifiers = [userOne.email, userTwo.email, userThree.email];
    const usernames = [userOne.username, userTwo.username, userThree.username];

    await prisma.notification.deleteMany({
      where: {
        OR: [
          { user: { email: { in: identifiers } } },
          { actorUser: { email: { in: identifiers } } },
        ],
      },
    });
    await prisma.commentLike.deleteMany({
      where: {
        OR: [
          { user: { email: { in: identifiers } } },
          { comment: { owner: { email: { in: identifiers } } } },
        ],
      },
    });
    await prisma.comment.deleteMany({
      where: {
        OR: [{ owner: { email: { in: identifiers } } }, { post: { owner: { email: { in: identifiers } } } }],
      },
    });
    await prisma.savedItem.deleteMany({
      where: {
        user: { email: { in: identifiers } },
      },
    });
    await prisma.like.deleteMany({
      where: {
        OR: [{ user: { email: { in: identifiers } } }, { post: { owner: { email: { in: identifiers } } } }],
      },
    });
    await prisma.post.deleteMany({
      where: {
        owner: { email: { in: identifiers } },
      },
    });
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { follower: { email: { in: identifiers } } },
          { following: { email: { in: identifiers } } },
        ],
      },
    });
    await prisma.accountSession.deleteMany({
      where: {
        user: { email: { in: identifiers } },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        user: { email: { in: identifiers } },
      },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: { in: identifiers } }, { username: { in: usernames } }],
      },
    });
    await app.close();
  }
});

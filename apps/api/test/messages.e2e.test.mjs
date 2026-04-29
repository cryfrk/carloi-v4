import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
process.env.BREVO_API_KEY = '';
process.env.OPENAI_API_KEY = '';
process.env.DEEPSEEK_API_KEY = '';
process.env.BREVO_SMS_SENDER = process.env.BREVO_SMS_SENDER || 'CarloiV4';
process.env.BREVO_EMAIL_SENDER = process.env.BREVO_EMAIL_SENDER || 'no-reply@example.com';

const require = createRequire(import.meta.url);
const { ListingStatus, MediaType, PrismaClient, SellerType, UserType } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createApp } = require('../dist/app.factory.js');

const prisma = new PrismaClient();

async function requestJson(baseUrl, path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-device-name': 'messages-e2e',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function createVerifiedUser({ email, phone, username, password, firstName, lastName, tcIdentityNo }) {
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
      tcIdentityNo,
      isVerified: true,
      profile: {
        create: {
          avatarUrl: `https://example.com/${username}.jpg`,
          locationText: 'Istanbul / Kadikoy',
        },
      },
    },
    select: {
      id: true,
      username: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  });
}

async function login(baseUrl, identifier, password) {
  const response = await requestJson(baseUrl, '/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });

  assert.equal(response.status, 201);
  return response.payload.accessToken;
}

test('messages, direct/group threads, listing deal agreement and insurance flow work end to end', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const password = 'StrongPass123!';
  const rawPlate = `34ABC${suffix.slice(-3)}`;
  const maskedPlate = `34***${suffix.slice(-2)}`;
  const rawTc = `1${suffix.slice(-10)}`.slice(0, 11);
  const userIds = [];

  try {
    const buyer = await createVerifiedUser({
      email: `msg-buyer-${suffix}@example.com`,
      phone: `90531${suffix.slice(-7)}`,
      username: `msgbuyer${suffix.slice(-7)}`,
      password,
      firstName: 'Mert',
      lastName: 'Can',
      tcIdentityNo: `2${suffix.slice(-10)}`.slice(0, 11),
    });
    const seller = await createVerifiedUser({
      email: `msg-seller-${suffix}@example.com`,
      phone: `90532${suffix.slice(-7)}`,
      username: `msgseller${suffix.slice(-7)}`,
      password,
      firstName: 'Kerem',
      lastName: 'Aydin',
      tcIdentityNo: rawTc,
    });
    const friendOne = await createVerifiedUser({
      email: `msg-f1-${suffix}@example.com`,
      phone: `90533${suffix.slice(-7)}`,
      username: `msgfone${suffix.slice(-7)}`,
      password,
      firstName: 'Sena',
      lastName: 'Kaya',
      tcIdentityNo: `3${suffix.slice(-10)}`.slice(0, 11),
    });
    const friendTwo = await createVerifiedUser({
      email: `msg-f2-${suffix}@example.com`,
      phone: `90534${suffix.slice(-7)}`,
      username: `msgftwo${suffix.slice(-7)}`,
      password,
      firstName: 'Bora',
      lastName: 'Tas',
      tcIdentityNo: `4${suffix.slice(-10)}`.slice(0, 11),
    });
    const outsider = await createVerifiedUser({
      email: `msg-out-${suffix}@example.com`,
      phone: `90535${suffix.slice(-7)}`,
      username: `msgouts${suffix.slice(-7)}`,
      password,
      firstName: 'Ece',
      lastName: 'Sari',
      tcIdentityNo: `5${suffix.slice(-10)}`.slice(0, 11),
    });

    userIds.push(buyer.id, seller.id, friendOne.id, friendTwo.id, outsider.id);

    const buyerToken = await login(baseUrl, buyer.username, password);
    const sellerToken = await login(baseUrl, seller.username, password);
    const friendOneToken = await login(baseUrl, friendOne.username, password);
    const outsiderToken = await login(baseUrl, outsider.username, password);

    const directResponse = await requestJson(baseUrl, '/messages/direct', {
      method: 'POST',
      token: buyerToken,
      body: {
        targetUserId: friendOne.id,
      },
    });
    assert.equal(directResponse.status, 201);
    assert.equal(directResponse.payload.thread.type, 'DIRECT');

    const directAgainResponse = await requestJson(baseUrl, '/messages/direct', {
      method: 'POST',
      token: buyerToken,
      body: {
        targetUserId: friendOne.id,
      },
    });
    assert.equal(directAgainResponse.status, 201);
    assert.equal(directAgainResponse.payload.thread.id, directResponse.payload.thread.id);

    const directThreads = await prisma.messageThread.findMany({
      where: {
        type: 'DIRECT',
        participants: {
          some: {
            userId: buyer.id,
          },
        },
      },
      include: {
        participants: true,
      },
    });
    assert.equal(
      directThreads.filter(
        (thread) =>
          thread.participants.length === 2 &&
          thread.participants.some((participant) => participant.userId === buyer.id) &&
          thread.participants.some((participant) => participant.userId === friendOne.id),
      ).length,
      1,
    );

    const groupResponse = await requestJson(baseUrl, '/messages/group', {
      method: 'POST',
      token: buyerToken,
      body: {
        groupName: 'Pazar ekibi',
        participantIds: [friendOne.id, friendTwo.id],
      },
    });
    assert.equal(groupResponse.status, 201);
    assert.equal(groupResponse.payload.thread.groupName, 'Pazar ekibi');

    const groupThreadId = groupResponse.payload.thread.id;

    const sendMessageResponse = await requestJson(baseUrl, `/messages/threads/${groupThreadId}/messages`, {
      method: 'POST',
      token: buyerToken,
      body: {
        messageType: 'TEXT',
        body: 'Selam ekip, eksperli araci once buna yonlendirelim.',
      },
    });
    assert.equal(sendMessageResponse.status, 201);
    assert.equal(sendMessageResponse.payload.message.body, 'Selam ekip, eksperli araci once buna yonlendirelim.');

    const seenResponse = await requestJson(baseUrl, `/messages/threads/${groupThreadId}/seen`, {
      method: 'PATCH',
      token: friendOneToken,
    });
    assert.equal(seenResponse.status, 200);

    const outsiderThreadResponse = await requestJson(baseUrl, `/messages/threads/${groupThreadId}`, {
      token: outsiderToken,
    });
    assert.equal(outsiderThreadResponse.status, 404);

    const listing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        title: '2021 Fiat Egea Urban',
        description: 'Bakimli, temiz ve aile kullanimi arac.',
        price: 785000,
        currency: 'TRY',
        city: 'Istanbul',
        district: 'Kadikoy',
        listingNo: `CLV4-MSG-${suffix}`,
        listingStatus: ListingStatus.ACTIVE,
        sellerType: SellerType.OWNER,
        tradeAvailable: false,
        contactPhone: seller.phone,
        showPhone: true,
        plateNumber: maskedPlate,
        plateNumberHash: `hash-${suffix}`,
        licenseOwnerName: 'KEREM AYDIN',
        licenseOwnerTcNo: rawTc,
        isLicenseVerified: true,
        media: {
          create: [
            {
              mediaType: MediaType.IMAGE,
              url: 'https://example.com/listing-msg-1.jpg',
              sortOrder: 0,
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });

    const listingDealResponse = await requestJson(baseUrl, `/messages/listing/${listing.id}/start`, {
      method: 'POST',
      token: buyerToken,
    });
    assert.equal(listingDealResponse.status, 201);
    assert.equal(listingDealResponse.payload.thread.type, 'LISTING_DEAL');
    assert.equal(listingDealResponse.payload.thread.listing.id, listing.id);

    const dealThreadId = listingDealResponse.payload.thread.id;

    const listingDealAgainResponse = await requestJson(baseUrl, `/messages/listing/${listing.id}/start`, {
      method: 'POST',
      token: buyerToken,
    });
    assert.equal(listingDealAgainResponse.status, 201);
    assert.equal(listingDealAgainResponse.payload.thread.id, dealThreadId);

    const buyerAgreeResponse = await requestJson(baseUrl, `/messages/listing-deal/${dealThreadId}/agree`, {
      method: 'POST',
      token: buyerToken,
    });
    assert.equal(buyerAgreeResponse.status, 201);
    assert.ok(buyerAgreeResponse.payload.dealAgreement.buyerAgreedAt);
    assert.equal(buyerAgreeResponse.payload.dealAgreement.sellerAgreedAt, null);

    const shareBeforeFullAgreementResponse = await requestJson(baseUrl, `/messages/listing-deal/${dealThreadId}/share-license`, {
      method: 'POST',
      token: sellerToken,
    });
    assert.equal(shareBeforeFullAgreementResponse.status, 400);

    const sellerAgreeResponse = await requestJson(baseUrl, `/messages/listing-deal/${dealThreadId}/agree`, {
      method: 'POST',
      token: sellerToken,
    });
    assert.equal(sellerAgreeResponse.status, 201);
    assert.equal(sellerAgreeResponse.payload.dealAgreement.isFullyAgreed, true);

    const shareLicenseResponse = await requestJson(baseUrl, `/messages/listing-deal/${dealThreadId}/share-license`, {
      method: 'POST',
      token: sellerToken,
    });
    assert.equal(shareLicenseResponse.status, 201);
    assert.ok(shareLicenseResponse.payload.dealAgreement.licenseSharedAt);

    const licenseCardMessage = shareLicenseResponse.payload.thread.messages.find(
      (message) => message.systemCard?.type === 'LICENSE_INFO_CARD',
    );
    assert.ok(licenseCardMessage);
    assert.equal(licenseCardMessage.systemCard.maskedPlate, maskedPlate);
    assert.notEqual(licenseCardMessage.systemCard.maskedPlate, rawPlate);
    assert.ok(licenseCardMessage.systemCard.maskedTcNo.includes('*'));
    assert.notEqual(licenseCardMessage.systemCard.maskedTcNo, rawTc);

    const insuranceRequestResponse = await requestJson(baseUrl, `/messages/listing-deal/${dealThreadId}/request-insurance`, {
      method: 'POST',
      token: buyerToken,
    });
    assert.equal(insuranceRequestResponse.status, 201);
    assert.equal(insuranceRequestResponse.payload.status, 'PENDING');

    const insuranceRequest = await prisma.insuranceRequest.findUnique({
      where: {
        sourceThreadId: dealThreadId,
      },
    });
    assert.ok(insuranceRequest);
    assert.equal(insuranceRequest.buyerId, buyer.id);
    assert.equal(insuranceRequest.sellerId, seller.id);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: 'InsuranceRequest',
        entityId: insuranceRequest.id,
      },
    });
    assert.ok(auditLog);
  } finally {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    await app.close();
  }
});

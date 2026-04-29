import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.ADMIN_JWT_ACCESS_SECRET = process.env.ADMIN_JWT_ACCESS_SECRET || 'test-admin-access-secret';
process.env.ADMIN_JWT_REFRESH_SECRET = process.env.ADMIN_JWT_REFRESH_SECRET || 'test-admin-refresh-secret';
process.env.ADMIN_JWT_ACCESS_EXPIRES_IN = process.env.ADMIN_JWT_ACCESS_EXPIRES_IN || '15m';
process.env.ADMIN_JWT_REFRESH_EXPIRES_IN = process.env.ADMIN_JWT_REFRESH_EXPIRES_IN || '30d';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
process.env.BREVO_API_KEY = '';
process.env.OPENAI_API_KEY = '';
process.env.DEEPSEEK_API_KEY = '';
process.env.BREVO_SMS_SENDER = process.env.BREVO_SMS_SENDER || 'CarloiV4';
process.env.BREVO_EMAIL_SENDER = process.env.BREVO_EMAIL_SENDER || 'no-reply@example.com';
delete process.env.GARANTI_MERCHANT_ID;
delete process.env.GARANTI_TERMINAL_ID;
delete process.env.GARANTI_PROVISION_USER;
delete process.env.GARANTI_PROVISION_PASSWORD;
delete process.env.GARANTI_STORE_KEY;

const require = createRequire(import.meta.url);
const {
  AdminRole,
  InsuranceRequestStatus,
  ListingStatus,
  MediaType,
  PrismaClient,
  SellerType,
  UserType,
} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createApp } = require('../dist/app.factory.js');

const prisma = new PrismaClient();

async function requestJson(baseUrl, path, { method = 'GET', body, token, contentType = 'application/json', accept = 'application/json' } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      accept,
      ...(contentType ? { 'content-type': contentType } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-device-name': 'insurance-e2e',
    },
    body:
      body && contentType === 'application/json'
        ? JSON.stringify(body)
        : body instanceof URLSearchParams
          ? body.toString()
          : body,
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

async function createAdminUser({ username, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      role,
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });
}

async function loginUser(baseUrl, identifier, password) {
  const response = await requestJson(baseUrl, '/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });

  assert.equal(response.status, 201);
  return response.payload.accessToken;
}

async function loginAdmin(baseUrl, username, password) {
  const response = await requestJson(baseUrl, '/admin/auth/login', {
    method: 'POST',
    body: { username, password },
  });

  assert.equal(response.status, 201);
  return response.payload.accessToken;
}

async function createListingForSeller({ sellerId, phone, suffix, rawTc }) {
  return prisma.listing.create({
    data: {
      sellerId,
      title: `2022 Fiat Egea ${suffix}`,
      description: 'Sigorta akisi icin hazir ilan.',
      price: 812000,
      currency: 'TRY',
      city: 'Istanbul',
      district: 'Kadikoy',
      listingNo: `CLV4-INS-${suffix}`,
      listingStatus: ListingStatus.ACTIVE,
      sellerType: SellerType.OWNER,
      tradeAvailable: false,
      contactPhone: phone,
      showPhone: true,
      plateNumber: '34***34',
      plateNumberHash: `plate-hash-${suffix}`,
      licenseOwnerName: 'KEREM AYDIN',
      licenseOwnerTcNo: rawTc,
      isLicenseVerified: true,
      media: {
        create: [
          {
            mediaType: MediaType.IMAGE,
            url: 'https://example.com/insurance-listing.jpg',
            sortOrder: 0,
          },
        ],
      },
    },
    select: {
      id: true,
      title: true,
    },
  });
}

async function createInsuranceRequestRecord({ buyerId, sellerId, listingId, status = InsuranceRequestStatus.PENDING }) {
  return prisma.insuranceRequest.create({
    data: {
      buyerId,
      sellerId,
      listingId,
      status,
    },
    select: {
      id: true,
    },
  });
}

test('insurance admin flow, user accept/reject, mock payment callback, and document access work', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const password = 'StrongPass123!';
  const adminPassword = 'AdminPass123!';
  const ids = {
    users: [],
    admins: [],
  };

  try {
    const buyer = await createVerifiedUser({
      email: `insurance-buyer-${suffix}@example.com`,
      phone: `90541${suffix.slice(-7)}`,
      username: `insbuyer${suffix.slice(-7)}`,
      password,
      firstName: 'Deniz',
      lastName: 'Aslan',
      tcIdentityNo: `1${suffix.slice(-10)}`.slice(0, 11),
    });
    const seller = await createVerifiedUser({
      email: `insurance-seller-${suffix}@example.com`,
      phone: `90542${suffix.slice(-7)}`,
      username: `insseller${suffix.slice(-7)}`,
      password,
      firstName: 'Kerem',
      lastName: 'Aydin',
      tcIdentityNo: `2${suffix.slice(-10)}`.slice(0, 11),
    });
    const outsider = await createVerifiedUser({
      email: `insurance-out-${suffix}@example.com`,
      phone: `90543${suffix.slice(-7)}`,
      username: `insouts${suffix.slice(-7)}`,
      password,
      firstName: 'Ela',
      lastName: 'Kurt',
      tcIdentityNo: `3${suffix.slice(-10)}`.slice(0, 11),
    });
    ids.users.push(buyer.id, seller.id, outsider.id);

    const insuranceAdmin = await createAdminUser({
      username: `insuranceadmin${suffix.slice(-5)}`,
      password: adminPassword,
      role: AdminRole.INSURANCE_ADMIN,
    });
    const commercialAdmin = await createAdminUser({
      username: `commercialadmin${suffix.slice(-5)}`,
      password: adminPassword,
      role: AdminRole.COMMERCIAL_ADMIN,
    });
    ids.admins.push(insuranceAdmin.id, commercialAdmin.id);

    const listing = await createListingForSeller({
      sellerId: seller.id,
      phone: seller.phone,
      suffix,
      rawTc: `4${suffix.slice(-10)}`.slice(0, 11),
    });

    const rejectRequest = await createInsuranceRequestRecord({
      buyerId: buyer.id,
      sellerId: seller.id,
      listingId: listing.id,
    });
    const payRequest = await createInsuranceRequestRecord({
      buyerId: buyer.id,
      sellerId: seller.id,
      listingId: listing.id,
    });
    const unpaidRequest = await createInsuranceRequestRecord({
      buyerId: buyer.id,
      sellerId: seller.id,
      listingId: listing.id,
    });

    const buyerToken = await loginUser(baseUrl, buyer.username, password);
    const outsiderToken = await loginUser(baseUrl, outsider.username, password);
    const insuranceAdminToken = await loginAdmin(baseUrl, insuranceAdmin.username, adminPassword);
    const commercialAdminToken = await loginAdmin(baseUrl, commercialAdmin.username, adminPassword);

    const forbiddenAdminResponse = await requestJson(baseUrl, '/admin/insurance/requests', {
      token: commercialAdminToken,
    });
    assert.equal(forbiddenAdminResponse.status, 403);

    const adminListResponse = await requestJson(baseUrl, '/admin/insurance/requests', {
      token: insuranceAdminToken,
    });
    assert.equal(adminListResponse.status, 200);
    assert.ok(adminListResponse.payload.items.length >= 3);

    const createRejectOfferResponse = await requestJson(
      baseUrl,
      `/admin/insurance/requests/${rejectRequest.id}/offer`,
      {
        method: 'POST',
        token: insuranceAdminToken,
        body: {
          amount: 15350,
          currency: 'TRY',
          offerFileUrl: 'https://example.com/reject-offer.pdf',
        },
      },
    );
    assert.equal(createRejectOfferResponse.status, 201);
    const rejectOfferId = createRejectOfferResponse.payload.offerId;

    const rejectOfferDetail = await requestJson(baseUrl, `/insurance/requests/${rejectRequest.id}`, {
      token: buyerToken,
    });
    assert.equal(rejectOfferDetail.status, 200);
    assert.equal(rejectOfferDetail.payload.currentOffer.status, 'ACTIVE');
    assert.ok(rejectOfferDetail.payload.licenseInfo.maskedTcNo.includes('*'));

    const rejectResponse = await requestJson(baseUrl, `/insurance/offers/${rejectOfferId}/reject`, {
      method: 'POST',
      token: buyerToken,
    });
    assert.equal(rejectResponse.status, 201);
    assert.equal(rejectResponse.payload.status, 'REJECTED');

    const createPayOfferResponse = await requestJson(
      baseUrl,
      `/admin/insurance/requests/${payRequest.id}/offer`,
      {
        method: 'POST',
        token: insuranceAdminToken,
        body: {
          amount: 18750,
          currency: 'TRY',
          offerFileUrl: 'https://example.com/pay-offer.pdf',
        },
      },
    );
    assert.equal(createPayOfferResponse.status, 201);
    const payOfferId = createPayOfferResponse.payload.offerId;

    const acceptResponse = await requestJson(baseUrl, `/insurance/offers/${payOfferId}/accept`, {
      method: 'POST',
      token: buyerToken,
    });
    assert.equal(acceptResponse.status, 201);
    assert.equal(acceptResponse.payload.insuranceRequestStatus, 'ACCEPTED');
    assert.ok(acceptResponse.payload.paymentId);

    const paymentCreateResponse = await requestJson(
      baseUrl,
      `/payments/insurance/${payRequest.id}/create`,
      {
        method: 'POST',
        token: buyerToken,
      },
    );
    assert.equal(paymentCreateResponse.status, 201);
    assert.equal(paymentCreateResponse.payload.providerMode, 'MOCK');
    assert.equal(paymentCreateResponse.payload.paymentId, acceptResponse.payload.paymentId);

    const callbackParams = new URLSearchParams({
      ...paymentCreateResponse.payload.checkout.fields,
      mockClient: 'json',
    });
    const callbackResponse = await requestJson(baseUrl, '/payments/garanti/callback', {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      accept: 'application/json',
      body: callbackParams,
    });
    assert.equal(callbackResponse.status, 200);
    assert.equal(callbackResponse.payload.success, true);
    assert.equal(callbackResponse.payload.verified, true);
    assert.equal(callbackResponse.payload.paymentStatus, 'PAID');

    const paymentResultResponse = await requestJson(
      baseUrl,
      `/payments/garanti/result?paymentId=${paymentCreateResponse.payload.paymentId}`,
    );
    assert.equal(paymentResultResponse.status, 200);
    assert.equal(paymentResultResponse.payload.status, 'PAID');

    const paidRequestRecord = await prisma.insuranceRequest.findUnique({
      where: {
        id: payRequest.id,
      },
      select: {
        status: true,
      },
    });
    assert.equal(paidRequestRecord.status, 'PAID');

    const unpaidDocsResponse = await requestJson(
      baseUrl,
      `/admin/insurance/requests/${unpaidRequest.id}/documents`,
      {
        method: 'POST',
        token: insuranceAdminToken,
        body: {
          policyDocumentUrl: 'https://example.com/policy-unpaid.pdf',
        },
      },
    );
    assert.equal(unpaidDocsResponse.status, 400);

    const createUnpaidOfferResponse = await requestJson(
      baseUrl,
      `/admin/insurance/requests/${unpaidRequest.id}/offer`,
      {
        method: 'POST',
        token: insuranceAdminToken,
        body: {
          amount: 9900,
          currency: 'TRY',
        },
      },
    );
    assert.equal(createUnpaidOfferResponse.status, 201);

    const paidDocsResponse = await requestJson(
      baseUrl,
      `/admin/insurance/requests/${payRequest.id}/documents`,
      {
        method: 'POST',
        token: insuranceAdminToken,
        body: {
          policyDocumentUrl: 'https://example.com/policy.pdf',
          invoiceDocumentUrl: 'https://example.com/invoice.pdf',
        },
      },
    );
    assert.equal(paidDocsResponse.status, 201);
    assert.equal(paidDocsResponse.payload.status, 'POLICY_UPLOADED');

    const ownDocumentsResponse = await requestJson(
      baseUrl,
      `/insurance/requests/${payRequest.id}/documents`,
      {
        token: buyerToken,
      },
    );
    assert.equal(ownDocumentsResponse.status, 200);
    assert.equal(ownDocumentsResponse.payload.documents.length, 2);

    const outsiderDocumentsResponse = await requestJson(
      baseUrl,
      `/insurance/requests/${payRequest.id}/documents`,
      {
        token: outsiderToken,
      },
    );
    assert.equal(outsiderDocumentsResponse.status, 404);

    const offerAuditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'insurance_offer_created',
        entityId: payOfferId,
      },
    });
    assert.ok(offerAuditLog);

    const paymentAuditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'payment_success',
        entityType: 'Payment',
        entityId: paymentCreateResponse.payload.paymentId,
      },
    });
    assert.ok(paymentAuditLog);
  } finally {
    await prisma.adminUser.deleteMany({
      where: {
        id: {
          in: ids.admins,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ids.users,
        },
      },
    });

    await app.close();
  }
});

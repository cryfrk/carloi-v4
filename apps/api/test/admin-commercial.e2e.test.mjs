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

const require = createRequire(import.meta.url);
const {
  AdminRole,
  CommercialApplicationStatus,
  ListingStatus,
  MediaType,
  PrismaClient,
  SellerType,
  UserType,
} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createApp } = require('../dist/app.factory.js');

const prisma = new PrismaClient();

async function requestJson(baseUrl, path, { method = 'GET', body, token, contentType = 'application/json' } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(contentType ? { 'content-type': contentType } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-device-name': 'admin-commercial-e2e',
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

async function createListingForSeller({ sellerId, phone, suffix }) {
  return prisma.listing.create({
    data: {
      sellerId,
      title: `Admin moderation listing ${suffix}`,
      description: 'Moderasyon akisi icin ornek ilan.',
      price: 945000,
      currency: 'TRY',
      city: 'Istanbul',
      district: 'Besiktas',
      listingNo: `CLV4-ADM-${suffix}`,
      listingStatus: ListingStatus.ACTIVE,
      sellerType: SellerType.OWNER,
      tradeAvailable: false,
      contactPhone: phone,
      showPhone: true,
      plateNumber: '34***78',
      plateNumberHash: `plate-hash-${suffix}`,
      licenseOwnerName: 'MERT DEMIR',
      licenseOwnerTcNo: `8${suffix.slice(-10)}`.slice(0, 11),
      isLicenseVerified: true,
      media: {
        create: [
          {
            mediaType: MediaType.IMAGE,
            url: 'https://example.com/admin-listing.jpg',
            sortOrder: 0,
          },
        ],
      },
    },
    select: {
      id: true,
      listingNo: true,
    },
  });
}

test('admin panel, role guards, commercial approval flow and listing moderation work', async () => {
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
    listings: [],
  };

  try {
    const seller = await createVerifiedUser({
      email: `seller-admin-${suffix}@example.com`,
      phone: `90531${suffix.slice(-7)}`,
      username: `selleradm${suffix.slice(-7)}`,
      password,
      firstName: 'Mert',
      lastName: 'Demir',
      tcIdentityNo: `1${suffix.slice(-10)}`.slice(0, 11),
    });
    const approvedApplicant = await createVerifiedUser({
      email: `approved-admin-${suffix}@example.com`,
      phone: `90532${suffix.slice(-7)}`,
      username: `approved${suffix.slice(-7)}`,
      password,
      firstName: 'Ece',
      lastName: 'Akin',
      tcIdentityNo: `2${suffix.slice(-10)}`.slice(0, 11),
    });
    const rejectedApplicant = await createVerifiedUser({
      email: `rejected-admin-${suffix}@example.com`,
      phone: `90533${suffix.slice(-7)}`,
      username: `rejected${suffix.slice(-7)}`,
      password,
      firstName: 'Lara',
      lastName: 'Yilmaz',
      tcIdentityNo: `3${suffix.slice(-10)}`.slice(0, 11),
    });
    const regularUser = await createVerifiedUser({
      email: `regular-admin-${suffix}@example.com`,
      phone: `90534${suffix.slice(-7)}`,
      username: `regular${suffix.slice(-7)}`,
      password,
      firstName: 'Arda',
      lastName: 'Kaya',
      tcIdentityNo: `4${suffix.slice(-10)}`.slice(0, 11),
    });
    ids.users.push(seller.id, approvedApplicant.id, rejectedApplicant.id, regularUser.id);

    const listing = await createListingForSeller({
      sellerId: seller.id,
      phone: seller.phone,
      suffix,
    });
    ids.listings.push(listing.id);

    const superAdmin = await createAdminUser({
      username: `superadmin${suffix.slice(-5)}`,
      password: adminPassword,
      role: AdminRole.SUPER_ADMIN,
    });
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
    ids.admins.push(superAdmin.id, insuranceAdmin.id, commercialAdmin.id);

    const approvedApplicantToken = await loginUser(baseUrl, approvedApplicant.username, password);
    const rejectedApplicantToken = await loginUser(baseUrl, rejectedApplicant.username, password);
    const regularUserToken = await loginUser(baseUrl, regularUser.username, password);

    const submitApproved = await requestJson(baseUrl, '/commercial-applications', {
      method: 'POST',
      token: approvedApplicantToken,
      body: {
        companyTitle: 'Akin Auto Gallery',
        taxNumber: '3456789012',
        tcIdentityNo: `5${suffix.slice(-10)}`.slice(0, 11),
        taxDocumentUrl: 'https://example.com/tax-approved.pdf',
        otherDocumentUrls: [{ url: 'https://example.com/extra-approved.pdf' }],
        notes: 'Ilk basvuru',
      },
    });
    assert.equal(submitApproved.status, 201);
    const approvedApplicationId = submitApproved.payload.application.id;

    const submitRejected = await requestJson(baseUrl, '/commercial-applications', {
      method: 'POST',
      token: rejectedApplicantToken,
      body: {
        companyTitle: 'Yilmaz Car Trade',
        taxNumber: '4567890123',
        tcIdentityNo: `6${suffix.slice(-10)}`.slice(0, 11),
        taxDocumentUrl: 'https://example.com/tax-rejected.pdf',
        otherDocumentUrls: [{ url: 'https://example.com/extra-rejected.pdf' }],
        notes: 'Belge eksigi olabilir',
      },
    });
    assert.equal(submitRejected.status, 201);
    const rejectedApplicationId = submitRejected.payload.application.id;

    const superAdminToken = await loginAdmin(baseUrl, superAdmin.username, adminPassword);
    const insuranceAdminToken = await loginAdmin(baseUrl, insuranceAdmin.username, adminPassword);
    const commercialAdminToken = await loginAdmin(baseUrl, commercialAdmin.username, adminPassword);

    const meResponse = await requestJson(baseUrl, '/admin/auth/me', {
      token: superAdminToken,
    });
    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.payload.admin.role, AdminRole.SUPER_ADMIN);

    const userToAdminAttempt = await requestJson(baseUrl, '/admin/dashboard', {
      token: regularUserToken,
    });
    assert.equal(userToAdminAttempt.status, 401);

    const insuranceToCommercial = await requestJson(baseUrl, '/admin/commercial-applications', {
      token: insuranceAdminToken,
    });
    assert.equal(insuranceToCommercial.status, 403);

    const commercialToInsurance = await requestJson(baseUrl, '/admin/insurance/requests', {
      token: commercialAdminToken,
    });
    assert.equal(commercialToInsurance.status, 403);

    const superDashboard = await requestJson(baseUrl, '/admin/dashboard', { token: superAdminToken });
    const superUsers = await requestJson(baseUrl, '/admin/users', { token: superAdminToken });
    const superListings = await requestJson(baseUrl, '/admin/listings', { token: superAdminToken });
    const superPayments = await requestJson(baseUrl, '/admin/payments', { token: superAdminToken });
    const superAudit = await requestJson(baseUrl, '/admin/audit-logs', { token: superAdminToken });
    const superCommercials = await requestJson(baseUrl, '/admin/commercial-applications', { token: superAdminToken });
    const superInsurance = await requestJson(baseUrl, '/admin/insurance/requests', { token: superAdminToken });

    assert.equal(superDashboard.status, 200);
    assert.equal(superUsers.status, 200);
    assert.equal(superListings.status, 200);
    assert.equal(superPayments.status, 200);
    assert.equal(superAudit.status, 200);
    assert.equal(superCommercials.status, 200);
    assert.equal(superInsurance.status, 200);

    const approveResponse = await requestJson(baseUrl, `/admin/commercial-applications/${approvedApplicationId}/approve`, {
      method: 'POST',
      token: commercialAdminToken,
    });
    assert.equal(approveResponse.status, 201);

    const approvedUser = await prisma.user.findUnique({
      where: { id: approvedApplicant.id },
      include: { profile: true },
    });
    assert.equal(approvedUser?.userType, UserType.COMMERCIAL);
    assert.equal(approvedUser?.isCommercialApproved, true);
    assert.equal(approvedUser?.profile?.goldVerified, true);

    const rejectResponse = await requestJson(baseUrl, `/admin/commercial-applications/${rejectedApplicationId}/reject`, {
      method: 'POST',
      token: commercialAdminToken,
      body: { rejectionReason: 'Vergi levhasi okunaksiz.' },
    });
    assert.equal(rejectResponse.status, 201);

    const rejectedApplication = await prisma.commercialApplication.findUnique({
      where: { id: rejectedApplicationId },
    });
    assert.equal(rejectedApplication?.status, CommercialApplicationStatus.REJECTED);
    assert.equal(rejectedApplication?.rejectionReason, 'Vergi levhasi okunaksiz.');

    const suspendResponse = await requestJson(baseUrl, `/admin/listings/${listing.id}/status`, {
      method: 'PATCH',
      token: superAdminToken,
      body: { listingStatus: 'SUSPENDED', reason: 'Ruhsat dogrulamasi yeniden istenecek.' },
    });
    assert.equal(suspendResponse.status, 200);

    const suspendedListing = await prisma.listing.findUnique({
      where: { id: listing.id },
    });
    assert.equal(suspendedListing?.listingStatus, ListingStatus.SUSPENDED);
    assert.equal(suspendedListing?.suspensionReason, 'Ruhsat dogrulamasi yeniden istenecek.');

    const disableUserResponse = await requestJson(baseUrl, `/admin/users/${regularUser.id}/status`, {
      method: 'PATCH',
      token: superAdminToken,
      body: { isActive: false },
    });
    assert.equal(disableUserResponse.status, 200);

    const disabledUser = await prisma.user.findUnique({
      where: { id: regularUser.id },
    });
    assert.equal(disabledUser?.isActive, false);
    assert.ok(disabledUser?.disabledAt);

    const auditEntries = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: 'commercial_application_approved', entityId: approvedApplicationId },
          { action: 'commercial_application_rejected', entityId: rejectedApplicationId },
          { action: 'listing_status_updated', entityId: listing.id },
          { action: 'user_disabled', entityId: regularUser.id },
        ],
      },
    });
    assert.equal(auditEntries.length, 4);
  } finally {
    await app.close();

    if (ids.listings.length > 0) {
      await prisma.listing.deleteMany({ where: { id: { in: ids.listings } } });
    }

    if (ids.users.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    }

    if (ids.admins.length > 0) {
      await prisma.adminUser.deleteMany({ where: { id: { in: ids.admins } } });
    }
  }
});

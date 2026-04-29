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
const {
  ContentVisibility,
  FuelType,
  ListingStatus,
  MediaType,
  PrismaClient,
  SavedItemType,
  SellerType,
  TransmissionType,
  UserType,
  VehicleType,
} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createApp } = require('../dist/app.factory.js');

const prisma = new PrismaClient();

async function requestJson(baseUrl, path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-device-name': 'profile-settings-e2e',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function createVerifiedUser({ email, phone, username, password, firstName, lastName, tcIdentityNo, isPrivate = false, showGarageVehicles = true }) {
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
          bio: `Merhaba ben @${username}`,
          websiteUrl: 'https://carloi.example.com',
          locationText: 'Istanbul / Kadikoy',
          isPrivate,
          showGarageVehicles,
        },
      },
    },
    select: {
      id: true,
      username: true,
      phone: true,
    },
  });
}

async function login(baseUrl, identifier, password) {
  const response = await requestJson(baseUrl, '/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });

  assert.equal(response.status, 201);
  return response.payload;
}

test('profile, settings, saved items and notifications flows work end to end', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const password = 'StrongPass123!';
  const ids = { users: [], posts: [], listings: [], vehicles: [], notifications: [] };

  try {
    const viewer = await createVerifiedUser({
      email: `viewer-${suffix}@example.com`,
      phone: `90541${suffix.slice(-7)}`,
      username: `viewer${suffix.slice(-7)}`,
      password,
      firstName: 'Deniz',
      lastName: 'Arslan',
      tcIdentityNo: `1${suffix.slice(-10)}`.slice(0, 11),
    });
    const privateOwner = await createVerifiedUser({
      email: `private-${suffix}@example.com`,
      phone: `90542${suffix.slice(-7)}`,
      username: `private${suffix.slice(-7)}`,
      password,
      firstName: 'Selin',
      lastName: 'Kara',
      tcIdentityNo: `2${suffix.slice(-10)}`.slice(0, 11),
      isPrivate: true,
    });
    const publicOwner = await createVerifiedUser({
      email: `public-${suffix}@example.com`,
      phone: `90543${suffix.slice(-7)}`,
      username: `public${suffix.slice(-7)}`,
      password,
      firstName: 'Baris',
      lastName: 'Demir',
      tcIdentityNo: `3${suffix.slice(-10)}`.slice(0, 11),
    });
    ids.users.push(viewer.id, privateOwner.id, publicOwner.id);

    const privatePost = await prisma.post.create({
      data: {
        ownerId: privateOwner.id,
        caption: 'Gizli hesap gonderisi',
        visibility: ContentVisibility.PUBLIC,
        media: {
          create: [{ mediaType: MediaType.IMAGE, url: 'https://example.com/private-post.jpg', sortOrder: 0 }],
        },
      },
      select: { id: true },
    });
    const publicPost = await prisma.post.create({
      data: {
        ownerId: publicOwner.id,
        caption: 'Public hesap gonderisi',
        visibility: ContentVisibility.PUBLIC,
        media: {
          create: [{ mediaType: MediaType.IMAGE, url: 'https://example.com/public-post.jpg', sortOrder: 0 }],
        },
      },
      select: { id: true },
    });
    ids.posts.push(privatePost.id, publicPost.id);

    const privateVehicle = await prisma.garageVehicle.create({
      data: {
        ownerId: privateOwner.id,
        vehicleType: VehicleType.SEDAN,
        brandText: 'Fiat',
        modelText: 'Egea',
        packageText: 'Urban',
        year: 2022,
        plateNumber: `34PRV${suffix.slice(-3)}`,
        color: 'Beyaz',
        fuelType: FuelType.DIESEL,
        transmissionType: TransmissionType.MANUAL,
        km: 68000,
        isPublic: true,
      },
      select: { id: true },
    });
    const publicVehicle = await prisma.garageVehicle.create({
      data: {
        ownerId: publicOwner.id,
        vehicleType: VehicleType.HATCHBACK,
        brandText: 'Renault',
        modelText: 'Clio',
        packageText: 'Touch',
        year: 2021,
        plateNumber: `34PUB${suffix.slice(-3)}`,
        color: 'Gri',
        fuelType: FuelType.GASOLINE,
        transmissionType: TransmissionType.AUTOMATIC,
        km: 42000,
        isPublic: true,
      },
      select: { id: true },
    });
    ids.vehicles.push(privateVehicle.id, publicVehicle.id);

    const privateListing = await prisma.listing.create({
      data: {
        sellerId: privateOwner.id,
        garageVehicleId: privateVehicle.id,
        title: 'Gizli hesap ilani',
        description: 'Takip etmeden gorunmemeli.',
        price: 850000,
        currency: 'TRY',
        city: 'Istanbul',
        district: 'Kadikoy',
        listingNo: `CLV4-PRV-${suffix}`,
        listingStatus: ListingStatus.ACTIVE,
        sellerType: SellerType.OWNER,
        tradeAvailable: false,
        contactPhone: privateOwner.phone,
        showPhone: true,
        plateNumber: '34***11',
        plateNumberHash: `hash-prv-${suffix}`,
        licenseOwnerName: 'SELIN KARA',
        licenseOwnerTcNo: `7${suffix.slice(-10)}`.slice(0, 11),
        isLicenseVerified: true,
        media: {
          create: [{ mediaType: MediaType.IMAGE, url: 'https://example.com/private-listing.jpg', sortOrder: 0 }],
        },
      },
      select: { id: true },
    });
    const publicListing = await prisma.listing.create({
      data: {
        sellerId: publicOwner.id,
        garageVehicleId: publicVehicle.id,
        title: 'Public hesap ilani',
        description: 'Kaydedilenlerde gorunecek ilan.',
        price: 910000,
        currency: 'TRY',
        city: 'Istanbul',
        district: 'Besiktas',
        listingNo: `CLV4-PUB-${suffix}`,
        listingStatus: ListingStatus.ACTIVE,
        sellerType: SellerType.OWNER,
        tradeAvailable: true,
        contactPhone: publicOwner.phone,
        showPhone: true,
        plateNumber: '34***22',
        plateNumberHash: `hash-pub-${suffix}`,
        licenseOwnerName: 'BARIS DEMIR',
        licenseOwnerTcNo: `8${suffix.slice(-10)}`.slice(0, 11),
        isLicenseVerified: true,
        media: {
          create: [{ mediaType: MediaType.IMAGE, url: 'https://example.com/public-listing.jpg', sortOrder: 0 }],
        },
      },
      select: { id: true },
    });
    ids.listings.push(privateListing.id, publicListing.id);

    const viewerLogin = await login(baseUrl, viewer.username, password);
    let viewerToken = viewerLogin.accessToken;

    const myProfile = await requestJson(baseUrl, '/profiles/me', { token: viewerToken });
    assert.equal(myProfile.status, 200);
    assert.equal(myProfile.payload.username, viewer.username);
    assert.equal(myProfile.payload.isOwnProfile, true);

    const updateProfile = await requestJson(baseUrl, '/profiles/me', {
      method: 'PATCH',
      token: viewerToken,
      body: {
        bio: 'Yeni bio @carloi',
        locationText: 'Ankara / Cankaya',
      },
    });
    assert.equal(updateProfile.status, 200);
    assert.equal(updateProfile.payload.bio, 'Yeni bio @carloi');
    assert.deepEqual(updateProfile.payload.bioMentions, ['carloi']);

    const privateProfileBeforeFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}`, { token: viewerToken });
    assert.equal(privateProfileBeforeFollow.status, 200);
    assert.equal(privateProfileBeforeFollow.payload.canViewContent, false);

    const privatePostsBeforeFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}/posts`, { token: viewerToken });
    const privateListingsBeforeFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}/listings`, { token: viewerToken });
    const privateVehiclesBeforeFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}/vehicles`, { token: viewerToken });
    assert.equal(privatePostsBeforeFollow.payload.hiddenByPrivacy, true);
    assert.equal(privatePostsBeforeFollow.payload.items.length, 0);
    assert.equal(privateListingsBeforeFollow.payload.items.length, 0);
    assert.equal(privateVehiclesBeforeFollow.payload.items.length, 0);

    await prisma.follow.create({
      data: {
        followerId: viewer.id,
        followingId: privateOwner.id,
      },
    });

    const privateProfileAfterFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}`, { token: viewerToken });
    assert.equal(privateProfileAfterFollow.payload.canViewContent, true);
    assert.equal(privateProfileAfterFollow.payload.isFollowing, true);

    const privatePostsAfterFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}/posts`, { token: viewerToken });
    const privateListingsAfterFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}/listings`, { token: viewerToken });
    const privateVehiclesAfterFollow = await requestJson(baseUrl, `/profiles/${privateOwner.username}/vehicles`, { token: viewerToken });
    assert.equal(privatePostsAfterFollow.payload.items.length, 1);
    assert.equal(privateListingsAfterFollow.payload.items.length, 1);
    assert.equal(privateVehiclesAfterFollow.payload.items.length, 1);

    const settingsResponse = await requestJson(baseUrl, '/settings/me', { token: viewerToken });
    assert.equal(settingsResponse.status, 200);
    assert.equal(settingsResponse.payload.privacy.isPrivate, false);

    const updatePrivacy = await requestJson(baseUrl, '/settings/privacy', {
      method: 'PATCH',
      token: viewerToken,
      body: {
        isPrivate: true,
        showGarageVehicles: false,
      },
    });
    assert.equal(updatePrivacy.status, 200);
    assert.equal(updatePrivacy.payload.privacy.isPrivate, true);

    const savePost = await requestJson(baseUrl, `/posts/${publicPost.id}/save`, {
      method: 'POST',
      token: viewerToken,
    });
    const saveListing = await requestJson(baseUrl, `/listings/${publicListing.id}/save`, {
      method: 'POST',
      token: viewerToken,
    });
    assert.equal(savePost.status, 201);
    assert.equal(saveListing.status, 201);

    const savedItems = await requestJson(baseUrl, '/saved-items', { token: viewerToken });
    assert.equal(savedItems.status, 200);
    assert.equal(savedItems.payload.savedPosts.length, 1);
    assert.equal(savedItems.payload.savedListings.length, 1);
    assert.equal(savedItems.payload.savedPosts[0].post.id, publicPost.id);
    assert.equal(savedItems.payload.savedListings[0].listing.listingId, publicListing.id);

    const firstNotification = await prisma.notification.create({
      data: {
        userId: viewer.id,
        type: 'message',
        title: 'Yeni mesaj',
        body: 'Sana yeni bir mesaj geldi.',
        targetUrl: '/messages?thread=test-thread',
        metadata: {
          entityId: 'test-thread',
        },
      },
      select: { id: true },
    });
    const secondNotification = await prisma.notification.create({
      data: {
        userId: viewer.id,
        type: 'listing_saved',
        title: 'Ilan kaydedildi',
        body: 'Bir kullanici ilaninizi kaydetti.',
        targetUrl: `/listings/${publicListing.id}`,
        metadata: {
          entityId: publicListing.id,
        },
      },
      select: { id: true },
    });
    ids.notifications.push(firstNotification.id, secondNotification.id);

    const notificationsResponse = await requestJson(baseUrl, '/notifications', { token: viewerToken });
    assert.equal(notificationsResponse.status, 200);
    assert.ok(notificationsResponse.payload.unreadCount >= 2);
    const mappedMessageNotification = notificationsResponse.payload.items.find((item) => item.id === firstNotification.id);
    assert.equal(mappedMessageNotification.type, 'MESSAGE');
    assert.equal(mappedMessageNotification.route.appRoute, '/messages?thread=test-thread');
    assert.equal(mappedMessageNotification.route.entityId, 'test-thread');

    const markSeenResponse = await requestJson(baseUrl, `/notifications/${firstNotification.id}/seen`, {
      method: 'PATCH',
      token: viewerToken,
    });
    assert.equal(markSeenResponse.status, 200);
    assert.equal(markSeenResponse.payload.notification.isSeen, true);

    const markAllSeenResponse = await requestJson(baseUrl, '/notifications/seen-all', {
      method: 'PATCH',
      token: viewerToken,
    });
    assert.equal(markAllSeenResponse.status, 200);
    assert.ok(markAllSeenResponse.payload.updatedCount >= 1);

    const changePasswordResponse = await requestJson(baseUrl, '/settings/password', {
      method: 'PATCH',
      token: viewerToken,
      body: {
        oldPassword: password,
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      },
    });
    assert.equal(changePasswordResponse.status, 200);

    const oldLoginAttempt = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: {
        identifier: viewer.username,
        password,
      },
    });
    assert.equal(oldLoginAttempt.status, 401);

    const newLogin = await login(baseUrl, viewer.username, 'NewPass456!');
    viewerToken = newLogin.accessToken;
    assert.ok(viewerToken);

    const freshSettings = await requestJson(baseUrl, '/settings/me', { token: viewerToken });
    assert.equal(freshSettings.status, 200);
    assert.equal(freshSettings.payload.privacy.isPrivate, true);
    assert.equal(freshSettings.payload.privacy.showGarageVehicles, false);
  } finally {
    await app.close();

    if (ids.users.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    }
  }
});

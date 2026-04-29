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
  DamageStatus,
  FuelType,
  ListingStatus,
  MediaType,
  PrismaClient,
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
      'x-device-name': 'loi-ai-e2e',
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
  phone,
  username,
  password,
  firstName,
  lastName,
  tcIdentityNo,
  isPrivate = false,
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
      tcIdentityNo,
      isVerified: true,
      profile: {
        create: {
          avatarUrl: `https://example.com/${username}.jpg`,
          bio: `Profil ${username}`,
          locationText: 'Istanbul / Kadikoy',
          isPrivate,
        },
      },
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  });
}

async function login(baseUrl, identifier, password) {
  const response = await requestJson(baseUrl, '/auth/login', {
    method: 'POST',
    body: {
      identifier,
      password,
    },
  });

  assert.equal(response.status, 201);
  return response.payload.accessToken;
}

async function createCatalogChain({ brandName, brandSlug, modelName, modelSlug, packageName, packageSlug }) {
  const brand = await prisma.vehicleBrand.create({
    data: {
      name: brandName,
      slug: brandSlug,
    },
  });

  const model = await prisma.vehicleModel.create({
    data: {
      brandId: brand.id,
      name: modelName,
      slug: modelSlug,
    },
  });

  const vehiclePackage = await prisma.vehiclePackage.create({
    data: {
      modelId: model.id,
      name: packageName,
      slug: packageSlug,
    },
  });

  await prisma.vehicleSpec.create({
    data: {
      packageId: vehiclePackage.id,
      bodyType: 'Sedan',
      engineVolumeCc: 1368,
      enginePowerHp: 95,
      tractionType: 'FWD',
      fuelType: FuelType.GASOLINE,
      transmissionType: TransmissionType.MANUAL,
      equipmentSummary: 'Klima, geri gorus kamerasi, hiz sabitleyici',
      multimediaSummary: 'Apple CarPlay, USB, Bluetooth',
      interiorSummary: 'Kumas doseme, cok fonksiyonlu direksiyon',
      exteriorSummary: 'Led gunduz fari, alasim jant',
    },
  });

  return {
    brand,
    model,
    vehiclePackage,
  };
}

async function createGarageVehicle({
  ownerId,
  brandId,
  modelId,
  vehiclePackageId,
  vehicleType = VehicleType.SEDAN,
  brandText,
  modelText,
  packageText,
  plateNumber,
  year,
  km,
  fuelType = FuelType.GASOLINE,
  transmissionType = TransmissionType.MANUAL,
}) {
  return prisma.garageVehicle.create({
    data: {
      ownerId,
      brandId,
      modelId,
      vehiclePackageId,
      vehicleType,
      brandText,
      modelText,
      packageText,
      year,
      plateNumber,
      color: 'Beyaz',
      fuelType,
      transmissionType,
      km,
      isPublic: true,
      media: {
        create: [
          {
            mediaType: MediaType.IMAGE,
            url: `https://example.com/${plateNumber}-1.jpg`,
            sortOrder: 0,
          },
        ],
      },
    },
    select: {
      id: true,
      plateNumber: true,
    },
  });
}

async function createListing({
  sellerId,
  garageVehicleId,
  listingNo,
  title,
  description,
  price,
  city,
  district,
  sellerType,
  contactPhone,
  plateNumber,
  licenseOwnerName,
  licenseOwnerTcNo,
  hasExpertiseReport = false,
  damageParts = [],
}) {
  return prisma.listing.create({
    data: {
      sellerId,
      garageVehicleId,
      title,
      description,
      price,
      city,
      district,
      listingNo,
      listingStatus: ListingStatus.ACTIVE,
      sellerType,
      tradeAvailable: false,
      contactPhone,
      showPhone: true,
      plateNumber,
      plateNumberHash: `hash-${listingNo.toLowerCase()}`,
      licenseOwnerName,
      licenseOwnerTcNo,
      isLicenseVerified: true,
      hasExpertiseReport,
      media: {
        create: [
          {
            mediaType: MediaType.IMAGE,
            url: `https://example.com/${listingNo.toLowerCase()}-1.jpg`,
            sortOrder: 0,
          },
          {
            mediaType: MediaType.IMAGE,
            url: `https://example.com/${listingNo.toLowerCase()}-2.jpg`,
            sortOrder: 1,
          },
        ],
      },
      damageParts: {
        create: damageParts.map((part, index) => ({
          partName: part.partName,
          damageStatus: part.damageStatus,
          createdAt: new Date(Date.now() + index),
        })),
      },
    },
    select: {
      id: true,
      listingNo: true,
    },
  });
}

test('loi ai conversation, listing search, seller questions, description generation, and privacy rules work end to end', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const marker = suffix.slice(-4);
  const password = 'StrongPass123!';
  const createdUserIds = [];
  const createdBrandIds = [];

  try {
    const requester = await createVerifiedUser({
      email: `loi-requester-${suffix}@example.com`,
      phone: `90531${suffix.slice(-7)}`,
      username: `loiuser${suffix.slice(-8)}`,
      password,
      firstName: 'Can',
      lastName: 'Aydin',
      tcIdentityNo: `1${suffix.slice(-9)}0`,
    });
    const seller = await createVerifiedUser({
      email: `loi-seller-${suffix}@example.com`,
      phone: `90532${suffix.slice(-7)}`,
      username: `loiseller${suffix.slice(-8)}`,
      password,
      firstName: 'Seda',
      lastName: 'Kara',
      tcIdentityNo: `2${suffix.slice(-9)}0`,
    });
    const privateUser = await createVerifiedUser({
      email: `loi-private-${suffix}@example.com`,
      phone: `90533${suffix.slice(-7)}`,
      username: `loipriv${suffix.slice(-8)}`,
      password,
      firstName: 'Gizem',
      lastName: 'Yalcin',
      tcIdentityNo: `3${suffix.slice(-9)}0`,
      isPrivate: true,
    });

    createdUserIds.push(requester.id, seller.id, privateUser.id);

    const catalog = await createCatalogChain({
      brandName: `FiatLoi${marker}`,
      brandSlug: `fiat-loi-${suffix}`,
      modelName: `EgeaLoi${marker}`,
      modelSlug: `egea-loi-${suffix}`,
      packageName: `UrbanLoi${marker}`,
      packageSlug: `urban-loi-${suffix}`,
    });

    createdBrandIds.push(catalog.brand.id);

    const requesterVehicle = await createGarageVehicle({
      ownerId: requester.id,
      brandId: catalog.brand.id,
      modelId: catalog.model.id,
      vehiclePackageId: catalog.vehiclePackage.id,
      brandText: catalog.brand.name,
      modelText: catalog.model.name,
      packageText: catalog.vehiclePackage.name,
      plateNumber: `34LOI${marker}`,
      year: 2021,
      km: 58_000,
    });
    const sellerVehicleA = await createGarageVehicle({
      ownerId: seller.id,
      brandId: catalog.brand.id,
      modelId: catalog.model.id,
      vehiclePackageId: catalog.vehiclePackage.id,
      brandText: catalog.brand.name,
      modelText: catalog.model.name,
      packageText: catalog.vehiclePackage.name,
      plateNumber: `34SLA${marker}`,
      year: 2022,
      km: 42_000,
    });
    const sellerVehicleB = await createGarageVehicle({
      ownerId: seller.id,
      brandId: catalog.brand.id,
      modelId: catalog.model.id,
      vehiclePackageId: catalog.vehiclePackage.id,
      brandText: catalog.brand.name,
      modelText: catalog.model.name,
      packageText: catalog.vehiclePackage.name,
      plateNumber: `34SLB${marker}`,
      year: 2021,
      km: 69_000,
      transmissionType: TransmissionType.AUTOMATIC,
    });

    const listingA = await createListing({
      sellerId: seller.id,
      garageVehicleId: sellerVehicleA.id,
      listingNo: `CLV4-LOI-${suffix}-A`,
      title: `${catalog.brand.name} ${catalog.model.name} ${catalog.vehiclePackage.name} temiz`,
      description: 'Yetkili servis bakimli, duzenli kullanilmis, aile araci.',
      price: 780000,
      city: 'Istanbul',
      district: 'Kadikoy',
      sellerType: SellerType.OWNER,
      contactPhone: '905551234567',
      plateNumber: sellerVehicleA.plateNumber,
      licenseOwnerName: 'Seda Kara',
      licenseOwnerTcNo: '12345678901',
      hasExpertiseReport: true,
      damageParts: [
        { partName: 'kaput', damageStatus: DamageStatus.NONE },
        { partName: 'tavan', damageStatus: DamageStatus.NONE },
      ],
    });
    const listingB = await createListing({
      sellerId: seller.id,
      garageVehicleId: sellerVehicleB.id,
      listingNo: `CLV4-LOI-${suffix}-B`,
      title: `${catalog.brand.name} ${catalog.model.name} alternatif`,
      description: 'Paket dolu, kilometre bir miktar yuksek ama fiyat dengeli.',
      price: 825000,
      city: 'Istanbul',
      district: 'Besiktas',
      sellerType: SellerType.OWNER,
      contactPhone: '905558889900',
      plateNumber: sellerVehicleB.plateNumber,
      licenseOwnerName: 'Seda Kara',
      licenseOwnerTcNo: '10987654321',
      hasExpertiseReport: false,
      damageParts: [
        { partName: 'kaput', damageStatus: DamageStatus.PAINTED },
        { partName: 'arka tampon', damageStatus: DamageStatus.NONE },
      ],
    });

    const requesterToken = await login(baseUrl, requester.username, password);

    const createConversationResponse = await requestJson(baseUrl, '/loi-ai/conversations', {
      method: 'POST',
      token: requesterToken,
      body: {},
    });
    assert.equal(createConversationResponse.status, 201);
    assert.equal(createConversationResponse.payload.title, 'Yeni sohbet');

    const conversationId = createConversationResponse.payload.id;

    const sendByListingNoResponse = await requestJson(
      baseUrl,
      `/loi-ai/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        token: requesterToken,
        body: {
          content: `${listingA.listingNo} ilanini bulur musun ve kisaca yorumla`,
          attachments: [
            {
              type: 'FILE',
              url: 'https://example.com/notlar.pdf',
              name: 'notlar.pdf',
            },
          ],
        },
      },
    );

    assert.equal(sendByListingNoResponse.status, 201);
    assert.equal(sendByListingNoResponse.payload.userMessage.attachments.length, 1);
    assert.equal(sendByListingNoResponse.payload.assistantMessage.cards.length, 1);
    assert.equal(sendByListingNoResponse.payload.assistantMessage.cards[0].type, 'LISTING_CARD');
    assert.equal(
      sendByListingNoResponse.payload.assistantMessage.cards[0].metadata.listingNo,
      listingA.listingNo,
    );
    assert.equal(sendByListingNoResponse.payload.selectedProvider, 'INTERNAL');
    assert.notEqual(sendByListingNoResponse.payload.title, 'Yeni sohbet');
    assert.ok(sendByListingNoResponse.payload.assistantMessage.content.includes(listingA.listingNo));
    assert.ok(!sendByListingNoResponse.payload.assistantMessage.content.includes('905551234567'));
    assert.ok(!sendByListingNoResponse.payload.assistantMessage.content.includes('12345678901'));
    assert.ok(
      !Object.prototype.hasOwnProperty.call(
        sendByListingNoResponse.payload.assistantMessage.cards[0].metadata,
        'contactPhone',
      ),
    );

    const conversationDetailResponse = await requestJson(
      baseUrl,
      `/loi-ai/conversations/${conversationId}`,
      {
        token: requesterToken,
      },
    );
    assert.equal(conversationDetailResponse.status, 200);
    assert.equal(conversationDetailResponse.payload.messages.length, 2);
    assert.equal(conversationDetailResponse.payload.messages[0].attachments.length, 1);

    const listConversationsResponse = await requestJson(baseUrl, '/loi-ai/conversations', {
      token: requesterToken,
    });
    assert.equal(listConversationsResponse.status, 200);
    assert.equal(listConversationsResponse.payload[0].id, conversationId);
    assert.ok(listConversationsResponse.payload[0].title.includes(listingA.listingNo));

    const criteriaSearchResponse = await requestJson(
      baseUrl,
      `/loi-ai/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        token: requesterToken,
        body: {
          content: 'Istanbul boyasiz degisensiz ilan ara',
        },
      },
    );
    assert.equal(criteriaSearchResponse.status, 201);
    assert.ok(criteriaSearchResponse.payload.assistantMessage.cards.length >= 1);
    assert.equal(criteriaSearchResponse.payload.assistantMessage.cards[0].entityId, listingA.id);
    assert.equal(criteriaSearchResponse.payload.assistantMessage.cards[0].type, 'LISTING_CARD');

    const compareResponse = await requestJson(baseUrl, '/loi-ai/compare-listings', {
      method: 'POST',
      token: requesterToken,
      body: {
        listingIds: [listingA.id, listingB.id],
      },
    });
    assert.ok(compareResponse.status === 200 || compareResponse.status === 201);
    assert.ok(compareResponse.payload.cards.length >= 2);
    assert.ok(compareResponse.payload.rows.length > 0);
    assert.ok(compareResponse.payload.recommendedListingId);
    assert.ok(compareResponse.payload.reasons.length > 0);

    const sellerQuestionsResponse = await requestJson(
      baseUrl,
      `/loi-ai/listings/${listingA.id}/seller-questions`,
      {
        token: requesterToken,
      },
    );
    assert.equal(sellerQuestionsResponse.status, 200);
    assert.ok(sellerQuestionsResponse.payload.questions.length >= 5);
    assert.ok(
      sellerQuestionsResponse.payload.questions.some((question) =>
        question.toLowerCase().includes('tramer'),
      ),
    );

    const descriptionResponse = await requestJson(
      baseUrl,
      '/loi-ai/generate-listing-description',
      {
        method: 'POST',
        token: requesterToken,
        body: {
          garageVehicleId: requesterVehicle.id,
          tone: 'PROFESSIONAL',
        },
      },
    );
    assert.equal(descriptionResponse.status, 201);
    assert.equal(descriptionResponse.payload.provider, 'INTERNAL');
    assert.ok(descriptionResponse.payload.description.length <= 600);
    assert.ok(descriptionResponse.payload.description.includes(catalog.brand.name));

    const privateLookupResponse = await requestJson(
      baseUrl,
      `/loi-ai/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        token: requesterToken,
        body: {
          content: `@${privateUser.username} profilini bul`,
        },
      },
    );
    assert.equal(privateLookupResponse.status, 201);
    assert.ok(
      privateLookupResponse.payload.assistantMessage.cards.every(
        (card) => !(card.type === 'USER_CARD' && card.entityId === privateUser.id),
      ),
    );
    assert.ok(!privateLookupResponse.payload.assistantMessage.content.includes(privateUser.username));
    assert.ok(
      !privateLookupResponse.payload.assistantMessage.content.includes(
        `${privateUser.firstName} ${privateUser.lastName}`,
      ),
    );
  } finally {
    await app.close();

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }

    if (createdBrandIds.length > 0) {
      await prisma.vehicleBrand.deleteMany({
        where: {
          id: {
            in: createdBrandIds,
          },
        },
      });
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});

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
const {
  FuelType,
  PrismaClient,
  SellerType,
  TransmissionType,
  UserType,
} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createApp } = require('../dist/app.factory.js');

const prisma = new PrismaClient();

async function requestJson(baseUrl, path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-device-name': 'listings-e2e',
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
  userType = UserType.INDIVIDUAL,
  tcIdentityNo = null,
  isCommercialApproved = false,
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      userType,
      email,
      phone,
      username,
      passwordHash,
      firstName,
      lastName,
      tcIdentityNo,
      isVerified: true,
      isCommercialApproved,
      profile: {
        create: {
          avatarUrl: `https://example.com/${username}.jpg`,
          locationText: 'Istanbul / Kadikoy',
        },
      },
    },
    select: {
      id: true,
      email: true,
      phone: true,
      username: true,
      firstName: true,
      lastName: true,
      userType: true,
    },
  });
}

async function createCatalogChain({ brandName, brandSlug, modelName, modelSlug, packages }) {
  const brand = await prisma.vehicleBrand.upsert({
    where: {
      slug: brandSlug,
    },
    update: {
      name: brandName,
    },
    create: {
      name: brandName,
      slug: brandSlug,
    },
  });

  const model = await prisma.vehicleModel.upsert({
    where: {
      brandId_slug: {
        brandId: brand.id,
        slug: modelSlug,
      },
    },
    update: {
      name: modelName,
    },
    create: {
      brandId: brand.id,
      name: modelName,
      slug: modelSlug,
    },
  });

  const createdPackages = [];

  for (const item of packages) {
    const vehiclePackage = await prisma.vehiclePackage.upsert({
      where: {
        modelId_slug: {
          modelId: model.id,
          slug: item.slug,
        },
      },
      update: {
        name: item.name,
      },
      create: {
        modelId: model.id,
        name: item.name,
        slug: item.slug,
      },
    });

    await prisma.vehicleSpec.upsert({
      where: {
        packageId: vehiclePackage.id,
      },
      update: item.spec,
      create: {
        packageId: vehiclePackage.id,
        ...item.spec,
      },
    });

    createdPackages.push(vehiclePackage);
  }

  return { brand, model, packages: createdPackages };
}

async function createGarageVehicle({
  ownerId,
  vehiclePackageId,
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
      vehiclePackageId,
      brandText,
      modelText,
      packageText: packageText ?? null,
      year,
      plateNumber,
      color: 'Beyaz',
      fuelType,
      transmissionType,
      km,
      isPublic: true,
    },
    select: {
      id: true,
      plateNumber: true,
    },
  });
}

test('listing rules and feed flow work end to end', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const password = 'StrongPass123!';
  const tcNumbers = {
    individual: `1${suffix.slice(-9)}0`,
    other: `2${suffix.slice(-9)}0`,
    viewer: `3${suffix.slice(-9)}0`,
    commercialPending: `4${suffix.slice(-9)}0`,
    commercialApproved: `5${suffix.slice(-9)}0`,
  };
  const identifiers = {
    individualEmail: `listing-individual-${suffix}@example.com`,
    individualPhone: `90531${suffix.slice(-7)}`,
    individualUsername: `listind${suffix.slice(-8)}`,
    otherEmail: `listing-other-${suffix}@example.com`,
    otherPhone: `90532${suffix.slice(-7)}`,
    otherUsername: `listother${suffix.slice(-8)}`,
    viewerEmail: `listing-viewer-${suffix}@example.com`,
    viewerPhone: `90533${suffix.slice(-7)}`,
    viewerUsername: `listview${suffix.slice(-8)}`,
    commercialPendingEmail: `listing-commercial-p-${suffix}@example.com`,
    commercialPendingPhone: `90534${suffix.slice(-7)}`,
    commercialPendingUsername: `listcomp${suffix.slice(-8)}`,
    commercialApprovedEmail: `listing-commercial-a-${suffix}@example.com`,
    commercialApprovedPhone: `90535${suffix.slice(-7)}`,
    commercialApprovedUsername: `listcompa${suffix.slice(-8)}`,
  };
  const catalogSlugs = {
    fiatBrand: `fiat-${suffix}`,
    fiatModel: `egea-${suffix}`,
    renaultBrand: `renault-${suffix}`,
    renaultModel: `clio-${suffix}`,
  };

  let createdBrandIds = [];
  let createdModelIds = [];
  let createdPackageIds = [];
  const createdUserIds = [];
  const createdGarageVehicleIds = [];

  try {
    const fiatCatalog = await createCatalogChain({
      brandName: `Fiat ${suffix}`,
      brandSlug: catalogSlugs.fiatBrand,
      modelName: `Egea ${suffix}`,
      modelSlug: catalogSlugs.fiatModel,
      packages: [
        {
          name: `Easy ${suffix}`,
          slug: `easy-${suffix}`,
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1368,
            enginePowerHp: 95,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.MANUAL,
            equipmentSummary: 'Temel guvenlik paketi',
            multimediaSummary: 'Bluetooth, USB',
            interiorSummary: 'Kumas doseme',
            exteriorSummary: 'Gunduz farlari',
          },
        },
      ],
    });
    const renaultCatalog = await createCatalogChain({
      brandName: `Renault ${suffix}`,
      brandSlug: catalogSlugs.renaultBrand,
      modelName: `Clio ${suffix}`,
      modelSlug: catalogSlugs.renaultModel,
      packages: [
        {
          name: `Touch ${suffix}`,
          slug: `touch-${suffix}`,
          spec: {
            bodyType: 'Hatchback',
            engineVolumeCc: 999,
            enginePowerHp: 100,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.CVT,
            equipmentSummary: 'Park sensoru',
            multimediaSummary: 'Apple CarPlay',
            interiorSummary: 'Deri direksiyon',
            exteriorSummary: 'Alasim jant',
          },
        },
      ],
    });

    createdBrandIds = [fiatCatalog.brand.id, renaultCatalog.brand.id];
    createdModelIds = [fiatCatalog.model.id, renaultCatalog.model.id];
    createdPackageIds = [
      fiatCatalog.packages[0].id,
      renaultCatalog.packages[0].id,
    ];

    const individualUser = await createVerifiedUser({
      email: identifiers.individualEmail,
      phone: identifiers.individualPhone,
      username: identifiers.individualUsername,
      password,
      firstName: 'Ali',
      lastName: 'Yilmaz',
      tcIdentityNo: tcNumbers.individual,
    });
    const otherUser = await createVerifiedUser({
      email: identifiers.otherEmail,
      phone: identifiers.otherPhone,
      username: identifiers.otherUsername,
      password,
      firstName: 'Ayse',
      lastName: 'Demir',
      tcIdentityNo: tcNumbers.other,
    });
    const viewerUser = await createVerifiedUser({
      email: identifiers.viewerEmail,
      phone: identifiers.viewerPhone,
      username: identifiers.viewerUsername,
      password,
      firstName: 'Can',
      lastName: 'Kaya',
      tcIdentityNo: tcNumbers.viewer,
    });
    const commercialPendingUser = await createVerifiedUser({
      email: identifiers.commercialPendingEmail,
      phone: identifiers.commercialPendingPhone,
      username: identifiers.commercialPendingUsername,
      password,
      firstName: 'Mert',
      lastName: 'Sahin',
      userType: UserType.COMMERCIAL,
      tcIdentityNo: tcNumbers.commercialPending,
      isCommercialApproved: false,
    });
    const commercialApprovedUser = await createVerifiedUser({
      email: identifiers.commercialApprovedEmail,
      phone: identifiers.commercialApprovedPhone,
      username: identifiers.commercialApprovedUsername,
      password,
      firstName: 'Derya',
      lastName: 'Acar',
      userType: UserType.COMMERCIAL,
      tcIdentityNo: tcNumbers.commercialApproved,
      isCommercialApproved: true,
    });

    createdUserIds.push(
      individualUser.id,
      otherUser.id,
      viewerUser.id,
      commercialPendingUser.id,
      commercialApprovedUser.id,
    );

    const individualGarageVehicle = await createGarageVehicle({
      ownerId: individualUser.id,
      vehiclePackageId: fiatCatalog.packages[0].id,
      brandText: fiatCatalog.brand.name,
      modelText: fiatCatalog.model.name,
      packageText: fiatCatalog.packages[0].name,
      plateNumber: `34ALI${suffix.slice(-2)}`,
      year: 2021,
      km: 45_000,
      fuelType: FuelType.GASOLINE,
      transmissionType: TransmissionType.MANUAL,
    });
    const otherGarageVehicle = await createGarageVehicle({
      ownerId: otherUser.id,
      vehiclePackageId: fiatCatalog.packages[0].id,
      brandText: fiatCatalog.brand.name,
      modelText: fiatCatalog.model.name,
      packageText: fiatCatalog.packages[0].name,
      plateNumber: `06AYS${suffix.slice(-2)}`,
      year: 2020,
      km: 62_000,
    });
    const commercialPendingGarageVehicle = await createGarageVehicle({
      ownerId: commercialPendingUser.id,
      vehiclePackageId: renaultCatalog.packages[0].id,
      brandText: renaultCatalog.brand.name,
      modelText: renaultCatalog.model.name,
      packageText: renaultCatalog.packages[0].name,
      plateNumber: `35MRT${suffix.slice(-2)}`,
      year: 2022,
      km: 31_000,
      transmissionType: TransmissionType.CVT,
    });
    const commercialApprovedGarageVehicle = await createGarageVehicle({
      ownerId: commercialApprovedUser.id,
      vehiclePackageId: renaultCatalog.packages[0].id,
      brandText: renaultCatalog.brand.name,
      modelText: renaultCatalog.model.name,
      packageText: renaultCatalog.packages[0].name,
      plateNumber: `34DRY${suffix.slice(-2)}`,
      year: 2023,
      km: 19_500,
      transmissionType: TransmissionType.CVT,
    });

    createdGarageVehicleIds.push(
      individualGarageVehicle.id,
      otherGarageVehicle.id,
      commercialPendingGarageVehicle.id,
      commercialApprovedGarageVehicle.id,
    );

    const loginResponses = await Promise.all([
      requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: {
          identifier: identifiers.individualUsername,
          password,
        },
      }),
      requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: {
          identifier: identifiers.viewerEmail,
          password,
        },
      }),
      requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: {
          identifier: identifiers.commercialPendingEmail,
          password,
        },
      }),
      requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: {
          identifier: identifiers.commercialApprovedPhone,
          password,
        },
      }),
    ]);

    for (const response of loginResponses) {
      assert.equal(response.status, 201);
      assert.ok(response.payload.accessToken);
    }

    const individualToken = loginResponses[0].payload.accessToken;
    const viewerToken = loginResponses[1].payload.accessToken;
    const commercialPendingToken = loginResponses[2].payload.accessToken;
    const commercialApprovedToken = loginResponses[3].payload.accessToken;

    const individualOwnListing = await requestJson(baseUrl, '/listings', {
      method: 'POST',
      token: individualToken,
      body: {
        garageVehicleId: individualGarageVehicle.id,
        title: 'Temiz aile araci',
        description: 'Bakimli, hasar kaydi dusuk ve masrafsiz arac.',
        price: 975000,
        currency: 'TRY',
        city: 'Istanbul',
        district: 'Kadikoy',
        sellerType: SellerType.OWNER,
        tradeAvailable: true,
        media: [
          { url: 'https://images.example.com/listing-1-a.jpg' },
          { url: 'https://images.example.com/listing-1-b.jpg' },
          { url: 'https://images.example.com/listing-1-c.jpg' },
        ],
        damageParts: [{ partName: 'kaput', damageStatus: 'NONE' }],
        licenseInfo: {
          plateNumber: individualGarageVehicle.plateNumber,
          ownerFirstName: 'Ali',
          ownerLastName: 'Yilmaz',
          ownerTcIdentityNo: tcNumbers.individual,
        },
        contactPhone: identifiers.individualPhone,
        showPhone: true,
      },
    });

    assert.equal(individualOwnListing.status, 201);
    assert.equal(individualOwnListing.payload.success, true);
    assert.equal(individualOwnListing.payload.listingStatus, 'ACTIVE');
    assert.match(individualOwnListing.payload.listingNo, /^CLV4-/);

    const foreignGarageAttempt = await requestJson(baseUrl, '/listings', {
      method: 'POST',
      token: individualToken,
      body: {
        garageVehicleId: otherGarageVehicle.id,
        title: 'Baskasinin araci',
        description: 'Bu ilan olusmamalidir.',
        price: 910000,
        currency: 'TRY',
        city: 'Ankara',
        district: 'Cankaya',
        sellerType: SellerType.OWNER,
        media: [
          { url: 'https://images.example.com/listing-foreign-a.jpg' },
          { url: 'https://images.example.com/listing-foreign-b.jpg' },
          { url: 'https://images.example.com/listing-foreign-c.jpg' },
        ],
        licenseInfo: {
          plateNumber: otherGarageVehicle.plateNumber,
          ownerFirstName: 'Ali',
          ownerLastName: 'Yilmaz',
          ownerTcIdentityNo: tcNumbers.individual,
        },
      },
    });

    assert.equal(foreignGarageAttempt.status, 403);

    const commercialPendingAttempt = await requestJson(baseUrl, '/listings', {
      method: 'POST',
      token: commercialPendingToken,
      body: {
        garageVehicleId: commercialPendingGarageVehicle.id,
        title: 'Onaysiz ticari ilan',
        description: 'Bu ilan onaysiz hesap sebebiyle reddedilmelidir.',
        price: 880000,
        currency: 'TRY',
        city: 'Izmir',
        district: 'Bornova',
        sellerType: SellerType.DEALER,
        media: [
          { url: 'https://images.example.com/listing-pending-a.jpg' },
          { url: 'https://images.example.com/listing-pending-b.jpg' },
          { url: 'https://images.example.com/listing-pending-c.jpg' },
        ],
        licenseInfo: {
          plateNumber: commercialPendingGarageVehicle.plateNumber,
          ownerFirstName: 'Mert',
          ownerLastName: 'Sahin',
          ownerTcIdentityNo: tcNumbers.commercialPending,
        },
      },
    });

    assert.equal(commercialPendingAttempt.status, 403);

    const commercialListingOne = await requestJson(baseUrl, '/listings', {
      method: 'POST',
      token: commercialApprovedToken,
      body: {
        garageVehicleId: commercialApprovedGarageVehicle.id,
        title: 'Galeri cikisli Clio Touch',
        description: 'Ilk sahibinden alinmis, servis bakimli, krediye uygun.',
        price: 1185000,
        currency: 'TRY',
        city: 'Istanbul',
        district: 'Besiktas',
        sellerType: SellerType.DEALER,
        tradeAvailable: false,
        media: [
          { url: 'https://images.example.com/listing-approved-a.jpg' },
          { url: 'https://images.example.com/listing-approved-b.jpg' },
          { url: 'https://images.example.com/listing-approved-c.jpg' },
        ],
        damageParts: [{ partName: 'arka tampon', damageStatus: 'PAINTED' }],
        licenseInfo: {
          plateNumber: commercialApprovedGarageVehicle.plateNumber,
          ownerFirstName: 'Derya',
          ownerLastName: 'Acar',
          ownerTcIdentityNo: tcNumbers.commercialApproved,
        },
        contactPhone: identifiers.commercialApprovedPhone,
        showPhone: true,
      },
    });

    assert.equal(commercialListingOne.status, 201);
    assert.equal(commercialListingOne.payload.listingStatus, 'ACTIVE');

    const commercialListingTwo = await requestJson(baseUrl, '/listings', {
      method: 'POST',
      token: commercialApprovedToken,
      body: {
        garageVehicleId: commercialApprovedGarageVehicle.id,
        title: 'Ikinci Clio ilani',
        description: 'Ayni arac uzerinden listingNo benzersizligi test ediliyor.',
        price: 1179000,
        currency: 'TRY',
        city: 'Ankara',
        district: 'Cankaya',
        sellerType: SellerType.DEALER,
        tradeAvailable: true,
        media: [
          { url: 'https://images.example.com/listing-approved-2-a.jpg' },
          { url: 'https://images.example.com/listing-approved-2-b.jpg' },
          { url: 'https://images.example.com/listing-approved-2-c.jpg' },
        ],
        licenseInfo: {
          plateNumber: commercialApprovedGarageVehicle.plateNumber,
          ownerFirstName: 'Derya',
          ownerLastName: 'Acar',
          ownerTcIdentityNo: tcNumbers.commercialApproved,
        },
        contactPhone: identifiers.commercialApprovedPhone,
        showPhone: true,
      },
    });

    assert.equal(commercialListingTwo.status, 201);
    assert.notEqual(commercialListingOne.payload.listingNo, commercialListingTwo.payload.listingNo);

    const filteredFeed = await requestJson(
      baseUrl,
      `/listings/feed?brandId=${encodeURIComponent(renaultCatalog.brand.id)}&city=${encodeURIComponent('Istanbul')}`,
      {
        token: viewerToken,
      },
    );

    assert.equal(filteredFeed.status, 200);
    assert.equal(filteredFeed.payload.items.length, 1);
    assert.equal(filteredFeed.payload.items[0].brand, renaultCatalog.brand.name);
    assert.equal(filteredFeed.payload.items[0].city, 'Istanbul');

    const saveListing = await requestJson(
      baseUrl,
      `/listings/${commercialListingOne.payload.listingId}/save`,
      {
        method: 'POST',
        token: viewerToken,
      },
    );

    assert.equal(saveListing.status, 201);
    assert.equal(saveListing.payload.isSaved, true);

    const detailResponse = await requestJson(
      baseUrl,
      `/listings/${commercialListingOne.payload.listingId}`,
      {
        token: viewerToken,
      },
    );

    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.payload.isSaved, true);
    assert.equal(detailResponse.payload.vehicle.brand, renaultCatalog.brand.name);
    assert.equal(detailResponse.payload.contactActions.canCall, true);
    assert.equal(detailResponse.payload.damageParts.length, 1);
  } finally {
    await prisma.savedItem.deleteMany({
      where: {
        userId: {
          in: createdUserIds,
        },
      },
    });
    await prisma.legalComplianceCheck.deleteMany({
      where: {
        userId: {
          in: createdUserIds,
        },
      },
    });
    await prisma.listing.deleteMany({
      where: {
        sellerId: {
          in: createdUserIds,
        },
      },
    });
    await prisma.userListingLimit.deleteMany({
      where: {
        userId: {
          in: createdUserIds,
        },
      },
    });
    await prisma.garageVehicle.deleteMany({
      where: {
        id: {
          in: createdGarageVehicleIds,
        },
      },
    });
    await prisma.accountSession.deleteMany({
      where: {
        userId: {
          in: createdUserIds,
        },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        userId: {
          in: createdUserIds,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: createdUserIds,
        },
      },
    });
    await prisma.vehicleSpec.deleteMany({
      where: {
        packageId: {
          in: createdPackageIds,
        },
      },
    });
    await prisma.vehiclePackage.deleteMany({
      where: {
        id: {
          in: createdPackageIds,
        },
      },
    });
    await prisma.vehicleModel.deleteMany({
      where: {
        id: {
          in: createdModelIds,
        },
      },
    });
    await prisma.vehicleBrand.deleteMany({
      where: {
        id: {
          in: createdBrandIds,
        },
      },
    });
    await app.close();
  }
});

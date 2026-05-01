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
      'x-device-name': 'garage-e2e',
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
  tcIdentityNo = null,
  showGarageVehicles = true,
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
          locationText: 'Istanbul / Kadikoy',
          showGarageVehicles,
        },
      },
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      tcIdentityNo: true,
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

  assert.ok(response.status === 200 || response.status === 201);
  return response.payload.accessToken;
}

test('garage vehicles, visibility, and listing flow stay stable while obd is disabled', async () => {
  const app = await createApp();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  assert.ok(address && typeof address === 'object' && 'port' in address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const password = 'StrongPass123!';
  const tcNumbers = {
    owner: `1${suffix.slice(-9)}0`,
    other: `2${suffix.slice(-9)}0`,
    hidden: `3${suffix.slice(-9)}0`,
  };
  const userIds = [];
  const vehicleIds = [];
  const listingIds = [];

  try {
    const owner = await createVerifiedUser({
      email: `garage-owner-${suffix}@example.com`,
      phone: `90541${suffix.slice(-7)}`,
      username: `garageown${suffix.slice(-8)}`,
      password,
      firstName: 'Kerem',
      lastName: 'Aydin',
      tcIdentityNo: tcNumbers.owner,
    });
    const other = await createVerifiedUser({
      email: `garage-other-${suffix}@example.com`,
      phone: `90542${suffix.slice(-7)}`,
      username: `garageoth${suffix.slice(-8)}`,
      password,
      firstName: 'Bora',
      lastName: 'Keskin',
      tcIdentityNo: tcNumbers.other,
    });
    const hidden = await createVerifiedUser({
      email: `garage-hidden-${suffix}@example.com`,
      phone: `90543${suffix.slice(-7)}`,
      username: `garagehid${suffix.slice(-8)}`,
      password,
      firstName: 'Selin',
      lastName: 'Ergin',
      tcIdentityNo: tcNumbers.hidden,
      showGarageVehicles: false,
    });

    userIds.push(owner.id, other.id, hidden.id);

    const ownerToken = await login(baseUrl, owner.username, password);
    const otherToken = await login(baseUrl, other.username, password);

    const createVehicleResponse = await requestJson(baseUrl, '/garage/vehicles', {
      method: 'POST',
      token: ownerToken,
      body: {
        vehicleType: VehicleType.SEDAN,
        brandText: 'Fiat',
        modelText: 'Egea',
        packageText: 'Urban',
        year: 2021,
        plateNumber: `34GAR${suffix.slice(-3)}`,
        color: 'Beyaz',
        fuelType: FuelType.DIESEL,
        transmissionType: TransmissionType.MANUAL,
        km: 84200,
        isPublic: true,
        extraEquipment: [
          {
            category: 'COMFORT',
            name: 'Sunroof',
            note: 'Sonradan eklendi',
          },
        ],
        media: [
          { url: 'https://example.com/garage-owner-1.jpg' },
          { url: 'https://example.com/garage-owner-2.jpg' },
        ],
      },
    });

    assert.equal(createVehicleResponse.status, 201);
    assert.equal(createVehicleResponse.payload.success, true);
    assert.equal(createVehicleResponse.payload.vehicle.brand, 'Fiat');
    assert.ok(createVehicleResponse.payload.vehicle.plateNumberMasked.includes('*'));

    const vehicleId = createVehicleResponse.payload.vehicle.id;
    vehicleIds.push(vehicleId);

    const listResponse = await requestJson(baseUrl, '/garage/vehicles', {
      token: ownerToken,
    });
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.payload.items.length, 1);
    assert.equal(listResponse.payload.items[0].id, vehicleId);

    const detailResponse = await requestJson(baseUrl, `/garage/vehicles/${vehicleId}`, {
      token: ownerToken,
    });
    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.payload.id, vehicleId);
    assert.equal(detailResponse.payload.media.length, 2);
    assert.equal(detailResponse.payload.extraEquipment.length, 1);
    assert.equal(detailResponse.payload.extraEquipment[0].name, 'Sunroof');
    assert.equal(detailResponse.payload.latestObdReport, null);

    const updateForbiddenResponse = await requestJson(baseUrl, `/garage/vehicles/${vehicleId}`, {
      method: 'PATCH',
      token: otherToken,
      body: {
        color: 'Siyah',
      },
    });
    assert.equal(updateForbiddenResponse.status, 404);

    const publicGarageResponse = await requestJson(baseUrl, `/users/${owner.id}/public-garage`);
    assert.equal(publicGarageResponse.status, 200);
    assert.equal(publicGarageResponse.payload.hiddenByProfile, false);
    assert.equal(publicGarageResponse.payload.items.length, 1);

    const hiddenVehicle = await prisma.garageVehicle.create({
      data: {
        ownerId: hidden.id,
        vehicleType: VehicleType.HATCHBACK,
        brandText: 'Renault',
        modelText: 'Clio',
        packageText: 'Touch',
        year: 2020,
        plateNumber: `34HID${suffix.slice(-3)}`,
        color: 'Gri',
        fuelType: FuelType.GASOLINE,
        transmissionType: TransmissionType.CVT,
        km: 55100,
        isPublic: true,
      },
      select: {
        id: true,
      },
    });
    vehicleIds.push(hiddenVehicle.id);

    const hiddenGarageResponse = await requestJson(baseUrl, `/users/${hidden.id}/public-garage`);
    assert.equal(hiddenGarageResponse.status, 200);
    assert.equal(hiddenGarageResponse.payload.hiddenByProfile, true);
    assert.equal(hiddenGarageResponse.payload.items.length, 0);

    const connectResponse = await requestJson(baseUrl, `/garage/vehicles/${vehicleId}/obd/connect`, {
      method: 'POST',
      token: ownerToken,
      body: {
        adapterType: 'MOCK',
        deviceName: 'ELM327 Mock',
        deviceId: `mock-${suffix}`,
        password: '1234',
      },
    });
    assert.equal(connectResponse.status, 404);

    const reportResponse = await requestJson(baseUrl, `/garage/vehicles/${vehicleId}/obd/report`, {
      method: 'POST',
      token: ownerToken,
      body: {
        durationSeconds: 600,
        snapshots: [
          {
            rpm: 850,
            speed: 0,
            coolantTemp: 84,
            engineLoad: 24,
            fuelLevel: 62,
            batteryVoltage: 12.7,
            intakeAirTemp: 21,
            throttlePosition: 12,
          },
          {
            rpm: 2400,
            speed: 48,
            coolantTemp: 91,
            engineLoad: 46,
            fuelLevel: 58,
            batteryVoltage: 12.5,
            intakeAirTemp: 24,
            throttlePosition: 34,
          },
          {
            rpm: 3100,
            speed: 76,
            coolantTemp: 97,
            engineLoad: 58,
            fuelLevel: 54,
            batteryVoltage: 12.3,
            intakeAirTemp: 28,
            throttlePosition: 41,
          },
        ],
        faultCodes: [
          {
            code: 'P0420',
            description: 'Catalyst efficiency below threshold',
            severity: 'WARNING',
          },
        ],
      },
    });

    assert.equal(reportResponse.status, 404);

    const detailAfterReportResponse = await requestJson(baseUrl, `/garage/vehicles/${vehicleId}`, {
      token: ownerToken,
    });
    assert.equal(detailAfterReportResponse.status, 200);
    assert.equal(detailAfterReportResponse.payload.latestObdReport, null);

    const listingResponse = await requestJson(baseUrl, '/listings', {
      method: 'POST',
      token: ownerToken,
      body: {
        garageVehicleId: vehicleId,
        title: 'Sahibinden temiz Egea',
        description: 'Bakimli ve duzenli kullanilmis arac.',
        price: 845000,
        currency: 'TRY',
        city: 'Istanbul',
        district: 'Kadikoy',
        sellerType: SellerType.OWNER,
        tradeAvailable: false,
        media: [
          { url: 'https://example.com/listing-1.jpg' },
          { url: 'https://example.com/listing-2.jpg' },
          { url: 'https://example.com/listing-3.jpg' },
        ],
        licenseInfo: {
          plateNumber: `34GAR${suffix.slice(-3)}`,
          ownerFirstName: owner.firstName,
          ownerLastName: owner.lastName,
          ownerTcIdentityNo: owner.tcIdentityNo,
        },
        contactPhone: `90541${suffix.slice(-7)}`,
        showPhone: true,
      },
    });

    assert.equal(listingResponse.status, 201);
    listingIds.push(listingResponse.payload.listingId);

    const listingDetailResponse = await requestJson(
      baseUrl,
      `/listings/${listingResponse.payload.listingId}`,
      { token: ownerToken },
    );
    assert.equal(listingDetailResponse.status, 200);
    assert.equal(listingDetailResponse.payload.expertiseReport, null);
    assert.equal(listingDetailResponse.payload.expertiseSummary, null);
  } finally {
    if (listingIds.length > 0) {
      await prisma.listing.deleteMany({
        where: {
          id: { in: listingIds },
        },
      });
    }

    if (vehicleIds.length > 0) {
      await prisma.garageVehicle.deleteMany({
        where: {
          id: { in: vehicleIds },
        },
      });
    }

    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: { in: userIds },
        },
      });
    }

    await app.close();
  }
});

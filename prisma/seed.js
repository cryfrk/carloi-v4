const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const {
  AdminRole,
  CommercialApplicationStatus,
  ContentVisibility,
  FuelType,
  ListingStatus,
  MediaType,
  PrismaClient,
  SellerType,
  TransmissionType,
  UserType,
  VehicleType,
} = require('@prisma/client');
const { seedBackendDemoData } = require('./seed/backend-demo-dataset');
const { PHASE1_VEHICLE_MODEL_BRANDS } = require('./seed/vehicle-models.phase1');
const { buildPackageRowsForModel } = require('./seed/vehicle-packages.phase2');
const { buildSpecRowsForPackage } = require('./seed/vehicle-specs.phase3');
const { buildEquipmentRowsForPackage } = require('./seed/vehicle-equipment.phase4');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const PLACEHOLDER_PASSWORD = 'replace-me';
const DEVELOPMENT_SEED_PASSWORD = 'DemoSeed123!';
const VEHICLE_CATALOG_TYPE = {
  AUTOMOBILE: 'AUTOMOBILE',
  MOTORCYCLE: 'MOTORCYCLE',
  COMMERCIAL: 'COMMERCIAL',
};

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = line.split('=');
    if (!key || process.env[key]) {
      continue;
    }

    const value = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    process.env[key] = value;
  }
}

function readPassword(envName, fallback) {
  const value = process.env[envName] ?? fallback;
  if (!value || value === PLACEHOLDER_PASSWORD) {
    return null;
  }
  return value;
}

function getDevelopmentSeedPassword() {
  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    return null;
  }

  return DEVELOPMENT_SEED_PASSWORD;
}

function isEnabledFlag(value, fallback = false) {
  if (value == null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function hashPlate(plateNumber) {
  return crypto.createHash('sha256').update(plateNumber).digest('hex');
}

async function seedAdminUser({ username, role, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.adminUser.upsert({
    where: { username },
    update: {
      passwordHash,
      role,
      isActive: true,
    },
    create: {
      username,
      passwordHash,
      role,
      isActive: true,
    },
  });
}

async function seedVehicleCatalog() {
  const catalog = [
    {
      brand: { name: 'BMW', slug: 'bmw' },
      model: { name: '3 Series', slug: '3-series', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: '320i Sport Line',
          slug: '320i-sport-line',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1998,
            enginePowerHp: 170,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Adaptif hiz sabitleyici, surus modlari, on arka park sensoru',
            multimediaSummary: '14.9 inc curved ekran, Apple CarPlay, Android Auto',
            interiorSummary: 'Sport koltuklar, ambiyans aydinlatma, deri direksiyon',
            exteriorSummary: 'LED farlar, 18 inc jantlar, parlak siyah trimler',
          },
        },
        {
          name: '320d M Sport',
          slug: '320d-m-sport',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1995,
            enginePowerHp: 190,
            tractionType: 'RWD',
            fuelType: FuelType.DIESEL,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'M Sport suspansiyon, surucu destek plus, geri gorus kamerasi',
            multimediaSummary: 'Premium navigasyon, kablosuz baglanti, head-up display',
            interiorSummary: 'Alcantara spor koltuklar, uc bolge klima, siyah tavan dosemesi',
            exteriorSummary: 'M body kit, 19 inc jantlar, koyu detay paketi',
          },
        },
      ],
    },
    {
      brand: { name: 'BMW', slug: 'bmw' },
      model: { name: '5 Series', slug: '5-series', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: '520i Executive',
          slug: '520i-executive',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1998,
            enginePowerHp: 190,
            tractionType: 'RWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Elektrikli bagaj, adaptif hiz sabitleyici, surus asistanlari',
            multimediaSummary: '12.3 inc ekran, navigasyon, premium ses sistemi',
            interiorSummary: 'Deri doseme, on isitma, ambiyans aydinlatma',
            exteriorSummary: 'Matrix LED farlar, 18 inc jantlar, krom detaylar',
          },
        },
        {
          name: '520d M Sport',
          slug: '520d-m-sport',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1995,
            enginePowerHp: 197,
            tractionType: 'RWD',
            fuelType: FuelType.DIESEL,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'M Sport frenler, surucu destek profesyonel, adaptif suspansiyon',
            multimediaSummary: 'Buyuk curved ekran, head-up display, kablosuz Apple CarPlay',
            interiorSummary: 'Spor deri koltuklar, crystal detaylar, premium trimler',
            exteriorSummary: 'M body kit, 19 inc jantlar, koyu shadow line paketi',
          },
        },
      ],
    },
    {
      brand: { name: 'BMW', slug: 'bmw' },
      model: { name: 'R 1250 GS', slug: 'r-1250-gs', catalogType: VEHICLE_CATALOG_TYPE.MOTORCYCLE },
      packages: [
        {
          name: 'Standard',
          slug: 'standard',
          spec: {
            bodyType: 'Motosiklet',
            engineVolumeCc: 1254,
            enginePowerHp: 136,
            tractionType: 'RWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.SEMI_AUTOMATIC,
            equipmentSummary: 'Surus modlari, hill start control, viraj ABS',
            multimediaSummary: 'TFT ekran, Bluetooth, navigasyon hazirligi',
            interiorSummary: 'Isitmali sele, konfor paketi',
            exteriorSummary: 'Adventure korumalari, sis farlari, alasim jantlar',
          },
        },
      ],
    },
    {
      brand: { name: 'Mercedes-Benz', slug: 'mercedes-benz', country: 'Germany', type: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      model: {
        name: 'C Serisi',
        slug: 'c-serisi',
        catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE,
        bodyType: 'Sedan',
      },
      packages: [
        {
          name: 'C 200 AMG',
          slug: 'c-200-amg',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1496,
            enginePowerHp: 204,
            tractionType: 'RWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Surus paketleri, adaptif hiz sabitleyici, park asistani',
            multimediaSummary: 'MBUX cift ekran, kablosuz yansitma, navigasyon',
            interiorSummary: 'AMG spor koltuklar, ambiyans aydinlatma, dijital kokpit',
            exteriorSummary: 'AMG body kit, LED farlar, 18 inc jantlar',
          },
        },
      ],
    },
    {
      brand: { name: 'Audi', slug: 'audi' },
      model: { name: 'A4', slug: 'a4', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: 'S line',
          slug: 's-line',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1984,
            enginePowerHp: 204,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Surus asistanlari, geri gorus kamerasi, uc bolge klima',
            multimediaSummary: 'Virtual cockpit, MMI navigation plus, kablosuz baglanti',
            interiorSummary: 'S line koltuklar, siyah tavan, premium trimler',
            exteriorSummary: 'S line tamponlar, LED farlar, 18 inc jantlar',
          },
        },
      ],
    },
    {
      brand: { name: 'Volkswagen', slug: 'volkswagen' },
      model: { name: 'Golf', slug: 'golf', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: 'Comfortline',
          slug: 'comfortline',
          spec: {
            bodyType: 'Hatchback',
            engineVolumeCc: 1498,
            enginePowerHp: 130,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Adaptif hiz sabitleyici, on arka park sensorleri',
            multimediaSummary: '8.25 inc ekran, Apple CarPlay, Android Auto',
            interiorSummary: 'ErgoActive koltuklar, ambiyans aydinlatma',
            exteriorSummary: 'LED farlar, 16 inc alasim jantlar',
          },
        },
        {
          name: 'Highline',
          slug: 'highline',
          spec: {
            bodyType: 'Hatchback',
            engineVolumeCc: 1498,
            enginePowerHp: 150,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Yari otonom surus destekleri, 360 derece park paketi',
            multimediaSummary: '10 inc ekran, premium ses sistemi, kablosuz baglanti',
            interiorSummary: 'Deri doseme, isitma hafizali koltuklar, dijital kokpit',
            exteriorSummary: 'Matrix LED farlar, 17 inc alasim jantlar',
          },
        },
      ],
    },
    {
      brand: { name: 'Fiat', slug: 'fiat' },
      model: { name: 'Egea', slug: 'egea', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: 'Easy',
          slug: 'easy',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1368,
            enginePowerHp: 95,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.MANUAL,
            equipmentSummary: 'Hiz sabitleyici, manuel klima, temel guvenlik paketi',
            multimediaSummary: '5 inc multimedya ekrani, Bluetooth, USB',
            interiorSummary: 'Kumas doseme, yukseklik ayarli surucu koltugu',
            exteriorSummary: 'Gunduz farlari, govde rengi aynalar',
          },
        },
        {
          name: 'Urban',
          slug: 'urban',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1598,
            enginePowerHp: 130,
            tractionType: 'FWD',
            fuelType: FuelType.DIESEL,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Geri gorus kamerasi, hiz sabitleyici, anahtarsiz calistirma',
            multimediaSummary: '7 inc dokunmatik ekran, Apple CarPlay, Android Auto',
            interiorSummary: 'Deri direksiyon, otomatik klima, arka kol dayama',
            exteriorSummary: 'Alaisim jantlar, sis farlari, krom detay paketi',
          },
        },
        {
          name: 'Lounge',
          slug: 'lounge',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1598,
            enginePowerHp: 130,
            tractionType: 'FWD',
            fuelType: FuelType.DIESEL,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Adaptif hiz sabitleyici, serit takip, ileri guvenlik asistanlari',
            multimediaSummary: '10.25 inc ekran, kablosuz baglanti, navigasyon',
            interiorSummary: 'Yari deri doseme, cift bolge klima, ambiyans aydinlatma',
            exteriorSummary: 'LED farlar, krom cam cercevesi, 17 inc alasim jantlar',
          },
        },
      ],
    },
    {
      brand: { name: 'Fiat', slug: 'fiat' },
      model: { name: 'Doblo Cargo', slug: 'doblo-cargo', catalogType: VEHICLE_CATALOG_TYPE.COMMERCIAL },
      packages: [
        {
          name: 'Premio Plus',
          slug: 'premio-plus',
          spec: {
            bodyType: 'Panelvan',
            engineVolumeCc: 1598,
            enginePowerHp: 120,
            tractionType: 'FWD',
            fuelType: FuelType.DIESEL,
            transmissionType: TransmissionType.MANUAL,
            equipmentSummary: 'Arka park sensoru, hiz sabitleyici, kayar kapi',
            multimediaSummary: '7 inc ekran, Bluetooth, USB',
            interiorSummary: 'Dayanikli ticari doseme, yuk bolmesi kaplamasi',
            exteriorSummary: 'Cift kayar kapi, arka kapakli ticari govde',
          },
        },
      ],
    },
    {
      brand: { name: 'Renault', slug: 'renault' },
      model: { name: 'Clio', slug: 'clio', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: 'Joy',
          slug: 'joy',
          spec: {
            bodyType: 'Hatchback',
            engineVolumeCc: 999,
            enginePowerHp: 90,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.MANUAL,
            equipmentSummary: 'Yokus kalkis destegi, manuel klima, temel guvenlik seti',
            multimediaSummary: '4.2 inc ekran, Bluetooth, USB',
            interiorSummary: 'Kumas doseme, katlanabilir arka koltuk',
            exteriorSummary: 'LED gunduz farlari, 16 inc kapakli jantlar',
          },
        },
        {
          name: 'Touch',
          slug: 'touch',
          spec: {
            bodyType: 'Hatchback',
            engineVolumeCc: 999,
            enginePowerHp: 100,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.CVT,
            equipmentSummary: 'Geri park sensoru, otomatik klima, hiz sinirlayici',
            multimediaSummary: '7 inc ekran, Apple CarPlay, Android Auto',
            interiorSummary: 'Yumusak dokulu trimler, deri direksiyon',
            exteriorSummary: 'Alaisim jantlar, parlak siyah aynalar',
          },
        },
        {
          name: 'Icon',
          slug: 'icon',
          spec: {
            bodyType: 'Hatchback',
            engineVolumeCc: 1333,
            enginePowerHp: 140,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Korner gorus, aktif acil fren, serit destek asistani',
            multimediaSummary: '9.3 inc ekran, kablosuz yansitma, navigasyon',
            interiorSummary: 'Yari deri doseme, dijital klima, kablosuz sarj',
            exteriorSummary: 'Full LED farlar, 17 inc jant, kontrast tavan',
          },
        },
      ],
    },
    {
      brand: { name: 'Renault', slug: 'renault' },
      model: { name: 'Megane', slug: 'megane', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: 'Touch',
          slug: 'touch',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1333,
            enginePowerHp: 140,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Geri gorus kamerasi, cift bolge klima, hiz sabitleyici',
            multimediaSummary: '9.3 inc ekran, navigasyon, kablosuz baglanti',
            interiorSummary: 'Deri direksiyon, yumusak trimler, genis ic hacim',
            exteriorSummary: 'LED farlar, 17 inc jantlar, krom detaylar',
          },
        },
        {
          name: 'Icon',
          slug: 'icon',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1461,
            enginePowerHp: 115,
            tractionType: 'FWD',
            fuelType: FuelType.DIESEL,
            transmissionType: TransmissionType.AUTOMATIC,
            equipmentSummary: 'Surus destekleri, anahtarsiz giris, arka park kamerasi',
            multimediaSummary: 'Buyuk ekran, dijital gosterge, premium ses paketi',
            interiorSummary: 'Yari deri koltuklar, ambiyans aydinlatma, kablosuz sarj',
            exteriorSummary: 'Full LED farlar, 18 inc jantlar, siyah trim paketi',
          },
        },
      ],
    },
    {
      brand: { name: 'Renault', slug: 'renault' },
      model: { name: 'Master', slug: 'master', catalogType: VEHICLE_CATALOG_TYPE.COMMERCIAL },
      packages: [
        {
          name: 'L2H2',
          slug: 'l2h2',
          spec: {
            bodyType: 'Panelvan',
            engineVolumeCc: 2299,
            enginePowerHp: 150,
            tractionType: 'FWD',
            fuelType: FuelType.DIESEL,
            transmissionType: TransmissionType.MANUAL,
            equipmentSummary: 'Yuk bolmesi aydinlatmasi, park sensoru, hiz sabitleyici',
            multimediaSummary: 'Multimedya ekran, Bluetooth, USB',
            interiorSummary: 'Ticari kullanim odakli dayanikli kabin',
            exteriorSummary: 'Yuksek tavan, cift arka kapak, uzun saseli govde',
          },
        },
      ],
    },
    {
      brand: { name: 'Toyota', slug: 'toyota' },
      model: { name: 'Corolla', slug: 'corolla', catalogType: VEHICLE_CATALOG_TYPE.AUTOMOBILE },
      packages: [
        {
          name: 'Vision',
          slug: 'vision',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1598,
            enginePowerHp: 132,
            tractionType: 'FWD',
            fuelType: FuelType.GASOLINE,
            transmissionType: TransmissionType.CVT,
            equipmentSummary: 'Toyota Safety Sense, geri gorus kamerasi, otomatik klima',
            multimediaSummary: '8 inc ekran, Apple CarPlay, Android Auto',
            interiorSummary: 'Kumas doseme, genis arka diz mesafesi',
            exteriorSummary: 'LED farlar, 16 inc jantlar',
          },
        },
        {
          name: 'Flame X-Pack',
          slug: 'flame-x-pack',
          spec: {
            bodyType: 'Sedan',
            engineVolumeCc: 1798,
            enginePowerHp: 140,
            tractionType: 'FWD',
            fuelType: FuelType.HYBRID,
            transmissionType: TransmissionType.CVT,
            equipmentSummary: 'Korner takip, adaptif hiz sabitleyici, kor nokta uyari',
            multimediaSummary: '10.5 inc ekran, premium ses, kablosuz baglanti',
            interiorSummary: 'Deri doseme, isitma, hafiza paketleri',
            exteriorSummary: '17 inc jantlar, premium LED farlar, cam tavan',
          },
        },
      ],
    },
  ];

  const generatedPackage = (
    name,
    slug,
    yearStart,
    yearEnd,
    {
      bodyType,
      engineVolume,
      enginePower,
      fuelType,
      transmissionType,
      tractionType = 'FWD',
      equipmentSummary,
    },
  ) => ({
    name,
    slug,
    yearStart,
    yearEnd,
    marketRegion: 'TR',
    source: 'CARLOI_SEED',
    manualReviewNeeded: false,
    isActive: true,
    spec: {
      year: yearEnd,
      bodyType,
      engineVolume,
      enginePower,
      engineVolumeCc: engineVolume,
      enginePowerHp: enginePower,
      tractionType,
      fuelType,
      transmissionType,
      equipmentSummary,
      multimediaSummary: 'Bluetooth / USB / Apple CarPlay destekli multimedya',
      interiorSummary: `${bodyType} kullanimina uygun sade ve kullanisli kabin`,
      exteriorSummary: `${bodyType} govdeye uygun jant ve aydinlatma paketi`,
    },
  });

  const generatedEntry = (brand, model, packages) => ({ brand, model, packages });
  const A = VEHICLE_CATALOG_TYPE.AUTOMOBILE;
  const M = VEHICLE_CATALOG_TYPE.MOTORCYCLE;
  const C = VEHICLE_CATALOG_TYPE.COMMERCIAL;

  catalog.push(
    generatedEntry(
      { name: 'Fiat', slug: 'fiat', country: 'Italy', type: A, isActive: true },
      { name: 'Egea', slug: 'egea', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Cross', 'cross', 2022, 2026, {
          bodyType: 'Crossover Sedan',
          engineVolume: 1469,
          enginePower: 130,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Cross gorunumu ve guncel ekran paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Fiat', slug: 'fiat', country: 'Italy', type: A, isActive: true },
      { name: 'Linea', slug: 'linea', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Pop', 'pop', 2012, 2016, {
          bodyType: 'Sedan',
          engineVolume: 1368,
          enginePower: 77,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Butce dostu sedan kullanim',
        }),
        generatedPackage('Easy', 'easy', 2014, 2018, {
          bodyType: 'Sedan',
          engineVolume: 1248,
          enginePower: 95,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Ekonomik dizel sedan kullanim',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Fiat', slug: 'fiat', country: 'Italy', type: A, isActive: true },
      { name: 'Fiorino', slug: 'fiorino', catalogType: C, bodyType: 'Panelvan', isActive: true },
      [
        generatedPackage('Pop', 'pop', 2014, 2020, {
          bodyType: 'Panelvan',
          engineVolume: 1248,
          enginePower: 95,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Kompakt panelvan esnaf kullanimi',
        }),
        generatedPackage('Premio', 'premio', 2018, 2024, {
          bodyType: 'Panelvan',
          engineVolume: 1368,
          enginePower: 77,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Sehir ici hafif ticari paket',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Renault', slug: 'renault', country: 'France', type: A, isActive: true },
      { name: 'Clio', slug: 'clio', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Icon', 'icon', 2020, 2025, {
          bodyType: 'Hatchback',
          engineVolume: 1461,
          enginePower: 115,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Ust paket dizel otomatik hatchback',
        }),
        generatedPackage('Evolution', 'evolution', 2023, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 90,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Guncel makyajli Clio paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Renault', slug: 'renault', country: 'France', type: A, isActive: true },
      { name: 'Symbol', slug: 'symbol', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Joy', 'joy', 2013, 2018, {
          bodyType: 'Sedan',
          engineVolume: 1149,
          enginePower: 75,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Temel sehir sedan kullanim',
        }),
        generatedPackage('Touch', 'touch', 2016, 2021, {
          bodyType: 'Sedan',
          engineVolume: 1461,
          enginePower: 90,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Ekonomik dizel sedan paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Volkswagen', slug: 'volkswagen', country: 'Germany', type: A, isActive: true },
      { name: 'Golf', slug: 'golf', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Midline', 'midline', 2013, 2017, {
          bodyType: 'Hatchback',
          engineVolume: 1197,
          enginePower: 105,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Golf temel giris paketi',
        }),
        generatedPackage('Highline', 'highline', 2016, 2021, {
          bodyType: 'Hatchback',
          engineVolume: 1598,
          enginePower: 115,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Dizel otomatik Golf ust paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Volkswagen', slug: 'volkswagen', country: 'Germany', type: A, isActive: true },
      { name: 'Polo', slug: 'polo', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Trendline', 'trendline', 2015, 2018, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 75,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'B segment giris paketi',
        }),
        generatedPackage('Comfortline', 'comfortline', 2018, 2023, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 95,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Otomatik sehirici Polo paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Volkswagen', slug: 'volkswagen', country: 'Germany', type: A, isActive: true },
      { name: 'Passat', slug: 'passat', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Impression', 'impression', 2017, 2021, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Kurumsal sedan kullanim paketi',
        }),
        generatedPackage('Highline', 'highline', 2017, 2023, {
          bodyType: 'Sedan',
          engineVolume: 1968,
          enginePower: 150,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Premium Passat uzun yol paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Toyota', slug: 'toyota', country: 'Japan', type: A, isActive: true },
      { name: 'Yaris', slug: 'yaris', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Flame', 'flame', 2020, 2025, {
          bodyType: 'Hatchback',
          engineVolume: 1490,
          enginePower: 125,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.CVT,
          equipmentSummary: 'Kompakt otomatik Toyota kullanimi',
        }),
        generatedPackage('Hybrid Passion', 'hybrid-passion', 2021, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1490,
          enginePower: 116,
          fuelType: FuelType.HYBRID,
          transmissionType: TransmissionType.CVT,
          equipmentSummary: 'Hibrit sehir ici hatchback',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Toyota', slug: 'toyota', country: 'Japan', type: A, isActive: true },
      { name: 'C-HR', slug: 'c-hr', catalogType: A, bodyType: 'SUV', isActive: true },
      [
        generatedPackage('Flame', 'flame', 2018, 2023, {
          bodyType: 'SUV',
          engineVolume: 1197,
          enginePower: 116,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.CVT,
          equipmentSummary: 'Crossover gunluk kullanim paketi',
        }),
        generatedPackage('Hybrid Passion', 'hybrid-passion', 2020, 2026, {
          bodyType: 'SUV',
          engineVolume: 1798,
          enginePower: 122,
          fuelType: FuelType.HYBRID,
          transmissionType: TransmissionType.CVT,
          equipmentSummary: 'Hibrit crossover ust paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Hyundai', slug: 'hyundai', country: 'South Korea', type: A, isActive: true },
      { name: 'i20', slug: 'i20', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Jump', 'jump', 2021, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 1197,
          enginePower: 84,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Kompakt temel hatchback',
        }),
        generatedPackage('Style', 'style', 2021, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 998,
          enginePower: 100,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Teknolojili i20 otomatik paket',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Hyundai', slug: 'hyundai', country: 'South Korea', type: A, isActive: true },
      { name: 'i30', slug: 'i30', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Style', 'style', 2018, 2023, {
          bodyType: 'Hatchback',
          engineVolume: 1368,
          enginePower: 140,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'C segment aile hatchback kullanim',
        }),
        generatedPackage('Elite', 'elite', 2019, 2025, {
          bodyType: 'Hatchback',
          engineVolume: 1598,
          enginePower: 136,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Dizel otomatik i30 ust paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Hyundai', slug: 'hyundai', country: 'South Korea', type: A, isActive: true },
      { name: 'Tucson', slug: 'tucson', catalogType: A, bodyType: 'SUV', isActive: true },
      [
        generatedPackage('Comfort', 'comfort', 2021, 2024, {
          bodyType: 'SUV',
          engineVolume: 1598,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Aile SUV orta seviye paket',
        }),
        generatedPackage('Elite', 'elite', 2021, 2026, {
          bodyType: 'SUV',
          engineVolume: 1598,
          enginePower: 180,
          fuelType: FuelType.HYBRID,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'AWD',
          equipmentSummary: 'Hibrit Hyundai SUV ust paket',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Honda', slug: 'honda', country: 'Japan', type: A, isActive: true },
      { name: 'Civic', slug: 'civic', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Elegance', 'elegance', 2017, 2021, {
          bodyType: 'Sedan',
          engineVolume: 1597,
          enginePower: 125,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Dizel Civic gunluk kullanim',
        }),
        generatedPackage('Executive+', 'executive-plus', 2021, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 182,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.CVT,
          equipmentSummary: 'Turbo benzinli ust Civic paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Honda', slug: 'honda', country: 'Japan', type: A, isActive: true },
      { name: 'City', slug: 'city', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Elegance', 'elegance', 2021, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 121,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.CVT,
          equipmentSummary: 'Sehirici kompakt sedan',
        }),
        generatedPackage('Executive', 'executive', 2021, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 121,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.CVT,
          equipmentSummary: 'Honda guvenlik donanimli sedan',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Honda', slug: 'honda', country: 'Japan', type: A, isActive: true },
      { name: 'CR-V', slug: 'cr-v', catalogType: A, bodyType: 'SUV', isActive: true },
      [
        generatedPackage('Lifestyle', 'lifestyle', 2019, 2023, {
          bodyType: 'SUV',
          engineVolume: 1597,
          enginePower: 160,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'AWD',
          equipmentSummary: 'AWD Honda SUV kullanimi',
        }),
        generatedPackage('Executive', 'executive', 2019, 2026, {
          bodyType: 'SUV',
          engineVolume: 1993,
          enginePower: 184,
          fuelType: FuelType.HYBRID,
          transmissionType: TransmissionType.CVT,
          tractionType: 'AWD',
          equipmentSummary: 'Hibrit premium SUV paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Ford', slug: 'ford', country: 'United States', type: A, isActive: true },
      { name: 'Focus', slug: 'focus', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Trend X', 'trend-x', 2016, 2021, {
          bodyType: 'Hatchback',
          engineVolume: 1499,
          enginePower: 120,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Focus gunluk kullanim paketi',
        }),
        generatedPackage('Titanium', 'titanium', 2018, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 1498,
          enginePower: 182,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Zengin donanimli Focus paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Ford', slug: 'ford', country: 'United States', type: A, isActive: true },
      { name: 'Fiesta', slug: 'fiesta', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Trend', 'trend', 2015, 2020, {
          bodyType: 'Hatchback',
          engineVolume: 1084,
          enginePower: 85,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Ekonomik B segment kullanim',
        }),
        generatedPackage('Titanium', 'titanium', 2018, 2023, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 125,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Fiesta ust paket sehirici kullanim',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Ford', slug: 'ford', country: 'United States', type: A, isActive: true },
      { name: 'Courier', slug: 'courier', catalogType: C, bodyType: 'Panelvan', isActive: true },
      [
        generatedPackage('Deluxe', 'deluxe', 2018, 2023, {
          bodyType: 'Panelvan',
          engineVolume: 1499,
          enginePower: 100,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Esnaf odakli panelvan paketi',
        }),
        generatedPackage('Titanium', 'titanium', 2020, 2026, {
          bodyType: 'Panelvan',
          engineVolume: 998,
          enginePower: 125,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Teknolojili Courier premium paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Opel', slug: 'opel', country: 'Germany', type: A, isActive: true },
      { name: 'Astra', slug: 'astra', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Edition', 'edition', 2017, 2021, {
          bodyType: 'Hatchback',
          engineVolume: 1399,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Astra aile hatchback paketi',
        }),
        generatedPackage('Elegance', 'elegance', 2021, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 130,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Yeni nesil Astra teknolojisi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Opel', slug: 'opel', country: 'Germany', type: A, isActive: true },
      { name: 'Corsa', slug: 'corsa', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Edition', 'edition', 2020, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 100,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Corsa sehirici kullanim paketi',
        }),
        generatedPackage('Ultimate', 'ultimate', 2021, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 130,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Ust paket kompakt hatchback',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Opel', slug: 'opel', country: 'Germany', type: A, isActive: true },
      { name: 'Insignia', slug: 'insignia', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Business', 'business', 2018, 2022, {
          bodyType: 'Sedan',
          engineVolume: 1490,
          enginePower: 165,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Business sedan uzun yol paketi',
        }),
        generatedPackage('Excellence', 'excellence', 2018, 2023, {
          bodyType: 'Sedan',
          engineVolume: 1598,
          enginePower: 136,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Dizel business sedan donanimi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Peugeot', slug: 'peugeot', country: 'France', type: A, isActive: true },
      { name: '208', slug: '208', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Active', 'active', 2020, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 100,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Peugeot 208 temel kullanimi',
        }),
        generatedPackage('Allure', 'allure', 2020, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 130,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: '208 i-Cockpit zengin donanim',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Peugeot', slug: 'peugeot', country: 'France', type: A, isActive: true },
      { name: '308', slug: '308', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Style', 'style', 2018, 2022, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 130,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Peugeot 308 denge paketi',
        }),
        generatedPackage('GT', 'gt', 2022, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1598,
          enginePower: 180,
          fuelType: FuelType.HYBRID,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: '308 performans ve hibrit paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Peugeot', slug: 'peugeot', country: 'France', type: A, isActive: true },
      { name: '3008', slug: '3008', catalogType: A, bodyType: 'SUV', isActive: true },
      [
        generatedPackage('Active Prime', 'active-prime', 2018, 2022, {
          bodyType: 'SUV',
          engineVolume: 1499,
          enginePower: 130,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Peugeot SUV aile kullanimi',
        }),
        generatedPackage('GT Line', 'gt-line', 2019, 2026, {
          bodyType: 'SUV',
          engineVolume: 1598,
          enginePower: 180,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Sportif 3008 ust paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Citroen', slug: 'citroen', country: 'France', type: A, isActive: true },
      { name: 'C3', slug: 'c3', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Feel', 'feel', 2019, 2023, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 83,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Konfor odakli C3 paketi',
        }),
        generatedPackage('Shine', 'shine', 2020, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1199,
          enginePower: 110,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Ust donanimli C3 otomatik',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Citroen', slug: 'citroen', country: 'France', type: A, isActive: true },
      { name: 'C4', slug: 'c4', catalogType: A, bodyType: 'Crossover', isActive: true },
      [
        generatedPackage('Feel Bold', 'feel-bold', 2021, 2024, {
          bodyType: 'Crossover',
          engineVolume: 1199,
          enginePower: 130,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'C4 crossover gunluk paketi',
        }),
        generatedPackage('Shine Bold', 'shine-bold', 2021, 2026, {
          bodyType: 'Crossover',
          engineVolume: 1499,
          enginePower: 130,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Dizel C4 crossover ust paket',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Citroen', slug: 'citroen', country: 'France', type: A, isActive: true },
      { name: 'Berlingo', slug: 'berlingo', catalogType: C, bodyType: 'Panelvan', isActive: true },
      [
        generatedPackage('Feel', 'feel', 2019, 2024, {
          bodyType: 'Panelvan',
          engineVolume: 1499,
          enginePower: 100,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Berlingo hafif ticari paketi',
        }),
        generatedPackage('Shine', 'shine', 2020, 2026, {
          bodyType: 'Panelvan',
          engineVolume: 1499,
          enginePower: 130,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Konforlu Berlingo ticari kullanim',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Mercedes-Benz', slug: 'mercedes-benz', country: 'Germany', type: A, isActive: true },
      { name: 'A Serisi', slug: 'a-serisi', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('A 180 Progressive', 'a-180-progressive', 2019, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 1332,
          enginePower: 136,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Premium kompakt Mercedes giris paketi',
        }),
        generatedPackage('A 200 AMG', 'a-200-amg', 2020, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1332,
          enginePower: 163,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'AMG detayli premium hatchback',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Mercedes-Benz', slug: 'mercedes-benz', country: 'Germany', type: A, isActive: true },
      { name: 'C Serisi', slug: 'c-serisi', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('C 200 AMG', 'c-200-amg', 2019, 2024, {
          bodyType: 'Sedan',
          engineVolume: 1496,
          enginePower: 204,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'RWD',
          equipmentSummary: 'Premium orta sinif sedan',
        }),
        generatedPackage('C 220 d 4MATIC', 'c-220-d-4matic', 2020, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1992,
          enginePower: 200,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'AWD',
          equipmentSummary: '4 ceker dizel premium sedan',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Mercedes-Benz', slug: 'mercedes-benz', country: 'Germany', type: A, isActive: true },
      { name: 'E Serisi', slug: 'e-serisi', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('E 200 Exclusive', 'e-200-exclusive', 2018, 2023, {
          bodyType: 'Sedan',
          engineVolume: 1991,
          enginePower: 197,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'RWD',
          equipmentSummary: 'Executive Mercedes sedan',
        }),
        generatedPackage('E 220 d AMG', 'e-220-d-amg', 2019, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1992,
          enginePower: 194,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'RWD',
          equipmentSummary: 'Dizel uzun yol premium paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'BMW', slug: 'bmw', country: 'Germany', type: A, isActive: true },
      { name: '1 Serisi', slug: '1-serisi', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('116i Sport Line', '116i-sport-line', 2018, 2023, {
          bodyType: 'Hatchback',
          engineVolume: 1499,
          enginePower: 136,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Premium hatchback giris paketi',
        }),
        generatedPackage('120d M Sport', '120d-m-sport', 2019, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1995,
          enginePower: 190,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'M Sport dizel hatchback',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Audi', slug: 'audi', country: 'Germany', type: A, isActive: true },
      { name: 'A3', slug: 'a3', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Advanced', 'advanced', 2021, 2024, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Premium kompakt sedan',
        }),
        generatedPackage('S line', 's-line', 2021, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'S line gorsel ve konfor paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Audi', slug: 'audi', country: 'Germany', type: A, isActive: true },
      { name: 'A6', slug: 'a6', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Design', 'design', 2019, 2023, {
          bodyType: 'Sedan',
          engineVolume: 1984,
          enginePower: 245,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Executive Audi sedan paketi',
        }),
        generatedPackage('S line Quattro', 's-line-quattro', 2020, 2026, {
          bodyType: 'Sedan',
          engineVolume: 2967,
          enginePower: 286,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'AWD',
          equipmentSummary: 'Quattro premium sedan donanimi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Skoda', slug: 'skoda', country: 'Czech Republic', type: A, isActive: true },
      { name: 'Octavia', slug: 'octavia', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Elite', 'elite', 2020, 2024, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Skoda Octavia aile paketi',
        }),
        generatedPackage('Prestige', 'prestige', 2021, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1968,
          enginePower: 150,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Premium dizel aile sedan',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Skoda', slug: 'skoda', country: 'Czech Republic', type: A, isActive: true },
      { name: 'Superb', slug: 'superb', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Premium', 'premium', 2019, 2024, {
          bodyType: 'Sedan',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Genis business sedan paketi',
        }),
        generatedPackage('L&K', 'l-k', 2020, 2026, {
          bodyType: 'Sedan',
          engineVolume: 1968,
          enginePower: 200,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'AWD',
          equipmentSummary: 'Amiral gemisi Skoda donanimi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Skoda', slug: 'skoda', country: 'Czech Republic', type: A, isActive: true },
      { name: 'Fabia', slug: 'fabia', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Elite', 'elite', 2022, 2025, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 95,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Kompakt Fabia gunluk kullanim',
        }),
        generatedPackage('Premium', 'premium', 2022, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 110,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Dijital ekranli Fabia paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Seat', slug: 'seat', country: 'Spain', type: A, isActive: true },
      { name: 'Leon', slug: 'leon', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Style', 'style', 2021, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Leon gunluk hatchback paketi',
        }),
        generatedPackage('FR', 'fr', 2021, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'FR sportif hatchback donanimi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Seat', slug: 'seat', country: 'Spain', type: A, isActive: true },
      { name: 'Ibiza', slug: 'ibiza', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Style', 'style', 2019, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 95,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Ibiza kompakt sehir paketi',
        }),
        generatedPackage('FR', 'fr', 2020, 2026, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 110,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Sportif Ibiza otomatik paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Seat', slug: 'seat', country: 'Spain', type: A, isActive: true },
      { name: 'Ateca', slug: 'ateca', catalogType: A, bodyType: 'SUV', isActive: true },
      [
        generatedPackage('Style', 'style', 2019, 2024, {
          bodyType: 'SUV',
          engineVolume: 1498,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.AUTOMATIC,
          equipmentSummary: 'Ateca SUV aile paketi',
        }),
        generatedPackage('FR', 'fr', 2020, 2026, {
          bodyType: 'SUV',
          engineVolume: 1968,
          enginePower: 190,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'AWD',
          equipmentSummary: 'Sportif SUV FR donanimi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Dacia', slug: 'dacia', country: 'Romania', type: A, isActive: true },
      { name: 'Sandero', slug: 'sandero', catalogType: A, bodyType: 'Hatchback', isActive: true },
      [
        generatedPackage('Essential', 'essential', 2021, 2024, {
          bodyType: 'Hatchback',
          engineVolume: 999,
          enginePower: 90,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Ulasilabilir hatchback paketi',
        }),
        generatedPackage('Stepway Journey', 'stepway-journey', 2022, 2026, {
          bodyType: 'Crossover',
          engineVolume: 999,
          enginePower: 90,
          fuelType: FuelType.LPG,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Stepway gorunumlu LPG kullanim',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Dacia', slug: 'dacia', country: 'Romania', type: A, isActive: true },
      { name: 'Duster', slug: 'duster', catalogType: A, bodyType: 'SUV', isActive: true },
      [
        generatedPackage('Comfort', 'comfort', 2019, 2023, {
          bodyType: 'SUV',
          engineVolume: 1333,
          enginePower: 150,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Duster SUV temel konfor paketi',
        }),
        generatedPackage('Prestige', 'prestige', 2020, 2026, {
          bodyType: 'SUV',
          engineVolume: 1461,
          enginePower: 115,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.AUTOMATIC,
          tractionType: 'AWD',
          equipmentSummary: 'Dizel 4x4 SUV paketi',
        }),
      ],
    ),
    generatedEntry(
      { name: 'Dacia', slug: 'dacia', country: 'Romania', type: A, isActive: true },
      { name: 'Logan', slug: 'logan', catalogType: A, bodyType: 'Sedan', isActive: true },
      [
        generatedPackage('Ambiance', 'ambiance', 2015, 2019, {
          bodyType: 'Sedan',
          engineVolume: 898,
          enginePower: 90,
          fuelType: FuelType.GASOLINE,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Butce dostu sedan kullanim',
        }),
        generatedPackage('Laureate', 'laureate', 2016, 2021, {
          bodyType: 'Sedan',
          engineVolume: 1461,
          enginePower: 90,
          fuelType: FuelType.DIESEL,
          transmissionType: TransmissionType.MANUAL,
          equipmentSummary: 'Ekonomik dizel Logan paketi',
        }),
      ],
    ),
  );

  await normalizeLegacyVehicleCatalog();
  await upsertVehicleCatalogEntries(catalog);
  await seedVehicleCatalogPhase1Models();
  await seedVehicleCatalogPhase2Packages();
  await seedVehicleCatalogPhase3Specs();
  await seedVehicleCatalogPhase4Equipment();
}

async function normalizeLegacyVehicleCatalog() {
  const legacyMercedes = await prisma.vehicleBrand.findUnique({
    where: { slug: 'mercedes' },
  });
  const currentMercedes = await prisma.vehicleBrand.findUnique({
    where: { slug: 'mercedes-benz' },
  });

  if (legacyMercedes && !currentMercedes) {
    await prisma.vehicleBrand.update({
      where: { id: legacyMercedes.id },
      data: {
        name: 'Mercedes-Benz',
        slug: 'mercedes-benz',
        type: VEHICLE_CATALOG_TYPE.AUTOMOBILE,
        country: 'Germany',
        isActive: true,
      },
    });
  }

  if (legacyMercedes && currentMercedes) {
    await prisma.vehicleModel.updateMany({
      where: {
        brandId: legacyMercedes.id,
      },
      data: {
        isActive: false,
      },
    });

    await prisma.vehicleBrand.update({
      where: { id: legacyMercedes.id },
      data: {
        isActive: false,
      },
    });
  }

  const deprecatedBrands = await prisma.vehicleBrand.findMany({
    where: {
      OR: [{ slug: 'fiatloi1447' }, { slug: { startsWith: 'fiat-loi-' } }],
    },
    include: {
      _count: {
        select: {
          garageVehicles: true,
          vehicles: true,
        },
      },
    },
  });

  for (const deprecatedBrand of deprecatedBrands) {
    if (deprecatedBrand._count.garageVehicles === 0 && deprecatedBrand._count.vehicles === 0) {
      await prisma.vehicleModel.updateMany({
        where: {
          brandId: deprecatedBrand.id,
        },
        data: {
          isActive: false,
        },
      });

      await prisma.vehicleBrand.update({
        where: { id: deprecatedBrand.id },
        data: {
          isActive: false,
        },
      });
    }
  }
}

async function upsertVehicleCatalogEntries(entries) {
  for (const entry of entries) {
    const brand = await prisma.vehicleBrand.upsert({
      where: { slug: entry.brand.slug },
      update: {
        name: entry.brand.name,
        type: entry.brand.type ?? VEHICLE_CATALOG_TYPE.AUTOMOBILE,
        country: entry.brand.country ?? null,
        logoUrl: entry.brand.logoUrl ?? null,
        isActive: entry.brand.isActive ?? true,
      },
      create: {
        ...entry.brand,
        type: entry.brand.type ?? VEHICLE_CATALOG_TYPE.AUTOMOBILE,
        country: entry.brand.country ?? null,
        logoUrl: entry.brand.logoUrl ?? null,
        isActive: entry.brand.isActive ?? true,
      },
    });

    const model = await prisma.vehicleModel.upsert({
      where: {
        brandId_slug: {
          brandId: brand.id,
          slug: entry.model.slug,
        },
      },
      update: {
        name: entry.model.name,
        catalogType: entry.model.catalogType,
        yearStart: entry.model.yearStart ?? null,
        yearEnd: entry.model.yearEnd ?? null,
        bodyType: entry.model.bodyType ?? null,
        source: entry.model.source ?? 'CARLOI_SEED',
        manualReviewNeeded: entry.model.manualReviewNeeded ?? false,
        isActive: entry.model.isActive ?? true,
      },
      create: {
        brandId: brand.id,
        catalogType: entry.model.catalogType,
        name: entry.model.name,
        slug: entry.model.slug,
        yearStart: entry.model.yearStart ?? null,
        yearEnd: entry.model.yearEnd ?? null,
        bodyType: entry.model.bodyType ?? null,
        source: entry.model.source ?? 'CARLOI_SEED',
        manualReviewNeeded: entry.model.manualReviewNeeded ?? false,
        isActive: entry.model.isActive ?? true,
      },
    });

    for (const packageEntry of entry.packages ?? []) {
      const vehiclePackage = await prisma.vehiclePackage.upsert({
        where: {
          modelId_slug: {
            modelId: model.id,
            slug: packageEntry.slug,
          },
        },
        update: {
          name: packageEntry.name,
          yearStart: packageEntry.yearStart ?? null,
          yearEnd: packageEntry.yearEnd ?? null,
          marketRegion: packageEntry.marketRegion ?? 'TR',
          source: packageEntry.source ?? 'CARLOI_SEED',
          manualReviewNeeded: packageEntry.manualReviewNeeded ?? false,
          isActive: packageEntry.isActive ?? true,
        },
        create: {
          modelId: model.id,
          name: packageEntry.name,
          slug: packageEntry.slug,
          yearStart: packageEntry.yearStart ?? null,
          yearEnd: packageEntry.yearEnd ?? null,
          marketRegion: packageEntry.marketRegion ?? 'TR',
          source: packageEntry.source ?? 'CARLOI_SEED',
          manualReviewNeeded: packageEntry.manualReviewNeeded ?? false,
          isActive: packageEntry.isActive ?? true,
        },
      });

    }
  }
}

async function seedVehicleCatalogPhase1Models() {
  const phase1Entries = PHASE1_VEHICLE_MODEL_BRANDS.flatMap((entry) =>
    entry.models.map((vehicleModel) => ({
      brand: entry.brand,
      model: vehicleModel,
      packages: [],
    })),
  );

  await upsertVehicleCatalogEntries(phase1Entries);
}

async function seedVehicleCatalogPhase2Packages() {
  const models = await prisma.vehicleModel.findMany({
    where: {
      isActive: true,
      brand: {
        isActive: true,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      yearStart: true,
      yearEnd: true,
      bodyType: true,
      manualReviewNeeded: true,
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          country: true,
          logoUrl: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
  });

  const entries = models.map((vehicleModel) => ({
    brand: vehicleModel.brand,
    model: {
      id: vehicleModel.id,
      name: vehicleModel.name,
      slug: vehicleModel.slug,
      yearStart: vehicleModel.yearStart ?? null,
      yearEnd: vehicleModel.yearEnd ?? null,
      bodyType: vehicleModel.bodyType ?? null,
      manualReviewNeeded: vehicleModel.manualReviewNeeded ?? false,
      isActive: true,
    },
    packages: buildPackageRowsForModel(vehicleModel.brand.name, vehicleModel),
  }));

  await upsertVehicleCatalogEntries(entries);
}

async function seedVehicleCatalogPhase3Specs() {
  const packages = await prisma.vehiclePackage.findMany({
    where: {
      isActive: true,
      model: {
        isActive: true,
        brand: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      yearStart: true,
      yearEnd: true,
      manualReviewNeeded: true,
      model: {
        select: {
          id: true,
          name: true,
          slug: true,
          yearStart: true,
          yearEnd: true,
          bodyType: true,
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: [{ model: { brand: { name: 'asc' } } }, { model: { name: 'asc' } }, { name: 'asc' }],
  });

  await prisma.vehicleSpec.deleteMany({
    where: {
      packageId: {
        not: null,
      },
      vehicleId: null,
    },
  });

  for (const vehiclePackage of packages) {
    const rows = buildSpecRowsForPackage(vehiclePackage);

    for (const row of rows) {
      await prisma.vehicleSpec.upsert({
        where: {
          packageId_year_engineName_fuelType_transmissionType: {
            packageId: row.packageId,
            year: row.year,
            engineName: row.engineName,
            fuelType: row.fuelType,
            transmissionType: row.transmissionType,
          },
        },
        update: {
          bodyType: row.bodyType,
          engineName: row.engineName,
          engineVolume: row.engineVolume,
          enginePower: row.enginePower,
          engineVolumeCc: row.engineVolumeCc,
          enginePowerHp: row.enginePowerHp,
          torqueNm: row.torqueNm,
          tractionType: row.tractionType,
          fuelType: row.fuelType,
          transmissionType: row.transmissionType,
          source: row.source,
          manualReviewNeeded: row.manualReviewNeeded,
          isActive: row.isActive,
        },
        create: row,
      });
    }
  }
}

async function seedVehicleCatalogPhase4Equipment() {
  const packages = await prisma.vehiclePackage.findMany({
    where: {
      isActive: true,
      model: {
        isActive: true,
        brand: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      model: {
        select: {
          id: true,
          name: true,
          slug: true,
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: [{ model: { brand: { name: 'asc' } } }, { model: { name: 'asc' } }, { name: 'asc' }],
  });

  await prisma.vehiclePackageEquipment.deleteMany({});

  for (const vehiclePackage of packages) {
    const rows = buildEquipmentRowsForPackage(vehiclePackage);

    for (const row of rows) {
      await prisma.vehiclePackageEquipment.upsert({
        where: {
          packageId_category_name: {
            packageId: row.packageId,
            category: row.category,
            name: row.name,
          },
        },
        update: {
          isStandard: row.isStandard,
          source: row.source,
          manualReviewNeeded: row.manualReviewNeeded,
          isActive: row.isActive,
        },
        create: row,
      });
    }
  }
}

async function seedVehicleKnowledge() {
  const entries = [
    {
      brandSlug: 'fiat',
      modelSlug: 'egea',
      brandName: 'Fiat',
      modelName: 'Egea',
      chronicIssues: [
        'On takim burclarinda zamanla ses yapma gorulebilir.',
        'Dizel versiyonlarda enjektor ve DPF bakim gecmisi kontrol edilmelidir.',
        'Ic trimlerde sert plastik kaynakli ufak tikirti sikayetleri duyulabilir.',
      ],
      marketNotes:
        'Turkiye ikinci el pazarinda hizli donen ve filo cikisli ornegi bol bulunan modellerden biridir.',
      partsAvailability:
        'Parca ve ozel servis erisimi yaygindir, maliyetler segment ortalamasinda kalir.',
      buyerAdvice:
        'Ekspertiz, duzenli bakim kaydi ve gercek kilometre teyidiyle alin. Filo gecmisi varsa kaporta ve mekanik kontrolu detaylandirin.',
      sellerAdvice:
        'Bakim faturalarini, ekspertiz raporunu ve boya-degisen bilgisini net paylasmak satis hizini belirgin artirir.',
    },
    {
      brandSlug: 'renault',
      modelSlug: 'clio',
      brandName: 'Renault',
      modelName: 'Clio',
      chronicIssues: [
        'EDC veya otomatik sanzimanli orneklerde gecis davranisi test surusunde dikkatle izlenmelidir.',
        'Turbo beslemeli motorlarda soguk calisma ve rolanti dengesi kontrol edilmelidir.',
        'Elektronik multimedya ve geri gorus kamerasinda aralikli baglanti sorunlari gorulebilir.',
      ],
      marketNotes:
        'Sehir ici kullanim ve yakit dengesi nedeniyle genis alici kitlesine hitap eder, temiz paketler hizli hareket eder.',
      partsAvailability:
        'Yetkili servis ve ozel servis agi gucludur, sarf ve mekanik parcalar kolay bulunur.',
      buyerAdvice:
        'Paket farklarini iyi okuyun; ekran, guvenlik ve otomatik sanziman farklari ikinci elde fiyat araligini ciddi etkiler.',
      sellerAdvice:
        'Dusuk tuketim, paket avantajlari ve son bakim kalemleri acik yazildiginda ilan kalitesi yukselir.',
    },
    {
      brandSlug: 'volkswagen',
      modelSlug: 'golf',
      brandName: 'Volkswagen',
      modelName: 'Golf',
      chronicIssues: [
        'DSG gecislerinde sarsinti veya mekatronik gecmisi mutlaka sorgulanmalidir.',
        'Yuksek kilometrede on takim ve amortisor maliyetleri artabilir.',
        'Bazi motor seceneklerinde karbon birikimi ve bobin sorunlari takip edilmelidir.',
      ],
      marketNotes:
        'Tutulan bir modeldir; temiz, ekspertizli ve paket seviyesi yuksek ilanlar premium fiyat korur.',
      partsAvailability:
        'Orijinal parca maliyeti rakiplerinden yuksek olabilir ancak tedarik sorunu genelde yasamaz.',
      buyerAdvice:
        'Sanziman gecmisi, tramer kaydi ve paket dogrulamasini netlestirmeden karar vermeyin. Yalnizca fiyat dusuk diye ekspertizsiz ornekleri tercih etmeyin.',
      sellerAdvice:
        'Paket, bakim ve varsa DSG islem gecmisini seffaf anlatmak pazarlik baskisini azaltir.',
    },
  ];

  for (const entry of entries) {
    const vehicleModel = await prisma.vehicleModel.findFirst({
      where: {
        slug: entry.modelSlug,
        brand: {
          slug: entry.brandSlug,
        },
      },
      select: {
        id: true,
      },
    });

    await prisma.vehicleKnowledge.upsert({
      where: {
        brandName_modelName: {
          brandName: entry.brandName,
          modelName: entry.modelName,
        },
      },
      update: {
        vehicleModelId: vehicleModel?.id ?? null,
        chronicIssues: entry.chronicIssues,
        marketNotes: entry.marketNotes,
        partsAvailability: entry.partsAvailability,
        buyerAdvice: entry.buyerAdvice,
        sellerAdvice: entry.sellerAdvice,
      },
      create: {
        vehicleModelId: vehicleModel?.id ?? null,
        brandName: entry.brandName,
        modelName: entry.modelName,
        chronicIssues: entry.chronicIssues,
        marketNotes: entry.marketNotes,
        partsAvailability: entry.partsAvailability,
        buyerAdvice: entry.buyerAdvice,
        sellerAdvice: entry.sellerAdvice,
      },
    });
  }
}

async function upsertUser({
  username,
  email,
  phone,
  firstName,
  lastName,
  passwordHash,
  userType,
  tcIdentityNo,
  isCommercialApproved,
  isVerified = true,
}) {
  return prisma.user.upsert({
    where: { username },
    update: {
      email,
      phone,
      firstName,
      lastName,
      passwordHash,
      userType,
      tcIdentityNo,
      isVerified,
      isCommercialApproved,
      isActive: true,
      disabledAt: null,
      deletedAt: null,
    },
    create: {
      username,
      email,
      phone,
      firstName,
      lastName,
      passwordHash,
      userType,
      tcIdentityNo,
      isVerified,
      isCommercialApproved,
      isActive: true,
    },
  });
}

async function upsertProfile({
  userId,
  avatarUrl,
  bio,
  websiteUrl,
  locationText,
  blueVerified,
  goldVerified,
}) {
  return prisma.profile.upsert({
    where: { userId },
    update: {
      avatarUrl,
      bio,
      websiteUrl,
      locationText,
      blueVerified,
      goldVerified,
      isPrivate: false,
      showGarageVehicles: true,
    },
    create: {
      userId,
      avatarUrl,
      bio,
      websiteUrl,
      locationText,
      blueVerified,
      goldVerified,
      isPrivate: false,
      showGarageVehicles: true,
    },
  });
}

function slugify(value) {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

const vehicleCatalogRefCache = new Map();

async function resolveVehicleCatalogRefs(brandSlug, modelSlug, packageSlug) {
  const cacheKey = `${brandSlug}::${modelSlug}::${packageSlug}`;

  if (vehicleCatalogRefCache.has(cacheKey)) {
    return vehicleCatalogRefCache.get(cacheKey);
  }

  const brand = await prisma.vehicleBrand.findUnique({ where: { slug: brandSlug } });

  if (!brand) {
    throw new Error(`Missing vehicle brand for demo seed: ${brandSlug}`);
  }

  const model = await prisma.vehicleModel.findFirst({
    where: {
      slug: modelSlug,
      brandId: brand.id,
    },
  });

  if (!model) {
    throw new Error(`Missing vehicle model for demo seed: ${brandSlug}/${modelSlug}`);
  }

  let vehiclePackage = await prisma.vehiclePackage.findFirst({
    where: {
      slug: packageSlug,
      modelId: model.id,
    },
  });

  if (!vehiclePackage) {
    vehiclePackage = await prisma.vehiclePackage.findFirst({
      where: {
        slug: 'standart',
        modelId: model.id,
      },
    });
  }

  if (!vehiclePackage) {
    throw new Error(`Missing vehicle package for demo seed: ${brandSlug}/${modelSlug}/${packageSlug}`);
  }

  const refs = { brand, model, vehiclePackage };
  vehicleCatalogRefCache.set(cacheKey, refs);
  return refs;
}

async function replaceGarageVehicleMedia(garageVehicleId, mediaUrls) {
  await prisma.garageVehicleMedia.deleteMany({
    where: { garageVehicleId },
  });

  await prisma.garageVehicleMedia.createMany({
    data: mediaUrls.map((url, index) => ({
      garageVehicleId,
      mediaType: MediaType.IMAGE,
      url,
      sortOrder: index,
    })),
  });
}

async function replaceListingMedia(listingId, mediaUrls) {
  await prisma.listingMedia.deleteMany({
    where: { listingId },
  });

  await prisma.listingMedia.createMany({
    data: mediaUrls.map((url, index) => ({
      listingId,
      mediaType: MediaType.IMAGE,
      url,
      sortOrder: index,
    })),
  });
}

async function replacePostMedia(postId, mediaUrls) {
  await prisma.postMedia.deleteMany({
    where: { postId },
  });

  await prisma.postMedia.createMany({
    data: mediaUrls.map((url, index) => ({
      postId,
      mediaType: MediaType.IMAGE,
      url,
      sortOrder: index,
    })),
  });
}

async function replaceVehicleExtraEquipment(vehicleId, notes) {
  await prisma.userVehicleExtraEquipment.deleteMany({
    where: { vehicleId },
  });

  const chips = String(notes ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (chips.length === 0) {
    return;
  }

  await prisma.userVehicleExtraEquipment.createMany({
    data: chips.map((name, index) => ({
      vehicleId,
      category: index % 2 === 0 ? 'COMFORT' : 'MULTIMEDIA',
      name,
    })),
  });
}

async function replaceListingDamageParts(listingId, fixture) {
  await prisma.listingDamagePart.deleteMany({
    where: { listingId },
  });

  await prisma.listingDamagePart.createMany({
    data: [
      {
        listingId,
        partName: 'kaput',
        damageStatus: fixture.noPaint ? 'NONE' : 'PAINTED',
      },
      {
        listingId,
        partName: 'sag on camurluk',
        damageStatus: fixture.noChangedParts ? 'NONE' : 'REPLACED',
      },
      {
        listingId,
        partName: 'arka tampon',
        damageStatus: 'NONE',
      },
    ],
  });
}

async function seedExampleUsersAndContent(sharedPassword) {
  const examplePassword = readPassword('SEED_USER_PASSWORD', sharedPassword);

  if (!examplePassword) {
    throw new Error(
      'Missing seed password for example users. Set SEED_USER_PASSWORD or ADMIN_SEED_PASSWORD before running prisma seed.',
    );
  }

  const passwordHash = await bcrypt.hash(examplePassword, SALT_ROUNDS);
  const fiatBrand = await prisma.vehicleBrand.findUnique({ where: { slug: 'fiat' } });
  const egeaModel = await prisma.vehicleModel.findFirst({
    where: { slug: 'egea', brand: { slug: 'fiat' } },
  });
  const egeaUrban = await prisma.vehiclePackage.findFirst({
    where: { slug: 'urban', model: { slug: 'egea', brand: { slug: 'fiat' } } },
  });
  const vwBrand = await prisma.vehicleBrand.findUnique({ where: { slug: 'volkswagen' } });
  const golfModel = await prisma.vehicleModel.findFirst({
    where: { slug: 'golf', brand: { slug: 'volkswagen' } },
  });
  const golfHighline = await prisma.vehiclePackage.findFirst({
    where: { slug: 'highline', model: { slug: 'golf', brand: { slug: 'volkswagen' } } },
  });

  if (!fiatBrand || !egeaModel || !egeaUrban || !vwBrand || !golfModel || !golfHighline) {
    throw new Error('Vehicle catalog seed must run before example user seed.');
  }

  const demoIndividual = await upsertUser({
    username: 'demoindividual',
    email: 'demo.individual@carloi.local',
    phone: '+905551110001',
    firstName: 'Emre',
    lastName: 'Yilmaz',
    passwordHash,
    userType: UserType.INDIVIDUAL,
    tcIdentityNo: '10000000001',
    isCommercialApproved: false,
  });

  const demoCommercial = await upsertUser({
    username: 'democommercial',
    email: 'demo.commercial@carloi.local',
    phone: '+905551110002',
    firstName: 'Selin',
    lastName: 'Kaya',
    passwordHash,
    userType: UserType.COMMERCIAL,
    tcIdentityNo: '10000000002',
    isCommercialApproved: true,
  });

  const pendingDealer = await upsertUser({
    username: 'pendingdealer',
    email: 'pending.dealer@carloi.local',
    phone: '+905551110003',
    firstName: 'Kerem',
    lastName: 'Demir',
    passwordHash,
    userType: UserType.INDIVIDUAL,
    tcIdentityNo: '10000000003',
    isCommercialApproved: false,
  });

  await upsertProfile({
    userId: demoIndividual.id,
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Carloi demo hesabim. Temiz bakimli aile araci ariyorum.',
    websiteUrl: 'https://carloi.example/demoindividual',
    locationText: 'Istanbul, Kadikoy',
    blueVerified: true,
    goldVerified: false,
  });

  await upsertProfile({
    userId: demoCommercial.id,
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    bio: 'Yetkili ticari hesap. Expertizli secili araclar.',
    websiteUrl: 'https://carloi.example/democommercial',
    locationText: 'Istanbul, Umraniye',
    blueVerified: false,
    goldVerified: true,
  });

  await upsertProfile({
    userId: pendingDealer.id,
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    bio: 'Basvuru asamasinda ticari hesap ornegi.',
    websiteUrl: 'https://carloi.example/pendingdealer',
    locationText: 'Ankara, Cankaya',
    blueVerified: false,
    goldVerified: false,
  });

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: demoCommercial.id,
        followingId: demoIndividual.id,
      },
    },
    update: {},
    create: {
      followerId: demoCommercial.id,
      followingId: demoIndividual.id,
    },
  });

  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: demoIndividual.id,
        followingId: demoCommercial.id,
      },
    },
    update: {},
    create: {
      followerId: demoIndividual.id,
      followingId: demoCommercial.id,
    },
  });

  const individualVehicle = await prisma.garageVehicle.upsert({
    where: { plateNumber: '34ABC001' },
    update: {
      ownerId: demoIndividual.id,
      brandId: fiatBrand.id,
      modelId: egeaModel.id,
      vehiclePackageId: egeaUrban.id,
      vehicleType: VehicleType.SEDAN,
      brandText: 'Fiat',
      modelText: 'Egea',
      packageText: 'Urban',
      year: 2021,
      color: 'Beyaz',
      fuelType: FuelType.DIESEL,
      transmissionType: TransmissionType.AUTOMATIC,
      km: 84250,
      isPublic: true,
      deletedAt: null,
    },
    create: {
      ownerId: demoIndividual.id,
      brandId: fiatBrand.id,
      modelId: egeaModel.id,
      vehiclePackageId: egeaUrban.id,
      vehicleType: VehicleType.SEDAN,
      brandText: 'Fiat',
      modelText: 'Egea',
      packageText: 'Urban',
      year: 2021,
      plateNumber: '34ABC001',
      color: 'Beyaz',
      fuelType: FuelType.DIESEL,
      transmissionType: TransmissionType.AUTOMATIC,
      km: 84250,
      isPublic: true,
    },
  });

  const commercialVehicle = await prisma.garageVehicle.upsert({
    where: { plateNumber: '34ABC002' },
    update: {
      ownerId: demoCommercial.id,
      brandId: vwBrand.id,
      modelId: golfModel.id,
      vehiclePackageId: golfHighline.id,
      vehicleType: VehicleType.HATCHBACK,
      brandText: 'Volkswagen',
      modelText: 'Golf',
      packageText: 'Highline',
      year: 2022,
      color: 'Gri',
      fuelType: FuelType.GASOLINE,
      transmissionType: TransmissionType.AUTOMATIC,
      km: 35600,
      isPublic: true,
      deletedAt: null,
    },
    create: {
      ownerId: demoCommercial.id,
      brandId: vwBrand.id,
      modelId: golfModel.id,
      vehiclePackageId: golfHighline.id,
      vehicleType: VehicleType.HATCHBACK,
      brandText: 'Volkswagen',
      modelText: 'Golf',
      packageText: 'Highline',
      year: 2022,
      plateNumber: '34ABC002',
      color: 'Gri',
      fuelType: FuelType.GASOLINE,
      transmissionType: TransmissionType.AUTOMATIC,
      km: 35600,
      isPublic: true,
    },
  });

  await prisma.garageVehicleMedia.deleteMany({
    where: { garageVehicleId: individualVehicle.id },
  });
  await prisma.userVehicleExtraEquipment.deleteMany({
    where: { vehicleId: individualVehicle.id },
  });
  await prisma.userVehicleExtraEquipment.createMany({
    data: [
      {
        vehicleId: individualVehicle.id,
        category: 'COMFORT',
        name: 'Cam filmi',
      },
      {
        vehicleId: individualVehicle.id,
        category: 'MULTIMEDIA',
        name: 'Arka kamera',
      },
    ],
  });
  await prisma.garageVehicleMedia.createMany({
    data: [
      {
        garageVehicleId: individualVehicle.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
      {
        garageVehicleId: individualVehicle.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 1,
      },
    ],
  });

  await prisma.garageVehicleMedia.deleteMany({
    where: { garageVehicleId: commercialVehicle.id },
  });
  await prisma.userVehicleExtraEquipment.deleteMany({
    where: { vehicleId: commercialVehicle.id },
  });
  await prisma.userVehicleExtraEquipment.createMany({
    data: [
      {
        vehicleId: commercialVehicle.id,
        category: 'INTERIOR',
        name: 'Deri koltuk',
      },
      {
        vehicleId: commercialVehicle.id,
        category: 'MULTIMEDIA',
        name: 'Premium ses sistemi',
      },
    ],
  });
  await prisma.garageVehicleMedia.createMany({
    data: [
      {
        garageVehicleId: commercialVehicle.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
    ],
  });

  const listing = await prisma.listing.upsert({
    where: { listingNo: 'CLV4-2026-0001' },
    update: {
      sellerId: demoIndividual.id,
      garageVehicleId: individualVehicle.id,
      title: '2021 Fiat Egea Urban 1.6 Multijet Otomatik',
      description:
        'Bakimlari duzenli yapildi. Aile kullanimi, aktif ekspertizi yok ama kaporta durumu acik sekilde paylasildi. Tramer ve servis kayitlari gorusmede paylasilabilir.',
      price: '915000.00',
      currency: 'TRY',
      city: 'Istanbul',
      district: 'Kadikoy',
      listingStatus: ListingStatus.ACTIVE,
      sellerType: SellerType.OWNER,
      tradeAvailable: true,
      contactPhone: demoIndividual.phone,
      showPhone: true,
      plateNumber: '34ABC001',
      plateNumberHash: hashPlate('34ABC001'),
      licenseOwnerName: 'Emre Yilmaz',
      licenseOwnerTcNo: '10000000001',
      isLicenseVerified: true,
      hasExpertiseReport: false,
      ownerAuthorizationRequired: false,
      deletedAt: null,
    },
    create: {
      sellerId: demoIndividual.id,
      garageVehicleId: individualVehicle.id,
      title: '2021 Fiat Egea Urban 1.6 Multijet Otomatik',
      description:
        'Bakimlari duzenli yapildi. Aile kullanimi, aktif ekspertizi yok ama kaporta durumu acik sekilde paylasildi. Tramer ve servis kayitlari gorusmede paylasilabilir.',
      price: '915000.00',
      currency: 'TRY',
      city: 'Istanbul',
      district: 'Kadikoy',
      listingNo: 'CLV4-2026-0001',
      listingStatus: ListingStatus.ACTIVE,
      sellerType: SellerType.OWNER,
      tradeAvailable: true,
      contactPhone: demoIndividual.phone,
      showPhone: true,
      plateNumber: '34ABC001',
      plateNumberHash: hashPlate('34ABC001'),
      licenseOwnerName: 'Emre Yilmaz',
      licenseOwnerTcNo: '10000000001',
      isLicenseVerified: true,
      hasExpertiseReport: false,
      ownerAuthorizationRequired: false,
    },
  });

  await prisma.listingMedia.deleteMany({
    where: { listingId: listing.id },
  });
  await prisma.listingMedia.createMany({
    data: [
      {
        listingId: listing.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
      {
        listingId: listing.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 1,
      },
      {
        listingId: listing.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 2,
      },
    ],
  });

  await prisma.listingDamagePart.deleteMany({
    where: { listingId: listing.id },
  });
  await prisma.listingDamagePart.createMany({
    data: [
      { listingId: listing.id, partName: 'kaput', damageStatus: 'NONE' },
      { listingId: listing.id, partName: 'sag on camurluk', damageStatus: 'PAINTED' },
      { listingId: listing.id, partName: 'arka tampon', damageStatus: 'NONE' },
    ],
  });

  const commercialListing = await prisma.listing.upsert({
    where: { listingNo: 'CLV4-2026-0002' },
    update: {
      sellerId: demoCommercial.id,
      garageVehicleId: commercialVehicle.id,
      title: '2022 Volkswagen Golf Highline 1.5 eTSI',
      description:
        'Ticari demo hesapta ornek ilan. Paket seviyesi, donanim ve sehir ici kullanim odakli aciklama ile tutuldu.',
      price: '1495000.00',
      currency: 'TRY',
      city: 'Istanbul',
      district: 'Umraniye',
      listingStatus: ListingStatus.ACTIVE,
      sellerType: SellerType.DEALER,
      tradeAvailable: false,
      contactPhone: demoCommercial.phone,
      showPhone: true,
      plateNumber: '34ABC002',
      plateNumberHash: hashPlate('34ABC002'),
      licenseOwnerName: 'Selin Kaya',
      licenseOwnerTcNo: '10000000002',
      isLicenseVerified: true,
      hasExpertiseReport: false,
      ownerAuthorizationRequired: false,
      deletedAt: null,
    },
    create: {
      sellerId: demoCommercial.id,
      garageVehicleId: commercialVehicle.id,
      title: '2022 Volkswagen Golf Highline 1.5 eTSI',
      description:
        'Ticari demo hesapta ornek ilan. Paket seviyesi, donanim ve sehir ici kullanim odakli aciklama ile tutuldu.',
      price: '1495000.00',
      currency: 'TRY',
      city: 'Istanbul',
      district: 'Umraniye',
      listingNo: 'CLV4-2026-0002',
      listingStatus: ListingStatus.ACTIVE,
      sellerType: SellerType.DEALER,
      tradeAvailable: false,
      contactPhone: demoCommercial.phone,
      showPhone: true,
      plateNumber: '34ABC002',
      plateNumberHash: hashPlate('34ABC002'),
      licenseOwnerName: 'Selin Kaya',
      licenseOwnerTcNo: '10000000002',
      isLicenseVerified: true,
      hasExpertiseReport: false,
      ownerAuthorizationRequired: false,
    },
  });

  await prisma.listingMedia.deleteMany({
    where: { listingId: commercialListing.id },
  });
  await prisma.listingMedia.createMany({
    data: [
      {
        listingId: commercialListing.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
    ],
  });

  const existingPost = await prisma.post.findFirst({
    where: {
      ownerId: demoIndividual.id,
      caption: 'Hafta sonu detayli yikama sonrasi Egea ile uzun yol hazirligi tamam.',
    },
  });

  const post = existingPost
    ? await prisma.post.update({
        where: { id: existingPost.id },
        data: {
          locationText: 'Istanbul, Kadikoy',
          visibility: ContentVisibility.PUBLIC,
        },
      })
    : await prisma.post.create({
        data: {
          ownerId: demoIndividual.id,
          caption: 'Hafta sonu detayli yikama sonrasi Egea ile uzun yol hazirligi tamam.',
          locationText: 'Istanbul, Kadikoy',
          visibility: ContentVisibility.PUBLIC,
        },
      });

  await prisma.postMedia.deleteMany({
    where: { postId: post.id },
  });
  await prisma.postMedia.createMany({
    data: [
      {
        postId: post.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
    ],
  });

  const existingCommercialPost = await prisma.post.findFirst({
    where: {
      ownerId: demoCommercial.id,
      caption: 'Bu hafta vitrinde Golf Highline ve iki yeni hatchback ilan daha var.',
    },
  });

  const commercialPost = existingCommercialPost
    ? await prisma.post.update({
        where: { id: existingCommercialPost.id },
        data: {
          locationText: 'Istanbul, Umraniye',
          visibility: ContentVisibility.PUBLIC,
        },
      })
    : await prisma.post.create({
        data: {
          ownerId: demoCommercial.id,
          caption: 'Bu hafta vitrinde Golf Highline ve iki yeni hatchback ilan daha var.',
          locationText: 'Istanbul, Umraniye',
          visibility: ContentVisibility.PUBLIC,
        },
      });

  await prisma.postMedia.deleteMany({
    where: { postId: commercialPost.id },
  });
  await prisma.postMedia.createMany({
    data: [
      {
        postId: commercialPost.id,
        mediaType: MediaType.IMAGE,
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
    ],
  });

  const approvedApplication = await prisma.commercialApplication.findFirst({
    where: { userId: demoCommercial.id, status: CommercialApplicationStatus.APPROVED },
  });

  if (approvedApplication) {
    await prisma.commercialApplication.update({
      where: { id: approvedApplication.id },
      data: {
        companyName: 'Carloi Demo Otomotiv',
        taxNumber: '1234567890',
        taxDocumentUrl: 'https://files.carloi.local/commercial/demo-tax-document.pdf',
        contactEmail: demoCommercial.email,
        contactPhone: demoCommercial.phone,
        reviewedAt: new Date(),
      },
    });
  } else {
    await prisma.commercialApplication.create({
      data: {
        userId: demoCommercial.id,
        companyName: 'Carloi Demo Otomotiv',
        taxNumber: '1234567890',
        taxDocumentUrl: 'https://files.carloi.local/commercial/demo-tax-document.pdf',
        otherDocumentUrls: ['https://files.carloi.local/commercial/demo-signature-circular.pdf'],
        contactEmail: demoCommercial.email,
        contactPhone: demoCommercial.phone,
        status: CommercialApplicationStatus.APPROVED,
        reviewedAt: new Date(),
      },
    });
  }

  const pendingApplication = await prisma.commercialApplication.findFirst({
    where: { userId: pendingDealer.id, status: CommercialApplicationStatus.PENDING },
  });

  if (pendingApplication) {
    await prisma.commercialApplication.update({
      where: { id: pendingApplication.id },
      data: {
        companyName: 'Basvuru Bekleyen Galeri',
        taxNumber: '0987654321',
        taxDocumentUrl: 'https://files.carloi.local/commercial/pending-tax-document.pdf',
        otherDocumentUrls: ['https://files.carloi.local/commercial/pending-authorization.pdf'],
        contactEmail: pendingDealer.email,
        contactPhone: pendingDealer.phone,
      },
    });
  } else {
    await prisma.commercialApplication.create({
      data: {
        userId: pendingDealer.id,
        companyName: 'Basvuru Bekleyen Galeri',
        taxNumber: '0987654321',
        taxDocumentUrl: 'https://files.carloi.local/commercial/pending-tax-document.pdf',
        otherDocumentUrls: ['https://files.carloi.local/commercial/pending-authorization.pdf'],
        contactEmail: pendingDealer.email,
        contactPhone: pendingDealer.phone,
        status: CommercialApplicationStatus.PENDING,
      },
    });
  }

  console.log(
    'Seeded example users:',
    [demoIndividual.username, demoCommercial.username, pendingDealer.username].join(', '),
  );
  console.log('Seeded example listings:', 'CLV4-2026-0001, CLV4-2026-0002');
  console.log('Seeded example posts:', post.id, commercialPost.id);
}

async function main() {
  loadEnvFile();

  const developmentSeedPassword = getDevelopmentSeedPassword();
  const sharedPassword = readPassword('ADMIN_SEED_PASSWORD', developmentSeedPassword);

  if (
    sharedPassword === DEVELOPMENT_SEED_PASSWORD &&
    (!process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_SEED_PASSWORD === PLACEHOLDER_PASSWORD)
  ) {
    console.warn(
      'ADMIN_SEED_PASSWORD tanimli olmadigi icin development fallback sifresi kullaniliyor: DemoSeed123!',
    );
  }

  const adminUsers = [
    {
      username: 'superadmin',
      role: AdminRole.SUPER_ADMIN,
      password: readPassword('SEED_SUPERADMIN_PASSWORD', sharedPassword),
    },
    {
      username: 'insuranceadmin',
      role: AdminRole.INSURANCE_ADMIN,
      password: readPassword('SEED_INSURANCEADMIN_PASSWORD', sharedPassword),
    },
    {
      username: 'commercialadmin',
      role: AdminRole.COMMERCIAL_ADMIN,
      password: readPassword('SEED_COMMERCIALADMIN_PASSWORD', sharedPassword),
    },
  ];

  const missingPasswordUsers = adminUsers
    .filter((adminUser) => !adminUser.password)
    .map((adminUser) => adminUser.username);

  if (missingPasswordUsers.length > 0) {
    throw new Error(
      `Missing seed password for: ${missingPasswordUsers.join(', ')}. ` +
        'Set ADMIN_SEED_PASSWORD or the matching SEED_<USERNAME>_PASSWORD values before running prisma seed.',
    );
  }

  for (const adminUser of adminUsers) {
    await seedAdminUser({
      username: adminUser.username,
      role: adminUser.role,
      password: adminUser.password,
    });
  }

  await seedVehicleCatalog();
  await seedVehicleKnowledge();
  const demoDataEnabled = isEnabledFlag(process.env.ENABLE_DEMO_DATA, false);

  if (demoDataEnabled) {
    await seedExampleUsersAndContent(sharedPassword);
    await seedBackendDemoData(prisma);
  } else {
    console.log('Skipping example and backend demo data seed because ENABLE_DEMO_DATA is not true.');
  }

  console.log('Seeded admin users:', adminUsers.map((adminUser) => adminUser.username).join(', '));
  console.log('Seeded vehicle catalog:', 'Fiat/Egea, Renault/Clio, Volkswagen/Golf');
  console.log('Seeded vehicle knowledge:', 'Fiat Egea, Renault Clio, Volkswagen Golf');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


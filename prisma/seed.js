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

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const PLACEHOLDER_PASSWORD = 'replace-me';
const DEVELOPMENT_SEED_PASSWORD = 'DemoSeed123!';

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
      brand: { name: 'Fiat', slug: 'fiat' },
      model: { name: 'Egea', slug: 'egea' },
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
      brand: { name: 'Renault', slug: 'renault' },
      model: { name: 'Clio', slug: 'clio' },
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
      brand: { name: 'Volkswagen', slug: 'volkswagen' },
      model: { name: 'Golf', slug: 'golf' },
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
            exteriorSummary: 'Matrix LED farlar, 17 inc alasim jantlar, sunroof opsiyonu',
          },
        },
      ],
    },
  ];

  for (const entry of catalog) {
    const brand = await prisma.vehicleBrand.upsert({
      where: { slug: entry.brand.slug },
      update: { name: entry.brand.name },
      create: entry.brand,
    });

    const model = await prisma.vehicleModel.upsert({
      where: {
        brandId_slug: {
          brandId: brand.id,
          slug: entry.model.slug,
        },
      },
      update: { name: entry.model.name },
      create: {
        brandId: brand.id,
        name: entry.model.name,
        slug: entry.model.slug,
      },
    });

    for (const packageEntry of entry.packages) {
      const vehiclePackage = await prisma.vehiclePackage.upsert({
        where: {
          modelId_slug: {
            modelId: model.id,
            slug: packageEntry.slug,
          },
        },
        update: { name: packageEntry.name },
        create: {
          modelId: model.id,
          name: packageEntry.name,
          slug: packageEntry.slug,
        },
      });

      await prisma.vehicleSpec.upsert({
        where: {
          packageId: vehiclePackage.id,
        },
        update: packageEntry.spec,
        create: {
          packageId: vehiclePackage.id,
          ...packageEntry.spec,
        },
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
      isVerified: true,
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
      isVerified: true,
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
  await seedExampleUsersAndContent(sharedPassword);

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

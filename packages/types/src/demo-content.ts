import {
  AiCardType,
  AiMessageRole,
  AiProvider,
  FuelType,
  ListingStatus,
  MediaType,
  MessageThreadType,
  MessageType,
  SellerType,
  SharedContentType,
  SystemMessageCardType,
  TransmissionType,
  VehicleEquipmentCategory,
} from './enums';
import type { ExploreVehicleItem } from './explore';
import type { ListingDetailResponse } from './listings';
import type { LoiAiConversationDetail } from './loi-ai';
import type {
  MessageParticipantSummary,
  MessageThreadDetail,
  MessageThreadSummary,
  MessageView,
} from './messages';
import type {
  ProfileDetailResponse,
  ProfileListingItem,
  ProfilePostGridItem,
  ProfileVehicleItem,
} from './profiles';
import type { FeedPost, SocialComment, StoryFeedGroup, StoryViewerItem } from './social';

type DemoOwner = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  blueVerified: boolean;
  goldVerified: boolean;
};

type DemoVehicleSeed = {
  id: string;
  ownerId: string;
  brand: string;
  model: string;
  packageName: string;
  city: string;
  district: string;
  year: number;
  km: number;
  price: number;
  fuelType: FuelType;
  transmissionType: TransmissionType;
  engineVolume: number;
  enginePower: number;
  bodyType: string;
  tractionType: string;
  description: string;
  equipmentNotes: string;
  title: string;
  caption: string;
  imageUrl: string;
};

type DemoCurrentUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
};

type DemoProfileFixtures = {
  profile: ProfileDetailResponse;
  posts: ProfilePostGridItem[];
  listings: ProfileListingItem[];
  vehicles: ProfileVehicleItem[];
};

type DemoMessageFixtures = {
  friends: MessageParticipantSummary[];
  threads: MessageThreadSummary[];
  threadDetails: Record<string, MessageThreadDetail>;
};

const CAR_IMAGE_URLS = [
  'demo://car-01',
  'demo://car-02',
  'demo://car-03',
  'demo://car-04',
  'demo://car-05',
  'demo://car-06',
  'demo://car-07',
  'demo://car-08',
  'demo://car-09',
  'demo://car-10',
] as const;

const DEMO_OWNERS: DemoOwner[] = [
  { id: 'demo-owner-carloi', username: 'carloi', firstName: 'Carloi', lastName: 'Ekibi', blueVerified: true, goldVerified: false },
  { id: 'demo-owner-ahmet', username: 'ahmetvtec', firstName: 'Ahmet', lastName: 'Yildiz', blueVerified: false, goldVerified: false },
  { id: 'demo-owner-selin', username: 'selinrota', firstName: 'Selin', lastName: 'Kaya', blueVerified: false, goldVerified: true },
  { id: 'demo-owner-emre', username: 'emrepassat', firstName: 'Emre', lastName: 'Tas', blueVerified: true, goldVerified: false },
  { id: 'demo-owner-zeynep', username: 'zeynepgarage', firstName: 'Zeynep', lastName: 'Celik', blueVerified: false, goldVerified: false },
  { id: 'demo-owner-baris', username: 'barisdetail', firstName: 'Baris', lastName: 'Demir', blueVerified: false, goldVerified: false },
  { id: 'demo-owner-merve', username: 'mervegolf', firstName: 'Merve', lastName: 'Aydin', blueVerified: false, goldVerified: true },
  { id: 'demo-owner-okan', username: 'okanhybrid', firstName: 'Okan', lastName: 'Guler', blueVerified: true, goldVerified: false },
  { id: 'demo-owner-cagatay', username: 'cagatayrline', firstName: 'Cagatay', lastName: 'Sahin', blueVerified: false, goldVerified: false },
  { id: 'demo-owner-nazli', username: 'nazliarona', firstName: 'Nazli', lastName: 'Yalcin', blueVerified: false, goldVerified: false },
];

const DEMO_VEHICLE_SEEDS: DemoVehicleSeed[] = [
  {
    id: 'demo-vehicle-egea-urban',
    ownerId: 'demo-owner-ahmet',
    brand: 'Fiat',
    model: 'Egea',
    packageName: 'Urban',
    city: 'Istanbul',
    district: 'Kadikoy',
    year: 2022,
    km: 48200,
    price: 1015000,
    fuelType: FuelType.DIESEL,
    transmissionType: TransmissionType.MANUAL,
    engineVolume: 1598,
    enginePower: 130,
    bodyType: 'Sedan',
    tractionType: 'FWD',
    description: 'Gundelik kullanimda ekonomik, bakimli ve temiz tutulmus bir Egea. Sehir ici ve uzun yol dengesini iyi veriyor.',
    equipmentNotes: 'Geri gorus kamerasi, hiz sabitleyici, kablosuz CarPlay',
    title: 'Temiz kullanilmis Egea Urban',
    caption: 'Sabah rotasi acikken Urban paket Egea ile sehir ici sakin ama keyifli bir surus. Carloi feedine ilk uzun yol notumu birakiyorum.',
    imageUrl: CAR_IMAGE_URLS[0],
  },
  {
    id: 'demo-vehicle-clio-techno',
    ownerId: 'demo-owner-selin',
    brand: 'Renault',
    model: 'Clio',
    packageName: 'Techno',
    city: 'Ankara',
    district: 'Cankaya',
    year: 2024,
    km: 11900,
    price: 1125000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 999,
    enginePower: 100,
    bodyType: 'Hatchback',
    tractionType: 'FWD',
    description: 'Sehir ici kullanimda yumusak surus, dusuk tuketim ve yeni nesil kokpit hissi veren Clio Techno.',
    equipmentNotes: 'LED far, dijital klima, kablosuz sarj',
    title: 'Yeni nesil Clio Techno',
    caption: 'Ankara trafiginde minik ama premium hissettiren bir hatchback arayanlara Clio Techno hala cok mantikli geliyor.',
    imageUrl: CAR_IMAGE_URLS[1],
  },
  {
    id: 'demo-vehicle-golf-rline',
    ownerId: 'demo-owner-merve',
    brand: 'Volkswagen',
    model: 'Golf',
    packageName: 'R-Line',
    city: 'Izmir',
    district: 'Bostanli',
    year: 2023,
    km: 26400,
    price: 1675000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1498,
    enginePower: 150,
    bodyType: 'Hatchback',
    tractionType: 'FWD',
    description: 'R-Line paket Golf, gorsel olarak sportif kalirken gundelik konfordan odun vermiyor.',
    equipmentNotes: 'Matrix LED, ambiyans aydinlatma, geri gorus kamerasi',
    title: 'Golf R-Line sehir seti',
    caption: 'Bostanli sahilinde gun batimi, temiz bir Golf R-Line ve biraz da Alman hatchback sevgisi.',
    imageUrl: CAR_IMAGE_URLS[2],
  },
  {
    id: 'demo-vehicle-corolla-hybrid',
    ownerId: 'demo-owner-okan',
    brand: 'Toyota',
    model: 'Corolla',
    packageName: 'Hybrid Flame',
    city: 'Bursa',
    district: 'Nilufer',
    year: 2021,
    km: 55700,
    price: 1380000,
    fuelType: FuelType.HYBRID,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1798,
    enginePower: 140,
    bodyType: 'Sedan',
    tractionType: 'FWD',
    description: 'Uzun yolda sessiz, sehir icinde ekonomik bir sedan isteyenler icin Corolla Hybrid hala cok guclu bir denge kuruyor.',
    equipmentNotes: 'Adaptif hiz sabitleme, serit takip, geri gorus kamerasi',
    title: 'Corolla Hybrid Flame deneyimi',
    caption: 'Corolla Hybrid ile yakit tuketimi takibi yaparken bir yandan da konforu not almaya devam ediyorum.',
    imageUrl: CAR_IMAGE_URLS[3],
  },
  {
    id: 'demo-vehicle-i20-nline',
    ownerId: 'demo-owner-ahmet',
    brand: 'Hyundai',
    model: 'i20',
    packageName: 'N Line',
    city: 'Istanbul',
    district: 'Besiktas',
    year: 2023,
    km: 21350,
    price: 1095000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 998,
    enginePower: 100,
    bodyType: 'Hatchback',
    tractionType: 'FWD',
    description: 'Kucuk sinifta daha dinamik gorunmek isteyenler icin N Line detaylari i20yi farkli hissettiriyor.',
    equipmentNotes: 'Buyuk ekran, geri gorus kamerasi, N Line tasarim paketi',
    title: 'i20 N Line gunluk keyif',
    caption: 'Kucuk hacim, hafif govde ve sehir ici hizli manevra. i20 N Line tam sehir otomobili hissi veriyor.',
    imageUrl: CAR_IMAGE_URLS[4],
  },
  {
    id: 'demo-vehicle-civic-rs',
    ownerId: 'demo-owner-emre',
    brand: 'Honda',
    model: 'Civic',
    packageName: 'RS',
    city: 'Antalya',
    district: 'Lara',
    year: 2022,
    km: 33400,
    price: 1590000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1498,
    enginePower: 182,
    bodyType: 'Sedan',
    tractionType: 'FWD',
    description: 'Turbo motor ve genis kabin bir araya gelince Civic RS aile kullanimi ile keyifli surus arasinda iyi bir yerde duruyor.',
    equipmentNotes: 'Sunroof, Honda Sensing, siyah jant',
    title: 'Civic RS sahil rotasi',
    caption: 'Lara tarafinda aksam surusu. Civic RS gorsel olarak da surus karakteri olarak da halen cok diri.',
    imageUrl: CAR_IMAGE_URLS[5],
  },
  {
    id: 'demo-vehicle-focus-titanium',
    ownerId: 'demo-owner-zeynep',
    brand: 'Ford',
    model: 'Focus',
    packageName: 'Titanium',
    city: 'Eskisehir',
    district: 'Tepebasi',
    year: 2021,
    km: 67800,
    price: 1190000,
    fuelType: FuelType.DIESEL,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1499,
    enginePower: 120,
    bodyType: 'Hatchback',
    tractionType: 'FWD',
    description: 'Direksiyon hissi ve yol tutusu sebebiyle hala sevilen bir Focus. Titanium donanimi gunluk yasami rahatlatiyor.',
    equipmentNotes: 'Adaptif far, park sensorlugu, geri gorus kamerasi',
    title: 'Focus Titanium guncesi',
    caption: 'Focus kullanirken en cok sevdigim sey hala direksiyon hissi. Uzun yol yapanlar bunu hemen anliyor.',
    imageUrl: CAR_IMAGE_URLS[6],
  },
  {
    id: 'demo-vehicle-astra-gs',
    ownerId: 'demo-owner-ahmet',
    brand: 'Opel',
    model: 'Astra',
    packageName: 'GS',
    city: 'Istanbul',
    district: 'Bakirkoy',
    year: 2024,
    km: 9800,
    price: 1545000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1199,
    enginePower: 130,
    bodyType: 'Hatchback',
    tractionType: 'FWD',
    description: 'Yeni kasada daha premium his veren bir Astra. GS donanimi gorsel ve teknolojik olarak yukari tasiyor.',
    equipmentNotes: '360 kamera, adaptif cruise, dijital kokpit',
    title: 'Astra GS yeni kasa',
    caption: 'Yeni Astra GS ile teknoloji tarafinda bekledigimden daha premium bir his aldim. Ozellikle dijital kokpit basarili.',
    imageUrl: CAR_IMAGE_URLS[7],
  },
  {
    id: 'demo-vehicle-3008-gt',
    ownerId: 'demo-owner-baris',
    brand: 'Peugeot',
    model: '3008',
    packageName: 'GT',
    city: 'Adana',
    district: 'Seyhan',
    year: 2022,
    km: 42800,
    price: 1785000,
    fuelType: FuelType.DIESEL,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1499,
    enginePower: 130,
    bodyType: 'SUV',
    tractionType: 'FWD',
    description: '3008 GT, tasarim ile aile kullanimi arasinda iyi bir denge kuruyor. Kabin hissi ozellikle gece suruslerinde guzel.',
    equipmentNotes: 'Panoramik tavan, i-Cockpit, masajli koltuk',
    title: '3008 GT detay paylasimi',
    caption: 'SUV alirken tasarim da onemli diyorsaniz 3008 GT bu konuda hala cok guclu bir oyuncu.',
    imageUrl: CAR_IMAGE_URLS[8],
  },
  {
    id: 'demo-vehicle-duster-journey',
    ownerId: 'demo-owner-cagatay',
    brand: 'Dacia',
    model: 'Duster',
    packageName: 'Journey',
    city: 'Konya',
    district: 'Meram',
    year: 2023,
    km: 24100,
    price: 1290000,
    fuelType: FuelType.LPG,
    transmissionType: TransmissionType.MANUAL,
    engineVolume: 1332,
    enginePower: 150,
    bodyType: 'SUV',
    tractionType: 'AWD',
    description: 'Duster Journey, bozuk zemin ve sehir ici kullanim arasinda cok pratik bir secenek olarak one cikiyor.',
    equipmentNotes: '360 kamera, otomatik klima, blind spot',
    title: 'Duster Journey hafta sonu',
    caption: 'Yol bitince de devam etmek isteyenler icin Duster Journey gercekten cok mantikli bir paket.',
    imageUrl: CAR_IMAGE_URLS[9],
  },
  {
    id: 'demo-vehicle-bmw-320i',
    ownerId: 'demo-owner-emre',
    brand: 'BMW',
    model: '3 Serisi',
    packageName: 'M Sport',
    city: 'Istanbul',
    district: 'Sariyer',
    year: 2021,
    km: 39800,
    price: 2440000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1998,
    enginePower: 170,
    bodyType: 'Sedan',
    tractionType: 'RWD',
    description: '3 Serisi M Sport, direksiyon hissi ve surus dengesi ile premium sedan tarafinda hala cok guclu bir referans.',
    equipmentNotes: 'Harman Kardon, M aerodinamik kit, sunroof',
    title: '320i M Sport surus notu',
    caption: '3 Serisi kullananin neden tekrar 3 Serisi istedigini anlatan sey direksiyon ve denge hissi.',
    imageUrl: CAR_IMAGE_URLS[2],
  },
  {
    id: 'demo-vehicle-mercedes-c200',
    ownerId: 'demo-owner-selin',
    brand: 'Mercedes-Benz',
    model: 'C Serisi',
    packageName: 'AMG',
    city: 'Ankara',
    district: 'Incek',
    year: 2023,
    km: 18200,
    price: 3015000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1496,
    enginePower: 204,
    bodyType: 'Sedan',
    tractionType: 'RWD',
    description: 'C200 AMG, yeni nesil ic mekan kalitesi ve yumusak surus karakteriyle sakin ama premium bir atmosfer sunuyor.',
    equipmentNotes: 'Burmester, ambiyans aydinlatma, 360 kamera',
    title: 'C200 AMG ic mekan hissi',
    caption: 'Yeni C Serisi ic mekanda bekledigimden daha sakin ama daha premium bir hava veriyor.',
    imageUrl: CAR_IMAGE_URLS[5],
  },
  {
    id: 'demo-vehicle-a3-sline',
    ownerId: 'demo-owner-merve',
    brand: 'Audi',
    model: 'A3',
    packageName: 'S line',
    city: 'Izmir',
    district: 'Guzelyali',
    year: 2022,
    km: 27600,
    price: 1945000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1498,
    enginePower: 150,
    bodyType: 'Sedan',
    tractionType: 'FWD',
    description: 'A3 S line, kompakt premium sinifta minimal ama kaliteli bir karakter arayanlar icin iyi bir secenek.',
    equipmentNotes: 'Virtual cockpit, LED matrix, spor koltuk',
    title: 'A3 S line sahil sabahi',
    caption: 'A3 S line ile minimal ama kaliteli bir premium sedan hissi almak mumkun. Cok abartmadan guzel duruyor.',
    imageUrl: CAR_IMAGE_URLS[4],
  },
  {
    id: 'demo-vehicle-octavia-style',
    ownerId: 'demo-owner-zeynep',
    brand: 'Skoda',
    model: 'Octavia',
    packageName: 'Style',
    city: 'Samsun',
    district: 'Atakum',
    year: 2022,
    km: 50200,
    price: 1425000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1498,
    enginePower: 150,
    bodyType: 'Liftback',
    tractionType: 'FWD',
    description: 'Octavia Style, genis bagaj ve ferah kabin ihtiyacini sessizce cozen modellerden biri.',
    equipmentNotes: 'Adaptif cruise, buyuk ekran, geri gorus',
    title: 'Octavia Style aile notlari',
    caption: 'Octavia kullanan herkesin bahsettigi genislik hissi gercekten fark yaratmaya devam ediyor.',
    imageUrl: CAR_IMAGE_URLS[6],
  },
  {
    id: 'demo-vehicle-leon-fr',
    ownerId: 'demo-owner-nazli',
    brand: 'Seat',
    model: 'Leon',
    packageName: 'FR',
    city: 'Mugla',
    district: 'Bodrum',
    year: 2021,
    km: 44700,
    price: 1510000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1498,
    enginePower: 150,
    bodyType: 'Hatchback',
    tractionType: 'FWD',
    description: 'Leon FR, ayni altyapida daha dinamik gorunum ve daha sert karakter isteyenler icin keyifli bir secenek.',
    equipmentNotes: 'FR tampon, LED stop, spor direksiyon',
    title: 'Leon FR gun batimi',
    caption: 'Bodrum sahilinde Leon FR ile biraz renk, biraz da hatchback keyfi. Gorsel olarak hep dinamik kaliyor.',
    imageUrl: CAR_IMAGE_URLS[7],
  },
  {
    id: 'demo-vehicle-sportage-prestige',
    ownerId: 'demo-owner-ahmet',
    brand: 'Kia',
    model: 'Sportage',
    packageName: 'Prestige',
    city: 'Istanbul',
    district: 'Atasehir',
    year: 2024,
    km: 8600,
    price: 2080000,
    fuelType: FuelType.HYBRID,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1598,
    enginePower: 230,
    bodyType: 'SUV',
    tractionType: 'AWD',
    description: 'Sportage Prestige, yeni kasa tasarimi ve hibrit surus kalitesiyle premiuma yakin bir SUV deneyimi sunuyor.',
    equipmentNotes: 'Panoramik ekran, 360 kamera, hafizali koltuk',
    title: 'Sportage Prestige ilk izlenim',
    caption: 'Sportage yeni kasada hem daha cesur gorunuyor hem de hibrit yapisiyla daha gunluk bir SUV haline geliyor.',
    imageUrl: CAR_IMAGE_URLS[8],
  },
  {
    id: 'demo-vehicle-qashqai-skypack',
    ownerId: 'demo-owner-baris',
    brand: 'Nissan',
    model: 'Qashqai',
    packageName: 'Sky Pack',
    city: 'Gaziantep',
    district: 'Sehitkamil',
    year: 2023,
    km: 16500,
    price: 1895000,
    fuelType: FuelType.HYBRID,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1332,
    enginePower: 158,
    bodyType: 'SUV',
    tractionType: 'FWD',
    description: 'Qashqai Sky Pack, sehir ici ergonomi ve yuksek oturus pozisyonunu sevenler icin hala cok mantikli.',
    equipmentNotes: 'Panoramik cam tavan, head-up display, bose ses sistemi',
    title: 'Qashqai Sky Pack gunlugu',
    caption: 'Sky Pack Qashqai uzun yolda sessizlik ve ekipman tarafinda keyifli bir paket sunuyor.',
    imageUrl: CAR_IMAGE_URLS[9],
  },
  {
    id: 'demo-vehicle-t10x-v2',
    ownerId: 'demo-owner-cagatay',
    brand: 'TOGG',
    model: 'T10X',
    packageName: 'V2',
    city: 'Istanbul',
    district: 'Maslak',
    year: 2024,
    km: 7300,
    price: 1830000,
    fuelType: FuelType.ELECTRIC,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 0,
    enginePower: 218,
    bodyType: 'SUV',
    tractionType: 'RWD',
    description: 'T10X V2, elektrikli suruste sessizlik ve dijital deneyim arayanlar icin dikkat ceken bir alternatif.',
    equipmentNotes: 'Uzun menzil batarya, 360 kamera, adaptif cruise',
    title: 'T10X V2 sehir ici deneyimi',
    caption: 'T10X V2 ile elektrikli gundelik kullanim artik daha tanidik hissettiriyor. Sessizlik bagimlilik yapiyor.',
    imageUrl: CAR_IMAGE_URLS[1],
  },
  {
    id: 'demo-vehicle-megane-icon',
    ownerId: 'demo-owner-zeynep',
    brand: 'Renault',
    model: 'Megane',
    packageName: 'Icon',
    city: 'Eskisehir',
    district: 'Odunpazari',
    year: 2021,
    km: 61200,
    price: 1240000,
    fuelType: FuelType.DIESEL,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1461,
    enginePower: 115,
    bodyType: 'Sedan',
    tractionType: 'FWD',
    description: 'Megane Icon, filo gecmisi temiz tutuldugunda hala cok mantikli ve olgun bir sedan deneyimi veriyor.',
    equipmentNotes: 'Yari deri koltuk, geri gorus, otomatik klima',
    title: 'Megane Icon uzun yol',
    caption: 'Megane Icon ile uzun yolda konfor hala bekledigimden iyi. Sessizlik tarafinda sinifina gore yeterli.',
    imageUrl: CAR_IMAGE_URLS[0],
  },
  {
    id: 'demo-vehicle-passat-highline',
    ownerId: 'demo-owner-emre',
    brand: 'Volkswagen',
    model: 'Passat',
    packageName: 'Highline',
    city: 'Kocaeli',
    district: 'Basiskele',
    year: 2020,
    km: 78400,
    price: 1780000,
    fuelType: FuelType.DIESEL,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 1968,
    enginePower: 150,
    bodyType: 'Sedan',
    tractionType: 'FWD',
    description: 'Passat Highline, is ve aile kullanimini bir arada isteyenler icin halen guclu bir uzun yol otomobili.',
    equipmentNotes: 'Memory seat, adaptif cruise, lane assist',
    title: 'Passat Highline mola',
    caption: 'Passat Highline hala uzun yol cizgisinde cok kuvvetli. Koltuk konforu ve kabin sakinligi guzel bir kombinasyon.',
    imageUrl: CAR_IMAGE_URLS[3],
  },
  {
    id: 'demo-vehicle-polo-style',
    ownerId: 'demo-owner-nazli',
    brand: 'Volkswagen',
    model: 'Polo',
    packageName: 'Style',
    city: 'Mersin',
    district: 'Yenisehir',
    year: 2024,
    km: 9400,
    price: 1285000,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    engineVolume: 999,
    enginePower: 95,
    bodyType: 'Hatchback',
    tractionType: 'FWD',
    description: 'Polo Style, kucuk sinifta kalite hissi isteyenler icin yalnizca mantikli degil, ayni zamanda rafine bir secenek.',
    equipmentNotes: 'Dijital gosterge, LED far, arka kamera',
    title: 'Polo Style gunluk not',
    caption: 'Polo Style ile kucuk segmentte buyuk otomobil hissi almak hala mumkun. Ozellikle sehir ici park kolayligi guzel.',
    imageUrl: CAR_IMAGE_URLS[4],
  },
];

const DEMO_WELCOME_POST: FeedPost = {
  id: 'demo-post-welcome',
  caption:
    "Carloi'ye hos geldin. Burada hem sosyal akis hem de arac dunyan ayni yerde. Ilk gonderini olustur, profiline arac ekle ve kesfeti canlandir.",
  locationText: 'Carloi onboarding',
  createdAt: timestampHoursAgo(4),
  owner: toSocialOwner(getOwner('demo-owner-carloi')),
  media: [
    {
      id: 'demo-post-media-welcome',
      mediaType: 'IMAGE',
      url: CAR_IMAGE_URLS[0],
      sortOrder: 0,
    },
  ],
  likeCount: 218,
  commentCount: 3,
  isLiked: false,
  isSaved: false,
};

function getOwner(ownerId: string) {
  const owner = DEMO_OWNERS.find((item) => item.id === ownerId);
  if (!owner) {
    throw new Error(`Demo owner not found: ${ownerId}`);
  }
  return owner;
}

function toSocialOwner(owner: DemoOwner) {
  return {
    id: owner.id,
    username: owner.username,
    firstName: owner.firstName,
    lastName: owner.lastName,
    avatarUrl: null,
    blueVerified: owner.blueVerified,
    goldVerified: owner.goldVerified,
    isFollowing: owner.id !== 'demo-owner-carloi',
  };
}

function toExploreOwner(owner: DemoOwner) {
  return {
    id: owner.id,
    username: owner.username,
    fullName: `${owner.firstName} ${owner.lastName}`,
    avatarUrl: null,
    blueVerified: owner.blueVerified,
    goldVerified: owner.goldVerified,
  };
}

function timestampHoursAgo(hoursAgo: number) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function createEquipmentGroup(seed: DemoVehicleSeed) {
  return [
    {
      category: VehicleEquipmentCategory.SAFETY,
      items: [
        { id: `${seed.id}-safe-1`, name: 'ABS', isStandard: true, manualReviewNeeded: false },
        { id: `${seed.id}-safe-2`, name: 'ESP', isStandard: true, manualReviewNeeded: false },
        { id: `${seed.id}-safe-3`, name: 'On hava yastiklari', isStandard: true, manualReviewNeeded: false },
      ],
    },
    {
      category: VehicleEquipmentCategory.COMFORT,
      items: [
        { id: `${seed.id}-comfort-1`, name: 'Otomatik klima', isStandard: true, manualReviewNeeded: false },
        { id: `${seed.id}-comfort-2`, name: 'Geri gorus kamerasi', isStandard: true, manualReviewNeeded: false },
        { id: `${seed.id}-comfort-3`, name: seed.equipmentNotes.split(',')[0]?.trim() || 'Dokunmatik ekran', isStandard: true, manualReviewNeeded: false },
      ],
    },
  ];
}

function createExtraEquipment(seed: DemoVehicleSeed) {
  return [
    {
      id: `${seed.id}-extra-1`,
      category: VehicleEquipmentCategory.MULTIMEDIA,
      name: seed.equipmentNotes.split(',')[1]?.trim() || 'Kablosuz sarj',
      note: 'Kullanici tarafindan detaylandirildi',
      isStandard: false as const,
      manualReviewNeeded: false as const,
    },
  ];
}

export const demoExploreVehicles: ExploreVehicleItem[] = DEMO_VEHICLE_SEEDS.map((seed) => {
  const owner = getOwner(seed.ownerId);
  return {
    id: seed.id,
    firstMediaUrl: seed.imageUrl,
    media: [
      {
        id: `${seed.id}-media-1`,
        url: seed.imageUrl,
        mediaType: MediaType.IMAGE,
        sortOrder: 0,
      },
    ],
    owner: toExploreOwner(owner),
    city: seed.city,
    brand: seed.brand,
    model: seed.model,
    package: seed.packageName,
    year: seed.year,
    fuelType: seed.fuelType,
    transmissionType: seed.transmissionType,
    km: seed.km,
    bodyType: seed.bodyType,
    engineVolume: seed.engineVolume,
    enginePower: seed.enginePower,
    description: seed.description,
    equipmentNotes: seed.equipmentNotes,
    standardEquipment: createEquipmentGroup(seed),
    extraEquipment: createExtraEquipment(seed),
    showInExplore: true,
    openToOffers: seed.id !== 'demo-vehicle-clio-techno' && seed.id !== 'demo-vehicle-polo-style',
  };
});

export const demoExploreVehicleById: Record<string, ExploreVehicleItem> = Object.fromEntries(
  demoExploreVehicles.map((vehicle) => [vehicle.id, vehicle]),
);

export const demoFeedPosts: FeedPost[] = [
  DEMO_WELCOME_POST,
  ...demoExploreVehicles.slice(0, 19).map((vehicle, index) => ({
    id: `demo-post-${vehicle.id.replace('demo-vehicle-', '')}`,
    caption: DEMO_VEHICLE_SEEDS[index]?.caption ?? vehicle.description,
    locationText: `${vehicle.city ?? 'Turkiye'} / ${DEMO_VEHICLE_SEEDS[index]?.district ?? 'Merkez'}`,
    createdAt: timestampHoursAgo(6 + index * 2),
    owner: {
      id: vehicle.owner.id,
      username: vehicle.owner.username,
      firstName: vehicle.owner.fullName.split(' ')[0] ?? vehicle.owner.fullName,
      lastName: vehicle.owner.fullName.split(' ').slice(1).join(' ') || 'Carloi',
      avatarUrl: vehicle.owner.avatarUrl,
      blueVerified: vehicle.owner.blueVerified,
      goldVerified: vehicle.owner.goldVerified,
      isFollowing: vehicle.owner.id !== 'demo-owner-carloi',
    },
    media: vehicle.media.map((item) => ({
      id: `feed-${item.id}`,
      mediaType: item.mediaType,
      url: item.url,
      sortOrder: item.sortOrder,
    })),
    likeCount: 72 + index * 13,
    commentCount: 2 + (index % 5),
    isLiked: index % 4 === 0,
    isSaved: index % 6 === 0,
  })),
];

export const demoFeedPostById: Record<string, FeedPost> = Object.fromEntries(
  demoFeedPosts.map((post) => [post.id, post]),
);

export const demoFeedComments: Record<string, SocialComment[]> = Object.fromEntries(
  demoFeedPosts.map((post, index) => {
    const ownerA = DEMO_OWNERS[(index + 1) % DEMO_OWNERS.length]!;
    const ownerB = DEMO_OWNERS[(index + 3) % DEMO_OWNERS.length]!;
    return [
      post.id,
      [
        {
          id: `${post.id}-comment-1`,
          body: index === 0 ? 'Ilk gonderini create alanindan acip buraya birakabilirsin.' : 'Bu setin durusu cok temiz gorunuyor, detayli kare bekleriz.',
          createdAt: timestampHoursAgo(3 + index),
          parentCommentId: null,
          owner: {
            id: ownerA.id,
            username: ownerA.username,
            firstName: ownerA.firstName,
            lastName: ownerA.lastName,
            avatarUrl: null,
            blueVerified: ownerA.blueVerified,
            goldVerified: ownerA.goldVerified,
          },
          likeCount: 4 + (index % 7),
          replyCount: 0,
          isLiked: false,
        },
        {
          id: `${post.id}-comment-2`,
          body: index === 0 ? 'Profilindeki Araclar sekmesinden arac eklemeyi unutma.' : 'Sehir, paket ve km dengesi cok mantikli. Kesfette iyi akar.',
          createdAt: timestampHoursAgo(2 + index),
          parentCommentId: null,
          owner: {
            id: ownerB.id,
            username: ownerB.username,
            firstName: ownerB.firstName,
            lastName: ownerB.lastName,
            avatarUrl: null,
            blueVerified: ownerB.blueVerified,
            goldVerified: ownerB.goldVerified,
          },
          likeCount: 2 + (index % 5),
          replyCount: 0,
          isLiked: false,
        },
      ] satisfies SocialComment[],
    ];
  }),
);

export const demoStoryGroups: StoryFeedGroup[] = demoExploreVehicles.slice(0, 8).map((vehicle, index) => {
  const owner = getOwner(vehicle.owner.id);
  return {
    owner: {
      id: owner.id,
      username: owner.username,
      firstName: owner.firstName,
      lastName: owner.lastName,
      avatarUrl: null,
      blueVerified: owner.blueVerified,
      goldVerified: owner.goldVerified,
    },
    stories: [
      {
        id: `demo-story-${index + 1}`,
        owner: {
          id: owner.id,
          username: owner.username,
          firstName: owner.firstName,
          lastName: owner.lastName,
          avatarUrl: null,
          blueVerified: owner.blueVerified,
          goldVerified: owner.goldVerified,
        },
        media: {
          id: `demo-story-media-${index + 1}`,
          url: vehicle.firstMediaUrl ?? vehicle.media[0]?.url ?? CAR_IMAGE_URLS[index % CAR_IMAGE_URLS.length]!,
          mediaType: 'IMAGE',
          sortOrder: 0,
        },
        caption: index === 0 ? 'Ilk hikayeni paylas, profilin canlansin.' : `${vehicle.brand} ${vehicle.model} ile gunluk mini story.`,
        locationText: `${vehicle.city ?? 'Turkiye'} / ${DEMO_VEHICLE_SEEDS[index]?.district ?? 'Merkez'}`,
        createdAt: timestampHoursAgo(index + 1),
        expiresAt: new Date(Date.now() + (23 - index) * 60 * 60 * 1000).toISOString(),
        viewedByMe: false,
        viewerCount: 18 + index * 7,
      },
    ],
    hasUnviewed: true,
    latestCreatedAt: timestampHoursAgo(index + 1),
  };
});

export const demoStoryAnalyticsById: Record<
  string,
  {
    viewers: StoryViewerItem[];
    likers: StoryViewerItem[];
  }
> = Object.fromEntries(
  demoStoryGroups.flatMap((group, groupIndex) =>
    group.stories.map((story, storyIndex) => {
      const viewers = DEMO_OWNERS.filter((owner) => owner.id !== story.owner.id)
        .slice(0, 4 + (groupIndex % 3))
        .map((owner, viewerIndex) => ({
          id: `${story.id}-viewer-${viewerIndex + 1}`,
          viewedAt: timestampHoursAgo(groupIndex + storyIndex + viewerIndex + 1),
          viewer: {
            id: owner.id,
            username: owner.username,
            firstName: owner.firstName,
            lastName: owner.lastName,
            avatarUrl: null,
            blueVerified: owner.blueVerified,
            goldVerified: owner.goldVerified,
          },
        }));
      const likers = viewers.slice(0, Math.max(1, Math.min(3, viewers.length - 1)));

      return [
        story.id,
        {
          viewers,
          likers,
        },
      ] as const;
    }),
  ),
);

export const demoListingDetails: ListingDetailResponse[] = demoExploreVehicles.slice(0, 12).map((vehicle, index) => {
  const listingId = `demo-listing-${vehicle.id.replace('demo-vehicle-', '')}`;
  return {
    id: listingId,
    listingNo: `CRL-${4200 + index}`,
    title: `${vehicle.brand} ${vehicle.model} ${vehicle.package ?? ''}`.trim(),
    description: `${vehicle.description ?? ''} ${vehicle.openToOffers ? 'Teklife acik durumda ve temiz saklanmis bir ornek.' : 'Profilde sergilenen duzenli bir arac.'}`.trim(),
    listingStatus: ListingStatus.ACTIVE,
    price: DEMO_VEHICLE_SEEDS[index]?.price ?? 950000 + index * 50000,
    currency: 'TRY',
    city: vehicle.city ?? 'Istanbul',
    district: DEMO_VEHICLE_SEEDS[index]?.district ?? null,
    createdAt: timestampHoursAgo(12 + index * 3),
    tradeAvailable: index % 3 === 0,
    sellerType: index % 4 === 0 ? SellerType.DEALER : SellerType.OWNER,
    plateMasked: `34 *** ${10 + index}`,
    contactPhone: null,
    showPhone: false,
    isSaved: index % 4 === 1,
    owner: {
      id: vehicle.owner.id,
      username: vehicle.owner.username,
      fullName: vehicle.owner.fullName,
      avatarUrl: null,
      blueVerified: vehicle.owner.blueVerified,
      goldVerified: vehicle.owner.goldVerified,
    },
    media: vehicle.media.map((media) => ({
      id: `listing-${media.id}`,
      url: media.url,
      mediaType: media.mediaType,
      sortOrder: media.sortOrder,
    })),
    vehicle: {
      garageVehicleId: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      package: vehicle.package,
      year: vehicle.year,
      fuelType: vehicle.fuelType,
      transmissionType: vehicle.transmissionType,
      km: vehicle.km,
      bodyType: vehicle.bodyType,
      enginePower: vehicle.enginePower,
      engineVolume: vehicle.engineVolume,
      enginePowerHp: vehicle.enginePower,
      engineVolumeCc: vehicle.engineVolume,
      tractionType: DEMO_VEHICLE_SEEDS[index]?.tractionType ?? 'FWD',
      color: ['Beyaz', 'Siyah', 'Gri', 'Lacivert', 'Kirmizi'][index % 5] ?? 'Gri',
      guarantee: index % 2 === 0 ? 'Var' : 'Yok',
    },
    damageParts: [],
    equipmentSummary: vehicle.equipmentNotes,
    multimediaSummary: vehicle.equipmentNotes,
    interiorSummary: 'Temiz koltuklar, duzenli kabin ve gunluk kullanimda yeterli saklama alani.',
    exteriorSummary: 'Duzenli boya parlakligi, temiz jantlar ve bakimli dis yuzey.',
    contactActions: {
      canCall: false,
      canMessage: true,
      canSave: true,
    },
  };
});

export const demoListingById: Record<string, ListingDetailResponse> = Object.fromEntries(
  demoListingDetails.map((listing) => [listing.id, listing]),
);

export const loiAiSuggestedPrompts = [
  '800k arac bul',
  'En az yakan araclar',
  'Egea vs Clio karsilastir',
  'Ailece hangi SUV mantikli?',
  '1.5 milyon bandinda sedan oner',
  'Togg T10X mi Corolla Hybrid mi',
];

const primaryDemoListing = demoListingDetails[0]!;
const primaryDemoPost = demoFeedPosts[1]!;
const primaryDemoVehicle = demoExploreVehicles[0]!;

export const demoLoiAiWelcomeConversation: LoiAiConversationDetail = {
  id: 'demo-loi-conversation-welcome',
  title: 'Carloi ile ilk sohbet',
  createdAt: timestampHoursAgo(1),
  updatedAt: timestampHoursAgo(1),
  messages: [
    {
      id: 'demo-loi-message-1',
      role: AiMessageRole.ASSISTANT,
      provider: AiProvider.INTERNAL,
      content:
        'Merhaba, ben Loi AI. Butce, yakit tuketimi, aile kullanimi ya da kronik sorunlar uzerinden sana uygun araclari ayiklayabilirim. Asagidaki orneklerle hemen baslayabiliriz.',
      attachments: [],
      cards: [
        {
          type: AiCardType.LISTING_CARD,
          entityId: primaryDemoListing.id,
          appRoute: `/listings/${primaryDemoListing.id}`,
          title: primaryDemoListing.title,
          subtitle: `${primaryDemoListing.city} - ${primaryDemoListing.vehicle.year}`,
          description: 'Ekonomik ve gunluk kullanim odakli bir demo ilan.',
          imageUrl: primaryDemoListing.media[0]?.url ?? null,
          price: primaryDemoListing.price,
          currency: 'TRY',
          badges: ['Demo', 'Ekonomik'],
        },
        {
          type: AiCardType.POST_CARD,
          entityId: primaryDemoPost.id,
          appRoute: `/posts/${primaryDemoPost.id}`,
          title: '@' + primaryDemoPost.owner.username,
          subtitle: primaryDemoPost.locationText ?? 'Feed',
          description: primaryDemoPost.caption ?? undefined,
          imageUrl: primaryDemoPost.media[0]?.url ?? null,
          badges: ['Topluluk'],
        },
        {
          type: AiCardType.USER_CARD,
          entityId: primaryDemoVehicle.owner.id,
          appRoute: `/profile/${primaryDemoVehicle.owner.username}`,
          title: `@${primaryDemoVehicle.owner.username}`,
          subtitle: primaryDemoVehicle.owner.fullName,
          description: 'Ornek demo profil ve arac koleksiyonu',
          badges: ['Profil'],
        },
      ],
      createdAt: timestampHoursAgo(1),
    },
  ],
};

function getDemoOwnerForProfile(identifier?: string | null) {
  if (identifier) {
    const matched = DEMO_OWNERS.find((owner) => owner.username === identifier);
    if (matched) {
      return matched;
    }
  }
  return DEMO_OWNERS[1]!;
}

function mapVehicleToProfileItem(vehicle: ExploreVehicleItem): ProfileVehicleItem {
  return {
    id: vehicle.id,
    firstMediaUrl: vehicle.firstMediaUrl,
    media: vehicle.media.map((item) => ({
      id: item.id,
      url: item.url,
      mediaType: item.mediaType,
      sortOrder: item.sortOrder,
    })),
    brand: vehicle.brand,
    model: vehicle.model,
    package: vehicle.package,
    plateNumberMasked: '34 *** 00',
    year: vehicle.year,
    km: vehicle.km,
    isPublic: true,
    color: 'Gri',
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    bodyType: vehicle.bodyType,
    engineVolume: vehicle.engineVolume,
    enginePower: vehicle.enginePower,
    enginePowerHp: vehicle.enginePower,
    engineVolumeCc: vehicle.engineVolume,
    tractionType: 'FWD',
    description: vehicle.description,
    equipmentNotes: vehicle.equipmentNotes,
    showInExplore: vehicle.showInExplore,
    openToOffers: vehicle.openToOffers,
  };
}

export function buildDemoProfileFixtures(options?: {
  currentUser?: DemoCurrentUser | null;
  identifier?: string | null;
  isOwnProfile?: boolean;
}): DemoProfileFixtures {
  const isOwnProfile = options?.isOwnProfile ?? !options?.identifier;
  const owner = getDemoOwnerForProfile(options?.identifier ?? null);
  const displayIdentity =
    isOwnProfile && options?.currentUser
      ? {
          id: options.currentUser.id,
          username: options.currentUser.username,
          firstName: options.currentUser.firstName,
          lastName: options.currentUser.lastName,
        }
      : owner;

  const relatedPostsRaw = demoFeedPosts.filter((post) => post.owner.id === owner.id);
  const relatedVehiclesRaw = demoExploreVehicles.filter((vehicle) => vehicle.owner.id === owner.id);
  const relatedListingsRaw = demoListingDetails.filter((listing) => listing.owner.id === owner.id);

  const postsSource = relatedPostsRaw.length > 0 ? relatedPostsRaw : demoFeedPosts.slice(1, 10);
  const vehiclesSource = relatedVehiclesRaw.length > 0 ? relatedVehiclesRaw : demoExploreVehicles.slice(0, 6);
  const listingsSource = relatedListingsRaw.length > 0 ? relatedListingsRaw : demoListingDetails.slice(0, 6);

  return {
    profile: {
      id: displayIdentity.id,
      avatarUrl: null,
      firstName: displayIdentity.firstName,
      lastName: displayIdentity.lastName,
      username: displayIdentity.username,
      bio: isOwnProfile
        ? 'Carloi demo profilinde sosyal akis, arac koleksiyonu ve ilanlar birlikte gorunuyor.'
        : `${owner.firstName} koleksiyonu ve duzenli arac paylasimlari burada gorunuyor.`,
      bioMentions: [],
      websiteUrl: 'https://carloi.com',
      locationText: `${listingsSource[0]?.city ?? 'Istanbul'} / ${listingsSource[0]?.district ?? 'Merkez'}`,
      blueVerified: isOwnProfile ? true : owner.blueVerified,
      goldVerified: owner.goldVerified,
      postCount: Math.max(postsSource.length, 12),
      listingCount: Math.max(listingsSource.length, 6),
      vehicleCount: Math.max(vehiclesSource.length, 5),
      followerCount: isOwnProfile ? 1842 : 962,
      followingCount: isOwnProfile ? 268 : 134,
      isFollowing: !isOwnProfile,
      isOwnProfile,
      isPrivate: false,
      canViewContent: true,
      mutualFollowers: DEMO_OWNERS.slice(2, 4).map((item) => ({
        id: item.id,
        username: item.username,
        avatarUrl: null,
      })),
    },
    posts: postsSource.map((post) => ({
      id: post.id,
      thumbnailUrl: post.media[0]?.url ?? null,
      mediaType: post.media[0]?.mediaType === MediaType.VIDEO ? MediaType.VIDEO : MediaType.IMAGE,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
    })),
    listings: listingsSource.map((listing) => ({
      listingId: listing.id,
      listingNo: listing.listingNo,
      firstMediaUrl: listing.media[0]?.url ?? null,
      title: listing.title,
      brand: listing.vehicle.brand,
      model: listing.vehicle.model,
      package: listing.vehicle.package,
      city: listing.city,
      district: listing.district,
      price: listing.price,
      km: listing.vehicle.km,
      sellerType: listing.sellerType,
      isSaved: listing.isSaved,
      listingStatus: listing.listingStatus,
      createdAt: listing.createdAt,
    })),
    vehicles: vehiclesSource.map(mapVehicleToProfileItem),
  };
}

function createParticipantSummary(owner: DemoOwner): MessageParticipantSummary {
  return {
    id: owner.id,
    username: owner.username,
    fullName: `${owner.firstName} ${owner.lastName}`,
    avatarUrl: null,
    isPrivate: false,
    isMutualFollow: true,
  };
}

function createMessage(
  params: Partial<MessageView> & {
    id: string;
    threadId: string;
    senderId: string;
    senderUsername: string;
    senderFullName: string;
    isMine: boolean;
    createdAt: string;
  },
): MessageView {
  return {
    id: params.id,
    threadId: params.threadId,
    senderId: params.senderId,
    senderUsername: params.senderUsername,
    senderFullName: params.senderFullName,
    isMine: params.isMine,
    body: params.body ?? null,
    messageType: params.messageType ?? MessageType.TEXT,
    seenAt: params.seenAt ?? null,
    createdAt: params.createdAt,
    attachments: params.attachments ?? [],
    systemCard: params.systemCard ?? null,
  };
}

function toThreadSummary(detail: MessageThreadDetail): MessageThreadSummary {
  const lastMessage = detail.messages[detail.messages.length - 1] ?? null;
  return {
    id: detail.id,
    type: detail.type,
    groupName: detail.groupName,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    unreadCount: detail.unreadCount,
    participants: detail.participants,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          bodyPreview:
            lastMessage.body ??
            (lastMessage.systemCard?.type === SystemMessageCardType.POST_CARD
              ? 'Bir gonderi paylasildi'
              : lastMessage.systemCard?.type === SystemMessageCardType.LISTING_CARD
                ? 'Bir ilan paylasildi'
                : lastMessage.systemCard?.type === SystemMessageCardType.VEHICLE_CARD
                  ? 'Bir arac paylasildi'
                  : 'Yeni mesaj'),
          messageType: lastMessage.messageType,
          createdAt: lastMessage.createdAt,
          seenAt: lastMessage.seenAt,
          senderUsername: lastMessage.senderUsername,
        }
      : null,
    listing: detail.listing,
    dealAgreement: detail.dealAgreement,
  };
}

export function buildDemoMessageFixtures(currentUser?: DemoCurrentUser | null): DemoMessageFixtures {
  const me: DemoCurrentUser = currentUser ?? {
    id: 'demo-current-user',
    username: 'siz',
    firstName: 'Carloi',
    lastName: 'Kullanici',
  };
  const contacts = [DEMO_OWNERS[2]!, DEMO_OWNERS[4]!, DEMO_OWNERS[6]!, DEMO_OWNERS[8]!];
  const friends = contacts.map(createParticipantSummary);

  const threadAId = 'demo-thread-listing';
  const threadBId = 'demo-thread-vehicle';
  const threadCId = 'demo-thread-post';
  const threadDId = 'demo-thread-direct';

  const listingCard = demoListingDetails[0]!;
  const vehicleCard = demoExploreVehicles[1]!;
  const postCard = demoFeedPosts[2]!;

  const details: MessageThreadDetail[] = [
    {
      id: threadAId,
      type: MessageThreadType.DIRECT,
      groupName: null,
      createdAt: timestampHoursAgo(20),
      updatedAt: timestampHoursAgo(1),
      unreadCount: 2,
      participants: [
        { id: me.id, username: me.username, fullName: `${me.firstName} ${me.lastName}`, avatarUrl: null, isPrivate: false },
        friends[0]!,
      ],
      lastMessage: null,
      listing: null,
      dealAgreement: null,
      messages: [
        createMessage({
          id: `${threadAId}-1`,
          threadId: threadAId,
          senderId: friends[0]!.id,
          senderUsername: friends[0]!.username,
          senderFullName: friends[0]!.fullName,
          isMine: false,
          body: 'Bu ilana da bir goz at istersen, fiyat performans olarak fena degil.',
          createdAt: timestampHoursAgo(5),
        }),
        createMessage({
          id: `${threadAId}-2`,
          threadId: threadAId,
          senderId: friends[0]!.id,
          senderUsername: friends[0]!.username,
          senderFullName: friends[0]!.fullName,
          isMine: false,
          body: 'Ozellikle km ve donanim dengesi guzel duruyor.',
          messageType: MessageType.SYSTEM_CARD,
          systemCard: {
            type: SystemMessageCardType.LISTING_CARD,
            contentType: SharedContentType.LISTING,
            targetId: listingCard.id,
            previewTitle: listingCard.title,
            previewImageUrl: listingCard.media[0]?.url ?? null,
            previewSubtitle: `${listingCard.city} - ${listingCard.price.toLocaleString('tr-TR')} TL`,
          },
          createdAt: timestampHoursAgo(4),
        }),
      ],
    },
    {
      id: threadBId,
      type: MessageThreadType.DIRECT,
      groupName: null,
      createdAt: timestampHoursAgo(28),
      updatedAt: timestampHoursAgo(2),
      unreadCount: 0,
      participants: [
        { id: me.id, username: me.username, fullName: `${me.firstName} ${me.lastName}`, avatarUrl: null, isPrivate: false },
        friends[1]!,
      ],
      lastMessage: null,
      listing: null,
      dealAgreement: null,
      messages: [
        createMessage({
          id: `${threadBId}-1`,
          threadId: threadBId,
          senderId: me.id,
          senderUsername: me.username,
          senderFullName: `${me.firstName} ${me.lastName}`,
          isMine: true,
          body: 'Bunu kesfette gordum, sence tekliflik mi?',
          createdAt: timestampHoursAgo(6),
        }),
        createMessage({
          id: `${threadBId}-2`,
          threadId: threadBId,
          senderId: me.id,
          senderUsername: me.username,
          senderFullName: `${me.firstName} ${me.lastName}`,
          isMine: true,
          body: 'Ozellikle paket ve yil kombinasyonu hosuma gitti.',
          messageType: MessageType.SYSTEM_CARD,
          systemCard: {
            type: SystemMessageCardType.VEHICLE_CARD,
            contentType: SharedContentType.VEHICLE,
            targetId: vehicleCard.id,
            previewTitle: `${vehicleCard.brand} ${vehicleCard.model} ${vehicleCard.package ?? ''}`.trim(),
            previewImageUrl: vehicleCard.firstMediaUrl,
            previewSubtitle: `${vehicleCard.city} - ${vehicleCard.year}`,
          },
          createdAt: timestampHoursAgo(6),
        }),
        createMessage({
          id: `${threadBId}-3`,
          threadId: threadBId,
          senderId: friends[1]!.id,
          senderUsername: friends[1]!.username,
          senderFullName: friends[1]!.fullName,
          isMine: false,
          body: 'Kesfette acik olan araclar icin once mesaj atip detay sormak iyi olur.',
          createdAt: timestampHoursAgo(2),
        }),
      ],
    },
    {
      id: threadCId,
      type: MessageThreadType.DIRECT,
      groupName: null,
      createdAt: timestampHoursAgo(34),
      updatedAt: timestampHoursAgo(8),
      unreadCount: 1,
      participants: [
        { id: me.id, username: me.username, fullName: `${me.firstName} ${me.lastName}`, avatarUrl: null, isPrivate: false },
        friends[2]!,
      ],
      lastMessage: null,
      listing: null,
      dealAgreement: null,
      messages: [
        createMessage({
          id: `${threadCId}-1`,
          threadId: threadCId,
          senderId: friends[2]!.id,
          senderUsername: friends[2]!.username,
          senderFullName: friends[2]!.fullName,
          isMine: false,
          body: 'Feeddeki bu paylasim altinda guzel yorum donmus.',
          createdAt: timestampHoursAgo(10),
        }),
        createMessage({
          id: `${threadCId}-2`,
          threadId: threadCId,
          senderId: friends[2]!.id,
          senderUsername: friends[2]!.username,
          senderFullName: friends[2]!.fullName,
          isMine: false,
          body: 'Paylasimi acip detayina da bakabilirsin.',
          messageType: MessageType.SYSTEM_CARD,
          systemCard: {
            type: SystemMessageCardType.POST_CARD,
            contentType: SharedContentType.POST,
            targetId: postCard.id,
            previewTitle: `@${postCard.owner.username}`,
            previewImageUrl: postCard.media[0]?.url ?? null,
            previewSubtitle: postCard.locationText,
          },
          createdAt: timestampHoursAgo(8),
        }),
      ],
    },
    {
      id: threadDId,
      type: MessageThreadType.DIRECT,
      groupName: null,
      createdAt: timestampHoursAgo(40),
      updatedAt: timestampHoursAgo(12),
      unreadCount: 0,
      participants: [
        { id: me.id, username: me.username, fullName: `${me.firstName} ${me.lastName}`, avatarUrl: null, isPrivate: false },
        friends[3]!,
      ],
      lastMessage: null,
      listing: null,
      dealAgreement: null,
      messages: [
        createMessage({
          id: `${threadDId}-1`,
          threadId: threadDId,
          senderId: friends[3]!.id,
          senderUsername: friends[3]!.username,
          senderFullName: friends[3]!.fullName,
          isMine: false,
          body: 'Hafta sonu icin kesfetteki araclari karsilastiriyorum.',
          createdAt: timestampHoursAgo(14),
        }),
        createMessage({
          id: `${threadDId}-2`,
          threadId: threadDId,
          senderId: me.id,
          senderUsername: me.username,
          senderFullName: `${me.firstName} ${me.lastName}`,
          isMine: true,
          body: 'Ben de profilime arac ekleyip akisi canlandirdim.',
          createdAt: timestampHoursAgo(12),
          seenAt: timestampHoursAgo(11),
        }),
      ],
    },
  ];

  const threadDetails = Object.fromEntries(details.map((detail) => [detail.id, detail]));
  const threads = details.map((detail) => toThreadSummary(detail)).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

  return {
    friends,
    threads,
    threadDetails,
  };
}


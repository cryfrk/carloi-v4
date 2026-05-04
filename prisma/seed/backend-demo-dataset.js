const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const {
  ContentVisibility,
  FuelType,
  ListingStatus,
  MediaType,
  MessageThreadType,
  MessageType,
  SellerType,
  TransmissionType,
  UserType,
  VehicleType,
} = require('@prisma/client');

const SALT_ROUNDS = 12;
const PLACEHOLDER_PASSWORD = 'replace-me';
const DEVELOPMENT_SEED_PASSWORD = 'DemoSeed123!';

const DEMO_MEDIA_KEYS = [
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
];

const DEMO_CITY_DISTRICTS = {
  Istanbul: ['Kadikoy', 'Besiktas', 'Sariyer', 'Bakirkoy', 'Umraniye', 'Beylikduzu'],
  Bursa: ['Nilufer', 'Osmangazi', 'Yildirim', 'Mudanya'],
  Ankara: ['Cankaya', 'Yenimahalle', 'Etimesgut', 'Incek'],
};

const DEMO_USER_FIXTURES = [
  {
    username: 'carloi',
    email: 'carloi@carloi.local',
    phone: '+905551110101',
    firstName: 'Carloi',
    lastName: 'Ekibi',
    userType: 'COMMERCIAL',
    tcIdentityNo: '10000000101',
    isCommercialApproved: true,
    isVerified: true,
    blueVerified: false,
    goldVerified: true,
    bio: 'Carloi resmi demo hesabi. Secili araclar ve topluluk icerikleri burada.',
    websiteUrl: 'https://carloi.example/carloi',
    locationText: 'Istanbul, Sariyer',
  },
  {
    username: 'ahmetvtec',
    email: 'ahmetvtec@carloi.local',
    phone: '+905551110102',
    firstName: 'Ahmet',
    lastName: 'Yildiz',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000102',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: false,
    goldVerified: false,
    bio: 'Honda ve ekonomisi guclu sedan sevenler icin notlar paylasiyorum.',
    websiteUrl: null,
    locationText: 'Bursa, Nilufer',
  },
  {
    username: 'selinrota',
    email: 'selinrota@carloi.local',
    phone: '+905551110103',
    firstName: 'Selin',
    lastName: 'Kaya',
    userType: 'COMMERCIAL',
    tcIdentityNo: '10000000103',
    isCommercialApproved: true,
    isVerified: true,
    blueVerified: false,
    goldVerified: true,
    bio: 'Yetkili ticari hesap. Vitrinlik hatchback ve sedan seckisi.',
    websiteUrl: 'https://carloi.example/selinrota',
    locationText: 'Istanbul, Umraniye',
  },
  {
    username: 'emrepassat',
    email: 'emrepassat@carloi.local',
    phone: '+905551110104',
    firstName: 'Emre',
    lastName: 'Tas',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000104',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: true,
    goldVerified: false,
    bio: 'Uzun yol sedanlari ve aile otomobilleri benim oyun alanim.',
    websiteUrl: null,
    locationText: 'Ankara, Cankaya',
  },
  {
    username: 'zeynepgarage',
    email: 'zeynepgarage@carloi.local',
    phone: '+905551110105',
    firstName: 'Zeynep',
    lastName: 'Celik',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000105',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: false,
    goldVerified: false,
    bio: 'Garaj notlari, gunluk surusler ve bakimli hatchback paylasimlari.',
    websiteUrl: null,
    locationText: 'Istanbul, Kadikoy',
  },
  {
    username: 'barisdetail',
    email: 'barisdetail@carloi.local',
    phone: '+905551110106',
    firstName: 'Baris',
    lastName: 'Demir',
    userType: 'COMMERCIAL',
    tcIdentityNo: '10000000106',
    isCommercialApproved: true,
    isVerified: true,
    blueVerified: false,
    goldVerified: true,
    bio: 'Detailing ve vitrinlik SUV secimleri uzerine ticari paylasimlar.',
    websiteUrl: 'https://carloi.example/barisdetail',
    locationText: 'Bursa, Osmangazi',
  },
  {
    username: 'mervegolf',
    email: 'mervegolf@carloi.local',
    phone: '+905551110107',
    firstName: 'Merve',
    lastName: 'Aydin',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000107',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: false,
    goldVerified: false,
    bio: 'Alman hatchback notlari ve gunluk sehir rotalari.',
    websiteUrl: null,
    locationText: 'Istanbul, Besiktas',
  },
  {
    username: 'okanhybrid',
    email: 'okanhybrid@carloi.local',
    phone: '+905551110108',
    firstName: 'Okan',
    lastName: 'Guler',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000108',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: true,
    goldVerified: false,
    bio: 'Hibrit ve dusuk tuketimli araclarla ilgili notlar.',
    websiteUrl: null,
    locationText: 'Ankara, Yenimahalle',
  },
  {
    username: 'cagatayrline',
    email: 'cagatayrline@carloi.local',
    phone: '+905551110109',
    firstName: 'Cagatay',
    lastName: 'Sahin',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000109',
    isCommercialApproved: false,
    isVerified: false,
    blueVerified: false,
    goldVerified: false,
    bio: 'Sportif paketleri seviyorum, sade ama iyi durmali.',
    websiteUrl: null,
    locationText: 'Bursa, Nilufer',
  },
  {
    username: 'nazliarona',
    email: 'nazliarona@carloi.local',
    phone: '+905551110110',
    firstName: 'Nazli',
    lastName: 'Yalcin',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000110',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: false,
    goldVerified: false,
    bio: 'Kompakt SUV ve sehir otomobilleri burada.',
    websiteUrl: null,
    locationText: 'Istanbul, Bakirkoy',
  },
  {
    username: 'burakxdrive',
    email: 'burakxdrive@carloi.local',
    phone: '+905551110111',
    firstName: 'Burak',
    lastName: 'Korkmaz',
    userType: 'COMMERCIAL',
    tcIdentityNo: '10000000111',
    isCommercialApproved: true,
    isVerified: true,
    blueVerified: false,
    goldVerified: true,
    bio: 'Premium sedan ve SUV secimiyle ticari vitrin.',
    websiteUrl: 'https://carloi.example/burakxdrive',
    locationText: 'Ankara, Incek',
  },
  {
    username: 'elifcity',
    email: 'elifcity@carloi.local',
    phone: '+905551110112',
    firstName: 'Elif',
    lastName: 'Acar',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000112',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: false,
    goldVerified: false,
    bio: 'Sehir ici hatchback ve bakim notlari.',
    websiteUrl: null,
    locationText: 'Bursa, Mudanya',
  },
  {
    username: 'cankorfez',
    email: 'cankorfez@carloi.local',
    phone: '+905551110113',
    firstName: 'Can',
    lastName: 'Aksoy',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000113',
    isCommercialApproved: false,
    isVerified: false,
    blueVerified: false,
    goldVerified: false,
    bio: 'Fiyat performans otomobilleri ve haftalik pazar notlari.',
    websiteUrl: null,
    locationText: 'Istanbul, Beylikduzu',
  },
  {
    username: 'ecefleet',
    email: 'ecefleet@carloi.local',
    phone: '+905551110114',
    firstName: 'Ece',
    lastName: 'Arslan',
    userType: 'COMMERCIAL',
    tcIdentityNo: '10000000114',
    isCommercialApproved: true,
    isVerified: true,
    blueVerified: false,
    goldVerified: true,
    bio: 'Filo cikisi temiz sedan ve ticari araclar.',
    websiteUrl: 'https://carloi.example/ecefleet',
    locationText: 'Bursa, Osmangazi',
  },
  {
    username: 'furkangarage',
    email: 'furkangarage@carloi.local',
    phone: '+905551110115',
    firstName: 'Furkan',
    lastName: 'Kose',
    userType: 'COMMERCIAL',
    tcIdentityNo: '10000000115',
    isCommercialApproved: true,
    isVerified: true,
    blueVerified: true,
    goldVerified: false,
    bio: 'Bakimli ticari ve aile otomobilleri ile aktif vitrin.',
    websiteUrl: 'https://carloi.example/furkangarage',
    locationText: 'Istanbul, Sariyer',
  },
  {
    username: 'melislinea',
    email: 'melislinea@carloi.local',
    phone: '+905551110116',
    firstName: 'Melis',
    lastName: 'Sezer',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000116',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: false,
    goldVerified: false,
    bio: 'Ekonomik sedan severler kulubu.',
    websiteUrl: null,
    locationText: 'Ankara, Etimesgut',
  },
  {
    username: 'serkansuv',
    email: 'serkansuv@carloi.local',
    phone: '+905551110117',
    firstName: 'Serkan',
    lastName: 'Uzun',
    userType: 'INDIVIDUAL',
    tcIdentityNo: '10000000117',
    isCommercialApproved: false,
    isVerified: true,
    blueVerified: false,
    goldVerified: false,
    bio: 'SUV ve uzun yol konforu odakli paylasimlar.',
    websiteUrl: null,
    locationText: 'Bursa, Yildirim',
  },
];

const DEMO_VEHICLE_TEMPLATES = [
  {
    brandSlug: 'fiat',
    modelSlug: 'egea',
    packageSlug: 'urban',
    brandText: 'Fiat',
    modelText: 'Egea',
    packageText: 'Urban',
    vehicleType: 'SEDAN',
    year: 2021,
    color: 'Beyaz',
    fuelType: 'DIESEL',
    transmissionType: 'AUTOMATIC',
    km: 81200,
    price: 845000,
    sellerType: 'OWNER',
    tradeAvailable: true,
    guaranteed: false,
    description: 'Bakimlari duzenli yapildi. Sehir ici ile uzun yol dengesini iyi kuran temiz kullanilmis bir sedan.',
    equipmentNotes: 'Geri gorus kamerasi, hiz sabitleyici, dokunmatik ekran',
    postCaption: 'Egea Urban ile haftalik sehir rotasi acikken ekonomi ve konfor dengesi yine sasirtmadi.',
  },
  {
    brandSlug: 'fiat',
    modelSlug: 'egea',
    packageSlug: 'lounge',
    brandText: 'Fiat',
    modelText: 'Egea',
    packageText: 'Lounge',
    vehicleType: 'SEDAN',
    year: 2022,
    color: 'Gri',
    fuelType: 'DIESEL',
    transmissionType: 'AUTOMATIC',
    km: 54200,
    price: 935000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Donanimli ve bakimli bir Egea Lounge. Aile kullanimi icin dengeli ve masraf cikarmayan bir secenek.',
    equipmentNotes: 'LED far, dijital klima, anahtarsiz giris',
    postCaption: 'Lounge pakette gunluk konfor farkini en cok aksam suruslerinde hissediyorum.',
  },
  {
    brandSlug: 'renault',
    modelSlug: 'clio',
    packageSlug: 'techno',
    brandText: 'Renault',
    modelText: 'Clio',
    packageText: 'Techno',
    vehicleType: 'HATCHBACK',
    year: 2024,
    color: 'Mavi',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 11800,
    price: 1125000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Sehir ici kullanimi kolay, kokpiti modern ve yeni nesil teknolojileri yeterli duzeyde sunan bir hatchback.',
    equipmentNotes: 'Kablosuz sarj, dijital klima, geri gorus kamerasi',
    postCaption: 'Clio Techno kucuk sinifta premium his vermeye en cok yaklasan araclardan biri.',
  },
  {
    brandSlug: 'renault',
    modelSlug: 'megane',
    packageSlug: 'icon',
    brandText: 'Renault',
    modelText: 'Megane',
    packageText: 'Icon',
    vehicleType: 'SEDAN',
    year: 2022,
    color: 'Siyah',
    fuelType: 'DIESEL',
    transmissionType: 'AUTOMATIC',
    km: 48600,
    price: 1260000,
    sellerType: 'OWNER',
    tradeAvailable: true,
    guaranteed: false,
    description: 'Genis kabin, sakin surus ve zengin ekran paketiyle gunluk kullanimda rahat hissettiren bir sedan.',
    equipmentNotes: 'Dijital gosterge, buyuk ekran, park kamerasi',
    postCaption: 'Megane Icon ile uzun yol sessizligi hala sinifina gore cok tatli geliyor.',
  },
  {
    brandSlug: 'volkswagen',
    modelSlug: 'golf',
    packageSlug: 'highline',
    brandText: 'Volkswagen',
    modelText: 'Golf',
    packageText: 'Highline',
    vehicleType: 'HATCHBACK',
    year: 2022,
    color: 'Gri',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 35800,
    price: 1495000,
    sellerType: 'DEALER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Dengeli surus karakteri ve oturmus kabin ergonomisiyle premiuma yakin hisseden bir hatchback.',
    equipmentNotes: 'Dijital kokpit, LED far, premium ses sistemi',
    postCaption: 'Golf Highline gunun sonunda hala her seyi dengeli yapan otomobil hissi veriyor.',
  },
  {
    brandSlug: 'volkswagen',
    modelSlug: 'polo',
    packageSlug: 'style',
    brandText: 'Volkswagen',
    modelText: 'Polo',
    packageText: 'Style',
    vehicleType: 'HATCHBACK',
    year: 2023,
    color: 'Beyaz',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 22400,
    price: 1185000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: false,
    description: 'Kompakt ama olgun his veren bir hatchback. Sehir ici park ve yakit dengesi guclu.',
    equipmentNotes: 'CarPlay, geri gorus kamerasi, dijital klima',
    postCaption: 'Polo Style ile park stresi az, gunluk hayat akisi daha rahat.',
  },
  {
    brandSlug: 'toyota',
    modelSlug: 'corolla',
    packageSlug: 'vision',
    brandText: 'Toyota',
    modelText: 'Corolla',
    packageText: 'Vision',
    vehicleType: 'SEDAN',
    year: 2021,
    color: 'Beyaz',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 61200,
    price: 1035000,
    sellerType: 'OWNER',
    tradeAvailable: true,
    guaranteed: false,
    description: 'Sorunsuzluk ve dusuk sahip olma maliyeti arayanlara hala guclu bir secim sunuyor.',
    equipmentNotes: 'Toyota Safety Sense, geri gorus kamerasi, otomatik klima',
    postCaption: 'Corolla Vision ile her sey sade ama yorucu degil. En guzel yani da bu.',
  },
  {
    brandSlug: 'toyota',
    modelSlug: 'corolla',
    packageSlug: 'hybrid-flame',
    brandText: 'Toyota',
    modelText: 'Corolla',
    packageText: 'Hybrid Flame',
    vehicleType: 'SEDAN',
    year: 2023,
    color: 'Kirmizi',
    fuelType: 'HYBRID',
    transmissionType: 'AUTOMATIC',
    km: 21400,
    price: 1450000,
    sellerType: 'DEALER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Sessiz calisma karakteri ve sehir ici tuketimiyle gunluk kullanimda cok rahat hissettiriyor.',
    equipmentNotes: 'Adaptif cruise, serit takip, kablosuz baglanti',
    postCaption: 'Hybrid Flame paket Corolla ile trafikte sakin kalmak ciddi avantaj sagliyor.',
  },
  {
    brandSlug: 'hyundai',
    modelSlug: 'i20',
    packageSlug: 'style',
    brandText: 'Hyundai',
    modelText: 'i20',
    packageText: 'Style',
    vehicleType: 'HATCHBACK',
    year: 2022,
    color: 'Turuncu',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 28400,
    price: 995000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: false,
    description: 'Sehir ici kullanimda cevik, multimedya tarafinda beklenti karsilayan bir hatchback.',
    equipmentNotes: 'Dokunmatik ekran, geri kamera, kablosuz CarPlay',
    postCaption: 'i20 Style ile kucuk sinifta surus kolayligi gercekten buyuk konfor demek.',
  },
  {
    brandSlug: 'honda',
    modelSlug: 'civic',
    packageSlug: 'rs',
    brandText: 'Honda',
    modelText: 'Civic',
    packageText: 'RS',
    vehicleType: 'SEDAN',
    year: 2022,
    color: 'Beyaz',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 33800,
    price: 1590000,
    sellerType: 'OWNER',
    tradeAvailable: true,
    guaranteed: false,
    description: 'Turbo motor ve genis kabin bir araya gelince aile ile keyifli surus arasinda iyi bir denge kuruyor.',
    equipmentNotes: 'Honda Sensing, sunroof, siyah jant',
    postCaption: 'Civic RS ile aksam surusunda direksiyon tepkileri hala yuz gulduruyor.',
  },
  {
    brandSlug: 'ford',
    modelSlug: 'focus',
    packageSlug: 'titanium',
    brandText: 'Ford',
    modelText: 'Focus',
    packageText: 'Titanium',
    vehicleType: 'HATCHBACK',
    year: 2021,
    color: 'Lacivert',
    fuelType: 'DIESEL',
    transmissionType: 'AUTOMATIC',
    km: 67200,
    price: 1190000,
    sellerType: 'OWNER',
    tradeAvailable: true,
    guaranteed: false,
    description: 'Yol tutusu ve direksiyon hissiyle sevenini kolay bulabilen bir hatchback.',
    equipmentNotes: 'Park sensoru, geri gorus kamerasi, adaptif far',
    postCaption: 'Focus Titanium kullananlarin cogu direksiyon hissine neden baglandigini iyi bilir.',
  },
  {
    brandSlug: 'opel',
    modelSlug: 'astra',
    packageSlug: 'gs',
    brandText: 'Opel',
    modelText: 'Astra',
    packageText: 'GS',
    vehicleType: 'HATCHBACK',
    year: 2024,
    color: 'Yesil',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 10200,
    price: 1545000,
    sellerType: 'DEALER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Yeni kasada teknoloji ve tasarim acisindan guclu duran bir hatchback.',
    equipmentNotes: '360 kamera, adaptif cruise, dijital kokpit',
    postCaption: 'Astra GS yeni jenerasyonda ilk kez bu kadar premium bir hava veriyor.',
  },
  {
    brandSlug: 'peugeot',
    modelSlug: '3008',
    packageSlug: 'gt',
    brandText: 'Peugeot',
    modelText: '3008',
    packageText: 'GT',
    vehicleType: 'SUV',
    year: 2022,
    color: 'Gri',
    fuelType: 'DIESEL',
    transmissionType: 'AUTOMATIC',
    km: 42900,
    price: 1785000,
    sellerType: 'DEALER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'SUV arayan ama tasarimdan taviz vermek istemeyenler icin guclu bir paket.',
    equipmentNotes: 'Panoramik tavan, i-Cockpit, masajli koltuk',
    postCaption: '3008 GT ile gece suruslerinde kokpit hissi baska bir seviyeye cikiyor.',
  },
  {
    brandSlug: 'dacia',
    modelSlug: 'duster',
    packageSlug: 'journey',
    brandText: 'Dacia',
    modelText: 'Duster',
    packageText: 'Journey',
    vehicleType: 'SUV',
    year: 2023,
    color: 'Kahverengi',
    fuelType: 'LPG',
    transmissionType: 'MANUAL',
    km: 24100,
    price: 1290000,
    sellerType: 'OWNER',
    tradeAvailable: true,
    guaranteed: false,
    description: 'Bozuk zemin ve sehir ici karmasi kullanim icin mantikli ve dayanikli bir SUV.',
    equipmentNotes: '360 kamera, otomatik klima, blind spot',
    postCaption: 'Duster Journey yol bitince de devam edebilme hissi verdigi icin seviliyor.',
  },
  {
    brandSlug: 'bmw',
    modelSlug: '3-series',
    packageSlug: 'm-sport',
    brandText: 'BMW',
    modelText: '3 Series',
    packageText: 'M Sport',
    vehicleType: 'SEDAN',
    year: 2021,
    color: 'Siyah',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 39800,
    price: 2440000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: false,
    description: 'Direksiyon hissi ve dengesiyle premium sedan tarafinda hala cok kuvvetli bir referans.',
    equipmentNotes: 'M aerodinamik kit, sunroof, premium ses sistemi',
    postCaption: '3 Series M Sport ile surus keyfi konusu hala cok net bicimde hissediliyor.',
  },
  {
    brandSlug: 'mercedes-benz',
    modelSlug: 'c-serisi',
    packageSlug: 'amg',
    brandText: 'Mercedes-Benz',
    modelText: 'C Serisi',
    packageText: 'AMG',
    vehicleType: 'SEDAN',
    year: 2023,
    color: 'Gumus',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 18300,
    price: 3015000,
    sellerType: 'DEALER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Yeni nesil ic mekan kalitesi ve yumusak surus karakteriyle premium his veren bir sedan.',
    equipmentNotes: 'Burmester, ambiyans aydinlatma, 360 kamera',
    postCaption: 'Yeni C Serisi AMG ile kabin atmosferi ve sessizlik bekledigimden iyi cikti.',
  },
  {
    brandSlug: 'audi',
    modelSlug: 'a3',
    packageSlug: 's-line',
    brandText: 'Audi',
    modelText: 'A3',
    packageText: 'S Line',
    vehicleType: 'SEDAN',
    year: 2022,
    color: 'Gri',
    fuelType: 'GASOLINE',
    transmissionType: 'AUTOMATIC',
    km: 27600,
    price: 1945000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: false,
    description: 'Kompakt premium sinifta sade ama kaliteli bir karakter arayanlar icin guclu bir secenek.',
    equipmentNotes: 'Virtual cockpit, spor koltuk, matrix LED',
    postCaption: 'A3 S Line gorsel olarak sakin ama kaliteli oldugunu hemen hissettiriyor.',
  },
  {
    brandSlug: 'togg',
    modelSlug: 't10x',
    packageSlug: 'v2',
    brandText: 'TOGG',
    modelText: 'T10X',
    packageText: 'V2',
    vehicleType: 'SUV',
    year: 2024,
    color: 'Anadolu',
    fuelType: 'ELECTRIC',
    transmissionType: 'AUTOMATIC',
    km: 8600,
    price: 1835000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Elektrikli SUV tarafinda yerli ve yeni nesil ekran deneyimi sunan dikkat cekici bir secenek.',
    equipmentNotes: 'Buyuk ekran, adaptif destekler, kablosuz baglanti',
    postCaption: 'T10X V2 ile ilk uzun kullanimi yaptiktan sonra ekran ve sessizlik tarafini not ettim.',
  },
  {
    brandSlug: 'volkswagen',
    modelSlug: 'passat',
    packageSlug: 'business',
    brandText: 'Volkswagen',
    modelText: 'Passat',
    packageText: 'Business',
    vehicleType: 'SEDAN',
    year: 2020,
    color: 'Lacivert',
    fuelType: 'DIESEL',
    transmissionType: 'AUTOMATIC',
    km: 93400,
    price: 1580000,
    sellerType: 'DEALER',
    tradeAvailable: true,
    guaranteed: false,
    description: 'Uzun yol odakli, sessiz ve genis ic hacimli klasik bir D segment sedan.',
    equipmentNotes: 'Ergo koltuklar, adaptif cruise, dijital klima',
    postCaption: 'Passat Business ile uzun yol sakinligi hala cok kuvvetli bir artisi olarak kaliyor.',
  },
  {
    brandSlug: 'toyota',
    modelSlug: 'c-hr',
    packageSlug: 'hybrid-passion',
    brandText: 'Toyota',
    modelText: 'C-HR',
    packageText: 'Hybrid Passion',
    vehicleType: 'SUV',
    year: 2023,
    color: 'Beyaz',
    fuelType: 'HYBRID',
    transmissionType: 'AUTOMATIC',
    km: 18700,
    price: 1715000,
    sellerType: 'OWNER',
    tradeAvailable: false,
    guaranteed: true,
    description: 'Farkli tasarim dili ve hibrit karakteriyle sehir hayatina iyi uyum saglayan bir crossover.',
    equipmentNotes: 'JBL ses sistemi, Toyota Safety Sense, kablosuz baglanti',
    postCaption: 'C-HR Hybrid Passion sehir trafiginde hem tasarim hem tuketim tarafinda dikkat cekiyor.',
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildDemoVehicleFixtures() {
  const publicOwnerUsers = [
    'pendingdealer',
    'ahmetvtec',
    'emrepassat',
    'zeynepgarage',
    'mervegolf',
    'okanhybrid',
    'cagatayrline',
    'nazliarona',
    'elifcity',
    'cankorfez',
    'melislinea',
    'serkansuv',
  ];
  const publicDealerUsers = [
    'democommercial',
    'carloi',
    'selinrota',
    'barisdetail',
    'burakxdrive',
    'ecefleet',
    'furkangarage',
  ];
  const inventoryOwners = [
    'demoindividual',
    'ahmetvtec',
    'emrepassat',
    'zeynepgarage',
    'mervegolf',
    'okanhybrid',
    'cagatayrline',
    'nazliarona',
    'elifcity',
    'cankorfez',
    'melislinea',
    'serkansuv',
  ];
  const inventoryDealers = [
    'democommercial',
    'carloi',
    'selinrota',
    'barisdetail',
    'burakxdrive',
    'ecefleet',
    'furkangarage',
  ];
  const cityNames = Object.keys(DEMO_CITY_DISTRICTS);
  const fixtures = [];
  let publicOwnerIndex = 0;
  let publicDealerIndex = 0;
  let inventoryOwnerIndex = 0;
  let inventoryDealerIndex = 0;

  for (let index = 0; index < 48; index += 1) {
    const template = DEMO_VEHICLE_TEMPLATES[index % DEMO_VEHICLE_TEMPLATES.length];
    const city = cityNames[index % cityNames.length];
    const districtOptions = DEMO_CITY_DISTRICTS[city];
    const district = districtOptions[index % districtOptions.length];
    const isPublic = index < 18;
    let ownerUsername;

    if (template.sellerType === 'DEALER') {
      ownerUsername = isPublic
        ? publicDealerUsers[publicDealerIndex++ % publicDealerUsers.length]
        : inventoryDealers[inventoryDealerIndex++ % inventoryDealers.length];
    } else {
      ownerUsername = isPublic
        ? publicOwnerUsers[publicOwnerIndex++ % publicOwnerUsers.length]
        : inventoryOwners[inventoryOwnerIndex++ % inventoryOwners.length];
    }
    const ordinal = index + 3;
    const priceAdjustment = (index % 5) * 35000 - 50000 + Math.floor(index / 12) * 15000;
    const kmAdjustment = (index % 6) * 4200 + Math.floor(index / 8) * 1800;
    const price = Math.max(425000, template.price + priceAdjustment);
    const km = Math.max(6500, template.km + kmAdjustment);
    const year = clamp(template.year - (index % 3 === 0 ? 1 : 0), 2017, 2025);
    const mediaKey = DEMO_MEDIA_KEYS[index % DEMO_MEDIA_KEYS.length];
    const secondaryMediaKey = DEMO_MEDIA_KEYS[(index + 3) % DEMO_MEDIA_KEYS.length];
    const heavyDamage = index % 11 === 0;
    const guaranteed = template.guaranteed || index % 6 === 0;
    const tradeAvailable = template.tradeAvailable || index % 4 === 0;

    fixtures.push({
      key: `demo-seed-${String(ordinal).padStart(3, '0')}`,
      ownerUsername,
      city,
      district,
      year,
      price,
      km,
      plateNumber: `34DMO${String(ordinal).padStart(3, '0')}`,
      listingNo: `CLV4-2026-${String(ordinal).padStart(4, '0')}`,
      title: `${year} ${template.brandText} ${template.modelText} ${template.packageText}`,
      description: heavyDamage
        ? `${template.description} Tramer kaydi bulunuyor, detaylar ekspertiz raporuyla paylasilir.`
        : guaranteed
          ? `${template.description} Yetkili servis bakimli, garanti devam ediyor.`
          : template.description,
      equipmentNotes: guaranteed
        ? `${template.equipmentNotes}, garanti devam ediyor`
        : template.equipmentNotes,
      caption: template.postCaption,
      mediaUrls: [mediaKey, secondaryMediaKey],
      noPaint: index % 5 !== 0,
      noChangedParts: index % 7 !== 0,
      heavyDamage,
      guaranteed,
      tradeAvailable,
      isPublic,
      showInExplore: isPublic,
      openToOffers: isPublic ? index % 3 !== 0 : index % 4 === 0,
      ...template,
    });
  }

  return fixtures;
}

function buildDemoThreadFixtures(listingFixtures) {
  const demoListings = listingFixtures.slice(0, 15);
  const threads = [];
  const buyerPool = [
    'demoindividual',
    'pendingdealer',
    'ahmetvtec',
    'zeynepgarage',
    'mervegolf',
    'okanhybrid',
    'nazliarona',
    'elifcity',
    'cankorfez',
    'melislinea',
  ];

  for (let index = 0; index < 15; index += 1) {
    const fixture = demoListings[index];
    const buyerUsername = buyerPool[index % buyerPool.length];
    const sellerUsername = fixture.ownerUsername;

    threads.push({
      id: `demo-thread-listing-${String(index + 1).padStart(2, '0')}`,
      type: 'LISTING_DEAL',
      listingNo: fixture.listingNo,
      participantUsernames: [buyerUsername, sellerUsername],
      messages: [
        { senderUsername: buyerUsername, body: `${fixture.title} hala ilanda mi?`, minutesAgo: 180 - index * 3 },
        { senderUsername: sellerUsername, body: 'Evet, arac aktif. Dilerseniz detayli bilgi paylasabilirim.', minutesAgo: 175 - index * 3 },
        { senderUsername: buyerUsername, body: `KM ve boya durumu hakkinda net bilgi alabilir miyim?`, minutesAgo: 170 - index * 3 },
        { senderUsername: sellerUsername, body: fixture.noPaint ? 'Kaporta temiz, ciddi bir masraf gormedi.' : 'Bir iki lokal boya var, detaylarini iletebilirim.', minutesAgo: 165 - index * 3 },
      ],
    });
  }

  const directPairs = [
    ['carloi', 'ahmetvtec'],
    ['selinrota', 'emrepassat'],
    ['barisdetail', 'mervegolf'],
    ['okanhybrid', 'zeynepgarage'],
    ['nazliarona', 'cankorfez'],
    ['ecefleet', 'furkangarage'],
    ['melislinea', 'serkansuv'],
    ['burakxdrive', 'elifcity'],
    ['demoindividual', 'carloi'],
    ['democommercial', 'ahmetvtec'],
    ['pendingdealer', 'selinrota'],
    ['barisdetail', 'okanhybrid'],
    ['mervegolf', 'nazliarona'],
    ['emrepassat', 'melislinea'],
    ['zeynepgarage', 'serkansuv'],
  ];

  directPairs.forEach((pair, index) => {
    threads.push({
      id: `demo-thread-direct-${String(index + 1).padStart(2, '0')}`,
      type: 'DIRECT',
      listingNo: null,
      participantUsernames: pair,
      messages: [
        { senderUsername: pair[0], body: 'Selam, son paylastigin aracin surus notlari cok faydaliydi.', minutesAgo: 120 - index * 2 },
        { senderUsername: pair[1], body: 'Tesekkurler, yarin yeni bir karsilastirma daha paylasacagim.', minutesAgo: 116 - index * 2 },
        { senderUsername: pair[0], body: 'Harika, ozellikle fiyat performans yorumlarini takip ediyorum.', minutesAgo: 112 - index * 2 },
      ],
    });
  });

  return threads;
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

async function upsertDemoUser(prisma, {
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

async function upsertDemoProfile(prisma, {
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

const vehicleCatalogRefCache = new Map();

async function resolveVehicleCatalogRefs(prisma, brandSlug, modelSlug, packageSlug) {
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

async function replaceGarageVehicleMedia(prisma, garageVehicleId, mediaUrls) {
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

async function replaceListingMedia(prisma, listingId, mediaUrls) {
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

async function replacePostMedia(prisma, postId, mediaUrls) {
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

async function replaceVehicleExtraEquipment(prisma, vehicleId, notes) {
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

async function replaceListingDamageParts(prisma, listingId, fixture) {
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

async function seedBackendDemoData(prisma) {
  const developmentSeedPassword = getDevelopmentSeedPassword();
  const sharedPassword = readPassword(
    'SEED_USER_PASSWORD',
    readPassword('ADMIN_SEED_PASSWORD', developmentSeedPassword),
  );

  if (!sharedPassword) {
    throw new Error(
      'Missing seed password for backend demo dataset. Set SEED_USER_PASSWORD or ADMIN_SEED_PASSWORD before running prisma seed.',
    );
  }

  const passwordHash = await bcrypt.hash(sharedPassword, SALT_ROUNDS);
  const baseUsers = [
    {
      username: 'demoindividual',
      email: 'demo.individual@carloi.local',
      phone: '+905551110001',
      firstName: 'Emre',
      lastName: 'Yilmaz',
      userType: UserType.INDIVIDUAL,
      tcIdentityNo: '10000000001',
      isCommercialApproved: false,
      isVerified: true,
      blueVerified: true,
      goldVerified: false,
      bio: 'Carloi demo hesabim. Temiz bakimli aile araci ariyorum.',
      websiteUrl: 'https://carloi.example/demoindividual',
      locationText: 'Istanbul, Kadikoy',
    },
    {
      username: 'democommercial',
      email: 'demo.commercial@carloi.local',
      phone: '+905551110002',
      firstName: 'Selin',
      lastName: 'Kaya',
      userType: UserType.COMMERCIAL,
      tcIdentityNo: '10000000002',
      isCommercialApproved: true,
      isVerified: true,
      blueVerified: false,
      goldVerified: true,
      bio: 'Yetkili ticari hesap. Expertizli secili araclar.',
      websiteUrl: 'https://carloi.example/democommercial',
      locationText: 'Istanbul, Umraniye',
    },
    {
      username: 'pendingdealer',
      email: 'pending.dealer@carloi.local',
      phone: '+905551110003',
      firstName: 'Kerem',
      lastName: 'Demir',
      userType: UserType.INDIVIDUAL,
      tcIdentityNo: '10000000003',
      isCommercialApproved: false,
      isVerified: false,
      blueVerified: false,
      goldVerified: false,
      bio: 'Basvuru asamasinda ticari hesap ornegi.',
      websiteUrl: 'https://carloi.example/pendingdealer',
      locationText: 'Ankara, Cankaya',
    },
    ...DEMO_USER_FIXTURES.map((fixture) => ({
      ...fixture,
      userType: UserType[fixture.userType],
    })),
  ];

  const usersByUsername = new Map();

  for (const fixture of baseUsers) {
    const user = await upsertDemoUser(prisma, {
      username: fixture.username,
      email: fixture.email,
      phone: fixture.phone,
      firstName: fixture.firstName,
      lastName: fixture.lastName,
      passwordHash,
      userType: fixture.userType,
      tcIdentityNo: fixture.tcIdentityNo,
      isCommercialApproved: fixture.isCommercialApproved,
      isVerified: fixture.isVerified,
    });

    await upsertDemoProfile(prisma, {
      userId: user.id,
      avatarUrl: null,
      bio: fixture.bio,
      websiteUrl: fixture.websiteUrl,
      locationText: fixture.locationText,
      blueVerified: fixture.blueVerified,
      goldVerified: fixture.goldVerified,
    });

    usersByUsername.set(fixture.username, user);
  }

  const allUsers = [...usersByUsername.values()];
  for (let index = 0; index < allUsers.length; index += 1) {
    const follower = allUsers[index];
    const following = allUsers[(index + 1) % allUsers.length];
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: follower.id,
          followingId: following.id,
        },
      },
      update: {},
      create: {
        followerId: follower.id,
        followingId: following.id,
      },
    });
  }

  const existingVehicles = await prisma.garageVehicle.findMany({
    where: {
      plateNumber: { in: ['34ABC001', '34ABC002'] },
    },
  });

  for (const vehicle of existingVehicles) {
    await prisma.garageVehicle.update({
      where: { id: vehicle.id },
      data: {
        showInExplore: true,
        openToOffers: true,
        isPublic: true,
      },
    });

    await replaceGarageVehicleMedia(prisma, vehicle.id, ['demo://car-01', 'demo://car-02']);
  }

  const existingListings = await prisma.listing.findMany({
    where: {
      listingNo: { in: ['CLV4-2026-0001', 'CLV4-2026-0002'] },
    },
  });

  for (const listing of existingListings) {
    await replaceListingMedia(prisma, listing.id, ['demo://car-01', 'demo://car-03']);
  }

  const existingPosts = await prisma.post.findMany({
    where: {
      caption: {
        in: [
          'Hafta sonu detayli yikama sonrasi Egea ile uzun yol hazirligi tamam.',
          'Bu hafta vitrinde Golf Highline ve iki yeni hatchback ilan daha var.',
        ],
      },
    },
  });

  for (const post of existingPosts) {
    await replacePostMedia(prisma, post.id, ['demo://car-01']);
  }

  const vehicleFixtures = buildDemoVehicleFixtures();
  const listingsByNo = new Map();

  for (const fixture of vehicleFixtures) {
    const owner = usersByUsername.get(fixture.ownerUsername);

    if (!owner) {
      throw new Error(`Missing owner for demo fixture: ${fixture.ownerUsername}`);
    }

    const refs = await resolveVehicleCatalogRefs(
      prisma,
      fixture.brandSlug,
      fixture.modelSlug,
      fixture.packageSlug,
    );

    const vehicle = await prisma.garageVehicle.upsert({
      where: { plateNumber: fixture.plateNumber },
      update: {
        ownerId: owner.id,
        brandId: refs.brand.id,
        modelId: refs.model.id,
        vehiclePackageId: refs.vehiclePackage.id,
        vehicleType: VehicleType[fixture.vehicleType],
        brandText: fixture.brandText,
        modelText: fixture.modelText,
        packageText: fixture.packageText,
        year: fixture.year,
        color: fixture.color,
        fuelType: FuelType[fixture.fuelType],
        transmissionType: TransmissionType[fixture.transmissionType],
        km: fixture.km,
        isPublic: fixture.isPublic,
        description: fixture.description,
        equipmentNotes: fixture.equipmentNotes,
        showInExplore: fixture.showInExplore,
        openToOffers: fixture.openToOffers,
        deletedAt: null,
      },
      create: {
        ownerId: owner.id,
        brandId: refs.brand.id,
        modelId: refs.model.id,
        vehiclePackageId: refs.vehiclePackage.id,
        vehicleType: VehicleType[fixture.vehicleType],
        brandText: fixture.brandText,
        modelText: fixture.modelText,
        packageText: fixture.packageText,
        year: fixture.year,
        plateNumber: fixture.plateNumber,
        color: fixture.color,
        fuelType: FuelType[fixture.fuelType],
        transmissionType: TransmissionType[fixture.transmissionType],
        km: fixture.km,
        isPublic: fixture.isPublic,
        description: fixture.description,
        equipmentNotes: fixture.equipmentNotes,
        showInExplore: fixture.showInExplore,
        openToOffers: fixture.openToOffers,
      },
    });

    await replaceGarageVehicleMedia(prisma, vehicle.id, fixture.mediaUrls);
    await replaceVehicleExtraEquipment(prisma, vehicle.id, fixture.equipmentNotes);

    const listing = await prisma.listing.upsert({
      where: { listingNo: fixture.listingNo },
      update: {
        sellerId: owner.id,
        garageVehicleId: vehicle.id,
        title: fixture.title,
        description: fixture.description,
        price: fixture.price.toFixed(2),
        currency: 'TRY',
        city: fixture.city,
        district: fixture.district,
        listingStatus: ListingStatus.ACTIVE,
        sellerType: SellerType[fixture.sellerType],
        tradeAvailable: fixture.tradeAvailable,
        contactPhone: owner.phone,
        showPhone: true,
        plateNumber: fixture.plateNumber,
        plateNumberHash: hashPlate(fixture.plateNumber),
        licenseOwnerName: `${owner.firstName} ${owner.lastName}`,
        licenseOwnerTcNo: owner.tcIdentityNo,
        isLicenseVerified: true,
        hasExpertiseReport: false,
        ownerAuthorizationRequired: false,
        deletedAt: null,
      },
      create: {
        sellerId: owner.id,
        garageVehicleId: vehicle.id,
        title: fixture.title,
        description: fixture.description,
        price: fixture.price.toFixed(2),
        currency: 'TRY',
        city: fixture.city,
        district: fixture.district,
        listingNo: fixture.listingNo,
        listingStatus: ListingStatus.ACTIVE,
        sellerType: SellerType[fixture.sellerType],
        tradeAvailable: fixture.tradeAvailable,
        contactPhone: owner.phone,
        showPhone: true,
        plateNumber: fixture.plateNumber,
        plateNumberHash: hashPlate(fixture.plateNumber),
        licenseOwnerName: `${owner.firstName} ${owner.lastName}`,
        licenseOwnerTcNo: owner.tcIdentityNo,
        isLicenseVerified: true,
        hasExpertiseReport: false,
        ownerAuthorizationRequired: false,
      },
    });

    await replaceListingMedia(prisma, listing.id, fixture.mediaUrls);
    await replaceListingDamageParts(prisma, listing.id, fixture);
    listingsByNo.set(fixture.listingNo, listing);

    const postId = `demo-post-${String(fixture.listingNo.split('-').pop()).padStart(4, '0')}`;
    const createdAt = new Date(Date.now() - Number(fixture.km) * 1200);
    const post = await prisma.post.upsert({
      where: { id: postId },
      update: {
        ownerId: owner.id,
        caption: fixture.caption,
        locationText: `${fixture.city}, ${fixture.district}`,
        visibility: ContentVisibility.PUBLIC,
      },
      create: {
        id: postId,
        ownerId: owner.id,
        caption: fixture.caption,
        locationText: `${fixture.city}, ${fixture.district}`,
        visibility: ContentVisibility.PUBLIC,
        createdAt,
      },
    });

    await replacePostMedia(prisma, post.id, fixture.mediaUrls.slice(0, 1));
  }

  const demoThreads = buildDemoThreadFixtures(vehicleFixtures);

  for (const threadFixture of demoThreads) {
    const listing = threadFixture.listingNo ? listingsByNo.get(threadFixture.listingNo) : null;
    const participants = threadFixture.participantUsernames.map((username) => {
      const user = usersByUsername.get(username);
      if (!user) {
        throw new Error(`Missing participant for demo thread: ${username}`);
      }
      return user;
    });

    const thread = await prisma.messageThread.upsert({
      where: { id: threadFixture.id },
      update: {
        type: MessageThreadType[threadFixture.type],
        listingId: listing?.id ?? null,
        groupName: null,
      },
      create: {
        id: threadFixture.id,
        type: MessageThreadType[threadFixture.type],
        listingId: listing?.id ?? null,
      },
    });

    for (const participant of participants) {
      await prisma.messageThreadParticipant.upsert({
        where: {
          threadId_userId: {
            threadId: thread.id,
            userId: participant.id,
          },
        },
        update: {},
        create: {
          threadId: thread.id,
          userId: participant.id,
        },
      });
    }

    await prisma.message.deleteMany({
      where: { threadId: thread.id },
    });

    const now = Date.now();
    await prisma.message.createMany({
      data: threadFixture.messages.map((message, index) => {
        const sender = usersByUsername.get(message.senderUsername);
        if (!sender) {
          throw new Error(`Missing sender for demo thread message: ${message.senderUsername}`);
        }

        return {
          id: `${thread.id}-message-${String(index + 1).padStart(2, '0')}`,
          threadId: thread.id,
          senderId: sender.id,
          body: message.body,
          messageType: MessageType.TEXT,
          seenAt:
            index < threadFixture.messages.length - 1
              ? new Date(now - message.minutesAgo * 60000 + 120000)
              : null,
          createdAt: new Date(now - message.minutesAgo * 60000),
        };
      }),
    });
  }

  console.log(
    `Seeded backend demo data: users=${baseUsers.length} listings=50 posts=50 vehicles=${vehicleFixtures.length + 2} threads=${demoThreads.length}`,
  );
}

module.exports = {
  DEMO_CITY_DISTRICTS,
  DEMO_MEDIA_KEYS,
  DEMO_USER_FIXTURES,
  DEMO_VEHICLE_TEMPLATES,
  buildDemoThreadFixtures,
  buildDemoVehicleFixtures,
  seedBackendDemoData,
};

export type PlaceholderScreenDefinition = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
};

export const webScreens: PlaceholderScreenDefinition[] = [
  {
    slug: '',
    label: 'Home',
    eyebrow: 'Marketplace + Social Layer',
    title: 'Carloi V4 Home',
    description: 'Arac kesfi, sosyal feed ve lojik akislari ayni deneyimde birlestirecek ana merkez.',
    bullets: ['Kisilesmis feed alani', 'Hizli ilan kesfi', 'Gelecekte moduler widget yapisi'],
  },
  {
    slug: 'listings',
    label: 'Listings',
    eyebrow: 'Trade Layer',
    title: 'Listings Workspace',
    description: 'Filtreleme, fiyat karsilastirma ve yayin yonetimi icin genisleyebilir listeleme zemini.',
    bullets: ['Arama ve filtre kabugu', 'Ilan detay akisina hazir', 'Moderasyon durumuna uygun model'],
  },
  {
    slug: 'messages',
    label: 'Messages',
    eyebrow: 'Conversation Layer',
    title: 'Messages Center',
    description: 'Alici, satici ve ticari hesaplar arasi sohbet akislarini yonetecek alan.',
    bullets: ['Thread bazli mimari', 'Bildirim baglantilari', 'Canli mesaj altyapisina hazir'],
  },
  {
    slug: 'loi-ai',
    label: 'LoiAI',
    eyebrow: 'AI Layer',
    title: 'LoiAI Assistant',
    description: 'Arac analizi, ilani guclendirme ve kullanici rehberligi icin AI modulu giris noktasi.',
    bullets: ['Prompt temelli arac yardimcisi', 'OpenAI ve DeepSeek entegrasyonuna hazir', 'Gorev temelli panel taslagi'],
  },
  {
    slug: 'create',
    label: 'Create',
    eyebrow: 'Creator Flow',
    title: 'Create Listing',
    description: 'Yeni ilan ve sosyal icerik uretimi icin ileride cok adimli forma donusecek taslak ekran.',
    bullets: ['Adim adim form altyapisi', 'Medya yukleme baglantisi', 'Taslak kaydetme akisi'],
  },
  {
    slug: 'notifications',
    label: 'Notifications',
    eyebrow: 'Engagement Layer',
    title: 'Notifications Hub',
    description: 'Takip, mesaj, satis ve admin olaylarini tek kutuda toplayacak yer.',
    bullets: ['Okundu durumu', 'Bildirim gruplama', 'Gercek zamanli event akisi'],
  },
  {
    slug: 'explore',
    label: 'Explore',
    eyebrow: 'Discovery Layer',
    title: 'Vehicle Explore',
    description: 'Kesfete acik araclarin reels benzeri dikey akis icinde onerildigi yeni merkez.',
    bullets: ['Tam ekran arac akisi', 'Mesaj ve teklif aksiyonlari', 'Profildeki arac koleksiyonu ile bagli'],
  },
  {
    slug: 'profile',
    label: 'Profile',
    eyebrow: 'Identity Layer',
    title: 'Profile Space',
    description: 'Bireysel ve ticari kullanici profillerinin sosyal ve ticari kimligini birlestiren ekran.',
    bullets: ['Takip metrikleri', 'Ilan koleksiyonu', 'Profil duzenleme akisi'],
  },
  {
    slug: 'settings',
    label: 'Settings',
    eyebrow: 'System Layer',
    title: 'Settings & Preferences',
    description: 'Guvenlik, bildirim, odeme ve entegrasyon tercihleri icin ayrilmis yonetim bolgesi.',
    bullets: ['Tercih gruplari', 'Guvenlik ayarlari', 'Entegrasyon anahtarlari icin temel alan'],
  },
];

export const screenMap = Object.fromEntries(
  webScreens.map((screen) => [screen.slug || 'home', screen]),
) as Record<string, PlaceholderScreenDefinition>;

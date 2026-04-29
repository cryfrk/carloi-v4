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
    slug: 'garage',
    label: 'Garage',
    eyebrow: 'Ownership Layer',
    title: 'Garage Overview',
    description: 'Kullanicinin arac portfoyunu, servis notlarini ve bagli ilanlarini yonetecek bolum.',
    bullets: ['Arac kartlari', 'Ilan iliskileri', 'OBD ve servis genislemelerine hazir'],
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
  }
];

export const adminDesktopScreens: PlaceholderScreenDefinition[] = [
  {
    slug: 'login',
    label: 'Login',
    eyebrow: 'Access Control',
    title: 'Admin Sign In',
    description: 'Rol bazli masaustu yonetim girisinin ilk kapisi.',
    bullets: ['Rol kontrollu giris', '2FA alanina hazir', 'Denetim kaydina entegre edilebilir'],
  },
  {
    slug: 'dashboard',
    label: 'Dashboard',
    eyebrow: 'Operations Core',
    title: 'Operations Dashboard',
    description: 'Yonetim takimi icin ozet KPI ve is kuyruklarini toplayan panel.',
    bullets: ['KPI kartlari', 'Kritik is akislari', 'Rol bazli gorunum'],
  },
  {
    slug: 'users',
    label: 'Users',
    eyebrow: 'Trust & Safety',
    title: 'User Review Queue',
    description: 'Kullanici inceleme, durum guncelleme ve risk sinyalleri icin liste ekrani.',
    bullets: ['Arama ve filtre', 'Profil aksiyonlari', 'Moderasyon gecmisi'],
  },
  {
    slug: 'listings',
    label: 'Listings',
    eyebrow: 'Marketplace Moderation',
    title: 'Listing Moderation',
    description: 'Ilanlarin yayin, revizyon ve kaldirma operasyonlari icin ayrilmis alan.',
    bullets: ['Moderasyon kuyrugu', 'Icerik denetimi', 'Durum degisiklik akisleri'],
  },
  {
    slug: 'commercial-approvals',
    label: 'Commercial Approvals',
    eyebrow: 'B2B Workflow',
    title: 'Commercial Approvals',
    description: 'Ticari hesap basvurulari ve evrak inceleme surecini destekleyen ekran.',
    bullets: ['Basvuru listesi', 'Onay/reddet aksiyonlari', 'Belge dogrulama noktasi'],
  },
  {
    slug: 'insurance-requests',
    label: 'Insurance Requests',
    eyebrow: 'Insurance Ops',
    title: 'Insurance Requests',
    description: 'Sigorta taleplerinin kuyruk, inceleme ve sonuc adimlari icin temel panel.',
    bullets: ['Talep durumu', 'Arac baglantisi', 'Admin aksiyonlari'],
  },
  {
    slug: 'payments',
    label: 'Payments',
    eyebrow: 'Finance Layer',
    title: 'Payments Monitor',
    description: 'Odeme olaylari ve hata durumlarini gormek icin ayrilmis operasyon bolumu.',
    bullets: ['Odeme durumu', 'Saglayici referansi', 'Mutabakat icin zemin'],
  },
  {
    slug: 'audit-logs',
    label: 'Audit Logs',
    eyebrow: 'Governance Layer',
    title: 'Audit Trail',
    description: 'Admin hareketleri ve kritik is akislari icin degismez kayit gorunumu.',
    bullets: ['Zaman cizelgesi', 'Aktor bilgisi', 'Filtrelenebilir olaylar'],
  }
];

export type PlaceholderScreenDefinition = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
};

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
  },
];

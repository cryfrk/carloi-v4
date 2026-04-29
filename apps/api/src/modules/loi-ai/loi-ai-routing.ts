export type LoiAiTaskKind =
  | 'SEARCH'
  | 'COMPARISON'
  | 'TECHNICAL'
  | 'SELLER_QUESTIONS'
  | 'DESCRIPTION'
  | 'GENERAL';

const COMPLEX_KEYWORDS = [
  'karsilastir',
  'karşılaştır',
  'hangisi',
  'kronik',
  'ariza',
  'arıza',
  'teknik',
  'paket fark',
  'motor',
  'expertiz',
  'ekspertiz',
  'yorumla',
  'degerlendir',
  'değerlendir',
  'uzman',
] as const;

const SEARCH_KEYWORDS = [
  'ilan',
  'ara',
  'bul',
  'goster',
  'göster',
  'kullanici',
  'kullanıcı',
  'profil',
  'post',
  'gonderi',
  'gönderi',
] as const;

const DESCRIPTION_KEYWORDS = ['ilan aciklamasi', 'ilan açıklaması', 'aciklama yaz', 'açıklama yaz'] as const;
const SELLER_QUESTION_KEYWORDS = ['saticiya sor', 'satıcıya sor', 'sorular uret', 'sorular üret'] as const;

export function normalizeLoiAiText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

export function detectLoiAiTaskKinds(content: string): LoiAiTaskKind[] {
  const normalized = normalizeLoiAiText(content);
  const tasks = new Set<LoiAiTaskKind>();

  if (DESCRIPTION_KEYWORDS.some((keyword) => normalized.includes(normalizeLoiAiText(keyword)))) {
    tasks.add('DESCRIPTION');
  }

  if (
    SELLER_QUESTION_KEYWORDS.some((keyword) => normalized.includes(normalizeLoiAiText(keyword))) ||
    (normalized.includes('sor') && normalized.includes('satici'))
  ) {
    tasks.add('SELLER_QUESTIONS');
  }

  if (COMPLEX_KEYWORDS.some((keyword) => normalized.includes(normalizeLoiAiText(keyword)))) {
    tasks.add('TECHNICAL');
  }

  if (normalized.includes('karsilastir') || normalized.includes('karşılaştır') || normalized.includes('kiyasla')) {
    tasks.add('COMPARISON');
  }

  if (
    SEARCH_KEYWORDS.some((keyword) => normalized.includes(normalizeLoiAiText(keyword))) ||
    /clv4-[a-z0-9-]+/i.test(content) ||
    /@[a-z0-9._-]+/i.test(content)
  ) {
    tasks.add('SEARCH');
  }

  if (tasks.size === 0) {
    tasks.add('GENERAL');
  }

  return [...tasks];
}

export function choosePreferredProvider(tasks: LoiAiTaskKind[]) {
  if (tasks.includes('COMPARISON') || tasks.includes('TECHNICAL') || tasks.includes('DESCRIPTION')) {
    return 'OPENAI' as const;
  }

  if (tasks.includes('SEARCH') || tasks.includes('SELLER_QUESTIONS')) {
    return 'DEEPSEEK' as const;
  }

  return 'DEEPSEEK' as const;
}


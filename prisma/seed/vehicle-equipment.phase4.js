const CATEGORY = {
  SAFETY: 'SAFETY',
  COMFORT: 'COMFORT',
  MULTIMEDIA: 'MULTIMEDIA',
  EXTERIOR: 'EXTERIOR',
  INTERIOR: 'INTERIOR',
  DRIVING_ASSIST: 'DRIVING_ASSIST',
  LIGHTING: 'LIGHTING',
  OTHER: 'OTHER',
};

const SOURCE = {
  PHASE4: 'CARLOI_PHASE4_SEED',
};

function normalize(value) {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9cigiosu]+/g, ' ')
    .trim();
}

function key(brandName, modelName) {
  return `${normalize(brandName)}::${normalize(modelName)}`;
}

function hasAny(packageName, values) {
  const normalized = normalize(packageName);
  return values.some((value) => normalized.includes(normalize(value)));
}

function group(category, names) {
  return names.map((name) => ({ category, name }));
}

function combine(...groups) {
  return groups.flat();
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const itemKey = `${item.category}::${normalize(item.name)}`;
    if (seen.has(itemKey)) {
      return false;
    }
    seen.add(itemKey);
    return true;
  });
}

function buildRows(packageId, items, manualReviewNeeded = false) {
  return dedupe(items).map((item) => ({
    packageId,
    category: item.category,
    name: item.name,
    isStandard: true,
    source: SOURCE.PHASE4,
    manualReviewNeeded,
    isActive: true,
  }));
}

const fallbackItems = combine(
  group(CATEGORY.SAFETY, ['ABS', 'Hava yastigi']),
  group(CATEGORY.COMFORT, ['Klima', 'Merkezi kilit']),
);

const commonEntry = combine(
  group(CATEGORY.SAFETY, ['ABS', 'ESP', 'On hava yastiklari']),
  group(CATEGORY.COMFORT, ['Klima', 'Elektrikli on camlar']),
  group(CATEGORY.MULTIMEDIA, ['Bluetooth', 'USB baglantisi']),
);

const commonMid = combine(
  group(CATEGORY.DRIVING_ASSIST, ['Hiz sabitleyici']),
  group(CATEGORY.MULTIMEDIA, ['Dokunmatik multimedya ekrani']),
  group(CATEGORY.EXTERIOR, ['Alasim jant']),
);

const commonHigh = combine(
  group(CATEGORY.COMFORT, ['Otomatik klima']),
  group(CATEGORY.LIGHTING, ['LED gunduz farlari']),
  group(CATEGORY.DRIVING_ASSIST, ['Geri gorus kamerasi']),
);

const commonPremium = combine(
  group(CATEGORY.COMFORT, ['Anahtarsiz giris', 'Yagmur sensoru', 'Far sensoru']),
  group(CATEGORY.MULTIMEDIA, ['Navigasyon', 'Kablosuz baglanti']),
);

function resolveTrim(packageName, baseItems, rules) {
  for (const rule of rules) {
    if (hasAny(packageName, rule.includes)) {
      return dedupe(combine(baseItems, ...(rule.extend ?? []), ...(rule.items ? [rule.items] : [])));
    }
  }
  return dedupe(baseItems);
}

function buildEgea(packageName) {
  const easy = commonEntry;
  const urban = combine(easy, commonMid, group(CATEGORY.DRIVING_ASSIST, ['Geri gorus kamerasi']));
  const lounge = combine(urban, commonHigh, commonPremium);
  const cross = group(CATEGORY.EXTERIOR, ['Tavan rayi', 'Cross govde kaplamalari']);

  return resolveTrim(packageName, easy, [
    { includes: ['cross lounge'], extend: [lounge, cross, group(CATEGORY.DRIVING_ASSIST, ['Serit takip asistani'])] },
    { includes: ['cross urban'], extend: [urban, cross] },
    { includes: ['limited'], extend: [lounge, group(CATEGORY.INTERIOR, ['Yari deri koltuklar'])] },
    { includes: ['cross'], extend: [urban, cross] },
    { includes: ['lounge'], extend: [lounge] },
    { includes: ['urban'], extend: [urban] },
    { includes: ['easy'], extend: [easy] },
  ]);
}

function buildClio(packageName) {
  const joy = commonEntry;
  const touch = combine(joy, commonMid, group(CATEGORY.COMFORT, ['Arka park sensoru']));
  const icon = combine(touch, commonHigh, group(CATEGORY.INTERIOR, ['Deri direksiyon']));
  const techno = combine(icon, commonPremium, group(CATEGORY.DRIVING_ASSIST, ['Serit takip asistani']));

  return resolveTrim(packageName, joy, [
    { includes: ['esprit alpine'], extend: [techno, group(CATEGORY.EXTERIOR, ['Kontrast tavan', 'Spor body kit'])] },
    { includes: ['techno'], extend: [techno] },
    { includes: ['evolution'], extend: [icon, group(CATEGORY.MULTIMEDIA, ['Kablosuz Apple CarPlay'])] },
    { includes: ['icon'], extend: [icon] },
    { includes: ['touch'], extend: [touch] },
    { includes: ['joy'], extend: [joy] },
  ]);
}

function buildMegane(packageName) {
  const joy = commonEntry;
  const touch = combine(joy, commonMid, commonHigh);
  const icon = combine(touch, commonPremium, group(CATEGORY.INTERIOR, ['Yari deri koltuklar']));

  return resolveTrim(packageName, joy, [
    { includes: ['gt line'], extend: [icon, group(CATEGORY.EXTERIOR, ['GT Line body kit', 'Buyuk alasim jant'])] },
    { includes: ['techno'], extend: [icon, group(CATEGORY.DRIVING_ASSIST, ['Kor nokta uyarisi'])] },
    { includes: ['icon'], extend: [icon] },
    { includes: ['touch'], extend: [touch] },
    { includes: ['joy'], extend: [joy] },
  ]);
}

function buildGolf(packageName) {
  const trend = commonEntry;
  const comfort = combine(trend, commonMid, group(CATEGORY.COMFORT, ['Cift bolge klima']));
  const high = combine(comfort, commonHigh, commonPremium);

  return resolveTrim(packageName, trend, [
    { includes: ['r line'], extend: [high, group(CATEGORY.EXTERIOR, ['R-Line body kit', 'Spor tamponlar'])] },
    { includes: ['style'], extend: [high] },
    { includes: ['highline'], extend: [high] },
    { includes: ['life'], extend: [comfort] },
    { includes: ['comfortline'], extend: [comfort] },
    { includes: ['midline'], extend: [trend, group(CATEGORY.COMFORT, ['Arka park sensoru'])] },
    { includes: ['trendline'], extend: [trend] },
  ]);
}

function buildPolo(packageName) {
  const trend = commonEntry;
  const comfort = combine(trend, commonMid);
  const high = combine(comfort, commonHigh);

  return resolveTrim(packageName, trend, [
    { includes: ['style'], extend: [high, commonPremium] },
    { includes: ['highline'], extend: [high, commonPremium] },
    { includes: ['comfortline'], extend: [comfort] },
    { includes: ['life'], extend: [comfort] },
    { includes: ['trendline'], extend: [trend] },
  ]);
}

function buildPassat(packageName) {
  const trend = combine(commonEntry, group(CATEGORY.COMFORT, ['Arka kol dayama']));
  const comfort = combine(trend, commonMid, group(CATEGORY.COMFORT, ['Cift bolge klima']));
  const high = combine(comfort, commonHigh, commonPremium, group(CATEGORY.INTERIOR, ['Yari deri koltuklar']));

  return resolveTrim(packageName, trend, [
    { includes: ['business'], extend: [high, group(CATEGORY.MULTIMEDIA, ['Buyuk ekran multimedya'])] },
    { includes: ['impression'], extend: [high] },
    { includes: ['highline'], extend: [high] },
    { includes: ['comfortline'], extend: [comfort] },
    { includes: ['trendline'], extend: [trend] },
  ]);
}

function buildCorolla(packageName) {
  const vision = combine(commonEntry, group(CATEGORY.SAFETY, ['Toyota Safety Sense']));
  const dream = combine(vision, commonMid, group(CATEGORY.DRIVING_ASSIST, ['Geri gorus kamerasi']));
  const flame = combine(dream, commonHigh, group(CATEGORY.MULTIMEDIA, ['Buyuk ekran multimedya']));
  const passion = combine(flame, commonPremium, group(CATEGORY.INTERIOR, ['Deri doseme']));

  return resolveTrim(packageName, vision, [
    { includes: ['hybrid passion'], extend: [passion, group(CATEGORY.DRIVING_ASSIST, ['Adaptif hiz sabitleyici'])] },
    { includes: ['hybrid flame'], extend: [flame, group(CATEGORY.DRIVING_ASSIST, ['Adaptif hiz sabitleyici'])] },
    { includes: ['hybrid dream'], extend: [dream, group(CATEGORY.DRIVING_ASSIST, ['Adaptif hiz sabitleyici'])] },
    { includes: ['passion'], extend: [passion] },
    { includes: ['flame'], extend: [flame] },
    { includes: ['dream'], extend: [dream] },
    { includes: ['vision'], extend: [vision] },
  ]);
}

function buildI20(packageName) {
  const jump = commonEntry;
  const style = combine(jump, commonMid);
  const elite = combine(style, commonHigh, group(CATEGORY.DRIVING_ASSIST, ['Geri gorus kamerasi']));

  return resolveTrim(packageName, jump, [
    { includes: ['n line'], extend: [elite, group(CATEGORY.EXTERIOR, ['N Line body kit', 'Spor jantlar'])] },
    { includes: ['elite plus'], extend: [elite, commonPremium] },
    { includes: ['elite'], extend: [elite] },
    { includes: ['style'], extend: [style] },
    { includes: ['jump'], extend: [jump] },
  ]);
}

function buildCivic(packageName) {
  const elegance = combine(commonEntry, group(CATEGORY.SAFETY, ['Adaptif hiz sabitleyici']));
  const executive = combine(elegance, commonMid, commonHigh);
  const premium = combine(executive, commonPremium, group(CATEGORY.INTERIOR, ['Deri doseme', 'Koltuk isitma']));

  return resolveTrim(packageName, elegance, [
    { includes: ['rs'], extend: [premium, group(CATEGORY.EXTERIOR, ['RS body kit', 'Spor egzoz gorunumu'])] },
    { includes: ['sport'], extend: [premium, group(CATEGORY.EXTERIOR, ['Spor tamponlar'])] },
    { includes: ['premium'], extend: [premium] },
    { includes: ['executive'], extend: [executive] },
    { includes: ['elegance'], extend: [elegance] },
  ]);
}

function buildFocus(packageName) {
  const trend = commonEntry;
  const titanium = combine(trend, commonMid, commonHigh);
  const stLine = combine(titanium, group(CATEGORY.EXTERIOR, ['ST-Line body kit', 'Spor jantlar']));

  return resolveTrim(packageName, trend, [
    { includes: ['active'], extend: [titanium, group(CATEGORY.EXTERIOR, ['SUV tarz dis paket', 'Tavan rayi'])] },
    { includes: ['st line'], extend: [stLine] },
    { includes: ['style'], extend: [trend, group(CATEGORY.MULTIMEDIA, ['Dokunmatik ekran'])] },
    { includes: ['titanium'], extend: [titanium] },
    { includes: ['trend x'], extend: [trend] },
  ]);
}

function buildAstra(packageName) {
  const enjoy = commonEntry;
  const edition = combine(enjoy, commonMid);
  const elegance = combine(edition, commonHigh, commonPremium);

  return resolveTrim(packageName, enjoy, [
    { includes: ['ultimate'], extend: [elegance, group(CATEGORY.DRIVING_ASSIST, ['Kor nokta uyarisi', 'Park asistani'])] },
    { includes: ['gs'], extend: [elegance, group(CATEGORY.EXTERIOR, ['GS body kit', 'Spor jantlar'])] },
    { includes: ['elegance'], extend: [elegance] },
    { includes: ['edition'], extend: [edition] },
    { includes: ['enjoy'], extend: [enjoy] },
  ]);
}

function build3008(packageName) {
  const active = combine(commonEntry, commonMid);
  const allure = combine(active, commonHigh, group(CATEGORY.INTERIOR, ['Yuksek orta konsol', 'Dijital kokpit']));
  const gtLine = combine(allure, commonPremium, group(CATEGORY.EXTERIOR, ['GT Line dis paket']));

  return resolveTrim(packageName, active, [
    { includes: ['gt line'], extend: [gtLine] },
    { includes: ['gt'], extend: [gtLine, group(CATEGORY.DRIVING_ASSIST, ['Adaptif cruise control', 'Korner gorus sistemi'])] },
    { includes: ['allure'], extend: [allure] },
    { includes: ['active'], extend: [active] },
  ]);
}

function buildDuster(packageName) {
  const ambiance = combine(commonEntry, group(CATEGORY.EXTERIOR, ['Siyah tavan rayi']));
  const laureate = combine(ambiance, commonMid);
  const comfort = combine(laureate, commonHigh);
  const prestige = combine(comfort, commonPremium);

  return resolveTrim(packageName, ambiance, [
    { includes: ['extreme'], extend: [prestige, group(CATEGORY.EXTERIOR, ['Bakir detay paketi'])] },
    { includes: ['journey'], extend: [prestige] },
    { includes: ['essential'], extend: [ambiance] },
    { includes: ['prestige'], extend: [prestige] },
    { includes: ['comfort'], extend: [comfort] },
    { includes: ['laureate'], extend: [laureate] },
    { includes: ['ambiance'], extend: [ambiance] },
  ]);
}

function buildBmw3(packageName) {
  const base = combine(
    group(CATEGORY.SAFETY, ['ABS', 'ESP', 'On ve yan hava yastiklari']),
    group(CATEGORY.COMFORT, ['Cift bolge klima', 'Start-stop', 'Elektrikli koltuk ayari']),
    group(CATEGORY.MULTIMEDIA, ['iDrive multimedya', 'Bluetooth', 'Apple CarPlay']),
  );

  return resolveTrim(packageName, base, [
    { includes: ['m sport'], extend: [base, group(CATEGORY.EXTERIOR, ['M Sport body kit', 'Buyuk jantlar']), group(CATEGORY.INTERIOR, ['Spor koltuklar'])] },
    { includes: ['luxury line'], extend: [base, commonPremium, group(CATEGORY.INTERIOR, ['Deri doseme'])] },
    { includes: ['sport line'], extend: [base, group(CATEGORY.EXTERIOR, ['Sport Line paket'])] },
    { includes: ['320d', '320i', '318i', '316i'], extend: [base, commonHigh] },
  ]);
}

function buildMercedesC(packageName) {
  const base = combine(
    group(CATEGORY.SAFETY, ['ABS', 'ESP', 'Aktif fren asistani']),
    group(CATEGORY.COMFORT, ['Cift bolge klima', 'Anahtarsiz calistirma']),
    group(CATEGORY.MULTIMEDIA, ['MBUX ekran', 'Bluetooth', 'Apple CarPlay']),
  );

  return resolveTrim(packageName, base, [
    { includes: ['amg'], extend: [base, commonPremium, group(CATEGORY.EXTERIOR, ['AMG body kit', 'Spor jantlar'])] },
    { includes: ['exclusive'], extend: [base, commonPremium, group(CATEGORY.INTERIOR, ['Deri doseme', 'Ahsap trim'])] },
    { includes: ['avantgarde'], extend: [base, commonHigh, group(CATEGORY.EXTERIOR, ['Avantgarde dis paket'])] },
    { includes: ['c220d', 'c200', 'c180'], extend: [base, commonHigh] },
  ]);
}

function buildAudiA3(packageName) {
  const attraction = commonEntry;
  const ambition = combine(attraction, commonMid, group(CATEGORY.EXTERIOR, ['Spor jantlar']));
  const ambiente = combine(ambition, commonHigh);
  const sLine = combine(ambiente, commonPremium, group(CATEGORY.EXTERIOR, ['S Line body kit']));

  return resolveTrim(packageName, attraction, [
    { includes: ['s line'], extend: [sLine] },
    { includes: ['design line'], extend: [ambiente, commonPremium] },
    { includes: ['sport line'], extend: [ambition, commonHigh] },
    { includes: ['ambiente'], extend: [ambiente] },
    { includes: ['ambition'], extend: [ambition] },
    { includes: ['attraction'], extend: [attraction] },
  ]);
}

function buildTogg(packageName) {
  const v1 = combine(
    group(CATEGORY.SAFETY, ['ABS', 'ESP', 'Coklu hava yastigi']),
    group(CATEGORY.COMFORT, ['Anahtarsiz giris', 'Otomatik klima']),
    group(CATEGORY.MULTIMEDIA, ['Buyuk merkezi ekran', 'Bagli arac servisi']),
    group(CATEGORY.DRIVING_ASSIST, ['Adaptif hiz sabitleyici', 'Serit takip asistani']),
    group(CATEGORY.LIGHTING, ['LED farlar']),
  );
  const v2 = combine(v1, commonPremium, group(CATEGORY.INTERIOR, ['Elektrikli koltuklar']), group(CATEGORY.DRIVING_ASSIST, ['360 derece kamera']));

  return resolveTrim(packageName, v1, [
    { includes: ['v2'], extend: [v2] },
    { includes: ['v1'], extend: [v1] },
  ]);
}

const MODEL_EQUIPMENT_BUILDERS = new Map([
  [key('Fiat', 'Egea'), buildEgea],
  [key('Renault', 'Clio'), buildClio],
  [key('Renault', 'Megane'), buildMegane],
  [key('Volkswagen', 'Golf'), buildGolf],
  [key('Volkswagen', 'Polo'), buildPolo],
  [key('Volkswagen', 'Passat'), buildPassat],
  [key('Toyota', 'Corolla'), buildCorolla],
  [key('Hyundai', 'i20'), buildI20],
  [key('Honda', 'Civic'), buildCivic],
  [key('Ford', 'Focus'), buildFocus],
  [key('Opel', 'Astra'), buildAstra],
  [key('Peugeot', '3008'), build3008],
  [key('Dacia', 'Duster'), buildDuster],
  [key('BMW', '3 Series'), buildBmw3],
  [key('BMW', '3 Serisi'), buildBmw3],
  [key('Mercedes-Benz', 'C Serisi'), buildMercedesC],
  [key('Audi', 'A3'), buildAudiA3],
  [key('TOGG', 'T10X'), buildTogg],
]);

function buildEquipmentRowsForPackage(pkg) {
  const builder = MODEL_EQUIPMENT_BUILDERS.get(key(pkg.model.brand.name, pkg.model.name));
  if (!builder) {
    return buildRows(pkg.id, fallbackItems, true);
  }

  const rows = buildRows(pkg.id, builder(pkg.name), false);
  return rows.length > 0 ? rows : buildRows(pkg.id, fallbackItems, true);
}

module.exports = {
  buildEquipmentRowsForPackage,
};

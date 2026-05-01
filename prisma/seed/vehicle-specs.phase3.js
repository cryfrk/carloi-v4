const SPEC_SOURCE = {
  PHASE3: 'CARLOI_PHASE3_SEED',
};

const FUEL = {
  GASOLINE: 'GASOLINE',
  DIESEL: 'DIESEL',
  HYBRID: 'HYBRID',
  ELECTRIC: 'ELECTRIC',
  LPG: 'LPG',
  UNKNOWN: 'UNKNOWN',
};

const TRANS = {
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
  CVT: 'CVT',
  UNKNOWN: 'UNKNOWN',
};

const CURRENT_YEAR = 2026;

function normalize(value) {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çðýöþü]+/g, ' ')
    .trim();
}

function key(brandName, modelName) {
  return `${normalize(brandName)}::${normalize(modelName)}`;
}

function template(options) {
  return {
    tractionType: 'FWD',
    bodyType: null,
    packageHints: [],
    excludePackageHints: [],
    minYear: null,
    maxYear: null,
    manualReviewNeeded: false,
    ...options,
  };
}

function matchesPackage(templateRow, packageName) {
  const normalizedPackageName = normalize(packageName);

  if (templateRow.packageHints.length > 0) {
    const matchesHint = templateRow.packageHints.some((hint) => normalizedPackageName.includes(normalize(hint)));
    if (!matchesHint) {
      return false;
    }
  }

  if (templateRow.excludePackageHints.length > 0) {
    const blocked = templateRow.excludePackageHints.some((hint) => normalizedPackageName.includes(normalize(hint)));
    if (blocked) {
      return false;
    }
  }

  return true;
}

function resolveSpecYear(pkg, model, specTemplate) {
  const candidates = [pkg.yearEnd, pkg.yearStart, model.yearEnd, model.yearStart, CURRENT_YEAR].filter(
    (value) => Number.isInteger(value),
  );

  let selected = candidates[0] ?? CURRENT_YEAR;

  if (specTemplate.maxYear !== null && selected > specTemplate.maxYear) {
    selected = specTemplate.maxYear;
  }

  if (specTemplate.minYear !== null && selected < specTemplate.minYear) {
    selected = specTemplate.minYear;
  }

  return selected;
}

function createRow(pkg, model, specTemplate) {
  const engineVolumeCc = specTemplate.engineVolumeCc ?? null;
  const enginePowerHp = specTemplate.enginePowerHp ?? null;

  return {
    packageId: pkg.id,
    year: resolveSpecYear(pkg, model, specTemplate),
    engineName: specTemplate.engineName ?? 'Bilinmiyor',
    engineVolume: engineVolumeCc,
    enginePower: enginePowerHp,
    engineVolumeCc,
    enginePowerHp,
    torqueNm: specTemplate.torqueNm ?? null,
    fuelType: specTemplate.fuelType ?? FUEL.UNKNOWN,
    transmissionType: specTemplate.transmissionType ?? TRANS.UNKNOWN,
    tractionType: specTemplate.tractionType ?? null,
    bodyType: specTemplate.bodyType ?? pkg.bodyType ?? model.bodyType ?? null,
    source: SPEC_SOURCE.PHASE3,
    manualReviewNeeded: specTemplate.manualReviewNeeded ?? false,
    isActive: true,
  };
}

function fallbackTemplate(pkg, model) {
  return template({
    engineName: 'Bilinmiyor',
    fuelType: FUEL.UNKNOWN,
    transmissionType: TRANS.UNKNOWN,
    tractionType: null,
    bodyType: pkg.bodyType ?? model.bodyType ?? null,
    manualReviewNeeded: true,
  });
}

const MODEL_SPEC_MAP = new Map([
  [
    key('Fiat', 'Egea'),
    [
      template({ engineName: '1.4 Fire 95 HP', engineVolumeCc: 1368, enginePowerHp: 95, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 127 }),
      template({ engineName: '1.3 Multijet 95 HP', engineVolumeCc: 1248, enginePowerHp: 95, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 200 }),
      template({ engineName: '1.6 Multijet 130 HP Manuel', engineVolumeCc: 1598, enginePowerHp: 130, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 320 }),
      template({ engineName: '1.6 Multijet 130 HP Otomatik', engineVolumeCc: 1598, enginePowerHp: 130, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 320 }),
      template({ engineName: '1.5 T4 Hybrid 130 HP', engineVolumeCc: 1469, enginePowerHp: 130, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, torqueNm: 240, minYear: 2022 }),
    ],
  ],
  [
    key('Renault', 'Clio'),
    [
      template({ engineName: '1.0 SCe', engineVolumeCc: 999, enginePowerHp: 65, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 95, maxYear: 2023, excludePackageHints: ['hybrid', 'techno', 'esprit alpine'] }),
      template({ engineName: '1.0 TCe Manuel', engineVolumeCc: 999, enginePowerHp: 90, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 160, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.0 TCe Otomatik', engineVolumeCc: 999, enginePowerHp: 90, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 160, minYear: 2020, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.5 dCi', engineVolumeCc: 1461, enginePowerHp: 100, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 260, maxYear: 2022, excludePackageHints: ['hybrid'] }),
      template({ engineName: 'E-Tech Hybrid', engineVolumeCc: 1598, enginePowerHp: 145, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, torqueNm: 205, packageHints: ['techno', 'esprit alpine', 'evolution', 'icon'], minYear: 2023 }),
    ],
  ],
  [
    key('Renault', 'Megane'),
    [
      template({ engineName: '1.3 TCe', engineVolumeCc: 1333, enginePowerHp: 140, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 240, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.5 dCi Manuel', engineVolumeCc: 1461, enginePowerHp: 115, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 260, maxYear: 2023, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.5 dCi Otomatik', engineVolumeCc: 1461, enginePowerHp: 115, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 260, maxYear: 2023, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.6 E-Tech Hybrid', engineVolumeCc: 1598, enginePowerHp: 160, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, torqueNm: 205, packageHints: ['techno', 'icon', 'gt line'], minYear: 2022 }),
    ],
  ],
  [
    key('Volkswagen', 'Golf'),
    [
      template({ engineName: '1.0 TSI', engineVolumeCc: 999, enginePowerHp: 110, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 200 }),
      template({ engineName: '1.5 TSI Manuel', engineVolumeCc: 1498, enginePowerHp: 150, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 250 }),
      template({ engineName: '1.5 TSI DSG', engineVolumeCc: 1498, enginePowerHp: 150, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 250 }),
      template({ engineName: '1.6 TDI Manuel', engineVolumeCc: 1598, enginePowerHp: 115, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 250, maxYear: 2022 }),
      template({ engineName: '1.6 TDI DSG', engineVolumeCc: 1598, enginePowerHp: 115, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 250, maxYear: 2022 }),
      template({ engineName: '1.5 eTSI DSG', engineVolumeCc: 1498, enginePowerHp: 150, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, torqueNm: 250, minYear: 2021, packageHints: ['life', 'style', 'r line'] }),
    ],
  ],
  [
    key('Toyota', 'Corolla'),
    [
      template({ engineName: '1.5 Vision Manuel', engineVolumeCc: 1490, enginePowerHp: 125, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 153, minYear: 2022, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.5 Vision Otomatik', engineVolumeCc: 1490, enginePowerHp: 125, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 153, minYear: 2022, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.6 Benzin Manuel', engineVolumeCc: 1598, enginePowerHp: 132, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 159, maxYear: 2022, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.6 Benzin Otomatik', engineVolumeCc: 1598, enginePowerHp: 132, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 159, maxYear: 2022, excludePackageHints: ['hybrid'] }),
      template({ engineName: '1.8 Hybrid', engineVolumeCc: 1798, enginePowerHp: 140, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, torqueNm: 142, packageHints: ['hybrid'] }),
    ],
  ],
  [
    key('Hyundai', 'i20'),
    [
      template({ engineName: '1.2 MPI', engineVolumeCc: 1197, enginePowerHp: 84, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 118 }),
      template({ engineName: '1.4 MPI Otomatik', engineVolumeCc: 1368, enginePowerHp: 100, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 134, maxYear: 2023 }),
      template({ engineName: '1.0 T-GDI DCT', engineVolumeCc: 998, enginePowerHp: 100, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 172, minYear: 2021, packageHints: ['elite', 'elite plus', 'n line', 'style'] }),
    ],
  ],
  [
    key('Honda', 'Civic'),
    [
      template({ engineName: '1.6 i-VTEC Otomatik', engineVolumeCc: 1597, enginePowerHp: 125, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 152, maxYear: 2022 }),
      template({ engineName: '1.5 VTEC Turbo Otomatik', engineVolumeCc: 1498, enginePowerHp: 182, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 240, minYear: 2017 }),
      template({ engineName: '1.6 i-DTEC Manuel', engineVolumeCc: 1597, enginePowerHp: 120, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 300, maxYear: 2022 }),
      template({ engineName: '1.6 i-DTEC Otomatik', engineVolumeCc: 1597, enginePowerHp: 120, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 300, maxYear: 2022 }),
    ],
  ],
  [
    key('Ford', 'Focus'),
    [
      template({ engineName: '1.5 EcoBlue Manuel', engineVolumeCc: 1499, enginePowerHp: 120, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 300 }),
      template({ engineName: '1.5 EcoBlue Otomatik', engineVolumeCc: 1499, enginePowerHp: 120, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 300 }),
      template({ engineName: '1.0 EcoBoost Manuel', engineVolumeCc: 999, enginePowerHp: 125, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 170 }),
      template({ engineName: '1.0 EcoBoost Otomatik', engineVolumeCc: 999, enginePowerHp: 125, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 170 }),
      template({ engineName: '1.5 Ti-VCT Otomatik', engineVolumeCc: 1498, enginePowerHp: 123, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 151, maxYear: 2022 }),
    ],
  ],
  [
    key('Opel', 'Astra'),
    [
      template({ engineName: '1.2 Turbo Manuel', engineVolumeCc: 1199, enginePowerHp: 130, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 230 }),
      template({ engineName: '1.2 Turbo Otomatik', engineVolumeCc: 1199, enginePowerHp: 130, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 230 }),
      template({ engineName: '1.5 Dizel Otomatik', engineVolumeCc: 1499, enginePowerHp: 130, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 300 }),
      template({ engineName: '1.6 Benzin Otomatik', engineVolumeCc: 1598, enginePowerHp: 180, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 250, maxYear: 2022 }),
    ],
  ],
  [
    key('Peugeot', '3008'),
    [
      template({ engineName: '1.2 PureTech EAT8', engineVolumeCc: 1199, enginePowerHp: 130, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 230 }),
      template({ engineName: '1.5 BlueHDi EAT8', engineVolumeCc: 1499, enginePowerHp: 130, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 300 }),
      template({ engineName: '1.6 Hybrid Otomatik', engineVolumeCc: 1598, enginePowerHp: 225, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, torqueNm: 360, minYear: 2021, packageHints: ['gt', 'gt line', 'allure'] }),
    ],
  ],
  [
    key('Dacia', 'Duster'),
    [
      template({ engineName: '1.0 TCe', engineVolumeCc: 999, enginePowerHp: 90, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 160 }),
      template({ engineName: '1.3 TCe Manuel', engineVolumeCc: 1332, enginePowerHp: 150, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 250 }),
      template({ engineName: '1.3 TCe EDC', engineVolumeCc: 1332, enginePowerHp: 150, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 250, packageHints: ['journey', 'extreme', 'prestige'] }),
      template({ engineName: '1.5 dCi', engineVolumeCc: 1461, enginePowerHp: 115, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 260 }),
      template({ engineName: '1.6 LPG', engineVolumeCc: 1598, enginePowerHp: 115, fuelType: FUEL.LPG, transmissionType: TRANS.MANUAL, torqueNm: 156 }),
    ],
  ],
  [
    key('BMW', '3 Series'),
    [
      template({ engineName: '316i', engineVolumeCc: 1598, enginePowerHp: 136, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 220, packageHints: ['316i'] }),
      template({ engineName: '318i', engineVolumeCc: 1499, enginePowerHp: 156, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, packageHints: ['318i'] }),
      template({ engineName: '320i', engineVolumeCc: 1998, enginePowerHp: 170, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, packageHints: ['320i'] }),
      template({ engineName: '320d', engineVolumeCc: 1995, enginePowerHp: 190, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 400, packageHints: ['320d'] }),
      template({ engineName: '330e Plug-in Hybrid', engineVolumeCc: 1998, enginePowerHp: 292, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 420, packageHints: ['330e'], minYear: 2020 }),
      template({ engineName: '316i', engineVolumeCc: 1598, enginePowerHp: 136, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 220, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '318i', engineVolumeCc: 1499, enginePowerHp: 156, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '320i', engineVolumeCc: 1998, enginePowerHp: 170, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '320d', engineVolumeCc: 1995, enginePowerHp: 190, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 400, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '330e Plug-in Hybrid', engineVolumeCc: 1998, enginePowerHp: 292, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 420, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'], minYear: 2020 }),
    ],
  ],
  [
    key('BMW', '3 Serisi'),
    [
      template({ engineName: '316i', engineVolumeCc: 1598, enginePowerHp: 136, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 220, packageHints: ['316i'] }),
      template({ engineName: '318i', engineVolumeCc: 1499, enginePowerHp: 156, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, packageHints: ['318i'] }),
      template({ engineName: '320i', engineVolumeCc: 1998, enginePowerHp: 170, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, packageHints: ['320i'] }),
      template({ engineName: '320d', engineVolumeCc: 1995, enginePowerHp: 190, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 400, packageHints: ['320d'] }),
      template({ engineName: '330e Plug-in Hybrid', engineVolumeCc: 1998, enginePowerHp: 292, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 420, packageHints: ['330e'], minYear: 2020 }),
      template({ engineName: '316i', engineVolumeCc: 1598, enginePowerHp: 136, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 220, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '318i', engineVolumeCc: 1499, enginePowerHp: 156, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '320i', engineVolumeCc: 1998, enginePowerHp: 170, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '320d', engineVolumeCc: 1995, enginePowerHp: 190, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 400, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'] }),
      template({ engineName: '330e Plug-in Hybrid', engineVolumeCc: 1998, enginePowerHp: 292, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 420, excludePackageHints: ['316i', '318i', '320i', '320d', '330e'], minYear: 2020 }),
    ],
  ],
  [
    key('Mercedes-Benz', 'C Serisi'),
    [
      template({ engineName: 'C180', engineVolumeCc: 1496, enginePowerHp: 170, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, packageHints: ['c180'] }),
      template({ engineName: 'C200', engineVolumeCc: 1496, enginePowerHp: 204, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 300, packageHints: ['c200'] }),
      template({ engineName: 'C220d', engineVolumeCc: 1992, enginePowerHp: 200, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 440, packageHints: ['c220d', '220 d'] }),
      template({ engineName: 'C300e Plug-in Hybrid', engineVolumeCc: 1999, enginePowerHp: 313, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 550, packageHints: ['c300e'], minYear: 2022 }),
      template({ engineName: 'C180', engineVolumeCc: 1496, enginePowerHp: 170, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 250, excludePackageHints: ['c180', 'c200', 'c220d', '220 d', 'c300e'] }),
      template({ engineName: 'C200', engineVolumeCc: 1496, enginePowerHp: 204, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 300, excludePackageHints: ['c180', 'c200', 'c220d', '220 d', 'c300e'] }),
      template({ engineName: 'C220d', engineVolumeCc: 1992, enginePowerHp: 200, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 440, excludePackageHints: ['c180', 'c200', 'c220d', '220 d', 'c300e'] }),
      template({ engineName: 'C300e Plug-in Hybrid', engineVolumeCc: 1999, enginePowerHp: 313, fuelType: FUEL.HYBRID, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 550, excludePackageHints: ['c180', 'c200', 'c220d', '220 d', 'c300e'], minYear: 2022 }),
    ],
  ],
  [
    key('Audi', 'A3'),
    [
      template({ engineName: '1.0 TFSI Manuel', engineVolumeCc: 999, enginePowerHp: 110, fuelType: FUEL.GASOLINE, transmissionType: TRANS.MANUAL, torqueNm: 200 }),
      template({ engineName: '1.0 TFSI S tronic', engineVolumeCc: 999, enginePowerHp: 110, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 200 }),
      template({ engineName: '1.5 TFSI S tronic', engineVolumeCc: 1498, enginePowerHp: 150, fuelType: FUEL.GASOLINE, transmissionType: TRANS.AUTOMATIC, torqueNm: 250 }),
      template({ engineName: '1.6 TDI Manuel', engineVolumeCc: 1598, enginePowerHp: 116, fuelType: FUEL.DIESEL, transmissionType: TRANS.MANUAL, torqueNm: 250, maxYear: 2022 }),
      template({ engineName: '1.6 TDI S tronic', engineVolumeCc: 1598, enginePowerHp: 116, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 250, maxYear: 2022 }),
      template({ engineName: '2.0 TDI S tronic', engineVolumeCc: 1968, enginePowerHp: 150, fuelType: FUEL.DIESEL, transmissionType: TRANS.AUTOMATIC, torqueNm: 360 }),
    ],
  ],
  [
    key('TOGG', 'T10X'),
    [
      template({ engineName: 'RWD Standart Menzil', engineVolumeCc: null, enginePowerHp: 218, fuelType: FUEL.ELECTRIC, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 350, packageHints: ['v1'] }),
      template({ engineName: 'RWD Uzun Menzil', engineVolumeCc: null, enginePowerHp: 218, fuelType: FUEL.ELECTRIC, transmissionType: TRANS.AUTOMATIC, tractionType: 'RWD', torqueNm: 350, packageHints: ['v2'] }),
    ],
  ],
]);

function buildSpecRowsForPackage(pkg) {
  const brandName = pkg.model.brand.name;
  const modelName = pkg.model.name;
  const templates = MODEL_SPEC_MAP.get(key(brandName, modelName)) ?? [];
  const matchedTemplates = templates.filter((templateRow) => matchesPackage(templateRow, pkg.name));

  if (matchedTemplates.length === 0) {
    return [createRow(pkg, pkg.model, fallbackTemplate(pkg, pkg.model))];
  }

  return matchedTemplates.map((templateRow) => createRow(pkg, pkg.model, templateRow));
}

module.exports = {
  buildSpecRowsForPackage,
};

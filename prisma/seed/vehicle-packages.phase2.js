const PACKAGE_SOURCE = {
  PHASE2: 'CARLOI_PHASE2_SEED',
};

function slugify(value) {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function key(brandName, modelName) {
  return `${brandName}::${modelName}`;
}

function packageNames(...names) {
  return names;
}

const DETAILED_PACKAGE_MAP = new Map([
  [key('Fiat', 'Egea'), packageNames('Easy', 'Urban', 'Lounge', 'Limited', 'Cross', 'Cross Urban', 'Cross Lounge')],
  [key('Fiat', 'Linea'), packageNames('Actual', 'Active', 'Dynamic', 'Emotion', 'Easy')],
  [key('Fiat', 'Fiorino'), packageNames('Pop', 'Safeline', 'Premio', 'Premio Plus')],
  [key('Fiat', 'Doblo'), packageNames('Easy', 'Safeline', 'Premio', 'Trekking')],
  [key('Fiat', 'Doblo Cargo'), packageNames('Standart', 'Premio', 'Premio Plus')],
  [key('Fiat', 'Punto'), packageNames('Pop', 'Easy', 'Lounge', 'Sporting')],
  [key('Fiat', 'Panda'), packageNames('Easy', 'Lounge', 'City Life', 'Cross')],
  [key('Fiat', '500'), packageNames('Pop', 'Lounge', 'Sport', 'Dolcevita')],
  [key('Fiat', '500L'), packageNames('Popstar', 'Lounge', 'Cross', 'Mirror')],
  [key('Fiat', '500X'), packageNames('Urban', 'Cross', 'Sport', 'Lounge')],

  [key('Renault', 'Clio'), packageNames('Joy', 'Touch', 'Icon', 'Evolution', 'Techno', 'Esprit Alpine')],
  [key('Renault', 'Megane'), packageNames('Joy', 'Touch', 'Icon', 'GT Line', 'Techno')],
  [key('Renault', 'Symbol'), packageNames('Joy', 'Touch', 'Icon')],
  [key('Renault', 'Fluence'), packageNames('Joy', 'Touch', 'Icon', 'Privilege')],
  [key('Renault', 'Taliant'), packageNames('Joy', 'Touch', 'Evolution', 'Techno')],
  [key('Renault', 'Captur'), packageNames('Touch', 'Icon', 'Evolution', 'Techno', 'Esprit Alpine')],
  [key('Renault', 'Kadjar'), packageNames('Touch', 'Icon', 'Black Edition', 'Sport Edition')],
  [key('Renault', 'Austral'), packageNames('Techno', 'Esprit Alpine', 'Iconic')],
  [key('Renault', 'Kangoo'), packageNames('Joy', 'Touch', 'Extreme')],
  [key('Renault', 'Koleos'), packageNames('Touch', 'Icon', 'Initiale Paris')],
  [key('Renault', 'Master'), packageNames('Joy', 'Touch', 'Business')],

  [key('Volkswagen', 'Polo'), packageNames('Trendline', 'Comfortline', 'Highline', 'Life', 'Style')],
  [key('Volkswagen', 'Golf'), packageNames('Trendline', 'Midline', 'Comfortline', 'Highline', 'Life', 'Style', 'R-Line')],
  [key('Volkswagen', 'Passat'), packageNames('Trendline', 'Comfortline', 'Highline', 'Impression', 'Business')],
  [key('Volkswagen', 'Jetta'), packageNames('Trendline', 'Comfortline', 'Highline')],
  [key('Volkswagen', 'Tiguan'), packageNames('Trendline', 'Comfortline', 'Highline', 'Life', 'R-Line')],
  [key('Volkswagen', 'T-Roc'), packageNames('Life', 'Style', 'R-Line')],
  [key('Volkswagen', 'T-Cross'), packageNames('Life', 'Style', 'R-Line')],
  [key('Volkswagen', 'Taigo'), packageNames('Life', 'Style', 'R-Line')],
  [key('Volkswagen', 'Caddy'), packageNames('Trendline', 'Comfortline', 'Style')],
  [key('Volkswagen', 'Transporter'), packageNames('Trendline', 'Comfortline', 'Highline')],
  [key('Volkswagen', 'Caravelle'), packageNames('Comfortline', 'Highline', 'Executive')],
  [key('Volkswagen', 'Amarok'), packageNames('Life', 'Style', 'Aventura', 'PanAmericana')],
  [key('Volkswagen', 'Touran'), packageNames('Trendline', 'Comfortline', 'Highline')],

  [key('Toyota', 'Corolla'), packageNames('Vision', 'Dream', 'Flame', 'Passion', 'Hybrid Dream', 'Hybrid Flame', 'Hybrid Passion')],
  [key('Toyota', 'Yaris'), packageNames('Vision', 'Dream', 'Flame', 'Hybrid Flame', 'Hybrid Passion')],
  [key('Toyota', 'C-HR'), packageNames('Flame', 'Passion', 'Hybrid Flame', 'Hybrid Passion')],
  [key('Toyota', 'Auris'), packageNames('Active', 'Advance', 'Premium', 'Hybrid Premium')],
  [key('Toyota', 'RAV4'), packageNames('Flame', 'Passion', 'Adventure', 'Hybrid Passion')],
  [key('Toyota', 'Hilux'), packageNames('Active', 'Adventure', 'Invincible', 'Hi-Cruiser')],
  [key('Toyota', 'Proace'), packageNames('Dream', 'Flame', 'Passion')],

  [key('Hyundai', 'i10'), packageNames('Jump', 'Style', 'Elite')],
  [key('Hyundai', 'i20'), packageNames('Jump', 'Style', 'Elite', 'Elite Plus', 'N Line')],
  [key('Hyundai', 'i30'), packageNames('Style', 'Elite', 'Elite Plus', 'N Line')],
  [key('Hyundai', 'Accent'), packageNames('Start', 'Mode', 'Prime')],
  [key('Hyundai', 'Elantra'), packageNames('Style', 'Elite', 'Elite Plus', 'N Line')],
  [key('Hyundai', 'Tucson'), packageNames('Comfort', 'Style', 'Elite', 'Elite Plus', 'N Line')],
  [key('Hyundai', 'Kona'), packageNames('Style', 'Elite', 'N Line')],
  [key('Hyundai', 'Bayon'), packageNames('Jump', 'Style', 'Elite', 'Elite Plus')],

  [key('Honda', 'Civic'), packageNames('Elegance', 'Executive', 'Premium', 'Sport', 'RS')],
  [key('Honda', 'City'), packageNames('Elegance', 'Executive', 'Premium')],
  [key('Honda', 'Jazz'), packageNames('Elegance', 'Executive', 'Sport')],
  [key('Honda', 'Accord'), packageNames('Elegance', 'Executive', 'Premium')],
  [key('Honda', 'CR-V'), packageNames('Elegance', 'Executive', 'Prestige')],
  [key('Honda', 'HR-V'), packageNames('Elegance', 'Executive', 'Advance')],

  [key('Ford', 'Fiesta'), packageNames('Trend X', 'Titanium', 'ST-Line', 'Style')],
  [key('Ford', 'Focus'), packageNames('Trend X', 'Titanium', 'ST-Line', 'Active', 'Style')],
  [key('Ford', 'Mondeo'), packageNames('Trend', 'Titanium', 'Titanium X')],
  [key('Ford', 'Puma'), packageNames('Titanium', 'ST-Line', 'ST-Line X')],
  [key('Ford', 'Kuga'), packageNames('Trend X', 'Titanium', 'ST-Line', 'Vignale')],
  [key('Ford', 'Courier'), packageNames('Trend', 'Deluxe', 'Titanium')],
  [key('Ford', 'Tourneo Courier'), packageNames('Trend', 'Titanium')],
  [key('Ford', 'Transit'), packageNames('Trend', 'Deluxe', 'Van')],
  [key('Ford', 'Ranger'), packageNames('XLT', 'Wildtrak', 'Limited', 'Raptor')],

  [key('Opel', 'Corsa'), packageNames('Enjoy', 'Edition', 'Elegance', 'GS')],
  [key('Opel', 'Astra'), packageNames('Enjoy', 'Edition', 'Elegance', 'GS', 'Ultimate')],
  [key('Opel', 'Insignia'), packageNames('Edition', 'Elegance', 'Ultimate', 'GS')],
  [key('Opel', 'Mokka'), packageNames('Edition', 'Elegance', 'GS')],
  [key('Opel', 'Crossland'), packageNames('Edition', 'Elegance', 'Ultimate')],
  [key('Opel', 'Grandland'), packageNames('Edition', 'Elegance', 'Ultimate', 'GS')],
  [key('Opel', 'Combo'), packageNames('Edition', 'Elegance', 'Ultimate')],

  [key('Peugeot', '208'), packageNames('Active', 'Allure', 'GT Line', 'GT')],
  [key('Peugeot', '308'), packageNames('Active', 'Allure', 'GT Line', 'GT')],
  [key('Peugeot', '301'), packageNames('Access', 'Active', 'Allure')],
  [key('Peugeot', '2008'), packageNames('Active', 'Allure', 'GT Line', 'GT')],
  [key('Peugeot', '3008'), packageNames('Active', 'Allure', 'GT Line', 'GT')],
  [key('Peugeot', '5008'), packageNames('Active', 'Allure', 'GT Line', 'GT')],
  [key('Peugeot', 'Partner'), packageNames('Active', 'Allure', 'GT Line')],
  [key('Peugeot', 'Rifter'), packageNames('Active', 'Allure', 'GT Line')],

  [key('Citroen', 'C3'), packageNames('Feel', 'Feel Bold', 'Shine', 'Shine Bold')],
  [key('Citroen', 'C4'), packageNames('Feel', 'Feel Bold', 'Shine', 'Shine Bold')],
  [key('Citroen', 'C-Elysee'), packageNames('Live', 'Feel', 'Shine')],
  [key('Citroen', 'C5 Aircross'), packageNames('Feel Adventure', 'Shine', 'Shine Bold')],
  [key('Citroen', 'Berlingo'), packageNames('Feel', 'Feel Bold', 'Shine')],
  [key('Citroen', 'C4 X'), packageNames('Feel Bold', 'Shine', 'Shine Bold')],

  [key('Dacia', 'Sandero'), packageNames('Ambiance', 'Laureate', 'Essential', 'Journey', 'Extreme')],
  [key('Dacia', 'Logan'), packageNames('Ambiance', 'Laureate', 'Comfort', 'Journey')],
  [key('Dacia', 'Duster'), packageNames('Ambiance', 'Laureate', 'Comfort', 'Prestige', 'Essential', 'Journey', 'Extreme')],
  [key('Dacia', 'Jogger'), packageNames('Essential', 'Expression', 'Extreme', 'Journey')],
  [key('Dacia', 'Lodgy'), packageNames('Ambiance', 'Laureate', 'Stepway')],
  [key('Dacia', 'Dokker'), packageNames('Ambiance', 'Laureate', 'Stepway')],

  [key('Skoda', 'Fabia'), packageNames('Active', 'Ambition', 'Style', 'Monte Carlo')],
  [key('Skoda', 'Octavia'), packageNames('Active', 'Ambition', 'Style', 'Prestige', 'RS')],
  [key('Skoda', 'Superb'), packageNames('Premium', 'Prestige', 'Sportline', 'L&K')],
  [key('Skoda', 'Scala'), packageNames('Elite', 'Premium', 'Prestige')],
  [key('Skoda', 'Kamiq'), packageNames('Elite', 'Premium', 'Prestige', 'Monte Carlo')],
  [key('Skoda', 'Karoq'), packageNames('Elite', 'Premium', 'Prestige', 'Sportline')],
  [key('Skoda', 'Kodiaq'), packageNames('Elite', 'Premium', 'Prestige', 'Sportline')],

  [key('Seat', 'Ibiza'), packageNames('Style', 'FR', 'Xcellence')],
  [key('Seat', 'Leon'), packageNames('Style', 'FR', 'Xcellence')],
  [key('Seat', 'Arona'), packageNames('Style', 'FR', 'Xperience')],
  [key('Seat', 'Ateca'), packageNames('Style', 'FR', 'Xperience')],
  [key('Seat', 'Tarraco'), packageNames('Style', 'FR', 'Xcellence')],

  [key('Kia', 'Picanto'), packageNames('Cool', 'Feel', 'GT-Line')],
  [key('Kia', 'Rio'), packageNames('Cool', 'Elegance', 'Prestige')],
  [key('Kia', 'Ceed'), packageNames('Cool', 'Live', 'Prestige', 'GT-Line')],
  [key('Kia', 'Sportage'), packageNames('Comfort', 'Elegance', 'Prestige', 'GT-Line')],
  [key('Kia', 'Stonic'), packageNames('Cool', 'Business', 'Prestige')],
  [key('Kia', 'Sorento'), packageNames('Prestige', 'Premium', 'GT-Line')],

  [key('Nissan', 'Micra'), packageNames('Street', 'Match', 'Platinum')],
  [key('Nissan', 'Qashqai'), packageNames('Visia', 'Acenta', 'Skypack', 'Platinum Premium')],
  [key('Nissan', 'Juke'), packageNames('Visia', 'Tekna', 'N-Design', 'N-Sport')],
  [key('Nissan', 'X-Trail'), packageNames('Visia', 'Tekna', 'Platinum Premium')],
  [key('Nissan', 'Navara'), packageNames('Visia', 'Tekna', 'Platinum')],

  [key('BMW', '1 Series'), packageNames('116i', '118i', '120i', 'M Sport', 'Sport Line')],
  [key('BMW', '1 Serisi'), packageNames('116i', '118i', '120i', 'M Sport', 'Sport Line')],
  [key('BMW', '2 Series'), packageNames('216i', '218i', '220d', 'M Sport')],
  [key('BMW', '3 Series'), packageNames('316i', '318i', '320i', '320d', 'M Sport', 'Luxury Line', 'Sport Line')],
  [key('BMW', '4 Series'), packageNames('420i', '420d', 'M Sport', 'Luxury Line')],
  [key('BMW', '5 Series'), packageNames('520i', '520d', '530i', 'M Sport', 'Luxury Line', 'Executive')],
  [key('BMW', 'X1'), packageNames('sDrive18i', 'sDrive20i', 'xLine', 'M Sport')],
  [key('BMW', 'X3'), packageNames('20i', '20d', 'xLine', 'M Sport')],
  [key('BMW', 'X5'), packageNames('30d', '40i', 'xLine', 'M Sport')],

  [key('Mercedes-Benz', 'A Serisi'), packageNames('A 180', 'A 200', 'Style', 'Progressive', 'AMG')],
  [key('Mercedes-Benz', 'B Serisi'), packageNames('B 180', 'B 200', 'Style', 'Progressive', 'AMG')],
  [key('Mercedes-Benz', 'C Serisi'), packageNames('C180', 'C200', 'C220d', 'AMG', 'Avantgarde', 'Exclusive')],
  [key('Mercedes-Benz', 'E Serisi'), packageNames('E180', 'E200', 'E220d', 'AMG', 'Exclusive')],
  [key('Mercedes-Benz', 'CLA'), packageNames('CLA 180', 'CLA 200', 'AMG', 'Progressive')],
  [key('Mercedes-Benz', 'GLA'), packageNames('GLA 200', 'GLA 200d', 'AMG', 'Progressive')],
  [key('Mercedes-Benz', 'GLB'), packageNames('GLB 200', 'GLB 200d', 'AMG', 'Progressive')],
  [key('Mercedes-Benz', 'GLC'), packageNames('GLC 200', 'GLC 220d', 'AMG', 'Exclusive')],
  [key('Mercedes-Benz', 'Vito'), packageNames('Panelvan', 'Tourer', 'Select')],

  [key('Audi', 'A1'), packageNames('Attraction', 'Ambition', 'S Line')],
  [key('Audi', 'A3'), packageNames('Attraction', 'Ambition', 'Ambiente', 'Sport Line', 'Design Line', 'S Line')],
  [key('Audi', 'A4'), packageNames('Design', 'Advanced', 'Sport Line', 'S Line')],
  [key('Audi', 'A5'), packageNames('Design', 'Advanced', 'S Line')],
  [key('Audi', 'A6'), packageNames('Design', 'Advanced', 'S Line', 'Quattro')],
  [key('Audi', 'Q2'), packageNames('Design', 'Advanced', 'S Line')],
  [key('Audi', 'Q3'), packageNames('Design', 'Advanced', 'S Line')],
  [key('Audi', 'Q5'), packageNames('Design', 'Advanced', 'S Line')],

  [key('TOGG', 'T10X'), packageNames('V1', 'V2')],
]);

function buildPackageRowsForModel(brandName, model) {
  const names = DETAILED_PACKAGE_MAP.get(key(brandName, model.name));

  if (!names || names.length === 0) {
    return [
      {
        name: 'Standart',
        slug: 'standart',
        yearStart: model.yearStart ?? null,
        yearEnd: model.yearEnd ?? null,
        marketRegion: 'TR',
        source: PACKAGE_SOURCE.PHASE2,
        manualReviewNeeded: true,
        isActive: true,
      },
    ];
  }

  return names.map((name) => ({
    name,
    slug: slugify(name),
    yearStart: model.yearStart ?? null,
    yearEnd: model.yearEnd ?? null,
    marketRegion: 'TR',
    source: PACKAGE_SOURCE.PHASE2,
    manualReviewNeeded: false,
    isActive: true,
  }));
}

module.exports = {
  buildPackageRowsForModel,
};

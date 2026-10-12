import { getRegister, regMaterials } from './register.js';

// Material med Ragn-Sells beteckningar (från ragnsells.se → Material- och sorteringsguide).
// "fa" = visas för behållare för farligt avfall (miljöskåp, fat …), "normal" = övriga.

export const MATERIAL_GROUPS = [
  { name: 'Papper och kartong', kinds: ['normal'], items: [
    'Wellpapp, löst', 'Papper kontor', 'Sekretesspapper', 'Blandpapper', 'Pappersförpackningar',
    'Pappershanddukar (TPC)', 'Pappershylsor', 'Tidningar och journaler',
  ] },
  { name: 'Plast', kinds: ['normal'], items: [
    'Plastförpackningar', 'Plastförpackningar, övriga', 'Plast, blandad', 'LDPE film färgad', 'LDPE 80/20', 'LDPE 90/10',
    'LDPE 95/5', 'LDPE 98/2', 'HDPE', 'Plast, polypropen, hård plast', 'EPS, Expanderad polystyren, vit',
    'EPS, Expanderad polystyren, färgad', 'PS, Polystyren', 'PET/PP Band, färgade', 'EPDM/PP',
    'Plaströr, blandade', 'PP Rör', 'PVC Rör',
  ] },
  { name: 'Blandat och brännbart', kinds: ['normal'], items: [
    'Brännbart avfall, fint', 'Brännbart avfall, grovt', 'Brännbart, fint utan plast och trä',
    'Brännbart, grovt utan plast och trä', 'Restavfall', 'Blandat avfall', 'Hushållsavfall, med organiskt',
    'Hygien- och kosmetikaprodukter', 'Läkemedelsrester', 'Textil, blandat', 'Textil, cirkulärt', 'Textilförpackningar',
  ] },
  { name: 'Biologiskt', kinds: ['normal'], items: [
    'Matavfall från hushåll, i papperspåse', 'Matavfall från hushåll, i plastpåse', 'Använd frityrfett, matolja',
    'Fett från fettavskiljare', 'Opaketerat, fast', 'Opaketerat, flytande', 'Paketerat, fast', 'Paketerat, flytande',
    'Paketerat i plast, fast', 'Paketerat i glas, fast', 'Paketerat i metall, fast', 'Paketerat i papper, fast',
    'Vegetabiliskt avfall opaketerat, fast', 'Vegetabiliskt avfall paketerat, fast', 'Park- och trädgårdsavfall',
    'Industrislam, animaliskt', 'Sjukhus- och laboratorieavfall',
  ] },
  { name: 'Glas', kinds: ['normal'], items: [
    'Glasförpackningar, färgat', 'Glasförpackningar, ofärgat', 'Planglas, blandat', 'Planglas i ram',
    'Planglas, rent, cirkulär lösning', 'Härdat glas, cirkulär lösning', 'Laminatglas',
  ] },
  { name: 'Järn och metaller', kinds: ['normal'], items: [
    'Blandskrot', 'Metallförpackningar', 'Aluminium kärl och plåt', 'Aluminium med järn', 'Aluminium, profil, rena',
    'Aluminium, profil, målade', 'Rostfritt SS 2371', 'Stål Klass 11 prima styckeskrot', 'Bly, mjuk',
    'Kabel, bland/industri, CU', 'Kabel, Aluminiumledare', 'Kabel, mix metallisk ledare', 'Brandsläckare',
    'Koldioxid mindre patroner',
  ] },
  { name: 'Trä', kinds: ['normal'], items: [
    'Träavfall obehandlat, omålat', 'Träavfall behandlat', 'Trä, cirkulärt', 'EUR pallar, hela, felfria',
    'Lastpall Halvpall (600x800mm)', 'Pallkragar till helpall', 'Pallkragar till halvpall',
    'Tryckimpregnerat trä, icke farligt avfall',
  ] },
  { name: 'Bygg- och rivningsavfall', kinds: ['normal'], items: [
    'Gips', 'Gips, oren', 'Mineralull', 'Tegel', 'Betong armerad', 'Betong oarmerad', 'Mineraliska massor',
    'Deponi, utsorterat', 'Blästersand, cont',
  ] },
  { name: 'Elektronik och ljuskällor', kinds: ['normal', 'fa'], items: [
    'Elavfall', 'Lysrör', 'Lågenergilampor', 'Ljuskällor', 'Glödlampor', 'Kretskort', 'Toner och färgpatroner',
    'Vitvaror', 'Kylmöbler, hushåll',
  ] },
  { name: 'Färg och lim', kinds: ['fa'], items: [
    'Färgburkar, lösningsmedelsbaserad', 'Färgburkar, vattenbaserad', 'Flytande färg, lösningsmedelsbaserad',
    'Flytande färg, vattenbas, emballerad 9 ADR', 'Färg vattenbaserad, fast emballerad',
    'Lim, vattenbaserad, flytande, emballerad',
  ] },
  { name: 'Farligt avfall', kinds: ['fa'], items: [
    'Spillolja', 'Olje-, och bränslefilter', 'Oljeavfall, fast, emballerat', 'Oljeemulsion', 'Slam, oljehaltigt',
    'Aerosoler, brandfarliga', 'Aerosoler, bekämpningsmedel', 'Aerosoler, isocyanater',
    'Lösningsmedel, flytande', 'Lösningsmedel, fast, emballerat', 'Lim, lösningsmedel, fast',
    'Lim, lösningsmedeldbaserat flytande', 'Glykolblandning', 'Bromsvätska', 'Bensin',
    'Batterier, blandat', 'Batterier, litium', 'Blybatterier, syra', 'Blybatterier stationära',
    'Förorenade förpackningar', 'Förpackningar, förorenade, farligt gods', 'Småkemikalier, fast och flytande',
    'Alkalisk avfettning, emballerad', 'Natriumhydroxidlösning', 'Tensider, flytande, alkalisk, FA',
    'Isocyanater', 'Smörjfettsrester, blandat', 'Hydraulslang med olja', 'Gasol, tunnväggiga engångs',
    'Industrigaser', 'Rökdetektorer och Brandvarnare', 'Kvicksilverinstrument, termometrar',
    'Laboratorieavfall, fast, kemikaliekontaminerat', 'Smittförande avfall, FA', 'Cytostatika / Antibiotika',
    'Asbest, bunden, emballerad', 'PCB-haltiga fogmassor, emballerat', 'Tryckimpregnerat trä, tungmetaller',
    'Tungmetallhaltigt avfall',
  ] },
];

// Det vanligaste – visas direkt som knappar. Resten nås via sök eller "Visa alla".
export const COMMON = {
  normal: [
    'Wellpapp, löst', 'Papper kontor', 'Sekretesspapper', 'Blandpapper', 'Pappersförpackningar',
    'Plastförpackningar', 'LDPE film färgad', 'Plast, blandad', 'Brännbart avfall, fint', 'Brännbart avfall, grovt',
    'Restavfall', 'Blandat avfall', 'Matavfall från hushåll, i papperspåse', 'Glasförpackningar, färgat',
    'Glasförpackningar, ofärgat', 'Metallförpackningar', 'Blandskrot', 'Träavfall obehandlat, omålat',
    'Träavfall behandlat', 'Elavfall',
  ],
  fa: [
    'Spillolja', 'Olje-, och bränslefilter', 'Oljeavfall, fast, emballerat', 'Aerosoler, brandfarliga',
    'Färgburkar, lösningsmedelsbaserad', 'Flytande färg, lösningsmedelsbaserad', 'Färgburkar, vattenbaserad',
    'Lösningsmedel, flytande', 'Lim, lösningsmedel, fast', 'Glykolblandning', 'Batterier, blandat',
    'Batterier, litium', 'Lysrör', 'Lågenergilampor', 'Elavfall', 'Förorenade förpackningar',
    'Småkemikalier, fast och flytande',
  ],
};
COMMON.all = [...new Set([...COMMON.normal, ...COMMON.fa])];

// ---------- Om registret från Offertverktyget är inläst används det i stället ----------
const regKind = (m) => (m.haz ? 'fa' : 'normal');
const regFits = (m, kind) => kind === 'all' || regKind(m) === kind;

export function groupsFor(kind) {
  if (getRegister()) {
    const groups = new Map();
    regMaterials().filter((m) => regFits(m, kind)).forEach((m) => {
      const g = m.group || (m.haz ? 'Farligt avfall' : 'Material');
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(m.name);
    });
    return [...groups.entries()].map(([name, items]) => ({ name, items }));
  }
  return MATERIAL_GROUPS.filter((g) => kind === 'all' || g.kinds.includes(kind));
}

export function commonFor(kind) {
  if (getRegister()) return regMaterials().filter((m) => m.fav && regFits(m, kind)).map((m) => m.name);
  return COMMON[kind];
}

export function allMaterialNames() {
  if (getRegister()) return regMaterials().map((m) => m.name);
  return MATERIAL_GROUPS.flatMap((g) => g.items);
}

// Passar materialet ihop med behållartypen? Egna (okända) material behålls alltid.
export function fitsKind(material, kind) {
  if (kind === 'all') return true;
  if (getRegister()) {
    const m = regMaterials().find((x) => x.name === material);
    if (m) return regFits(m, kind);
  }
  const kinds = MATERIAL_GROUPS.filter((g) => g.items.includes(material)).flatMap((g) => g.kinds);
  return !kinds.length || kinds.includes(kind);
}

// Mina gamla materialnamn → Ragn-Sells beteckningar.
export const LEGACY_MATERIALS = {
  Wellpapp: 'Wellpapp, löst',
  Brännbart: 'Brännbart avfall, fint',
  Kontorspapper: 'Papper kontor',
  Mjukplast: 'LDPE film färgad',
  Metall: 'Blandskrot',
  Trä: 'Träavfall obehandlat, omålat',
  Matavfall: 'Matavfall från hushåll, i papperspåse',
  Batterier: 'Batterier, blandat',
  'Lysrör och lampor': 'Lysrör',
  Oljefilter: 'Olje-, och bränslefilter',
  Sprayburkar: 'Aerosoler, brandfarliga',
  Glykol: 'Glykolblandning',
  Lösningsmedel: 'Lösningsmedel, flytande',
  'Oljiga trasor och absorbent': 'Oljeavfall, fast, emballerat',
  'Färg och lack': 'Färgburkar, lösningsmedelsbaserad',
  Kemikalier: 'Småkemikalier, fast och flytande',
  'Lim och fogmassa': 'Lim, lösningsmedel, fast',
};

// Egna material som du har skrivit in sparas i iPaden och kommer upp som förslag nästa gång.
const KEY = 'kundrunda.egnaMaterial';
export function customMaterials() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function rememberCustom(name) {
  if (allMaterialNames().includes(name)) return;
  try {
    const list = [name, ...customMaterials().filter((m) => m !== name)].slice(0, 40);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* inte kritiskt */ }
}

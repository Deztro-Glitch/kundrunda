// Alla listor i appen samlade på ett ställe – lätt att ändra.
import { TYPE_ICONS } from './icons.js';

// Kärltyper. "sizes" är de val som visas med ett tryck; det går alltid att skriva egen storlek.
// Namn och storlekar enligt ragnsells.se (containertyper och småbehållare & boxar).
export const TYPES = [
  { key: 'karl', label: 'Kärl', sizeLabel: 'Storlek', sizes: ['190 L', '370 L', '660 L', '1000 L'] },
  { key: 'liftdumper', label: 'Liftdumper', sizeLabel: 'Storlek', sizes: ['6–10 m³ töms på plats', '8 m³ lyftbar', '10 m³ öppen', '10 m³ täckt'] },
  { key: 'lastvaxlare', label: 'Lastväxlare', sizeLabel: 'Storlek', sizes: ['20 m³ öppen', '20 m³ täckt', '30 m³ öppen'] },
  { key: 'balpress', label: 'Balpress', sizeLabel: 'Storlek', sizes: [] },
  { key: 'miljoskap', label: 'Miljöskåp', sizeLabel: 'Storlek', sizes: ['FarligtEnkelt 1', 'FarligtEnkelt 2', 'FarligtEnkelt 3', 'MycketEnkelt 4'], collects: true },
  { key: 'fat', label: 'Fat', sizeLabel: 'Sort', sizes: ['Lockfat', 'Spundfat'] },
  { key: 'ibc', label: 'IBC', sizeLabel: 'Storlek', sizes: ['1000 L'] },
  { key: 'swedebox', label: 'Swedebox', sizeLabel: 'Storlek', sizes: ['500 L', '829 L', '865 L'] },
  { key: 'batteribox', label: 'Batteribox', sizeLabel: 'Storlek', sizes: ['535 L', '670 L'] },
  { key: 'smacontainer', label: 'Småcontainer', sizeLabel: 'Storlek', sizes: ['1100 L', '1300 L', 'Kryobox 600 L', '3 m³ internt bruk'] },
  { key: 'lysror', label: 'Lysrörsbehållare', tile: 'Lysrörs&shy;behållare', sizeLabel: 'Sort', sizes: ['Lysrörscontainer', 'Lysrörskartong', 'Lysrörstub'] },
  { key: 'elbur', label: 'Elbur', sizeLabel: 'Storlek', sizes: [] },
  { key: 'storsack', label: 'StorSäck', sizeLabel: 'Storlek', sizes: ['160 L', '1000 L', '2000 L'] },
  { key: 'sackstall', label: 'Säckställ / bur', sizeLabel: 'Sort', sizes: ['Säckställ', 'Wellpappbur'] },
  { key: 'atervinningsbox', label: 'Återvinningsbox', tile: 'Återvinnings&shy;box', sizeLabel: 'Storlek', sizes: ['21 L', '29 L', '42 L', '60 L', '90 L', 'Batteriholk'] },
  { key: 'sorteringsmobel', label: 'Sorteringsmöbel', tile: 'Sorterings&shy;möbel', sizeLabel: 'Storlek', sizes: [] },
  { key: 'annat', label: 'Annat', sizeLabel: 'Storlek', sizes: [] },
].map((t) => ({ ...t, icon: TYPE_ICONS[t.key] }));

export const UNKNOWN_TYPE = { key: '', label: 'Typ ej vald', sizes: [], icon: TYPE_ICONS.okand };
export const typeOf = (key) => TYPES.find((t) => t.key === key) || UNKNOWN_TYPE;

// "Kärl 370 L", "Miljöskåp Storlek 2" … men för fat räcker sorten: "Spundfat".
export const itemLabel = (it) => {
  const t = typeOf(it.type);
  if (t.sizeLabel === 'Sort' && t.sizes.includes(it.size)) return it.size;
  return [t.label, it.size].filter(Boolean).join(' ');
};

export const MATERIALS = [
  'Brännbart', 'Restavfall', 'Wellpapp', 'Kontorspapper', 'Plastförpackningar', 'Mjukplast',
  'Metall', 'Glas', 'Matavfall', 'Trä', 'Elavfall', 'Farligt avfall', 'Batterier', 'Lysrör',
];

// Det som kan samlas i ett miljöskåp (flera val).
export const HAZARDOUS = [
  'Färg och lack', 'Lösningsmedel', 'Spillolja', 'Oljefilter', 'Oljiga trasor och absorbent',
  'Sprayburkar', 'Glykol', 'Batterier', 'Lysrör och lampor', 'Kemikalier', 'Elavfall', 'Lim och fogmassa',
];

export const FILLS = [
  { key: 'tomt', label: 'Tomt', pct: 0 },
  { key: 'halvt', label: 'Halvt', pct: 50 },
  { key: 'fullt', label: 'Fullt', pct: 100 },
  { key: 'overfullt', label: 'Överfullt', pct: 100, over: true },
];
export const FREQS = ['1 gång/vecka', 'Varannan vecka', '1 gång/månad', 'Vid behov', 'Vet ej'];
export const SUPPLIERS = ['Ragn-Sells', 'Annan leverantör', 'Vet ej'];
export const FLAGS = [
  'Felsorterat', 'Överfullt', 'Trångt/svårt att nå', 'Saknar skylt',
  'Dålig ordning', 'Kan sorteras ut', 'Säkerhetsrisk',
];
export const RISK_FLAGS = ['Säkerhetsrisk'];
export const PLACE_SUGGESTIONS = [
  'Lastkajen', 'Verkstaden', 'Personalrummet', 'Kontoret', 'Lagret',
  'Produktionen', 'Miljöstationen', 'Soprummet', 'Utomhus',
];

// Vad som ligger i, som text (miljöskåp kan ha flera saker).
export const contentText = (it) => {
  if (typeOf(it.type).collects) {
    const list = [...(it.contents || []), it.contentsNote].filter(Boolean);
    return list.length ? list.join(', ') : it.material || '';
  }
  return it.material || '';
};

// Gör om kärl som sparades med den gamla typlistan (Kärl 190 L osv.).
const LEGACY = { k190: '190 L', k370: '370 L', k660: '660 L' };
export function normalizeItem(it) {
  if (!it) return it;
  if (LEGACY[it.type]) { it.size = it.size || LEGACY[it.type]; it.type = 'karl'; }
  it.flags ||= [];
  it.contents ||= [];
  it.size ||= '';
  return it;
}

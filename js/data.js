// Alla listor i appen samlade på ett ställe – lätt att ändra.
import { TYPE_ICONS } from './icons.js';

// Kärltyper. "sizes" är de val som visas med ett tryck; det går alltid att skriva egen storlek.
export const TYPES = [
  { key: 'karl', label: 'Kärl', sizeLabel: 'Storlek', sizes: ['140 L', '190 L', '240 L', '370 L', '660 L'] },
  { key: 'liftdumper', label: 'Liftdumper', sizeLabel: 'Storlek', sizes: ['6 m³', '8 m³', '10 m³'] },
  { key: 'lastvaxlare', label: 'Lastväxlare', sizeLabel: 'Storlek', sizes: ['10 m³', '20 m³', '30 m³', '40 m³'] },
  { key: 'balpress', label: 'Balpress', sizeLabel: 'Storlek', sizes: [] },
  { key: 'fat', label: 'Fat', sizeLabel: 'Sort', sizes: ['Lockfat', 'Spundfat'] },
  { key: 'ibc', label: 'IBC', sizeLabel: 'Storlek', sizes: ['1000 L'] },
  { key: 'miljoskap', label: 'Miljöskåp', sizeLabel: 'Storlek', sizes: ['Storlek 1', 'Storlek 2', 'Storlek 3', 'Storlek 4'], collects: true },
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
  'Sprayburkar', 'Batterier', 'Lysrör och lampor', 'Kemikalier', 'Elavfall', 'Lim och fogmassa',
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

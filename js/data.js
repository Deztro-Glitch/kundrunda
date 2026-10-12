// Alla listor i appen samlade på ett ställe – lätt att ändra.
import { TYPE_ICONS } from './icons.js';
import { LEGACY_MATERIALS } from './materials.js';

// Kärltyper. "sizes" är de val som visas med ett tryck; det går alltid att skriva egen storlek.
// Namn och storlekar enligt ragnsells.se (containertyper och småbehållare & boxar).
// kind: vilka material som passar – 'normal', 'fa' (farligt avfall) eller 'all'.
// main: visas direkt på platsen; övriga ligger under "Fler typer".
export const TYPES = [
  { key: 'karl', label: 'Kärl', main: true, kind: 'normal', sizeLabel: 'Storlek', sizes: ['190 L', '370 L', '660 L', '1000 L'] },
  { key: 'liftdumper', label: 'Liftdumper', main: true, kind: 'normal', sizeLabel: 'Storlek', sizes: ['6–10 m³ töms på plats', '8 m³ lyftbar', '10 m³ öppen', '10 m³ täckt'] },
  { key: 'lastvaxlare', label: 'Lastväxlare', main: true, kind: 'normal', sizeLabel: 'Storlek', sizes: ['20 m³ öppen', '20 m³ täckt', '30 m³ öppen'] },
  { key: 'direkttom', label: 'Direkttömmande', tile: 'Direkt&shy;tömmande', main: true, kind: 'normal', sizeLabel: 'Storlek', sizes: ['8 m³'] },
  { key: 'balpress', label: 'Balpress', main: true, kind: 'normal', sizeLabel: 'Storlek', sizes: [] },
  { key: 'miljoskap', label: 'Miljöskåp', main: true, kind: 'fa', sizeLabel: 'Storlek', sizes: ['FarligtEnkelt 1', 'FarligtEnkelt 2', 'FarligtEnkelt 3', 'MycketEnkelt 4'] },
  { key: 'fat', label: 'Fat', main: true, kind: 'fa', sizeLabel: 'Sort', sizes: ['Lockfat', 'Spundfat'] },
  { key: 'ibc', label: 'IBC', main: true, kind: 'all', sizeLabel: 'Storlek', sizes: ['1000 L'] },
  { key: 'swedebox', label: 'Swedebox', kind: 'fa', sizeLabel: 'Storlek', sizes: ['500 L', '829 L', '865 L'] },
  { key: 'batteribox', label: 'Batteribox', kind: 'fa', sizeLabel: 'Storlek', sizes: ['535 L', '670 L'], defaults: ['Blybatterier, syra'] },
  { key: 'smacontainer', label: 'Småcontainer', kind: 'fa', sizeLabel: 'Storlek', sizes: ['1100 L', '1300 L', 'Kryobox 600 L', '3 m³ internt bruk'] },
  { key: 'lysror', label: 'Lysrörsbehållare', tile: 'Lysrörs&shy;behållare', kind: 'fa', sizeLabel: 'Sort', sizes: ['Lysrörscontainer', 'Lysrörskartong', 'Lysrörstub'], defaults: ['Lysrör'] },
  { key: 'elbur', label: 'Elbur', kind: 'all', sizeLabel: 'Storlek', sizes: [], defaults: ['Elavfall'] },
  { key: 'storsack', label: 'StorSäck', kind: 'normal', sizeLabel: 'Storlek', sizes: ['160 L', '1000 L', '2000 L'] },
  { key: 'sackstall', label: 'Säckställ / bur', kind: 'normal', sizeLabel: 'Sort', sizes: ['Säckställ', 'Wellpappbur'] },
  { key: 'atervinningsbox', label: 'Återvinningsbox', tile: 'Återvinnings&shy;box', kind: 'all', sizeLabel: 'Storlek', sizes: ['21 L', '29 L', '42 L', '60 L', '90 L', 'Batteriholk'] },
  { key: 'sorteringsmobel', label: 'Sorteringsmöbel', tile: 'Sorterings&shy;möbel', kind: 'normal', sizeLabel: 'Storlek', sizes: [] },
  { key: 'annat', label: 'Annat', main: true, kind: 'all', sizeLabel: 'Storlek', sizes: [] },
].map((t) => ({ ...t, icon: TYPE_ICONS[t.key] }));

export const UNKNOWN_TYPE = { key: '', label: 'Typ ej vald', kind: 'all', sizes: [], icon: TYPE_ICONS.okand };
export const typeOf = (key) => TYPES.find((t) => t.key === key) || UNKNOWN_TYPE;

// "Kärl 370 L", "Miljöskåp FarligtEnkelt 2" … men för fat räcker sorten: "Spundfat".
export const itemLabel = (it) => {
  if (it.regLabel) return it.regLabel; // valt ur offertverktygets register
  if (it.type === 'annat' && it.customName) return [it.customName, it.size].filter(Boolean).join(' ');
  const t = typeOf(it.type);
  if (t.sizeLabel === 'Sort' && t.sizes.includes(it.size)) return it.size;
  return [t.label, it.size].filter(Boolean).join(' ');
};

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

// Vad som ligger i, som text.
export const contentText = (it) => (it.materials || []).join(', ');

// Gör om kärl som sparades med äldre versioner av appen.
const LEGACY_TYPES = { k190: '190 L', k370: '370 L', k660: '660 L' };
export function normalizeItem(it) {
  if (!it) return it;
  if (LEGACY_TYPES[it.type]) { it.size = it.size || LEGACY_TYPES[it.type]; it.type = 'karl'; }
  it.flags ||= [];
  it.size ||= '';
  it.regId ||= '';
  it.regLabel ||= '';
  it.customName ||= '';
  it.costs ||= {};
  if (!Array.isArray(it.materials)) {
    // Förr: ett material + (för miljöskåp) en lista + en fritext.
    const old = [...(it.contents || []), it.contentsNote, it.material]
      .filter(Boolean)
      .filter((m) => !(m === 'Farligt avfall' && (it.contents || []).length));
    it.materials = [...new Set(old.map((m) => LEGACY_MATERIALS[m] || m))];
    delete it.material; delete it.contents; delete it.contentsNote;
  }
  return it;
}

// Vad kunden betalar idag (om kunden berättat). Fälten är valfria och skrivs som kunden sa dem.
export const MATERIAL_UNITS = ['kr/kg', 'kr/ton', 'kr/st'];
export function costText(it) {
  const c = it.costs || {};
  return [
    c.rent && `Hyra ${c.rent} kr/mån`,
    c.empty && `Tömning ${c.empty} kr/st`,
    c.material && `Material ${c.material} ${c.materialUnit || 'kr/kg'}`,
    c.other,
  ].filter(Boolean).join(' · ');
}

// ---------- Förbättringar ----------
// En förbättring är en text och kan dessutom vara ett konkret förslag på kärl.
export const ACTIONS = [
  { key: 'ide', label: 'Bara en idé' },
  { key: 'ny', label: 'Nytt kärl' },
  { key: 'byt', label: 'Byt ut kärl' },
  { key: 'tabort', label: 'Ta bort kärl' },
];
export const needsTarget = (a) => a === 'byt' || a === 'tabort';
export const proposesContainer = (a) => a === 'ny' || a === 'byt';

export function normalizeIdea(x) {
  if (!x) return x;
  x.text ||= '';
  x.action ||= 'ide';
  x.type ||= '';
  x.size ||= '';
  x.regId ||= '';
  x.regLabel ||= '';
  x.customName ||= '';
  x.count = Number(x.count) || 1;
  if (!Array.isArray(x.materials)) x.materials = [];
  return x;
}

// "Nytt: 1 × Balpress – Wellpapp, löst" / "Byt Kärl 660 L mot …" / "Ta bort Kärl 370 L"
export function ideaSummary(x, items = []) {
  const target = items.find((i) => i.id === x.itemId);
  const tl = target ? itemLabel(target) : 'kärl';
  const what = x.type ? `${x.count} × ${itemLabel(x)}${x.materials.length ? ` – ${x.materials.join(', ')}` : ''}` : '';
  if (x.action === 'ny') return what ? `Nytt: ${what}` : 'Nytt kärl';
  if (x.action === 'byt') return `Byt ${tl}${what ? ` mot ${what}` : ''}`;
  if (x.action === 'tabort') return `Ta bort ${tl}`;
  return '';
}
export const ideaTitle = (x, items) => x.text.trim() || ideaSummary(x, items) || 'Ny förbättring';
export const ideaHasContent = (x) => !!(x.text.trim() || x.action !== 'ide');

// Ikoner som inbäddad SVG (fungerar offline, skalar skarpt).

const svg = (body, vb = '0 0 64 64', sw = 3) =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const label = (x, y, t) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="11" fill="currentColor" stroke="none">${t}</text>`;

// ---------- Kärltyper ----------
const bin190 = svg(`
  <path d="M19 18h26l-1 5H20z"/>
  <path d="M21 23l2 29h18l2-29"/>
  <path d="M45 18v-3h-4"/>
  <circle cx="26" cy="55" r="3.5"/>
  ${label(32, 42, '190')}`);

const bin370 = svg(`
  <path d="M14 14h36l-1.5 6h-33z"/>
  <path d="M17 20l3 32h24l3-32"/>
  <path d="M50 14v-4h-5"/>
  <circle cx="23" cy="55" r="3.5"/>
  ${label(32, 41, '370')}`);

const bin660 = svg(`
  <path d="M6 18h52l-2 6H8z"/>
  <path d="M9 24l2 26h42l2-26"/>
  <path d="M58 18v-4h-6"/>
  <circle cx="17" cy="54" r="3.5"/>
  <circle cx="47" cy="54" r="3.5"/>
  ${label(32, 42, '660')}`);

const liftdumper = svg(`
  <path d="M6 24h52l-7 26H13z"/>
  <path d="M10 32h-4M54 32h4"/>
  <path d="M6 32L32 8l26 24" stroke-width="2" stroke-dasharray="3 4"/>
  <path d="M20 30l2 14M32 30v14M44 30l-2 14" stroke-width="2"/>`);

const lastvaxlare = svg(`
  <path d="M10 22h50v24H10z"/>
  <path d="M10 30H5V14h6l4 8"/>
  <path d="M22 22v24M34 22v24M46 22v24" stroke-width="2"/>
  <circle cx="54" cy="50" r="3"/>
  <path d="M8 50h40"/>`);

const balpress = svg(`
  <rect x="14" y="5" width="36" height="54" rx="3"/>
  <rect x="20" y="12" width="24" height="14" rx="1.5"/>
  <path d="M32 15v8M28.5 19.5L32 23l3.5-3.5" stroke-width="2.5"/>
  <rect x="20" y="33" width="24" height="18" rx="1.5"/>
  <path d="M26 33v18M38 33v18" stroke-width="2"/>`);

const fat = svg(`
  <path d="M18 9h28c1.5 0 2.5 1 2.5 2.5v41c0 1.5-1 2.5-2.5 2.5H18c-1.5 0-2.5-1-2.5-2.5v-41C15.5 10 16.5 9 18 9z"/>
  <path d="M15.5 23h33M15.5 41h33"/>
  <circle cx="40" cy="15" r="2" stroke-width="2"/>`);

const ibc = svg(`
  <rect x="8" y="12" width="48" height="36" rx="2"/>
  <path d="M24 12v36M40 12v36M8 24h48M8 36h48" stroke-width="1.8"/>
  <path d="M28 12V8h8v4"/>
  <path d="M5 48h54v7H5z"/>
  <path d="M12 55v3M32 55v3M52 55v3"/>`);

const miljoskap = svg(`
  <rect x="10" y="7" width="44" height="50" rx="2.5"/>
  <path d="M32 7v50"/>
  <path d="M28 30v6M36 30v6"/>
  <path d="M21 14l6 11H15z" stroke-width="2.5"/>
  <path d="M21 18v3" stroke-width="2"/>
  <path d="M38 14h10M38 19h10" stroke-width="2"/>`);

const annat = svg(`
  <path d="M10 21l22-10 22 10v25L32 56 10 46z"/>
  <path d="M10 21l22 10 22-10M32 31v25"/>`);

const camera = svg(`
  <path d="M8 22c0-2.2 1.8-4 4-4h8l4-6h16l4 6h8c2.2 0 4 1.8 4 4v26c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4z"/>
  <circle cx="32" cy="34" r="10"/>`);

export const TYPES = [
  { key: 'k190', label: 'Kärl 190 L', icon: bin190 },
  { key: 'k370', label: 'Kärl 370 L', icon: bin370 },
  { key: 'k660', label: 'Kärl 660 L', icon: bin660 },
  { key: 'liftdumper', label: 'Liftdumper', icon: liftdumper },
  { key: 'lastvaxlare', label: 'Lastväxlare', icon: lastvaxlare },
  { key: 'balpress', label: 'Balpress', icon: balpress },
  { key: 'fat', label: 'Fat', icon: fat },
  { key: 'ibc', label: 'IBC', icon: ibc },
  { key: 'miljoskap', label: 'Miljöskåp', icon: miljoskap },
  { key: 'annat', label: 'Annat', icon: annat },
];

export const UNKNOWN_TYPE = { key: '', label: 'Typ ej vald', icon: camera };

export const typeOf = (key) => TYPES.find((t) => t.key === key) || UNKNOWN_TYPE;

// ---------- Gränssnittsikoner ----------
const ui = (body) => svg(body, '0 0 24 24', 2.2);

export const I = {
  back: ui('<path d="M15 5l-7 7 7 7"/>'),
  chev: ui('<path d="M9 5l7 7-7 7"/>'),
  plus: ui('<path d="M12 5v14M5 12h14"/>'),
  minus: ui('<path d="M5 12h14"/>'),
  close: ui('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: ui('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  trash: ui('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>'),
  camera: ui('<path d="M4 8.5A1.5 1.5 0 015.5 7h2.3l1.5-2.2h5.4L16.2 7h2.3A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.5"/>'),
  image: ui('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8"/>'),
  pin: ui('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  clipboard: svg('<rect x="14" y="10" width="36" height="46" rx="4"/><path d="M24 10V7h16v3"/><path d="M22 24h20M22 32h20M22 40h12"/>'),
  place: svg('<path d="M32 56S14 39 14 26a18 18 0 0136 0c0 13-18 30-18 30z"/><circle cx="32" cy="26" r="6"/>'),
};

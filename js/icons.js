// Ikoner som inbäddad SVG (fungerar offline, skalar skarpt).

const svg = (body, vb = '0 0 64 64', sw = 3) =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

// ---------- Kärltyper ----------
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

const karl = svg(`
  <path d="M14 14h36l-1.5 6h-33z"/>
  <path d="M17 20l3 32h24l3-32"/>
  <path d="M50 14v-4h-5"/>
  <path d="M26 28v16M32 28v16M38 28v16" stroke-width="2"/>
  <circle cx="23" cy="55" r="3.5"/>`);

const swedebox = svg(`
  <path d="M6 22h52v30H6z"/>
  <path d="M4 16h56v6H4z"/>
  <path d="M10 52v4M54 52v4M6 30h52" stroke-width="2"/>`);

const batteribox = svg(`
  <path d="M8 20h48v34H8z"/>
  <rect x="20" y="30" width="24" height="14" rx="2" stroke-width="2.5"/>
  <path d="M26 30v-3M38 30v-3" stroke-width="2.5"/>
  <path d="M28 37h4M36 35v4M34 37h4" stroke-width="2"/>
  <path d="M8 20l4-6h40l4 6"/>`);

const smacontainer = svg(`
  <path d="M6 20h52l-5 30H11z"/>
  <path d="M6 20l6-6h40l6 6"/>
  <path d="M22 26v18M32 26v18M42 26v18" stroke-width="2"/>
  <path d="M14 50v5M50 50v5"/>`);

const lysror = svg(`
  <rect x="12" y="8" width="40" height="48" rx="3"/>
  <path d="M20 16v32M28 16v32M36 16v32M44 16v32" stroke-width="2.5"/>`);

const elbur = svg(`
  <rect x="8" y="10" width="48" height="40" rx="2"/>
  <path d="M8 20h48M8 30h48M8 40h48M20 10v40M32 10v40M44 10v40" stroke-width="1.5"/>
  <path d="M12 50v6M52 50v6"/>
  <path d="M34 22l-6 9h6l-4 9" stroke-width="3"/>`);

const storsack = svg(`
  <path d="M12 18h40l-3 36H15z"/>
  <path d="M12 18l-4-8M52 18l4-8M20 18v-6M44 18v-6" stroke-width="2.5"/>
  <path d="M16 30h32" stroke-width="2"/>`);

const sackstall = svg(`
  <path d="M14 8v48M50 8v48M14 14h36"/>
  <path d="M17 14c0 6 2 30 4 36h22c2-6 4-30 4-36" stroke-width="2.5"/>
  <path d="M10 56h8M46 56h8"/>`);

const atervinningsbox = svg(`
  <path d="M12 22h40l-3 30H15z"/>
  <path d="M10 16h44v6H10z"/>
  <path d="M27 31l5-5 5 5M32 26v14M24 42h16" stroke-width="2.5"/>`);

const sorteringsmobel = svg(`
  <rect x="6" y="12" width="52" height="44" rx="2"/>
  <path d="M23 12v44M41 12v44"/>
  <path d="M10 20h9M27 20h10M45 20h9" stroke-width="3.5"/>`);

// Ikon per kärltyp (typerna själva finns i data.js).
export const TYPE_ICONS = {
  karl, liftdumper, lastvaxlare, balpress, fat, ibc, miljoskap, annat, okand: camera,
  swedebox, batteribox, smacontainer, lysror, elbur, storsack, sackstall, atervinningsbox, sorteringsmobel,
};

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
  next: ui('<path d="M9 5l7 7-7 7"/>'),
  prev: ui('<path d="M15 5l-7 7 7 7"/>'),
  idea: ui('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>'),
  present: ui('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/>'),
  share: ui('<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/>'),
  doc: ui('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
  flag: ui('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  eye: ui('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  image: ui('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8"/>'),
  pin: ui('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  clipboard: svg('<rect x="14" y="10" width="36" height="46" rx="4"/><path d="M24 10V7h16v3"/><path d="M22 24h20M22 32h20M22 40h12"/>'),
  place: svg('<path d="M32 56S14 39 14 26a18 18 0 0136 0c0 13-18 30-18 30z"/><circle cx="32" cy="26" r="6"/>'),
};

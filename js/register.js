// Registret från Offertverktyget (kärl, containrar och material – utan priser).
// Läses in från en fil och sparas bara i iPaden. När det finns används samma namn som i offerten.

const KEY = 'kundrunda.register';
let cache;

export function getRegister() {
  if (cache !== undefined) return cache;
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || 'null');
    cache = r && Array.isArray(r.items) ? r : null;
  } catch { cache = null; }
  return cache;
}

// Bara det appen behöver – priser och interna beskrivningar följer inte med.
const pick = (it) => ({
  id: String(it.id), type: it.type, name: String(it.name || ''), size: String(it.size || ''),
  cname: String(it.cname || ''), haz: !!it.haz, fav: it.fav !== false, group: String(it.group || ''),
});

export function parseRegister(data) {
  const items = Array.isArray(data?.items) ? data.items : null;
  if (!items || !items.some((x) => x && (x.type === 'karl' || x.type === 'material'))) return null;
  return items.filter((x) => x && x.id && x.name && (x.type === 'karl' || x.type === 'material')).map(pick);
}

export function saveRegister(items) {
  cache = { importedAt: Date.now(), items };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* fullt minne – används ändå tills appen stängs */ }
}

export function clearRegister() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch { /* inte kritiskt */ }
}

// Namnet kunden ser (som i offerten).
export const regLabel = (it) => {
  const n = it.cname || it.name;
  return it.size ? `${n} ${it.size}` : n;
};

// Vilken av Kundrundas kärltyper (med ikon) en registerpost hör till.
export function categoryOf(it) {
  const n = `${it.name} ${it.cname}`.toLowerCase();
  if (/liftdumper/.test(n)) return 'liftdumper';
  if (/lastväxl/.test(n)) return 'lastvaxlare';
  if (/direkttöm|kombi/.test(n)) return 'direkttom';
  if (/balpress|komprimator/.test(n)) return 'balpress';
  if (/miljöskåp|skåp/.test(n)) return 'miljoskap';
  if (/\bibc/.test(n)) return 'ibc';
  if (/\bfat\b|lockfat|spundfat|sprundfat/.test(n)) return 'fat';
  if (/swedebox/.test(n)) return 'swedebox';
  if (/batteribox/.test(n)) return 'batteribox';
  if (/lysrör/.test(n)) return 'lysror';
  if (/storsäck/.test(n)) return 'storsack';
  if (/säckhållare|säckställ|bur\b/.test(n)) return 'sackstall';
  if (/kärl/.test(n)) return 'karl';
  if (/box/.test(n)) return 'atervinningsbox';
  return 'annat';
}

export const regContainersFor = (typeKey) =>
  (getRegister()?.items || []).filter((it) => it.type === 'karl' && categoryOf(it) === typeKey);

export const regMaterials = () => (getRegister()?.items || []).filter((it) => it.type === 'material');

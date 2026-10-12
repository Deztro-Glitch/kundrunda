// Enkel lagring i iPadens IndexedDB. Inget skickas någonstans.
// Tabeller: visits (besök), places (platser), items (kärl), photos (bilder som Blob), ideas (idéer).
import { normalizeItem, normalizeIdea } from './data.js';

const DB_NAME = 'kundrunda';
const DB_VERSION = 2;
let dbPromise;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const make = (name, indexes) => {
        if (db.objectStoreNames.contains(name)) return;
        const s = db.createObjectStore(name, { keyPath: 'id' });
        indexes.forEach((i) => s.createIndex(i, i));
      };
      make('visits', []);
      make('places', ['visitId']);
      make('items', ['visitId', 'placeId']);
      make('photos', ['visitId', 'placeId', 'itemId']);
      make('ideas', ['visitId', 'placeId', 'itemId']);
    };
    req.onsuccess = () => {
      const db = req.result;
      // En nyare version av appen (i en annan flik) vill uppgradera: släpp databasen och ladda om.
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      document.getElementById('main').innerHTML =
        '<div class="empty"><p><b>Appen har uppdaterats.</b></p><p>Stäng andra flikar med Kundrunda och öppna appen igen.</p></div>';
    };
  });
  return dbPromise;
}

const wrap = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function store(name, mode = 'readonly') {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}

// Bilder sparas som rena bilddata (ArrayBuffer), inte som Blob. Safari på iPad kan annars
// tappa bort bilderna efter en stund (de visas då som ett blått frågetecken).
async function packPhoto(obj) {
  const { blob, ...rest } = obj;
  if (rest.data) return rest;
  return { ...rest, data: await blob.arrayBuffer(), type: blob.type || 'image/jpeg' };
}
function unpackPhoto(p) {
  if (p && p.data) p.blob = new Blob([p.data], { type: p.type || 'image/jpeg' });
  return p;
}

const NORMALIZE = { items: normalizeItem, photos: unpackPhoto, ideas: normalizeIdea };
const fix = (name, rows) => (NORMALIZE[name] ? rows.map(NORMALIZE[name]) : rows);

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export async function get(name, id) {
  const row = await wrap((await store(name)).get(id));
  return NORMALIZE[name] ? NORMALIZE[name](row) : row;
}

export async function all(name) {
  return fix(name, await wrap((await store(name)).getAll()));
}

export async function by(name, index, value) {
  return fix(name, await wrap((await store(name)).index(index).getAll(value)));
}

export async function put(name, obj) {
  obj.updatedAt = Date.now();
  if (!obj.createdAt) obj.createdAt = obj.updatedAt;
  // Bilddata läses färdigt innan sparandet börjar (annars stänger webbläsaren transaktionen).
  const rec = name === 'photos' ? await packPhoto(obj) : obj;
  await wrap((await store(name, 'readwrite')).put(rec));
  return obj;
}

export async function del(name, id) {
  return wrap((await store(name, 'readwrite')).delete(id));
}

async function delMany(name, index, value) {
  const rows = await by(name, index, value);
  const s = await store(name, 'readwrite');
  await Promise.all(rows.map((r) => wrap(s.delete(r.id))));
}

// Idéer tas aldrig bort av misstag – de kopplas bara loss och hamnar under "hela besöket".
async function unlinkIdeas(index, value) {
  const rows = await by('ideas', index, value);
  for (const r of rows) {
    if (index === 'placeId') { r.placeId = null; r.itemId = null; } else r.itemId = null;
    await put('ideas', r);
  }
}

// Ta bort ett kärl med dess bilder.
export async function deleteItem(id) {
  await delMany('photos', 'itemId', id);
  await unlinkIdeas('itemId', id);
  await del('items', id);
}

// Ta bort en plats med allt som hör till den.
export async function deletePlace(id) {
  await delMany('photos', 'placeId', id);
  await delMany('items', 'placeId', id);
  await unlinkIdeas('placeId', id);
  await del('places', id);
}

// Ta bort ett helt besök med allt som hör till det.
export async function deleteVisit(id) {
  await delMany('photos', 'visitId', id);
  await delMany('items', 'visitId', id);
  await delMany('places', 'visitId', id);
  await delMany('ideas', 'visitId', id);
  await del('visits', id);
}

// Allt som hör till ett besök, på en gång.
export async function loadVisit(id) {
  const visit = await get('visits', id);
  if (!visit) return null;
  const [places, items, photos, ideas] = await Promise.all([
    by('places', 'visitId', id), by('items', 'visitId', id),
    by('photos', 'visitId', id), by('ideas', 'visitId', id),
  ]);
  // Bilder sparade av äldre versioner: försök rädda dem till det nya formatet.
  for (const p of photos) {
    if (p.data || !p.blob) continue;
    try {
      const data = await p.blob.arrayBuffer();
      p.blob = new Blob([data], { type: p.blob.type || 'image/jpeg' });
      await put('photos', p);
    } catch { p.broken = true; }
  }
  const order = (a, b) => a.createdAt - b.createdAt;
  return { visit, places: places.sort(order), items: items.sort(order), photos: photos.sort(order), ideas: ideas.sort(order) };
}

// Be Safari att inte rensa datan automatiskt.
export async function askPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (e) { /* inte kritiskt */ }
}

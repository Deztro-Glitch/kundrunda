// Enkel lagring i iPadens IndexedDB. Inget skickas någonstans.
// Tabeller: visits (besök), places (platser), items (kärl), photos (bilder som Blob).

const DB_NAME = 'kundrunda';
const DB_VERSION = 1;
let dbPromise;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('visits')) {
        db.createObjectStore('visits', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('places')) {
        const s = db.createObjectStore('places', { keyPath: 'id' });
        s.createIndex('visitId', 'visitId');
      }
      if (!db.objectStoreNames.contains('items')) {
        const s = db.createObjectStore('items', { keyPath: 'id' });
        s.createIndex('visitId', 'visitId');
        s.createIndex('placeId', 'placeId');
      }
      if (!db.objectStoreNames.contains('photos')) {
        const s = db.createObjectStore('photos', { keyPath: 'id' });
        s.createIndex('visitId', 'visitId');
        s.createIndex('placeId', 'placeId');
        s.createIndex('itemId', 'itemId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export async function get(name, id) {
  return wrap((await store(name)).get(id));
}

export async function all(name) {
  return wrap((await store(name)).getAll());
}

export async function by(name, index, value) {
  return wrap((await store(name)).index(index).getAll(value));
}

export async function put(name, obj) {
  obj.updatedAt = Date.now();
  if (!obj.createdAt) obj.createdAt = obj.updatedAt;
  await wrap((await store(name, 'readwrite')).put(obj));
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

// Ta bort ett kärl med dess bilder.
export async function deleteItem(id) {
  await delMany('photos', 'itemId', id);
  await del('items', id);
}

// Ta bort en plats med allt som hör till den.
export async function deletePlace(id) {
  await delMany('photos', 'placeId', id);
  await delMany('items', 'placeId', id);
  await del('places', id);
}

// Ta bort ett helt besök med allt som hör till det.
export async function deleteVisit(id) {
  await delMany('photos', 'visitId', id);
  await delMany('items', 'visitId', id);
  await delMany('places', 'visitId', id);
  await del('visits', id);
}

// Be Safari att inte rensa datan automatiskt.
export async function askPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (e) { /* inte kritiskt */ }
}

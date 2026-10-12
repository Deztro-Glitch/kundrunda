import * as db from './db.js';
import { compress } from './image.js';
import { TYPES, typeOf, I } from './icons.js';

// ---------- Listor att välja från ----------
const MATERIALS = [
  'Brännbart', 'Restavfall', 'Wellpapp', 'Kontorspapper', 'Plastförpackningar', 'Mjukplast',
  'Metall', 'Glas', 'Matavfall', 'Trä', 'Elavfall', 'Farligt avfall', 'Batterier', 'Lysrör',
];
const FILLS = [
  { key: 'tomt', label: 'Tomt', pct: 0 },
  { key: 'halvt', label: 'Halvt', pct: 50 },
  { key: 'fullt', label: 'Fullt', pct: 100 },
  { key: 'overfullt', label: 'Överfullt', pct: 100, over: true },
];
const FREQS = ['1 gång/vecka', 'Varannan vecka', '1 gång/månad', 'Vid behov', 'Vet ej'];
const SUPPLIERS = ['Ragn-Sells', 'Annan leverantör', 'Vet ej'];
const FLAGS = [
  'Felsorterat', 'Överfullt', 'Trångt/svårt att nå', 'Saknar skylt',
  'Dålig ordning', 'Kan sorteras ut', 'Säkerhetsrisk',
];
const RISK_FLAGS = ['Säkerhetsrisk'];
const PLACE_SUGGESTIONS = [
  'Lastkajen', 'Verkstaden', 'Personalrummet', 'Kontoret', 'Lagret',
  'Produktionen', 'Miljöstationen', 'Soprummet', 'Utomhus',
];

// ---------- Hjälpfunktioner ----------
const topbar = document.getElementById('topbar');
const main = document.getElementById('main');
const camera = document.getElementById('camera');
const library = document.getElementById('library');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const prettyDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const go = (hash) => { location.hash = hash; };

// Bild-URL:er frigörs när man byter sida så minnet inte tar slut.
let urls = [];
const photoUrl = (p) => { const u = URL.createObjectURL(p.blob); urls.push(u); return u; };
const revokeUrls = () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; };

let toastTimer;
function toast(msg, ms = 2400) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => t.remove(), ms);
  return t;
}

function flashSaved() {
  const s = topbar.querySelector('.saved');
  if (!s) return;
  s.classList.add('show');
  clearTimeout(flashSaved.t);
  flashSaved.t = setTimeout(() => s.classList.remove('show'), 1400);
}

// ---------- Spara automatiskt ----------
const pending = new Map();
function saveSoon(store, obj) {
  clearTimeout(pending.get(obj.id)?.t);
  pending.set(obj.id, { store, obj, t: setTimeout(() => commit(obj.id), 450) });
}
async function commit(id) {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  clearTimeout(p.t);
  await db.put(p.store, p.obj);
  flashSaved();
}
const flushSaves = () => Promise.all([...pending.keys()].map(commit));
async function saveNow(store, obj) {
  if (pending.has(obj.id)) { clearTimeout(pending.get(obj.id).t); pending.delete(obj.id); }
  await db.put(store, obj);
  flashSaved();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSaves(); });

// Kopplar textfält med data-field till ett objekt och sparar medan man skriver.
function bindFields(root, obj, store, onChange) {
  root.querySelectorAll('[data-field]').forEach((el) => {
    if (!('value' in el) || el.closest('.choice')) return;
    el.addEventListener('input', () => {
      obj[el.dataset.field] = el.value;
      saveSoon(store, obj);
      onChange?.();
    });
  });
}

// ---------- Kamera ----------
// Kameran tar en bild. Bildbiblioteket låter dig välja flera på en gång.
function pickPhoto(onFile, { fromLibrary = false } = {}) {
  const input = fromLibrary ? library : camera;
  input.value = '';
  input.onchange = async () => {
    const files = [...(input.files || [])];
    if (!files.length) return;
    const t = toast(files.length > 1 ? `Sparar ${files.length} bilder …` : 'Sparar bild …', 0);
    try {
      for (const f of files) await onFile(f);
    } catch (e) { console.error(e); toast('Bilden kunde inte sparas'); return; }
    t.remove();
  };
  input.click();
}

async function addPhoto(file, link) {
  const { blob, width, height } = await compress(file);
  return db.put('photos', { id: db.uid(), ...link, blob, width, height });
}

function openViewer(photo, onDeleted) {
  const v = document.createElement('div');
  v.className = 'viewer';
  const url = URL.createObjectURL(photo.blob);
  v.innerHTML = `
    <div class="bar">
      <button class="btn danger" data-del>${I.trash} Ta bort bild</button>
      <button class="btn ghost" data-close>${I.close} Stäng</button>
    </div>
    <div class="img"><img src="${url}" alt=""></div>`;
  const close = () => { URL.revokeObjectURL(url); v.remove(); };
  v.querySelector('[data-close]').onclick = close;
  v.querySelector('.img').onclick = (e) => { if (e.target.tagName !== 'IMG') close(); };
  v.querySelector('[data-del]').onclick = async () => {
    if (!confirm('Ta bort bilden?')) return;
    await db.del('photos', photo.id);
    close();
    onDeleted?.();
  };
  document.body.appendChild(v);
}

function photosHtml(photos, addLabel = 'Ta bild') {
  return `<div class="photos">
    <button class="add-photo" data-add-photo>${I.camera}<span>${addLabel}</span></button>
    <button class="add-photo soft" data-add-library>${I.image}<span>Från bilder</span></button>
    ${photos.map((p) => `<button class="photo" data-photo="${p.id}"><img src="${photoUrl(p)}" alt=""></button>`).join('')}
  </div>`;
}

function bindPhotos(root, photos, link, refreshFn) {
  root.querySelector('[data-add-photo]')?.addEventListener('click', () =>
    pickPhoto(async (file) => { await addPhoto(file, link); refreshFn(); }));
  root.querySelector('[data-add-library]')?.addEventListener('click', () =>
    pickPhoto(async (file) => { await addPhoto(file, link); refreshFn(); }, { fromLibrary: true }));
  root.querySelectorAll('[data-photo]').forEach((b) => {
    b.onclick = () => openViewer(photos.find((p) => p.id === b.dataset.photo), refreshFn);
  });
}

// ---------- Toppfält ----------
function setTop({ back, title, sub, brand }) {
  topbar.innerHTML = `
    ${back ? `<button class="iconbtn" data-back aria-label="Tillbaka">${I.back}</button>` : ''}
    <div class="title">
      ${brand ? `<div class="brand">Ragn-Sells · Kundrunda</div>` : ''}
      <h1>${esc(title)}</h1>
      ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    </div>
    <div class="saved">${I.check.replace('<svg', '<svg width="20" height="20"')} Sparat</div>`;
  if (back) topbar.querySelector('[data-back]').onclick = () => go(back);
}
const setTitle = (t) => { const h = topbar.querySelector('h1'); if (h) h.textContent = t; };

// =====================================================================
// Startsida: lista över besök
// =====================================================================
async function homeView() {
  const [visits, places, items] = await Promise.all([db.all('visits'), db.all('places'), db.all('items')]);
  visits.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  const count = (rows, id) => rows.filter((r) => r.visitId === id).length;
  const containers = (id) => items.filter((i) => i.visitId === id).reduce((s, i) => s + (Number(i.count) || 1), 0);

  setTop({ brand: true, title: 'Mina besök' });
  main.innerHTML = `
    <button class="btn big block" id="new">${I.plus} Nytt besök</button>
    <div class="section">
      ${visits.length ? `<div class="visit-list">${visits.map((v) => {
        const [, m, d] = (v.date || '').split('-').map(Number);
        const meta = [v.address, plural(count(places, v.id), 'plats', 'platser'), plural(containers(v.id), 'kärl', 'kärl')]
          .filter(Boolean).join(' · ');
        return `<button class="visit" data-id="${v.id}">
          <div class="date"><b>${d || '–'}</b><small>${m ? MONTHS[m - 1] : ''}</small></div>
          <div class="info"><strong>${esc(v.customer || 'Namnlöst besök')}</strong><span>${esc(meta)}</span></div>
          <span class="chev">${I.chev}</span>
        </button>`;
      }).join('')}</div>` : `
      <div class="empty">${I.clipboard}<p>Inga besök än.</p><p>Tryck på <b>Nytt besök</b> när du är hos kunden.</p></div>`}
    </div>`;

  main.querySelector('#new').onclick = async () => {
    const v = await db.put('visits', { id: db.uid(), customer: '', address: '', contact: '', date: today(), notes: '' });
    go(`#/besok/${v.id}`);
  };
  main.querySelectorAll('.visit').forEach((b) => { b.onclick = () => go(`#/besok/${b.dataset.id}`); });
}

// =====================================================================
// Ett besök: kunduppgifter, platser, anteckningar
// =====================================================================
async function visitView(id) {
  const visit = await db.get('visits', id);
  if (!visit) return go('#/');
  const [places, items, photos] = await Promise.all([
    db.by('places', 'visitId', id), db.by('items', 'visitId', id), db.by('photos', 'visitId', id),
  ]);
  places.sort((a, b) => a.createdAt - b.createdAt);
  const isNew = !visit.customer;

  const placeCard = (p) => {
    const pItems = items.filter((i) => i.placeId === p.id);
    const pPhotos = photos.filter((ph) => ph.placeId === p.id);
    const cover = pPhotos.find((ph) => !ph.itemId) || pPhotos[0];
    const total = pItems.reduce((s, i) => s + (Number(i.count) || 1), 0);
    const types = [...new Set(pItems.map((i) => i.type).filter(Boolean))].slice(0, 6);
    return `<button class="place" data-id="${p.id}">
      <div class="thumb">${cover ? `<img src="${photoUrl(cover)}" alt="">` : I.place}</div>
      <div class="body">
        <h3>${esc(p.name)}</h3>
        <div class="meta"><span>${plural(total, 'kärl', 'kärl')}</span><span>${plural(pPhotos.length, 'bild', 'bilder')}</span></div>
        ${types.length ? `<div class="mini-icons">${types.map((t) => typeOf(t).icon).join('')}</div>` : ''}
      </div>
    </button>`;
  };

  setTop({ back: '#/', title: visit.customer || 'Nytt besök', sub: prettyDate(visit.date) });
  main.innerHTML = `
    <div class="card">
      <div class="grid-2">
        <label class="field"><span>Kund</span><input class="input" data-field="customer" value="${esc(visit.customer)}" placeholder="Företagets namn" autocomplete="off"></label>
        <label class="field"><span>Datum</span><input class="input" type="date" data-field="date" value="${esc(visit.date)}"></label>
        <label class="field"><span>Adress</span><input class="input" data-field="address" value="${esc(visit.address)}" placeholder="Gata, ort" autocomplete="off"></label>
        <label class="field"><span>Kontaktperson</span><input class="input" data-field="contact" value="${esc(visit.contact)}" placeholder="Namn, telefon" autocomplete="off"></label>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Platser</h2></div>
      ${places.length ? `<div class="place-grid">${places.map(placeCard).join('')}</div><div class="spacer"></div>` : ''}
      <div class="card add-place">
        <h3>Lägg till plats</h3>
        <div class="row">
          <input class="input" id="placeName" placeholder="T.ex. Lastkajen" autocomplete="off" enterkeyhint="done">
          <button class="btn" id="addPlace">${I.plus} Lägg till</button>
        </div>
        <div class="chips">${PLACE_SUGGESTIONS.filter((s) => !places.some((p) => p.name === s))
          .map((s) => `<button class="chip" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Anteckningar om besöket</h2></div>
      <textarea class="input" data-field="notes" placeholder="Allmänt om kunden, vad ni pratade om …">${esc(visit.notes)}</textarea>
    </div>

    <div class="danger-zone">
      <button class="btn danger" id="delVisit">${I.trash} Ta bort hela besöket</button>
    </div>`;

  bindFields(main, visit, 'visits', () => {
    setTitle(visit.customer || 'Nytt besök');
    topbar.querySelector('.sub').textContent = prettyDate(visit.date);
  });
  if (isNew) setTimeout(() => main.querySelector('[data-field="customer"]').focus(), 300);

  const addPlace = async (name) => {
    name = name.trim();
    if (!name) { main.querySelector('#placeName').focus(); return; }
    const p = await db.put('places', { id: db.uid(), visitId: id, name, notes: '' });
    go(`#/plats/${p.id}`);
  };
  main.querySelector('#addPlace').onclick = () => addPlace(main.querySelector('#placeName').value);
  main.querySelector('#placeName').onkeydown = (e) => { if (e.key === 'Enter') addPlace(e.target.value); };
  main.querySelectorAll('[data-suggest]').forEach((c) => { c.onclick = () => addPlace(c.dataset.suggest); });
  main.querySelectorAll('.place').forEach((b) => { b.onclick = () => go(`#/plats/${b.dataset.id}`); });

  main.querySelector('#delVisit').onclick = async () => {
    if (!confirm(`Ta bort besöket hos ${visit.customer || 'kunden'} med alla platser, kärl och bilder? Det går inte att ångra.`)) return;
    await db.deleteVisit(id);
    toast('Besöket är borttaget');
    go('#/');
  };
}

// =====================================================================
// En plats: kärl, bilder, anteckning
// =====================================================================
async function placeView(id) {
  const place = await db.get('places', id);
  if (!place) return go('#/');
  const [items, photos] = await Promise.all([db.by('items', 'placeId', id), db.by('photos', 'placeId', id)]);
  items.sort((a, b) => a.createdAt - b.createdAt);
  const placePhotos = photos.filter((p) => !p.itemId).sort((a, b) => a.createdAt - b.createdAt);
  const visit = await db.get('visits', place.visitId);

  const itemRow = (it) => {
    const t = typeOf(it.type);
    const ph = photos.filter((p) => p.itemId === it.id).sort((a, b) => a.createdAt - b.createdAt)[0];
    const fill = FILLS.find((f) => f.key === it.fill);
    const meta = [it.material, fill?.label, it.frequency].filter(Boolean).join(' · ');
    return `<button class="item ${it.type ? '' : 'todo'}" data-id="${it.id}">
      <div class="ico">${ph ? `<img src="${photoUrl(ph)}" alt="">` : t.icon}</div>
      <div class="txt">
        <strong>${esc(t.label)}</strong>
        <div class="meta">${esc(meta || (it.type ? 'Inga detaljer än' : 'Tryck för att fylla i'))}</div>
        ${it.flags?.length ? `<div class="tags">${it.flags.map((f) =>
          `<span class="tag ${RISK_FLAGS.includes(f) ? 'risk' : ''}">${esc(f)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="count">${Number(it.count) || 1} st</div>
    </button>`;
  };

  setTop({ back: `#/besok/${place.visitId}`, title: place.name, sub: visit?.customer });
  main.innerHTML = `
    <div class="section-head"><h2>Lägg till kärl</h2></div>
    <div class="type-grid">
      <button class="type photo-first" id="photoFirst">${I.camera}<span>Foto först</span></button>
      ${TYPES.map((t) => `<button class="type" data-type="${t.key}">${t.icon}<span>${t.label}</span></button>`).join('')}
    </div>
    <div class="photo-first-row">
      <p class="hint">Foto först: ta en bild nu och välj typ och detaljer senare.</p>
      <button class="btn ghost" id="photoFirstLib">${I.image} Foto först från bilder</button>
    </div>

    <div class="section">
      <div class="section-head"><h2>Kärl här</h2></div>
      ${items.length ? `<div class="item-list">${items.map(itemRow).join('')}</div>`
        : `<div class="empty"><p>Inga kärl på den här platsen än.</p></div>`}
    </div>

    <div class="section">
      <div class="section-head"><h2>Bilder på platsen</h2></div>
      ${photosHtml(placePhotos, 'Bild på platsen')}
    </div>

    <div class="section">
      <div class="section-head"><h2>Anteckning om platsen</h2></div>
      <textarea class="input" data-field="notes" placeholder="T.ex. trångt vid porten, kärlen står utomhus …">${esc(place.notes)}</textarea>
    </div>

    <div class="section">
      <label class="field"><span>Platsens namn</span><input class="input" data-field="name" value="${esc(place.name)}" autocomplete="off"></label>
    </div>

    <div class="danger-zone">
      <button class="btn danger" id="delPlace">${I.trash} Ta bort platsen</button>
    </div>`;

  bindFields(main, place, 'places', () => setTitle(place.name || 'Plats'));
  bindPhotos(main, placePhotos, { visitId: place.visitId, placeId: id, itemId: null }, refresh);

  const newItem = (type) => db.put('items', {
    id: db.uid(), visitId: place.visitId, placeId: id, type, count: 1,
    material: '', fill: '', frequency: '', supplier: '', flags: [], notes: '',
  });
  main.querySelectorAll('[data-type]').forEach((b) => {
    b.onclick = async () => { const it = await newItem(b.dataset.type); go(`#/karl/${it.id}`); };
  });
  // Varje bild blir ett eget kärl med "Typ ej vald".
  const photoFirst = (fromLibrary) => pickPhoto(async (file) => {
    const it = await newItem('');
    await addPhoto(file, { visitId: place.visitId, placeId: id, itemId: it.id });
    toast('Sparat. Fyll i detaljer när det passar.');
    refresh();
  }, { fromLibrary });
  main.querySelector('#photoFirst').onclick = () => photoFirst(false);
  main.querySelector('#photoFirstLib').onclick = () => photoFirst(true);
  main.querySelectorAll('.item').forEach((b) => { b.onclick = () => go(`#/karl/${b.dataset.id}`); });

  main.querySelector('#delPlace').onclick = async () => {
    if (!confirm(`Ta bort platsen "${place.name}" med alla kärl och bilder? Det går inte att ångra.`)) return;
    await db.deletePlace(id);
    go(`#/besok/${place.visitId}`);
  };
}

// =====================================================================
// Ett kärl: typ, antal, material, fyllnad, flaggor, bilder, anteckning
// =====================================================================
function choiceGroup(field, options, value, placeholder) {
  const custom = value && !options.includes(value) ? value : '';
  return `<div class="choice" data-field="${field}">
    <div class="chips">${options.map((o) =>
      `<button class="chip ${o === value ? 'on' : ''}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>
    <input class="input" style="margin-top:10px" placeholder="${esc(placeholder)}" value="${esc(custom)}" autocomplete="off">
  </div>`;
}

function bindChoices(root, obj, store, onChange) {
  root.querySelectorAll('.choice').forEach((g) => {
    const f = g.dataset.field;
    const input = g.querySelector('input');
    const chips = [...g.querySelectorAll('.chip')];
    chips.forEach((c) => {
      c.onclick = () => {
        obj[f] = obj[f] === c.dataset.val ? '' : c.dataset.val; // tryck igen = avmarkera
        chips.forEach((x) => x.classList.toggle('on', x.dataset.val === obj[f]));
        input.value = '';
        saveNow(store, obj);
        onChange?.();
      };
    });
    input.oninput = () => {
      obj[f] = input.value.trim();
      chips.forEach((x) => x.classList.toggle('on', x.dataset.val === obj[f]));
      saveSoon(store, obj);
      onChange?.();
    };
  });
}

async function itemView(id) {
  const item = await db.get('items', id);
  if (!item) return go('#/');
  item.flags ||= [];
  const place = await db.get('places', item.placeId);
  const photos = (await db.by('photos', 'itemId', id)).sort((a, b) => a.createdAt - b.createdAt);

  setTop({ back: `#/plats/${item.placeId}`, title: typeOf(item.type).label, sub: place?.name });
  main.innerHTML = `
    <div class="section-head"><h2>Bilder</h2></div>
    ${photosHtml(photos)}

    <div class="section">
      <div class="section-head"><h2>Typ</h2></div>
      <div class="type-grid">${TYPES.map((t) =>
        `<button class="type ${t.key === item.type ? 'on' : ''}" data-type="${t.key}">${t.icon}<span>${t.label}</span></button>`).join('')}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Antal</h2></div>
      <div class="stepper">
        <button id="minus" aria-label="Ett färre">${I.minus}</button>
        <output id="count">${Number(item.count) || 1}</output>
        <button id="plus" aria-label="Ett till">${I.plus}</button>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Vad ligger i?</h2></div>
      ${choiceGroup('material', MATERIALS, item.material, 'Annat – skriv här')}
    </div>

    <div class="section">
      <div class="section-head"><h2>Hur fullt?</h2></div>
      <div class="fill-grid">${FILLS.map((f) => `
        <button class="fill ${f.over ? 'over' : ''} ${f.key === item.fill ? 'on' : ''}" data-fill="${f.key}">
          <span class="lvl"><i style="height:${f.over ? 118 : f.pct}%"></i></span>${f.label}
        </button>`).join('')}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Snabbflaggor</h2></div>
      <div class="chips">${FLAGS.map((f) =>
        `<button class="chip flag ${RISK_FLAGS.includes(f) ? 'risk' : ''} ${item.flags.includes(f) ? 'on' : ''}" data-flag="${esc(f)}">${esc(f)}</button>`).join('')}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Tömning idag <span class="muted" style="font-size:18px">(valfritt)</span></h2></div>
      ${choiceGroup('frequency', FREQS, item.frequency, 'Annat – t.ex. 2 gånger/vecka')}
    </div>

    <div class="section">
      <div class="section-head"><h2>Leverantör idag <span class="muted" style="font-size:18px">(valfritt)</span></h2></div>
      ${choiceGroup('supplier', SUPPLIERS, item.supplier, 'Skriv namn på leverantör')}
    </div>

    <div class="section">
      <div class="section-head"><h2>Anteckning</h2></div>
      <textarea class="input" data-field="notes" placeholder="Det du vill komma ihåg om just det här kärlet …">${esc(item.notes)}</textarea>
    </div>

    <div class="section">
      <button class="btn big block" id="done">${I.check} Klar – tillbaka till ${esc(place?.name || 'platsen')}</button>
    </div>

    <div class="danger-zone">
      <button class="btn danger" id="delItem">${I.trash} Ta bort kärlet</button>
    </div>`;

  bindFields(main, item, 'items');
  bindChoices(main, item, 'items');
  bindPhotos(main, photos, { visitId: item.visitId, placeId: item.placeId, itemId: id }, refresh);

  main.querySelectorAll('[data-type]').forEach((b) => {
    b.onclick = () => {
      item.type = b.dataset.type;
      main.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('on', x === b));
      setTitle(typeOf(item.type).label);
      saveNow('items', item);
    };
  });

  const out = main.querySelector('#count');
  const setCount = (n) => { item.count = Math.max(1, n); out.textContent = item.count; saveSoon('items', item); };
  main.querySelector('#minus').onclick = () => setCount((Number(item.count) || 1) - 1);
  main.querySelector('#plus').onclick = () => setCount((Number(item.count) || 1) + 1);

  main.querySelectorAll('[data-fill]').forEach((b) => {
    b.onclick = () => {
      item.fill = item.fill === b.dataset.fill ? '' : b.dataset.fill;
      main.querySelectorAll('[data-fill]').forEach((x) => x.classList.toggle('on', x.dataset.fill === item.fill));
      saveNow('items', item);
    };
  });

  main.querySelectorAll('[data-flag]').forEach((b) => {
    b.onclick = () => {
      const f = b.dataset.flag;
      item.flags = item.flags.includes(f) ? item.flags.filter((x) => x !== f) : [...item.flags, f];
      b.classList.toggle('on', item.flags.includes(f));
      saveNow('items', item);
    };
  });

  main.querySelector('#done').onclick = () => go(`#/plats/${item.placeId}`);
  main.querySelector('#delItem').onclick = async () => {
    if (!confirm('Ta bort kärlet och dess bilder?')) return;
    await db.deleteItem(id);
    go(`#/plats/${item.placeId}`);
  };
}

// =====================================================================
// Navigering
// =====================================================================
const ROUTES = [
  [/^#\/besok\/([^/]+)$/, visitView],
  [/^#\/plats\/([^/]+)$/, placeView],
  [/^#\/karl\/([^/]+)$/, itemView],
  [/.*/, homeView],
];
const scrollMemory = {};
let currentHash = null;

async function render({ animate }) {
  await flushSaves();
  const hash = location.hash || '#/';
  const y = window.scrollY;
  revokeUrls();
  for (const [re, view] of ROUTES) {
    const m = hash.match(re);
    if (m) { await view(m[1]); break; }
  }
  if (animate) {
    main.classList.remove('view');
    void main.offsetWidth; // starta om animationen
    main.classList.add('view');
    window.scrollTo(0, scrollMemory[hash] || 0);
  } else {
    window.scrollTo(0, y);
  }
  currentHash = hash;
}

// Ritar om sidan man står på (t.ex. efter ny bild) utan att hoppa till toppen.
function refresh() { return render({ animate: false }); }

window.addEventListener('hashchange', () => {
  // Minns var man var på sidan, så att "tillbaka" hamnar på samma ställe.
  if (currentHash) scrollMemory[currentHash] = window.scrollY;
  render({ animate: true });
});

render({ animate: true });
db.askPersist();

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

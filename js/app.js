import * as db from './db.js';
import { compress } from './image.js';
import { I } from './icons.js';
import {
  TYPES, typeOf, itemLabel, contentText, MATERIALS, HAZARDOUS, FILLS, FREQS, SUPPLIERS,
  FLAGS, RISK_FLAGS, PLACE_SUGGESTIONS,
} from './data.js';
import {
  esc, today, MONTHS, prettyDate, plural, go, byCreated, photoUrl, revokeUrls, toast, openViewer,
} from './util.js';
import { presentView, leavePresent } from './present.js';
import { exportVisitJson } from './export.js';

const topbar = document.getElementById('topbar');
const main = document.getElementById('main');
const camera = document.getElementById('camera');
const library = document.getElementById('library');

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

// ---------- Kamera och bildbibliotek ----------
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

function photosHtml(photos, addLabel = 'Ta bild') {
  return `<div class="photos">
    <button class="add-photo" data-add-photo>${I.camera}<span>${addLabel}</span></button>
    <button class="add-photo soft" data-add-library>${I.image}<span>Från bilder</span></button>
    ${photos.map((p) => `<button class="photo" data-photo="${p.id}"><img src="${photoUrl(p)}" alt=""></button>`).join('')}
  </div>`;
}

function bindPhotos(root, photos, link) {
  const add = (fromLibrary) => pickPhoto(async (file) => { await addPhoto(file, link); refresh(); }, { fromLibrary });
  root.querySelector('[data-add-photo]')?.addEventListener('click', () => add(false));
  root.querySelector('[data-add-library]')?.addEventListener('click', () => add(true));
  root.querySelectorAll('.photos [data-photo]').forEach((b) => {
    const photo = photos.find((p) => p.id === b.dataset.photo);
    b.onclick = () => openViewer(photo, { onDelete: async () => { await db.del('photos', photo.id); refresh(); } });
  });
}

// ---------- Idéer ----------
// Listan visas på besöket, platsen och kärlet. Varje idé kan kopplas till en plats eller ett kärl.
let focusIdea = null;

function ideasHtml(ideas, places, items) {
  const option = (val, label, sel) => `<option value="${val}" ${sel ? 'selected' : ''}>${esc(label)}</option>`;
  const options = (idea) => {
    const cur = idea.itemId ? `i:${idea.itemId}` : idea.placeId ? `p:${idea.placeId}` : '';
    return option('', 'Hela besöket', cur === '') + places.map((p) =>
      option(`p:${p.id}`, p.name, cur === `p:${p.id}`) + items.filter((it) => it.placeId === p.id).map((it) =>
        option(`i:${it.id}`, `   ${p.name} › ${itemLabel(it)}`, cur === `i:${it.id}`)).join('')).join('');
  };
  return `<div class="idea-list">${ideas.map((x) => `
    <div class="idea" data-idea="${x.id}">
      <div class="idea-ico">${I.idea}</div>
      <div class="idea-body">
        <textarea class="input" rows="2" placeholder="Skriv vad ni pratade om …">${esc(x.text)}</textarea>
        <div class="idea-foot">
          <label class="idea-link"><span>Gäller</span><select class="input">${options(x)}</select></label>
          <button class="btn danger icon-only" data-del-idea aria-label="Ta bort idé">${I.trash}</button>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function bindIdeas(root, ideas, items) {
  root.querySelectorAll('[data-idea]').forEach((el) => {
    const idea = ideas.find((x) => x.id === el.dataset.idea);
    const ta = el.querySelector('textarea');
    ta.oninput = () => { idea.text = ta.value; saveSoon('ideas', idea); };
    el.querySelector('select').onchange = async (e) => {
      const [kind, id] = e.target.value.split(':');
      idea.itemId = kind === 'i' ? id : null;
      idea.placeId = kind === 'p' ? id : kind === 'i' ? items.find((it) => it.id === id)?.placeId : null;
      await saveNow('ideas', idea);
      refresh();
    };
    el.querySelector('[data-del-idea]').onclick = async () => {
      if (idea.text?.trim() && !confirm('Ta bort idén?')) return;
      pending.delete(idea.id);
      await db.del('ideas', idea.id);
      refresh();
    };
  });
  if (focusIdea) {
    const ta = root.querySelector(`[data-idea="${focusIdea}"] textarea`);
    focusIdea = null;
    if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); }
  }
}

async function newIdea(link) {
  const idea = await db.put('ideas', { id: db.uid(), text: '', placeId: null, itemId: null, ...link });
  focusIdea = idea.id;
  refresh();
}

// ---------- Toppfält ----------
function setTop({ back, title, sub, brand }) {
  topbar.innerHTML = `
    ${back ? `<button class="iconbtn" data-back aria-label="Tillbaka">${I.back}</button>` : ''}
    <div class="title">
      ${brand ? '<div class="brand">Ragn-Sells · Kundrunda</div>' : ''}
      <h1>${esc(title)}</h1>
      ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    </div>
    <div class="saved">${I.check.replace('<svg', '<svg width="20" height="20"')} Sparat</div>`;
  if (back) topbar.querySelector('[data-back]').onclick = () => go(back);
}
const setTitle = (t) => { const h = topbar.querySelector('h1'); if (h) h.textContent = t; };

const sectionHead = (title, extra = '') => `<div class="section-head"><h2>${title}</h2>${extra}</div>`;

// =====================================================================
// Startsida: lista över besök
// =====================================================================
async function homeView() {
  const [visits, places, items] = await Promise.all([db.all('visits'), db.all('places'), db.all('items')]);
  visits.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  const placeCount = (id) => places.filter((r) => r.visitId === id).length;
  const containers = (id) => items.filter((i) => i.visitId === id).reduce((s, i) => s + (Number(i.count) || 1), 0);

  setTop({ brand: true, title: 'Mina besök' });
  main.innerHTML = `
    <button class="btn big block" id="new">${I.plus} Nytt besök</button>
    <div class="section">
      ${visits.length ? `<div class="visit-list">${visits.map((v) => {
        const [, m, d] = (v.date || '').split('-').map(Number);
        const meta = [v.address, plural(placeCount(v.id), 'plats', 'platser'), plural(containers(v.id), 'kärl', 'kärl')]
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
// Ett besök: kunduppgifter, platser, idéer, anteckningar
// =====================================================================
async function visitView(id) {
  const d = await db.loadVisit(id);
  if (!d) return go('#/');
  const { visit, places, items, photos, ideas } = d;
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

    <div class="btn-row" style="margin-top:16px">
      <button class="btn big" id="present">${I.present} Visa för kunden</button>
      <button class="btn big ghost" id="exportJson">${I.share} Exportera besöket</button>
    </div>

    <div class="section">
      ${sectionHead('Platser')}
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
      ${sectionHead('Idéer att förbättra')}
      ${ideasHtml(ideas, places, items)}
      <button class="btn ghost block add-idea" id="addIdea">${I.plus} Ny idé</button>
    </div>

    <div class="section">
      ${sectionHead('Anteckningar om besöket')}
      <textarea class="input" data-field="notes" placeholder="Allmänt om kunden, vad ni pratade om …">${esc(visit.notes)}</textarea>
      <p class="hint">Anteckningarna är dina egna. De visas inte för kunden om du inte slår på det i visningsläget.</p>
    </div>

    <div class="danger-zone">
      <button class="btn danger" id="delVisit">${I.trash} Ta bort hela besöket</button>
    </div>`;

  bindFields(main, visit, 'visits', () => {
    setTitle(visit.customer || 'Nytt besök');
    topbar.querySelector('.sub').textContent = prettyDate(visit.date);
  });
  bindIdeas(main, ideas, items);
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
  main.querySelector('#addIdea').onclick = () => newIdea({ visitId: id });
  main.querySelector('#present').onclick = () => go(`#/visa/${id}`);
  main.querySelector('#exportJson').onclick = async () => {
    await flushSaves();
    const t = toast('Förbereder fil …', 0);
    try { await exportVisitJson(id); } catch (e) { console.error(e); toast('Exporten misslyckades'); return; }
    t.remove();
  };

  main.querySelector('#delVisit').onclick = async () => {
    if (!confirm(`Ta bort besöket hos ${visit.customer || 'kunden'} med alla platser, kärl, idéer och bilder? Det går inte att ångra.`)) return;
    await db.deleteVisit(id);
    toast('Besöket är borttaget');
    go('#/');
  };
}

// =====================================================================
// En plats: kärl, bilder, idéer, anteckning
// =====================================================================
async function placeView(id) {
  const place = await db.get('places', id);
  if (!place) return go('#/');
  const d = await db.loadVisit(place.visitId);
  const items = d.items.filter((it) => it.placeId === id);
  const photos = d.photos.filter((p) => p.placeId === id);
  const placePhotos = photos.filter((p) => !p.itemId);
  const ideas = d.ideas.filter((x) => x.placeId === id);

  const itemRow = (it) => {
    const t = typeOf(it.type);
    const ph = photos.find((p) => p.itemId === it.id);
    const fill = FILLS.find((f) => f.key === it.fill);
    const meta = [contentText(it), fill?.label, it.frequency].filter(Boolean).join(' · ');
    return `<button class="item ${it.type ? '' : 'todo'}" data-id="${it.id}">
      <div class="ico">${ph ? `<img src="${photoUrl(ph)}" alt="">` : t.icon}</div>
      <div class="txt">
        <strong>${esc(itemLabel(it))}</strong>
        <div class="meta">${esc(meta || (it.type ? 'Inga detaljer än' : 'Tryck för att fylla i'))}</div>
        ${it.flags.length ? `<div class="tags">${it.flags.map((f) =>
          `<span class="tag ${RISK_FLAGS.includes(f) ? 'risk' : ''}">${esc(f)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="count">${Number(it.count) || 1} st</div>
    </button>`;
  };

  setTop({ back: `#/besok/${place.visitId}`, title: place.name, sub: d.visit.customer });
  main.innerHTML = `
    ${sectionHead('Lägg till kärl')}
    <div class="type-grid">
      <button class="type photo-first" id="photoFirst">${I.camera}<span>Foto först</span></button>
      ${TYPES.map((t) => `<button class="type" data-type="${t.key}">${t.icon}<span>${t.label}</span></button>`).join('')}
    </div>
    <div class="photo-first-row">
      <p class="hint">Foto först: ta en bild nu och välj typ och detaljer senare.</p>
      <button class="btn ghost" id="photoFirstLib">${I.image} Foto först från bilder</button>
    </div>

    <div class="section">
      ${sectionHead('Kärl här')}
      ${items.length ? `<div class="item-list">${items.map(itemRow).join('')}</div>`
        : '<div class="empty"><p>Inga kärl på den här platsen än.</p></div>'}
    </div>

    <div class="section">
      ${sectionHead('Bilder på platsen')}
      ${photosHtml(placePhotos, 'Bild på platsen')}
    </div>

    <div class="section">
      ${sectionHead('Idéer för platsen')}
      ${ideasHtml(ideas, d.places, d.items)}
      <button class="btn ghost block add-idea" id="addIdea">${I.plus} Ny idé om ${esc(place.name)}</button>
    </div>

    <div class="section">
      ${sectionHead('Anteckning om platsen')}
      <textarea class="input" data-field="notes" placeholder="T.ex. trångt vid porten, kärlen står utomhus …">${esc(place.notes)}</textarea>
    </div>

    <div class="section">
      <label class="field"><span>Platsens namn</span><input class="input" data-field="name" value="${esc(place.name)}" autocomplete="off"></label>
    </div>

    <div class="danger-zone">
      <button class="btn danger" id="delPlace">${I.trash} Ta bort platsen</button>
    </div>`;

  bindFields(main, place, 'places', () => setTitle(place.name || 'Plats'));
  bindPhotos(main, placePhotos, { visitId: place.visitId, placeId: id, itemId: null });
  bindIdeas(main, ideas, d.items);

  const newItem = (type) => db.put('items', {
    id: db.uid(), visitId: place.visitId, placeId: id, type, size: '', count: 1,
    material: typeOf(type).collects ? 'Farligt avfall' : '', contents: [], contentsNote: '',
    fill: '', frequency: '', supplier: '', flags: [], notes: '',
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
  main.querySelector('#addIdea').onclick = () => newIdea({ visitId: place.visitId, placeId: id });

  main.querySelector('#delPlace').onclick = async () => {
    if (!confirm(`Ta bort platsen "${place.name}" med alla kärl och bilder? Idéerna finns kvar under besöket. Det går inte att ångra.`)) return;
    await db.deletePlace(id);
    go(`#/besok/${place.visitId}`);
  };
}

// =====================================================================
// Ett kärl: typ, storlek, antal, innehåll, fyllnad, flaggor, bilder, idéer, anteckning
// =====================================================================
function choiceGroup(field, options, value, placeholder) {
  const custom = value && !options.includes(value) ? value : '';
  return `<div class="choice" data-field="${field}">
    ${options.length ? `<div class="chips">${options.map((o) =>
      `<button class="chip ${o === value ? 'on' : ''}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}
    <input class="input" style="margin-top:10px" placeholder="${esc(placeholder)}" value="${esc(custom)}" autocomplete="off">
  </div>`;
}

function bindChoices(root, obj, store) {
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
        if (f === 'size') setTitle(itemLabel(obj));
      };
    });
    input.oninput = () => {
      obj[f] = input.value.trim();
      chips.forEach((x) => x.classList.toggle('on', x.dataset.val === obj[f]));
      saveSoon(store, obj);
      if (f === 'size') setTitle(itemLabel(obj));
    };
  });
}

async function itemView(id) {
  const item = await db.get('items', id);
  if (!item) return go('#/');
  const d = await db.loadVisit(item.visitId);
  const place = d.places.find((p) => p.id === item.placeId);
  const photos = d.photos.filter((p) => p.itemId === id);
  const ideas = d.ideas.filter((x) => x.itemId === id);
  const t = typeOf(item.type);

  // Miljöskåp: flera sorters farligt avfall. Övriga: ett material.
  const contentSection = t.collects ? `
    ${sectionHead('Vad samlas här?', '<span class="muted">Välj flera</span>')}
    <div class="chips">${HAZARDOUS.map((h) =>
      `<button class="chip ${item.contents.includes(h) ? 'on' : ''}" data-content="${esc(h)}">${esc(h)}</button>`).join('')}</div>
    <input class="input" style="margin-top:10px" data-field="contentsNote" value="${esc(item.contentsNote)}" placeholder="Annat – skriv här" autocomplete="off">`
    : `${sectionHead('Vad ligger i?')}${choiceGroup('material', MATERIALS, item.material, 'Annat – skriv här')}`;

  setTop({ back: `#/plats/${item.placeId}`, title: itemLabel(item), sub: place?.name });
  main.innerHTML = `
    ${sectionHead('Bilder')}
    ${photosHtml(photos)}

    <div class="section">
      ${sectionHead('Typ')}
      <div class="type-grid">${TYPES.map((x) =>
        `<button class="type ${x.key === item.type ? 'on' : ''}" data-type="${x.key}">${x.icon}<span>${x.label}</span></button>`).join('')}</div>
    </div>

    ${item.type ? `<div class="section">
      ${sectionHead(t.sizeLabel)}
      ${choiceGroup('size', t.sizes, item.size, t.sizes.length ? `Annan ${t.sizeLabel.toLowerCase()} – skriv här` : `Skriv ${t.sizeLabel.toLowerCase()}`)}
    </div>` : ''}

    <div class="section">
      ${sectionHead('Antal')}
      <div class="stepper">
        <button id="minus" aria-label="Ett färre">${I.minus}</button>
        <output id="count">${Number(item.count) || 1}</output>
        <button id="plus" aria-label="Ett till">${I.plus}</button>
      </div>
    </div>

    <div class="section">${contentSection}</div>

    <div class="section">
      ${sectionHead('Hur fullt?')}
      <div class="fill-grid">${FILLS.map((f) => `
        <button class="fill ${f.over ? 'over' : ''} ${f.key === item.fill ? 'on' : ''}" data-fill="${f.key}">
          <span class="lvl"><i style="height:${f.over ? 118 : f.pct}%"></i></span>${f.label}
        </button>`).join('')}</div>
    </div>

    <div class="section">
      ${sectionHead('Snabbflaggor')}
      <div class="chips">${FLAGS.map((f) =>
        `<button class="chip flag ${RISK_FLAGS.includes(f) ? 'risk' : ''} ${item.flags.includes(f) ? 'on' : ''}" data-flag="${esc(f)}">${esc(f)}</button>`).join('')}</div>
    </div>

    <div class="section">
      ${sectionHead('Tömning idag <span class="muted" style="font-size:18px">(valfritt)</span>')}
      ${choiceGroup('frequency', FREQS, item.frequency, 'Annat – t.ex. 2 gånger/vecka')}
    </div>

    <div class="section">
      ${sectionHead('Leverantör idag <span class="muted" style="font-size:18px">(valfritt)</span>')}
      ${choiceGroup('supplier', SUPPLIERS, item.supplier, 'Skriv namn på leverantör')}
    </div>

    <div class="section">
      ${sectionHead('Idéer om kärlet')}
      ${ideasHtml(ideas, d.places, d.items)}
      <button class="btn ghost block add-idea" id="addIdea">${I.plus} Ny idé om det här kärlet</button>
    </div>

    <div class="section">
      ${sectionHead('Anteckning')}
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
  bindPhotos(main, photos, { visitId: item.visitId, placeId: item.placeId, itemId: id });
  bindIdeas(main, ideas, d.items);

  // Byte av typ visar nya storleksval, så sidan ritas om.
  main.querySelectorAll('[data-type]').forEach((b) => {
    b.onclick = async () => {
      if (item.type === b.dataset.type) return;
      item.type = b.dataset.type;
      item.size = '';
      if (typeOf(item.type).collects && !item.material) item.material = 'Farligt avfall';
      await saveNow('items', item);
      refresh();
    };
  });

  main.querySelectorAll('[data-content]').forEach((b) => {
    b.onclick = () => {
      const c = b.dataset.content;
      item.contents = item.contents.includes(c) ? item.contents.filter((x) => x !== c) : [...item.contents, c];
      b.classList.toggle('on', item.contents.includes(c));
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

  main.querySelector('#addIdea').onclick = () => newIdea({ visitId: item.visitId, placeId: item.placeId, itemId: id });
  main.querySelector('#done').onclick = () => go(`#/plats/${item.placeId}`);
  main.querySelector('#delItem').onclick = async () => {
    if (!confirm('Ta bort kärlet och dess bilder? Idéer om kärlet finns kvar under platsen.')) return;
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
  [/^#\/visa\/([^/]+)$/, (id) => presentView(id, { topbar, main })],
  [/.*/, homeView],
];
const scrollMemory = {};
let currentHash = null;

async function render({ animate }) {
  await flushSaves();
  const hash = location.hash || '#/';
  const y = window.scrollY;
  revokeUrls();
  if (!hash.startsWith('#/visa/')) leavePresent();
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

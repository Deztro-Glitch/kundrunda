// Gemensamma byggstenar för sidorna: sparande, toppfält med steg, bilder och
// kärlväljare (typ, storlek, antal, material) som används både för kärl och förslag.
import * as db from './db.js';
import { compress } from './image.js';
import { I } from './icons.js';
import { TYPES, typeOf, itemLabel, ideaSummary } from './data.js';
import { commonFor, groupsFor, allMaterialNames, fitsKind, customMaterials, rememberCustom } from './materials.js';
import { regContainersFor, regLabel } from './register.js';
import { esc, go, photoUrl, toast, openViewer } from './util.js';

export const topbar = document.getElementById('topbar');
export const main = document.getElementById('main');
const bottombar = document.getElementById('bottombar');
const camera = document.getElementById('camera');
const library = document.getElementById('library');

let refreshFn = () => {};
export const setRefresh = (fn) => { refreshFn = fn; };
export const refresh = () => refreshFn();

// ---------- Spara automatiskt ----------
function flashSaved() {
  const s = topbar.querySelector('.saved');
  if (!s) return;
  s.classList.add('show');
  clearTimeout(flashSaved.t);
  flashSaved.t = setTimeout(() => s.classList.remove('show'), 1400);
}
export const pending = new Map();
export function saveSoon(store, obj) {
  clearTimeout(pending.get(obj.id)?.t);
  pending.set(obj.id, { store, obj, t: setTimeout(() => commit(obj.id), 450) });
}
async function commit(id) {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  clearTimeout(p.t);
  await write(p.store, p.obj);
  flashSaved();
}
const write = (store, obj) => (typeof store === 'function' ? store(obj) : db.put(store, obj));
export const flushSaves = () => Promise.all([...pending.keys()].map(commit));
export async function saveNow(store, obj) {
  if (pending.has(obj.id)) { clearTimeout(pending.get(obj.id).t); pending.delete(obj.id); }
  await write(store, obj);
  flashSaved();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSaves(); });

// Kopplar textfält med data-field till ett objekt och sparar medan man skriver.
export function bindFields(root, obj, store, onChange) {
  root.querySelectorAll('[data-field]').forEach((el) => {
    if (!('value' in el) || el.closest('.choice')) return;
    el.addEventListener('input', () => {
      obj[el.dataset.field] = el.value;
      saveSoon(store, obj);
      onChange?.();
    });
  });
}

// ---------- Steg ----------
export const STEPS = [
  { key: 'kund', label: 'Kund', path: '/kund' },
  { key: 'nulage', label: 'Nuläge', path: '' },
  { key: 'forbattringar', label: 'Förbättringar', path: '/forbattringar' },
  { key: 'klart', label: 'Visa & skicka', path: '/klart' },
];
export const stepHash = (visitId, key) => `#/besok/${visitId}${STEPS.find((s) => s.key === key).path}`;

// Toppfält. Med step + visitId visas stegraden, och sidan får stegets färg.
export function setTop({ back, title, sub, brand, step, visitId, done = {} }) {
  document.body.dataset.step = step || '';
  const idx = STEPS.findIndex((s) => s.key === step);
  topbar.innerHTML = `
    <div class="tb-row">
      ${back ? `<button class="iconbtn" data-back aria-label="Tillbaka">${I.back}</button>` : ''}
      <div class="title">
        ${brand ? '<div class="brand">Ragn-Sells · Kundrunda</div>' : ''}
        <h1>${esc(title)}</h1>
        ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
      </div>
      <div class="saved">${I.check.replace('<svg', '<svg width="20" height="20"')} Sparat</div>
    </div>
    ${step && visitId ? `<nav class="steps" aria-label="Steg">${STEPS.map((s, i) => `
      <button class="step ${s.key === step ? 'on' : ''} ${i < idx || done[s.key] ? 'done' : ''}" data-step="${s.key}">
        <span class="n">${done[s.key] && s.key !== step ? I.check : i + 1}</span><span class="l">${s.label}</span>
      </button>`).join('')}</nav>` : ''}`;
  if (back) topbar.querySelector('[data-back]').onclick = () => go(back);
  topbar.querySelectorAll('[data-step]').forEach((b) => { b.onclick = () => go(stepHash(visitId, b.dataset.step)); });
}
export const setTitle = (t) => { const h = topbar.querySelector('h1'); if (h) h.textContent = t; };

// Stor knapp längst ner på skärmen – nära tummen.
export function setBottom(label, onClick, { icon = I.check, next = false } = {}) {
  bottombar.innerHTML = label ? `<button class="btn big block ${next ? 'next' : ''}">${next ? '' : icon} ${esc(label)} ${next ? I.next : ''}</button>` : '';
  bottombar.hidden = !label;
  document.body.classList.toggle('has-bottombar', !!label);
  if (label) bottombar.querySelector('button').onclick = onClick;
}

export const sectionHead = (title, extra = '') => `<div class="section-head"><h2>${title}</h2>${extra}</div>`;

// ---------- Kamera och bildbibliotek ----------
export function pickPhoto(onFile, { fromLibrary = false } = {}) {
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

export async function addPhoto(file, link) {
  const { blob, width, height } = await compress(file);
  return db.put('photos', { id: db.uid(), ...link, blob, width, height });
}

export function photosHtml(photos, addLabel = 'Ta bild') {
  return `<div class="photos">
    <button class="add-photo" data-add-photo>${I.camera}<span>${addLabel}</span></button>
    <button class="add-photo soft" data-add-library>${I.image}<span>Från bilder</span></button>
    ${photos.map((p) => `<button class="photo" data-photo="${p.id}"><img src="${photoUrl(p)}" alt=""></button>`).join('')}
  </div>`;
}

export function bindPhotos(root, photos, link) {
  const add = (fromLibrary) => pickPhoto(async (file) => { await addPhoto(file, link); refresh(); }, { fromLibrary });
  root.querySelector('[data-add-photo]')?.addEventListener('click', () => add(false));
  root.querySelector('[data-add-library]')?.addEventListener('click', () => add(true));
  root.querySelectorAll('.photos [data-photo]').forEach((b) => {
    const photo = photos.find((p) => p.id === b.dataset.photo);
    b.onclick = () => openViewer(photo, { onDelete: async () => { await db.del('photos', photo.id); refresh(); } });
  });
}

// ---------- Kärltyper ----------
// De vanligaste typerna syns direkt, resten under "Fler typer".
export function typeGrid(selected, { photoFirst = false, only = null } = {}) {
  const tile = (t) => `<button class="type ${t.key === selected ? 'on' : ''}" data-type="${t.key}">${t.icon}<span>${t.tile || t.label}</span></button>`;
  if (only) return `<div class="type-grid">${only.map((k) => tile(TYPES.find((t) => t.key === k))).join('')}</div>`;
  const more = TYPES.filter((t) => !t.main);
  const open = more.some((t) => t.key === selected);
  return `
    <div class="type-grid">
      ${photoFirst ? `<button class="type photo-first" id="photoFirst">${I.camera}<span>Foto först</span></button>` : ''}
      ${TYPES.filter((t) => t.main).map(tile).join('')}
      <button class="type more-toggle" data-more-types>${open ? I.minus : I.plus}<span>${open ? 'Färre typer' : 'Fler typer'}</span></button>
    </div>
    <div class="type-grid more-types" ${open ? '' : 'hidden'}>${more.map(tile).join('')}</div>`;
}
export function bindTypeGrid(root) {
  const btn = root.querySelector('[data-more-types]');
  if (!btn) return;
  btn.onclick = () => {
    const box = root.querySelector('.more-types');
    box.hidden = !box.hidden;
    btn.innerHTML = box.hidden ? `${I.plus}<span>Fler typer</span>` : `${I.minus}<span>Färre typer</span>`;
  };
}

// Vilka material som passar. Behållare i ett miljöskåp är alltid för farligt avfall.
export const kindOf = (o) => o.kind || typeOf(o.type).kind;

// Byter typ: nya storleksval, och material som inte passar (t.ex. wellpapp i miljöskåp) tas bort.
export async function changeType(obj, store, type) {
  obj.type = type;
  obj.size = '';
  obj.regId = '';
  obj.regLabel = '';
  const nt = typeOf(type);
  const before = obj.materials.length;
  obj.materials = obj.materials.filter((m) => fitsKind(m, obj.kind || nt.kind));
  if (!obj.materials.length && nt.defaults) obj.materials = [...nt.defaults];
  if (obj.materials.length < before) toast('Material som inte passar den nya typen togs bort');
  await saveNow(store, obj);
}

// ---------- Enkelval med knappar + egen text ----------
export function choiceGroup(field, options, value, placeholder) {
  const custom = value && !options.includes(value) ? value : '';
  return `<div class="choice" data-field="${field}">
    ${options.length ? `<div class="chips">${options.map((o) =>
      `<button class="chip ${o === value ? 'on' : ''}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}
    <input class="input" style="margin-top:10px" placeholder="${esc(placeholder)}" value="${esc(custom)}" autocomplete="off">
  </div>`;
}

export function bindChoices(root, obj, store, onChange) {
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
        onChange?.(f);
      };
    });
    input.oninput = () => {
      obj[f] = input.value.trim();
      chips.forEach((x) => x.classList.toggle('on', x.dataset.val === obj[f]));
      saveSoon(store, obj);
      onChange?.(f);
    };
  });
}

// ---------- Storlek / vilken (register, standardval eller egen text) ----------
export function sizeSection(obj) {
  if (!obj.type) return '';
  const t = typeOf(obj.type);
  const regItems = regContainersFor(obj.type);
  if (regItems.length) {
    return `${sectionHead('Vilken?', '<span class="muted">Från offertverktygets register</span>')}
      <div class="chips">${regItems.map((r) =>
        `<button class="chip ${obj.regId === r.id ? 'on' : ''}" data-reg="${esc(r.id)}">${esc(regLabel(r))}</button>`).join('')}</div>
      <input class="input" style="margin-top:10px" id="ownSize" value="${esc(obj.regId ? '' : obj.size)}" placeholder="Annat – skriv här" autocomplete="off">`;
  }
  if (obj.type === 'annat') {
    return `${sectionHead('Vad är det för behållare?')}
      <input class="input" data-field="customName" id="customName" value="${esc(obj.customName)}" placeholder="T.ex. pallbur, gipscontainer, tunna" autocomplete="off">
      <h3 class="small-head">Storlek <span class="muted">(valfritt)</span></h3>
      <input class="input" data-field="size" id="annatSize" value="${esc(obj.size)}" placeholder="T.ex. 1 m³ eller 120 L" autocomplete="off">`;
  }
  return `${sectionHead(t.sizeLabel)}
    ${choiceGroup('size', t.sizes, obj.size, t.sizes.length ? `Annan ${t.sizeLabel.toLowerCase()} – skriv här` : `Skriv ${t.sizeLabel.toLowerCase()}`)}`;
}

export function bindSizeSection(root, obj, store, onLabel) {
  const regItems = regContainersFor(obj.type);
  root.querySelectorAll('[data-reg]').forEach((b) => {
    b.onclick = () => {
      const r = regItems.find((x) => x.id === b.dataset.reg);
      const on = obj.regId !== r.id;
      obj.regId = on ? r.id : '';
      obj.regLabel = on ? regLabel(r) : '';
      obj.size = '';
      root.querySelectorAll('[data-reg]').forEach((x) => x.classList.toggle('on', on && x === b));
      root.querySelector('#ownSize').value = '';
      onLabel?.();
      saveNow(store, obj);
    };
  });
  const own = root.querySelector('#ownSize');
  if (own) own.oninput = () => {
    obj.size = own.value.trim();
    obj.regId = '';
    obj.regLabel = '';
    root.querySelectorAll('[data-reg]').forEach((x) => x.classList.remove('on'));
    onLabel?.();
    saveSoon(store, obj);
  };
  ['customName', 'annatSize'].forEach((idName) => root.querySelector(`#${idName}`)?.addEventListener('input', () => onLabel?.()));
}

// ---------- Antal ----------
export const countStepper = (n) => `
  <div class="stepper">
    <button data-minus aria-label="Ett färre">${I.minus}</button>
    <output>${Number(n) || 1}</output>
    <button data-plus aria-label="Ett till">${I.plus}</button>
  </div>`;
export function bindCount(root, obj, store) {
  const out = root.querySelector('.stepper output');
  const set = (n) => { obj.count = Math.max(1, n); out.textContent = obj.count; saveSoon(store, obj); };
  root.querySelector('[data-minus]').onclick = () => set((Number(obj.count) || 1) - 1);
  root.querySelector('[data-plus]').onclick = () => set((Number(obj.count) || 1) + 1);
}

// ---------- Materialval: flera material, sök, egna ----------
const matChip = (obj, m) =>
  `<button class="chip ${obj.materials.includes(m) ? 'on' : ''}" data-mat="${esc(m)}">${esc(m)}</button>`;

// Sökträffar medan man skriver (bara den här delen ritas om, så tangentbordet stannar kvar).
function matResults(obj, query) {
  const q = query.trim().toLowerCase();
  if (!q) return '';
  const kind = kindOf(obj);
  const all = [...new Set([...groupsFor(kind).flatMap((g) => g.items), ...customMaterials()])];
  const hits = all.filter((m) => m.toLowerCase().includes(q)).slice(0, 14);
  const exact = all.some((m) => m.toLowerCase() === q);
  return `${hits.map((m) => matChip(obj, m)).join('')}
    ${exact ? '' : `<button class="chip add-own" data-own>${I.plus} Lägg till "${esc(query.trim())}"</button>`}`;
}

function materialPicker(obj, showAll = false) {
  const kind = kindOf(obj);
  const chip = (m) => matChip(obj, m);
  const mine = customMaterials().filter((m) => fitsKind(m, kind));
  const common = [...new Set([...commonFor(kind), ...mine])].filter((m) => !obj.materials.includes(m));
  return `
    <div class="mat-selected">
      ${obj.materials.length ? obj.materials.map((m) =>
        `<button class="chip on removable" data-remove="${esc(m)}">${esc(m)} ${I.close}</button>`).join('')
        : '<span class="muted">Inget valt än – tryck på ett material nedan, eller sök.</span>'}
      ${obj.materials.length > 1 ? '<span class="warn-text" style="margin:0">Flera material – ta bort de som inte ska vara med.</span>' : ''}
    </div>
    <div class="mat-search">
      <input class="input" id="matSearch" placeholder="Sök eller skriv eget material …" autocomplete="off" enterkeyhint="done">
    </div>
    <div class="mat-results" id="matResults"></div>
    <div class="mat-label">${kind === 'fa' ? 'Vanligt farligt avfall' : 'Vanliga material'}</div>
    <div class="chips">${common.map(chip).join('')}</div>
    <button class="btn ghost mat-all-btn" data-mat-all>${showAll ? 'Dölj alla material' : 'Visa alla material'}</button>
    ${showAll ? `<div class="mat-all">${groupsFor(kind).map((g) => `
      <details><summary>${esc(g.name)}</summary><div class="chips">${g.items.map(chip).join('')}</div></details>`).join('')}
    </div>` : ''}`;
}

export function mountMaterialPicker(box, obj, store, { showAll = false, focus = false } = {}) {
  box.innerHTML = materialPicker(obj, showAll);
  const rerender = (opts) => mountMaterialPicker(box, obj, store, { showAll, ...opts });
  const add = (m) => {
    m = m.trim();
    if (!m) return;
    const kind = kindOf(obj);
    const known = allMaterialNames().find((x) => x.toLowerCase() === m.toLowerCase());
    m = known || m;
    obj.materials = [m]; // ett material per behållare – ett nytt val ersätter det gamla
    if (!known) rememberCustom(m);
    if (known && !fitsKind(known, kind)) toast(`Obs: ${known} hör normalt inte hemma i ${typeOf(obj.type).label.toLowerCase()}`);
    saveNow(store, obj);
  };
  const bindChips = (root) => root.querySelectorAll('[data-mat]').forEach((b) => {
    b.onclick = () => {
      const m = b.dataset.mat;
      if (obj.materials.includes(m)) {
        obj.materials = obj.materials.filter((x) => x !== m);
        saveNow(store, obj);
      } else add(m);
      rerender();
    };
  });
  bindChips(box);
  box.querySelectorAll('[data-remove]').forEach((b) => {
    b.onclick = () => {
      obj.materials = obj.materials.filter((x) => x !== b.dataset.remove);
      saveNow(store, obj);
      rerender();
    };
  });
  const input = box.querySelector('#matSearch');
  const results = box.querySelector('#matResults');
  input.oninput = () => {
    results.innerHTML = matResults(obj, input.value);
    bindChips(results);
    results.querySelector('[data-own]')?.addEventListener('click', () => { add(input.value); rerender(); });
  };
  input.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    add(input.value);
    rerender({ focus: true });
  };
  box.querySelector('[data-mat-all]').onclick = () => rerender({ showAll: !showAll });
  if (focus) box.querySelector('#matSearch').focus();
}

// ---------- Förbättringskort (lista) ----------
export function ideaCards(ideas, items, places, { showPlace = true } = {}) {
  if (!ideas.length) return '';
  return `<div class="idea-cards">${ideas.map((x) => {
    const target = items.find((i) => i.id === x.itemId);
    const where = [showPlace && places.find((p) => p.id === x.placeId)?.name, target && itemLabel(target)].filter(Boolean).join(' › ');
    const icon = x.type ? typeOf(x.type).icon : I.idea;
    return `<button class="idea-card" data-open-idea="${x.id}">
      <div class="ic">${icon}</div>
      <div class="it">
        <strong>${esc(x.text.trim() || '')}</strong>
        ${x.action !== 'ide' ? `<span class="act act-${x.action}">${esc(ideaSummary(x, items))}</span>` : ''}
        ${!x.text.trim() && x.action === 'ide' ? '<span class="muted">Tom – tryck för att fylla i</span>' : ''}
        ${where ? `<small>${esc(where)}</small>` : ''}
      </div>
      <span class="chev">${I.chev}</span>
    </button>`;
  }).join('')}</div>`;
}

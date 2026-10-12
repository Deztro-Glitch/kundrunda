// Kundrunda – sidorna. Ett besök går i fyra steg:
//   1 Kund → 2 Nuläge (platser och kärl) → 3 Förbättringar → 4 Visa & skicka
// Förbättringar kan också läggas till direkt under rundan (på platsen eller kärlet).
import * as db from './db.js';
import { I } from './icons.js';
import {
  typeOf, itemLabel, contentText, costText, MATERIAL_UNITS, FILLS, FREQS, SUPPLIERS, FLAGS, RISK_FLAGS,
  PLACE_SUGGESTIONS, ACTIONS, needsTarget, proposesContainer, ideaHasContent, ideaSummary,
} from './data.js';
import { getRegister, parseRegister, saveRegister, clearRegister } from './register.js';
import { esc, today, MONTHS, prettyDate, plural, go, photoUrl, revokeUrls, toast } from './util.js';
import {
  main, setRefresh, refresh, pending, saveSoon, saveNow, flushSaves, bindFields, STEPS, stepHash, setTop, setTitle,
  setBottom, sectionHead, pickPhoto, addPhoto, photosHtml, bindPhotos, typeGrid, bindTypeGrid, changeType,
  choiceGroup, bindChoices, sizeSection, bindSizeSection, countStepper, bindCount, mountMaterialPicker, ideaCards,
} from './ui.js';
import { presentView, leavePresent } from './present.js';
import { exportVisitJson } from './export.js';
import { backupAll, importFile, lastBackup } from './backup.js';

const importInput = document.getElementById('importFile');
const total = (items) => items.reduce((s, i) => s + (Number(i.count) || 1), 0);

// Vilka steg som har innehåll – visas med en bock i stegraden.
const doneSteps = (d) => ({
  kund: !!d.visit.customer,
  nulage: d.items.length > 0,
  forbattringar: d.ideas.some(ideaHasContent),
});

// Ny förbättring: skapas direkt och öppnas. Tillbaka-knappen går dit man kom ifrån.
let ideaReturn = null;
async function newIdea(link, returnTo) {
  const idea = await db.put('ideas', { id: db.uid(), text: '', placeId: null, itemId: null, action: 'ide', ...link });
  ideaReturn = returnTo || location.hash;
  go(`#/forslag/${idea.id}`);
}
function bindIdeaCards(root) {
  root.querySelectorAll('[data-open-idea]').forEach((b) => {
    b.onclick = () => { ideaReturn = location.hash; go(`#/forslag/${b.dataset.openIdea}`); };
  });
}

// ---------- Säkerhetskopia ----------
const daysSince = (ms) => (ms ? Math.floor((Date.now() - ms) / 864e5) : Infinity);
function backupText(hasVisits) {
  const days = daysSince(lastBackup());
  const when = days === Infinity ? 'Ingen säkerhetskopia gjord än.'
    : days === 0 ? 'Senaste säkerhetskopian: idag.'
    : days === 1 ? 'Senaste säkerhetskopian: igår.'
    : `Senaste säkerhetskopian: för ${days} dagar sedan.`;
  return hasVisits
    ? `${when} Allt finns bara i den här iPaden – spara en kopia i Filer eller mejla den till dig själv, gärna en gång i veckan.`
    : 'Har du en säkerhetskopia från tidigare? Läs in den här.';
}

// =====================================================================
// Startsida: lista över besök
// =====================================================================
async function homeView() {
  const [visits, places, items] = await Promise.all([db.all('visits'), db.all('places'), db.all('items')]);
  visits.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  const placeCount = (id) => places.filter((r) => r.visitId === id).length;
  const reg = getRegister();

  setTop({ brand: true, title: 'Mina besök' });
  main.innerHTML = `
    <button class="btn big block" id="new">${I.plus} Nytt besök</button>
    <div class="section">
      ${visits.length ? `<div class="visit-list">${visits.map((v) => {
        const [, m, d] = (v.date || '').split('-').map(Number);
        const meta = [v.address, plural(placeCount(v.id), 'plats', 'platser'), plural(total(items.filter((i) => i.visitId === v.id)), 'kärl', 'kärl')]
          .filter(Boolean).join(' · ');
        return `<button class="visit" data-id="${v.id}" data-has-customer="${v.customer ? 1 : ''}">
          <div class="date"><b>${d || '–'}</b><small>${m ? MONTHS[m - 1] : ''}</small></div>
          <div class="info"><strong>${esc(v.customer || 'Namnlöst besök')}</strong><span>${esc(meta)}</span></div>
          <span class="chev">${I.chev}</span>
        </button>`;
      }).join('')}</div>` : `
      <div class="empty">${I.clipboard}<p>Inga besök än.</p><p>Tryck på <b>Nytt besök</b> när du är hos kunden.</p></div>`}
    </div>

    <div class="section">
      <div class="card backup ${visits.length && daysSince(lastBackup()) > 7 ? 'due' : ''}">
        <h3>${I.shield} Säkerhetskopia</h3>
        <p class="hint">${backupText(visits.length)}</p>
        <div class="btn-row">
          ${visits.length ? `<button class="btn" id="backup">${I.share} Säkerhetskopiera alla besök</button>` : ''}
          <button class="btn ghost" id="restore">${I.doc} Läs in från fil</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="card backup">
        <h3>${I.clipboard.replace('<svg', '<svg width="28" height="28"')} Register från offertverktyget</h3>
        <p class="hint">${reg
          ? `Inläst ${prettyDate(new Date(reg.importedAt).toISOString().slice(0, 10))}: ${reg.items.filter((x) => x.type === 'karl').length} kärl och containrar, ${reg.items.filter((x) => x.type === 'material').length} material. Du väljer samma namn som i offerten.`
          : 'Inte inläst. Kundrunda använder Ragn-Sells standardlistor. Exportera registret i offertverktyget (Register → Exportera) och läs in filen här, så blir namnen desamma i båda.'}</p>
        <div class="btn-row">
          <button class="btn ${reg ? 'ghost' : ''}" id="regLoad">${I.doc} ${reg ? 'Läs in nytt register' : 'Läs in register'}</button>
          ${reg ? `<button class="btn danger" id="regClear">${I.trash} Ta bort registret</button>` : ''}
        </div>
      </div>
    </div>`;

  main.querySelector('#new').onclick = async () => {
    const v = await db.put('visits', { id: db.uid(), customer: '', address: '', contact: '', date: today(), notes: '' });
    go(stepHash(v.id, 'kund'));
  };
  main.querySelectorAll('.visit').forEach((b) => {
    b.onclick = () => go(stepHash(b.dataset.id, b.dataset.hasCustomer ? 'nulage' : 'kund'));
  });

  main.querySelector('#backup')?.addEventListener('click', async () => {
    const t = toast('Förbereder säkerhetskopia …', 0);
    try {
      const r = await backupAll();
      t.remove();
      if (r.ok) toast(`Klart – ${plural(r.count, 'besök', 'besök')}, ${Math.max(1, Math.round(r.size / 1e6))} MB`);
      refresh();
    } catch (e) { console.error(e); toast('Säkerhetskopian misslyckades'); }
  });
  main.querySelector('#restore').onclick = () => {
    importInput.value = '';
    importInput.onchange = async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      const t = toast('Läser in …', 0);
      try {
        const r = await importFile(file);
        t.remove();
        const parts = [r.added && `${plural(r.added, 'besök', 'besök')} tillagda`, r.replaced && `${r.replaced} ersatta`,
          r.skipped && `${r.skipped} behölls som de var`].filter(Boolean);
        toast(parts.length ? parts.join(', ') : 'Inga besök i filen', 3500);
        refresh();
      } catch (e) { console.error(e); t.remove(); toast(e.message || 'Filen kunde inte läsas in', 4000); }
    };
    importInput.click();
  };
  main.querySelector('#regLoad').onclick = () => {
    importInput.value = '';
    importInput.onchange = async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const regItems = parseRegister(JSON.parse(await file.text()));
        if (!regItems) throw new Error('Det här är ingen registerfil från offertverktyget.');
        saveRegister(regItems);
        toast(`Registret är inläst – ${regItems.length} poster`);
        refresh();
      } catch (e) { toast(e instanceof SyntaxError ? 'Filen gick inte att läsa.' : e.message, 4000); }
    };
    importInput.click();
  };
  main.querySelector('#regClear')?.addEventListener('click', () => {
    if (!confirm('Ta bort registret? Kundrunda går tillbaka till Ragn-Sells standardlistor. Dina besök påverkas inte.')) return;
    clearRegister();
    refresh();
  });
}

// =====================================================================
// Steg 1: Kund
// =====================================================================
async function kundView(id) {
  const d = await db.loadVisit(id);
  if (!d) return go('#/');
  const { visit } = d;

  setTop({ back: '#/', title: visit.customer || 'Nytt besök', sub: prettyDate(visit.date), step: 'kund', visitId: id, done: doneSteps(d) });
  main.innerHTML = `
    <div class="step-intro"><b>Steg 1 av 4.</b> Vem är kunden? Det räcker med namnet – resten kan du fylla i senare.</div>
    <div class="card">
      <div class="grid-2">
        <label class="field"><span>Kund</span><input class="input" data-field="customer" value="${esc(visit.customer)}" placeholder="Företagets namn" autocomplete="off"></label>
        <label class="field"><span>Datum</span><input class="input" type="date" data-field="date" value="${esc(visit.date)}"></label>
        <label class="field"><span>Adress</span><input class="input" data-field="address" value="${esc(visit.address)}" placeholder="Gata, ort" autocomplete="off"></label>
        <label class="field"><span>Kontaktperson</span><input class="input" data-field="contact" value="${esc(visit.contact)}" placeholder="Namn, telefon" autocomplete="off"></label>
      </div>
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
    document.querySelector('.topbar .sub').textContent = prettyDate(visit.date);
  });
  if (!visit.customer) setTimeout(() => main.querySelector('[data-field="customer"]').focus(), 300);
  setBottom('Nästa: Nuläge', () => go(stepHash(id, 'nulage')), { next: true });

  main.querySelector('#delVisit').onclick = async () => {
    if (!confirm(`Ta bort besöket hos ${visit.customer || 'kunden'} med alla platser, kärl, förbättringar och bilder? Det går inte att ångra.`)) return;
    await db.deleteVisit(id);
    toast('Besöket är borttaget');
    go('#/');
  };
}

// =====================================================================
// Steg 2: Nuläge – platser
// =====================================================================
async function nulageView(id) {
  const d = await db.loadVisit(id);
  if (!d) return go('#/');
  const { visit, places, items, photos } = d;

  const placeCard = (p) => {
    const pItems = items.filter((i) => i.placeId === p.id);
    const pPhotos = photos.filter((ph) => ph.placeId === p.id);
    const cover = pPhotos.find((ph) => !ph.itemId) || pPhotos[0];
    const types = [...new Set(pItems.map((i) => i.type).filter(Boolean))].slice(0, 6);
    const flagged = pItems.filter((i) => i.flags.length).length;
    return `<button class="place" data-id="${p.id}">
      <div class="thumb">${cover ? `<img src="${photoUrl(cover)}" alt="">` : I.place}</div>
      <div class="body">
        <h3>${esc(p.name)}</h3>
        <div class="meta"><span>${plural(total(pItems), 'kärl', 'kärl')}</span><span>${plural(pPhotos.length, 'bild', 'bilder')}</span>${flagged ? `<span class="flag-count">${plural(flagged, 'flaggat', 'flaggade')}</span>` : ''}</div>
        ${types.length ? `<div class="mini-icons">${types.map((t) => typeOf(t).icon).join('')}</div>` : ''}
      </div>
    </button>`;
  };

  setTop({ back: '#/', title: visit.customer || 'Nytt besök', sub: 'Nuläge', step: 'nulage', visitId: id, done: doneSteps(d) });
  main.innerHTML = `
    <div class="step-intro"><b>Steg 2 av 4.</b> Gå runt med kunden. Lägg till en plats i taget och kärlen som står där.</div>
    ${places.length ? `<div class="place-grid">${places.map(placeCard).join('')}</div><div class="spacer"></div>` : ''}
    <div class="card add-place">
      <h3>${places.length ? 'Lägg till fler platser' : 'Lägg till första platsen'}</h3>
      <div class="row">
        <input class="input" id="placeName" placeholder="T.ex. Lastkajen" autocomplete="off" enterkeyhint="done">
        <button class="btn" id="addPlace">${I.plus} Lägg till</button>
      </div>
      <div class="chips">${PLACE_SUGGESTIONS.filter((s) => !places.some((p) => p.name === s))
        .map((s) => `<button class="chip" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    </div>
    <div class="section">
      <button class="btn improve block" id="quickIdea">${I.idea} Kunden kom på något? Lägg till en förbättring</button>
    </div>`;

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
  main.querySelector('#quickIdea').onclick = () => newIdea({ visitId: id });
  setBottom('Nästa: Förbättringar', () => go(stepHash(id, 'forbattringar')), { next: true });
}

// ---------- En plats: kärl, bilder, förbättringar, anteckning ----------
async function placeView(id) {
  const place = await db.get('places', id);
  if (!place) return go('#/');
  const d = await db.loadVisit(place.visitId);
  const items = d.items.filter((it) => it.placeId === id);
  const photos = d.photos.filter((p) => p.placeId === id);
  const placePhotos = photos.filter((p) => !p.itemId);
  const ideas = d.ideas.filter((x) => x.placeId === id && ideaHasContent(x));

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
        ${costText(it) ? `<div class="meta cost-line">Betalar idag: ${esc(costText(it))}</div>` : ''}
        ${it.flags.length ? `<div class="tags">${it.flags.map((f) =>
          `<span class="tag ${RISK_FLAGS.includes(f) ? 'risk' : ''}">${esc(f)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="count">${Number(it.count) || 1} st</div>
    </button>`;
  };

  setTop({ back: stepHash(place.visitId, 'nulage'), title: place.name, sub: d.visit.customer, step: 'nulage', visitId: place.visitId, done: doneSteps(d) });
  main.innerHTML = `
    ${sectionHead('Lägg till kärl')}
    ${typeGrid(null, { photoFirst: true })}
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

    <div class="section improve-zone">
      ${sectionHead(`${I.idea} Förbättringar här`)}
      ${ideaCards(ideas, d.items, d.places, { showPlace: false })}
      <button class="btn improve block" id="addIdea">${I.plus} Ny förbättring för ${esc(place.name)}</button>
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

  setBottom('Klar med platsen', () => go(stepHash(place.visitId, 'nulage')));
  bindFields(main, place, 'places', () => setTitle(place.name || 'Plats'));
  bindPhotos(main, placePhotos, { visitId: place.visitId, placeId: id, itemId: null });
  bindTypeGrid(main);
  bindIdeaCards(main);

  const newItem = (type) => db.put('items', {
    id: db.uid(), visitId: place.visitId, placeId: id, type, size: '', count: 1,
    materials: [...(typeOf(type).defaults || [])], fill: '', frequency: '', supplier: '', flags: [], notes: '',
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
    if (!confirm(`Ta bort platsen "${place.name}" med alla kärl och bilder? Förbättringarna finns kvar. Det går inte att ångra.`)) return;
    await db.deletePlace(id);
    go(stepHash(place.visitId, 'nulage'));
  };
}

// ---------- Ett kärl ----------
async function itemView(id) {
  const item = await db.get('items', id);
  if (!item) return go('#/');
  const d = await db.loadVisit(item.visitId);
  const place = d.places.find((p) => p.id === item.placeId);
  const photos = d.photos.filter((p) => p.itemId === id);
  const ideas = d.ideas.filter((x) => x.itemId === id && ideaHasContent(x));
  const hasMore = item.frequency || item.supplier || item.notes || costText(item);

  setTop({ back: `#/plats/${item.placeId}`, title: itemLabel(item), sub: place?.name, step: 'nulage', visitId: item.visitId, done: doneSteps(d) });
  main.innerHTML = `
    ${sectionHead('Bilder')}
    ${photosHtml(photos)}

    <div class="section">
      ${sectionHead('Typ')}
      ${typeGrid(item.type)}
    </div>

    ${item.type ? `<div class="section">${sizeSection(item)}</div>` : ''}

    <div class="section">
      ${sectionHead('Antal')}
      ${countStepper(item.count)}
    </div>

    <div class="section">
      ${sectionHead('Vad ligger i?', '<span class="muted">Välj ett eller flera</span>')}
      <div id="matBox"></div>
    </div>

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

    <details class="section more" ${hasMore ? 'open' : ''}>
      <summary><h2>Mer <span class="muted">(valfritt)</span></h2><span class="muted">Tömning, leverantör, pris idag, anteckning</span></summary>
      <div class="sub-section">
        <h3>Tömning idag</h3>
        ${choiceGroup('frequency', FREQS, item.frequency, 'Annat – t.ex. 2 gånger/vecka')}
      </div>
      <div class="sub-section">
        <h3>Leverantör idag</h3>
        ${choiceGroup('supplier', SUPPLIERS, item.supplier, 'Skriv namn på leverantör')}
      </div>
      <div class="sub-section">
        <h3>Vad kunden betalar idag</h3>
        <p class="hint" style="margin:-4px 0 10px">Om kunden berättar. Fyll bara i det du vet.</p>
        <div class="cost-grid">
          <label class="cost"><span>Hyra</span><input class="input" inputmode="decimal" data-cost="rent" value="${esc(item.costs.rent || '')}" placeholder="0"><em>kr/mån</em></label>
          <label class="cost"><span>Tömning</span><input class="input" inputmode="decimal" data-cost="empty" value="${esc(item.costs.empty || '')}" placeholder="0"><em>kr/st</em></label>
          <label class="cost"><span>Material</span><input class="input" inputmode="decimal" data-cost="material" value="${esc(item.costs.material || '')}" placeholder="0">
            <span class="unit-seg">${MATERIAL_UNITS.map((u) => `<button type="button" class="${(item.costs.materialUnit || 'kr/kg') === u ? 'on' : ''}" data-unit="${u}">${u}</button>`).join('')}</span></label>
        </div>
        <input class="input" style="margin-top:10px" data-cost="other" value="${esc(item.costs.other || '')}" placeholder="Övrigt – t.ex. fast avgift 500 kr/år" autocomplete="off">
      </div>
      <div class="sub-section">
        <h3>Anteckning</h3>
        <textarea class="input" data-field="notes" placeholder="Det du vill komma ihåg om just det här kärlet …">${esc(item.notes)}</textarea>
      </div>
    </details>

    <div class="section improve-zone">
      ${sectionHead(`${I.idea} Förbättringar för kärlet`)}
      ${ideaCards(ideas, d.items, d.places, { showPlace: false })}
      <button class="btn improve block" id="addIdea">${I.plus} Ny förbättring för kärlet</button>
    </div>

    <div class="danger-zone">
      <button class="btn danger" id="delItem">${I.trash} Ta bort kärlet</button>
    </div>`;

  setBottom(`Klar – tillbaka till ${place?.name || 'platsen'}`, () => go(`#/plats/${item.placeId}`));
  const relabel = () => setTitle(itemLabel(item));
  bindFields(main, item, 'items');
  bindChoices(main, item, 'items', (f) => { if (f === 'size') relabel(); });
  bindSizeSection(main, item, 'items', relabel);
  bindCount(main, item, 'items');
  bindPhotos(main, photos, { visitId: item.visitId, placeId: item.placeId, itemId: id });
  bindTypeGrid(main);
  bindIdeaCards(main);
  mountMaterialPicker(main.querySelector('#matBox'), item, 'items');

  main.querySelectorAll('[data-type]').forEach((b) => {
    b.onclick = async () => {
      if (item.type === b.dataset.type) return;
      await changeType(item, 'items', b.dataset.type);
      refresh();
    };
  });
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
  // Vad kunden betalar idag
  main.querySelectorAll('[data-cost]').forEach((el) => {
    el.oninput = () => { item.costs = { ...item.costs, [el.dataset.cost]: el.value.trim() }; saveSoon('items', item); };
  });
  main.querySelectorAll('[data-unit]').forEach((b) => {
    b.onclick = (e) => {
      e.preventDefault();
      item.costs = { ...item.costs, materialUnit: b.dataset.unit };
      main.querySelectorAll('[data-unit]').forEach((x) => x.classList.toggle('on', x === b));
      saveNow('items', item);
    };
  });

  main.querySelector('#addIdea').onclick = () => newIdea({ visitId: item.visitId, placeId: item.placeId, itemId: id });
  main.querySelector('#delItem').onclick = async () => {
    if (!confirm('Ta bort kärlet och dess bilder? Förbättringar för kärlet finns kvar.')) return;
    await db.deleteItem(id);
    go(`#/plats/${item.placeId}`);
  };
}

// =====================================================================
// Steg 3: Förbättringar
// =====================================================================
async function ideasView(id) {
  const d = await db.loadVisit(id);
  if (!d) return go('#/');
  const { visit, places, items } = d;
  // Tomma förbättringar (påbörjade men aldrig ifyllda) städas bort.
  for (const x of d.ideas.filter((x) => !ideaHasContent(x))) await db.del('ideas', x.id);
  const ideas = d.ideas.filter(ideaHasContent);
  const flagged = items.filter((i) => i.flags.length);

  const group = (title, list) => (list.length ? `<h3 class="group-head">${esc(title)}</h3>${ideaCards(list, items, places, { showPlace: false })}` : '');

  setTop({ back: '#/', title: visit.customer || 'Nytt besök', sub: 'Förbättringar', step: 'forbattringar', visitId: id, done: doneSteps(d) });
  main.innerHTML = `
    <div class="step-intro"><b>Steg 3 av 4.</b> Vad vill kunden ska bli bättre? Skriv en idé, eller föreslå ett nytt kärl, ett byte eller att något tas bort.</div>
    <button class="btn big block" id="addIdea">${I.plus} Ny förbättring</button>

    <div class="section">
      ${ideas.length ? `
        ${group('Hela verksamheten', ideas.filter((x) => !x.placeId))}
        ${places.map((p) => group(p.name, ideas.filter((x) => x.placeId === p.id))).join('')}`
        : `<div class="empty">${I.idea}<p>Inga förbättringar än.</p><p>Tryck på <b>Ny förbättring</b>, eller utgå från det ni såg under rundan här nedanför.</p></div>`}
    </div>

    ${flagged.length ? `<div class="section">
      ${sectionHead('Det här såg ni under rundan')}
      <div class="seen-list">${flagged.map((it) => `
        <div class="seen">
          <div class="seen-ico">${typeOf(it.type).icon}</div>
          <div class="seen-txt"><strong>${esc(itemLabel(it))}</strong><small>${esc(places.find((p) => p.id === it.placeId)?.name || '')}</small>
            <div class="tags">${it.flags.map((f) => `<span class="tag ${RISK_FLAGS.includes(f) ? 'risk' : ''}">${esc(f)}</span>`).join('')}</div></div>
          <button class="btn ghost" data-improve="${it.id}">${I.plus} Förbättra</button>
        </div>`).join('')}</div>
    </div>` : ''}`;

  bindIdeaCards(main);
  main.querySelector('#addIdea').onclick = () => newIdea({ visitId: id }, location.hash);
  main.querySelectorAll('[data-improve]').forEach((b) => {
    const it = items.find((x) => x.id === b.dataset.improve);
    b.onclick = () => newIdea({ visitId: id, placeId: it.placeId, itemId: it.id }, location.hash);
  });
  setBottom('Nästa: Visa & skicka', () => go(stepHash(id, 'klart')), { next: true });
}

// ---------- En förbättring ----------
async function ideaView(id) {
  const idea = await db.get('ideas', id);
  if (!idea) return go('#/');
  const d = await db.loadVisit(idea.visitId);
  const { places, items } = d;
  const back = ideaReturn || stepHash(idea.visitId, 'forbattringar');
  const placeItems = items.filter((i) => i.placeId === idea.placeId && i.type);
  const target = items.find((i) => i.id === idea.itemId);
  const showContainer = proposesContainer(idea.action);

  setTop({ back, title: 'Förbättring', sub: d.visit.customer, step: 'forbattringar', visitId: idea.visitId, done: doneSteps(d) });
  main.innerHTML = `
    ${sectionHead('Vad ska bli bättre?')}
    <textarea class="input big-text" data-field="text" placeholder="T.ex. Wellpappen tar för mycket plats – samla den i en balpress">${esc(idea.text)}</textarea>

    <div class="section">
      ${sectionHead('Gäller')}
      <div class="chips">
        <button class="chip ${!idea.placeId ? 'on' : ''}" data-place="">Hela verksamheten</button>
        ${places.map((p) => `<button class="chip ${idea.placeId === p.id ? 'on' : ''}" data-place="${p.id}">${esc(p.name)}</button>`).join('')}
      </div>
      ${idea.placeId && placeItems.length ? `
        <h3 class="small-head">Ett visst kärl? <span class="muted">(valfritt)</span></h3>
        <div class="target-list">${placeItems.map((it) => `
          <button class="target ${idea.itemId === it.id ? 'on' : ''}" data-target="${it.id}">
            <span class="ti">${typeOf(it.type).icon}</span><span><b>${esc(itemLabel(it))}</b><small>${esc([`${Number(it.count) || 1} st`, contentText(it)].filter(Boolean).join(' · '))}</small></span>
          </button>`).join('')}</div>` : ''}
    </div>

    <div class="section">
      ${sectionHead('Förslag', '<span class="muted">Valfritt</span>')}
      <div class="action-grid">${ACTIONS.map((a) => `
        <button class="action ${idea.action === a.key ? 'on' : ''}" data-action="${a.key}">${a.label}</button>`).join('')}</div>
      ${needsTarget(idea.action) && !target ? `<p class="warn-text">Välj vilket kärl det gäller under <b>Gäller</b> ovan.</p>` : ''}
      ${idea.action === 'tabort' && target ? `<p class="hint">Förslag: ta bort <b>${esc(itemLabel(target))}</b>.</p>` : ''}
    </div>

    ${showContainer ? `
      <div class="section proposal">
        ${sectionHead(idea.action === 'byt' ? `Byt till${target ? ` <span class="muted">(i stället för ${esc(itemLabel(target))})</span>` : ''}` : 'Vilket kärl?')}
        ${typeGrid(idea.type)}
      </div>
      ${idea.type ? `<div class="section">${sizeSection(idea)}</div>` : ''}
      <div class="section">
        ${sectionHead('Antal')}
        ${countStepper(idea.count)}
      </div>
      <div class="section">
        ${sectionHead('Vad ska ligga i?', '<span class="muted">Välj ett eller flera</span>')}
        <div id="matBox"></div>
      </div>` : ''}

    <div class="danger-zone">
      <button class="btn danger" id="delIdea">${I.trash} Ta bort förbättringen</button>
    </div>`;

  setBottom('Klar', () => { ideaReturn = null; go(back); });
  bindFields(main, idea, 'ideas');
  const ta = main.querySelector('[data-field="text"]');
  if (!idea.text && idea.action === 'ide') setTimeout(() => ta.focus(), 300);

  main.querySelectorAll('[data-place]').forEach((b) => {
    b.onclick = async () => {
      if ((idea.placeId || '') === b.dataset.place) return;
      idea.placeId = b.dataset.place || null;
      idea.itemId = null;
      await saveNow('ideas', idea);
      refresh();
    };
  });
  main.querySelectorAll('[data-target]').forEach((b) => {
    b.onclick = async () => {
      idea.itemId = idea.itemId === b.dataset.target ? null : b.dataset.target;
      await saveNow('ideas', idea);
      refresh();
    };
  });
  main.querySelectorAll('[data-action]').forEach((b) => {
    b.onclick = async () => {
      idea.action = b.dataset.action;
      // Byte: börja med samma material som kärlet som byts ut.
      if (idea.action === 'byt' && target && !idea.materials.length) idea.materials = [...target.materials];
      await saveNow('ideas', idea);
      refresh();
    };
  });
  if (showContainer) {
    bindTypeGrid(main);
    bindSizeSection(main, idea, 'ideas');
    bindChoices(main, idea, 'ideas');
    bindCount(main, idea, 'ideas');
    mountMaterialPicker(main.querySelector('#matBox'), idea, 'ideas');
    main.querySelectorAll('[data-type]').forEach((b) => {
      b.onclick = async () => {
        if (idea.type === b.dataset.type) return;
        await changeType(idea, 'ideas', b.dataset.type);
        refresh();
      };
    });
  }
  main.querySelector('#delIdea').onclick = async () => {
    if (ideaHasContent(idea) && !confirm('Ta bort förbättringen?')) return;
    pending.delete(idea.id);
    await db.del('ideas', idea.id);
    ideaReturn = null;
    go(back);
  };
}

// =====================================================================
// Steg 4: Visa & skicka
// =====================================================================
async function klartView(id) {
  const d = await db.loadVisit(id);
  if (!d) return go('#/');
  const { visit, places, items, photos } = d;
  const ideas = d.ideas.filter(ideaHasContent);
  const untyped = items.filter((i) => !i.type);
  const checks = [
    [!!visit.customer, visit.customer ? `Kund: ${visit.customer}` : 'Kundens namn saknas', stepHash(id, 'kund')],
    [items.length > 0, items.length ? `${plural(total(items), 'kärl', 'kärl')} på ${plural(places.length, 'plats', 'platser')}` : 'Inga kärl registrerade', stepHash(id, 'nulage')],
    [!untyped.length, untyped.length ? `${plural(untyped.length, 'kärl', 'kärl')} utan vald typ (foto först)` : 'Alla kärl har typ', untyped.length ? `#/karl/${untyped[0].id}` : null],
    [ideas.length > 0, ideas.length ? plural(ideas.length, 'förbättring', 'förbättringar') : 'Inga förbättringar än', stepHash(id, 'forbattringar')],
  ];

  setTop({ back: '#/', title: visit.customer || 'Nytt besök', sub: 'Visa & skicka', step: 'klart', visitId: id, done: doneSteps(d) });
  main.innerHTML = `
    <div class="step-intro"><b>Steg 4 av 4.</b> Visa sammanställningen för kunden, spara den som PDF eller skicka besöket till offertverktyget.</div>
    <div class="check-list">${checks.map(([ok, text, href]) => `
      <${href ? `button data-go="${href}"` : 'div'} class="check ${ok ? 'ok' : 'todo'}">
        <span class="ci">${ok ? I.check : '!'}</span><span>${esc(text)}</span>${href && !ok ? `<span class="chev">${I.chev}</span>` : ''}
      </${href ? 'button' : 'div'}>`).join('')}</div>

    <div class="final-actions">
      <button class="final" id="present">${I.present}<b>Visa för kunden</b><span>Nuläge och förbättringar i helskärm. Svep mellan sidorna.</span></button>
      <button class="final" id="pdf">${I.doc}<b>Spara som PDF</b><span>Öppnar sammanställningen och utskriften. Välj dela-ikonen → Spara i Filer eller Mail.</span></button>
      <button class="final" id="exportJson">${I.share}<b>Exportera till offert</b><span>En fil till offertverktyget på datorn – mejla den till dig själv.</span></button>
    </div>
    <p class="hint" style="margin-top:16px">${plural(photos.length, 'bild', 'bilder')} följer med i exporten.</p>`;

  main.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  main.querySelector('#present').onclick = () => go(`#/visa/${id}`);
  main.querySelector('#pdf').onclick = () => { sessionStorage.setItem('kundrunda.printOnOpen', '1'); go(`#/visa/${id}`); };
  main.querySelector('#exportJson').onclick = async () => {
    await flushSaves();
    const t = toast('Förbereder fil …', 0);
    try { await exportVisitJson(id); } catch (e) { console.error(e); toast('Exporten misslyckades'); return; }
    t.remove();
  };
  setBottom('Till mina besök', () => go('#/'), { icon: I.back });
}

// =====================================================================
// Navigering
// =====================================================================
const ROUTES = [
  [/^#\/besok\/([^/]+)\/kund$/, kundView],
  [/^#\/besok\/([^/]+)\/forbattringar$/, ideasView],
  [/^#\/besok\/([^/]+)\/klart$/, klartView],
  [/^#\/besok\/([^/]+)$/, nulageView],
  [/^#\/plats\/([^/]+)$/, placeView],
  [/^#\/karl\/([^/]+)$/, itemView],
  [/^#\/forslag\/([^/]+)$/, ideaView],
  [/^#\/visa\/([^/]+)$/, (id) => presentView(id)],
  [/.*/, homeView],
];
const scrollMemory = {};
let currentHash = null;

async function render({ animate }) {
  await flushSaves();
  const hash = location.hash || '#/';
  const y = window.scrollY;
  revokeUrls();
  setBottom(null);
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
setRefresh(() => render({ animate: false }));

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

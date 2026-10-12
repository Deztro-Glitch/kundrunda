// Visningsläge för kunden i helskärm, med två flikar:
//  • Nuläge – det du har registrerat (översikt, platser, det du såg). Svep mellan sidorna.
//  • Förbättringar – fylls i tillsammans med kunden, direkt här.
// Allt kan sparas som PDF.
import * as db from './db.js';
import { typeOf, itemLabel, contentText, costText, FILLS, RISK_FLAGS, ideaHasContent, ideaSummary } from './data.js';
import { topbar, main } from './ui.js';
import { esc, prettyDate, photoUrl, revokeUrls, openViewer, go, toast } from './util.js';
import { I } from './icons.js';

let showNotes = false; // anteckningar är dina egna – dolda för kunden om du inte slår på dem

const count = (it) => Number(it.count) || 1;
// Gruppering i översikten: ett material = det materialet. Flera = blandat.
const groupKey = (it) => {
  const m = it.materials || [];
  if (m.length === 1) return m[0];
  if (!m.length) return 'Ej angivet';
  return typeOf(it.type).kind === 'fa' ? 'Farligt avfall, blandat' : m.join(' + ');
};

function fillGauge(key) {
  const f = FILLS.find((x) => x.key === key);
  if (!f) return '';
  return `<span class="gauge ${f.over ? 'over' : ''}"><i style="width:${f.over ? 100 : f.pct}%"></i></span><span>${f.label}</span>`;
}

// Sparar förbättringar medan man skriver.
const timers = new Map();
function saveIdeaSoon(idea) {
  clearTimeout(timers.get(idea.id)?.t);
  timers.set(idea.id, { idea, t: setTimeout(() => { timers.delete(idea.id); db.put('ideas', idea); }, 400) });
}
async function flushIdeas() {
  const list = [...timers.values()];
  timers.clear();
  for (const { idea, t } of list) { clearTimeout(t); await db.put('ideas', idea); }
}

export async function presentView(visitId, { startAt = 0 } = {}) {
  leavePresent();
  await flushIdeas();
  revokeUrls();
  const d = await db.loadVisit(visitId);
  if (!d) return go('#/');
  const { visit, places, items, photos, ideas } = d;
  const placeName = (id) => places.find((p) => p.id === id)?.name || '';
  const total = items.reduce((s, it) => s + count(it), 0);
  const realIdeas = ideas.filter(ideaHasContent);

  // ---------- Försättsblad ----------
  const coverPhoto = photos.find((p) => !p.itemId) || photos[0];
  const cover = `
    <section class="slide cover">
      ${coverPhoto ? `<img class="cover-bg" src="${photoUrl(coverPhoto)}" alt="">` : ''}
      <div class="cover-inner">
        <div class="cover-brand">Ragn-Sells</div>
        <h1>${esc(visit.customer || 'Kund')}</h1>
        <p class="cover-meta">${[visit.address, prettyDate(visit.date, true)].filter(Boolean).map(esc).join(' · ')}</p>
        ${visit.contact ? `<p class="cover-meta">Kontaktperson: ${esc(visit.contact)}</p>` : ''}
        <div class="stats">
          <div><b>${places.length}</b><span>${places.length === 1 ? 'plats' : 'platser'}</span></div>
          <div><b>${total}</b><span>kärl och behållare</span></div>
        </div>
      </div>
    </section>`;

  // ---------- Det här har ni idag ----------
  const groups = new Map();
  for (const it of items) {
    const k = groupKey(it);
    if (!groups.has(k)) groups.set(k, { total: 0, lines: new Map(), places: new Set(), details: new Set() });
    const g = groups.get(k);
    g.total += count(it);
    g.lines.set(itemLabel(it), (g.lines.get(itemLabel(it)) || 0) + count(it));
    g.places.add(placeName(it.placeId));
    if (k === 'Farligt avfall, blandat') it.materials.forEach((m) => g.details.add(m));
  }
  const sorted = [...groups.entries()].sort((a, b) =>
    (a[0] === 'Ej angivet') - (b[0] === 'Ej angivet') || b[1].total - a[1].total);
  const today = `
    <section class="slide"><div class="slide-inner">
      <div class="eyebrow">Nuläge</div>
      <h2 class="slide-title">Det här har ni idag</h2>
      ${sorted.length ? `<div class="mat-table">
        <div class="mat-row head"><div>Material</div><div>Kärl och behållare</div><div>Antal</div></div>
        ${sorted.map(([name, g]) => `
          <div class="mat-row">
            <div class="mat-name">${esc(name)}</div>
            <div class="mat-lines">${[...g.lines.entries()].map(([l, n]) => `<span>${n} × ${esc(l)}</span>`).join('')}
              ${g.details.size ? `<small>${[...g.details].map(esc).join(', ')}</small>` : ''}
              <small>${[...g.places].filter(Boolean).map(esc).join(' · ')}</small></div>
            <div class="mat-total">${g.total}</div>
          </div>`).join('')}
      </div>` : '<p class="muted">Inga kärl registrerade.</p>'}
      ${places.length ? `<h3 class="sub-title">Per plats</h3>
      <div class="place-sum">${places.map((p) => {
        const n = items.filter((it) => it.placeId === p.id).reduce((s, it) => s + count(it), 0);
        return `<div><b>${n}</b><span>${esc(p.name)}</span></div>`;
      }).join('')}</div>` : ''}
    </div></section>`;

  // ---------- En sida per plats ----------
  const placeSlides = places.map((p, i) => {
    const pItems = items.filter((it) => it.placeId === p.id);
    const pPhotos = photos.filter((ph) => ph.placeId === p.id);
    // Bilder på platsen i galleriet. Kärlens bilder visas vid kärlen – utom när platsen saknar egna bilder.
    const placeOnly = pPhotos.filter((ph) => !ph.itemId);
    const [hero, ...rest] = placeOnly.length ? placeOnly : pPhotos.slice(0, 1);
    return `
      <section class="slide"><div class="slide-inner">
        <div class="eyebrow">Nuläge · Plats ${i + 1} av ${places.length}</div>
        <h2 class="slide-title">${esc(p.name)}</h2>
        <div class="place-layout ${hero ? '' : 'no-photo'}">
          ${hero ? `<div class="gallery">
            <button class="hero" data-photo="${hero.id}"><img src="${photoUrl(hero)}" alt=""></button>
            ${rest.length ? `<div class="thumbs">${rest.slice(0, 8).map((ph) =>
              `<button data-photo="${ph.id}"><img src="${photoUrl(ph)}" alt=""></button>`).join('')}</div>` : ''}
          </div>` : ''}
          <div class="p-items">
            ${pItems.length ? pItems.map((it) => {
              const ph = pPhotos.find((x) => x.itemId === it.id);
              const extra = [it.frequency && `Tömning: ${it.frequency}`, it.supplier && `Leverantör: ${it.supplier}`].filter(Boolean);
              return `<div class="p-item">
                <div class="p-ico">${typeOf(it.type).icon}</div>
                <div class="p-txt">
                  <strong>${esc(itemLabel(it))}</strong>
                  ${contentText(it) ? `<div>${esc(contentText(it))}</div>` : ''}
                  ${it.fill ? `<div class="fill-line">${fillGauge(it.fill)}</div>` : ''}
                  ${extra.length ? `<div class="muted">${extra.map(esc).join(' · ')}</div>` : ''}
                  ${it.flags.length ? `<div class="tags">${it.flags.map((f) =>
                    `<span class="tag ${RISK_FLAGS.includes(f) ? 'risk' : ''}">${esc(f)}</span>`).join('')}</div>` : ''}
                  ${showNotes && costText(it) ? `<div class="muted">Betalar idag: ${esc(costText(it))}</div>` : ''}
                  ${showNotes && it.notes ? `<div class="note">${esc(it.notes)}</div>` : ''}
                </div>
                <div class="p-count">${count(it)}<small>st</small></div>
                ${ph ? `<button class="p-photo" data-photo="${ph.id}"><img src="${photoUrl(ph)}" alt=""></button>` : ''}
              </div>`;
            }).join('') : '<p class="muted">Inga kärl på den här platsen.</p>'}
          </div>
        </div>
        ${showNotes && p.notes ? `<div class="note big">${esc(p.notes)}</div>` : ''}
      </div></section>`;
  });

  // ---------- Det här såg vi (flaggor) ----------
  const flagMap = new Map();
  for (const it of items) {
    for (const f of it.flags) {
      if (!flagMap.has(f)) flagMap.set(f, []);
      flagMap.get(f).push(`${placeName(it.placeId)}: ${itemLabel(it)}`);
    }
  }
  const seen = flagMap.size || (showNotes && visit.notes) ? `
    <section class="slide"><div class="slide-inner">
      <div class="eyebrow">Nuläge</div>
      <h2 class="slide-title">Det här såg vi</h2>
      ${flagMap.size ? `<div class="flag-sum">${[...flagMap.entries()].map(([f, where]) => `
        <div class="flag-row"><span class="tag ${RISK_FLAGS.includes(f) ? 'risk' : ''}">${esc(f)}</span>
        <span>${where.map(esc).join(' · ')}</span></div>`).join('')}</div>` : ''}
      ${showNotes && visit.notes ? `<h3 class="sub-title">Anteckningar</h3><div class="note big">${esc(visit.notes)}</div>` : ''}
    </div></section>` : '';

  // ---------- Förbättringar (fylls i med kunden) ----------
  const ctxLabel = (x) => {
    const it = items.find((i) => i.id === x.itemId);
    return [placeName(x.placeId), it && itemLabel(it)].filter(Boolean).join(' › ') || 'Hela verksamheten';
  };
  const placeOptions = (x) => `<option value="">Hela verksamheten</option>${places.map((p) =>
    `<option value="${p.id}" ${x.placeId === p.id && !x.itemId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
    ${x.itemId ? `<option value="keep" selected>${esc(ctxLabel(x))}</option>` : ''}`;
  const improve = `
    <section class="slide improve"><div class="slide-inner">
      <div class="eyebrow">Framåt</div>
      <h2 class="slide-title">Förbättringar</h2>
      ${realIdeas.length ? `<ol class="idea-big">${realIdeas.map((x) => `
        <li data-idea="${x.id}">
          <textarea class="imp-edit no-print" rows="1" placeholder="Skriv en kommentar …">${esc(x.text)}</textarea>
          ${x.action !== 'ide' ? `<div class="imp-sum">${x.type ? typeOf(x.type).icon : ''}<span>${esc(ideaSummary(x, items))}</span></div>` : ''}
          <div class="print-only">${esc(x.text).replace(/\n/g, '<br>')}</div>
          <div class="imp-foot">
            <small class="print-only">${esc(ctxLabel(x))}</small>
            <select class="imp-ctx no-print">${placeOptions(x)}</select>
            <button class="imp-del no-print" data-del aria-label="Ta bort">${I.close}</button>
          </div>
        </li>`).join('')}</ol>`
        : '<p class="muted imp-empty">Inga förbättringar än. Skriv in vad ni vill förbättra här nedanför.</p>'}
      <div class="imp-add no-print">
        <h3>Ny förbättring</h3>
        <textarea class="input" id="impNew" rows="2" placeholder="Vad vill ni ska bli bättre?"></textarea>
        <div class="chips" id="impPlace">
          <button class="chip on" data-place="">Hela verksamheten</button>
          ${places.map((p) => `<button class="chip" data-place="${p.id}">${esc(p.name)}</button>`).join('')}
        </div>
        <button class="btn big" id="impAdd">${I.plus} Lägg till</button>
      </div>
    </div></section>`;

  const nowSlides = [cover, today, ...placeSlides, seen].filter(Boolean);
  const slides = [...nowSlides, improve];
  const improveIndex = slides.length - 1;

  // ---------- Sidan ----------
  document.body.classList.add('presenting');
  topbar.innerHTML = '';
  main.innerHTML = `
    <div class="deck">${slides.join('')}</div>
    <div class="deck-ui">
      <button class="iconbtn deck-close" data-close aria-label="Stäng">${I.close}</button>
      <div class="deck-tabs" role="tablist">
        <button data-tab="now">Nuläge</button>
        <button data-tab="improve">${I.idea} Förbättringar${realIdeas.length ? ` <b>${realIdeas.length}</b>` : ''}</button>
      </div>
      <div class="deck-actions">
        <button class="btn ghost" data-notes aria-label="Anteckningar">${I.eye}<span>${showNotes ? 'Dölj anteckningar' : 'Visa anteckningar'}</span></button>
        <button class="btn" data-pdf>${I.doc}<span>PDF</span></button>
      </div>
      <button class="deck-nav prev" data-prev aria-label="Föregående">${I.prev}</button>
      <button class="deck-nav next" data-next aria-label="Nästa">${I.next}</button>
      <div class="dots">${slides.map((_, i) => `<button data-dot="${i}" class="${i === improveIndex ? 'dot-improve' : ''}" aria-label="Sida ${i + 1}"></button>`).join('')}</div>
    </div>`;

  const deck = main.querySelector('.deck');
  const ui = main.querySelector('.deck-ui');
  const dots = [...main.querySelectorAll('[data-dot]')];
  const index = () => Math.round(deck.scrollLeft / deck.clientWidth);
  const show = (i, smooth = true) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    deck.scrollTo({ left: i * deck.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };
  let current = startAt;
  const mark = () => {
    const i = index();
    current = i;
    dots.forEach((dd, j) => dd.classList.toggle('on', j === i));
    main.querySelector('[data-prev]').disabled = i === 0;
    main.querySelector('[data-next]').disabled = i === slides.length - 1;
    main.querySelector('[data-tab="now"]').classList.toggle('on', i < improveIndex);
    main.querySelector('[data-tab="improve"]').classList.toggle('on', i === improveIndex);
  };
  deck.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
  requestAnimationFrame(() => { show(startAt, false); mark(); });
  // Tona ner knapparna när man skrollar ner på en sida, så de inte skymmer innehållet.
  main.querySelectorAll('.slide').forEach((s) => s.addEventListener('scroll', () => {
    ui.classList.toggle('dim', s.scrollTop > 40);
  }, { passive: true }));

  main.querySelector('[data-prev]').onclick = () => show(index() - 1);
  main.querySelector('[data-next]').onclick = () => show(index() + 1);
  dots.forEach((dd) => { dd.onclick = () => show(Number(dd.dataset.dot)); });
  main.querySelector('[data-tab="now"]').onclick = () => show(current >= improveIndex ? 0 : current);
  main.querySelector('[data-tab="improve"]').onclick = () => show(improveIndex);
  main.querySelector('[data-close]').onclick = () => go(`#/besok/${visitId}/klart`);
  const rerender = () => presentView(visitId, { startAt: index() });
  main.querySelector('[data-notes]').onclick = () => { showNotes = !showNotes; rerender(); };
  main.querySelector('[data-pdf]').onclick = () => window.print();
  // "Spara som PDF" i steg 4: öppna utskriften direkt.
  if (sessionStorage.getItem('kundrunda.printOnOpen')) {
    sessionStorage.removeItem('kundrunda.printOnOpen');
    setTimeout(() => window.print(), 700);
  }
  main.querySelectorAll('[data-photo]').forEach((b) => {
    b.onclick = () => openViewer(photos.find((p) => p.id === b.dataset.photo));
  });

  // ---------- Förbättringar: redigera, koppla, ta bort, lägga till ----------
  const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; };
  main.querySelectorAll('.improve [data-idea]').forEach((li) => {
    const idea = ideas.find((x) => x.id === li.dataset.idea);
    const ta = li.querySelector('.imp-edit');
    requestAnimationFrame(() => grow(ta));
    ta.oninput = () => { grow(ta); idea.text = ta.value; saveIdeaSoon(idea); li.querySelector('.print-only').textContent = ta.value; };
    li.querySelector('.imp-ctx').onchange = async (e) => {
      if (e.target.value === 'keep') return;
      idea.placeId = e.target.value || null;
      idea.itemId = null;
      await db.put('ideas', idea);
      rerender();
    };
    li.querySelector('[data-del]').onclick = async () => {
      if (!confirm('Ta bort förbättringen?')) return;
      await db.del('ideas', idea.id);
      rerender();
    };
  });
  let newPlace = '';
  main.querySelectorAll('#impPlace [data-place]').forEach((c) => {
    c.onclick = () => {
      newPlace = c.dataset.place;
      main.querySelectorAll('#impPlace [data-place]').forEach((x) => x.classList.toggle('on', x === c));
    };
  });
  const newText = main.querySelector('#impNew');
  newText.oninput = () => grow(newText);
  main.querySelector('#impAdd').onclick = async () => {
    const text = newText.value.trim();
    if (!text) { newText.focus(); return; }
    await db.put('ideas', { id: db.uid(), visitId, text, placeId: newPlace || null, itemId: null });
    toast('Förbättringen är tillagd');
    rerender();
  };

  // Piltangenter (tangentbord kopplat till iPaden) – men inte när man skriver.
  const onKey = (e) => {
    if (e.target.matches('textarea, input, select')) return;
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  };
  // Håll rätt sida när iPaden vrids.
  const onResize = () => show(current, false);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  detach = () => {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
  };
}

let detach = null;
export function leavePresent() {
  flushIdeas();
  detach?.();
  detach = null;
  document.body.classList.remove('presenting');
}

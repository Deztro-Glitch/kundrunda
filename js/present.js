// Visningsläge: sammanställning för kunden i helskärm. Svep mellan sidorna. Kan sparas som PDF.
import * as db from './db.js';
import { typeOf, itemLabel, contentText, FILLS, RISK_FLAGS } from './data.js';
import { esc, prettyDate, plural, photoUrl, openViewer, go } from './util.js';
import { I } from './icons.js';

let showNotes = false; // anteckningar är dina egna – dolda för kunden om du inte slår på dem

const count = (it) => Number(it.count) || 1;
const groupKey = (it) => (typeOf(it.type).collects ? 'Farligt avfall' : it.material || 'Ej angivet');

function fillGauge(key) {
  const f = FILLS.find((x) => x.key === key);
  if (!f) return '';
  return `<span class="gauge ${f.over ? 'over' : ''}"><i style="width:${f.over ? 100 : f.pct}%"></i></span><span>${f.label}</span>`;
}

export async function presentView(visitId, { topbar, main, startAt = 0 }) {
  leavePresent();
  const d = await db.loadVisit(visitId);
  if (!d) return go('#/');
  const { visit, places, items, photos, ideas } = d;
  const placeName = (id) => places.find((p) => p.id === id)?.name || '';
  const total = items.reduce((s, it) => s + count(it), 0);
  const realIdeas = ideas.filter((i) => i.text?.trim());

  // ---------- Försättsblad ----------
  const coverPhoto = photos.find((p) => !p.itemId) || photos[0];
  const cover = `
    <section class="slide cover">
      ${coverPhoto ? `<img class="cover-bg" src="${photoUrl(coverPhoto)}" alt="">` : ''}
      <div class="cover-inner">
        <div class="cover-brand">Ragn-Sells</div>
        <div class="eyebrow light">Genomgång av avfallshantering</div>
        <h1>${esc(visit.customer || 'Kund')}</h1>
        <p class="cover-meta">${[visit.address, prettyDate(visit.date, true)].filter(Boolean).map(esc).join(' · ')}</p>
        ${visit.contact ? `<p class="cover-meta">Kontaktperson: ${esc(visit.contact)}</p>` : ''}
        <div class="stats">
          <div><b>${places.length}</b><span>${places.length === 1 ? 'plats' : 'platser'}</span></div>
          <div><b>${total}</b><span>kärl och behållare</span></div>
          <div><b>${realIdeas.length}</b><span>${realIdeas.length === 1 ? 'idé' : 'idéer'}</span></div>
        </div>
      </div>
    </section>`;

  // ---------- Det här har ni idag ----------
  const groups = new Map();
  for (const it of items) {
    const k = groupKey(it);
    if (!groups.has(k)) groups.set(k, { total: 0, lines: new Map(), places: new Set() });
    const g = groups.get(k);
    g.total += count(it);
    g.lines.set(itemLabel(it), (g.lines.get(itemLabel(it)) || 0) + count(it));
    g.places.add(placeName(it.placeId));
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
    const ordered = [...pPhotos.filter((ph) => !ph.itemId), ...pPhotos.filter((ph) => ph.itemId)];
    const [hero, ...rest] = ordered;
    const pIdeas = realIdeas.filter((x) => x.placeId === p.id);
    return `
      <section class="slide"><div class="slide-inner">
        <div class="eyebrow">Plats ${i + 1} av ${places.length}</div>
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
                  ${showNotes && it.notes ? `<div class="note">${esc(it.notes)}</div>` : ''}
                </div>
                <div class="p-count">${count(it)}<small>st</small></div>
                ${ph ? `<button class="p-photo" data-photo="${ph.id}"><img src="${photoUrl(ph)}" alt=""></button>` : ''}
              </div>`;
            }).join('') : '<p class="muted">Inga kärl på den här platsen.</p>'}
          </div>
        </div>
        ${showNotes && p.notes ? `<div class="note big">${esc(p.notes)}</div>` : ''}
        ${pIdeas.length ? `<div class="place-ideas"><h3>${I.idea} Det här pratade vi om här</h3>
          <ul>${pIdeas.map((x) => `<li>${esc(x.text)}</li>`).join('')}</ul></div>` : ''}
      </div></section>`;
  });

  // ---------- Det här pratade vi om ----------
  const ideaContext = (x) => {
    const it = items.find((i) => i.id === x.itemId);
    return [placeName(x.placeId), it && itemLabel(it)].filter(Boolean).join(' › ');
  };
  const flagMap = new Map();
  for (const it of items) {
    for (const f of it.flags) {
      if (!flagMap.has(f)) flagMap.set(f, []);
      flagMap.get(f).push(`${placeName(it.placeId)}: ${itemLabel(it)}`);
    }
  }
  const talked = `
    <section class="slide"><div class="slide-inner">
      <div class="eyebrow">Framåt</div>
      <h2 class="slide-title">Det här pratade vi om</h2>
      ${realIdeas.length ? `<ol class="idea-big">${realIdeas.map((x) => `
        <li><div>${esc(x.text).replace(/\n/g, '<br>')}</div>${ideaContext(x) ? `<small>${esc(ideaContext(x))}</small>` : ''}</li>`).join('')}
      </ol>` : '<p class="muted">Inga idéer antecknade.</p>'}
      ${flagMap.size ? `<h3 class="sub-title">Det här såg vi</h3>
      <div class="flag-sum">${[...flagMap.entries()].map(([f, where]) => `
        <div class="flag-row"><span class="tag ${RISK_FLAGS.includes(f) ? 'risk' : ''}">${esc(f)}</span>
        <span>${where.map(esc).join(' · ')}</span></div>`).join('')}</div>` : ''}
      ${showNotes && visit.notes ? `<h3 class="sub-title">Anteckningar</h3><div class="note big">${esc(visit.notes)}</div>` : ''}
    </div></section>`;

  const slides = [cover, today, ...placeSlides, talked];

  // ---------- Sidan ----------
  document.body.classList.add('presenting');
  topbar.innerHTML = '';
  main.innerHTML = `
    <div class="deck">${slides.join('')}</div>
    <div class="deck-ui">
      <button class="iconbtn deck-close" data-close aria-label="Stäng">${I.close}</button>
      <div class="deck-actions">
        <button class="btn ghost" data-notes>${I.eye} ${showNotes ? 'Dölj anteckningar' : 'Visa anteckningar'}</button>
        <button class="btn" data-pdf>${I.doc} Spara som PDF</button>
      </div>
      <button class="deck-nav prev" data-prev aria-label="Föregående">${I.prev}</button>
      <button class="deck-nav next" data-next aria-label="Nästa">${I.next}</button>
      <div class="dots">${slides.map((_, i) => `<button data-dot="${i}" aria-label="Sida ${i + 1}"></button>`).join('')}</div>
    </div>`;

  const deck = main.querySelector('.deck');
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
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    main.querySelector('[data-prev]').disabled = i === 0;
    main.querySelector('[data-next]').disabled = i === slides.length - 1;
  };
  deck.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
  requestAnimationFrame(() => { show(startAt, false); mark(); });

  main.querySelector('[data-prev]').onclick = () => show(index() - 1);
  main.querySelector('[data-next]').onclick = () => show(index() + 1);
  dots.forEach((d) => { d.onclick = () => show(Number(d.dataset.dot)); });
  main.querySelector('[data-close]').onclick = () => go(`#/besok/${visitId}`);
  main.querySelector('[data-notes]').onclick = () => {
    showNotes = !showNotes;
    presentView(visitId, { topbar, main, startAt: index() });
  };
  main.querySelector('[data-pdf]').onclick = () => window.print();
  main.querySelectorAll('[data-photo]').forEach((b) => {
    b.onclick = () => openViewer(photos.find((p) => p.id === b.dataset.photo));
  });

  // Piltangenter (tangentbord kopplat till iPaden).
  const onKey = (e) => {
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
  detach?.();
  detach = null;
  document.body.classList.remove('presenting');
}

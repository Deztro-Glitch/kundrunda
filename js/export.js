// Export av ett besök som JSON-fil (för offertverktyget senare, och som säkerhetskopia).
// Inget skickas automatiskt – filen delas bara via iPadens dela-meny när du själv väljer det.
import * as db from './db.js';
import { itemLabel, contentText, costText, typeOf, FILLS, ideaSummary, ideaHasContent } from './data.js';

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

const slug = (s) => (s || 'besok').toLowerCase()
  .replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'besok';

const strip = ({ updatedAt, ...rest }) => rest;

export async function buildJson(visitId) {
  const d = await db.loadVisit(visitId);
  const photos = [];
  for (const p of d.photos) {
    if (p.broken || !p.blob) continue; // bild som inte går att läsa hoppas över
    photos.push({
      id: p.id, placeId: p.placeId, itemId: p.itemId || null,
      width: p.width, height: p.height, createdAt: p.createdAt, dataUrl: await blobToDataUrl(p.blob),
    });
  }
  return {
    format: 'ragnsells-kundrunda',
    version: 1,
    exportedAt: new Date().toISOString(),
    visit: strip(d.visit),
    places: d.places.map(strip),
    // Färdiga texter läggs till så att filen är lätt att läsa även utan appen.
    items: d.items.map((it) => ({
      ...strip(it),
      typeLabel: typeOf(it.type).label,
      label: itemLabel(it),
      contentText: contentText(it),
      fillLabel: FILLS.find((f) => f.key === it.fill)?.label || '',
      costText: costText(it),
      parts: (it.parts || []).map((x) => ({ ...x, label: x.type ? itemLabel(x) : '' })),
    })),
    ideas: d.ideas.filter(ideaHasContent).map((x) => ({
      ...strip(x),
      label: x.type ? itemLabel(x) : '',
      summary: ideaSummary(x, d.items),
    })),
    photos,
  };
}

// Delar filen (Spara i Filer, AirDrop, Mail …) eller laddar ner den om delning saknas.
export async function shareFile(blob, name, type) {
  const file = new File([blob], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false; // användaren ångrade sig
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

export async function exportVisitJson(visitId) {
  const data = await buildJson(visitId);
  const name = `kundrunda-${slug(data.visit.customer)}-${data.visit.date || ''}.json`;
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  return shareFile(blob, name, 'application/json');
}

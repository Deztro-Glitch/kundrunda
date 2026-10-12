// Säkerhetskopia: spara alla besök i en fil, och läs in en fil igen (t.ex. på en ny iPad).
// Filen delas via iPadens dela-meny – inget skickas automatiskt.
import * as db from './db.js';
import { buildJson, shareFile } from './export.js';
import { today } from './util.js';

const KEY = 'kundrunda.senasteKopia';

export function lastBackup() {
  try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; }
}

export async function backupAll() {
  const visits = await db.all('visits');
  // Byggs i delar så att iPaden inte behöver hålla en jättelång text i minnet på en gång.
  const parts = [`{"format":"ragnsells-kundrunda-backup","version":1,"exportedAt":${JSON.stringify(new Date().toISOString())},"visits":[`];
  for (const [i, v] of visits.entries()) {
    if (i) parts.push(',');
    parts.push(JSON.stringify(await buildJson(v.id)));
  }
  parts.push(']}');
  const blob = new Blob(parts, { type: 'application/json' });
  const ok = await shareFile(blob, `kundrunda-sakerhetskopia-${today()}.json`, 'application/json');
  if (ok) { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* inte kritiskt */ } }
  return { ok, count: visits.length, size: blob.size };
}

// Fält som exporten lägger till för läsbarhet – behövs inte i appen.
const cleanItem = ({ typeLabel, label, contentText, fillLabel, costText, ...rest }) => rest;

async function restoreVisit(v) {
  await db.put('visits', v.visit);
  for (const p of v.places || []) await db.put('places', p);
  for (const it of v.items || []) await db.put('items', cleanItem(it));
  for (const x of v.ideas || []) await db.put('ideas', x);
  for (const ph of v.photos || []) {
    const blob = await (await fetch(ph.dataUrl)).blob();
    const { dataUrl, ...rest } = ph;
    await db.put('photos', { ...rest, visitId: v.visit.id, blob });
  }
}

// Läser in en säkerhetskopia (alla besök) eller ett enskilt exporterat besök.
export async function importFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('Filen gick inte att läsa.'); }
  const list = data.format === 'ragnsells-kundrunda-backup' ? data.visits
    : data.format === 'ragnsells-kundrunda' ? [data] : null;
  if (!list) throw new Error('Det här är ingen fil från Kundrunda.');

  const result = { added: 0, replaced: 0, skipped: 0 };
  for (const v of list) {
    if (!v?.visit?.id) continue;
    const existing = await db.get('visits', v.visit.id);
    if (existing) {
      const name = existing.customer || 'Namnlöst besök';
      if (!confirm(`"${name}" finns redan på iPaden.\n\nVill du ersätta det med versionen från filen?\n(Avbryt = behåll det som finns)`)) {
        result.skipped++;
        continue;
      }
      await db.deleteVisit(v.visit.id);
      await restoreVisit(v);
      result.replaced++;
    } else {
      await restoreVisit(v);
      result.added++;
    }
  }
  return result;
}

// Små hjälpfunktioner som används av flera sidor.
import { I } from './icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MONTHS_LONG = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
export const prettyDate = (iso, long = false) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
};
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const go = (hash) => { location.hash = hash; };
export const byCreated = (a, b) => a.createdAt - b.createdAt;

// Bild-URL:er frigörs när man byter sida så minnet inte tar slut.
let urls = [];
export const photoUrl = (p) => { const u = URL.createObjectURL(p.blob); urls.push(u); return u; };
export const revokeUrls = () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; };

let toastTimer;
export function toast(msg, ms = 2400) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => t.remove(), ms);
  return t;
}

// Visar en bild i helskärm. Med onDelete går den att ta bort.
export function openViewer(photo, { onDelete } = {}) {
  const v = document.createElement('div');
  v.className = 'viewer';
  const url = URL.createObjectURL(photo.blob);
  v.innerHTML = `
    <div class="bar">
      ${onDelete ? `<button class="btn danger" data-del>${I.trash} Ta bort bild</button>` : '<span></span>'}
      <button class="btn ghost" data-close>${I.close} Stäng</button>
    </div>
    <div class="img"><img src="${url}" alt=""></div>`;
  const close = () => { URL.revokeObjectURL(url); v.remove(); };
  v.querySelector('[data-close]').onclick = close;
  v.querySelector('.img').onclick = (e) => { if (e.target.tagName !== 'IMG') close(); };
  v.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!confirm('Ta bort bilden?')) return;
    await onDelete();
    close();
  });
  document.body.appendChild(v);
}

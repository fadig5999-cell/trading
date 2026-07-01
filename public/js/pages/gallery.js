import { Marbles } from '../api.js';
import { escapeHtml, money, statusBadge, isAdmin, emptyState } from '../ui.js';
import { icons } from '../icons.js';
import { openDetailModal } from '../components/detailModal.js';
import { quickSellOne } from '../components/sellModal.js';
import { refreshLowStockBadge } from '../app.js';

export const title = 'גלריה';
export const subtitle = 'תצוגת יוקרה של סוגי השיש';

export async function mount(el, ctx) {
  el.innerHTML = `
    <div class="toolbar">
      <div class="search-box">${icons.search}<input type="search" id="q" placeholder="חיפוש בגלריה..."></div>
    </div>
    <div id="gallery-area"></div>
  `;
  const area = el.querySelector('#gallery-area');

  const load = async (q = '') => {
    area.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    let rows;
    try { rows = await Marbles.list({ q }); }
    catch (e) { area.innerHTML = emptyState(icons.alert, 'שגיאה', e.message); return; }
    if (!rows.length) { area.innerHTML = emptyState(icons.gallery, 'הגלריה ריקה', 'הוסף סוגי שיש כדי לראותם כאן'); return; }

    area.innerHTML = `<div class="card-grid">${rows.map(card).join('')}</div>`;
    area.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = rows.find((x) => x.id == b.dataset.id);
      if (b.dataset.act === 'detail') openDetailModal(m, () => load(el.querySelector('#q').value));
      else if (b.dataset.act === 'sellone') quickSellOne(m, () => { load(el.querySelector('#q').value); refreshLowStockBadge(); });
    }));
    area.querySelectorAll('.mcard[data-row]').forEach((r) => r.addEventListener('click', () => {
      const m = rows.find((x) => x.id == r.dataset.row);
      openDetailModal(m, () => load(el.querySelector('#q').value));
    }));
  };

  function card(m) {
    return `
      <div class="mcard" data-row="${m.id}" style="cursor:pointer">
        <div class="img">
          ${m.image ? `<img src="${escapeHtml(m.image)}" alt="">` : `<span class="ph">${icons.image}</span>`}
          ${statusBadge(m.status)}
        </div>
        <div class="body">
          <h4>${escapeHtml(m.name_he || m.name)}</h4>
          ${m.name ? `<span class="en" dir="ltr">${escapeHtml(m.name)}</span>` : ''}
          <div class="meta">
            ${m.color ? `<span class="chip">${escapeHtml(m.color)}</span>` : ''}
            ${m.category ? `<span class="chip">${escapeHtml(m.category)}</span>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">
            <span class="qty-pill">${m.quantity} במלאי</span>
            <span class="price">${m.selling_price ? money(m.selling_price) : ''}</span>
          </div>
        </div>
        <div class="foot" onclick="event.stopPropagation()">
          <button class="btn sm ghost" data-act="detail" data-id="${m.id}">${icons.eye}<span>פרטים</span></button>
          ${isAdmin() ? `<button class="btn sm success" data-act="sellone" data-id="${m.id}" ${m.quantity <= 0 ? 'disabled' : ''}>${icons.cart}<span>מכור לוח</span></button>` : ''}
        </div>
      </div>`;
  }

  let t;
  el.querySelector('#q').addEventListener('input', (e) => {
    clearTimeout(t); t = setTimeout(() => load(e.target.value), 250);
  });
  await load();
}

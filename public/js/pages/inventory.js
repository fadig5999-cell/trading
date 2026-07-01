import { Marbles } from '../api.js';
import { escapeHtml, money, statusBadge, isAdmin, toast, confirmDialog, emptyState } from '../ui.js';
import { icons } from '../icons.js';
import { openMarbleForm } from '../components/marbleForm.js';
import { openSellModal, quickSellOne } from '../components/sellModal.js';
import { openStockModal } from '../components/stockModal.js';
import { openDetailModal } from '../components/detailModal.js';
import { refreshLowStockBadge } from '../app.js';

export const title = 'מלאי';
export const subtitle = 'ניהול כל סוגי השיש והאבן';

let view = 'table';
const filters = { q: '', color: '', thickness: '', location: '', category: '', status: '' };

export async function mount(el, ctx) {
  const facets = await Marbles.facets().catch(() => ({ colors: [], thicknesses: [], locations: [], categories: [] }));

  const opt = (list, sel) => ['<option value="">הכל</option>']
    .concat(list.map((v) => `<option value="${escapeHtml(v)}" ${sel === v ? 'selected' : ''}>${escapeHtml(v)}</option>`))
    .join('');

  el.innerHTML = `
    ${isAdmin() ? '' : '<div class="readonly-note" style="margin-bottom:14px">' + icons.eye + ' מצב צפייה בלבד — אין הרשאת עריכה</div>'}
    <div class="toolbar">
      <div class="search-box">
        ${icons.search}
        <input type="search" id="q" placeholder="חיפוש לפי שם שיש, קטגוריה או הערה..." value="${escapeHtml(filters.q)}">
      </div>
      ${isAdmin() ? `<button class="btn primary" id="add-btn">${icons.plus}<span>הוסף סוג שיש</span></button>` : ''}
      <div class="seg" id="view-seg">
        <button data-v="table" class="${view === 'table' ? 'active' : ''}">טבלה</button>
        <button data-v="cards" class="${view === 'cards' ? 'active' : ''}">כרטיסים</button>
      </div>
    </div>
    <div class="filters" style="margin-bottom:18px">
      <select id="f-category">${opt(facets.categories, filters.category)}</select>
      <select id="f-color">${opt(facets.colors, filters.color)}</select>
      <select id="f-thickness">${opt(facets.thicknesses, filters.thickness)}</select>
      <select id="f-location">${opt(facets.locations, filters.location)}</select>
      <select id="f-status">
        <option value="">כל הסטטוסים</option>
        <option value="in_stock" ${filters.status === 'in_stock' ? 'selected' : ''}>במלאי</option>
        <option value="low_stock" ${filters.status === 'low_stock' ? 'selected' : ''}>מלאי נמוך</option>
        <option value="sold_out" ${filters.status === 'sold_out' ? 'selected' : ''}>אזל מהמלאי</option>
      </select>
      <button class="btn ghost sm" id="reset-filters">נקה סינון</button>
    </div>
    <div id="list-area"></div>
  `;

  const listArea = el.querySelector('#list-area');

  const reload = async () => {
    listArea.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    let rows;
    try { rows = await Marbles.list(filters); }
    catch (e) { listArea.innerHTML = emptyState(icons.alert, 'שגיאה', e.message); return; }
    render(rows);
    refreshLowStockBadge();
  };

  const onChanged = () => reload();

  function render(rows) {
    if (!rows.length) {
      listArea.innerHTML = emptyState(icons.box, 'לא נמצאו פריטים', 'נסה לשנות את החיפוש או הסינון');
      return;
    }
    listArea.innerHTML = view === 'table' ? tableHtml(rows) : cardsHtml(rows);
    wire(rows);
  }

  function wire(rows) {
    listArea.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = rows.find((x) => x.id == btn.dataset.id);
        const act = btn.dataset.act;
        if (act === 'detail') openDetailModal(m, onChanged);
        else if (act === 'sell') openSellModal(m, onChanged);
        else if (act === 'sellone') quickSellOne(m, onChanged);
        else if (act === 'stock') openStockModal(m, onChanged);
        else if (act === 'edit') openMarbleForm(m, onChanged);
        else if (act === 'delete') doDelete(m);
      });
    });
    listArea.querySelectorAll('tr[data-row], .mcard[data-row]').forEach((r) => {
      r.addEventListener('click', () => {
        const m = rows.find((x) => x.id == r.dataset.row);
        openDetailModal(m, onChanged);
      });
    });
  }

  async function doDelete(m) {
    const ok = await confirmDialog({
      title: 'מחיקת סוג שיש',
      message: `האם למחוק את "${m.name_he || m.name}"? פעולה זו אינה הפיכה.`,
      confirmText: 'מחק', danger: true
    });
    if (!ok) return;
    try { await Marbles.remove(m.id); toast('סוג השיש נמחק'); reload(); }
    catch (e) { toast(e.message, 'err'); }
  }

  // Events
  let searchTimer;
  el.querySelector('#q').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    filters.q = e.target.value;
    searchTimer = setTimeout(reload, 250);
  });
  const bindSel = (id, key) => el.querySelector(id).addEventListener('change', (e) => { filters[key] = e.target.value; reload(); });
  bindSel('#f-category', 'category');
  bindSel('#f-color', 'color');
  bindSel('#f-thickness', 'thickness');
  bindSel('#f-location', 'location');
  bindSel('#f-status', 'status');
  el.querySelector('#reset-filters').addEventListener('click', () => {
    Object.keys(filters).forEach((k) => (filters[k] = ''));
    ctx.navigate('inventory'); // simple re-render
  });
  el.querySelector('#view-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    view = b.dataset.v;
    el.querySelectorAll('#view-seg button').forEach((x) => x.classList.toggle('active', x === b));
    reload();
  });
  if (isAdmin()) el.querySelector('#add-btn').addEventListener('click', () => openMarbleForm(null, onChanged));

  await reload();
}

function rowActions(m) {
  if (!isAdmin()) return `<button class="btn sm ghost" data-act="detail" data-id="${m.id}">${icons.eye}</button>`;
  return `
    <button class="btn sm success" data-act="sellone" data-id="${m.id}" ${m.quantity <= 0 ? 'disabled' : ''} title="מכור לוח אחד">${icons.cart}</button>
    <button class="btn sm chrome" data-act="stock" data-id="${m.id}" title="מלאי">${icons.box}</button>
    <button class="btn sm ghost" data-act="edit" data-id="${m.id}" title="ערוך">${icons.edit}</button>
    <button class="btn sm ghost" data-act="delete" data-id="${m.id}" title="מחק" style="color:var(--danger)">${icons.trash}</button>`;
}

function tableHtml(rows) {
  return `<div class="panel"><div class="table-wrap"><table>
    <thead><tr>
      <th>שיש</th><th>קטגוריה</th><th>צבע</th><th>עובי</th><th>מיקום</th>
      <th>כמות</th><th>מחיר מכירה</th><th>סטטוס</th><th>פעולות</th>
    </tr></thead>
    <tbody>
      ${rows.map((m) => `
        <tr data-row="${m.id}" style="cursor:pointer">
          <td>
            <div class="row-flex">
              <span class="thumb">${m.image ? `<img src="${escapeHtml(m.image)}" style="width:100%;height:100%;object-fit:cover">` : icons.slab}</span>
              <div class="cell-name"><b>${escapeHtml(m.name_he || m.name)}</b><span dir="ltr">${escapeHtml(m.name || '')}</span></div>
            </div>
          </td>
          <td>${escapeHtml(m.category || '—')}</td>
          <td>${escapeHtml(m.color || '—')}</td>
          <td>${escapeHtml(m.thickness || '—')}</td>
          <td>${escapeHtml(m.location || '—')}</td>
          <td><span class="qty-pill">${m.quantity}</span></td>
          <td>${m.selling_price ? money(m.selling_price) : '—'}</td>
          <td>${statusBadge(m.status)}</td>
          <td><div class="actions-cell" onclick="event.stopPropagation()">${rowActions(m)}</div></td>
        </tr>`).join('')}
    </tbody>
  </table></div></div>`;
}

function cardsHtml(rows) {
  return `<div class="card-grid">
    ${rows.map((m) => `
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
            ${m.thickness ? `<span class="chip">${escapeHtml(m.thickness)}</span>` : ''}
            ${m.location ? `<span class="chip">${icons.location} ${escapeHtml(m.location)}</span>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">
            <span class="qty-pill">${m.quantity} לוחות</span>
            <span class="price">${m.selling_price ? money(m.selling_price) : ''}</span>
          </div>
        </div>
        <div class="foot" onclick="event.stopPropagation()">
          ${isAdmin()
            ? `<button class="btn sm success" data-act="sellone" data-id="${m.id}" ${m.quantity <= 0 ? 'disabled' : ''}>${icons.cart}<span>מכור לוח</span></button>
               <button class="btn sm chrome icon-only" data-act="stock" data-id="${m.id}" title="מלאי">${icons.box}</button>
               <button class="btn sm ghost icon-only" data-act="edit" data-id="${m.id}" title="ערוך">${icons.edit}</button>`
            : `<button class="btn sm ghost block" data-act="detail" data-id="${m.id}">${icons.eye}<span>פרטים</span></button>`}
        </div>
      </div>`).join('')}
  </div>`;
}

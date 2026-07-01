import { Sales } from '../api.js';
import { escapeHtml, money, num, formatDate, formatTime, isAdmin, toast, confirmDialog, emptyState } from '../ui.js';
import { icons } from '../icons.js';

export const title = 'מכירות';
export const subtitle = 'היסטוריית כל המכירות';

export async function mount(el) {
  el.innerHTML = `
    <div class="toolbar">
      <div class="search-box">${icons.search}<input type="search" id="q" placeholder="חיפוש לפי שיש, לקוח או טלפון..."></div>
      <div class="filters">
        <input type="date" id="from" title="מתאריך">
        <input type="date" id="to" title="עד תאריך">
        <button class="btn ghost sm" id="clear">נקה</button>
      </div>
    </div>
    <div id="summary" style="margin-bottom:16px"></div>
    <div id="sales-area"></div>
  `;
  const area = el.querySelector('#sales-area');
  const summary = el.querySelector('#summary');

  const load = async () => {
    area.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    const params = {
      q: el.querySelector('#q').value,
      from: el.querySelector('#from').value,
      to: el.querySelector('#to').value
    };
    let rows;
    try { rows = await Sales.list(params); }
    catch (e) { area.innerHTML = emptyState(icons.alert, 'שגיאה', e.message); return; }

    const totalQty = rows.reduce((s, r) => s + r.quantity_sold, 0);
    const totalRev = rows.reduce((s, r) => s + r.total_price, 0);
    summary.innerHTML = rows.length ? `
      <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">
        <div class="stat accent-ok"><div class="stat-ico">${icons.sales}</div><div class="stat-val">${num(rows.length)}</div><div class="stat-label">עסקאות</div></div>
        <div class="stat"><div class="stat-ico">${icons.cart}</div><div class="stat-val">${num(totalQty)}</div><div class="stat-label">לוחות שנמכרו</div></div>
        <div class="stat accent-gold"><div class="stat-ico">${icons.coins}</div><div class="stat-val">${money(totalRev)}</div><div class="stat-label">סה"כ הכנסות</div></div>
      </div>` : '';

    if (!rows.length) { area.innerHTML = emptyState(icons.sales, 'אין מכירות', 'לא נמצאו מכירות בטווח שנבחר'); return; }

    area.innerHTML = `<div class="panel"><div class="table-wrap"><table>
      <thead><tr>
        <th>סוג שיש</th><th>כמות</th><th>תאריך</th><th>שעה</th>
        <th>מחיר יח'</th><th>סה"כ</th><th>לקוח</th><th>טלפון</th><th>הערות</th>
        ${isAdmin() ? '<th></th>' : ''}
      </tr></thead>
      <tbody>
        ${rows.map((s) => `
          <tr>
            <td><b>${escapeHtml(s.marble_name_he || s.marble_name || '—')}</b></td>
            <td><span class="qty-pill">${s.quantity_sold}</span></td>
            <td>${formatDate(s.created_at)}</td>
            <td>${formatTime(s.created_at)}</td>
            <td>${money(s.unit_price)}</td>
            <td><b>${money(s.total_price)}</b></td>
            <td>${escapeHtml(s.customer_name || '—')}</td>
            <td dir="ltr" style="text-align:right">${escapeHtml(s.customer_phone || '—')}</td>
            <td style="max-width:200px;color:var(--ink-soft)">${escapeHtml(s.notes || '')}</td>
            ${isAdmin() ? `<td><button class="btn sm ghost" data-del="${s.id}" title="מחק רשומה" style="color:var(--danger)">${icons.trash}</button></td>` : ''}
          </tr>`).join('')}
      </tbody>
    </table></div></div>`;

    area.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'מחיקת רשומת מכירה',
        message: 'מחיקת הרשומה לא תחזיר את הלוח למלאי. להמשיך?',
        confirmText: 'מחק', danger: true
      });
      if (!ok) return;
      try { await Sales.remove(b.dataset.del); toast('הרשומה נמחקה'); load(); }
      catch (e) { toast(e.message, 'err'); }
    }));
  };

  let t;
  el.querySelector('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); });
  el.querySelector('#from').addEventListener('change', load);
  el.querySelector('#to').addEventListener('change', load);
  el.querySelector('#clear').addEventListener('click', () => {
    el.querySelector('#q').value = ''; el.querySelector('#from').value = ''; el.querySelector('#to').value = '';
    load();
  });
  await load();
}

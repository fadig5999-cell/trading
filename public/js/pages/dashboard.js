import { Dashboard } from '../api.js';
import { money, num, escapeHtml, statusBadge, formatDateTime, emptyState } from '../ui.js';
import { icons } from '../icons.js';
import { openDetailModal } from '../components/detailModal.js';

export const title = 'לוח בקרה';
export const subtitle = 'סקירה כללית של המלאי והמכירות';

export async function mount(el, ctx) {
  const d = await Dashboard.summary();

  const stat = (icon, val, label, accent = '') => `
    <div class="stat ${accent}">
      <div class="stat-ico">${icon}</div>
      <div class="stat-val">${val}</div>
      <div class="stat-label">${label}</div>
    </div>`;

  el.innerHTML = `
    <div class="stats">
      ${stat(icons.layers, num(d.totalTypes), 'סוגי שיש')}
      ${stat(icons.box, num(d.totalSlabs), 'סה"כ לוחות במלאי')}
      ${stat(icons.alert, num(d.lowStockCount), 'פריטים במלאי נמוך', 'accent-warn')}
      ${stat(icons.ban, num(d.soldOutCount), 'פריטים שאזלו', 'accent-danger')}
      ${stat(icons.cart, num(d.soldToday), 'לוחות שנמכרו היום', 'accent-ok')}
      ${stat(icons.calendar, num(d.soldMonth), 'לוחות שנמכרו החודש', 'accent-ok')}
      ${stat(icons.coins, money(d.inventoryValue), 'שווי המלאי (מחיר מכירה)', 'accent-gold')}
      ${stat(icons.chart, money(d.revenueMonth), 'הכנסות החודש', 'accent-gold')}
    </div>

    <div class="two-col" style="margin-top:22px">
      <div class="panel">
        <div class="panel-head">${icons.alert}<h3>התראות מלאי נמוך / אזל</h3></div>
        <div class="panel-body" id="low-list"></div>
      </div>
      <div class="panel">
        <div class="panel-head">${icons.sales}<h3>מכירות אחרונות</h3></div>
        <div class="panel-body" id="recent-sales"></div>
      </div>
    </div>
  `;

  // Low stock list
  const lowEl = el.querySelector('#low-list');
  if (!d.lowStockItems.length) {
    lowEl.innerHTML = emptyState(icons.check, 'הכל תקין', 'אין פריטים במלאי נמוך');
  } else {
    lowEl.className = 'panel-body mini-list';
    lowEl.innerHTML = d.lowStockItems.map((m) => `
      <div class="mini-row" data-id="${m.id}" style="cursor:pointer">
        <span class="thumb">${m.image ? `<img src="${escapeHtml(m.image)}" style="width:100%;height:100%;object-fit:cover">` : icons.slab}</span>
        <div class="who">
          <b>${escapeHtml(m.name_he || m.name)}</b>
          <span>${escapeHtml(m.location || 'ללא מיקום')}</span>
        </div>
        <span class="spacer"></span>
        <span class="qty-pill">${m.quantity}</span>
        ${statusBadge(m.status)}
      </div>`).join('');
    lowEl.querySelectorAll('.mini-row').forEach((r) =>
      r.addEventListener('click', async () => {
        const m = d.lowStockItems.find((x) => x.id == r.dataset.id);
        openDetailModal(m, () => ctx.navigate('dashboard'));
      }));
  }

  // Recent sales
  const salesEl = el.querySelector('#recent-sales');
  if (!d.recentSales.length) {
    salesEl.innerHTML = emptyState(icons.sales, 'אין מכירות עדיין', 'מכירות שתבצע יופיעו כאן');
  } else {
    salesEl.className = 'panel-body mini-list';
    salesEl.innerHTML = d.recentSales.map((s) => `
      <div class="mini-row">
        <span class="thumb" style="background:var(--ok-bg);color:var(--ok)">${icons.cart}</span>
        <div class="who">
          <b>${escapeHtml(s.marble_name_he || s.marble_name)}</b>
          <span>${formatDateTime(s.created_at)}${s.customer_name ? ' · ' + escapeHtml(s.customer_name) : ''}</span>
        </div>
        <span class="spacer"></span>
        <div style="text-align:left">
          <b>${money(s.total_price)}</b>
          <div style="font-size:12px;color:var(--ink-faint)">${s.quantity_sold} לוחות</div>
        </div>
      </div>`).join('');
  }
}

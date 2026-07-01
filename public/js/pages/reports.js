import { Dashboard } from '../api.js';
import { escapeHtml, money, num, statusBadge, emptyState } from '../ui.js';
import { icons } from '../icons.js';

export const title = 'דוחות';
export const subtitle = 'ניתוח מכירות ומלאי';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1] || m} ${y}`;
}

export async function mount(el) {
  const r = await Dashboard.reports();

  const stat = (icon, val, label, accent = '') =>
    `<div class="stat ${accent}"><div class="stat-ico">${icon}</div><div class="stat-val">${val}</div><div class="stat-label">${label}</div></div>`;

  el.innerHTML = `
    <div class="stats">
      ${stat(icons.coins, money(r.stockValue), 'שווי מלאי (מחיר מכירה)', 'accent-gold')}
      ${stat(icons.box, money(r.stockCost), 'עלות המלאי')}
      ${stat(icons.chart, money(r.potentialProfit), 'רווח פוטנציאלי', 'accent-ok')}
      ${stat(icons.cart, num(r.totalSold), 'סה"כ לוחות שנמכרו')}
      ${stat(icons.trophy, money(r.totalRevenue), 'סה"כ הכנסות', 'accent-gold')}
    </div>

    <div class="two-col" style="margin-top:22px">
      <div class="panel">
        <div class="panel-head">${icons.trophy}<h3>השיש הנמכר ביותר</h3></div>
        <div class="panel-body" id="top"></div>
      </div>
      <div class="panel">
        <div class="panel-head">${icons.calendar}<h3>מכירות חודשיות</h3></div>
        <div class="panel-body" id="monthly"></div>
      </div>
    </div>

    <div class="two-col" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head">${icons.alert}<h3>פריטים במלאי נמוך / אזל</h3></div>
        <div class="panel-body" id="low"></div>
      </div>
      <div class="panel">
        <div class="panel-head">${icons.layers}<h3>מלאי לפי קטגוריה</h3></div>
        <div class="panel-body" id="cat"></div>
      </div>
    </div>
  `;

  // Top selling
  const topEl = el.querySelector('#top');
  if (!r.topSelling.length) topEl.innerHTML = emptyState(icons.trophy, 'אין נתוני מכירות');
  else {
    const max = Math.max(...r.topSelling.map((t) => t.total_qty));
    topEl.className = 'panel-body mini-list';
    topEl.innerHTML = r.topSelling.map((t, i) => `
      <div class="mini-row">
        <span class="avatar" style="width:30px;height:30px;font-size:13px">${i + 1}</span>
        <div class="who" style="flex:1">
          <b>${escapeHtml(t.marble_name_he || t.marble_name)}</b>
          <div class="bar" style="margin-top:5px"><span style="width:${Math.round((t.total_qty / max) * 100)}%"></span></div>
        </div>
        <div style="text-align:left"><b>${num(t.total_qty)}</b><div style="font-size:12px;color:var(--ink-faint)">${money(t.total_revenue)}</div></div>
      </div>`).join('');
  }

  // Monthly
  const monEl = el.querySelector('#monthly');
  if (!r.monthlySales.length) monEl.innerHTML = emptyState(icons.calendar, 'אין נתונים');
  else {
    const max = Math.max(...r.monthlySales.map((m) => m.revenue || 0), 1);
    monEl.className = 'panel-body mini-list';
    monEl.innerHTML = r.monthlySales.map((m) => `
      <div class="mini-row">
        <div class="who" style="flex:1">
          <b>${monthLabel(m.month)}</b>
          <div class="bar" style="margin-top:5px"><span style="width:${Math.round((m.revenue / max) * 100)}%"></span></div>
        </div>
        <div style="text-align:left"><b>${money(m.revenue)}</b><div style="font-size:12px;color:var(--ink-faint)">${num(m.qty)} לוחות</div></div>
      </div>`).join('');
  }

  // Low stock
  const lowEl = el.querySelector('#low');
  if (!r.lowStockList.length) lowEl.innerHTML = emptyState(icons.check, 'הכל תקין', 'אין פריטים במלאי נמוך');
  else {
    lowEl.className = 'panel-body mini-list';
    lowEl.innerHTML = r.lowStockList.map((m) => `
      <div class="mini-row">
        <span class="thumb">${m.image ? `<img src="${escapeHtml(m.image)}" style="width:100%;height:100%;object-fit:cover">` : icons.slab}</span>
        <div class="who"><b>${escapeHtml(m.name_he || m.name)}</b><span>${escapeHtml(m.location || '')}</span></div>
        <span class="spacer"></span>
        <span class="qty-pill">${m.quantity}</span>
        ${statusBadge(m.status)}
      </div>`).join('');
  }

  // By category
  const catEl = el.querySelector('#cat');
  if (!r.byCategory.length) catEl.innerHTML = emptyState(icons.layers, 'אין נתונים');
  else {
    catEl.innerHTML = r.byCategory.map((c) => `
      <div class="kv">
        <span>${escapeHtml(c.category)} · ${num(c.types)} סוגים · ${num(c.slabs)} לוחות</span>
        <b>${money(c.value)}</b>
      </div>`).join('');
  }
}

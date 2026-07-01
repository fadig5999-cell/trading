import { openModal, escapeHtml, money, statusBadge, formatDateTime, isAdmin, h } from '../ui.js';
import { icons } from '../icons.js';
import { openSellModal } from './sellModal.js';
import { openStockModal } from './stockModal.js';
import { openMarbleForm } from './marbleForm.js';

export function openDetailModal(marble, onChanged) {
  const row = (label, value, icon) => value
    ? `<div class="kv"><span>${icon ? icon + ' ' : ''}${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`
    : '';

  const body = h(`
    <div>
      <div class="detail-img ${marble.image ? '' : 'detail-ph'}">
        ${marble.image ? `<img src="${escapeHtml(marble.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm)">` : icons.image}
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin:16px 0 4px">
        <h3 style="font-size:20px">${escapeHtml(marble.name_he || marble.name)}</h3>
        ${statusBadge(marble.status)}
      </div>
      ${marble.name ? `<div style="color:var(--ink-faint);direction:ltr;text-align:right;margin-bottom:12px">${escapeHtml(marble.name)}</div>` : ''}

      <div style="margin-top:8px">
        <div class="kv"><span>כמות במלאי</span><b style="font-size:17px">${marble.quantity} לוחות</b></div>
        ${row('קטגוריה', marble.category)}
        ${row('צבע', marble.color)}
        ${row('עובי', marble.thickness)}
        ${row('גודל', marble.size)}
        ${row('מיקום', marble.location)}
        ${marble.selling_price ? `<div class="kv"><span>מחיר מכירה</span><b>${money(marble.selling_price)}</b></div>` : ''}
        ${marble.cost_price ? `<div class="kv"><span>מחיר עלות</span><b>${money(marble.cost_price)}</b></div>` : ''}
        ${marble.notes ? `<div class="kv"><span>הערות</span><b style="font-weight:500;max-width:60%;text-align:left">${escapeHtml(marble.notes)}</b></div>` : ''}
        <div class="kv"><span>עודכן לאחרונה</span><b style="font-weight:500">${formatDateTime(marble.updated_at)}</b></div>
      </div>
    </div>
  `);

  const footer = isAdmin()
    ? h(`<div style="display:flex;gap:8px;flex-wrap:wrap;width:100%">
        <button class="btn success" data-a="sell" ${marble.quantity <= 0 ? 'disabled' : ''}>${icons.cart}<span>מכור לוח</span></button>
        <button class="btn chrome" data-a="stock">${icons.box}<span>מלאי</span></button>
        <button class="btn" data-a="edit">${icons.edit}<span>ערוך</span></button>
      </div>`)
    : h(`<div style="width:100%;color:var(--ink-faint);font-size:13px">צפייה בלבד</div>`);

  const { close } = openModal({ title: 'פרטי סוג שיש', icon: icons.slab, body, footer });

  if (isAdmin()) {
    footer.querySelector('[data-a=sell]').addEventListener('click', () => {
      close(); openSellModal(marble, onChanged);
    });
    footer.querySelector('[data-a=stock]').addEventListener('click', () => {
      close(); openStockModal(marble, onChanged);
    });
    footer.querySelector('[data-a=edit]').addEventListener('click', () => {
      close(); openMarbleForm(marble, onChanged);
    });
  }
}

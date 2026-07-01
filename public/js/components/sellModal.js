import { Marbles } from '../api.js';
import { openModal, toast, escapeHtml, money, h } from '../ui.js';
import { icons } from '../icons.js';

// Sell one or more slabs. If quantity is fixed to 1 we still show the form so
// the owner can optionally attach a customer / price.
export function openSellModal(marble, onSold) {
  const maxQty = marble.quantity;
  if (maxQty <= 0) {
    toast('אין מלאי זמין למכירה', 'err');
    return;
  }

  const body = h(`
    <form id="sell-form">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;padding:12px;background:var(--surface-2);border-radius:12px;border:1px solid var(--line)">
        <span class="thumb" style="width:52px;height:52px">
          ${marble.image ? `<img src="${escapeHtml(marble.image)}" style="width:100%;height:100%;object-fit:cover">` : icons.slab}
        </span>
        <div>
          <b style="font-size:15px">${escapeHtml(marble.name_he || marble.name)}</b>
          <div style="color:var(--ink-faint);font-size:13px">במלאי: ${maxQty} לוחות · מחיר ליחידה ${money(marble.selling_price)}</div>
        </div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>כמות למכירה</label>
          <input type="number" name="quantity" min="1" max="${maxQty}" value="1" step="1">
        </div>
        <div class="field">
          <label>מחיר ליחידה (₪)</label>
          <input type="number" name="unit_price" min="0" step="1" value="${marble.selling_price ?? 0}">
        </div>
        <div class="field">
          <label>שם לקוח (אופציונלי)</label>
          <input type="text" name="customer_name" placeholder="שם הלקוח">
        </div>
        <div class="field">
          <label>טלפון (אופציונלי)</label>
          <input type="tel" name="customer_phone" placeholder="050-0000000" dir="ltr">
        </div>
        <div class="field full">
          <label>הערות (אופציונלי)</label>
          <textarea name="notes" placeholder="הערות למכירה..."></textarea>
        </div>
      </div>
      <div class="kv" style="font-size:16px;margin-top:6px">
        <span>סה"כ לתשלום</span><b id="sell-total">${money(marble.selling_price)}</b>
      </div>
    </form>
  `);

  const footer = h(`<div style="display:flex;gap:10px;width:100%">
    <button class="btn success" id="confirm-sell">${icons.cart}<span>אשר מכירה</span></button>
    <button class="btn ghost" data-close>ביטול</button>
  </div>`);

  const { close } = openModal({ title: 'מכירת לוח שיש', icon: icons.cart, body, footer });

  const qtyEl = body.querySelector('[name=quantity]');
  const priceEl = body.querySelector('[name=unit_price]');
  const totalEl = body.querySelector('#sell-total');
  const recalc = () => {
    const q = Math.max(1, Math.min(maxQty, Number(qtyEl.value) || 1));
    totalEl.textContent = money((Number(priceEl.value) || 0) * q);
  };
  qtyEl.addEventListener('input', recalc);
  priceEl.addEventListener('input', recalc);

  const btn = footer.querySelector('#confirm-sell');
  btn.addEventListener('click', async () => {
    const fd = new FormData(body);
    const payload = Object.fromEntries(fd.entries());
    payload.quantity = Math.max(1, Math.min(maxQty, Number(payload.quantity) || 1));
    btn.disabled = true;
    try {
      const res = await Marbles.sell(marble.id, payload);
      toast(`נמכרו ${payload.quantity} לוחות · נותרו ${res.marble.quantity} במלאי`);
      close();
      onSold && onSold(res);
    } catch (e) {
      toast(e.message, 'err');
      btn.disabled = false;
    }
  });
}

// Quick "sell one" — a single slab, no dialog friction, with confirmation toast.
export async function quickSellOne(marble, onSold) {
  if (marble.quantity <= 0) { toast('המוצר אזל מהמלאי', 'err'); return; }
  try {
    const res = await Marbles.sell(marble.id, { quantity: 1 });
    toast(`נמכר לוח אחד · נותרו ${res.marble.quantity} במלאי`);
    onSold && onSold(res);
  } catch (e) {
    toast(e.message, 'err');
  }
}

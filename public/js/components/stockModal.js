import { Marbles } from '../api.js';
import { openModal, toast, escapeHtml, h } from '../ui.js';
import { icons } from '../icons.js';

// Manage stock: add / remove / set exact quantity.
export function openStockModal(marble, onSaved) {
  const body = h(`
    <div>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:18px;padding:12px;background:var(--surface-2);border-radius:12px;border:1px solid var(--line)">
        <span class="thumb" style="width:52px;height:52px">
          ${marble.image ? `<img src="${escapeHtml(marble.image)}" style="width:100%;height:100%;object-fit:cover">` : icons.slab}
        </span>
        <div>
          <b style="font-size:15px">${escapeHtml(marble.name_he || marble.name)}</b>
          <div style="color:var(--ink-faint);font-size:13px">כמות נוכחית במלאי: <b id="cur-qty" style="color:var(--ink)">${marble.quantity}</b> לוחות</div>
        </div>
      </div>

      <div class="field">
        <label>כמות לפעולה</label>
        <input type="number" id="amount" min="0" step="1" value="1">
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn success" data-act="add">${icons.plus}<span>הוסף מלאי</span></button>
        <button class="btn danger" data-act="remove">${icons.minus}<span>הפחת מלאי</span></button>
      </div>

      <div class="section-title"><h3>עדכון ידני</h3><span class="line"></span></div>
      <div class="field">
        <label>קבע כמות מדויקת</label>
        <div style="display:flex;gap:10px">
          <input type="number" id="set-amount" min="0" step="1" value="${marble.quantity}">
          <button class="btn chrome" data-act="set" style="white-space:nowrap">${icons.check}<span>עדכן כמות</span></button>
        </div>
      </div>
    </div>
  `);

  const { close } = openModal({ title: 'ניהול מלאי', icon: icons.box, body });

  const curQty = body.querySelector('#cur-qty');
  const doAction = async (action, amount) => {
    try {
      const updated = await Marbles.stock(marble.id, action, amount);
      marble.quantity = updated.quantity;
      curQty.textContent = updated.quantity;
      body.querySelector('#set-amount').value = updated.quantity;
      const label = action === 'add' ? 'המלאי עודכן (הוספה)' : action === 'remove' ? 'המלאי עודכן (הפחתה)' : 'הכמות עודכנה';
      toast(`${label} · ${updated.quantity} לוחות`);
      onSaved && onSaved(updated);
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  body.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'set') {
        doAction('set', Number(body.querySelector('#set-amount').value) || 0);
      } else {
        const amt = Number(body.querySelector('#amount').value) || 0;
        if (amt <= 0) { toast('יש להזין כמות גדולה מאפס', 'err'); return; }
        doAction(act, amt);
      }
    });
  });
}

import { Settings, Users } from '../api.js';
import { store, escapeHtml, toast, confirmDialog, isAdmin, openModal, initials, h } from '../ui.js';
import { icons } from '../icons.js';

export const title = 'הגדרות';
export const subtitle = 'הגדרות עסק וניהול משתמשים';

export async function mount(el) {
  const s = await Settings.get();

  el.innerHTML = `
    <div class="two-col">
      <div class="panel">
        <div class="panel-head">${icons.settings}<h3>הגדרות עסק</h3></div>
        <div class="panel-body">
          <div class="field">
            <label>שם העסק</label>
            <input type="text" id="business_name" value="${escapeHtml(s.business_name || '')}">
          </div>
          <div class="form-grid">
            <div class="field">
              <label>סמל מטבע</label>
              <input type="text" id="currency" value="${escapeHtml(s.currency || '₪')}" maxlength="3">
            </div>
            <div class="field">
              <label>סף מלאי נמוך</label>
              <input type="number" id="low_stock_threshold" min="1" step="1" value="${escapeHtml(s.low_stock_threshold || '3')}">
            </div>
          </div>
          <p style="font-size:12.5px;color:var(--ink-faint);margin:0 0 14px">
            כמות מתחת לסף זה (ומעל 0) תסומן כ"מלאי נמוך".
          </p>
          <button class="btn primary" id="save-settings">${icons.check}<span>שמור הגדרות</span></button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">${icons.user}<h3>ניהול משתמשים</h3><span class="spacer"></span>
          <button class="btn primary sm" id="add-user">${icons.plus}<span>משתמש חדש</span></button>
        </div>
        <div class="panel-body mini-list" id="users"></div>
      </div>
    </div>
  `;

  el.querySelector('#save-settings').addEventListener('click', async () => {
    try {
      const updated = await Settings.update({
        business_name: el.querySelector('#business_name').value,
        currency: el.querySelector('#currency').value,
        low_stock_threshold: el.querySelector('#low_stock_threshold').value
      });
      store.settings = updated;
      const biz = document.getElementById('brand-biz');
      if (biz) biz.textContent = updated.business_name;
      toast('ההגדרות נשמרו');
    } catch (e) { toast(e.message, 'err'); }
  });

  const usersEl = el.querySelector('#users');
  const loadUsers = async () => {
    const users = await Users.list();
    usersEl.innerHTML = users.map((u) => `
      <div class="mini-row">
        <div class="avatar">${initials(u.name || u.username)}</div>
        <div class="who">
          <b>${escapeHtml(u.name || u.username)}</b>
          <span>${escapeHtml(u.username)} · ${u.role === 'admin' ? 'מנהל (עריכה)' : 'צופה (קריאה בלבד)'}</span>
        </div>
        <span class="spacer"></span>
        <button class="btn sm ghost" data-edit="${u.id}" title="ערוך">${icons.edit}</button>
        ${u.id !== store.user.id ? `<button class="btn sm ghost" data-del="${u.id}" title="מחק" style="color:var(--danger)">${icons.trash}</button>` : ''}
      </div>`).join('');

    usersEl.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
      const u = users.find((x) => x.id == b.dataset.edit);
      openUserForm(u, loadUsers);
    }));
    usersEl.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'מחיקת משתמש', message: 'למחוק את המשתמש?', confirmText: 'מחק', danger: true });
      if (!ok) return;
      try { await Users.remove(b.dataset.del); toast('המשתמש נמחק'); loadUsers(); }
      catch (e) { toast(e.message, 'err'); }
    }));
  };

  el.querySelector('#add-user').addEventListener('click', () => openUserForm(null, loadUsers));
  await loadUsers();
}

function openUserForm(user, onSaved) {
  const isEdit = !!user;
  const body = h(`
    <form id="user-form">
      <div class="field">
        <label>שם מלא</label>
        <input type="text" name="name" value="${escapeHtml(user?.name || '')}" placeholder="שם המשתמש">
      </div>
      <div class="field">
        <label>שם משתמש (לכניסה)</label>
        <input type="text" name="username" value="${escapeHtml(user?.username || '')}" ${isEdit ? 'disabled' : ''} dir="ltr" placeholder="username">
      </div>
      <div class="field">
        <label>סיסמה ${isEdit ? '(השאר ריק כדי לא לשנות)' : ''}</label>
        <input type="password" name="password" placeholder="••••••••">
      </div>
      <div class="field">
        <label>הרשאה</label>
        <select name="role">
          <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>מנהל — הוספה, עריכה, מחיקה, מכירה</option>
          <option value="viewer" ${!user || user?.role === 'viewer' ? 'selected' : ''}>צופה — צפייה בלבד</option>
        </select>
      </div>
    </form>
  `);
  const footer = h(`<div style="display:flex;gap:10px;width:100%">
    <button class="btn primary" id="save-user">${icons.check}<span>שמור</span></button>
    <button class="btn ghost" data-close>ביטול</button>
  </div>`);
  const { close } = openModal({ title: isEdit ? 'עריכת משתמש' : 'משתמש חדש', icon: icons.user, body, footer, narrow: true });

  footer.querySelector('#save-user').addEventListener('click', async () => {
    const data = Object.fromEntries(new FormData(body).entries());
    try {
      if (isEdit) await Users.update(user.id, { name: data.name, role: data.role, password: data.password || undefined });
      else {
        if (!data.username || !data.password) { toast('יש להזין שם משתמש וסיסמה', 'err'); return; }
        await Users.create(data);
      }
      toast('נשמר בהצלחה'); close(); onSaved && onSaved();
    } catch (e) { toast(e.message, 'err'); }
  });
}

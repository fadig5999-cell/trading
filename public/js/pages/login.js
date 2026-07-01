import { Auth } from '../api.js';
import { icons } from '../icons.js';
import { toast } from '../ui.js';

export function renderLogin(onLoggedIn) {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="auth-logo">${icons.slab}</div>
        <h1>ניהול מלאי שיש</h1>
        <p class="sub">התחברות למערכת · אזור מנהלים</p>
        <form id="login-form">
          <div class="field">
            <label>שם משתמש</label>
            <input type="text" name="username" autocomplete="username" placeholder="admin" required>
          </div>
          <div class="field">
            <label>סיסמה</label>
            <input type="password" name="password" autocomplete="current-password" placeholder="••••••••" required>
          </div>
          <button class="btn primary block" id="login-btn" type="submit" style="margin-top:6px">
            ${icons.logout}<span>התחברות</span>
          </button>
        </form>
        <div class="auth-hint">
          לבדיקה: מנהל <b>admin / admin123</b> · צופה <b>viewer / viewer123</b>
        </div>
      </div>
    </div>
  `;

  const form = root.querySelector('#login-form');
  const btn = root.querySelector('#login-btn');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const username = fd.get('username').trim();
    const password = fd.get('password');
    if (!username || !password) { toast('יש להזין שם משתמש וסיסמה', 'err'); return; }
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div>';
    try {
      const res = await Auth.login(username, password);
      if (res.token) localStorage.setItem('token', res.token);
      toast(`ברוך הבא, ${res.user.name || res.user.username}`);
      onLoggedIn(res.user);
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false;
      btn.innerHTML = `${icons.logout}<span>התחברות</span>`;
    }
  });
}

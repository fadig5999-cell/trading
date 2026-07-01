import { Auth, Settings, Dashboard } from './api.js';
import { store, initials, toast, h } from './ui.js';
import { icons } from './icons.js';
import { renderLogin } from './pages/login.js';
import * as dashboard from './pages/dashboard.js';
import * as inventory from './pages/inventory.js';
import * as gallery from './pages/gallery.js';
import * as sales from './pages/sales.js';
import * as reports from './pages/reports.js';
import * as settings from './pages/settings.js';

const NAV = [
  { path: 'dashboard', label: 'לוח בקרה', icon: icons.dashboard, page: dashboard },
  { path: 'inventory', label: 'מלאי', icon: icons.inventory, page: inventory, badge: 'lowStock' },
  { path: 'gallery', label: 'גלריה', icon: icons.gallery, page: gallery },
  { path: 'sales', label: 'מכירות', icon: icons.sales, page: sales },
  { path: 'reports', label: 'דוחות', icon: icons.reports, page: reports },
  { path: 'settings', label: 'הגדרות', icon: icons.settings, page: settings, adminOnly: true }
];

const root = document.getElementById('root');
let lowStockCount = 0;

function currentPath() {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
  return hash || 'dashboard';
}

async function boot() {
  try {
    const me = await Auth.me();
    store.user = me.user;
    try { store.settings = await Settings.get(); } catch { /* keep defaults */ }
    renderShell();
  } catch {
    renderLogin(onLoggedIn);
  }
}

function onLoggedIn(user) {
  store.user = user;
  Settings.get().then((s) => { store.settings = s; renderShell(); }).catch(() => renderShell());
}

function renderShell() {
  const items = NAV.filter((n) => !n.adminOnly || store.user.role === 'admin');
  root.innerHTML = `
    <div class="app">
      <div class="backdrop hidden" id="backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">${icons.slab}</div>
          <div class="brand-text">
            <b>ניהול מלאי שיש</b>
            <span id="brand-biz">${escapeText(store.settings.business_name || 'אולם תצוגת שיש')}</span>
          </div>
        </div>
        <nav class="nav" id="nav">
          ${items.map((n) => `
            <a href="#/${n.path}" data-path="${n.path}">
              ${n.icon}<span>${n.label}</span>
              ${n.badge ? `<span class="badge hidden" data-badge="${n.badge}"></span>` : ''}
            </a>`).join('')}
        </nav>
        <div class="sidebar-foot">
          <div class="avatar">${initials(store.user.name || store.user.username)}</div>
          <div class="who">
            <b>${escapeText(store.user.name || store.user.username)}</b>
            <span>${store.user.role === 'admin' ? 'מנהל' : 'צופה'}</span>
          </div>
          <span class="spacer"></span>
          <button class="icon-btn" id="logout" title="התנתק">${icons.logout}</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn hamburger" id="hamburger" style="background:var(--surface-2);color:var(--ink)">${icons.menu}</button>
          <div>
            <h2 id="page-title">לוח בקרה</h2>
            <div class="page-sub" id="page-sub"></div>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>
    </div>
  `;

  document.getElementById('logout').addEventListener('click', async () => {
    try { await Auth.logout(); } catch {}
    localStorage.removeItem('token');
    store.user = null;
    location.hash = '';
    renderLogin(onLoggedIn);
  });

  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('backdrop');
  const closeNav = () => { sidebar.classList.remove('open'); backdrop.classList.add('hidden'); };
  document.getElementById('hamburger').addEventListener('click', () => {
    sidebar.classList.add('open'); backdrop.classList.remove('hidden');
  });
  backdrop.addEventListener('click', closeNav);
  document.getElementById('nav').addEventListener('click', (e) => {
    if (e.target.closest('a')) closeNav();
  });

  refreshLowStockBadge();
  route();
}

function escapeText(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

export async function refreshLowStockBadge() {
  try {
    const d = await Dashboard.summary();
    lowStockCount = (d.lowStockCount || 0) + (d.soldOutCount || 0);
    document.querySelectorAll('[data-badge=lowStock]').forEach((b) => {
      if (lowStockCount > 0) { b.textContent = lowStockCount; b.classList.remove('hidden'); }
      else b.classList.add('hidden');
    });
  } catch { /* ignore */ }
}

// Context passed to pages
const ctx = {
  navigate: (path) => { location.hash = '#/' + path; },
  refreshBadge: refreshLowStockBadge
};

async function route() {
  if (!store.user) { renderLogin(onLoggedIn); return; }
  const path = currentPath();
  const item = NAV.find((n) => n.path === path) || NAV[0];

  // Guard admin-only pages
  if (item.adminOnly && store.user.role !== 'admin') {
    ctx.navigate('dashboard');
    return;
  }

  // Highlight nav
  document.querySelectorAll('#nav a').forEach((a) =>
    a.classList.toggle('active', a.dataset.path === item.path));

  const content = document.getElementById('content');
  const title = document.getElementById('page-title');
  const sub = document.getElementById('page-sub');
  if (!content) { renderShell(); return; }
  title.textContent = item.page.title || item.label;
  sub.textContent = item.page.subtitle || '';
  content.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  try {
    await item.page.mount(content, ctx);
  } catch (e) {
    content.innerHTML = `<div class="empty">${icons.alert}<h3>שגיאה בטעינת העמוד</h3><p>${escapeText(e.message)}</p></div>`;
  }
}

window.addEventListener('hashchange', route);
boot();

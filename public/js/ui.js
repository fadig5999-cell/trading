import { icons } from './icons.js';

// Global-ish UI state shared across pages.
export const store = {
  user: null,
  settings: { business_name: 'אולם תצוגת שיש', currency: '₪', low_stock_threshold: '3' }
};

export const isAdmin = () => store.user && store.user.role === 'admin';

// ---------- Formatting ----------
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function money(n) {
  const cur = store.settings.currency || '₪';
  const val = Number(n || 0);
  return cur + val.toLocaleString('he-IL', { maximumFractionDigits: 0 });
}

export function num(n) {
  return Number(n || 0).toLocaleString('he-IL');
}

export function formatDateTime(iso) {
  if (!iso) return '';
  // SQLite returns "YYYY-MM-DD HH:MM:SS" (UTC-ish). Treat as local for display.
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('T') ? '' : 'Z'));
  if (isNaN(d)) return iso;
  return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('T') ? '' : 'Z'));
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('T') ? '' : 'Z'));
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export const STATUS = {
  in_stock: { text: 'במלאי', cls: 'st-in_stock' },
  low_stock: { text: 'מלאי נמוך', cls: 'st-low_stock' },
  sold_out: { text: 'אזל מהמלאי', cls: 'st-sold_out' }
};
export function statusBadge(status) {
  const s = STATUS[status] || STATUS.in_stock;
  return `<span class="badge-status ${s.cls}">${s.text}</span>`;
}

// ---------- Toast ----------
export function toast(message, type = 'ok') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ico = type === 'err' ? icons.alert : type === 'ok' ? icons.check : icons.info;
  el.innerHTML = `${ico}<span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

// ---------- Modal ----------
export function openModal({ title, body, footer, narrow = false, icon = icons.slab }) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <span class="thumb" style="width:38px;height:38px">${icon}</span>
        <h3>${escapeHtml(title)}</h3>
        <span class="spacer"></span>
        <button class="icon-btn" data-close style="background:var(--surface-2);color:var(--ink-soft)">${icons.close}</button>
      </div>
      <div class="modal-body"></div>
      ${footer ? '<div class="modal-foot"></div>' : ''}
    </div>`;
  root.appendChild(overlay);
  const modal = overlay.querySelector('.modal');
  const bodyEl = overlay.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);

  const footEl = overlay.querySelector('.modal-foot');
  if (footEl && footer) {
    if (typeof footer === 'string') footEl.innerHTML = footer;
    else footEl.appendChild(footer);
  }

  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));

  return { overlay, modal, bodyEl, footEl, close };
}

export function confirmDialog({ title, message, confirmText = 'אישור', danger = false }) {
  return new Promise((resolve) => {
    const { close } = openModal({
      title,
      narrow: true,
      icon: danger ? icons.alert : icons.info,
      body: `<p style="color:var(--ink-soft);font-size:15px;line-height:1.6">${escapeHtml(message)}</p>`,
      footer: `<button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${escapeHtml(confirmText)}</button>
               <button class="btn ghost" data-close>ביטול</button>`
    });
    document.querySelector('.modal-foot [data-ok]').addEventListener('click', () => { close(); resolve(true); });
    document.querySelectorAll('.modal-overlay [data-close]').forEach((b) =>
      b.addEventListener('click', () => resolve(false)));
  });
}

// ---------- DOM helper ----------
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function loader() {
  return '<div class="loader"><div class="spinner"></div></div>';
}

export function emptyState(icon, title, sub = '') {
  return `<div class="empty">${icon}<h3>${escapeHtml(title)}</h3>${sub ? `<p>${escapeHtml(sub)}</p>` : ''}</div>`;
}

export function initials(name) {
  const clean = (name || '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

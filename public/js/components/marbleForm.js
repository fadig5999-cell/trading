import { Marbles, api } from '../api.js';
import { openModal, toast, escapeHtml, h } from '../ui.js';
import { icons } from '../icons.js';

const CATEGORIES = ['שיש טבעי', 'שיש יוקרתי', 'גרניט', 'אבן טבעית', 'קוורץ', 'אחר'];

export function openMarbleForm(marble, onSaved) {
  const isEdit = !!(marble && marble.id);
  const m = marble || {};
  let imageUrl = m.image || '';

  const catOptions = CATEGORIES.map(
    (c) => `<option value="${escapeHtml(c)}" ${m.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
  ).join('');

  const body = h(`
    <form id="marble-form" novalidate>
      <div class="field">
        <label>תמונת השיש</label>
        <div class="uploader ${imageUrl ? 'has-img' : ''}" id="up">
          ${imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="">`
            : `<span class="up-ico">${icons.upload}</span><div>לחץ להעלאת תמונה<br><small>JPG · PNG · WEBP · עד 8MB</small></div>`}
        </div>
        <input type="file" id="file" accept="image/*" class="hidden">
      </div>

      <div class="form-grid">
        <div class="field">
          <label>שם השיש (עברית) <span class="req">*</span></label>
          <input type="text" name="name_he" value="${escapeHtml(m.name_he || '')}" placeholder="קרארה לבן">
        </div>
        <div class="field">
          <label>שם באנגלית</label>
          <input type="text" name="name" value="${escapeHtml(m.name || '')}" placeholder="Carrara White" dir="ltr">
        </div>
        <div class="field">
          <label>קטגוריה</label>
          <select name="category"><option value="">— בחר —</option>${catOptions}</select>
        </div>
        <div class="field">
          <label>צבע</label>
          <input type="text" name="color" value="${escapeHtml(m.color || '')}" placeholder="לבן">
        </div>
        <div class="field">
          <label>עובי</label>
          <input type="text" name="thickness" value="${escapeHtml(m.thickness || '')}" placeholder='2 ס"מ'>
        </div>
        <div class="field">
          <label>גודל / מידות</label>
          <input type="text" name="size" value="${escapeHtml(m.size || '')}" placeholder="320x160" dir="ltr">
        </div>
        <div class="field">
          <label>כמות במלאי</label>
          <input type="number" name="quantity" min="0" step="1" value="${m.quantity ?? 0}">
        </div>
        <div class="field">
          <label>מיקום באולם / מחסן</label>
          <input type="text" name="location" value="${escapeHtml(m.location || '')}" placeholder='מחסן A - מדף 1'>
        </div>
        <div class="field">
          <label>מחיר עלות (${'₪'})</label>
          <input type="number" name="cost_price" min="0" step="1" value="${m.cost_price ?? 0}">
        </div>
        <div class="field">
          <label>מחיר מכירה (${'₪'})</label>
          <input type="number" name="selling_price" min="0" step="1" value="${m.selling_price ?? 0}">
        </div>
        <div class="field full">
          <label>הערות</label>
          <textarea name="notes" placeholder="פרטים נוספים על סוג השיש...">${escapeHtml(m.notes || '')}</textarea>
        </div>
      </div>
    </form>
  `);

  const footer = h(`<div style="display:flex;gap:10px;width:100%">
    <button class="btn primary" id="save-btn">${icons.check}<span>${isEdit ? 'שמור שינויים' : 'הוסף סוג שיש'}</span></button>
    <button class="btn ghost" data-close>ביטול</button>
  </div>`);

  const { close } = openModal({
    title: isEdit ? 'עריכת סוג שיש' : 'הוספת סוג שיש',
    icon: isEdit ? icons.edit : icons.plus,
    body,
    footer
  });

  // Image upload wiring
  const up = body.querySelector('#up');
  const fileInput = body.querySelector('#file');
  up.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    up.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';
    try {
      imageUrl = await api.uploadImage(file);
      up.classList.add('has-img');
      up.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="">`;
      toast('התמונה הועלתה בהצלחה');
    } catch (e) {
      toast(e.message, 'err');
      up.classList.remove('has-img');
      up.innerHTML = `<span class="up-ico">${icons.upload}</span><div>לחץ להעלאת תמונה</div>`;
    }
  });

  const saveBtn = footer.querySelector('#save-btn');
  saveBtn.addEventListener('click', async () => {
    const fd = new FormData(body);
    const data = Object.fromEntries(fd.entries());
    data.image = imageUrl;
    if (!String(data.name_he).trim() && !String(data.name).trim()) {
      toast('יש להזין שם שיש', 'err');
      return;
    }
    saveBtn.disabled = true;
    try {
      if (isEdit) {
        await Marbles.update(m.id, data);
        toast('סוג השיש עודכן בהצלחה');
      } else {
        await Marbles.create(data);
        toast('סוג השיש נוסף בהצלחה');
      }
      close();
      onSaved && onSaved();
    } catch (e) {
      toast(e.message, 'err');
      saveBtn.disabled = false;
    }
  });
}

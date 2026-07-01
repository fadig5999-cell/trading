// Thin fetch wrapper. Uses the JWT cookie (httpOnly) set on login, and also
// sends a bearer token from localStorage as a fallback.

function authHeader() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request(method, url, body) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { ...authHeader() }
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text }; }
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `שגיאה ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b) => request('POST', u, b),
  put: (u, b) => request('PUT', u, b),
  del: (u) => request('DELETE', u),

  async uploadImage(file) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { ...authHeader() },
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'שגיאה בהעלאת התמונה');
    return data.url;
  }
};

// --- Endpoint helpers ---
export const Auth = {
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me')
};

export const Marbles = {
  list: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return api.get('/api/marbles' + (q ? '?' + q : ''));
  },
  facets: () => api.get('/api/marbles/facets'),
  get: (id) => api.get('/api/marbles/' + id),
  create: (data) => api.post('/api/marbles', data),
  update: (id, data) => api.put('/api/marbles/' + id, data),
  remove: (id) => api.del('/api/marbles/' + id),
  stock: (id, action, amount) => api.post(`/api/marbles/${id}/stock`, { action, amount }),
  sell: (id, payload) => api.post(`/api/marbles/${id}/sell`, payload)
};

export const Sales = {
  list: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return api.get('/api/sales' + (q ? '?' + q : ''));
  },
  remove: (id) => api.del('/api/sales/' + id)
};

export const Dashboard = {
  summary: () => api.get('/api/dashboard'),
  reports: () => api.get('/api/dashboard/reports')
};

export const Users = {
  list: () => api.get('/api/users'),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put('/api/users/' + id, data),
  remove: (id) => api.del('/api/users/' + id)
};

export const Settings = {
  get: () => api.get('/api/settings'),
  update: (data) => api.put('/api/settings', data)
};

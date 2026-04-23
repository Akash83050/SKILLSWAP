const API = 'http://localhost:5000/api';

function getToken() { return localStorage.getItem('ss_token'); }
function getUser() { return JSON.parse(localStorage.getItem('ss_user') || 'null'); }

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const res = await fetch(API + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  auth: {
    register: (body) => apiFetch('/auth/register', { method: 'POST', body }),
    login: (body) => apiFetch('/auth/login', { method: 'POST', body })
  },
  users: {
    me: () => apiFetch('/users/me'),
    update: (body) => apiFetch('/users/me', { method: 'PUT', body }),
    all: (params = '') => apiFetch('/users' + params),
    matches: () => apiFetch('/users/matches'),
    get: (id) => apiFetch(`/users/${id}`),
    rate: (id, rating) => apiFetch(`/users/${id}/rate`, { method: 'POST', body: { rating } }),
    readNotifs: () => apiFetch('/users/me/notifications/read', { method: 'PUT' })
  },
  projects: {
    all: (params = '') => apiFetch('/projects' + params),
    create: (body) => apiFetch('/projects', { method: 'POST', body }),
    get: (id) => apiFetch(`/projects/${id}`),
    join: (id) => apiFetch(`/projects/${id}/join`, { method: 'POST' }),
    update: (id, body) => apiFetch(`/projects/${id}`, { method: 'PUT', body })
  },
  requests: {
    send: (body) => apiFetch('/requests', { method: 'POST', body }),
    received: () => apiFetch('/requests/received'),
    sent: () => apiFetch('/requests/sent'),
    update: (id, status) => apiFetch(`/requests/${id}`, { method: 'PUT', body: { status } })
  },
  messages: {
    conversations: () => apiFetch('/messages/conversations'),
    get: (userId) => apiFetch(`/messages/${userId}`),
    send: (userId, text) => apiFetch(`/messages/${userId}`, { method: 'POST', body: { text } })
  },
  notifications: {
    all: () => apiFetch('/notifications'),
    unreadCount: () => apiFetch('/notifications/unread-count'),
    readAll: () => apiFetch('/notifications/read-all', { method: 'PUT' }),
    readOne: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
    deleteOne: (id) => apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
    clearAll: () => apiFetch('/notifications', { method: 'DELETE' })
  }
};

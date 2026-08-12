const API_BASE = '/api/admin';

async function request(path, options = {}) {
  const headers = options.headers || {};
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function loginAdmin(username, password) {
  const data = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Login failed');
    return payload;
  });
  localStorage.setItem('adminToken', data.token);
  return data;
}

export async function getDashboard() {
  return request('/admin/dashboard');
}

export async function getComplaints() {
  return request('/admin/complaints');
}

export async function getOfficers() {
  return request('/admin/officers');
}

export async function overrideComplaint(complaintId, payload) {
  return request(`/admin/complaints/${encodeURIComponent(complaintId)}/override`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function logoutAdmin() {
  localStorage.removeItem('adminToken');
}

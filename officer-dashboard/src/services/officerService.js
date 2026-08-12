const API_BASE = '/api/officer';

async function request(path, options = {}) {
  const headers = options.headers || {};
  const token = localStorage.getItem('officerToken');
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function loginOfficer(email, password) {
  const data = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Login failed');
    return payload;
  });
  localStorage.setItem('officerToken', data.token);
  localStorage.setItem('officerProfile', JSON.stringify(data.officer));
  return data;
}

export async function getAssignedComplaints(officerId) {
  const data = await request(`/officer/assigned/${encodeURIComponent(officerId)}`);
  return data.complaints || [];
}

export async function getComplaintDetails(complaintId) {
  return request(`/complaints/track/${encodeURIComponent(complaintId)}`);
}

export async function updateComplaintStatus(complaintId, formData) {
  return fetch(`/api/officer/complaint/${encodeURIComponent(complaintId)}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${localStorage.getItem('officerToken') || ''}` },
    body: formData
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Update failed');
    return data;
  });
}

export function getStoredOfficer() {
  try { return JSON.parse(localStorage.getItem('officerProfile') || 'null'); } catch { return null; }
}

export function logoutOfficer() {
  localStorage.removeItem('officerToken');
  localStorage.removeItem('officerProfile');
}

const API_BASE = '/api/officer';

async function request(path, options = {}) {
  const headers = options.headers || {};
  const token = localStorage.getItem('officerToken');
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error === 'complaint_deleted_by_authority'
      ? 'This complaint was deleted by the authority.'
      : data.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

function buildStatusForm(payload, completionFiles) {
  const formData = new FormData();
  formData.append('status', payload.status || '');
  formData.append('remarks', payload.officer_remarks || '');
  formData.append('expected_resolution_date', payload.expected_resolution_date || '');
  completionFiles.forEach((file) => formData.append('images', file));
  return formData;
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

export async function updateComplaintStatus(complaintId, payload, completionFiles = []) {
  const statusPath = `/officer/complaint/${encodeURIComponent(complaintId)}/status`;
  if (completionFiles.length > 0) {
    return request(statusPath, {
      method: 'PUT',
      body: buildStatusForm(payload, completionFiles)
    });
  }

  try {
    return await request(`/officer/complaints/${encodeURIComponent(complaintId)}/override`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (error.status !== 404) throw error;
    return request(statusPath, {
      method: 'PUT',
      body: buildStatusForm(payload, [])
    });
  }
}

export async function requestComplaintDeletion(complaintId, reason) {
  return request(`/officer/complaints/${encodeURIComponent(complaintId)}/delete-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
}

export function getStoredOfficer() {
  try { return JSON.parse(localStorage.getItem('officerProfile') || 'null'); } catch { return null; }
}

export function logoutOfficer() {
  localStorage.removeItem('officerToken');
  localStorage.removeItem('officerProfile');
}

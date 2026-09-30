import { API_BASE_URL } from '../apiConfig.js';

async function api(path, options = {}) {
  const headers = options.headers || {};
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers: { ...headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error === 'complaint_deleted_by_authority'
      ? 'This complaint was deleted by the authority.'
      : data.error || 'Request failed';
    throw new Error(message);
  }
  return data;
}

export async function analyzeComplaint(text) {
  return api('/complaints/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

export async function registerComplaint(formData) {
  return fetch(`${API_BASE_URL}/api/complaints/register`, {
    method: 'POST',
    body: formData
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    return data;
  });
}

export async function trackComplaint(id) {
  return api(`/complaints/track/${encodeURIComponent(id)}`);
}

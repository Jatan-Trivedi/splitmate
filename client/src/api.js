const BASE = import.meta.env.VITE_API_URL || '/api';

// Small fetch wrapper: adds the auth token, parses JSON, throws readable errors.
export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // An expired or invalid token logs the user out
    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }

  return data;
}

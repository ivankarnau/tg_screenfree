// src/api/client.ts
export function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('token') || ''
  return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...opts
  })
}

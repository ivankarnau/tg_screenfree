export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('token')
  return fetch(import.meta.env.VITE_API_URL + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

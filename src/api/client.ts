// гарантируем, что VITE_API_URL задан в .env на Vercel
const API_URL = import.meta.env.VITE_API_URL || "https://tgscreenfreegateway-production.up.railway.app"

export async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token")
  const headers: Record<string,string> = {
    "Content-Type": "application/json"
  }
  // добавляем header Authorization, только если в localStorage реально есть токен
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return fetch(API_URL + path, {
    headers,
    ...opts
  })
}

export async function loginWithTelegram(initData: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/auth/telegram`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.detail || `Auth failed: ${res.status}`)
  }
  const { access_token } = await res.json()
  // сохраняем именно под ключом "token"
  localStorage.setItem("token", access_token)
}

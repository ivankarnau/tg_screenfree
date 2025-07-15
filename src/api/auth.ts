export async function loginWithTelegram(initData: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/auth/telegram`,
    { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ initData })
    }
  )
  if (!res.ok) throw new Error('Auth failed')
  const { access_token } = await res.json()
  localStorage.setItem('token', access_token)
}

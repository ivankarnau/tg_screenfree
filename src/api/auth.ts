export async function loginWithTelegram(initData: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/auth/telegram`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Обратите внимание: здесь snake_case, а не initData!
      body: JSON.stringify({ init_data: initData })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || 'Auth failed');
  }
  const { access_token } = await res.json();
  localStorage.setItem('token', access_token);
}

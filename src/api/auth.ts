// src/api/auth.ts
export async function loginWithTelegram(initData: string) {
  const r = await fetch(
    import.meta.env.VITE_API_URL + "/auth/telegram",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    }
  );
  if (!r.ok) throw new Error("Auth failed");
  const { access_token } = await r.json();
  localStorage.setItem("token", access_token);
  return access_token;
}

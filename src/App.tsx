import { useEffect, useState } from "react";
import { loginWithTelegram } from "./api/auth";
import { apiFetch } from "./api/client";

interface Balance {
  user_id: number;
  balance: number;
}

export default function App() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔐  авторизация и первый запрос
  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore — объект появляется внутри Telegram WebApp
        const Tele = window.Telegram?.WebApp;
        if (Tele && !localStorage.getItem("token")) {
          await loginWithTelegram(Tele.initData);
        }
        setLoading(true);
        const r = await apiFetch("/wallet/balance");
        if (!r.ok) throw new Error(await r.text());
        setBalance(await r.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50 p-6 text-center">
      <h1 className="text-2xl font-bold">ScreenFree Mini‑App</h1>

      {loading && <p className="animate-pulse">Загружаю…</p>}

      {error && (
        <p className="text-red-600 max-w-xs">
          Ошибка: <span className="font-mono break-all">{error}</span>
        </p>
      )}

      {balance && (
        <div className="rounded-2xl bg-white shadow p-4 min-w-[200px]">
          <p className="text-sm text-gray-500">Ваш баланс</p>
          <p className="text-3xl font-semibold mt-1">{balance.balance} SF</p>
        </div>
      )}

      {!loading && !error && !balance && (
        <p className="text-gray-600">Нет данных</p>
      )}

      <footer className="text-xs text-gray-400 mt-8">@screenfree_bot</footer>
    </main>
  );
}

import { useEffect, useState } from "react";
import { loginWithTelegram } from "./api/auth";
import { apiFetch } from "./api/client";

/* ──────────────────────────────────────────── */
/* вспомогательный тип + функция запроса баланса */
interface Balance {
  user_id: number;
  balance: number;
}

async function getBalance(): Promise<Balance> {
  const r = await apiFetch("/wallet/balance");
  if (!r.ok) throw new Error("Failed to load balance");
  return r.json();
}
/* ──────────────────────────────────────────── */

export default function App() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* авторизация + первый запрос */
  useEffect(() => {
    const init = async () => {
      try {
        // @ts-ignore – объект приходит из Telegram SDK
        const Tele = window.Telegram?.WebApp;
        if (Tele && !localStorage.getItem("token")) {
          await loginWithTelegram(Tele.initData);
        }
        const bal = await getBalance();
        setBalance(bal);
      } catch (e: any) {
        setError(e.message);
      }
    };
    init();
  }, []);

  /* простейшие состояния UI */
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!balance) return <p>Загружаем…</p>;

  return (
    <div style={{ padding: "1rem", fontSize: "20px" }}>
      Баланс: <strong>{balance.balance}</strong>
    </div>
  );
}

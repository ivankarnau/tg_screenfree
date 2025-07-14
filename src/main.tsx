import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

// we know Telegram.WebApp is injected by the Telegram client:
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        MainButton: {
          setText(text: string): void;
          show(): void;
        };
      };
    };
  }
}

const API_BASE = 'https://tgscreenfreegateway-production.up.railway.app';

function App() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // 1) authenticate via the initData Telegram gives us
        const initData = window.Telegram.WebApp.initData;
        const auth = await fetch(`${API_BASE}/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        if (!auth.ok) throw new Error('Auth failed');
        const { access_token } = await auth.json();

        // 2) store the token locally & fetch the balance
        localStorage.setItem('token', access_token);
        const bal = await fetch(`${API_BASE}/wallet/balance`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },
        });
        if (!bal.ok) throw new Error('Fetch balance failed');
        const { balance } = await bal.json();
        setBalance(balance);

        // 3) update the Telegram Mini-App button
        window.Telegram.WebApp.MainButton.setText(`Баланс: ${balance}`);
        window.Telegram.WebApp.MainButton.show();
      } catch (e) {
        console.error(e);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <p>Loading…</p>;
  return <p>Баланс: {balance !== null ? balance : '—'}</p>;
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

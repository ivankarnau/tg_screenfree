import React, { useEffect, useState } from 'react';
import { loginWithTelegram } from './api/auth';
import { apiFetch } from './api/client';
import './App.css';

export default function App() {
  const [balance, setBalance] = useState<number|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Инициализационные данные от Telegram
        const params = new URLSearchParams(window.location.search);
        const initData = params.get('initData') || '';
        if (!initData) throw new Error('Нет initData от Telegram');

        // Авторизуемся и сохраняем JWT
        await loginWithTelegram(initData);

        // Скрываем стандартную кнопку, чтобы не дублировать баланс
        window.Telegram.WebApp.MainButton.hide();

        // Запрашиваем баланс
        const res = await apiFetch('/wallet/balance');
        if (!res.ok) throw new Error(`Ошибка при загрузке: ${res.status}`);
        const { available, reserved } = await res.json();
        setBalance(available); // или можно хранить отдельно оба
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="App">
        <h1 className="title">ScreenFree</h1>
        <p className="info">Загрузка…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <h1 className="title">ScreenFree</h1>
        <p className="info error">Ошибка: {error}</p>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <h1 className="title">ScreenFree</h1>
      </header>

      <main>
        <section className="card">
          <h2 className="card-title">Кошелёк</h2>
          <p className="balance">{balance} ₽</p>
          {/* ... форма пополнения и т.п. ... */}
        </section>
        {/* ... остальной UI ... */}
      </main>

      <footer className="footer">
        @screenfree_bot
      </footer>
    </div>
  );
}

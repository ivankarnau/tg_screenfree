// src/App.tsx
import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { SonicControl } from './components/SonicControl'
import { SonicTransfer } from './components/SonicTransfer'
import './App.css'

export default function App() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const tg = window.Telegram.WebApp
        tg.ready()

        // 1) Получаем initData
        const initData = tg.initData || ''
        if (!initData) throw new Error('Отсутствует initData от Telegram')

        // 2) Авторизуемся на бэке
        await loginWithTelegram(initData)

        // 3) Скрываем основную кнопку Telegram
        tg.MainButton.hide()

        // 4) Запрашиваем баланс
        const res = await apiFetch('/wallet/balance')
        if (!res.ok) throw new Error(`Ошибка загрузки баланса: ${res.status}`)
        const { balance } = await res.json()
        setBalance(balance)
      } catch (e: any) {
        setError(e.message || 'Неизвестная ошибка')
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  if (loading) {
    return (
      <div className="App">
        <h1 className="title">ScreenFree</h1>
        <p className="info">Загрузка…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="App">
        <h1 className="title">ScreenFree</h1>
        <p className="info error">Ошибка: {error}</p>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="header">
        <h1 className="title">ScreenFree</h1>
      </header>

      <main>
        {/* Секция 1: Кошелёк */}
        <section className="card">
          <h2 className="card-title">Кошелёк</h2>
          <p className="balance">{balance} ₽</p>
          <TopUpForm onSuccess={setBalance} />
        </section>

        {/* Секция 2: Ультразвуковое измерение */}
        <section className="card">
          <h2 className="card-title">Ультразвуковое измерение</h2>
          <SonicControl />
        </section>

        {/* Секция 3: Ультразвуковой перевод */}
        <section className="card">
          <h2 className="card-title">Ультразвуковой перевод</h2>
          <SonicTransfer onTransfer={setBalance} />
        </section>
      </main>

      <footer className="footer">@screenfree_bot</footer>
    </div>
  )
}

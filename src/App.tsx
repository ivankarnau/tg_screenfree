// src/App.tsx
import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { SonicControl } from './components/SonicControl'
import './App.css'

export default function App() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      setLoading(true)
      try {
        // Telegram WebApp передаёт initData в query string
        const params = new URLSearchParams(window.location.search)
        const initData = params.get('initData') || ''
        if (!initData) throw new Error('Отсутствует initData от Telegram')

        // Шлём initData на бэкенд — получаем и сохраняем JWT
        await loginWithTelegram(initData)

        // Теперь запрашиваем баланс
        const res = await apiFetch('/wallet/balance')
        if (!res.ok) {
          throw new Error(`Ошибка при загрузке баланса: ${res.status}`)
        }
        const data = await res.json()
        setBalance(data.balance)
      } catch (e: any) {
        setError(e.message || 'Что-то пошло не так')
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  if (loading) {
    return (
      <div className="App">
        <h1>ScreenFree Mini-App</h1>
        <p>Загрузка…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="App">
        <h1>ScreenFree Mini-App</h1>
        <p style={{ color: 'red' }}>Ошибка: {error}</p>
        <footer>@screenfree_bot</footer>
      </div>
    )
  }

  return (
    <div className="App">
      <h1>ScreenFree Mini-App</h1>

      <section>
        <h2>Кошелёк</h2>
        <p>
          <strong>Баланс:</strong> {balance} ₽
        </p>
        <TopUpForm onSuccess={setBalance} />
      </section>

      <hr />

      <section>
        <h2>Ультразвуковое измерение</h2>
        <SonicControl />
      </section>

      <footer>@screenfree_bot</footer>
    </div>
  )
}

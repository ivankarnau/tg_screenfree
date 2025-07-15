// src/App.tsx
import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TokenList } from './components/TokenList'
import { TopUpForm } from './components/TopUpForm'
import { IssueTokenForm } from './components/IssueTokenForm'
import { SonicControl } from './components/SonicControl'
import './App.css'

export default function App() {
  const [available, setAvailable] = useState<number>(0)
  const [reserved, setReserved] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1) Telegram WebApp API
        const tg = window.Telegram.WebApp
        tg.ready()

        // 2) Получаем initData **не из URL**, а из API:
        const initData = tg.initData
        if (!initData) {
          throw new Error('Нет initData от Telegram')
        }

        // 3) Авторизация на бэке
        await loginWithTelegram(initData)

        // 4) Скрываем системную кнопку
        tg.MainButton.hide()

        // 5) Загружаем баланс
        await loadBalance()
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  // Запрос баланса available/reserved
  async function loadBalance() {
    const res = await apiFetch('/wallet/balance')
    if (!res.ok) throw new Error(`Ошибка баланса: ${res.status}`)
    const { available, reserved } = await res.json()
    setAvailable(available)
    setReserved(reserved)
  }

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
        <p className="info error">{error}</p>
      </div>
    )
  }

  return (
    <div className="App">
      <section className="card">
        <h2>Кошелёк</h2>
        <p className="bal">Доступно: <b>{available} ₽</b></p>
        <p className="bal">Заморожено: <b>{reserved} ₽</b></p>
        <TopUpForm onSuccess={loadBalance} />
      </section>

      <section className="card">
        <h2>Токены P2P (UltraSonic)</h2>
        <IssueTokenForm onSuccess={loadBalance} />
        <TokenList />
      </section>

      <section className="card">
        <h2>Ультразвук</h2>
        <SonicControl />
      </section>
    </div>
  )
}

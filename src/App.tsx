// src/App.tsx
import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { IssueTokenForm } from './components/IssueTokenForm'
import { TokenList } from './components/TokenList'
import { SonicControl } from './components/SonicControl'
import './App.css'

export default function App() {
  const [available, setAvailable] = useState<number>(0)
  const [reserved, setReserved]   = useState<number>(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string|null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        // 1) получаем объект WebApp
        const tg = window.Telegram.WebApp
        tg.ready()

        // 2) initData берём только оттуда
        const initData = tg.initData
        if (!initData) {
          throw new Error('Нет initData от Telegram — откройте мини-приложение через кнопку бота')
        }

        // 3) Авторизуемся на бэке, сохраняем JWT
        await loginWithTelegram(initData)

        // 4) Убираем дублирующую кноп­ку внизу
        tg.MainButton.hide()

        // 5) Загрузим балансы
        await loadBalance()
      } catch (e: any) {
        console.error('Bootstrap error:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function loadBalance() {
    const res = await apiFetch('/wallet/balance')
    if (!res.ok) {
      throw new Error(`Сервер вернул ${res.status}`)
    }
    const data = await res.json()
    setAvailable(data.available)
    setReserved(data.reserved)
  }

  if (loading) {
    return <LoadingScreen />
  }
  if (error) {
    return <ErrorScreen message={error} />
  }

  return (
    <div className="App">
      <section className="card">
        <h2>Кошелёк</h2>
        <p>Доступно: <b>{available} ₽</b></p>
        <p>Заморожено: <b>{reserved} ₽</b></p>
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

function LoadingScreen() {
  return (
    <div className="App">
      <h1 className="title">ScreenFree</h1>
      <p className="info">Загрузка…</p>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="App">
      <h1 className="title">ScreenFree</h1>
      <p className="info error">{message}</p>
    </div>
  )
}

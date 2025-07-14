// src/App.tsx
import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { TokenList } from './components/TokenList'
import { SonicControl } from './components/SonicControl'
import { UltrasoundTransfer } from './components/UltrasoundTransfer'
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

        const initData = tg.initData || ''
        if (!initData) throw new Error('Отсутствует initData от Telegram')

        await loginWithTelegram(initData)
        tg.MainButton.hide()

        const res = await apiFetch('/wallet/balance')
        if (!res.ok) throw new Error(`Ошибка: ${res.status}`)
        setBalance((await res.json()).balance)
      } catch (e: any) {
        setError(e.message)
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
        <p className="info error">{error}</p>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="header">
        <h1 className="title">ScreenFree</h1>
      </header>

      <main>
        {/* Кошелёк */}
        <section className="card">
          <h2 className="card-title">Кошелёк</h2>
          <p className="balance">{balance} ₽</p>
          <TopUpForm onSuccess={setBalance} />
          <TokenList />
        </section>

        {/* Ультразвуковое измерение */}
        <section className="card">
          <h2 className="card-title">Ультразвуковое измерение</h2>
          <SonicControl />
        </section>

        {/* Ультразвуковой перевод */}
        <section className="card">
          <h2 className="card-title">Ультразвуковой перевод</h2>
          <UltrasoundTransfer />
        </section>
      </main>

      <footer className="footer">@screenfree_bot</footer>
    </div>
  )
}

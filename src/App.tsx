import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { IssueTokenForm } from './components/IssueTokenForm'
import { TokenList } from './components/TokenList'
import { SonicControl } from './components/SonicControl'
import './App.css'

export default function App() {
  const [available, setAvailable] = useState(0)
  const [reserved, setReserved]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string|null>(null)

  useEffect(() => {
    (async () => {
      try {
        const tg = window.Telegram.WebApp
        tg.ready()

        const initData = tg.initData
        if (!initData) throw new Error('Нет initData от Telegram')

        await loginWithTelegram(initData)
        tg.MainButton.hide()
        await loadBalance()
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function loadBalance() {
    const res = await apiFetch('/wallet/balance')
    if (!res.ok) throw new Error(`Ошибка баланса: ${res.status}`)
    const data = await res.json()
    setAvailable(data.available)
    setReserved(data.reserved)
  }

  if (loading) return <div className="App"><p>Загрузка…</p></div>
  if (error)   return <div className="App"><p className="error">{error}</p></div>

  return (
    <div className="App">
      <section className="card">
        <h2>Кошелёк</h2>
        <p>Доступно: <b>{available} ₽</b></p>
        <p>Заморожено: <b>{reserved} ₽</b></p>
        <TopUpForm onSuccess={loadBalance}/>
      </section>

      <section className="card">
        <h2>Токены P2P (UltraSonic)</h2>
        <IssueTokenForm onSuccess={loadBalance}/>
        <TokenList/>
      </section>

      <section className="card">
        <h2>Ультразвук</h2>
        <SonicControl/>
      </section>
    </div>
  )
}

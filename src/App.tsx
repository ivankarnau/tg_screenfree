import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TokenList } from './components/TokenList'
import { TopUpForm } from './components/TopUpForm'
import { IssueTokenForm } from './components/IssueTokenForm'
import { SonicControl } from './components/SonicControl'

export default function App() {
  const [available, setAvailable] = useState<number>(0)
  const [reserved, setReserved] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const initData = params.get('initData') || ''
        if (!initData) throw new Error('Нет initData от Telegram')
        await loginWithTelegram(initData)
        window.Telegram.WebApp.MainButton.hide()
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
    const { available, reserved } = await res.json()
    setAvailable(available)
    setReserved(reserved)
  }

  if (loading) return <div className="App"><p>Загрузка…</p></div>
  if (error)   return <div className="App error">Ошибка: {error}</div>

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

import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { IssueTokenForm } from './components/IssueTokenForm'
import { TokenList } from './components/TokenList'
import { SonicTransfer } from './components/SonicTransfer'
import './App.css'

export default function App() {
  const [available, setAvailable] = useState<number>(0)
  const [reserved, setReserved]   = useState<number>(0)
  const [selectedToken, setSelectedToken] = useState<string|null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string|null>(null)
  const [tokensChanged, setTokensChanged] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const tg = window.Telegram.WebApp
        tg.ready()
        const initData = tg.initData
        if (!initData) {
          throw new Error('Нет initData от Telegram — откройте мини-приложение через кнопку бота')
        }
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
    if (res.ok) {
      const data = await res.json()
      setAvailable(data.available)
      setReserved(data.reserved)
    }
  }

  function reloadTokens() {
    setTokensChanged(x => x + 1)
    loadBalance()
  }

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  return (
    <div className="App">
      <section className="card">
        <h2>Кошелёк</h2>
        <p>Доступно: <b>{available} ₽</b></p>
        <p>Заморожено: <b>{reserved} ₽</b></p>
        <TopUpForm onSuccess={loadBalance} />
      </section>

      <section className="card">
        <h2>Ваши токены</h2>
        <IssueTokenForm onSuccess={reloadTokens} />
        <TokenList
          selected={selectedToken}
          onSelect={setSelectedToken}
          key={tokensChanged} // Обновлять после новых токенов
        />
      </section>

      <SonicTransfer tokenId={selectedToken} onSuccess={reloadTokens} />
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

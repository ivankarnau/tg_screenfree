import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { IssueTokenForm } from './components/IssueTokenForm'
import { TokenList } from './components/TokenList'
import { SonicTransfer } from './components/SonicTransfer'
import './App.css'

function PinSetup() {
  const [pin, setPin] = React.useState(localStorage.getItem('user_pin') || '');

  function savePin() {
    if (!/^\d{4}$/.test(pin)) return alert("Пин-код должен быть 4 цифры");
    localStorage.setItem('user_pin', pin);
    alert("PIN сохранён");
  }
  return (
    <div style={{marginBottom:16}}>
      <b>Ваш PIN (4 цифры): </b>
      <input
        value={pin}
        maxLength={4}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
      />
      <button onClick={savePin}>Сохранить PIN</button>
    </div>
  );
}

export default function App() {
  const [available, setAvailable] = useState<number>(0)
  const [reserved, setReserved]   = useState<number>(0)
  const [selectedToken, setSelectedToken] = useState<string|null>(null)
  const [selectedAmount, setSelectedAmount] = useState<number|null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string|null>(null)
  const [tokens, setTokens]       = useState<any[]>([])
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
        await loadTokens()
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [tokensChanged])

  async function loadBalance() {
    const res = await apiFetch('/wallet/balance')
    if (res.ok) {
      const data = await res.json()
      setAvailable(data.available)
      setReserved(data.reserved)
    }
  }

  async function loadTokens() {
    const res = await apiFetch('/wallet/tokens')
    if (res.ok) {
      const tks = await res.json()
      setTokens(tks)
      if (selectedToken) {
        const sel = tks.find((t:any) => t.token_id === selectedToken)
        setSelectedAmount(sel ? sel.amount : null)
      }
    }
  }

  function reloadTokens() {
    setTokensChanged(x => x + 1)
    loadBalance()
    loadTokens()
  }

  return loading ? <LoadingScreen /> : error ? <ErrorScreen message={error} /> : (
    <div className="App">
      <PinSetup />
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
          onSelect={(id:string) => {
            setSelectedToken(id)
            const sel = tokens.find(t=>t.token_id===id)
            setSelectedAmount(sel ? sel.amount : null)
          }}
          tokens={tokens}
        />
      </section>
      <SonicTransfer tokenId={selectedToken} amount={selectedAmount} onSuccess={reloadTokens} />
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

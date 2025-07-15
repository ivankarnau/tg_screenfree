import React, { useEffect, useState } from 'react'
import { loginWithTelegram } from './api/auth'
import { apiFetch } from './api/client'
import { TopUpForm } from './components/TopUpForm'
import { IssueTokenForm } from './components/IssueTokenForm'
import { TokenList } from './components/TokenList'
import { SonicTransfer } from './components/SonicTransfer'
import './App.css'

// --- PIN-код ---

function PinSetup() {
  const [pin, setPin] = React.useState('')
  const [mode, setMode] = React.useState<'set' | 'locked' | 'change'>('set')
  const [confirm, setConfirm] = React.useState('')
  const [oldPin, setOldPin] = React.useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user_pin')
    if (stored) setMode('locked')
  }, [])

  function savePin() {
    if (!/^\d{4}$/.test(pin)) return alert("Пин-код должен быть 4 цифры")
    if (mode === 'set' && pin !== confirm) return alert("Пин-коды не совпадают")
    localStorage.setItem('user_pin', pin)
    setMode('locked')
    setPin('')
    setConfirm('')
    setOldPin('')
    alert("Пин-код сохранён")
  }

  function requestChange() {
    setMode('change')
    setOldPin('')
    setPin('')
    setConfirm('')
  }

  function confirmChange() {
    const stored = localStorage.getItem('user_pin') || ''
    if (oldPin !== stored) return alert("Неверный старый PIN")
    setMode('set')
    setPin('')
    setConfirm('')
    setOldPin('')
  }

  if (mode === 'locked') {
    return (
      <div style={{ marginBottom: 16 }}>
        <b>PIN-код установлен.</b> <button onClick={requestChange}>Изменить PIN</button>
      </div>
    )
  }
  if (mode === 'change') {
    return (
      <div style={{ marginBottom: 16 }}>
        <b>Подтвердите старый PIN:</b>
        <input
          value={oldPin}
          maxLength={4}
          onChange={e => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <button onClick={confirmChange}>Далее</button>
      </div>
    )
  }
  // mode === 'set'
  return (
    <div style={{ marginBottom: 16 }}>
      <b>{localStorage.getItem('user_pin') ? "Новый PIN:" : "Придумайте PIN:"}</b>
      <input
        value={pin}
        maxLength={4}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        style={{ marginLeft: 8 }}
      />
      <input
        type="password"
        placeholder="Подтвердите PIN"
        value={confirm}
        maxLength={4}
        onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
        style={{ marginLeft: 8 }}
      />
      <button onClick={savePin}>Сохранить PIN</button>
    </div>
  )
}

// --- ОСНОВНОЙ APP ---

export default function App() {
  const [available, setAvailable] = useState<number>(0)
  const [reserved, setReserved] = useState<number>(0)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<any[]>([])
  const [tokensChanged, setTokensChanged] = useState(0)

  useEffect(() => {
    ; (async () => {
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
    // eslint-disable-next-line
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
        const sel = tks.find((t: any) => t.token_id === selectedToken)
        setSelectedAmount(sel ? sel.amount : null)
      }
    }
  }

  function reloadTokens() {
    setTokensChanged(x => x + 1)
    loadBalance()
    loadTokens()
  }

  // --- ОБРАБОТКА ПРИЁМА ТОКЕНА ЧЕРЕЗ УЛЬТРАЗВУК ---
  async function handleTokenReceive(tokenObj: any) {
    if (tokenObj?.token_id) {
      try {
        await apiFetch('/wallet/claim', {
          method: 'POST',
          body: JSON.stringify({ token_id: tokenObj.token_id })
        })
        reloadTokens()
        alert('Токен успешно принят и зачислен на ваш баланс!')
      } catch {
        alert('Ошибка при зачислении токена')
      }
    }
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
          onSelect={(id: string) => {
            setSelectedToken(id)
            const sel = tokens.find(t => t.token_id === id)
            setSelectedAmount(sel ? sel.amount : null)
          }}
          tokens={tokens}
        />
      </section>
      <SonicTransfer
        tokenId={selectedToken}
        amount={selectedAmount}
        onSuccess={handleTokenReceive}
      />
      <section className="card" style={{ marginTop: 32 }}>
        <h2>История токенов</h2>
        <TokenHistory tokens={tokens} />
      </section>
    </div>
  )
}

function TokenHistory({ tokens }: { tokens: any[] }) {
  return (
    <div>
      <ul style={{ paddingLeft: 0, margin: 0 }}>
        {tokens.map(t => (
          <li key={t.token_id} style={{ marginBottom: 8, fontSize: "0.98em", listStyle: "none", borderBottom: "1px solid #eee", paddingBottom: 7 }}>
            <span>
              <b>{t.amount} ₽</b> — <small>{t.token_id.slice(0, 8)}…</small>
            </span>
            <br />
            <small>Создан: {new Date(t.created_at).toLocaleString()}</small>
            {t.redeemed_at && <>
              <br />
              <small style={{ color: "#1976d2" }}>Погашен: {new Date(t.redeemed_at).toLocaleString()}</small>
            </>}
          </li>
        ))}
      </ul>
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

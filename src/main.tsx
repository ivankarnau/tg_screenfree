import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

// Telegram WebApp SDK доступен в глобальной переменной
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string
        ready: () => void
      }
    }
  }
}

const API = 'https://tgscreenfreegateway-production.up.railway.app'

function App() {
  const [status, setStatus]     = useState<'loading'|'auth'|'balance'|'ready'|'error'>('loading')
  const [error, setError]       = useState<string| null>(null)
  const [balance, setBalance]   = useState<number| null>(null)

  useEffect(() => {
    async function load() {
      try {
        // ждём, пока Telegram.WebApp будет готов
        window.Telegram.WebApp.ready()
        setStatus('auth')

        // делаем авторизацию по initData
        const initData = window.Telegram.WebApp.initData
        const authRes = await fetch(`${API}/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })
        if (!authRes.ok) {
          const err = await authRes.json().catch(() => null)
          throw new Error(err?.detail || `Auth failed ${authRes.status}`)
        }
        const { access_token } = await authRes.json()

        setStatus('balance')
        // запрашиваем баланс
        const balRes = await fetch(`${API}/wallet/balance`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + access_token,
          }
        })
        if (!balRes.ok) {
          const err = await balRes.json().catch(() => null)
          throw new Error(err?.detail || `Balance failed ${balRes.status}`)
        }
        const { balance } = await balRes.json()
        setBalance(balance)
        setStatus('ready')
      } catch (e: any) {
        console.error(e)
        setError(e.message)
        setStatus('error')
      }
    }

    load()
  }, [])

  if (status === 'loading') {
    return <p>Инициализация…</p>
  }
  if (status === 'auth') {
    return <p>Авторизация…</p>
  }
  if (status === 'balance') {
    return <p>Получаем баланс…</p>
  }
  if (status === 'error') {
    return <p style={{ color: 'red' }}>Ошибка: {error}</p>
  }
  // готово
  return (
    <div>
      <h1>ScreenFree</h1>
      <p>Баланс: {balance} ₽</p>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)

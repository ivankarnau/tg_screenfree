import React, { useEffect, useState } from "react"
import { loginWithTelegram } from "./api/auth"
import { apiFetch } from "./api/client"
import { TopUpForm } from "./components/TopUpForm"
import { IssueTokenForm } from "./components/IssueTokenForm"
import { TokenList } from "./components/TokenList"
import { SonicControl } from "./components/SonicControl"
import "./App.css"

export default function App() {
  const [available, setAvailable] = useState<number>(0)
  const [reserved, setReserved]   = useState<number>(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string|null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const tg = window.Telegram.WebApp
        tg.ready()

        const initData = tg.initData
        if (!initData) throw new Error("Нет initData от Telegram")

        // 1) Login и сохранение токена
        await loginWithTelegram(initData)

        // 2) Скрываем MainButton
        tg.MainButton.hide()

        // 3) Загружаем баланс
        await loadBalance()
      } catch (e: any) {
        console.error("Bootstrap error:", e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function loadBalance() {
    try {
      const res = await apiFetch("/wallet/balance")
      if (!res.ok) {
        throw new Error(`Сервер вернул ${res.status}`)
      }
      const data = await res.json()
      setAvailable(data.available)
      setReserved(data.reserved)
    } catch (e: any) {
      console.error("Balance fetch error:", e)
      throw new Error(`Не удалось загрузить баланс: ${e.message}`)
    }
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
        <p className="info error">Ошибка: {error}</p>
      </div>
    )
  }

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

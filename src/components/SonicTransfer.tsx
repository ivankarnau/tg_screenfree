// src/components/SonicTransfer.tsx
import React, { useState } from 'react'
import { apiFetch } from '../api/client'

export function SonicTransfer() {
  const [toUser, setToUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleTransfer() {
    if (!toUser.trim()) return alert('Введите ID получателя')
    setLoading(true)
    setMsg('')
    const res = await apiFetch('/sonic/transfer', {
      method: 'POST',
      body: JSON.stringify({ to_user_id: +toUser })
    })
    if (res.ok) {
      const { distance_cm, transferred, new_balance } = await res.json()
      setMsg(
        `Передано ${transferred} ₽ (расстояние ${distance_cm} см). 
Ваш новый баланс: ${new_balance} ₽`
      )
    } else {
      const err = await res.json().catch(() => null)
      setMsg('Ошибка: ' + (err?.detail || res.status))
    }
    setLoading(false)
  }

  return (
    <div className="card">
      <h2 className="card-title">P2P-передача «по ультразвуку»</h2>
      <div className="form">
        <input
          className="input"
          type="number"
          placeholder="ID получателя"
          value={toUser}
          onChange={e => setToUser(e.target.value)}
          disabled={loading}
        />
        <button
          className="button"
          onClick={handleTransfer}
          disabled={loading}
        >
          {loading ? '…' : 'Передать'}
        </button>
      </div>
      {msg && <p className="info">{msg}</p>}
    </div>
  )
}

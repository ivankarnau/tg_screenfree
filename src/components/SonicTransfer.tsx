import React, { useState } from 'react'
import { apiFetch } from '../api/client'

type Props = { tokenId: string|null, onSuccess: () => void }

export function SonicTransfer({ tokenId, onSuccess }: Props) {
  const [toUser, setToUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleTransfer() {
    if (!tokenId) return alert('Сначала выберите токен для передачи')
    if (!toUser.trim()) return alert('Введите ID получателя')
    setLoading(true)
    setMsg('')
    const res = await apiFetch('/wallet/redeem', {
      method: 'POST',
      body: JSON.stringify({ token_id: tokenId, to_user_id: +toUser })
    })
    if (res.ok) {
      await onSuccess()
      setMsg('Токен успешно переведён!')
    } else {
      const err = await res.json().catch(() => null)
      setMsg('Ошибка: ' + (err?.detail || res.status))
    }
    setLoading(false)
  }

  return (
    <div className="card">
      <h2 className="card-title">P2P-передача токена по ультразвуку</h2>
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
          disabled={loading || !tokenId}
        >
          {loading ? '…' : 'Передать'}
        </button>
      </div>
      {msg && <p className="info">{msg}</p>}
    </div>
  )
}

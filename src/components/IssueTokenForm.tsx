import React, { useState } from 'react'
import { apiFetch } from '../api/client'

type Props = { onSuccess: () => void }

export function IssueTokenForm({ onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function issue() {
    const v = +amount
    if (!v || v <= 0) return alert('Введите сумму > 0')
    setLoading(true)
    try {
      const res = await apiFetch('/wallet/reserve', {
        method: 'POST',
        body: JSON.stringify({ amount: v })
      })
      if (!res.ok) throw new Error()
      await onSuccess()
      setAmount('')
    } catch {
      alert('Ошибка выдачи токена')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="issue">
      <input
        type="number"
        placeholder="Сумма ₽"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        disabled={loading}
      />
      <button disabled={loading} onClick={issue}>
        {loading ? '…' : 'Получить токен'}
      </button>
    </div>
  )
}

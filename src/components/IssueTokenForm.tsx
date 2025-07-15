import React, { useState } from 'react'
import { apiFetch } from '../api/client'

type Props = { onSuccess: () => void }

export function IssueTokenForm({ onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  async function issue() {
    const v = +amount
    if (!v || v <= 0) return alert('Введите сумму > 0')
    if (pin.length !== 4) return alert('Введите 4-значный PIN')
    setLoading(true)
    try {
      const res = await apiFetch('/wallet/reserve', {
        method: 'POST',
        body: JSON.stringify({ amount: v, pin })
      })
      if (!res.ok) throw new Error()
      await onSuccess()
      setAmount('')
      setPin('')
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
      <input
        type="password"
        placeholder="PIN (4 цифры)"
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0,4))}
        disabled={loading}
        maxLength={4}
      />
      <button disabled={loading} onClick={issue}>
        {loading ? '…' : 'Получить токен'}
      </button>
    </div>
  )
}

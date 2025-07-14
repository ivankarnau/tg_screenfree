import React, { useState } from 'react'
import { apiFetch } from '../api/client'

interface Props {
  onSuccess: (bal: number) => void
}

export function TopUpForm({ onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = +amount
    if (!value || value <= 0) return alert('Введите сумму > 0')
    setLoading(true)
    try {
      const res = await apiFetch('/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: value })
      })
      if (!res.ok) throw new Error('Ошибка сервера')
      const { balance } = await res.json()
      onSuccess(balance)
      setAmount('')
    } catch {
      alert('Не удалось пополнить')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <input
        className="input"
        type="number"
        min="1"
        placeholder="Сумма ₽"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        disabled={loading}
      />
      <button className="button" disabled={loading}>
        {loading ? '…' : 'Пополнить'}
      </button>
    </form>
  )
}

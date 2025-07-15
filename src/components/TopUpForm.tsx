import React, { useState } from 'react'
import { apiFetch } from '../api/client'

type Props = { onSuccess: ()=>Promise<void> }

export function TopUpForm({ onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = +amount
    if (!v || v <= 0) return alert('Введите сумму > 0')
    setLoading(true)
    try {
      const res = await apiFetch('/wallet/topup',{
        method:'POST',
        body: JSON.stringify({ amount: v })
      })
      if (!res.ok) throw new Error()
      await onSuccess()
      setAmount('')
    } catch {
      alert('Ошибка пополнения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <input
        type="number"
        placeholder="Сумма ₽"
        value={amount}
        onChange={e=>setAmount(e.target.value)}
        disabled={loading}
      />
      <button disabled={loading}>{loading ? '…' : 'Пополнить'}</button>
    </form>
  )
}

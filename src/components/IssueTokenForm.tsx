import React, { useState } from 'react'
import { apiFetch } from '../api/client'

export function IssueTokenForm({ onSuccess }: { onSuccess: ()=>void }) {
  const [amt, setAmt] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const a = +amt
    if (a <= 0) return alert('Введите > 0')
    setLoading(true)
    const res = await apiFetch('/wallet/issue-token', {
      method:'POST', body: JSON.stringify({ amount: a })
    })
    setLoading(false)
    if (!res.ok) {
      const err = await res.json().catch(()=>null)
      return alert(err?.detail || 'Ошибка резерва')
    }
    onSuccess()
    setAmt('')
  }

  return (
    <form onSubmit={submit} className="form">
      <input value={amt} onChange={e=>setAmt(e.target.value)} placeholder="Сумма ₽" type="number" min="1" disabled={loading}/>
      <button disabled={loading}>Резервировать</button>
    </form>
  )
}

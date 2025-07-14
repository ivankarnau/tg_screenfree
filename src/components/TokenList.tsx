// src/components/TokenList.tsx
import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'

interface Token {
  token: string
  amount: number
  created_at: string
}

export function TokenList() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [amount, setAmount] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sf_tokens')
    if (stored) setTokens(JSON.parse(stored))
  }, [])

  function save(list: Token[]) {
    localStorage.setItem('sf_tokens', JSON.stringify(list))
    setTokens(list)
  }

  async function getToken() {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      return alert('Введите корректную сумму для заморозки')
    }
    setLoading(true)
    try {
      const res = await apiFetch('/bank/issuance', {
        method: 'POST',
        body: JSON.stringify({ amount: value }),
      })
      if (!res.ok) throw new Error(`Сервер: ${res.status}`)
      const data: Token = await res.json()
      save([...tokens, { 
        token: data.token, 
        amount: data.amount, 
        created_at: data.created_at 
      }])
      setAmount('')
    } catch (e: any) {
      alert('Ошибка получения токена: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Кошелёк: токены</h3>
      <p style={{ fontSize: 14, color: '#555' }}>
        Токен резервирует указанную сумму ₽ в вашем кошельке и позволяет
        передать её другому через ультразвук.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="number"
          min="1"
          placeholder="Сумма ₽"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={loading}
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: 4
          }}
        />
        <button
          onClick={getToken}
          disabled={loading}
          style={{
            background: '#40a7e3',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {loading ? '…' : 'Получить токен'}
        </button>
      </div>
      <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
        {tokens.map((t, i) => (
          <li key={i} style={{ marginBottom: 4, fontSize: 14 }}>
            <strong>{t.amount} ₽</strong> — токен <code>{t.token}</code> (
            {new Date(t.created_at).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  )
}

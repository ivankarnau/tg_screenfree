import React, { useState, useEffect } from 'react'
import { apiFetch } from '../api/client'

interface Token {
  token: string
}

export function TokenList() {
  const [tokens, setTokens] = useState<Token[]>([])
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
    setLoading(true)
    try {
      const res = await apiFetch('/bank/issuance', { method: 'POST' })
      if (!res.ok) throw new Error(res.statusText)
      const data: Token = await res.json()
      save([...tokens, data])
    } catch (e: any) {
      alert('Ошибка получения токена: '+e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Кошелёк: токены</h2>
      <button className="button" onClick={getToken} disabled={loading}>
        {loading ? '…' : 'Получить токен'}
      </button>
      <ul style={{marginTop:12}}>
        {tokens.map((t,i) => (
          <li key={i} style={{fontSize:14,wordBreak:'break-all'}}>
            {t.token}
          </li>
        ))}
      </ul>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

export function TokenList() {
  const [tokens, setTokens] = useState<
    { token_id: string; amount: number; created_at: string }[]
  >([])

  useEffect(()=>{
    (async()=>{
      const res = await apiFetch('/wallet/list-tokens')
      if (res.ok) setTokens(await res.json())
    })()
  },[])

  return (
    <ul className="token-list">
      {tokens.map(t=>(
        <li key={t.token_id}>
          {t.amount} ₽ — <code>{t.token_id}</code> (
          {new Date(t.created_at).toLocaleString()})
        </li>
      ))}
      {tokens.length===0 && <li>Токенов нет</li>}
    </ul>
  )
}

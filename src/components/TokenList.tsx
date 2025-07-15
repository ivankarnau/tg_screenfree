import React, { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

interface T { token_id: string, amount: number, created_at: string, redeemed_at: string|null }

export function TokenList() {
  const [list, setList] = useState<T[]>([])
  useEffect(()=>{
    (async ()=>{
      const res = await apiFetch('/wallet/tokens')
      if (res.ok) setList(await res.json())
    })()
  },[])
  return (
    <ul className="tokens">
      {list.map(t=>(
        <li key={t.token_id}>
          {t.amount} ₽ — {t.token_id} <br/>
          <small>{new Date(t.created_at).toLocaleString()}</small>
          {t.redeemed_at && <><br/><small>Spent: {new Date(t.redeemed_at).toLocaleString()}</small></>}
        </li>
      ))}
    </ul>
  )
}

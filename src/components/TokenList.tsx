import React, { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

interface T { token_id: string, amount: number, created_at: string, redeemed_at: string | null }
type Props = { selected: string | null, onSelect: (id: string) => void, tokens: T[] }

export function TokenList({ selected, onSelect, tokens }: Props) {
  return (
    <ul className="tokens">
      {tokens.map(t => (
        <li
          key={t.token_id}
          style={{
            border: selected === t.token_id ? '2px solid #40a7e3' : undefined,
            background: t.redeemed_at ? '#eee' : '#fff',
            cursor: t.redeemed_at ? 'not-allowed' : 'pointer'
          }}
          onClick={() => !t.redeemed_at && onSelect(t.token_id)}
        >
          <b>{t.amount} ₽</b> — <small>{t.token_id.slice(0, 8)}…</small><br />
          <small>{new Date(t.created_at).toLocaleString()}</small>
          {t.redeemed_at && <><br /><small>Погашен: {new Date(t.redeemed_at).toLocaleString()}</small></>}
        </li>
      ))}
    </ul>
  )
}

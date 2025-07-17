import React from 'react';
import './TokenList.css';

interface Token {
  token_id: string;
  amount: number;
  created_at: string;
  redeemed_at: string | null;
}

type Props = {
  selected: string | null;
  onSelect: (id: string) => void;
  tokens: Token[];
};

export function TokenList({ selected, onSelect, tokens }: Props) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ul className="token-list">
      {tokens.map(token => (
        <li
          key={token.token_id}
          className={`token-item ${selected === token.token_id ? 'selected' : ''} ${token.redeemed_at ? 'redeemed' : ''}`}
          onClick={() => !token.redeemed_at && onSelect(token.token_id)}
        >
          <div className="token-amount">{token.amount} ₽</div>
          <div className="token-id">{token.token_id.slice(0, 8)}…</div>
          <div className="token-date">
            Создан: {formatDate(token.created_at)}
          </div>
          {token.redeemed_at && (
            <div className="token-redeemed">
              Погашен: {formatDate(token.redeemed_at)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
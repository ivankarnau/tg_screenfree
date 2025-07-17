import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import '../styles/Components/IssueTokenForm.css';

type Props = { 
  onSuccess: () => void 
};

export function IssueTokenForm({ onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issueToken() {
    const value = parseFloat(amount);
    
    if (!value || value <= 0) {
      setError('Введите сумму больше 0');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await apiFetch('/wallet/reserve', {
        method: 'POST',
        body: JSON.stringify({ amount: value })
      });

      if (!res.ok) {
        throw new Error('Ошибка создания токена');
      }

      setAmount('');
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Ошибка создания токена');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="issue-token-form">
      <div className="input-group">
        <input
          type="number"
          placeholder="Сумма токена"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          step="0.01"
          min="1"
        />
        <span className="currency">₽</span>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        onClick={issueToken}
        disabled={loading || !amount}
        className={loading ? 'loading' : ''}
      >
        {loading ? 'Создание...' : 'Создать токен'}
      </button>
    </div>
  );
}
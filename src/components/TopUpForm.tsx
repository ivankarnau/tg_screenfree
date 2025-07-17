import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import '../styles/Components/TopUpForm.css';

type Props = { 
  onSuccess: () => void;
};

export function TopUpForm({ onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    
    if (!value || value <= 0) {
      setError('Введите сумму больше 0');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await apiFetch('/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: value })
      });

      if (!res.ok) {
        throw new Error('Ошибка пополнения');
      }

      setAmount('');
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Ошибка пополнения');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="topup-form" onSubmit={submit}>
      <div className="input-group">
        <input
          type="number"
          placeholder="Сумма пополнения"
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
        type="submit" 
        disabled={loading}
        className={loading ? 'loading' : ''}
      >
        {loading ? 'Обработка...' : 'Пополнить баланс'}
      </button>
    </form>
  );
}
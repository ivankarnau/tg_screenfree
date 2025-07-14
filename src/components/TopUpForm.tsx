// src/components/TopUpForm.tsx
import { useState } from 'react';

interface Props { onSuccess: (bal: number) => void; }

export function TopUpForm({ onSuccess }: Props) {
  const [amt, setAmt] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token') || '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = +amt;
    if (!value || value <= 0) return alert('Введите сумму');
    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ amount: value }),
      });
      if (!res.ok) throw new Error();
      const { balance } = await res.json();
      onSuccess(balance);
      setAmt('');
    } catch {
      alert('Ошибка пополнения');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        type="number"
        placeholder="Сумма ₽"
        value={amt}
        onChange={e => setAmt(e.target.value)}
        disabled={loading}
      />
      <button disabled={loading}>{
        loading ? '…' : 'Пополнить'
      }</button>
    </form>
  );
}

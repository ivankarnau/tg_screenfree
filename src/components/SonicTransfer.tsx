import React, { useState, useRef } from "react";
import { apiFetch } from '../api/client';

declare global {
  interface Window { SonicSocket: any; SonicServer: any; }
}

type Props = {
  tokenId: string | null,
  amount: number | null,
  onSuccess: () => void
}

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const [mode, setMode] = useState<'none' | 'send' | 'receive'>('none');
  const [step, setStep] = useState<'idle' | 'pin' | 'sending' | 'listening' | 'claim' | 'success'>('idle');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [receivedToken, setReceivedToken] = useState<{ token: string, amount: number } | null>(null);

  const socketRef = useRef<any>(null);
  const serverRef = useRef<any>(null);

  function makePayload() {
    // Минимальный полезный payload для передачи:
    // Просто tokenId и сумма (для быстрого кодирования и высокой успешности)
    return `${tokenId}|${amount}`;
  }

  // Передача
  async function startSend() {
    setStep('pin');
    setError(null);
    setStatus("");
  }
  async function confirmPin() {
    const saved = localStorage.getItem('user_pin') || '';
    if (pin !== saved) {
      setError("Неверный PIN");
      return;
    }
    setError(null);
    setStep('sending');
    setStatus("Передаём токен ультразвуком…");

    // Используем sonicnet.js (как у charliegerard)
    socketRef.current = new window.SonicSocket();
    socketRef.current.send(makePayload());

    setTimeout(() => {
      socketRef.current.stop();
      setStatus("Передача завершена!");
      setStep('success');
    }, 6000); // 6 сек, оптимально
  }

  // Приём
  async function startReceive() {
    setMode('receive');
    setStep('listening');
    setStatus("Прослушиваем ультразвук…");

    serverRef.current = new window.SonicServer();
    serverRef.current.on('message', (msg: string) => {
      try {
        // Ожидаем строку вида "tokenId|amount"
        const [token, amt] = msg.split('|');
        if (!token || !amt) throw new Error();
        setReceivedToken({ token, amount: Number(amt) });
        setStatus(`Получен токен на сумму ${amt} ₽`);
        setStep('claim');
        serverRef.current.stop();
      } catch {
        setStatus("Ошибка декодирования");
        serverRef.current.stop();
        setStep('idle');
      }
    });
    serverRef.current.start();

    setTimeout(() => {
      if (step === 'listening') {
        serverRef.current.stop();
        setStatus("Время ожидания истекло");
        setStep('idle');
      }
    }, 12000); // 12 сек
  }

  // Зачисление
  async function claim() {
    if (!receivedToken) return;
    setStatus("Зачисляем токен...");
    const res = await apiFetch('/wallet/claim', {
      method: 'POST',
      body: JSON.stringify({ token_id: receivedToken.token })
    });
    if (res.ok) {
      setStatus("Токен зачислен!");
      setStep('success');
      setReceivedToken(null);
      onSuccess();
    } else {
      setStatus("Ошибка при зачислении");
    }
  }

  return (
    <div className="card sonic">
      <h2>Передача токена ультразвуком</h2>
      <div className="sonic-controls">
        <button className="button" onClick={() => { setMode('send'); setStep('idle'); setError(null); }} disabled={!tokenId}>Передать</button>
        <button className="button" onClick={startReceive}>Принять</button>
      </div>
      {mode === 'send' && (
        <div>
          {step === 'idle' && <button className="button" onClick={startSend} disabled={!tokenId}>Запустить передачу</button>}
          {step === 'pin' && (
            <>
              <div><b>Введите PIN:</b></div>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input"
              />
              <button className="button" onClick={confirmPin}>Подтвердить</button>
              {error && <div className="info error">{error}</div>}
            </>
          )}
          {step === 'sending' && <div className="info">{status}</div>}
          {step === 'success' && <div className="info" style={{ color: 'green' }}>{status}</div>}
        </div>
      )}
      {mode === 'receive' && (
        <div>
          {step === 'listening' && <div className="info">{status}</div>}
          {step === 'claim' && receivedToken && (
            <>
              <div className="info">{status}</div>
              <button className="button" onClick={claim}>Зачислить себе</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

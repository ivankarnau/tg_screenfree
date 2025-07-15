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

  async function handleSendStart() {
    setStep('pin');
    setPin('');
    setStatus('');
    setError(null);
  }

  async function handleSendPin() {
    const savedPin = localStorage.getItem('user_pin');
    if (pin !== savedPin) {
      setError("Неверный PIN!");
      return;
    }
    setError(null);
    setStep('sending');
    setStatus("Передаём токен через ультразвук…");

    const payload = JSON.stringify({
      token: tokenId,
      amount: amount
    });

    socketRef.current = new window.SonicSocket();
    socketRef.current.send(payload);

    setTimeout(() => {
      socketRef.current.stop();
      setStatus("Передача завершена!");
      setStep('success');
    }, 7000);
  }

  async function handleReceive() {
    setMode('receive');
    setStep('listening');
    setStatus("Слушаем ультразвук…");

    serverRef.current = new window.SonicServer();
    serverRef.current.on('message', (msg: string) => {
      try {
        const data = JSON.parse(msg);
        setReceivedToken(data);
        setStatus(`Получен токен на сумму ${data.amount} ₽!`);
        setStep('claim');
        serverRef.current.stop();
      } catch (e) {
        setStatus('Ошибка приёма');
      }
    });

    serverRef.current.start();
    setTimeout(() => {
      if (step === 'listening') {
        serverRef.current.stop();
        setStatus("Время ожидания истекло");
        setStep('idle');
      }
    }, 10000);
  }

  async function handleClaim() {
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
      setStatus("Ошибка при зачислении токена.");
    }
  }

  return (
    <div className="card sonic">
      <h2>Передача токена ультразвуком</h2>
      <div className="sonic-controls">
        <button className="button" onClick={() => { setMode('send'); setStep('idle'); setError(null); }} disabled={!tokenId}>Передать</button>
        <button className="button" onClick={handleReceive}>Принять</button>
      </div>
      {mode === 'send' && (
        <div style={{ marginTop: 12 }}>
          {step === 'idle' && (
            <button className="button" onClick={handleSendStart} disabled={!tokenId}>Передать выбранный токен</button>
          )}
          {step === 'pin' && (
            <div>
              <b>Введите PIN для подтверждения:</b><br />
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input"
              />
              <button className="button" onClick={handleSendPin}>Подтвердить</button>
              {error && <div className="info error">{error}</div>}
            </div>
          )}
          {step === 'sending' && <div><b>{status}</b></div>}
          {step === 'success' && <div style={{ color: 'green' }}>{status}</div>}
        </div>
      )}
      {mode === 'receive' && (
        <div style={{ marginTop: 12 }}>
          {step === 'listening' && <div><b>{status}</b></div>}
          {step === 'claim' && receivedToken && (
            <div>
              <div>{status}</div>
              <button className="button" onClick={handleClaim}>Зачислить токен себе</button>
            </div>
          )}
        </div>
      )}
      <div className="info">{(mode !== 'none' && step === 'idle') ? status : ""}</div>
    </div>
  );
}

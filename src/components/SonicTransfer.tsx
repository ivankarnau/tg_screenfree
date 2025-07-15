import React, { useState, useRef } from "react";
import { apiFetch } from '../api/client';

type Props = {
  tokenId: string | null,
  amount: number | null,
  onSuccess: () => void
}

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<'none' | 'send' | 'receive'>('none');
  const [step, setStep] = useState<'idle' | 'pin' | 'sending' | 'listening' | 'success'>('idle');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const receivedToken = useRef<{ token: string, amount: number } | null>(null);

  // Простая WebAudio реализация (MVP)
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);

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
    setStatus("Передаём ультразвук... Держите устройства рядом 7 секунд!");
    // Start ultrasound (MVP: просто сигнал)
    const ctx = new AudioContext();
    audioCtx.current = ctx;
    oscillator.current = ctx.createOscillator();
    oscillator.current.type = "sine";
    oscillator.current.frequency.value = 19700;
    oscillator.current.connect(ctx.destination);

    oscillator.current.start();

    setTimeout(() => {
      oscillator.current?.stop();
      ctx.close();
      setStatus("Передача завершена! Получатель должен был уловить сигнал.");
      setStep('success');
    }, 7000);
  }

  async function handleReceive() {
    setMode('receive');
    setStep('listening');
    setStatus("Слушаем ультразвук… (MVP: примите передачу рядом)");
    // Здесь должен быть реальный приём звука (sonicnet.js), сейчас MVP — просто ждём 7 секунд
    setTimeout(() => {
      // После "слушания" принимаем токен (MVP)
      if (tokenId && amount) {
        receivedToken.current = { token: tokenId, amount };
        setStatus(`Получен токен на сумму ${amount} ₽! Нажмите "Зачислить"`);
        setStep('success');
      } else {
        setStatus("Не удалось получить токен");
        setStep('idle');
      }
    }, 7000);
  }

  async function handleClaim() {
    if (!receivedToken.current) return;
    setStatus("Зачисляем токен...");
    const res = await apiFetch('/wallet/claim', {
      method: 'POST',
      body: JSON.stringify({ token_id: receivedToken.current.token })
    });
    if (res.ok) {
      setStatus("Токен зачислен!");
      setStep('idle');
      receivedToken.current = null;
      onSuccess();
    } else {
      setStatus("Ошибка при зачислении токена.");
    }
  }

  // UI:
  return (
    <div className="card">
      <h2>Передача токена ультразвуком</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { setMode('send'); setStep('idle'); setError(null); }} disabled={!tokenId}>Передать</button>
        <button onClick={handleReceive}>Принять</button>
      </div>
      {mode === 'send' && (
        <div style={{ marginTop: 12 }}>
          {step === 'idle' && (
            <button onClick={handleSendStart} disabled={!tokenId}>Передать выбранный токен</button>
          )}
          {step === 'pin' && (
            <div>
              <b>Введите PIN для подтверждения:</b><br />
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <button onClick={handleSendPin}>Подтвердить</button>
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
          {step === 'success' && (
            <div>
              <div>{status}</div>
              <button onClick={handleClaim}>Зачислить токен себе</button>
            </div>
          )}
        </div>
      )}
      <div className="info">{(mode !== 'none' && step === 'idle') ? status : ""}</div>
    </div>
  );
}

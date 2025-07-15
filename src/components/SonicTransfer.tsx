import React, { useState } from "react";
import { apiFetch } from '../api/client';

type Props = { tokenId: string|null, onSuccess: () => void }

export function SonicTransfer({ tokenId, onSuccess }: Props) {
  const [mode, setMode] = useState<'none'|'send'|'receive'>('none');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [inputPin, setInputPin] = useState('');

  // MVP: Генерация PIN
  function randomPin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async function handleSend() {
    if (!tokenId) return setStatus('Выберите токен');
    const genPin = randomPin();
    setPin(genPin);
    setStatus(`Передайте PIN: ${genPin} и token_id: ${tokenId} через ультразвук! (Демо: скажите этот код в микрофон второго устройства)`);
    // Здесь добавишь вызов WebAudio для передачи звука — пример ниже
  }

  async function handleReceive() {
    setStatus("Включён режим прослушивания ультразвука… (Демо: введите token_id и PIN ниже)");
    // Здесь будет прослушка микрофона и декодирование звука
  }

  async function claim() {
    if (!inputToken || !inputPin) return setStatus("Введите token_id и PIN!");
    setStatus("Проверяем и зачисляем...");
    const res = await apiFetch('/wallet/claim', {
      method: 'POST',
      body: JSON.stringify({ token_id: inputToken, pin: inputPin })
    });
    if (res.ok) {
      setStatus("Токен зачислен!");
      onSuccess();
    } else {
      const err = await res.json().catch(() => null);
      setStatus("Ошибка: " + (err?.detail || res.status));
    }
  }

  return (
    <div className="card">
      <h2>Передача токена ультразвуком</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setMode('send')}>Передать</button>
        <button onClick={() => setMode('receive')}>Принять</button>
      </div>
      {mode === "send" && (
        <div style={{ marginTop: 12 }}>
          <button onClick={handleSend} disabled={!tokenId}>Старт передачи</button>
          {pin && <div>
            <b>PIN: {pin}</b>
            <br/>
            <small>Передайте код через звук: <code>{tokenId}|{pin}</code></small>
          </div>}
        </div>
      )}
      {mode === "receive" && (
        <div style={{ marginTop: 12 }}>
          <input
            className="input"
            placeholder="token_id (или пойман звуком)"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
          />
          <input
            className="input"
            placeholder="PIN"
            maxLength={4}
            value={inputPin}
            onChange={e => setInputPin(e.target.value.replace(/\D/g, '').slice(0,4))}
          />
          <button className="button" onClick={claim}>Зачислить</button>
        </div>
      )}
      <div className="info">{status}</div>
    </div>
  );
}

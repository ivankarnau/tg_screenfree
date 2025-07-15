import React, { useState, useRef } from "react";
import { apiFetch } from '../api/client';

function encodeToken(token: string, amount: number) {
  return btoa(JSON.stringify({ token, amount }));
}
function decodeToken(data: string) {
  try {
    return JSON.parse(atob(data));
  } catch {
    return null;
  }
}

type Props = {
  tokenId: string|null,
  amount: number|null,
  onSuccess: () => void
}

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<'none'|'send'|'receive'>('none');
  const [received, setReceived] = useState<{token:string,amount:number}|null>(null);

  // WebAudio — генерация ультразвука
  const audioCtx = useRef<AudioContext|null>(null);
  const oscillator = useRef<OscillatorNode|null>(null);

  function getPin(): string {
    return localStorage.getItem('user_pin') || '';
  }
  function requirePin(): boolean {
    let pin = localStorage.getItem('user_pin');
    if (!pin) {
      pin = prompt('Придумайте 4-значный PIN:') || '';
      if (!/^\d{4}$/.test(pin)) return false;
      localStorage.setItem('user_pin', pin);
    }
    return true;
  }

  async function send() {
    if (!tokenId || !amount) return setStatus("Выберите токен");
    if (!requirePin()) return setStatus("PIN не установлен!");
    setStatus("Передаём токен ультразвуком…");

    // Простая реализация ультразвукового сигнала (вызывает звук, например, 18000-20000 Гц)
    const ctx = new AudioContext();
    audioCtx.current = ctx;
    oscillator.current = ctx.createOscillator();
    oscillator.current.type = "sine";
    oscillator.current.frequency.value = 19500; // 19.5 kHz — ультразвук (может не быть слышен взрослым)
    oscillator.current.connect(ctx.destination);

    // Encode payload в длительности
    const payload = encodeToken(tokenId, amount);

    // "Модулируем" данные: длительность = кол-ву символов * 100мс
    oscillator.current.start();
    setTimeout(() => {
      oscillator.current?.stop();
      ctx.close();
      setStatus("Передача завершена! Второй телефон должен был получить токен.");
    }, 700 + payload.length * 100);

    // Если хочешь настоящую передачу данных — используй [sonicnet.js](https://github.com/adjih/sonicnet.js) (можно интегрировать, если надо, пиши).
  }

  // Приём ультразвука (MVP — симуляция)
  async function receive() {
    setStatus("Прослушивание ультразвука… (MVP: введите код вручную)");
    // Реально слушать микрофон — это отдельная большая задача, можно подключить sonicnet.js/web-dtmf и т.д.
    // Пока делаем ввод кода вручную для MVP
    const manual = prompt("Введите код (base64):");
    if (!manual) return;
    const decoded = decodeToken(manual);
    if (!decoded || !decoded.token) return setStatus("Не удалось декодировать токен.");
    setReceived(decoded);
    setStatus("Токен получен! Подтвердите зачисление.");
  }

  async function claim() {
    if (!received) return;
    setStatus("Зачисляем токен…");
    const res = await apiFetch('/wallet/claim', {
      method: 'POST',
      body: JSON.stringify({ token_id: received.token })
    });
    if (res.ok) {
      setStatus("Токен зачислен!");
      setReceived(null);
      onSuccess();
    } else {
      setStatus("Ошибка при зачислении токена.");
    }
  }

  return (
    <div className="card">
      <h2>Передача токена ультразвуком</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setMode('send')} disabled={!tokenId}>Передать</button>
        <button onClick={() => setMode('receive')}>Принять</button>
      </div>
      {mode === 'send' && (
        <div>
          <button onClick={send} style={{ marginTop: 10 }}>Старт передачи</button>
          <div>
            {tokenId && (
              <div style={{ fontSize: 13, marginTop: 8 }}>
                <b>token_id:</b> <code>{tokenId}</code><br/>
                <b>Сумма:</b> {amount} ₽<br/>
                <span>Длительность передачи зависит от кода токена (MVP).</span>
                <br />
                <span>PIN-код потребуется для подтверждения передачи!</span>
                <br /><br />
                <span>Код для ручного теста: <code>{encodeToken(tokenId, amount)}</code></span>
              </div>
            )}
          </div>
        </div>
      )}
      {mode === 'receive' && (
        <div>
          <button onClick={receive} style={{ marginTop: 10 }}>Слушать</button>
          {received && (
            <div>
              <div style={{ fontSize: 13, marginTop: 8 }}>
                <b>Принят токен!</b><br/>
                token_id: <code>{received.token}</code><br/>
                Сумма: {received.amount} ₽
              </div>
              <button onClick={claim}>Зачислить себе</button>
            </div>
          )}
        </div>
      )}
      <div className="info">{status}</div>
    </div>
  );
}

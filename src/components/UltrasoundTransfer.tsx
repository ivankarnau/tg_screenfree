import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../api/client';

declare global {
  interface Window { Quiet: any }
}

export function UltrasoundTransfer() {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'receiving'|'done'>('idle');
  const [log, setLog] = useState('');
  const txRef = useRef<any>(null);
  const rxRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.Quiet && !ready) {
      window.Quiet.init({
        profilesPrefix: "/quiet/",
        memoryInitializerPrefix: "/quiet/"
      });
      window.Quiet.addReadyCallback(
        () => setReady(true),
        (e: any) => setStatus("Quiet.js error: " + e)
      );
    }
  }, [ready]);

  async function send() {
    const n = parseInt(amount, 10);
    if (isNaN(n) || n <= 0) {
      setLog('Введите корректную сумму');
      return;
    }

    if (!ready) {
      setLog("Quiet.js не готов");
      return;
    }

    setStatus('sending');
    setLog(`Передача суммы ${n}₽...`);

    txRef.current = window.Quiet.transmitter({
      profile: 'ultrasonic2',
      onFinish: () => {
        setLog('Передача завершена!');
        setStatus('done');
        txRef.current?.destroy();
      }
    });

    const payload = JSON.stringify({ amount: n });
    txRef.current.transmit(window.Quiet.str2ab(payload));
  }

  function receive() {
    if (!ready) {
      setLog("Quiet.js не готов");
      return;
    }

    setStatus('receiving');
    setLog('Слушаем ультразвук...');

    rxRef.current = window.Quiet.receiver({
      profile: 'ultrasonic2',
      onReceive: (buf: ArrayBuffer) => {
        try {
          const str = window.Quiet.ab2str(buf);
          const data = JSON.parse(str);
          setLog(`Получено: ${data.amount}₽`);
          setStatus('done');
          rxRef.current?.destroy();
          
          // Зачисляем полученную сумму
          apiFetch('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount: data.amount })
          }).then(res => {
            if (res.ok) setLog(`Зачислено ${data.amount}₽`);
            else setLog('Ошибка зачисления');
          });
        } catch {
          setLog("Ошибка декодирования");
          setStatus('idle');
          rxRef.current?.destroy();
        }
      }
    });
  }

  function stop() {
    setStatus('idle');
    setLog('');
    txRef.current?.destroy();
    rxRef.current?.destroy();
  }

  return (
    <div className="card">
      <h2>Ультразвуковой перевод</h2>
      {!ready && <div className="info">Загрузка Quiet.js…</div>}
      
      {status === 'idle' && (
        <div className="form">
          <input
            type="number"
            placeholder="Сумма ₽"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <button onClick={send} disabled={!ready}>Отправить</button>
          <button onClick={receive} disabled={!ready}>Прием</button>
        </div>
      )}
      
      {(status === 'sending' || status === 'receiving') && (
        <div>
          <div className="info">{log}</div>
          <button onClick={stop}>Отмена</button>
        </div>
      )}
      
      {status === 'done' && (
        <div>
          <div className="info" style={{ color: 'green' }}>{log}</div>
          <button onClick={stop}>Закрыть</button>
        </div>
      )}
    </div>
  );
}
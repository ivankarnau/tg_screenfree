import React, { useRef, useState, useEffect } from 'react';

declare global {
  interface Window { Quiet: any }
}

type Props = {
  tokenId: string | null,
  amount: number | null,
  onSuccess?: (receivedToken?: any) => void
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const [mode, setMode] = useState<'idle'|'send'|'receive'|'done'|'error'>('idle');
  const [status, setStatus] = useState('');
  const txRef = useRef<any>(null);
  const rxRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Инициализация Quiet.js 1 раз
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

  // Передача токена
  function transmitToken() {
    if (!ready) { setStatus("Quiet.js не готов"); return; }
    if (!tokenId || !amount) {
      setStatus('Выберите токен для передачи');
      setMode('error');
      return;
    }
    setMode('send');
    setStatus('Передача токена ультразвуком...');
    txRef.current = window.Quiet.transmitter({
      profile: 'ultrasonic2', // или 'ultrasonic' — см. quiet-profiles.json
      onFinish: () => {
        setStatus('Передача завершена!');
        setMode('done');
        txRef.current?.destroy();
        onSuccess?.();
      }
    });
    const payload = JSON.stringify({ token_id: tokenId, amount });
    txRef.current.transmit(window.Quiet.str2ab(payload));
    setTimeout(() => {
      txRef.current?.destroy();
      setStatus('Передача завершена!');
      setMode('done');
      onSuccess?.();
    }, 7000);
  }

  // Приём токена
  function receiveToken() {
    if (!ready) { setStatus("Quiet.js не готов"); return; }
    setMode('receive');
    setStatus('Слушаем ультразвук...');
    rxRef.current = window.Quiet.receiver({
      profile: 'ultrasonic2',
      onReceive: (buf: ArrayBuffer) => {
        try {
          const str = window.Quiet.ab2str(buf);
          const data = JSON.parse(str);
          setStatus(`Токен получен: ${data.amount}₽`);
          setMode('done');
          rxRef.current?.destroy();
          onSuccess?.(data); // Вот сюда прокидываем токен!
        } catch {
          setStatus("Ошибка декодирования");
          setMode('error');
          rxRef.current?.destroy();
        }
      }
    });
    setTimeout(() => {
      if (mode === 'receive') {
        rxRef.current?.destroy();
        setStatus('Время ожидания истекло');
        setMode('idle');
      }
    }, 12000);
  }

  function stopAll() {
    setMode('idle');
    setStatus('');
    txRef.current?.destroy();
    rxRef.current?.destroy();
  }

  return (
    <div className="card sonic">
      <h2>Передача токена ультразвуком</h2>
      {!ready && <div className="info">Загрузка Quiet.js…</div>}
      {mode === 'idle' && (
        <div className="sonic-controls">
          <button className="button" onClick={transmitToken} disabled={!tokenId || !ready}>Передать</button>
          <button className="button" onClick={receiveToken} disabled={!ready}>Слушать</button>
        </div>
      )}
      {(mode === 'send' || mode === 'receive') && (
        <div>
          <div className="info">{status}</div>
          <button className="button" onClick={stopAll}>Отмена</button>
        </div>
      )}
      {mode === 'done' && (
        <div>
          <div className="info" style={{ color: 'green' }}>{status}</div>
          <button className="button" onClick={stopAll}>Закрыть</button>
        </div>
      )}
      {mode === 'error' && (
        <div>
          <div className="info error">{status}</div>
          <button className="button" onClick={stopAll}>Закрыть</button>
        </div>
      )}
    </div>
  );
}

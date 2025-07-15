import React, { useRef, useState } from 'react';

declare global {
  interface Window { Quiet: any }
}

type Props = {
  tokenId: string | null,
  amount: number | null,
  onSuccess: () => void
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const [mode, setMode] = useState<'idle'|'send'|'receive'|'done'|'error'>('idle');
  const [status, setStatus] = useState('');
  const txRef = useRef<any>(null);
  const rxRef = useRef<any>(null);

  // Передача токена ультразвуком
  function transmitToken() {
    if (!tokenId || !amount) {
      setStatus('Выберите токен для передачи');
      setMode('error');
      return;
    }
    setMode('send');
    setStatus('Передача токена ультразвуком...');
    window.Quiet.init({
      profilesPrefix: "./",
      memoryInitializerPrefix: "./",
      onReady: () => {
        txRef.current = window.Quiet.transmitter({
          profile: 'ultrasonic', // или 'ultrasonic-fsk'
          onFinish: () => {
            setStatus('Передача завершена!');
            setMode('done');
            txRef.current?.destroy();
            onSuccess?.();
          }
        });
        const payload = JSON.stringify({ token_id: tokenId, amount });
        txRef.current.transmit(window.Quiet.str2ab(payload));
        // Можно добавить таймер для красоты:
        setTimeout(() => {
          txRef.current?.destroy();
          setStatus('Передача завершена!');
          setMode('done');
          onSuccess?.();
        }, 7000);
      }
    });
  }

  // Приём токена ультразвуком
  function receiveToken() {
    setMode('receive');
    setStatus('Слушаем ультразвук...');
    window.Quiet.init({
      profilesPrefix: "./",
      memoryInitializerPrefix: "./",
      onReady: () => {
        rxRef.current = window.Quiet.receiver({
          profile: 'ultrasonic',
          onReceive: (buf: ArrayBuffer) => {
            try {
              const str = window.Quiet.ab2str(buf);
              const data = JSON.parse(str);
              setStatus(`Токен получен: ${data.amount}₽`);
              setMode('done');
              rxRef.current?.destroy();
              // Вызов claim можно сделать здесь или отдельной кнопкой
              onSuccess?.();
            } catch {
              setStatus("Ошибка декодирования");
              setMode('error');
              rxRef.current?.destroy();
            }
          }
        });
        // Остановить через 12 секунд если не получили:
        setTimeout(() => {
          if (mode === 'receive') {
            rxRef.current?.destroy();
            setStatus('Время ожидания истекло');
            setMode('idle');
          }
        }, 12000);
      }
    });
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
      {mode === 'idle' && (
        <div className="sonic-controls">
          <button className="button" onClick={transmitToken} disabled={!tokenId}>Передать</button>
          <button className="button" onClick={receiveToken}>Слушать</button>
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

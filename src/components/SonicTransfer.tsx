import React, { useRef, useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import '../styles/Components/SonicTransfer.css';

const PROFILE_NAME = 'ultrasonic-transfer';

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const { webApp, isIos, showPopup } = useTelegram();
  const [isTransmitting, setTransmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [isQuietReady, setIsQuietReady] = useState(false);
  const txRef = useRef<any>();

  useEffect(() => {
    const handleQuietReady = () => setIsQuietReady(true);
    const handleQuietFailed = () => setStatus('Ошибка загрузки аудио-библиотеки');

    window.addEventListener('quiet-ready', handleQuietReady);
    window.addEventListener('quiet-failed', handleQuietFailed);

    return () => {
      window.removeEventListener('quiet-ready', handleQuietReady);
      window.removeEventListener('quiet-failed', handleQuietFailed);
    };
  }, []);

  const handleSendToken = async () => {
    if (!tokenId || !amount) {
      showPopup({ title: 'Ошибка', message: 'Выберите токен для передачи' });
      return;
    }

    if (!isQuietReady) {
      showPopup({ title: 'Ошибка', message: 'Аудио-система не готова' });
      return;
    }

    try {
      setTransmitting(true);
      setStatus('Подготовка передачи...');
      
      // Разблокируем аудиоконтекст
      if (window.AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      }

      txRef.current = window.Quiet.transmitter({
        profile: PROFILE_NAME,
        onFinish: () => {
          setStatus('Передача завершена!');
          setTransmitting(false);
          onSuccess?.();
          txRef.current?.destroy();
        },
        onCreateFail: (e) => {
          console.error('Transmitter error:', e);
          setStatus(`Ошибка: ${e.message || e}`);
          setTransmitting(false);
        }
      });

      const payload = JSON.stringify({
        token_id: tokenId,
        amount: amount,
        ts: Date.now()
      });

      // Для iOS добавляем задержку
      if (isIos) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setStatus('Идет передача...');
      txRef.current.transmit(window.Quiet.str2ab(payload));
      
    } catch (error) {
      console.error('Transmission failed:', error);
      setStatus('Ошибка передачи');
      setTransmitting(false);
      txRef.current?.destroy();
    }
  };

  const handleOpenReceiver = () => {
    const RECEIVER_URL = '/receiver.html';
    
    if (webApp?.openLink) {
      webApp.openLink(RECEIVER_URL, { try_instant_view: true });
    } else {
      window.open(RECEIVER_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="sonic-transfer">
      <button
        onClick={handleSendToken}
        disabled={!tokenId || isTransmitting || !isQuietReady}
      >
        {isTransmitting ? 'Передача...' : '📤 Передать токен'}
      </button>
      <button onClick={handleOpenReceiver}>📥 Получить токен</button>
      
      {status && <div className="status">{status}</div>}
      
      {isIos && (
        <div className="ios-hint">
          На iOS увеличьте громкость и поднесите устройства ближе
        </div>
      )}
    </div>
  );
}
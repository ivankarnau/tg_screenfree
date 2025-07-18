import React, { useRef, useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import '../styles/Components/SonicTransfer.css';

const PROFILE_NAME = 'ultrasonic-transfer';

type Props = {
  tokenId: string | null;
  amount: number | null;
  onSuccess?: (payload?: any) => void;
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const { webApp, isIos, showPopup } = useTelegram();
  const [isTransmitting, setTransmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [isQuietReady, setIsQuietReady] = useState(false);
  const txRef = useRef<any>();
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handleQuietReady = () => {
      setIsQuietReady(true);
      setStatus('Аудио система готова');
    };
    
    const handleQuietFailed = (e: any) => {
      setStatus(`Ошибка загрузки: ${e.message || 'Неизвестная ошибка'}`);
      showPopup({
        title: 'Ошибка аудио системы',
        message: 'Не удалось загрузить модуль звуковой передачи'
      });
    };

    window.addEventListener('quiet-ready', handleQuietReady);
    window.addEventListener('quiet-failed', handleQuietFailed);

    return () => {
      window.removeEventListener('quiet-ready', handleQuietReady);
      window.removeEventListener('quiet-failed', handleQuietFailed);
      if (txRef.current) {
        txRef.current.destroy();
      }
    };
  }, [showPopup]);

  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const handleSendToken = async () => {
    if (!tokenId || !amount) {
      showPopup({ title: 'Ошибка', message: 'Выберите токен для передачи' });
      return;
    }

    if (!isQuietReady) {
      showPopup({ 
        title: 'Система не готова', 
        message: 'Аудио модуль еще не инициализирован. Подождите немного.' 
      });
      return;
    }

    try {
      setTransmitting(true);
      setStatus('Подготовка передачи...');
      
      // Инициализация аудио контекста
      await initAudioContext();

      // Для iOS добавляем задержку перед началом передачи
      if (isIos) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      txRef.current = Quiet.transmitter({
        profile: PROFILE_NAME,
        onFinish: () => {
          setStatus('Передача завершена!');
          setTransmitting(false);
          onSuccess?.();
        },
        onCreateFail: (e: any) => {
          console.error('Transmitter error:', e);
          setStatus(`Ошибка: ${e.message || 'Неизвестная ошибка'}`);
          setTransmitting(false);
          showPopup({
            title: 'Ошибка передачи',
            message: 'Не удалось инициализировать передатчик'
          });
        },
        onTransmitFail: () => {
          setStatus('Ошибка передачи данных');
          setTransmitting(false);
        }
      });

      const payload = JSON.stringify({
        token_id: tokenId,
        amount: amount,
        ts: Date.now()
      });

      setStatus('Идет передача...');
      txRef.current.transmit(Quiet.str2ab(payload));
      
    } catch (error: any) {
      console.error('Transmission failed:', error);
      setStatus(`Ошибка: ${error.message || 'Неизвестная ошибка'}`);
      setTransmitting(false);
      showPopup({
        title: 'Ошибка передачи',
        message: 'Не удалось выполнить передачу данных'
      });
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
    <div className={`sonic-transfer ${isTransmitting ? 'sonic-active' : ''}`}>
      <h2 className="sonic-title">Ультразвуковая передача</h2>
      
      <div className="btn-row">
        <button
          onClick={handleSendToken}
          disabled={!tokenId || isTransmitting || !isQuietReady}
          className={`sonic-btn primary ${isTransmitting ? 'active' : ''}`}
        >
          {isTransmitting ? (
            <>
              <span className="spinner"></span>
              Передача...
            </>
          ) : (
            '📤 Передать токен'
          )}
        </button>
        
        <button 
          onClick={handleOpenReceiver}
          className="sonic-btn secondary"
        >
          📥 Получить токен
        </button>
      </div>
      
      {status && (
        <div className={`sonic-status ${
          status.includes('Ошибка') ? 'error' : 
          status.includes('завершена') ? 'success' : ''
        }`}>
          {status}
        </div>
      )}
      
      {isIos && (
        <div className="ios-hint">
          <strong>Для iOS:</strong> Увеличьте громкость до максимума и поднесите 
          устройства на 10-20 см друг к другу. Избегайте фонового шума.
        </div>
      )}
    </div>
  );
}
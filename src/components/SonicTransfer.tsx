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
  const [status, setStatus] = useState('Инициализация аудио системы...');
  const [isQuietReady, setIsQuietReady] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const txRef = useRef<any>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const volumeInterval = useRef<NodeJS.Timeout>();

  // Эффект для анимации уровня громкости
  useEffect(() => {
    if (isTransmitting) {
      volumeInterval.current = setInterval(() => {
        setVolumeLevel(Math.floor(Math.random() * 5) + 3);
      }, 100);
    } else {
      clearInterval(volumeInterval.current);
      setVolumeLevel(0);
    }

    return () => {
      clearInterval(volumeInterval.current);
    };
  }, [isTransmitting]);

  // Обработчики событий Quiet
  useEffect(() => {
    const handleReady = () => {
      setIsQuietReady(true);
      setStatus('Готов к передаче');
      console.log('Quiet ready in component');
    };

    const handleFailed = (e: any) => {
      console.error('Quiet failed:', e);
      setStatus('Ошибка инициализации аудио');
      showPopup({
        title: 'Ошибка аудио системы',
        message: 'Пожалуйста, перезагрузите страницу'
      });
    };

    window.addEventListener('quiet-ready', handleReady);
    window.addEventListener('quiet-failed', handleFailed);

    return () => {
      window.removeEventListener('quiet-ready', handleReady);
      window.removeEventListener('quiet-failed', handleFailed);
      if (txRef.current) {
        txRef.current.destroy();
      }
      clearInterval(volumeInterval.current);
    };
  }, [showPopup]);

  // Инициализация аудио контекста
  const initAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return audioContextRef.current;
    } catch (error) {
      console.error('AudioContext error:', error);
      throw new Error('Не удалось инициализировать аудио');
    }
  };

  // Обработчик передачи токена
  const handleSendToken = async () => {
    if (!tokenId || !amount) {
      showPopup({ title: 'Ошибка', message: 'Выберите токен для передачи' });
      return;
    }

    if (!isQuietReady) {
      showPopup({ 
        title: 'Система не готова', 
        message: 'Аудио модуль еще не инициализирован' 
      });
      return;
    }

    try {
      setTransmitting(true);
      setStatus('Подготовка передачи...');
      
      await initAudioContext();

      // Дополнительная задержка для iOS
      if (isIos) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
          setStatus('Ошибка создания передатчика');
          setTransmitting(false);
          showPopup({
            title: 'Ошибка передачи',
            message: 'Не удалось создать передатчик звука'
          });
        },
        onTransmitFail: () => {
          setStatus('Сбой передачи');
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
      setStatus('Ошибка передачи');
      setTransmitting(false);
      showPopup({
        title: 'Ошибка',
        message: error.message || 'Не удалось выполнить передачу'
      });
    }
  };

  // Открытие страницы приемника
  const handleOpenReceiver = () => {
    const RECEIVER_URL = '/receiver.html';
    if (webApp?.openLink) {
      webApp.openLink(RECEIVER_URL);
    } else {
      window.open(RECEIVER_URL, '_blank');
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

      {/* Визуализатор громкости */}
      {isTransmitting && (
        <div className="sonic-eq">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i}
              className={`bar ${i < volumeLevel ? 'on' : ''}`}
              style={{ height: `${(i + 1) * 3}px` }}
            />
          ))}
        </div>
      )}
      
      {/* Статус */}
      <div className={`sonic-status ${
        status.includes('Ошибка') ? 'error' : 
        status.includes('завершена') ? 'success' : ''
      }`}>
        {status}
      </div>
      
      {/* Подсказка для iOS */}
      {isIos && (
        <div className="ios-hint">
          <strong>Для iOS:</strong> Увеличьте громкость до максимума и поднесите 
          устройства на 10-20 см друг к другу. Избегайте фонового шума.
        </div>
      )}
    </div>
  );
}
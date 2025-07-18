import React, { useRef, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import '../styles/Components/SonicTransfer.css';

const PROFILE_NAME = 'ultrasonic-experimental';
const PROFILE = {
  mod_scheme: 'gmsk',
  checksum_scheme: 'crc32',
  inner_fec_scheme: 'v27',
  outer_fec_scheme: 'none',
  frame_length: 34,
  modulation: { center_frequency: 18500, gain: 0.2 },
  interpolation: {
    shape: 'rrcos',
    samples_per_symbol: 14,
    symbol_delay: 4,
    excess_bandwidth: 0.35,
  },
};

type Props = {
  tokenId: string | null;
  amount: number | null;
  onSuccess?: (payload?: any) => void;
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const { isIos, webApp, showPopup } = useTelegram();
  const [isTransmitting, setTransmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [isQuietReady, setIsQuietReady] = useState(false);
  const txRef = useRef<any>();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initQuiet = () => {
      if (!window.Quiet) {
        console.error('Quiet.js not loaded');
        return;
      }

      try {
        window.Quiet.init({
          profilesPrefix: '/quiet/',
          memoryInitializerPrefix: '/quiet/'
        });

        window.Quiet.addReadyCallback(
          () => {
            setIsQuietReady(true);
            window.Quiet.addProfile(PROFILE_NAME, PROFILE);
          },
          (error: any) => {
            console.error('Quiet init error:', error);
            setStatus(`Ошибка инициализации Quiet: ${error}`);
          }
        );
      } catch (error) {
        console.error('Quiet init exception:', error);
        setStatus('Ошибка загрузки аудио-библиотеки');
      }
    };

    // Для iOS добавляем специальную обработку
    if (isIos) {
      const handleTouch = () => {
        initQuiet();
        window.removeEventListener('touchstart', handleTouch);
      };
      window.addEventListener('touchstart', handleTouch, { once: true });
    } else {
      initQuiet();
    }

    return () => {
      txRef.current?.destroy();
    };
  }, [isIos]);

  const handleSendToken = async () => {
    if (!tokenId || !amount) {
      showPopup({ title: 'Ошибка', message: 'Сначала выберите токен для передачи!' });
      return;
    }

    if (!window.Quiet || !isQuietReady) {
      showPopup({ title: 'Ошибка', message: 'Аудио-библиотека не готова' });
      return;
    }

    try {
      setTransmitting(true);
      setStatus('Подготовка к передаче...');

      txRef.current = window.Quiet.transmitter({
        profile: PROFILE_NAME,
        onFinish: () => {
          setStatus('Передача завершена!');
          setTransmitting(false);
          if (onSuccess) onSuccess();
          txRef.current?.destroy();
        },
        onCreateFail: (e: any) => {
          console.error('Transmitter create failed:', e);
          setStatus(`Ошибка передачи: ${e}`);
          setTransmitting(false);
        },
      });

      setStatus('Передача токена...');
      const payload = JSON.stringify({
        token_id: tokenId,
        amount: amount,
        ts: Date.now(),
      });
      
      // Для iOS добавляем небольшую задержку
      if (isIos) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      txRef.current.transmit(window.Quiet.str2ab(payload));
    } catch (e: any) {
      console.error('Transmission error:', e);
      setStatus(`Ошибка передачи: ${e?.message || e}`);
      setTransmitting(false);
      txRef.current?.destroy();
    }
  };

  const handleOpenReceiver = () => {
    const RECEIVER_URL = `${window.location.origin}/receiver.html`;
    
    if (webApp?.openLink) {
      webApp.openLink(RECEIVER_URL, { try_instant_view: true });
    } else {
      window.open(RECEIVER_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="sonic-transfer">
      <h2 className="sonic-title">Ультразвуковая передача токена</h2>
      <div className="btn-row">
        <button
          className="sonic-btn primary"
          onClick={handleSendToken}
          disabled={!tokenId || !amount || isTransmitting || !isQuietReady}
        >
          {isTransmitting ? 'Передача...' : '📤 Передать токен'}
        </button>
        <button
          className="sonic-btn secondary"
          onClick={handleOpenReceiver}
        >
          📥 Получить токен
        </button>
      </div>
      
      {status && (
        <div className={`sonic-status ${isTransmitting ? 'active' : ''}`}>
          {status}
        </div>
      )}

      {isIos && (
        <div className="ios-hint">
          <p>Для iOS:</p>
          <ul>
            <li>Увеличьте громкость</li>
            <li>Поднесите устройства ближе (10-20 см)</li>
            <li>Уменьшите фоновый шум</li>
          </ul>
        </div>
      )}
    </div>
  );
}
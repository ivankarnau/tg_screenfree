import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import '../styles/Components/SonicTransfer.css';

declare global {
  interface Window {
    Quiet: {
      init: (options: { profilesPrefix: string; memoryInitializerPrefix: string }) => void;
      addReadyCallback: (success: () => void, error: (e: any) => void) => void;
      transmitter: (options: any) => any;
      receiver: (options: any) => any;
      str2ab: (str: string) => ArrayBuffer;
      ab2str: (buf: ArrayBuffer) => string;
    };
    webkitAudioContext: typeof AudioContext;
    isIOS: boolean;
    isTelegram: boolean;
  }
}

type Props = {
  tokenId: string | null;
  amount: number | null;
  onSuccess?: (receivedToken?: any) => void;
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const { showPopup } = useTelegram();
  const [mode, setMode] = useState<'idle' | 'send' | 'receive' | 'done' | 'error'>('idle');
  const [status, setStatus] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isQuietReady, setIsQuietReady] = useState(false);
  
  const txRef = useRef<any>(null);
  const rxRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Проверка поддержки API
  const isAudioSupported = !!(window.AudioContext || window.webkitAudioContext);
  const isGetUserMediaSupported = !!(navigator.mediaDevices?.getUserMedia);

  // Инициализация Quiet.js с периодической проверкой
  useEffect(() => {
    const checkQuietReady = () => {
      if (window.Quiet) {
        setIsQuietReady(true);
        return;
      }
      setTimeout(checkQuietReady, 100);
    };

    checkQuietReady();
  }, []);

  // Активация аудиоконтекста
  const activateAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return true;
    } catch (e) {
      console.error("AudioContext activation failed:", e);
      return false;
    }
  }, []);

  // Передача токена с улучшенной обработкой ошибок
  const transmitToken = useCallback(async () => {
    if (!isQuietReady || !window.Quiet) {
      showPopup({ title: 'Ошибка', message: 'Аудио модуль не готов' });
      return;
    }

    if (!tokenId || !amount) {
      showPopup({ title: 'Ошибка', message: 'Выберите токен для передачи' });
      return;
    }

    setMode('send');
    setStatus('Идет передача...');

    try {
      // Критически важная активация аудио
      const audioActivated = await activateAudioContext();
      if (!audioActivated) {
        throw new Error("Не удалось активировать аудио");
      }

      // Убедимся, что предыдущий передатчик уничтожен
      if (txRef.current) {
        txRef.current.destroy();
        txRef.current = null;
      }

      txRef.current = window.Quiet.transmitter({
        profile: 'ultrasonic', // Используем стандартный профиль
        onFinish: () => {
          setMode('done');
          setStatus('Передача завершена!');
          onSuccess?.();
        },
        onCreateFail: (err: any) => {
          throw new Error(`Ошибка передатчика: ${err}`);
        }
      });

      const payload = JSON.stringify({ 
        token_id: tokenId, 
        amount,
        timestamp: Date.now()
      });
      
      // Добавляем задержку перед передачей для стабилизации
      await new Promise(resolve => setTimeout(resolve, 100));
      txRef.current.transmit(window.Quiet.str2ab(payload));

    } catch (error: any) {
      setMode('error');
      setStatus('Ошибка передачи');
      console.error("Transmission error:", error);
      showPopup({
        title: 'Ошибка передачи',
        message: error.message || 'Не удалось передать токен'
      });
      cleanup();
    }
  }, [isQuietReady, tokenId, amount, onSuccess, showPopup, activateAudioContext]);

  // Прием токена с улучшенной обработкой ошибок
  const receiveToken = useCallback(async () => {
    if (!isQuietReady) {
      showPopup({ title: 'Ошибка', message: 'Аудио модуль не готов' });
      return;
    }

    if (!isGetUserMediaSupported) {
      showPopup({ 
        title: 'Ошибка', 
        message: window.isIOS 
          ? 'Включите разрешение микрофона в настройках Telegram' 
          : 'Браузер не поддерживает микрофон' 
      });
      return;
    }

    setMode('receive');
    setStatus('Ожидание токена...');

    try {
      // Убедимся, что предыдущий приемник уничтожен
      if (rxRef.current) {
        rxRef.current.destroy();
        rxRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      await activateAudioContext();

      // Настройка анализатора громкости
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = audioContextRef.current || new AudioContext();
      const source = context.createMediaStreamSource(stream);
      
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 32;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setVolumeLevel(Math.min(average, 100));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();

      rxRef.current = window.Quiet.receiver({
        profile: 'ultrasonic',
        onReceive: (buf: ArrayBuffer) => {
          try {
            const data = JSON.parse(window.Quiet.ab2str(buf));
            if (data.token_id && data.amount) {
              setMode('done');
              setStatus('Токен получен!');
              onSuccess?.(data);
            }
          } catch (e) {
            console.error("Decoding error:", e);
          }
        },
        onCreateFail: (err: any) => {
          throw new Error(`Ошибка приемника: ${err}`);
        }
      });

    } catch (error: any) {
      setMode('error');
      setStatus('Ошибка приема');
      console.error("Reception error:", error);
      showPopup({
        title: 'Ошибка приема',
        message: window.isIOS
          ? 'Разрешите доступ к микрофону в настройках Safari'
          : error.message || 'Не удалось получить токен'
      });
      cleanup();
    }
  }, [isQuietReady, onSuccess, showPopup, activateAudioContext]);

  // Очистка ресурсов
  const cleanup = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    txRef.current?.destroy();
    rxRef.current?.destroy();
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(e => console.error("Error closing audio context:", e));
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  if (!isAudioSupported) {
    return (
      <div className="sonic-error">
        <h3>Аудио не поддерживается</h3>
        <p>Используйте Chrome или Firefox на компьютере</p>
      </div>
    );
  }

  if (!isQuietReady) {
    return (
      <div className="sonic-transfer loading">
        <div className="sonic-transfer-loader">
          <div className="sonic-wave"></div>
          <div className="sonic-wave"></div>
          <div className="sonic-wave"></div>
          <p>Инициализация аудио модуля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sonic-transfer">
      <h2>Ультразвуковая передача</h2>
      
      <div className="sonic-transfer-controls">
        {mode === 'idle' && (
          <>
            <button
              className="sonic-button primary"
              onClick={transmitToken}
              disabled={!tokenId}
            >
              📤 Передать токен
            </button>
            <button
              className="sonic-button secondary"
              onClick={receiveToken}
              disabled={!isGetUserMediaSupported}
            >
              📥 Получить токен
            </button>
          </>
        )}

        {(mode === 'send' || mode === 'receive') && (
          <div className="sonic-transfer-active">
            <div className="sonic-status">{status}</div>
            
            {mode === 'receive' && (
              <div className="sonic-volume">
                <div 
                  className="sonic-volume-level" 
                  style={{ width: `${volumeLevel}%` }}
                />
              </div>
            )}

            <button
              className="sonic-button cancel"
              onClick={cleanup}
            >
              Отмена
            </button>
          </div>
        )}

        {mode === 'done' && (
          <div className="sonic-transfer-result">
            <div className="sonic-status success">{status}</div>
            <button
              className="sonic-button"
              onClick={cleanup}
            >
              Готово
            </button>
          </div>
        )}

        {mode === 'error' && (
          <div className="sonic-transfer-error">
            <div className="sonic-status error">{status}</div>
            <button
              className="sonic-button"
              onClick={cleanup}
            >
              Понятно
            </button>
          </div>
        )}
      </div>

      {window.isIOS && (
        <div className="sonic-ios-hint">
          ⚠️ Для работы приложения:
          <br />1. Нажмите "Поделиться"
          <br />2. Выберите "Открыть в Safari"
          <br />3. Разрешите доступ к микрофону
        </div>
      )}
    </div>
  );
}
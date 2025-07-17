import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { apiFetch } from '../api/client';
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
  }
}

type Props = {
  tokenId: string | null;
  amount: number | null;
  onSuccess?: (receivedToken?: any) => void;
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const { webApp, isIos, showPopup } = useTelegram();
  const [mode, setMode] = useState<'idle' | 'send' | 'receive' | 'done' | 'error'>('idle');
  const [status, setStatus] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isQuietReady, setIsQuietReady] = useState(false);
  
  const txRef = useRef<any>(null);
  const rxRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Проверка поддержки аудио API
  const isAudioSupported = !!(window.AudioContext || window.webkitAudioContext);
  const isGetUserMediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Активация аудиоконтекста при первом взаимодействии
  useEffect(() => {
    const handleFirstInteraction = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        if (context.state === 'suspended') {
          context.resume().then(() => {
            console.log('AudioContext activated');
          });
        }
      } catch (e) {
        console.error('AudioContext activation error:', e);
      }
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, []);

  // Инициализация Quiet.js
  useEffect(() => {
    if (!window.Quiet || isQuietReady) return;

    window.Quiet.init({
      profilesPrefix: "/quiet/",
      memoryInitializerPrefix: "/quiet/"
    });

    window.Quiet.addReadyCallback(
      () => setIsQuietReady(true),
      (e) => {
        setStatus(`Ошибка Quiet.js: ${e}`);
        setMode('error');
        showPopup({
          title: 'Ошибка аудио',
          message: 'Не удалось инициализировать аудио модуль'
        });
      }
    );
  }, [isQuietReady, showPopup]);

  // Для iOS: обработка iframe
  useEffect(() => {
    if (!isIos) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'quiet-loaded') {
        setIsQuietReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isIos]);

  // Настройка аудиоанализатора
  const setupAudioAnalyser = useCallback(async () => {
    try {
      if (!isGetUserMediaSupported) {
        throw new Error('Браузер не поддерживает доступ к микрофону');
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
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
      return true;
    } catch (err) {
      console.error('Audio setup error:', err);
      showPopup({
        title: 'Ошибка микрофона',
        message: 'Не удалось получить доступ к микрофону. Пожалуйста, проверьте разрешения.'
      });
      return false;
    }
  }, [showPopup]);

  // Очистка ресурсов
  const cleanup = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    txRef.current?.destroy();
    rxRef.current?.destroy();
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
  }, []);

  // Передача токена
  const transmitToken = useCallback(async () => {
    if (!isQuietReady) {
      setStatus("Аудио модуль не готов");
      setMode('error');
      return;
    }
    
    if (!tokenId || !amount) {
      setStatus('Выберите токен для передачи');
      setMode('error');
      return;
    }
    
    setMode('send');
    setStatus('Идет передача токена...');
    
    try {
      // Активируем аудиоконтекст перед передачей
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      txRef.current = window.Quiet.transmitter({
        profile: 'ultrasonic-experimental',
        onFinish: () => {
          setStatus('Передача завершена!');
          setMode('done');
          showPopup({
            title: 'Успешно',
            message: 'Токен успешно передан'
          });
          onSuccess?.();
        },
        onCreateFail: (err: any) => {
          setStatus(`Ошибка передатчика: ${err}`);
          setMode('error');
        }
      });
      
      const payload = JSON.stringify({ 
        token_id: tokenId, 
        amount,
        timestamp: Date.now()
      });
      txRef.current.transmit(window.Quiet.str2ab(payload));
    } catch (error) {
      setStatus('Ошибка передачи');
      setMode('error');
      console.error('Transmission error:', error);
      showPopup({
        title: 'Ошибка передачи',
        message: 'Не удалось передать токен. Попробуйте еще раз.'
      });
    }
  }, [isQuietReady, tokenId, amount, onSuccess, showPopup]);

  // Прием токена
  const receiveToken = useCallback(async () => {
    if (!isQuietReady) {
      setStatus("Аудио модуль не готов");
      setMode('error');
      return;
    }

    if (!isGetUserMediaSupported) {
      setStatus("Браузер не поддерживает микрофон");
      setMode('error');
      showPopup({
        title: 'Ошибка',
        message: 'Ваш браузер не поддерживает доступ к микрофону'
      });
      return;
    }

    setMode('receive');
    setStatus('Ожидание токена...');

    try {
      const audioSetupSuccess = await setupAudioAnalyser();
      if (!audioSetupSuccess) {
        throw new Error("Ошибка настройки аудио");
      }

      rxRef.current = window.Quiet.receiver({
        profile: 'ultrasonic-experimental',
        onReceive: (buf: ArrayBuffer) => {
          try {
            const str = window.Quiet.ab2str(buf);
            const data = JSON.parse(str);
            
            if (data.token_id && data.amount) {
              setStatus('Токен получен!');
              setMode('done');
              onSuccess?.(data);
            }
          } catch (error) {
            console.error('Decoding error:', error);
          }
        },
        onCreateFail: (err: any) => {
          setStatus(`Ошибка приемника: ${err}`);
          setMode('error');
          showPopup({
            title: 'Ошибка приемника',
            message: 'Не удалось настроить приемник звука'
          });
        }
      });
    } catch (error: any) {
      setStatus(`Ошибка: ${error.message}`);
      setMode('error');
      console.error('Reception error:', error);
      showPopup({
        title: 'Ошибка приема',
        message: error.message || 'Не удалось начать прием токена'
      });
    }
  }, [isQuietReady, setupAudioAnalyser, onSuccess, showPopup]);

  // Остановка операции
  const stopOperation = useCallback(() => {
    setMode('idle');
    setStatus('');
    setVolumeLevel(0);
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  if (!isAudioSupported) {
    return (
      <div className="sonic-error">
        <h3>Ваш браузер не поддерживает Web Audio API</h3>
        <p>Пожалуйста, используйте Chrome, Firefox или Safari</p>
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
              onClick={stopOperation}
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
              onClick={stopOperation}
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
              onClick={stopOperation}
            >
              Понятно
            </button>
          </div>
        )}
      </div>

      {isIos && (
        <div className="sonic-ios-hint">
          Для работы приложения разрешите доступ к микрофону
        </div>
      )}
    </div>
  );
}
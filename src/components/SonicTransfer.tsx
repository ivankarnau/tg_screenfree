// src/components/SonicTransfer.tsx

import React, {
  useRef,
  useState,
  useEffect,
  useCallback
} from 'react';
import { useTelegram } from '../hooks/useTelegram';
import '../styles/Components/SonicTransfer.css';

declare global {
  interface Window {
    Quiet: {
      init: (opt: { profilesPrefix: string; memoryInitializerPrefix: string }) => void;
      addReadyCallback: (ok: () => void, fail: (e: any) => void) => void;
      transmitter: (opt: any) => any;
      receiver: (opt: any) => any;
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
  const frameRef = useRef<number>(0);

  const audioOK = !!(window.AudioContext || window.webkitAudioContext);
  const micOK = !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (e.data === 'quiet-ready') {
        console.log('[Quiet] ready from iframe or main');
        setIsQuietReady(true);
      } else if (typeof e.data === 'string' && e.data.startsWith('quiet-failed')) {
        console.error('[Quiet] init failed', e.data);
      }
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (window.Quiet && typeof window.Quiet.transmitter === 'function') {
        console.log('[Quiet] detected directly');
        setIsQuietReady(true);
      } else {
        setTimeout(tick, 300);
      }
    };
    tick();
  }, []);

  const ensureAudioContext = useCallback(async (): Promise<boolean> => {
    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AC();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return true;
    } catch (e) {
      console.error('[Quiet] AudioContext error', e);
      return false;
    }
  }, []);

  const transmit = useCallback(async () => {
    if (!isQuietReady) {
      showPopup({ title: 'Ошибка', message: 'Аудиомодуль ещё не готов' });
      return;
    }
    if (!tokenId || typeof amount !== 'number' || isNaN(amount)) {
      showPopup({ title: 'Ошибка', message: 'Выберите токен для передачи' });
      return;
    }

    setMode('send');
    setStatus('Идёт передача…');

    try {
      if (!await ensureAudioContext()) throw new Error('AudioContext не запущен');

      txRef.current?.destroy();
      txRef.current = window.Quiet.transmitter({
        profile: 'ultrasonic',
        onFinish: () => {
          console.log('[Quiet] передача завершена');
          setMode('done');
          setStatus('Передача завершена');
          onSuccess?.();
        },
        onCreateFail: (e: any) => { throw new Error(e); }
      });

      await new Promise(r => setTimeout(r, 100));
      const payload = JSON.stringify({
        token_id: String(tokenId),
        amount: Number(amount),
        ts: Date.now()
      });
      console.log('[Quiet] transmit:', payload);
      txRef.current.transmit(window.Quiet.str2ab(payload));
    } catch (e: any) {
      console.error('[Quiet] TX error', e);
      setMode('error');
      setStatus('Ошибка передачи');
      showPopup({ title: 'Ошибка передачи', message: e?.message || 'Не удалось передать токен' });
      cleanup();
    }
  }, [isQuietReady, tokenId, amount, onSuccess, ensureAudioContext, showPopup]);

  const receive = useCallback(async () => {
    if (!isQuietReady) {
      showPopup({ title: 'Ошибка', message: 'Аудиомодуль ещё не готов' });
      return;
    }
    if (!micOK) {
      showPopup({
        title: 'Ошибка',
        message: window.isIOS ? 'Разрешите доступ к микрофону в настройках Telegram' : 'Браузер не поддерживает микрофон'
      });
      return;
    }

    setMode('receive');
    setStatus('Ожидание токена…');

    try {
      rxRef.current?.destroy();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      await ensureAudioContext();
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = audioContextRef.current ?? new AC();
      const source = ctx.createMediaStreamSource(stream);
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 32;
      source.connect(analyserRef.current);

      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      const draw = () => {
        analyserRef.current!.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
        setVolumeLevel(Math.min(avg, 100));
        frameRef.current = requestAnimationFrame(draw);
      };
      draw();

      rxRef.current = window.Quiet.receiver({
        profile: 'ultrasonic',
        onReceive: (ab: ArrayBuffer) => {
          try {
            const str = window.Quiet.ab2str(ab);
            console.log('[Quiet] получено:', str);
            const data = JSON.parse(str);
            if (data.token_id && data.amount) {
              setMode('done');
              setStatus('Токен получен!');
              onSuccess?.(data);
            } else {
              throw new Error('Неверный формат данных');
            }
          } catch (e) {
            console.error('[Quiet] decode error', e);
            setMode('error');
            setStatus('Ошибка декодирования');
            showPopup({ title: 'Ошибка приёма', message: 'Данные некорректны или нераспознаны' });
            cleanup();
          }
        },
        onCreateFail: (e: any) => { throw new Error(e); }
      });
    } catch (e: any) {
      console.error('[Quiet] RX error', e);
      setMode('error');
      setStatus('Ошибка приёма');
      showPopup({
        title: 'Ошибка приёма',
        message: window.isIOS ? 'Проверьте разрешение на микрофон' : e?.message || 'Не удалось получить токен'
      });
      cleanup();
    }
  }, [isQuietReady, micOK, onSuccess, ensureAudioContext, showPopup]);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    txRef.current?.destroy();
    rxRef.current?.destroy();

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => { });
    }
    audioContextRef.current = null;

    setMode('idle');
    setStatus('');
    setVolumeLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  if (!audioOK) {
    return (
      <div className="sonic-error">
        <h3>Аудио не поддерживается</h3>
        <p>Откройте приложение в Chrome или Firefox</p>
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
          <p>Инициализация аудио-модуля…</p>
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
              onClick={transmit}
              disabled={!tokenId || typeof amount !== 'number'}
            >
              📤 Передать токен
            </button>
            <button
              className="sonic-button secondary"
              onClick={receive}
              disabled={!micOK}
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
          ⚠️ Для работы:<br />
          1. «Поделиться» → «Открыть в Safari»<br />
          2. Дайте доступ к микрофону
        </div>
      )}
    </div>
  );
}

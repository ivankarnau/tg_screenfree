import React, { useRef, useState } from 'react';
import '../styles/Components/SonicTransfer.css';

// Quiet.js должен быть подключён в index.html или receiver.html

type Props = {
  tokenId: string | null;
  amount: number | null;
  onSuccess?: (payload?: any) => void;
};

const PROFILE_NAME = 'ultrasonic15';
const PROFILE = {
  mod_scheme: 'gmsk',
  checksum_scheme: 'crc32',
  inner_fec_scheme: 'v27',
  outer_fec_scheme: 'none',
  frame_length: 34,
  modulation: { center_frequency: 15000, gain: 0.2 },
  interpolation: {
    shape: 'rrcos',
    samples_per_symbol: 14,
    symbol_delay: 4,
    excess_bandwidth: 0.35,
  },
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  // --- Для передачи токена через звук ---
  const [isTransmitting, setTransmitting] = useState(false);
  const [status, setStatus] = useState('');
  const txRef = useRef<any>();

  // Передача токена
  const handleSendToken = async () => {
    if (!tokenId || !amount) {
      alert('Сначала выберите токен для передачи!');
      return;
    }

    if (!(window as any).Quiet) {
      alert('Quiet.js не загружен!');
      return;
    }
    try {
      setTransmitting(true);
      setStatus('Подготовка к передаче...');
      (window as any).Quiet.addProfile(PROFILE_NAME, PROFILE);

      txRef.current = (window as any).Quiet.transmitter({
        profile: PROFILE_NAME,
        onFinish: () => {
          setStatus('Передача завершена!');
          setTransmitting(false);
          if (onSuccess) onSuccess();
        },
        onCreateFail: (e: any) => {
          setStatus('Ошибка передачи: ' + e);
          setTransmitting(false);
        },
      });

      setStatus('Передача токена...');
      const payload = JSON.stringify({
        token_id: tokenId,
        amount: amount,
        ts: Date.now(),
      });
      txRef.current.transmit((window as any).Quiet.str2ab(payload));
    } catch (e: any) {
      setStatus('Ошибка передачи: ' + (e?.message || e));
      setTransmitting(false);
    }
  };

  // --- Для открытия receiver.html ---
  const RECEIVER_URL = '/receiver.html'; // путь, если receiver.html в public/!
  const handleOpenReceiver = () => {
    if (
      window.Telegram &&
      window.Telegram.WebApp &&
      typeof window.Telegram.WebApp.openLink === 'function'
    ) {
      window.Telegram.WebApp.openLink(RECEIVER_URL, { try_instant_view: true });
    } else {
      window.open(RECEIVER_URL, '_blank');
    }
  };

  return (
    <div className="sonic-transfer">
      <h2 className="sonic-title">Передача и приём через звук</h2>
      <div className="btn-row">
        <button
          className="sonic-btn primary"
          onClick={handleSendToken}
          disabled={!tokenId || !amount || isTransmitting}
        >
          📤 Передать токен
        </button>
        <button
          className="sonic-btn secondary"
          onClick={handleOpenReceiver}
        >
          📥 Получить токен (открыть страницу приёма)
        </button>
      </div>
      {isTransmitting && (
        <div className="sonic-status">{status}</div>
      )}
      <div className="ios-hint">
        Для приёма токена открывается отдельная страница.<br />
        После приёма токена произойдёт возврат в Telegram.<br />
        <b>Не закрывайте страницу, пока не появится сообщение об успехе!</b>
      </div>
    </div>
  );
}

export default SonicTransfer;

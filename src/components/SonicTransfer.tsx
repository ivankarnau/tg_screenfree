import React from 'react';
import '../styles/Components/SonicTransfer.css';

type Props = {
  tokenId: string | null;
  amount: number | null;
  onSuccess?: (payload?: any) => void;
};

export function SonicTransfer({ tokenId, amount }: Props) {
  // Локальный путь до receiver.html (корень фронта! меняй если путь другой)
  const RECEIVER_URL = '/receiver.html'; // или '/static/receiver.html', если у тебя Vercel
  const TG_BOT = 'YOUR_BOT'; // замени на свой username БОТА без @

  const openReceiverPage = () => {
    if (!tokenId || !amount) {
      alert('Сначала выберите токен для передачи!');
      return;
    }
    const url =
      `${RECEIVER_URL}?bot=${TG_BOT}` +
      `&token_id=${encodeURIComponent(tokenId)}` +
      `&amount=${encodeURIComponent(amount)}`;
    if (
      window.Telegram &&
      window.Telegram.WebApp &&
      typeof window.Telegram.WebApp.openLink === 'function'
    ) {
      window.Telegram.WebApp.openLink(url, { try_instant_view: true });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="sonic-transfer">
      <h2 className="sonic-title">Передача через звук</h2>
      <div className="btn-row">
        <button
          className="sonic-btn secondary"
          onClick={openReceiverPage}
          disabled={!tokenId || !amount}
        >
          📥 Получить токен (открыть страницу приёма)
        </button>
      </div>
      <div className="ios-hint">
        Для приёма токена всегда открывается отдельная страница.<br />
        После приёма токена произойдёт автоматическое возвращение в Telegram.<br />
        <b>Не закрывайте страницу, пока не появится сообщение об успехе!</b>
      </div>
    </div>
  );
}

export default SonicTransfer;

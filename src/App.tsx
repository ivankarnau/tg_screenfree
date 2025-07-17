import React, { useState, useEffect, useCallback } from 'react';
import { loginWithTelegram } from './api/auth';
import { apiFetch } from './api/client';
import { TopUpForm } from './components/TopUpForm';
import { IssueTokenForm } from './components/IssueTokenForm';
import { TokenList } from './components/TokenList';
import { SonicTransfer } from './components/SonicTransfer';
import { useTelegram } from './hooks/useTelegram';
import './styles/App.css';

// --- Компонент настройки PIN-кода ---
const PinSetup = () => {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'set' | 'locked' | 'change'>('set');
  const [confirm, setConfirm] = useState('');
  const [oldPin, setOldPin] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user_pin');
    if (stored) setMode('locked');
  }, []);

  const handlePinChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(value.replace(/\D/g, '').slice(0, 4));
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(pin)) {
      alert("Пин-код должен быть 4 цифры");
      return;
    }
    if (mode === 'set' && pin !== confirm) {
      alert("Пин-коды не совпадают");
      return;
    }
    
    localStorage.setItem('user_pin', pin);
    setMode('locked');
    setPin('');
    setConfirm('');
    setOldPin('');
    alert("Пин-код сохранён");
  };

  const requestChange = () => {
    setMode('change');
    setOldPin('');
    setPin('');
    setConfirm('');
  };

  const confirmChange = () => {
    const stored = localStorage.getItem('user_pin') || '';
    if (oldPin !== stored) {
      alert("Неверный старый PIN");
      return;
    }
    setMode('set');
    setPin('');
    setConfirm('');
    setOldPin('');
  };

  if (mode === 'locked') {
    return (
      <div className="pin-status">
        <span>PIN-код установлен</span>
        <button className="pin-change-btn" onClick={requestChange}>
          Изменить PIN
        </button>
      </div>
    );
  }

  if (mode === 'change') {
    return (
      <div className="pin-form">
        <label>Подтвердите старый PIN:</label>
        <input
          type="password"
          value={oldPin}
          maxLength={4}
          onChange={(e) => handlePinChange(e.target.value, setOldPin)}
          className="pin-input"
        />
        <button className="pin-confirm-btn" onClick={confirmChange}>
          Далее
        </button>
      </div>
    );
  }

  return (
    <div className="pin-form">
      <label>{localStorage.getItem('user_pin') ? "Новый PIN:" : "Придумайте PIN:"}</label>
      <div className="pin-inputs">
        <input
          type="password"
          value={pin}
          maxLength={4}
          onChange={(e) => handlePinChange(e.target.value, setPin)}
          className="pin-input"
          placeholder="••••"
        />
        <input
          type="password"
          placeholder="Подтвердите"
          value={confirm}
          maxLength={4}
          onChange={(e) => handlePinChange(e.target.value, setConfirm)}
          className="pin-input"
        />
      </div>
      <button className="pin-save-btn" onClick={savePin}>
        Сохранить PIN
      </button>
    </div>
  );
};

// --- Основной компонент приложения ---
const App = () => {
  const {
    webApp,
    isIos,
    showPopup
  } = useTelegram();

  const [available, setAvailable] = useState(0);
  const [reserved, setReserved] = useState(0);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [tokensChanged, setTokensChanged] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [balanceRes, tokensRes] = await Promise.all([
        apiFetch('/wallet/balance'),
        apiFetch('/wallet/tokens')
      ]);

      if (balanceRes.ok) {
        const { available, reserved } = await balanceRes.json();
        setAvailable(available);
        setReserved(reserved);
      }

      if (tokensRes.ok) {
        const tokensData = await tokensRes.json();
        setTokens(tokensData);
        
        if (selectedToken) {
          const selected = tokensData.find(t => t.token_id === selectedToken);
          setSelectedAmount(selected?.amount || null);
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [selectedToken]);

  useEffect(() => {
    const initApp = async () => {
      try {
        if (!webApp?.initData) {
          throw new Error('Откройте приложение через Telegram');
        }

        await loginWithTelegram(webApp.initData);
        await loadData();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, [webApp, loadData]);

  useEffect(() => {
    loadData();
  }, [tokensChanged, loadData]);

  const handleTokenReceive = useCallback(async (tokenObj: any) => {
    if (!tokenObj?.token_id) return;

    try {
      const res = await apiFetch('/wallet/claim', {
        method: 'POST',
        body: JSON.stringify({ token_id: tokenObj.token_id })
      });

      if (res.ok) {
        showPopup({
          title: 'Успешно',
          message: `Токен на ${tokenObj.amount}₽ зачислен!`
        });
        setTokensChanged(prev => prev + 1);
      } else {
        throw new Error('Ошибка зачисления');
      }
    } catch (error) {
      showPopup({
        title: 'Ошибка',
        message: 'Не удалось зачислить токен'
      });
    }
  }, [showPopup]);

  const handleTokenSelect = useCallback((id: string) => {
    setSelectedToken(id);
    const selected = tokens.find(t => t.token_id === id);
    setSelectedAmount(selected?.amount || null);
  }, [tokens]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div className="app">
      <PinSetup />
      
      <section className="wallet-section">
        <h2>Баланс кошелька</h2>
        <div className="balance-grid">
          <div className="balance-card">
            <span className="balance-label">Доступно</span>
            <span className="balance-amount">{available} ₽</span>
          </div>
          <div className="balance-card">
            <span className="balance-label">Заморожено</span>
            <span className="balance-amount reserved">{reserved} ₽</span>
          </div>
        </div>
        <TopUpForm onSuccess={() => setTokensChanged(prev => prev + 1)} />
      </section>

      <section className="tokens-section">
        <h2>Мои токены</h2>
        <IssueTokenForm onSuccess={() => setTokensChanged(prev => prev + 1)} />
        <TokenList
          selected={selectedToken}
          onSelect={handleTokenSelect}
          tokens={tokens}
        />
      </section>

      <SonicTransfer
        tokenId={selectedToken}
        amount={selectedAmount}
        onSuccess={handleTokenReceive}
      />

      <section className="history-section">
        <h2>История операций</h2>
        <TokenHistory tokens={tokens} />
      </section>
    </div>
  );
};

// --- Вспомогательные компоненты ---
const TokenHistory = ({ tokens }: { tokens: any[] }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="history-list">
      {tokens.map(token => (
        <div key={token.token_id} className={`history-item ${token.redeemed_at ? 'redeemed' : ''}`}>
          <div className="token-info">
            <span className="token-amount">{token.amount} ₽</span>
            <span className="token-id">{token.token_id.slice(0, 8)}...</span>
          </div>
          <div className="token-dates">
            <span className="created-date">{formatDate(token.created_at)}</span>
            {token.redeemed_at && (
              <span className="redeemed-date">{formatDate(token.redeemed_at)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-spinner"></div>
    <p>Загрузка данных...</p>
  </div>
);

const ErrorScreen = ({ message }: { message: string }) => (
  <div className="error-screen">
    <div className="error-icon">!</div>
    <p className="error-message">{message}</p>
  </div>
);

export default App;
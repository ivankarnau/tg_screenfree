import React, { useState, useEffect, useCallback } from 'react';
import { loginWithTelegram } from './api/auth';
import { apiFetch } from './api/client';
import { TopUpForm } from './components/TopUpForm';
import { IssueTokenForm } from './components/IssueTokenForm';
import { TokenList } from './components/TokenList';
import { SonicTransfer } from './components/SonicTransfer';
import { useTelegram } from './hooks/useTelegram';
import PinSetup from './components/PinSetup';
import './styles/App.css';

const App = () => {
  const {
    webApp,
    isIos,
    isInitialized,
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
  const [devMode, setDevMode] = useState(false);

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
        if (!isInitialized) return;

        if (!webApp?.initData && !devMode) {
          setLoading(false);
          return;
        }

        if (webApp?.initData) {
          await loginWithTelegram(webApp.initData);
        }
        
        await loadData();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, [webApp, loadData, isInitialized, devMode]);

  useEffect(() => {
    if (isInitialized && (webApp?.initData || devMode)) {
      loadData();
    }
  }, [tokensChanged, loadData, isInitialized, webApp, devMode]);

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

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  if (!webApp?.initData && !devMode) {
    return (
      <div className="app-error">
        <h2>Откройте приложение через Telegram</h2>
        <p>Для тестирования в браузере:</p>
        <button 
          onClick={() => setDevMode(true)}
          className="dev-mode-button"
        >
          Продолжить в dev-режиме
        </button>
      </div>
    );
  }

  return (
    <div className={`app ${webApp ? 'tg-theme' : ''}`}>
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

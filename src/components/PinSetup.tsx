import React, { useState, useEffect } from 'react';
import '../styles/Components/PinSetup.css';

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
        <span className="pin-status-text">PIN-код установлен</span>
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
        <button className="pin-btn pin-confirm-btn" onClick={confirmChange}>
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
      <button className="pin-btn pin-save-btn" onClick={savePin}>
        Сохранить PIN
      </button>
    </div>
  );
};

export default PinSetup;
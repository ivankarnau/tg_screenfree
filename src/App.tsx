import { useEffect } from 'react';
import { loginWithTelegram } from './api/auth';

function App() {
  useEffect(() => {
    // @ts-ignore  – объект приходит из TG SDK
    const Tele = window.Telegram?.WebApp;
    if (Tele && !localStorage.getItem('token')) {
      loginWithTelegram(Tele.initData).catch(console.error);
    }
  }, []);

  return (
    <>
      {/* ваше приложение */}
    </>
  );
}

export default App;

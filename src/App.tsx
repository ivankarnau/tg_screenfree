import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [msg, setMsg] = useState('загружаю…');

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + '/ping')
      .then(r => r.json())
      .then(j => setMsg(j.pong))
      .catch(e => setMsg('⚠ ' + e.message));
  }, []);

  return (
    <>
      <h1>ScreenFree Wallet demo</h1>
      <p>Backend says: {msg}</p>
    </>
  );
}

export default App;

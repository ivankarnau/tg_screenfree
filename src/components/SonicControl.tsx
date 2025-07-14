// src/components/SonicControl.tsx
import { useState } from 'react';

export function SonicControl() {
  const [job, setJob] = useState('');
  const [status, setStatus] = useState('');
  const [res, setRes] = useState<any>(null);
  const token = localStorage.getItem('token') || '';

  const API = import.meta.env.VITE_API_URL;

  async function start() {
    const r = await fetch(API + '/sonic/start', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    });
    const { job_id } = await r.json();
    setJob(job_id);
    setStatus('pending');
  }
  async function check() {
    if (!job) return;
    const r = await fetch(API + `/sonic/status?job_id=${job}`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const { status } = await r.json();
    setStatus(status);
  }
  async function getResult() {
    if (status !== 'done') return;
    const r = await fetch(API + `/sonic/result?job_id=${job}`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (r.ok) setRes(await r.json());
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Ультразвук</h2>
      <button onClick={start}>Начать</button>
      <button onClick={check} disabled={!job}>Статус</button>
      <button onClick={getResult} disabled={status!=='done'}>Результат</button>
      <p>Статус: {status}</p>
      {res && <pre>{JSON.stringify(res, null,2)}</pre>}
    </div>
  );
}

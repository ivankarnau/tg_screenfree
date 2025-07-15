import React, { useState } from 'react'
import { apiFetch } from '../api/client'

export function SonicControl() {
  const [job, setJob] = useState<string>()
  const [status, setStatus] = useState<string>('—')
  const [result, setResult] = useState<any>()
  const [loading, setLoading] = useState(false)

  async function start() {
    setLoading(true)
    const r = await apiFetch('/sonic/start',{ method:'POST' })
    setLoading(false)
    if (r.ok) {
      const { job_id } = await r.json()
      setJob(job_id)
      setStatus('pending')
    } else {
      alert('Ошибка старта')
    }
  }
  async function check() {
    if (!job) return
    setLoading(true)
    const r = await apiFetch(`/sonic/status?job_id=${job}`)
    setLoading(false)
    if (r.ok) {
      setStatus((await r.json()).status)
    } else {
      alert('Статус не найден')
    }
  }
  async function getRes() {
    if (status!=='done' || !job) return
    setLoading(true)
    const r = await apiFetch(`/sonic/result?job_id=${job}`)
    setLoading(false)
    if (r.ok) setResult(await r.json())
    else alert('Результат пока нет')
  }

  return (
    <div className="sonic">
      <button onClick={start} disabled={loading}>Начать</button>
      <button onClick={check} disabled={!job||loading}>Статус</button>
      <button onClick={getRes} disabled={status!=='done'||loading}>Результат</button>
      <p>Статус: {status}</p>
      {result && <pre>{JSON.stringify(result,null,2)}</pre>}
    </div>
  )
}

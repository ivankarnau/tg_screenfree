import React, { useState } from 'react'
import { apiFetch } from '../api/client'

export function SonicControl() {
  const [job, setJob] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function start() {
    setLoading(true)
    const res = await apiFetch('/sonic/start', { method: 'POST' })
    if (res.ok) {
      const { job_id } = await res.json()
      setJob(job_id)
      setStatus('pending')
    } else {
      alert('Ошибка старта')
    }
    setLoading(false)
  }

  async function check() {
    if (!job) return
    setLoading(true)
    const res = await apiFetch(`/sonic/status?job_id=${job}`)
    if (res.ok) {
      const { status } = await res.json()
      setStatus(status)
    } else {
      alert('Не удалось получить статус')
    }
    setLoading(false)
  }

  async function getResult() {
    if (status !== 'done' || !job) return
    setLoading(true)
    const res = await apiFetch(`/sonic/result?job_id=${job}`)
    if (res.ok) {
      setResult(await res.json())
    } else {
      alert('Результат не готов')
    }
    setLoading(false)
  }

  return (
    <div className="sonic">
      <div className="controls">
        <button className="button" onClick={start} disabled={loading}>
          Начать
        </button>
        <button className="button" onClick={check} disabled={!job || loading}>
          Статус
        </button>
        <button className="button" onClick={getResult} disabled={status !== 'done' || loading}>
          Результат
        </button>
      </div>
      <p className="info">Статус: {status || '—'}</p>
      {result && (
        <pre className="result">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

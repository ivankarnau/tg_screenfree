// src/components/UltrasoundTransfer.tsx
import React, { useState, useRef } from 'react'
import { apiFetch } from '../api/client'

/** Простая кодировка: каждую цифру 0–9 представляем короткой тональностью 18 + digit кГц */
const BASE_FREQ = 18000
const DURATION = 0.2 // секунда на тон

export function UltrasoundTransfer() {
  const [amount, setAmount] = useState('')
  const [listening, setListening] = useState(false)
  const [log, setLog] = useState<string>('')
  const audioCtx = useRef<AudioContext>()

  // 1) Генерация ультразвукового сигнала
  async function send() {
    const n = parseInt(amount, 10)
    if (isNaN(n) || n <= 0) return alert('Введите корректную сумму')
    audioCtx.current = new AudioContext()
    const ctx = audioCtx.current

    for (let digit of amount) {
      const osc = ctx.createOscillator()
      osc.frequency.value = BASE_FREQ + parseInt(digit, 10) * 100
      osc.connect(ctx.destination)
      osc.start()
      await new Promise(r => setTimeout(r, DURATION * 1000))
      osc.stop()
      await new Promise(r => setTimeout(r, 50))
    }

    ctx.close()
    setLog(`Передано: ${amount} ₽`)
  }

  // 2) Приём и декодирование
  async function listen() {
    setListening(true)
    setLog('Слушаю…')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioCtx.current = new AudioContext()
    const source = audioCtx.current.createMediaStreamSource(stream)
    const analyser = audioCtx.current.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    const data = new Float32Array(analyser.frequencyBinCount)
    const detectedDigits: string[] = []

    while (listening && detectedDigits.length < 4) { 
      analyser.getFloatFrequencyData(data)
      // Найдём пик частоты >18 кГц
      let maxAmp = -Infinity, maxIdx = -1
      for (let i = 0; i < data.length; i++) {
        if (data[i] > maxAmp) { maxAmp = data[i]; maxIdx = i }
      }
      const freq = maxIdx * audioCtx.current.sampleRate / analyser.fftSize
      if (freq > BASE_FREQ && freq < BASE_FREQ + 10*100) {
        const digit = Math.round((freq - BASE_FREQ) / 100)
        detectedDigits.push(digit.toString())
        setLog(`Найдено цифр: ${detectedDigits.join('')}`)
        // ждём пока тон закончится
        await new Promise(r => setTimeout(r, (DURATION + 0.1)*1000))
      }
      await new Promise(r => setTimeout(r, 100))
    }

    setListening(false)
    source.disconnect()
    stream.getTracks().forEach(t => t.stop())
    audioCtx.current.close()

    const decoded = detectedDigits.join('')
    setLog(`Декодировано: ${decoded}`)
    // 3) Зачисляем на бэкенде
    const res = await apiFetch('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount: +decoded })
    })
    if (res.ok) {
      const { balance } = await res.json()
      setLog(`Зачислено ${decoded} ₽. Текущий баланс: ${balance} ₽`)
    } else {
      setLog('Ошибка зачисления')
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Ультразвуковой перевод</h2>
      <div className="form">
        <input
          className="input"
          type="number"
          placeholder="Сумма ₽"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={listening}
        />
        <button
          className="button"
          onClick={send}
          disabled={listening}
        >
          Отправить
        </button>
        <button
          className="button"
          onClick={listen}
          disabled={listening}
        >
          {listening ? 'Слушаю…' : 'Прием'}
        </button>
      </div>
      {log && <p className="info">{log}</p>}
    </div>
  )
}

import React, { useRef, useState, useEffect } from 'react';

declare global {
  interface Window { 
    Quiet: any;
    webkitAudioContext: any;
  }
}

type Props = {
  tokenId: string | null,
  amount: number | null,
  onSuccess?: (receivedToken?: any) => void
};

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const [mode, setMode] = useState<'idle'|'send'|'receive'|'done'|'error'>('idle');
  const [status, setStatus] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [hasMicAccess, setHasMicAccess] = useState(false);
  const txRef = useRef<any>(null);
  const rxRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    // Initialize Quiet.js
    if (window.Quiet && !ready) {
      window.Quiet.init({
        profilesPrefix: "/quiet/",
        memoryInitializerPrefix: "/quiet/"
      });
      window.Quiet.addReadyCallback(
        () => setReady(true),
        (e: any) => setStatus(`Quiet.js error: ${e}`)
      );
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      txRef.current?.destroy();
      rxRef.current?.destroy();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [ready]);

  const checkMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      setStatus('Доступ к микрофону запрещен. Пожалуйста, разрешите доступ.');
      return false;
    }
  };

  const setupAudioAnalyser = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 32;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateVolume = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setVolumeLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      return true;
    } catch (err) {
      console.error('Audio setup error:', err);
      return false;
    }
  };

  const transmitToken = async () => {
    if (!ready) {
      setStatus("Quiet.js не готов");
      setMode('error');
      return;
    }
    
    if (!tokenId || !amount) {
      setStatus('Выберите токен для передачи');
      setMode('error');
      return;
    }
    
    setMode('send');
    setStatus('Передача токена ультразвуком...');
    
    txRef.current = window.Quiet.transmitter({
      profile: 'ultrasonic-experimental',
      onFinish: () => {
        setStatus('Передача завершена!');
        setMode('done');
        txRef.current?.destroy();
        onSuccess?.();
      }
    });
    
    const payload = JSON.stringify({ token_id: tokenId, amount });
    txRef.current.transmit(window.Quiet.str2ab(payload));
  };

  const receiveToken = async () => {
    if (!ready) {
      setStatus("Quiet.js не готов");
      setMode('error');
      return;
    }
    
    const hasAccess = await checkMicrophoneAccess();
    if (!hasAccess) {
      setMode('error');
      return;
    }
    
    const audioSetupSuccess = await setupAudioAnalyser();
    if (!audioSetupSuccess) {
      setStatus('Ошибка настройки аудио');
      setMode('error');
      return;
    }
    
    setHasMicAccess(true);
    setMode('receive');
    setStatus('Слушаем ультразвук...');
    
    rxRef.current = window.Quiet.receiver({
      profile: 'ultrasonic-experimental',
      onReceive: (buf: ArrayBuffer) => {
        try {
          const str = window.Quiet.ab2str(buf);
          const data = JSON.parse(str);
          setStatus(`Токен получен: ${data.amount}₽`);
          setMode('done');
          rxRef.current?.destroy();
          onSuccess?.(data);
        } catch (err) {
          setStatus("Ошибка декодирования");
          setMode('error');
          rxRef.current?.destroy();
        }
      },
      onCreateFail: (err: any) => {
        setStatus(`Ошибка приемника: ${err}`);
        setMode('error');
      }
    });
  };

  const stopAll = () => {
    setMode('idle');
    setStatus('');
    setVolumeLevel(0);
    cancelAnimationFrame(animationFrameRef.current);
    txRef.current?.destroy();
    rxRef.current?.destroy();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  return (
    <div className="card sonic">
      <h2>Передача токена ультразвуком</h2>
      {!ready && <div className="info">Загрузка Quiet.js…</div>}
      
      {mode === 'idle' && (
        <div className="sonic-controls">
          <button 
            onClick={transmitToken} 
            disabled={!tokenId || !ready}
          >
            Передать
          </button>
          <button 
            onClick={receiveToken} 
            disabled={!ready}
          >
            Слушать
          </button>
        </div>
      )}
      
      {(mode === 'send' || mode === 'receive') && (
        <div>
          <div className="info">{status}</div>
          {mode === 'receive' && hasMicAccess && (
            <div style={{
              height: '20px',
              width: '100%',
              backgroundColor: '#eee',
              margin: '10px 0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  height: '100%',
                  width: `${volumeLevel}%`,
                  backgroundColor: volumeLevel > 30 ? '#4CAF50' : '#FFC107',
                  transition: 'width 0.1s ease'
                }}
              />
            </div>
          )}
          <button onClick={stopAll}>Отмена</button>
        </div>
      )}
      
      {mode === 'done' && (
        <div>
          <div className="info" style={{ color: 'green' }}>{status}</div>
          <button onClick={stopAll}>Закрыть</button>
        </div>
      )}
      
      {mode === 'error' && (
        <div>
          <div className="info error">{status}</div>
          <button onClick={stopAll}>Закрыть</button>
        </div>
      )}
    </div>
  );
}
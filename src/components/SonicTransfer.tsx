// ========== SonicTransfer.tsx  (полный файл) ==========
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useTelegram } from '../hooks/useTelegram';
import '../styles/Components/SonicTransfer.css';
import { isIOSWebView } from '../utils/device';

declare global {
  interface Window {
    Quiet: {
      init: (opt: { profilesPrefix: string; memoryInitializerPrefix: string }) => void;
      addReadyCallback: (ok: () => void, fail: (e: any) => void) => void;
      addProfile: (name: string, prof: any) => void;
      transmitter: (opt: any) => any;
      receiver: (opt: any) => any;
      str2ab: (str: string) => ArrayBuffer;
      ab2str: (buf: ArrayBuffer) => string;
    };
    webkitAudioContext: typeof AudioContext;
    isIOS: boolean;
    isTelegram: boolean;
  }
}

type Props = {
  tokenId:  string | null;
  amount:   number | null;
  onSuccess?: (receivedToken?: any) => void;
};

/* ——— профиль 15 кГц (слышно лёгкий писк) ——— */
const PROFILE = {
  ultrasonic15: {
    mod_scheme: 'gmsk',
    checksum_scheme: 'crc32',
    inner_fec_scheme: 'v27',
    outer_fec_scheme: 'none',
    frame_length: 34,
    modulation: { center_frequency: 15000, gain: 0.20 },
    interpolation: {
      shape: 'rrcos', samples_per_symbol: 14,
      symbol_delay: 4, excess_bandwidth: 0.35
    },
    encoder_filters: { dc_filter_alpha: 0.01 },
    resampler: { delay: 13, bandwidth: 0.45, attenuation: 60, filter_bank_size: 64 }
  }
};
const PROFILE_NAME = 'ultrasonic15';

export function SonicTransfer({ tokenId, amount, onSuccess }: Props) {
  const { showPopup } = useTelegram();

  /* ------------- state ----------------- */
  const [mode,setMode]        = useState<'idle'|'send'|'receive'|'done'|'error'>('idle');
  const [status,setStatus]    = useState('');
  const [txLevel,setTxLevel]  = useState(0);    // для эквалайзера TX
  const [rxLevel,setRxLevel]  = useState(0);    // эквалайзер RX
  const [ready,setReady]      = useState(false);

  /* ------------- refs ------------------ */
  const txRef  = useRef<any>();  const rxRef  = useRef<any>();
  const ctxRef = useRef<AudioContext|null>(null);
  const anaTx  = useRef<AnalyserNode|null>(null);
  const anaRx  = useRef<AnalyserNode|null>(null);
  const raf    = useRef<number>(0);

  const audioOK = !!(window.AudioContext||window.webkitAudioContext);
  const micOK   = !!navigator.mediaDevices?.getUserMedia && !isIOSWebView();

  /* ===== Quiet ready detect (postMessage + polling) ================= */
  useEffect(()=>{
    const h=(e:MessageEvent)=>e.data==='quiet-ready'&&setReady(true);
    window.addEventListener('message',h); return()=>window.removeEventListener('message',h);
  },[]);
  useEffect(()=>{
    const poll=()=>{ if(window.Quiet?.transmitter) setReady(true); else setTimeout(poll,300);};
    poll();
  },[]);
  /* регистрируем профиль один раз */
  useEffect(()=>{ if(ready){ try{ window.Quiet.addProfile(PROFILE_NAME,PROFILE.ultrasonic15);}catch{} } },[ready]);

  /* ===== helpers ==================================================== */
  const ensureCtx = useCallback(async()=>{
    if(!ctxRef.current){
      const AC=window.AudioContext||window.webkitAudioContext;
      ctxRef.current=new AC();
    }
    if(ctxRef.current.state==='suspended') await ctxRef.current.resume();
    return true;
  },[]);

  /* ===== cleanup ==================================================== */
  const stopAnim = ()=>{ cancelAnimationFrame(raf.current); setTxLevel(0); setRxLevel(0); };
  const cleanup  = ()=>{
    stopAnim();
    txRef.current?.destroy(); rxRef.current?.destroy();
    if(ctxRef.current && ctxRef.current.state!=='closed'){
      ctxRef.current.close().catch(()=>{}); }
    ctxRef.current=null;
    setMode('idle'); setStatus('');
  };
  useEffect(()=>()=>cleanup(),[]);

  /* ===== transmit =================================================== */
  const transmit = useCallback(async()=>{
    if(!ready){ showPopup({title:'Ошибка',message:'Аудио-модуль ещё не готов'}); return; }
    if(!tokenId||typeof amount!=='number'||isNaN(amount)){
      showPopup({title:'Ошибка',message:'Выберите токен'}); return;
    }

    setMode('send'); setStatus('Идёт передача…');
    try{
      await ensureCtx(); const ctx=ctxRef.current!;
      /* анализатор громкости для визуала */
      anaTx.current = ctx.createAnalyser(); anaTx.current.fftSize = 32;
      const silent = ctx.createGain(); silent.gain.value = 0;
      silent.connect(anaTx.current).connect(ctx.destination);

      txRef.current?.destroy();
      txRef.current = window.Quiet.transmitter({
        profile: PROFILE_NAME,
        onCreateFail:(e:any)=>{throw e;},
        onFinish:()=>{
          setMode('done'); setStatus('Передача завершена'); onSuccess?.(); cleanup();
        }
      });
      txRef.current.setAudioDestination(silent);

      await new Promise(r=>setTimeout(r,100));
      const payload=JSON.stringify({token_id:String(tokenId),amount:Number(amount),ts:Date.now()});
      txRef.current.transmit(window.Quiet.str2ab(payload));

      /* эквалайзер */
      const buf=new Uint8Array(anaTx.current.frequencyBinCount);
      const draw=()=>{ anaTx.current!.getByteFrequencyData(buf);
        setTxLevel(buf.reduce((s,v)=>s+v,0)/buf.length);
        if(mode==='send') raf.current=requestAnimationFrame(draw);
      }; draw();

    }catch(e:any){
      setMode('error'); setStatus('Ошибка передачи');
      showPopup({title:'Ошибка передачи',message:e?.message||'Не удалось передать'}); cleanup();
    }
  },[ready,tokenId,amount,ensureCtx,onSuccess,showPopup,mode]);

  /* ===== receive ==================================================== */
  const receive = useCallback(async()=>{
    if(!ready){ showPopup({title:'Ошибка',message:'Аудио-модуль ещё не готов'}); return; }
    if(!micOK){ showPopup({title:'Микрофон недоступен',message:'Используйте Safari'}); return; }

    setMode('receive'); setStatus('Ожидание токена…');
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      await ensureCtx(); const ctx=ctxRef.current!;
      const src=ctx.createMediaStreamSource(stream);
      anaRx.current=ctx.createAnalyser(); anaRx.current.fftSize=32; src.connect(anaRx.current);

      rxRef.current = window.Quiet.receiver({
        profile: PROFILE_NAME,
        onCreateFail:(e:any)=>{throw e;},
        onReceive:(ab:ArrayBuffer)=>{
          try{
            const str = window.Quiet.ab2str(ab);
            const data=JSON.parse(str);
            if(data.token_id&&data.amount){
              setMode('done'); setStatus('Токен получен!'); onSuccess?.(data); cleanup();
            }
          }catch{}
        }
      });

      const buf=new Uint8Array(anaRx.current.frequencyBinCount);
      const draw=()=>{ anaRx.current!.getByteFrequencyData(buf);
        setRxLevel(buf.reduce((s,v)=>s+v,0)/buf.length);
        if(mode==='receive') raf.current=requestAnimationFrame(draw);
      }; draw();

    }catch(e:any){
      setMode('error'); setStatus('Ошибка приёма');
      showPopup({title:'Ошибка приёма',message:e?.message||'Не удалось получить'}); cleanup();
    }
  },[ready,micOK,ensureCtx,onSuccess,showPopup,mode]);

  /* ===== Safari-receiver redirect =================================== */
  const openSafariReceiver = () =>{
    if(!tokenId||typeof amount!=='number') return;
    const url=`https://zvukpay.link/receiver.html`+
              `?bot=YOUR_BOT_USERNAME&token_id=${tokenId}&amount=${amount}`;
    Telegram.WebApp.openLink(url,{try_instant_view:true});
  };

  /* ===== render ===================================================== */
  if(!audioOK){
    return <div className="sonic-error">Браузер не поддерживает Web-Audio</div>;
  }

  return(
    <div className={`sonic-transfer ${mode!=='idle'?'sonic-active':''}`}>
      <h2 className="sonic-title">Ультразвуковая передача</h2>

      <div className="sonic-controls">
        {mode==='idle' && (
          <>
            <button className="sonic-btn primary"
              onClick={transmit} disabled={!tokenId||typeof amount!=='number'}>
              📤 Передать токен
            </button>

            {!isIOSWebView() ? (
              <button className="sonic-btn secondary" onClick={receive} disabled={!micOK}>
                📥 Получить токен
              </button>
            ) : (
              <button className="sonic-btn secondary" onClick={openSafariReceiver}>
                📥 Получить (Safari)
              </button>
            )}
          </>
        )}

        {(mode==='send'||mode==='receive') && (
          <>
            <div className="sonic-status">{status}</div>
            <div className="sonic-eq">
              {Array.from({length:10}).map((_,i)=>(
                <div key={i} className={'bar'+(
                  mode==='send' ? (txLevel/10>i?' on':'') : (rxLevel/10>i?' on':''))}/>
              ))}
            </div>
            <button className="sonic-btn cancel" onClick={cleanup}>Отмена</button>
          </>
        )}

        {mode==='done' && (
          <>
            <div className="sonic-status success">{status}</div>
            <button className="sonic-btn" onClick={cleanup}>Готово</button>
          </>
        )}

        {mode==='error' && (
          <>
            <div className="sonic-status error">{status}</div>
            <button className="sonic-btn" onClick={cleanup}>Понятно</button>
          </>
        )}
      </div>

      {isIOSWebView() && mode==='idle' && (
        <div className="ios-hint">⚠️ Приём звука доступен только в Safari.</div>
      )}
    </div>
  );
}

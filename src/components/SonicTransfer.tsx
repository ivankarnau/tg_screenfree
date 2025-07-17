// src/components/SonicTransfer.tsx
import React, {
  useRef, useState, useEffect, useCallback,
} from 'react';
import { useTelegram } from '../hooks/useTelegram';
import '../styles/Components/SonicTransfer.css';
import { isIOSWebView } from '../utils/device';

declare global {
  interface Window {
    Quiet:{
      addReadyCallback:(ok:()=>void, fail:(e:any)=>void)=>void;
      addProfile:(name:string, p:any)=>void;
      transmitter:(opt:any)=>any;
      receiver:(opt:any)=>any;
      str2ab:(s:string)=>ArrayBuffer;
      ab2str:(b:ArrayBuffer)=>string;
    };
    webkitAudioContext: typeof AudioContext;
  }
}

type Props = {
  tokenId:string|null;
  amount:number|null;
  onSuccess?:(payload?:any)=>void;
};

/* ---------- профиль 15 кГц ---------- */
const PROFILE_NAME='ultrasonic15';
const PROFILE_15K={mod_scheme:'gmsk',checksum_scheme:'crc32',
  inner_fec_scheme:'v27',outer_fec_scheme:'none',frame_length:34,
  modulation:{center_frequency:15000,gain:0.2},
  interpolation:{shape:'rrcos',samples_per_symbol:14,symbol_delay:4,excess_bandwidth:0.35}
};

export function SonicTransfer({tokenId,amount,onSuccess}:Props){
  const { showPopup } = useTelegram();

  /* ── UI-state ───────────────────────────────────────────── */
  const [mode,setMode]   = useState<'idle'|'send'|'receive'|'done'|'error'>('idle');
  const [status,setStat] = useState('');
  const [txLvl,setTx]    = useState(0);
  const [rxLvl,setRx]    = useState(0);
  const [ready,setReady] = useState(false);

  /* ── refs ──────────────────────────────────────────────── */
  const tx=useRef<any>(); const rx=useRef<any>();
  const ctx=useRef<AudioContext|null>(null);
  const anaTx=useRef<AnalyserNode>(); const anaRx=useRef<AnalyserNode>();
  const raf=useRef<number>(0);

  const audioOK=!!(window.AudioContext||window.webkitAudioContext);
  const micOK=!!navigator.mediaDevices?.getUserMedia && !isIOSWebView();

  /* ── Quiet ready ───────────────────────────────────────── */
  useEffect(()=>{
    const h=(e:MessageEvent)=>e.data==='quiet-ready'&&setReady(true);
    window.addEventListener('message',h);return()=>window.removeEventListener('message',h);
  },[]);
  useEffect(()=>{
    const t=()=>{ if(window.Quiet?.transmitter){setReady(true);} else setTimeout(t,300); };
    t();
  },[]);
  useEffect(()=>{ if(ready){try{window.Quiet.addProfile(PROFILE_NAME,PROFILE_15K);}catch{}} },[ready]);

  /* ── helpers ───────────────────────────────────────────── */
  const ensureCtx=useCallback(async()=>{
    if(!ctx.current){
      const AC=window.AudioContext||window.webkitAudioContext;
      ctx.current=new AC();
    }
    if(ctx.current.state==='suspended') await ctx.current.resume();
    return ctx.current;
  },[]);

  const stopAnim=()=>{ cancelAnimationFrame(raf.current); setTx(0); setRx(0); };
  const cleanup=()=>{ stopAnim(); tx.current?.destroy(); rx.current?.destroy();
    if(ctx.current && ctx.current.state!=='closed') ctx.current.close().catch(()=>{});
    ctx.current=null; setMode('idle'); setStat('');
  };
  useEffect(()=>()=>cleanup(),[]);

  /* ── transmit ─────────────────────────────────────────── */
  const startTx=useCallback(async()=>{
    if(!ready){showPopup({title:'Ошибка',message:'Quiet не готов'});return;}
    if(!tokenId||typeof amount!=='number'){showPopup({title:'Ошибка',message:'Выберите токен'});return;}

    setMode('send'); setStat('Идёт передача…');
    try{
      const audio=await ensureCtx();
      anaTx.current=audio.createAnalyser(); anaTx.current.fftSize=32;
      const silent=audio.createGain(); silent.gain.value=0;
      silent.connect(anaTx.current).connect(audio.destination);

      tx.current=window.Quiet.transmitter({
        profile:PROFILE_NAME,
        onFinish:()=>{ setMode('done'); setStat('Передача завершена'); onSuccess?.(); cleanup(); },
        onCreateFail:(e:any)=>{ throw e; }
      });
      await new Promise(r=>setTimeout(r,100));
      tx.current.transmit(window.Quiet.str2ab(JSON.stringify({
        token_id:tokenId,amount,ts:Date.now()
      })));

      const buf=new Uint8Array(anaTx.current.frequencyBinCount);
      const draw=()=>{ anaTx.current!.getByteFrequencyData(buf);
        setTx(buf.reduce((s,v)=>s+v,0)/buf.length); raf.current=requestAnimationFrame(draw); };
      draw();

    }catch(e:any){
      setMode('error'); setStat('Ошибка передачи');
      showPopup({title:'Ошибка передачи',message:e?.message||'Не удалось передать'}); cleanup();
    }
  },[ready,tokenId,amount,ensureCtx,onSuccess,showPopup]);

  /* ── receive ──────────────────────────────────────────── */
  const startRx=useCallback(async()=>{
    if(!ready){showPopup({title:'Ошибка',message:'Quiet не готов'});return;}
    if(!micOK){showPopup({title:'Микрофон недоступен',message:'Используйте Safari'});return;}

    setMode('receive'); setStat('Ожидание токена…');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const audio=await ensureCtx();
      const src=audio.createMediaStreamSource(stream);
      anaRx.current=audio.createAnalyser(); anaRx.current.fftSize=32; src.connect(anaRx.current);

      rx.current=window.Quiet.receiver({
        profile:PROFILE_NAME,
        onCreateFail:(e:any)=>{throw e;},
        onReceive:(ab:ArrayBuffer)=>{
          try{
            const data=JSON.parse(window.Quiet.ab2str(ab));
            if(data.token_id&&data.amount){
              setMode('done'); setStat('Токен получен!'); onSuccess?.(data); cleanup();
            }
          }catch{}
        }
      });

      const buf=new Uint8Array(anaRx.current.frequencyBinCount);
      const draw=()=>{ anaRx.current!.getByteFrequencyData(buf);
        setRx(buf.reduce((s,v)=>s+v,0)/buf.length); raf.current=requestAnimationFrame(draw); };
      draw();

    }catch(e:any){
      setMode('error'); setStat('Ошибка приёма');
      showPopup({title:'Ошибка приёма',message:e?.message||'Не удалось получить'}); cleanup();
    }
  },[ready,micOK,ensureCtx,onSuccess,showPopup]);

  /* ── Safari-redirect ─────────────────────────────────── */
  const openSafari=()=>{
    if(!tokenId||!amount) return;
    const url=`https://zvukpay.link/receiver.html?bot=YOUR_BOT&token_id=${tokenId}&amount=${amount}`;
    Telegram.WebApp.openLink(url,{try_instant_view:true});
  };

  /* ── render ───────────────────────────────────────────── */
  if(!audioOK) return <div className="sonic-error">Web-Audio не поддерживается</div>;

  return(
    <div className={`sonic-transfer ${mode!=='idle'?'sonic-active':''}`}>
      <h2 className="sonic-title">Ультразвуковая передача</h2>

      {mode==='idle' && (
        <div className="btn-row">
          <button className="sonic-btn primary"
                  disabled={!tokenId||!amount}
                  onClick={startTx}>📤 Передать токен</button>

          {!isIOSWebView() ? (
            <button className="sonic-btn secondary"
                    onClick={startRx}
                    disabled={!micOK}>📥 Получить токен</button>
          ):(
            <button className="sonic-btn secondary"
                    onClick={openSafari}>📥 Получить (Safari)</button>
          )}
        </div>
      )}

      {(mode==='send'||mode==='receive') && (
        <>
          <div className="sonic-status">{status}</div>
          <div className="sonic-eq">
            {Array.from({length:10}).map((_,i)=>(
              <div key={i}
                   className={'bar'+((mode==='send'?txLvl:rxLvl)/10>i?' on':'')}/>
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

      {isIOSWebView() && mode==='idle' &&
        <div className="ios-hint">⚠️ Приём возможен только через Safari-страницу</div>}
    </div>
  );
}

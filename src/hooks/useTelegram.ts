import { useEffect, useState, useCallback } from 'react';
import { WebApp } from '@twa-dev/types';

declare global {
  interface Window {
    Telegram: {
      WebApp: WebApp;
    };
    Quiet: {
      init: (options: { profilesPrefix: string; memoryInitializerPrefix: string }) => void;
      addReadyCallback: (success: () => void, error: (e: any) => void) => void;
      transmitter: (options: any) => any;
      receiver: (options: any) => void;
      str2ab: (str: string) => ArrayBuffer;
      ab2str: (buf: ArrayBuffer) => string;
    };
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = () => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        setWebApp(tg);
        setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
      }
      setIsInitialized(true);
    };

    if (window.Telegram?.WebApp) {
      init();
    } else {
      // Если WebApp не загружен, ждем немного и пробуем снова
      const timer = setTimeout(() => {
        if (window.Telegram?.WebApp) {
          init();
        } else {
          setIsInitialized(true);
          console.warn('Telegram WebApp not detected');
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  const useMainButton = (
    onClick: () => void,
    options?: {
      text?: string;
      progress?: boolean;
      color?: string;
      textColor?: string;
    }
  ) => {
    useEffect(() => {
      if (!webApp) return;

      const { MainButton } = webApp;
      MainButton.setText(options?.text || 'Подтвердить');
      MainButton.onClick(onClick);
      
      if (options?.progress) {
        MainButton.showProgress();
      } else {
        MainButton.show();
      }

      return () => {
        MainButton.offClick(onClick);
        MainButton.hide();
        MainButton.showProgress(false);
      };
    }, [webApp, onClick, options]);
  };

  const useRequestPermission = (permission: 'microphone' | 'camera' | 'geolocation') => {
    const request = useCallback(async () => {
      if (!webApp || !isIos) return false;
      
      try {
        return await webApp.requestPermission(permission);
      } catch (error) {
        console.error(`Permission error:`, error);
        return false;
      }
    }, [webApp, isIos]);

    return { request };
  };

  const useQuiet = () => {
    const [isQuietReady, setIsQuietReady] = useState(false);
    const [quietError, setQuietError] = useState<string | null>(null);

    useEffect(() => {
      if (!window.Quiet || isQuietReady) return;

      window.Quiet.init({
        profilesPrefix: "/quiet/",
        memoryInitializerPrefix: "/quiet/"
      });

      window.Quiet.addReadyCallback(
        () => setIsQuietReady(true),
        (error) => setQuietError(`Quiet.js error: ${error}`)
      );
    }, [isQuietReady]);

    useEffect(() => {
      if (!isIos) return;

      const handleMessage = (e: MessageEvent) => {
        if (e.data === 'quiet-loaded') {
          setIsQuietReady(true);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [isIos]);

    return { isQuietReady, quietError };
  };

  const showPopup = useCallback(async (params: {
    title: string;
    message: string;
    buttons?: { id: string; text: string; type?: 'default' | 'ok' | 'close' | 'destructive' }[];
  }) => {
    if (!webApp) {
      // Fallback для тестирования вне Telegram
      alert(`${params.title}\n${params.message}`);
      return { id: 'browser_fallback' };
    }
    
    try {
      return await webApp.showPopup({
        title: params.title,
        message: params.message,
        buttons: params.buttons?.map(b => ({
          id: b.id,
          type: b.type || 'default',
          text: b.text
        }))
      });
    } catch (error) {
      console.error('Popup error:', error);
      return null;
    }
  }, [webApp]);

  const closeApp = useCallback(() => {
    webApp?.close();
  }, [webApp]);

  return {
    webApp,
    isIos,
    isInitialized,
    user: webApp?.initDataUnsafe?.user,
    themeParams: webApp?.themeParams,
    useMainButton,
    useRequestPermission,
    useQuiet,
    showPopup,
    closeApp
  };
}

export const useTelegramEffect = useEffect;
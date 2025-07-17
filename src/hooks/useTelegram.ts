import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          showProgress: (show: boolean) => void;
          isVisible: boolean;
          text: string;
        };
        requestPermission: (permission: string) => Promise<boolean>;
        showPopup: (params: { 
          title: string; 
          message: string; 
          buttons?: { id: string; type: 'default' | 'ok' | 'close' | 'destructive'; text: string }[] 
        }) => Promise<{ button_id: string | null }>;
        close: () => void;
        onEvent: (event: string, handler: () => void) => void;
        offEvent: (event: string, handler: () => void) => void;
        themeParams: Record<string, string>;
        backgroundColor: string;
      };
    };
    Quiet: {
      init: (options: { profilesPrefix: string; memoryInitializerPrefix: string }) => void;
      addReadyCallback: (success: () => void, error: (e: any) => void) => void;
      transmitter: (options: any) => any;
      receiver: (options: any) => any;
      str2ab: (str: string) => ArrayBuffer;
      ab2str: (buf: ArrayBuffer) => string;
    };
  }
}

/**
 * Полный хук для работы с Telegram WebApp
 */
export function useTelegram() {
  const [webApp, setWebApp] = useState<typeof window.Telegram.WebApp | null>(null);
  const [isIos, setIsIos] = useState(false);

  // Инициализация WebApp и проверка платформы
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    setWebApp(tg);
    setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  /**
   * Хук для основной кнопки с улучшенной типизацией
   */
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

  /**
   * Улучшенный хук для запроса разрешений с обработкой ошибок
   */
  const useRequestPermission = (permission: 'microphone' | 'camera' | 'geolocation') => {
    const request = useCallback(async () => {
      if (!webApp || !isIos) return false;
      
      try {
        const granted = await webApp.requestPermission(permission);
        console.log(`${permission} permission:`, granted);
        return granted;
      } catch (error) {
        console.error(`Permission error:`, error);
        return false;
      }
    }, [webApp, isIos]);

    return { request };
  };

  /**
   * Хук для работы с Quiet.js с обработкой состояния
   */
  const useQuiet = () => {
    const [isQuietReady, setIsQuietReady] = useState(false);
    const [quietError, setQuietError] = useState<string | null>(null);

    // Инициализация Quiet.js
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

    // Для iOS: обработка iframe
    useEffect(() => {
      if (!isIos) return;

      const handleMessage = (e: MessageEvent) => {
        if (e.data === 'quiet-loaded') {
          console.log('Quiet.js loaded in iframe');
          setIsQuietReady(true);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [isIos]);

    return { isQuietReady, quietError };
  };

  /**
   * Показ всплывающего окна с обработкой результата
   */
  const showPopup = useCallback(async (params: {
    title: string;
    message: string;
    buttons?: { id: string; text: string; type?: 'default' | 'ok' | 'close' | 'destructive' }[];
  }) => {
    if (!webApp) return null;
    
    try {
      const result = await webApp.showPopup({
        title: params.title,
        message: params.message,
        buttons: params.buttons?.map(b => ({
          id: b.id,
          type: b.type || 'default',
          text: b.text
        }))
      });
      return result;
    } catch (error) {
      console.error('Popup error:', error);
      return null;
    }
  }, [webApp]);

  /**
   * Закрытие мини-аппа с обработкой
   */
  const closeApp = useCallback(() => {
    if (!webApp) return;
    webApp.close();
  }, [webApp]);

  return {
    webApp,
    isIos,
    user: webApp?.initDataUnsafe?.user,
    themeParams: webApp?.themeParams,
    useMainButton,
    useRequestPermission,
    useQuiet,
    showPopup,
    closeApp
  };
}

/**
 * Алиас для обратной совместимости
 */
export const useEffect as useTelegramEffect } = useEffect;
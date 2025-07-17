export const isIOSWebView = (): boolean =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  navigator.userAgent.includes('Telegram') &&
  !navigator.mediaDevices?.getUserMedia;

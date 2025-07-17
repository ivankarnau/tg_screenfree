// vite.config.ts
import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import path             from 'path';

export default defineConfig({
  plugins: [react()],

  /* Где лежат статические файлы (quiet/*.js, *.mem, и т.д.)  */
  publicDir: 'public',

  /* Расширения, которые Vite должен копировать «как есть»   */
  assetsInclude: [
    '**/*.mem',    // quiet-emscripten.js.mem
    '**/*.json'    // quiet-profiles.json (если понадобится динамический import)
  ],

  /* Удобные алиасы — чтобы писать `import x from "@/…"`      */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  /* Настройки сборки (директория по-умолчанию dist/)         */
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },

  /* Dev-сервер + ваш CORS-доступ для Telegram Web-App        */
  server: {
    port: 5173,
    open: true,
    cors: {
      origin: 'https://tg-screenfree.vercel.app',
      credentials: true
    }
  }
});

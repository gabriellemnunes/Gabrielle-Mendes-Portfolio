import { getPlayback } from './netlify/functions/spotify.js';
import { loadEnv, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
export default defineConfig({ plugins: [{ name: 'local-spotify-api', configureServer(server) { server.middlewares.use('/.netlify/functions/spotify', async (req, res) => { const response = await getPlayback({ ...process.env, ...loadEnv('development', process.cwd(), '') }); res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value)); res.end(await response.text()); }); } }, { name: 'root-js-as-jsx', enforce: 'pre', async transform(code, id) { if (id.split('?')[0].replaceAll(String.fromCharCode(92), '/') === resolve('script.js').replaceAll(String.fromCharCode(92), '/')) { const { transformWithEsbuild } = await import('vite'); return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' }); } } }, react(), { name: 'copy-original-assets', closeBundle() { cpSync('assets', 'dist/assets', { recursive: true }); } }], optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } }, publicDir: false, build: { rollupOptions: { input: { main: resolve('index.html'), callback: resolve('callback/index.html') } } } });



// Execute localmente. O token é salvo apenas no arquivo ignorado .env.local.
import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const clientId = process.env.SPOTIFY_CLIENT_ID || 'bd0eaa4b0e964de9b5b528bdd9f9ce5f';
const redirectUri = 'http://127.0.0.1:8888/callback/';
const verifier = randomBytes(48).toString('base64url');
const state = randomBytes(24).toString('base64url');
const auth = new URL('https://accounts.spotify.com/authorize');
auth.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: 'user-read-currently-playing', state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') }).toString();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/callback/') { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  if(url.searchParams.get('state') !== state) { res.writeHead(400); res.end('Login inválido. Inicie novamente.'); return; }
  try {
    if(!url.searchParams.get('code')) throw new Error();
    const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: redirectUri, code_verifier: verifier }), signal: AbortSignal.timeout(10000) });
    if(!response.ok) throw new Error();
    const tokens = await response.json();
    if(!tokens.refresh_token) throw new Error();
    const previous = existsSync('.env.local') ? readFileSync('.env.local','utf8').split('\n').filter(line => !/^SPOTIFY_(CLIENT_ID|REFRESH_TOKEN)=/.test(line)).join('\n') : '';
    writeFileSync('.env.local', previous + '\nSPOTIFY_CLIENT_ID=' + clientId + '\nSPOTIFY_REFRESH_TOKEN=' + tokens.refresh_token + '\n', { mode: 0o600 });
    res.end('Conta conectada. Pode fechar esta aba e voltar ao portfólio. Para publicar, configure as duas variáveis do .env.local no Netlify. Não compartilhe esse arquivo.');
    console.log('Conta conectada. Credenciais salvas em .env.local (ignorado pelo Git).');
  } catch { res.writeHead(400); res.end('Não foi possível conectar. Execute o comando novamente.'); }
  finally { server.close(); }
});
server.listen(8888, '127.0.0.1', () => { console.log('Cadastre no Spotify Dashboard: ' + redirectUri); console.log('Abra este endereço para autorizar SUA conta:'); console.log(auth.href); });
setTimeout(() => server.close(), 10 * 60 * 1000).unref();

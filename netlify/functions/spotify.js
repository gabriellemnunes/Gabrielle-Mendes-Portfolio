// Somente esta função acessa o refresh token da autora.
let cached, cacheUntil = 0, accessToken, expiresAt = 0, pending, blockedUntil = 0;
const reply = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': status === 200 ? 'public, max-age=15, s-maxage=15' : 'no-store', ...extra } });
export async function getPlayback(env = process.env) {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const refreshToken = env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !refreshToken) return reply({ status: 'not_configured' }, 503);
  if (Date.now() < blockedUntil) return reply({ status: 'rate_limited' }, 429, { 'Retry-After': String(Math.ceil((blockedUntil - Date.now()) / 1000)) });
  if (cached && Date.now() < cacheUntil) return reply(cached);
  if (!pending) pending = (async () => {
    if (!accessToken || Date.now() > expiresAt - 60000) {
      const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }), signal: AbortSignal.timeout(8000) });
      if (response.status === 429) { blockedUntil = Date.now() + Number(response.headers.get('Retry-After') || 60) * 1000; throw new Error('rate_limited'); }
      if (!response.ok) throw new Error('authorization_required');
      const tokens = await response.json();
      accessToken = tokens.access_token;
      expiresAt = Date.now() + tokens.expires_in * 1000;
    }
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(8000) });
    if (response.status === 429) { blockedUntil = Date.now() + Number(response.headers.get('Retry-After') || 60) * 1000; throw new Error('rate_limited'); }
    if (response.status === 401) { accessToken = null; throw new Error('authorization_required'); }
    if (response.status !== 204 && !response.ok) throw new Error('upstream_unavailable');
    const playback = response.status === 204 ? null : await response.json();
    const track = playback?.item;
    cached = track && playback.is_playing ? { title: track.name, detail: track.artists?.map(artist => artist.name).join(', ') || track.show?.name || 'Spotify', cover: track.album?.images?.[0]?.url || track.images?.[0]?.url || null, url: track.external_urls?.spotify || null, playing: true } : { playing: false };
    cacheUntil = Date.now() + 15000;
    return cached;
  })();
  try { return reply(await pending); }
  catch { return Date.now() < blockedUntil ? reply({ status: 'rate_limited' }, 429, { 'Retry-After': String(Math.ceil((blockedUntil - Date.now()) / 1000)) }) : reply({ status: 'unavailable' }, 503); }
  finally { pending = null; }
}
export default async request => request.method === 'GET' ? getPlayback() : reply({ status: 'method_not_allowed' }, 405, { Allow: 'GET' });

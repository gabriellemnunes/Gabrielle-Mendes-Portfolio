const header = document.querySelector('#site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');

// Navbar fixa: muda levemente ao sair do topo.
const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

// Menu hambúrguer para tablet/mobile.
menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
});

// Fecha o menu após escolher uma seção. O scroll suave é definido no CSS.
navigation.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
  });
});

// Fecha o menu após escolher uma seção. O scroll suave é definido no CSS.
navigation.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
  });
});

// Template visual: impede envio real até você conectar um serviço de formulário.
const contactForm = document.querySelector('.contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}

// API do GitHub: carrega os projetos selecionados no portfólio.
const githubProjects = document.querySelector('#github-projects');
const featuredProjects = ['Gabrielle-Mendes-Portfolio', 'A.P.S---Acervo-de-Projetos-Senac'];

if (githubProjects) {
  fetch('https://api.github.com/users/gabriellemnunes/repos')
    .then((response) => response.json())
    .then((repositories) => {
      const filteredProjects = repositories.filter((repo) => featuredProjects.includes(repo.name));

      filteredProjects.forEach((repo) => {
        const card = document.createElement('article');
        card.classList.add('github-project-card');

        card.innerHTML = `
          <h3>${repo.name}</h3>
          <p>${repo.description || 'Projeto disponível no meu GitHub.'}</p>
          <span>${repo.language || 'Projeto'}</span>
          <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">Ver no GitHub →</a>
        `;

        githubProjects.appendChild(card);
      });
    })
    .catch((error) => {
      console.error('Erro ao carregar os projetos do GitHub:', error);
    });
}

// Spotify API: cole aqui somente o Client ID público. Nunca use o Client Secret.
const spotifyClientId = 'bd0eaa4b0e964de9b5b528bdd9f9ce5f';
const spotifyRedirectUri = window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5500/callback/'
  : `${window.location.origin}/callback/`;
const spotifyScope = 'user-read-currently-playing';
const spotifyRefreshInterval = 10000;

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));

  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);S

  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const spotifyLogin = document.querySelector('#spotify-login');
const spotifyCover = document.querySelector('#spotify-cover');
const spotifyTrack = document.querySelector('#spotify-track');
const spotifyArtist = document.querySelector('#spotify-artist');

const setSpotifyText = (track, artist) => {
  spotifyTrack.textContent = track;
  spotifyArtist.textContent = artist;
};

const saveSpotifyTokens = (tokens) => {
  const currentRefreshToken = localStorage.getItem('spotify_refresh_token');
  localStorage.setItem('spotify_access_token', tokens.access_token);
  localStorage.setItem('spotify_token_expires_at', String(Date.now() + (tokens.expires_in * 1000)));
  localStorage.setItem('spotify_refresh_token', tokens.refresh_token || currentRefreshToken || '');
};

const requestSpotifyToken = async (params) => {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: spotifyClientId, ...params })
  });

  if (!response.ok) throw new Error(`Spotify token: ${response.status}`);
  const tokens = await response.json();
  saveSpotifyTokens(tokens);
  return tokens.access_token;
};

const getSpotifyAccessToken = async () => {
  const accessToken = localStorage.getItem('spotify_access_token');
  const expiresAt = Number(localStorage.getItem('spotify_token_expires_at'));

  if (accessToken && Date.now() < expiresAt - 60000) return accessToken;

  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  return requestSpotifyToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
};

const updateSpotifyPlayer = async () => {
  try {
    const accessToken = await getSpotifyAccessToken();
    if (!accessToken) return;

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.status === 204) {
      setSpotifyText('Spotify', 'Nada tocando agora');
      return;
    }

    if (!response.ok) throw new Error(`Spotify player: ${response.status}`);
    const playback = await response.json();

    if (!playback.item) {
      setSpotifyText('Spotify', 'Nada tocando agora');
      return;
    }

    setSpotifyText(
      playback.item.name,
      playback.item.artists.map((artist) => artist.name).join(', ')
    );

    const coverUrl = playback.item.album?.images?.[0]?.url;
    if (coverUrl) {
      spotifyCover.src = coverUrl;
      spotifyCover.classList.add('has-cover');
    }
  } catch (error) {
    console.error('Erro ao atualizar o Spotify:', error);
    setSpotifyText('Spotify', 'Clique para reconectar');
  }
};

const finishSpotifyLogin = async () => {
  const query = new URLSearchParams(window.location.search);
  const code = query.get('code');
  const returnedState = query.get('state');
  const expectedState = localStorage.getItem('spotify_auth_state');

  if (!code) return;

  if (!returnedState || returnedState !== expectedState) {
    setSpotifyText('Spotify', 'Falha de segurança no login');
    return;
  }

  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  await requestSpotifyToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: spotifyRedirectUri,
    code_verifier: codeVerifier
  });

  localStorage.removeItem('spotify_code_verifier');
  localStorage.removeItem('spotify_auth_state');
  window.history.replaceState({}, document.title, window.location.pathname);
  await updateSpotifyPlayer();
};

const startSpotifyLogin = async () => {
  if (spotifyClientId === 'COLE_SEU_CLIENT_ID_AQUI') {
    setSpotifyText('Spotify', 'Insira o Client ID no script.js');
    return;
  }

  const codeVerifier = generateRandomString(64);
  const state = generateRandomString(32);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  localStorage.setItem('spotify_code_verifier', codeVerifier);
  localStorage.setItem('spotify_auth_state', state);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: spotifyClientId,
    scope: spotifyScope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: spotifyRedirectUri,
    state
  }).toString();

  window.location.href = authUrl.toString();
};

if (spotifyLogin) {
  spotifyLogin.addEventListener('click', startSpotifyLogin);
  spotifyLogin.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startSpotifyLogin();
    }
  });

  finishSpotifyLogin().catch((error) => {
    console.error('Erro ao concluir o login do Spotify:', error);
    setSpotifyText('Spotify', 'Não foi possível conectar');
  });

  updateSpotifyPlayer();
  window.setInterval(updateSpotifyPlayer, spotifyRefreshInterval);
}

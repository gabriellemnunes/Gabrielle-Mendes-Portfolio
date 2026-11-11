import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// O navegador recebe apenas os dados públicos da música, nunca credenciais.
function SpotifyPlayer() {
  const [player, setPlayer] = useState({ title: 'Spotify', detail: 'O que a Gabi está ouvindo' });
  useEffect(() => {
    let disposed = false, timer;
    const controller = new AbortController();
    const update = async () => {
      let delay = 30000;
      try {
        if (document.hidden) return;
        const response = await fetch('/.netlify/functions/spotify', { signal: controller.signal });
        if (response.status === 429) delay = Math.max(delay, Number(response.headers.get('Retry-After') || 60) * 1000);
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        if (!disposed) setPlayer(data.title ? data : { title: 'Spotify', detail: 'Gabi está offline agora' });
      } catch { if(!disposed) setPlayer({ title: 'Spotify', detail: 'Música indisponível agora' }); }
      finally { if(!disposed) timer = setTimeout(update, delay); }
    };
    // A consulta periódica continua ao retornar à aba, sem solicitar login.
    update();
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, []);
  return <div className="spotify-widget"><a className={"spotify-player " + (player.playing ? "is-playing" : "")} href={player.url || 'https://open.spotify.com/'} target="_blank" rel="noopener noreferrer" title={player.title === 'Spotify' ? player.detail : 'Gabi está ouvindo: ' + player.title + ' — ' + player.detail} aria-label={player.title === 'Spotify' ? player.detail : 'Gabi está ouvindo ' + player.title + ', ' + player.detail}>
    <img className="spotify-logo" src="/assets/icons/spotify.svg" alt="Spotify" />
    <span className="spotify-album"><span className="spotify-sleeve">{player.cover ? <img className="spotify-cover has-cover" src={player.cover} alt="Capa do álbum" /> : <svg viewBox="0 0 38 38" aria-hidden="true"><path d="M19 7 22 15 31 19 22 22 19 31 15 22 7 19 15 15Z" fill="currentColor" /></svg>}</span><span className="spotify-vinyl" /></span>
    <span className="spotify-info"><span id="spotify-track">{player.title}</span><span id="spotify-artist">{player.detail}</span></span>
  </a></div>;
}

// Imagens autorais associadas aos repositórios; novos projetos continuam vindo da API.
const projectPresentation = {
  'gabrielle-mendes-portfolio': { title: 'Gabrielle Mendes · Portfólio', image: 'portfolio.png' },
  'rickandmorty-app-fontes': { title: 'Rick and Morty', image: 'rick-and-morty.png', description: 'Consulta de personagens do universo de Rick and Morty, com busca e informações sobre cada personagem.' },
  'backend-recordar': { title: 'Recordar', image: 'recordar.png', description: 'Projeto Recordar, com telas de acesso para usuários, médicos e administradores.' }
};
function organizeGithubProjects(data) {
  const eligible = data.filter(repo => {
    const name = repo.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isAps = name.startsWith('aps') || name.includes('acervodeprojetossenac');
    const isFeatured = Object.hasOwn(projectPresentation, repo.name.toLowerCase()) || ['biblioteca', 'bibliotecafront'].includes(name);
    return !repo.fork && !repo.archived && !isAps && isFeatured;
  });
  const libraryRepos = eligible.filter(repo => ['biblioteca', 'biblioteca-front'].includes(repo.name.toLowerCase()));
  let libraryAdded = false;
  return eligible.flatMap(repo => {
    if (libraryRepos.includes(repo)) {
      if (libraryAdded) return [];
      libraryAdded = true;
      return [{ ...repo, id: 'biblioteca-completa', title: 'Biblioteca', image: 'biblioteca.png', description: 'Gerenciamento de um acervo de livros, com cadastro, consulta e organização. Front-end e back-end reunidos em um único projeto.', links: libraryRepos.map(item => ({ label: item.name.toLowerCase() === 'biblioteca-front' ? 'Front-end' : 'Back-end', url: item.html_url })) }];
    }
    return [{ ...repo, ...projectPresentation[repo.name.toLowerCase()], links: [{label: 'Ver projeto', url: repo.html_url}] }];
  }).slice(0,6);
}

// Atualiza na abertura, a cada cinco minutos e ao voltar à aba.
function GithubProjects({ filter, children }) {
  const [repos, setRepos] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false, running = false, nextRequest = 0;
    const load = async () => {
      if (document.hidden || running || Date.now() < nextRequest) return;
      running = true;
      try {
        const response = await fetch('https://api.github.com/users/gabriellemnunes/repos?sort=pushed&direction=desc&per_page=100&type=owner', {
          headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' }, signal: controller.signal, cache: 'no-cache'
        });
        if (!response.ok) {
          const reset = Number(response.headers.get('X-RateLimit-Reset')) * 1000;
          nextRequest = Math.max(Date.now() + Number(response.headers.get('Retry-After') || 60) * 1000, reset || 0);
          throw new Error('GitHub indisponível');
        }
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Resposta inválida');
        const projects = organizeGithubProjects(data);
        if (!disposed) { setRepos(projects); setStatus('ready'); }
        nextRequest = Date.now() + 60000;
      } catch { if (!disposed) setStatus('error'); }
      finally { running = false; }
    };
    load();
    const timer = setInterval(load, 300000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => { disposed = true; controller.abort(); clearInterval(timer); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); };
  }, [attempt]);
  const repositoryCards = repos.map(repo => <article className="project-card repository-card" key={repo.id} hidden={filter === 'Design'}>
      {repo.image ? <img className="project-preview" src={'/assets/projects/' + repo.image} alt={'Tela do projeto ' + repo.title} loading="lazy" decoding="async" /> : <div className="repository-cover" aria-hidden="true"><span className="repository-window"><i /><i /><i /></span><img src="/assets/icons/github.svg" alt="" /><span className="repository-monogram">{repo.name.split(/[-_.]+/).filter(Boolean).slice(0,2).map(word => word[0]).join('').toUpperCase()}</span><span className="repository-cover-label">código & criatividade</span></div>}
      <div className="project-info"><h3>{repo.title || repo.name.replaceAll('-', ' ')}</h3><p>{repo.description || 'Um projeto de desenvolvimento e aprendizado. Explore o código e os detalhes no GitHub.'}</p><ul className="project-tags"><li>{repo.language || 'CÓDIGO'}</li><li>GITHUB</li>{repo.topics?.slice(0,2).map(topic => <li key={topic}>{topic}</li>)}</ul><div className="project-actions">{repo.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.label + ' — ' + (repo.title || repo.name)}>{link.label} ↗</a>)}</div></div>
    </article>);
  const cards = [...React.Children.toArray(children).filter(card => !card.props.hidden), ...(filter === 'Design' ? [] : repositoryCards)];
  return <><div className="projects-grid">{cards}</div>
    {filter !== 'Design' && <div className="projects-sync" role="status" aria-live="polite">{status === 'loading' ? 'Buscando projetos recentes…' : status === 'error' ? <><span>Não foi possível atualizar o GitHub agora.</span> <button type="button" onClick={() => setAttempt(attempt + 1)}>Tentar novamente</button> <a href="https://github.com/gabriellemnunes" target="_blank" rel="noopener noreferrer">Ver no GitHub ↗</a></> : 'Projetos recentes sincronizados com o GitHub · atualização automática'}</div>}
  </>;
}


function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('home');
  const [filter, setFilter] = useState('Todos');
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 24);
    scroll(); window.addEventListener('scroll', scroll, { passive: true });
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if(entry.isIntersecting) setActive(entry.target.id); }); }, { rootMargin: '-20% 0px -45% 0px' });
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
    return () => { window.removeEventListener('scroll', scroll); observer.disconnect(); };
  }, []);
  return <><svg className="image-filter-definitions" width="0" height="0" aria-hidden="true" focusable="false"><defs><filter id="project-sharpness" colorInterpolationFilters="sRGB"><feConvolveMatrix order="3" kernelMatrix="0 -0.08 0 -0.08 1.32 -0.08 0 -0.08 0" preserveAlpha="true" /></filter></defs></svg><a className="skip-link" href="#main-content">Pular para o conteúdo</a><header className={`site-header ${scrolled ? "is-scrolled" : ""}`} id="site-header">
    <a className="brand" href="#home" aria-label="Ir para o início">
      <strong>Gabrielle Mendes</strong>
      <span>web developer</span>
    </a>

    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} type="button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="primary-navigation">
      <span></span><span></span><span></span>
    </button>

    <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} onClick={event => { if(event.target.closest("a")) setMenuOpen(false); }} onKeyDown={event => { if(event.key === "Escape") setMenuOpen(false); }} id="primary-navigation" aria-label="Navegação principal">
  <a href="#home" aria-current={active === 'home' ? 'location' : undefined}>home</a>
  <a href="#about" aria-current={active === 'about' ? 'location' : undefined}>about me</a>
  <a href="#projects" aria-current={active === 'projects' ? 'location' : undefined}>projects</a>
  <a href="#contact" aria-current={active === 'contact' ? 'location' : undefined}>contact</a>

  <SpotifyPlayer />
<a href="https://github.com/gabriellemnunes"
    aria-label="GitHub"
    target="_blank"
    rel="noopener noreferrer">
    <img src="./assets/icons/github.svg" alt="GitHub" />
  </a>

<a href="https://www.linkedin.com/in/gabrielle-mendes-a45684384/" aria-label="LinkedIn">
    <img src="assets/icons/linkedin.svg" alt="" />
</a>

<a
    href="https://mail.google.com/mail/?view=cm&fs=1&to=gabriellemendesn@gmail.com"
    aria-label="Enviar e-mail pelo Gmail"
    target="_blank"
    rel="noopener noreferrer">

     <img src="assets/icons/gmail.svg" alt="Ícone de um envelope representando o Gmail, exibido na navegação de contato do portfólio; não há texto ou ação representada." />
</a>


  </nav>
  </header>

  <main id="main-content">
    <section id="home" className="home-section section">
      <div className="home-content page-width">
        <img className="home-avatar" src="assets/images/avatar-gabi.png" alt="Ilustração de Gabrielle Mendes" />
        <div className="home-copy">
          
          <p className="eyebrow">DESENVOLVEDORA • RECIFE, PE • BRASIL</p>
          <h1>G<span>A</span>BI <b>!</b></h1>
          <p className="home-description">Desenvolvo interfaces digitais unindo design, tecnologia e experiências intuitivas.</p>
          <a className="welcome-button" href="#about">bem - vindo :)</a>
        </div>
      </div>
    </section>

    <section id="about" className="about-section section">
      <div className="page-width">
        <p className="section-kicker">sobre mim</p>
        <h2>About Me</h2>
        <div className="about-layout">
          <div className="about-text">
            
            <p>Olá! Sou Gabrielle Mendes, estudante de Análise e Desenvolvimento de Sistemas, apaixonada por tecnologia e design.</p>
            <p>Gosto de transformar ideias em interfaces funcionais e intuitivas, unindo desenvolvimento e criatividade.</p>
            <p>Atualmente, sigo aprimorando minhas habilidades por meio de projetos acadêmicos e pessoais, sempre buscando aprender e criar novas experiências digitais.</p>
          </div>
          
          <img className="about-photo" src="assets/images/foto-about.png" alt="Foto de Gabrielle Mendes" />
          <ul className="about-facts" aria-label="Informações resumidas">
    <li>
        <img src="assets/icons/location.svg" alt="" />
        <span>Recife, PE</span>
    </li>

    <li>
        <img src="assets/icons/education.svg" alt="" />
        <span>ANÁLISE E DESENVOLVIMENTO DE SISTEMAS</span>
    </li>

    <li>
        <img src="assets/icons/Vector.svg" alt="" />
        <span>FRONT-END<br />UI/UX DESIGN</span>
    </li>

    <li>
        <img src="assets/icons/calendar.svg" alt="" />
        <span>3º PERÍODO</span>
    </li>
</ul>
        </div>
      </div>
    </section>

    <section id="projects" className="projects-section section">
      <div className="page-width">
        <p className="section-kicker">meus trabalhos</p>
        <h2>Projects</h2>
        <div className="project-filters" role="group" aria-label="Filtrar projetos">{["Todos", "Design", "Desenvolvimento"].map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div><GithubProjects filter={filter}>
          <article className="project-card" hidden={filter !== 'Todos' && filter !== 'Design'}>
            <img src="assets/projects/Nutritea.png" alt="NutriTea" loading="lazy" decoding="async" />
            <div className="project-info">
              <h3>NutriTea</h3>
              <p>Plataforma voltada ao acompanhamento nutricional de pessoas com TEA, facilitando o registro e acompanhamento de seletividades alimentares.</p>
              <ul className="project-tags"><li>UI/UX</li><li>PROTOTIPAÇÃO</li><li>FIGMA</li></ul>
              <a target="_blank" rel="noopener noreferrer" className="project-link" href="https://www.figma.com/proto/nLvxYEHlVgCG5I61ZQiK55/NutriTEA?node-id=30-5751&page-id=0%3A1&starting-point-node-id=30%3A5751&t=YdFJkErOIQ1pMLzc-1" aria-label="Ver projeto NutriTea">Ver projeto ↗</a>
            </div>
          </article>

          <article className="project-card" hidden={filter !== 'Todos' && filter !== 'Design'}>
            <img className="batuka-image" src="assets/projects/batuka.png" alt="Batuka" loading="lazy" decoding="async" />
            <div className="project-info">
              <h3>Batuka</h3>
              <p>Plataforma de educação musical infantil que apresenta ritmos brasileiros de forma acessível, divertida e interativa.</p>
              <ul className="project-tags"><li>UI/UX</li><li>FIGMA</li><li>EDUCAÇÃO</li></ul>
              <a target="_blank" rel="noopener noreferrer" className="project-link" href="https://www.figma.com/proto/mGQLGTypwnc4e6wPo7arFz/Prot%C3%B3tipo-Kick-Off?node-id=370-108&page-id=0%3A1&starting-point-node-id=370%3A108&t=2N4MRq3V7j2GkabG-1" aria-label="Ver projeto Batuka">Ver projeto ↗</a>
            </div>
          </article>

          <article className="project-card" hidden={filter !== 'Todos' && filter !== 'Desenvolvimento'}>
            <img src="assets/projects/aps.png" alt="A.P.S — Acervo de Projetos Senac" loading="lazy" decoding="async" />
            <div className="project-info">
              <h3>A.P.S</h3>
              <p>Plataforma criada para centralizar e organizar projetos acadêmicos, facilitando o acesso e gerenciamento das produções do Senac.</p>
              <ul className="project-tags"><li>REACT</li><li>FASTAPI</li><li>MYSQL</li></ul>
              <a target="_blank" rel="noopener noreferrer" className="project-link" href="https://github.com/gabriellemnunes/A.P.S---Acervo-de-Projetos-Senac" aria-label="Ver projeto A.P.S">Ver projeto ↗</a>
            </div>
          </article>
        </GithubProjects>
  </div>
</section>

    <section id="contact" className="contact-section section">
      <div className="page-width">
        <p className="section-kicker">fale comigo</p>
        <h2>Contact</h2>
        <div className="contact-layout">
          <div className="contact-copy">
            <p className="contact-intro">Vamos criar algo<br /><em>com personalidade?</em></p>
            <p className="contact-description">Uma ideia, um projeto ou uma boa conversa. Me encontre por aqui.</p>
            <div className="contact-details">
              {[
                { name: 'E-mail', detail: 'gabriellemendesn@gmail.com', href: 'mailto:gabriellemendesn@gmail.com', icon: 'gmail' },
                { name: 'GitHub', detail: '@gabriellemnunes', href: 'https://github.com/gabriellemnunes', icon: 'github' },
                { name: 'LinkedIn', detail: 'Gabrielle Mendes', href: 'https://www.linkedin.com/in/gabrielle-mendes-a45684384/', icon: 'linkedin' }
              ].map(item => <a key={item.name} href={item.href} target={item.icon === 'gmail' ? undefined : '_blank'} rel={item.icon === 'gmail' ? undefined : 'noopener noreferrer'}>
                <span className="contact-icon"><img src={'/assets/icons/' + item.icon + '.svg'} alt="" /></span>
                <span className="contact-channel"><strong>{item.name}</strong><span>{item.detail}</span></span>
                <svg className="contact-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>
              </a>)}
            </div>
          </div>
          <div className="contact-art" aria-hidden="true">
            <svg className="contact-star" viewBox="0 0 100 100"><path d="m50 0 13 31 34-9-20 28 20 28-34-9-13 31-13-31-34 9 20-28L3 22l34 9Z" fill="currentColor" /></svg>
            <img src="assets/images/contact-character.png" alt="" />
            <span className="contact-art-caption">do Recife, com criatividade.</span>
          </div>
        </div>
      </div>
    </section>
  </main><footer className="site-footer"><span>© {new Date().getFullYear()} Gabrielle Mendes</span><span className="footer-note">design autoral & um pouco de café <img className="coffee-icon" src="/assets/icons/coffee.svg" alt="" aria-hidden="true" /></span><a className="back-to-top" href="#home">Voltar ao topo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg></a></footer></>;
}
createRoot(document.getElementById('root')).render(<App />);




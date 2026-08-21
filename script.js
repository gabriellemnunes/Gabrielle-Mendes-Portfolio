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

// Template visual: impede envio real até você conectar um serviço de formulário.
document.querySelector('.contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
});

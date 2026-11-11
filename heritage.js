// Original Nimba brand illustrations. These are not historical Baga symbols.
export function carvedIcon(name = 'story', className = '') {
  return `<img class="carved-icon ${className}" src="assets/icons/${name}.svg?v=2" alt="" aria-hidden="true">`;
}

export function initHeritage({getProducts, getLanguage, money, translate}) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold: 0.08}) : null;
  document.querySelectorAll('.chapter,.heritage-timeline,.heritage-reflection,.home-story,.home-shop-notes,.home-contact,.secondary-archive').forEach(node => {
    if (!revealObserver || reducedMotion.matches) return;
    node.classList.add('reveal-on-scroll');
    revealObserver.observe(node);
  });
  let index = 0;
  let paused = reducedMotion.matches;
  const host = document.querySelector('#hero-selection');
  function updateSelection(advance = false) {
    if (!host) return;
    const catalog = getProducts().filter(product => product.image);
    const featured = catalog.filter(product => product.featuredSlot).sort((a,b) => a.featuredSlot-b.featuredSlot);
    const products = (featured.length ? featured : catalog).slice(0,4);
    host.hidden = !products.length;
    if (!products.length) return;
    if (advance) index++;
    index %= products.length;
    const product = products[index];
    const language = getLanguage();
    const image = document.querySelector('#selection-image');
    const changed = image.getAttribute('src') !== product.image;
    image.src = product.image;
    if (changed && !reducedMotion.matches && image.animate) image.animate([{opacity:0.25},{opacity:1}],{duration:450});
    image.alt = product.name[language];
    document.querySelector('#selection-link').href = `shop.html?product=${encodeURIComponent(product.id)}`;
    document.querySelector('#selection-name').textContent = product.name[language];
    document.querySelector('#selection-price').textContent = money(product.price,product.currency);
    document.querySelector('#selection-pause').textContent = translate(paused ? 'playSelection' : 'pauseSelection');
    document.querySelector('#selection-pause').setAttribute('aria-pressed',String(paused));
    document.querySelector('#selection-pause').hidden = products.length < 2;
    document.querySelector('#selection-next').hidden = products.length < 2;
  }
  document.querySelector('#selection-pause')?.addEventListener('click', () => { paused = !paused; updateSelection(); });
  document.querySelector('#selection-next')?.addEventListener('click', () => updateSelection(true));
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      paused = true;
      document.querySelectorAll('.reveal-on-scroll').forEach(node => node.classList.add('is-revealed'));
      updateSelection();
    }
  });
  setInterval(() => {
    if (!paused && !document.hidden && !host?.matches(':hover,:focus-within')) updateSelection(true);
  }, 6500);
  return updateSelection;
}

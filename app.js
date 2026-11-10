import {products,liveProduct} from './catalog.js';
import {contactEmail} from './contact-config.js';
import {en,fr} from './locale.js';
import {mockup,escapeHtml} from './mockups.js';
import {checkout,loadCatalog} from './commerce.js';

const one = selector => document.querySelector(selector);
const cards = one('#products');
const filters = one('#filters');
const productDialog = one('#product-dialog');
const bagDialog = one('#bag-dialog');
const languageButton = one('#language');
const status = one('#status');
let catalog = [];
let live = false;
let lookup = new Map();
const staticCopy = [...document.querySelectorAll('[data-i]')].map(node => [node,node.textContent]);
const categories = ['all','tees','layers','polos','bottoms','accessories'];

function getSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key,JSON.stringify(value)); }
  catch { /* The current session still works. */ }
}
const savedCart = getSaved('nimba-bag',[]);
let storedLines = Array.isArray(savedCart) ? savedCart.filter(line =>
  typeof line?.id === 'string' && typeof line.size === 'string' &&
  Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99) : [];
let cart = storedLines.filter(line => lookup.has(line.id));
let language = getSaved('nimba-language','en') === 'fr' ? 'fr' : 'en';
let category = 'all';
let checkingOut = false;
const t = key => (language === 'fr' ? fr : en)[key];
const localized = text => text[language];
const sizeText = size => size === 'OS' ? t('os') : size;
const variantFor = line => lookup.get(line.id)?.variants?.[line.size];
const purchasable = (product,size) => !live || Boolean(product.variants?.[size]?.availableForSale);
const productDetails = product => [product.color?.[language], t(product.placement)].filter(Boolean).join(' · ');
const listDetails = product => [product.color?.[language], t(product.technique)].filter(Boolean).join(' · ');
const money = (amount, currency = 'USD') => amount == null ? '—' : new Intl.NumberFormat(
  language==='fr'?'fr-FR':'en-US', {style:'currency',currency}
).format(amount);

function renderFilters() {
  if (!filters) return;
  filters.innerHTML = categories.filter(key => key !== 'bottoms' || catalog.some(product => product.category === key)).map(key =>
    `<button type="button" data-filter="${key}" aria-pressed="${key===category}">${t(key)}</button>`).join('');
}
function renderProducts() {
  if (!cards) return;
  const featured = cards.hasAttribute('data-featured');
  const bySlot = catalog.filter(product => product.featuredSlot).sort((a,b) => a.featuredSlot-b.featuredSlot);
  const favorites = [0,3,6,8].map(index => lookup.get(products[index].id)).filter(Boolean);
  const display = featured ? (bySlot.length ? bySlot : [...new Set([...favorites,...catalog])]).slice(0,4) :
    catalog.filter(product => category === 'all' || category === product.category);
  cards.innerHTML = display.map(product => {
    const name = escapeHtml(localized(product.name));
    const id = escapeHtml(product.id);
    return `<article class="product-card"><a class="product-link" href="shop.html?product=${encodeURIComponent(product.id)}" data-product="${id}" aria-label="${t('detail')} ${name}">
      <span class="product-art"><span class="item-number">${String(catalog.indexOf(product)+1).padStart(2,'0')} / ${catalog.length}</span>
      ${mockup(product,localized(product.name))}
      <span class="product-open" aria-hidden="true">↗</span></span>
      <span class="product-text"><strong>${name}</strong><strong>${money(product.price,product.currency)}</strong></span>
      <span class="product-sub">${escapeHtml(listDetails(product))}</span>
    </a></article>`;
  }).join('') || `<p>${t(live?'noProducts':'catalogUnavailable')}</p>`;
}
function applyLanguage() {
  document.documentElement.lang = language;
  const page = document.body.dataset.page;
  document.title = t(page==='home'?'title':page+'Title');
  for (const [node,original] of staticCopy) node.textContent = t(node.dataset.i) ?? original;
  document.querySelectorAll('[data-label]').forEach(node => node.setAttribute('aria-label',t(node.dataset.label)));
  document.querySelectorAll('[data-alt]').forEach(node => node.alt = t(node.dataset.alt));
  languageButton.textContent = language==='fr'?'EN':'FR';
  languageButton.lang = language==='fr'?'en':'fr';
  languageButton.setAttribute('aria-label',language==='fr'?'Switch to English':'Passer en français');
  renderFilters();
  renderProducts();
}
function renderProduct(product) {
  const firstSize = product.sizes.find(size => purchasable(product,size));
  productDialog.innerHTML = `<button class="close" data-close aria-label="${t('close')}">×</button>
    <div class="detail-art">${mockup(product,localized(product.name))}</div>
    <form class="detail-copy" id="add-form"><p class="eyebrow">${t(product.technique) || ''}</p><h2 id="product-title">${escapeHtml(localized(product.name))}</h2>
    <p class="detail-price">${money(product.price,product.currency)}</p><p>${escapeHtml(productDetails(product))}</p>
    <fieldset><legend>${t('size')}</legend><div class="size-options">${product.sizes.map(size =>
      `<label><input type="radio" name="size" value="${escapeHtml(size)}" ${size===firstSize?'checked':''} ${purchasable(product,size)?'':'disabled'}><span>${escapeHtml(sizeText(size))}</span></label>`).join('')}</div></fieldset>
    <button type="submit" class="button red" ${firstSize?'':'disabled'}>${t(firstSize?'add':'soldOut')}</button></form>`;
  const updatePrice = size => {
    const variant = product.variants?.[size];
    productDialog.querySelector('.detail-price').textContent = variant ?
      money(variant.amount,variant.currency) : money(product.price,product.currency);
  };
  updatePrice(firstSize);
  productDialog.querySelector('fieldset').addEventListener('change',event => updatePrice(event.target.value));
  productDialog.querySelector('form').addEventListener('submit',event => {
    event.preventDefault();
    const size = new FormData(event.currentTarget).get('size');
    if (!product.sizes.includes(size) || !purchasable(product,size)) return;
    const existing = cart.find(line => line.id===product.id && line.size===size);
    if (existing) existing.quantity = Math.min(99,existing.quantity+1);
    else cart.push({id:product.id,size,quantity:1});
    updateBag();
    productDialog.close();
    bagDialog.showModal();
    status.textContent = t('added');
  });
}
function updateBag() {
  storedLines = [...storedLines.filter(line => !lookup.has(line.id)), ...cart];
  save('nimba-bag',storedLines);
  one('#count').textContent = cart.reduce((sum,line)=>sum+line.quantity,0);
  renderBag();
}
function renderBag() {
  const totals = new Map();
  for (const line of cart) {
    const variant = variantFor(line);
    const product = lookup.get(line.id);
    const currency = variant?.currency || product.currency || 'USD';
    const price = variant?.amount ?? product.price ?? 0;
    totals.set(currency,(totals.get(currency) || 0) + price * line.quantity);
  }
  const ready = live && cart.length && cart.every(line => variantFor(line)?.availableForSale);
  bagDialog.innerHTML = `<button class="close" data-close aria-label="${t('close')}">×</button><h2 id="bag-title">${t('bag') ?? 'Bag'}</h2>
    ${cart.length ? `<div class="bag-lines">${cart.map((line,index)=>{
      const product = lookup.get(line.id);
      return `<article class="bag-line"><div class="bag-art">${mockup(product,localized(product.name))}</div>
      <div><strong>${escapeHtml(localized(product.name))}</strong><p>${escapeHtml([product.color?.[language], sizeText(line.size)].filter(Boolean).join(' / '))}</p>
      ${live && !variantFor(line)?.availableForSale ? `<p>${t('soldOut')}</p>` : ''}
      <div class="quantity"><button data-line="${index}" data-change="-1" aria-label="${t('less')}">−</button><span aria-label="${t('quantity')}">${line.quantity}</span>
      <button data-line="${index}" data-change="1" aria-label="${t('more')}" ${line.quantity===99?'disabled':''}>+</button></div>
      <button class="remove" data-line="${index}" data-change="0">${t('remove')}</button></div>
      <strong>${money((variantFor(line)?.amount ?? product.price ?? 0)*line.quantity,variantFor(line)?.currency || product.currency)}</strong></article>`;
    }).join('')}</div>
    <div class="bag-total"><strong>${t('subtotal')}</strong><strong>${[...totals].map(([currency,amount]) => money(amount,currency)).join(' + ')}</strong></div>
    ${ready ? `<button class="button red" data-checkout ${checkingOut?'disabled':''}>${t(checkingOut?'loading':'checkout')}</button><p class="checkout-error" role="alert"></p>` : `<p class="checkout-note">${t(live?'bagUnavailable':'pending')}</p>`}`
    : `<p>${t('empty')}</p><button class="button red" data-close>${t('continue')}</button>`}`;
}
one('#language').addEventListener('click',()=>{
  language = language==='en'?'fr':'en';
  save('nimba-language',language);
  applyLanguage();
  renderBag();
});
filters?.addEventListener('click',event=>{
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  category = button.dataset.filter;
  for (const filter of filters.querySelectorAll('button')) filter.setAttribute('aria-pressed',String(filter===button));
  renderProducts();
});
function openProduct(product) {
  renderProduct(product);
  productDialog.showModal();
}
if (document.body.dataset.page === 'shop') {
  cards.addEventListener('click',event=>{
    const link = event.target.closest('[data-product]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openProduct(lookup.get(link.dataset.product));
  });
}
one('#bag').addEventListener('click',()=>bagDialog.showModal());
for (const dialog of [productDialog,bagDialog]) {
  dialog.addEventListener('click',event=>{
    if (event.target.closest('[data-close]')) dialog.close();
  });
}
bagDialog.addEventListener('click',async event=>{
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.line !== undefined && !checkingOut) {
    const index = Number(button.dataset.line);
    const delta = Number(button.dataset.change);
    if (!delta || cart[index].quantity+delta===0) cart.splice(index,1);
    else cart[index].quantity = Math.min(99,cart[index].quantity+delta);
    updateBag();
    (bagDialog.querySelector(`[data-line="${index}"][data-change="${delta}"]:not(:disabled)`) ?? bagDialog.querySelector('[data-close]')).focus();
  }
  if (button.hasAttribute('data-checkout') && !checkingOut) {
    checkingOut = true;
    renderBag();
    try { window.location.assign(await checkout(cart.map(line => ({variant:variantFor(line), quantity:line.quantity})),language)); }
    catch {
      checkingOut = false;
      renderBag();
      bagDialog.querySelector('.checkout-error').textContent = t('error');
      bagDialog.querySelector('[data-checkout]').focus();
    }
  }
});

const contactForm = one('#contact-form');
if (contactForm && contactEmail) {
  contactForm.hidden = false;
  one('#contact-note').hidden = true;
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(contactForm);
    const body = [fields.get('name'), fields.get('email'), '', fields.get('message')].join('\n');
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(t('contactHeading'))}&body=${encodeURIComponent(body)}`;
  });
}

try {
  const availableCatalog = (await loadCatalog()).map(liveProduct);
  catalog = availableCatalog;
  lookup = new Map(catalog.map(product => [product.id,product]));
  cart = storedLines.filter(line => lookup.has(line.id));
  live = true;
} catch {
  // Leave product listings empty until Shopify can supply the catalog.
}

applyLanguage();
updateBag();
if (document.body.dataset.page === 'shop') {
  const requested = new URL(window.location.href).searchParams.get('product');
  if (lookup.has(requested)) openProduct(lookup.get(requested));
}

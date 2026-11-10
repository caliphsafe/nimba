import {products} from './catalog.js';
import {en,fr} from './locale.js';
import {mockup} from './mockups.js';
import {checkout,checkoutAvailable} from './commerce.js';

const one = selector => document.querySelector(selector);
const cards = one('#products');
const filters = one('#filters');
const productDialog = one('#product-dialog');
const bagDialog = one('#bag-dialog');
const languageButton = one('#language');
const status = one('#status');
const lookup = new Map(products.map(product => [product.id,product]));
const staticCopy = [...document.querySelectorAll('[data-i]')].map(node => [node,node.textContent]);
const categories = ['all','tees','layers','polos','accessories'];

function getSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key,JSON.stringify(value)); }
  catch { /* The current session still works. */ }
}
const savedCart = getSaved('nimba-bag',[]);
let cart = Array.isArray(savedCart) ? savedCart.filter(line =>
  lookup.get(line?.id)?.sizes.includes(line.size) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99) : [];
let language = getSaved('nimba-language','en') === 'fr' ? 'fr' : 'en';
let category = 'all';
let checkingOut = false;
const t = key => (language === 'fr' ? fr : en)[key];
const localized = text => text[language];
const sizeText = size => size === 'OS' ? t('os') : size;
const money = amount => new Intl.NumberFormat(language==='fr'?'fr-FR':'en-US',{
  style:'currency',currency:'USD',maximumFractionDigits:0
}).format(amount);

function renderFilters() {
  filters.innerHTML = categories.map(key =>
    `<button type="button" data-filter="${key}" aria-pressed="${key===category}">${t(key)}</button>`).join('');
}
function renderProducts() {
  cards.innerHTML = products.map((product,index) => {
    if (category !== 'all' && category !== product.category) return '';
    return `<article class="product-card"><button class="product-link" data-product="${product.id}" aria-label="${t('detail')} ${localized(product.name)}">
      <span class="product-art"><span class="item-number">${String(index+1).padStart(2,'0')} / 10</span>
      ${mockup(product,localized(product.name))}
      <span class="product-open" aria-hidden="true">↗</span></span>
      <span class="product-text"><strong>${localized(product.name)}</strong><strong>${money(product.price)}</strong></span>
      <span class="product-sub">${localized(product.color)} · ${t(product.technique)}</span>
    </button></article>`;
  }).join('');
}
function applyLanguage() {
  document.documentElement.lang = language;
  document.title = t('title');
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
  productDialog.innerHTML = `<button class="close" data-close aria-label="${t('close')}">×</button>
    <div class="detail-art">${mockup(product,localized(product.name))}</div>
    <form class="detail-copy" id="add-form"><p class="eyebrow">${t(product.technique)}</p><h2 id="product-title">${localized(product.name)}</h2>
    <p class="detail-price">${money(product.price)}</p><p>${localized(product.color)} · ${t(product.placement)}</p>
    <fieldset><legend>${t('size')}</legend><div class="size-options">${product.sizes.map((size,index) =>
      `<label><input type="radio" name="size" value="${size}" ${index===0?'checked':''}><span>${sizeText(size)}</span></label>`).join('')}</div></fieldset>
    <button type="submit" class="button red">${t('add')}</button></form>`;
  productDialog.querySelector('form').addEventListener('submit',event => {
    event.preventDefault();
    const size = new FormData(event.currentTarget).get('size');
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
  save('nimba-bag',cart);
  one('#count').textContent = cart.reduce((sum,line)=>sum+line.quantity,0);
  renderBag();
}
function renderBag() {
  const total = cart.reduce((sum,line)=>sum+lookup.get(line.id).price*line.quantity,0);
  const ready = checkoutAvailable(cart);
  bagDialog.innerHTML = `<button class="close" data-close aria-label="${t('close')}">×</button><h2 id="bag-title">${t('bag') ?? 'Bag'}</h2>
    ${cart.length ? `<div class="bag-lines">${cart.map((line,index)=>{
      const product = lookup.get(line.id);
      return `<article class="bag-line"><div class="bag-art">${mockup(product,localized(product.name))}</div>
      <div><strong>${localized(product.name)}</strong><p>${localized(product.color)} / ${sizeText(line.size)}</p>
      <div class="quantity"><button data-line="${index}" data-change="-1" aria-label="${t('less')}">−</button><span aria-label="${t('quantity')}">${line.quantity}</span>
      <button data-line="${index}" data-change="1" aria-label="${t('more')}" ${line.quantity===99?'disabled':''}>+</button></div>
      <button class="remove" data-line="${index}" data-change="0">${t('remove')}</button></div>
      <strong>${money(product.price*line.quantity)}</strong></article>`;
    }).join('')}</div>
    <div class="bag-total"><strong>${t('subtotal')}</strong><strong>${money(total)}</strong></div>
    ${ready ? `<button class="button red" data-checkout ${checkingOut?'disabled':''}>${t(checkingOut?'loading':'checkout')}</button><p class="checkout-error" role="alert"></p>` : `<p class="checkout-note">${t('pending')}</p>`}`
    : `<p>${t('empty')}</p><button class="button red" data-close>${t('continue')}</button>`}`;
}
one('#language').addEventListener('click',()=>{
  language = language==='en'?'fr':'en';
  save('nimba-language',language);
  applyLanguage();
  renderBag();
});
filters.addEventListener('click',event=>{
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  category = button.dataset.filter;
  for (const filter of filters.querySelectorAll('button')) filter.setAttribute('aria-pressed',String(filter===button));
  renderProducts();
});
cards.addEventListener('click',event=>{
  const button = event.target.closest('[data-product]');
  if (!button) return;
  renderProduct(lookup.get(button.dataset.product));
  productDialog.showModal();
});
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
    try { window.location.assign(await checkout(cart,language)); }
    catch {
      checkingOut = false;
      renderBag();
      bagDialog.querySelector('.checkout-error').textContent = t('error');
      bagDialog.querySelector('[data-checkout]').focus();
    }
  }
});

applyLanguage();
updateBag();

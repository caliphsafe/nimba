// Only a public Storefront API token belongs here. Keep private tokens on a server.
export const shopify = {
  domain: '',
  publicToken: '',
  apiVersion: '2026-10',
  variantIds: {}
};

export function checkoutAvailable(cart) {
  return Boolean(shopify.domain && shopify.publicToken && cart.length &&
    cart.every(({id,size}) => /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(shopify.variantIds[id]?.[size] ?? '')));
}

export async function checkout(cart, language) {
  if (!checkoutAvailable(cart)) throw new Error('Checkout unavailable');
  const lines = cart.map(({id,size,quantity}) => ({
    merchandiseId:shopify.variantIds[id][size], quantity
  }));
  const response = await fetch(`https://${shopify.domain}/api/${shopify.apiVersion}/graphql.json`, {
    method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':shopify.publicToken},
    body:JSON.stringify({
      query:`mutation NimbaCart($input: CartInput!, $language: LanguageCode!) @inContext(language: $language) {
        cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } }
      }`,
      variables:{input:{lines},language:language.toUpperCase()}
    })
  });
  if (!response.ok) throw new Error('Checkout failed');
  const payload = await response.json();
  const result = payload.data?.cartCreate;
  if (payload.errors?.length || result?.userErrors.length || !result?.cart?.checkoutUrl) {
    throw new Error('Shopify could not create the cart');
  }
  const url = new URL(result.cart.checkoutUrl);
  if (url.protocol !== 'https:') throw new Error('Invalid checkout URL');
  return url.href;
}

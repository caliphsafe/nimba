const apiVersion = '2026-10';
let config;

async function storefront(query, variables) {
  const response = await fetch(`https://${config.domain}/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.publicToken
    },
    body: JSON.stringify({query, variables}),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw Object.assign(new Error(`Storefront request failed (${response.status})`), {status:response.status});
  const payload = await response.json();
  if (payload.errors?.length || !payload.data) throw new Error('Shopify could not complete the request');
  return payload.data;
}

const catalogQuery = includeTags => `query NimbaCatalog($handle: String!, $cursor: String) {
  collection(handle: $handle) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle title productType ${includeTags ? 'tags' : ''}
        featuredImage { url }
        variants(first: 100) {
          pageInfo { hasNextPage }
          nodes { id title availableForSale selectedOptions { name value } price { amount currencyCode } }
        }
      }
    }
  }
}`;

export async function loadCatalog() {
  const response = await fetch('/api/storefront-config', {signal: AbortSignal.timeout(2500)});
  if (!response.ok) throw new Error('Storefront is not configured');
  config = await response.json();
  const variables = {handle: config.collectionHandle, cursor: null};
  let query = catalogQuery(true);
  let result;
  try {
    result = await storefront(query, variables);
  } catch (error) {
    if (error.status === 401 || error.status === 403 || error.name === 'TimeoutError') throw error;
    // Product tags are optional. Core catalog and checkout still work without them.
    query = catalogQuery(false);
    result = await storefront(query, variables);
  }

  const products = [];
  for (;;) {
    const page = result.collection?.products;
    if (!page) throw new Error('Nimba collection is unavailable');
    for (const product of page.nodes) {
      if (product.variants.pageInfo.hasNextPage) {
        throw new Error(`Too many variants on ${product.handle}`);
      }
      products.push(product);
    }
    if (!page.pageInfo.hasNextPage) return products;
    variables.cursor = page.pageInfo.endCursor;
    result = await storefront(query, variables);
  }
}

export async function checkout(cart, language) {
  if (!config || !cart.length) throw new Error('Checkout unavailable');
  const lines = cart.map(({variant,quantity}) => ({merchandiseId: variant.id, quantity}));
  const {cartCreate: result} = await storefront(`
    mutation NimbaCart($input: CartInput!, $language: LanguageCode!) @inContext(language: $language) {
      cartCreate(input: $input) {
        cart { checkoutUrl totalQuantity }
        userErrors { message }
        warnings { code }
      }
    }
  `, {input:{lines}, language:language.toUpperCase()});
  const quantity = cart.reduce((sum,line) => sum + line.quantity, 0);
  if (result.userErrors.length || result.warnings?.length || !result.cart?.checkoutUrl ||
      result.cart.totalQuantity !== quantity) throw new Error('Shopify could not create the requested cart');
  const url = new URL(result.cart.checkoutUrl);
  if (url.protocol !== 'https:') throw new Error('Invalid checkout URL');
  return url.href;
}

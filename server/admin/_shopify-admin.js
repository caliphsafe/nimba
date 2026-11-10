const domainPattern = /^[a-z\d][a-z\d-]*\.myshopify\.com$/i;
let token;
let expiresAt = 0;
let refresh;

function domain() {
  const value = (process.env.SHOPIFY_STORE_DOMAIN || "").trim();
  if (!domainPattern.test(value)) throw new Error("Set SHOPIFY_STORE_DOMAIN to the .myshopify.com hostname.");
  return value;
}

async function shopifyResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(`Shopify request failed (HTTP ${response.status}). Check app installation and access.`);
  return data;
}

async function requestToken() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("Shopify Admin app credentials are not configured.");
  const response = await fetch(`https://${domain()}/admin/oauth/access_token`, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded", Accept: "application/json"},
    body: new URLSearchParams({grant_type: "client_credentials", client_id: clientId, client_secret: secret}),
    redirect: "error",
    signal: AbortSignal.timeout(10000)
  });
  const data = await shopifyResponse(response);
  if (!data.access_token) throw new Error("Shopify did not return an Admin API token.");
  token = data.access_token;
  expiresAt = Date.now() + Number(data.expires_in || 86400) * 1000;
  return token;
}

async function accessToken() {
  if (token && Date.now() < expiresAt - 60000) return token;
  refresh ??= requestToken().finally(() => {refresh = undefined;});
  return refresh;
}

export async function shopifyAdminGraphql(query, variables = {}) {
  const response = await fetch(`https://${domain()}/admin/api/2026-10/graphql.json`, {
    method: "POST",
    headers: {"Content-Type": "application/json", Accept: "application/json", "X-Shopify-Access-Token": await accessToken()},
    body: JSON.stringify({query, variables}),
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  if (response.status === 401) expiresAt = 0;
  const data = await shopifyResponse(response);
  throwUserErrors(data.errors);
  return data.data;
}

export function throwUserErrors(errors) {
  if (errors?.length) throw new Error(errors.map(error => error.message).join("; "));
}

export async function getPrimaryLocation() {
  const data = await shopifyAdminGraphql("{ locations(first: 1, includeInactive: false) { nodes { id } } }");
  return data.locations?.nodes[0] || null;
}

const publicationIdPattern = /^gid:\/\/shopify\/Publication\/\d+$/;
const isHeadless = name => /\bheadless\b/i.test(name || "");

export async function listShopPublications() {
  const nodes = [];
  let cursor = null;
  do {
    const data = await shopifyAdminGraphql(`query NimbaPublications($cursor: String) {
      publications(first: 25, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id name
          catalog {
            title
            ... on AppCatalog { apps(first: 5) { nodes { title } } }
          }
        }
      }
    }`, {cursor});
    nodes.push(...data.publications.nodes);
    cursor = data.publications.pageInfo.hasNextPage ? data.publications.pageInfo.endCursor : null;
  } while (cursor);
  return nodes.map(publication => ({
    id: publication.id,
    name: publication.catalog?.title || publication.name || publication.id,
    apps: publication.catalog?.apps?.nodes.map(app => app.title) || [],
    headless: [publication.name, publication.catalog?.title,
      ...(publication.catalog?.apps?.nodes.map(app => app.title) || [])].some(isHeadless)
  }));
}

export async function getHeadlessPublication(selectedId) {
  const configured = process.env.SHOPIFY_HEADLESS_PUBLICATION_ID?.trim();
  if (configured) {
    if (!publicationIdPattern.test(configured)) throw new Error("Invalid Headless publication ID.");
    return configured;
  }

  const publications = await listShopPublications();
  if (selectedId) {
    if (!publicationIdPattern.test(selectedId) || !publications.some(item => item.id === selectedId)) {
      throw new Error("The saved Shopify channel is no longer available. Choose it again in Admin → Settings.");
    }
    return selectedId;
  }

  const matches = publications.filter(publication => publication.headless);
  if (matches.length === 1) return matches[0].id;

  throw new Error("Choose your Nimba Headless channel in Admin → Settings → Shopify Publishing, then retry.");
}

export async function publishToHeadless(productId, publicationId) {
  const result = await shopifyAdminGraphql(`
    mutation PublishNimba($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) { userErrors { message } }
    }
  `, {id: productId, input: [{publicationId}]});
  throwUserErrors(result.publishablePublish?.userErrors);
}

export function nimbaCollectionHandle() {
  return (process.env.SHOPIFY_COLLECTION_HANDLE || "nimba").trim().toLowerCase();
}

export async function findNimbaCollection() {
  const data = await shopifyAdminGraphql(`
    query FindNimbaCollection($handle: String!) {
      collectionByIdentifier(identifier: {handle: $handle}) { id }
    }
  `, {handle:nimbaCollectionHandle()});
  return data.collectionByIdentifier;
}

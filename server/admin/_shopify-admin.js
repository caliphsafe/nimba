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

export async function getHeadlessPublication() {
  const configured = process.env.SHOPIFY_HEADLESS_PUBLICATION_ID;
  if (configured) {
    if (!/^gid:\/\/shopify\/Publication\/\d+$/.test(configured)) throw new Error("Invalid Headless publication ID.");
    return configured;
  }

  const data = await shopifyAdminGraphql(`{
    publications(first: 100) { nodes { id name catalog { title } } }
  }`);
  const matches = data.publications.nodes.filter(publication =>
    [publication.name, publication.catalog?.title].some(name => name?.trim().toLowerCase() === "headless"));
  if (matches.length !== 1) {
    throw new Error("Could not identify one Headless publication. Configure SHOPIFY_HEADLESS_PUBLICATION_ID before publishing.");
  }
  return matches[0].id;
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

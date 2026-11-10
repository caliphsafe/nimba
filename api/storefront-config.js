export default function storefrontConfig(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({error: "Method not allowed"});
  const domain = process.env.SHOPIFY_STORE_DOMAIN || "";
  // This is a public browser token for the Nimba store. Private credentials stay in Admin functions.
  const publicToken = process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN ||
    (domain === "nimba-shop7.myshopify.com" ? "10a72045f168a327f6af57dadeff2348" : "");
  const collectionHandle = (process.env.SHOPIFY_COLLECTION_HANDLE || "nimba").trim().toLowerCase();

  if (!/^[a-z\d][a-z\d-]*\.myshopify\.com$/i.test(domain) ||
      !/^[a-z\d-]+$/.test(collectionHandle) || !publicToken) {
    return res.status(503).json({error: "Storefront is not configured"});
  }

  return res.status(200).json({domain, publicToken, collectionHandle});
}

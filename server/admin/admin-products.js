import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }


  try {
    const products = await loadAdminProducts();
    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function loadAdminProducts() {
    const products = [];
    let cursor = null;
    do {
    const data = await shopifyAdminGraphql(`
      query AdminProducts($cursor: String) {
        products(first: 5, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            handle
            title
            productType
            vendor
            status
            tags
            createdAt
            updatedAt
            descriptionHtml
            featuredImage {
              url
              altText
            }
            media(first: 12) {
              nodes {
                id
                alt
                mediaContentType
                preview {
                  image {
                    url
                  }
                }
              }
            }
            collections(first: 20) {
              nodes {
                id
                title
                handle
              }
            }
            variants(first: 100) {
              nodes {
                id
                title
                price
                inventoryQuantity
                inventoryItem {
                  id
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    `, {cursor});
    products.push(...(data.products?.nodes || []));
    cursor = data.products?.pageInfo?.hasNextPage ? data.products.pageInfo.endCursor : null;
    } while (cursor);

    return products;
}

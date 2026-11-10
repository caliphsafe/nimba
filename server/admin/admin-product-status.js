import { shopifyAdminGraphql, throwUserErrors, getHeadlessPublication, publishToHeadless } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }


  try {
    const { productId, status } = req.body || {};

    if (!productId || !["ACTIVE", "DRAFT", "ARCHIVED"].includes(status)) {
      return res.status(400).json({ error: "Invalid product or status" });
    }

    const publicationId = status === "ACTIVE" ? await getHeadlessPublication(req.headers["x-nimba-publication"]) : null;
    const data = await shopifyAdminGraphql(`
      mutation AdminProductStatus($productId: ID!, $status: ProductStatus!) {
        productChangeStatus(productId: $productId, status: $status) {
          product {
            id
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `, { productId, status });

    throwUserErrors(data.productChangeStatus?.userErrors);

    const product = data.productChangeStatus?.product;

    if (status === "ACTIVE" && product?.id) {
      await publishToHeadless(product.id, publicationId);
    }

    return res.status(200).json({
      ok: true,
      product,
      published: status === "ACTIVE",
    });
  } catch (error) {
    console.error("ADMIN PRODUCT STATUS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

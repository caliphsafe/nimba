import {
  getPrimaryLocation,
  findNimbaCollection,
  getHeadlessPublication,
  publishToHeadless,
  shopifyAdminGraphql,
  throwUserErrors,
} from "./_shopify-admin.js";

function cleanSizes(sizes = []) {
  return sizes
    .map((size) => ({
      name: String(size.name || "").trim(),
      quantity: Math.max(0, Number(size.quantity || 0)),
      variantId: size.variantId || null,
    }))
    .filter((size) => size.name);
}


async function syncProductColorTag(productId, color = "") {
  const normalizedColor = String(color || "").trim();

  const current = await shopifyAdminGraphql(`
    query AdminProductColorTags($id: ID!) {
      product(id: $id) {
        id
        tags
      }
    }
  `, { id: productId });

  const oldColorTags = (current.product?.tags || [])
    .filter((tag) => String(tag || "").toUpperCase().startsWith("NIMBA_COLOR:"));

  if (oldColorTags.length) {
    const removed = await shopifyAdminGraphql(`
      mutation AdminRemoveColorTags($id: ID!, $tags: [String!]!) {
        tagsRemove(id: $id, tags: $tags) {
          node { id }
          userErrors { field message }
        }
      }
    `, {
      id: productId,
      tags: oldColorTags,
    });

    throwUserErrors(removed.tagsRemove?.userErrors);
  }

  if (!normalizedColor) return null;

  const colorTag = `NIMBA_COLOR:${normalizedColor}`;
  const added = await shopifyAdminGraphql(`
    mutation AdminAddColorTag($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node { id }
        userErrors { field message }
      }
    }
  `, {
    id: productId,
    tags: [colorTag],
  });

  throwUserErrors(added.tagsAdd?.userErrors);
  return colorTag;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }


  try {
    const {
      productId,
      bulkUpload = false,
      title,
      descriptionHtml = "",
      productType = "Product",
      vendor = "Nimba",
      status = "DRAFT",
      price = 0,
      color = "",
      collectionIds = [],
      sizes = [],
      files = [],
      locationId,
    } = req.body || {};

    if (!title?.trim()) {
      return res.status(400).json({ error: "Product title is required" });
    }

    const clean = cleanSizes(sizes);
    if (!clean.length) {
      return res.status(400).json({ error: "At least one size is required" });
    }

    const location = locationId
      ? { id: locationId }
      : await getPrimaryLocation();

    if (!location?.id) {
      return res.status(400).json({ error: "No Shopify inventory location is available" });
    }

    const normalizedStatus = ["ACTIVE", "DRAFT"].includes(status)
      ? status
      : "DRAFT";
    const publicationId = normalizedStatus === "ACTIVE" ? await getHeadlessPublication(req.headers["x-nimba-publication"]) : null;

    const productOptions = [{
      name: "Size",
      position: 1,
      values: clean.map((size) => ({ name: size.name })),
    }];

    const variants = clean.map((size) => ({
      ...(size.variantId ? { id: size.variantId } : {}),
      optionValues: [{ optionName: "Size", name: size.name }],
      price: Number(price || 0),
      inventoryQuantities: [{
        locationId: location.id,
        name: "available",
        quantity: size.quantity,
      }],
    }));

    const collections = new Set(Array.isArray(collectionIds) ? collectionIds.filter(Boolean) : []);
    if (bulkUpload && !productId) {
      const nimba = await findNimbaCollection();
      if (!nimba) return res.status(409).json({error:"Create the Nimba collection in Shopify before uploading products."});
      collections.add(nimba.id);
    }

    const productSetInput = {
      title: title.trim(),
      descriptionHtml,
      productType,
      vendor,
      status: normalizedStatus,
      collections: [...collections],
      productOptions,
      variants,
    };

    if (Array.isArray(files) && files.length) {
      productSetInput.files = files.map((file) => {
        if (file.id) {
          return {
            id: file.id,
            alt: file.alt || title.trim(),
          };
        }

        return {
          originalSource: file.originalSource,
          filename: file.filename,
          contentType: file.contentType || "IMAGE",
          alt: file.alt || title.trim(),
        };
      });
    }

    const data = await shopifyAdminGraphql(`
      mutation AdminProductSet(
        $input: ProductSetInput!,
        $identifier: ProductSetIdentifiers,
        $synchronous: Boolean!
      ) {
        productSet(
          input: $input,
          identifier: $identifier,
          synchronous: $synchronous
        ) {
          product {
            id
            title
            handle
            status
            productType
            vendor
            featuredImage {
              url
              altText
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
          userErrors {
            field
            message
          }
        }
      }
    `, {
      input: productSetInput,
      identifier: productId ? { id: productId } : null,
      synchronous: true,
    });

    throwUserErrors(data.productSet?.userErrors);

    const product = data.productSet?.product;

    if (!product?.id) {
      throw new Error("Shopify saved the request but did not return a product ID.");
    }

    const colorTag = await syncProductColorTag(product.id, color);

    let publication = null;

    if (normalizedStatus === "ACTIVE") {
      await publishToHeadless(product.id, publicationId);
      publication = { publicationIds: [publicationId] };
    }

    return res.status(200).json({
      ok: true,
      product,
      published: normalizedStatus === "ACTIVE",
      publication,
      colorTag,
      note:
        normalizedStatus === "ACTIVE"
          ? "Product is ACTIVE and has been published to Headless."
          : "Product saved as DRAFT and was not published.",
    });
  } catch (error) {
    console.error("ADMIN PRODUCT SAVE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

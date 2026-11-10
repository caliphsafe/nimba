# Nimba

A bilingual, dependency-free apparel storefront. Serve this directory as static files, for example with `python3 -m http.server 8080`. On Vercel select the Other framework preset, use the repository root, and leave install and build commands empty.

## Catalog and Shopify

The ten pieces, mockups and USD prices are launch concepts in `catalog.js`. Confirm garments, artwork rights, sizing and pricing before opening orders. The red and script graphics were supplied as brand references and depict Guinea’s national branding. Verify commercial rights and any necessary permissions before production or public sale.

The bag works locally. To open checkout, create the products and sizes in Shopify, publish them to the storefront sales channel, and fill in `shopify` in `commerce.js` with the shop’s myshopify.com hostname, a **public Storefront API token**, and variant GIDs keyed by the stable product IDs and sizes in `catalog.js`. Do not expose a private Storefront or Admin API token. Confirm currency, pricing, availability and both storefront languages against Shopify. The adapter creates a Shopify cart and hands buyers off to Shopify-hosted checkout. See [Shopify cartCreate](https://shopify.dev/docs/api/storefront/2026-10/mutations/cartCreate).

Once the production domain is set, add a canonical URL, absolute social image URL and sitemap for that domain.

## Image credit

`assets/raffia.webp`: [D’mba headdress, photographed by Sailko](https://commons.wikimedia.org/wiki/File:Guinea,_baga,_copricapo_(nimba,_d%27mba_o_yamban),_1850-1920_ca.jpg), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Resized and converted to WebP.

`assets/dmba.webp`: [19th-century Baga shoulder mask, photographed by Francesco Bini](https://commons.wikimedia.org/wiki/File:Guinea,_baga,_maschera_da_spalla_nimba,_xix_secolo.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Resized and converted to WebP under the same license.

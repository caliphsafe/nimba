# Nimba

A bilingual, dependency-free apparel storefront. Serve this directory as static files, for example with `python3 -m http.server 8080`. On Vercel select the Other framework preset, use the repository root, and leave install and build commands empty.

## Catalog and Shopify

The ten pieces, mockups and USD prices are launch concepts in `catalog.js`. Confirm garments, artwork rights, sizing and pricing before opening orders. The red and script graphics were supplied as brand references and depict Guinea’s national branding. Verify commercial rights and any necessary permissions before production or public sale.

The bag works locally. With a valid Headless configuration, the site reads Shopify products and variants and uses Shopify-hosted checkout. See the environment setup below.

Once the production domain is set, add a canonical URL, absolute social image URL and sitemap for that domain.

## Site pages and contact

The site has four static pages: `index.html`, `shop.html`, `story.html`, and `contact.html`. The former About URL redirects to Story. Language and shopping bag preferences are shared across pages on the same origin. Set the public brand inbox in `contact-config.js` to enable the contact form, which opens a prefilled email draft.

The product images under `assets/products/` are AI-generated studio mockups of blank garments. The original supplied artwork is layered onto the mockups separately.

Calistoga and Space Grotesk are locally hosted. The SIL Open Font Licenses are in `assets/`.

## Archive credits

Photos were resized and converted to WebP. Creator, source and license details are also embedded in the image files.

- `assets/archive/highlands.webp` — [Fantabinta224](https://commons.wikimedia.org/wiki/File:Bowal Dampo.jpg), [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- `assets/archive/coastal-engraving.webp` — [Ivan Pranishnikoff](https://commons.wikimedia.org/wiki/File:Women_building_a_house_on_the_Guinea-Conakry_coast,_1880s_engraving.jpg), Public domain.
- `assets/archive/carved-profile.webp` — [Ji-Elle](https://commons.wikimedia.org/wiki/File:Baga-Masque_d%27%C3%A9paule_Dimba_(1).jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- `assets/archive/shoulder-mask.webp` — [John Atherton](https://commons.wikimedia.org/wiki/File:Nimba_mask,_Baga_people,_Republic_of_Guinea,_West_Africa_(6339138402).jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/).
- `assets/archive/tombo.webp` — [Unknown photographer](https://commons.wikimedia.org/wiki/File:Conakry-Le_pont_de_Tombo.jpg), Public domain.
- `assets/archive/face.webp` — [Ji-Elle](https://commons.wikimedia.org/wiki/File:Baga-Masque_d%27%C3%A9paule_Dimba_(3).jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- `assets/archive/carved-markings.webp` — [Ji-Elle](https://commons.wikimedia.org/wiki/File:Baga-Masque_d%27%C3%A9paule_Dimba_(4).jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- `assets/dmba.webp` — [Francesco Bini](https://commons.wikimedia.org/wiki/File:Guinea,_baga,_maschera_da_spalla_nimba,_xix_secolo.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- `assets/raffia.webp` — [Sailko](https://commons.wikimedia.org/wiki/File:Guinea,_baga,_copricapo_(nimba,_d%27mba_o_yamban),_1850-1920_ca.jpg), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- `assets/archive-detail.webp` — [John Atherton](https://commons.wikimedia.org/wiki/File:Close-up_of_Nimba_mask,_Baga_people,_Republic_of_Guinea,_West_Africa_(6339178304).jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/).
- `assets/archive/shop-carving.webp` — [Ji-Elle](https://commons.wikimedia.org/wiki/File:Masque_d%27%C3%A9paule_baga-Guin%C3%A9e_(1).jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- `assets/archive/railway.webp` — [Julien Harneis](https://commons.wikimedia.org/wiki/File:Conakry_railway_station_(4373011404).jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/).

## Historical references

- [The Met, D’mba (great mother) headdress](https://www.metmuseum.org/art/collection/search/312189)
- [The Met, The Art of Africa](https://resources.metmuseum.org/resources/metpublications/pdf/The_Art_of_Africa_A_Resource_for_Educators.pdf)
- [The Met, Genesis: Ideas of Origin in African Sculpture](https://resources.metmuseum.org/resources/metpublications/pdf/Genesis_Ideas_of_Origin_in_African_Sculpture.pdf)
- [Smithsonian National Museum of African Art, Shoulder mask](https://africa.si.edu/collection/object/nmafa_98-28-1)
- [The Kreeger Museum, Dance Mask D’mba](https://www.kreegermuseum.org/about-us/collection/african-collection/Baga-artist_Dance-Mask-Dmba/)
- [United Nations, Nimba](https://www.un.org/ungifts/nimba)
- [Musée des Confluences, Nimba](https://portail.museedesconfluences.fr/notice122425417139416811?lang=fr)
- [Africa Guinée, national branding coordination statement](https://www.africaguinee.com/coupe-dafrique-des-nations-2023-a-propos-de-la-caf-et-du-branding-guinee/)

## Shopify storefront and staff admin

Vercel builds the storefront and staff interface into `dist` and deploys the separate `api/` functions. Run `npm run build` to prepare static assets. An HTTP server serving only `dist` can display the editorial storefront. Use Vercel for the API routes.

Set these variables in the Nimba Vercel project and redeploy:

- `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`: Nimba Shopify Admin app credentials. Keep the secret sensitive and server-side.
- `ADMIN_PASSWORD`: a nonempty staff password. `ADMIN_SESSION_SECRET`: a separate random value at least 32 characters long. Mark both sensitive. `ADMIN_USERNAME` defaults to `nimba`.
- `SHOPIFY_STOREFRONT_PUBLIC_TOKEN`: an optional override for the token marked **Public** in Shopify's Headless channel. The site already includes the Nimba public token for the configured Nimba store. This value is intentionally browser-accessible. Use `SHOPIFY_COLLECTION_HANDLE` if the collection handle differs from `nimba`. Publish the collection and each product to Headless. An empty collection displays an empty state. If Shopify cannot be reached, the storefront displays a temporary-unavailability message. Both states keep checkout closed.
- `SHOPIFY_HEADLESS_PUBLICATION_ID`: optional explicit Shopify Publication GID. Set it if more than one publication matches or Shopify labels Headless differently.

Staff sign in at `/admin`. Each admin API request requires a signed staff session except login. Product publication targets Headless. The Shopify collection drives the live catalog, while the existing bilingual copy and mockups supply presentation details for matching handles. To enable featured ordering and color from Shop Editor in the storefront, grant the Headless storefront permission to read product tags.

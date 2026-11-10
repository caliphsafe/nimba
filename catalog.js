const items = [
  ['great-mother-tee','tee','The Great Mother Tee','T-shirt Grande Mère','Bone','Écru','#e8dfc9','mark','front',42],
  ['guinee-script-tee','tee','Guinée Script Tee','T-shirt Guinée Signature','Black','Noir','#292824','guinee','script',44],
  ['coastal-tee','tee','Coastal Tee','T-shirt du Littoral','Forest','Vert forêt','#343f32','mark','back',44],
  ['heritage-hoodie','hoodie','Heritage Hoodie','Sweat à capuche Héritage','Black','Noir','#272724','mark','front',84],
  ['guinee-hoodie','hoodie','Guinée Hoodie','Sweat à capuche Guinée','Sand','Sable','#c9b797','guinee','script',86],
  ['harvest-crewneck','crew','Harvest Crewneck','Sweat Récolte','Harvest Gold','Or moisson','#bf9354','guinee','script',72],
  ['signature-polo','polo','Signature Polo','Polo Signature','Ivory','Ivoire','#e7dfca','mark','chest',68],
  ['forest-polo','polo','Forest Polo','Polo Forêt','Forest','Vert forêt','#344437','mark','chest',68],
  ['coast-cap','cap','Coast Cap','Casquette Littoral','Black','Noir','#2c2c2a','mark','cap',36],
  ['market-tote','tote','Market Tote','Cabas du Marché','Natural','Naturel','#d8c5a2','guinee','script',28]
];

export const products = items.map(([id, shape, en, fr, colorEN, colorFR, fabric, mark, placement, price]) => ({
  id, shape, name: {en, fr}, color: {en:colorEN, fr:colorFR}, fabric, mark, placement, price,
  technique: ['polo','cap'].includes(shape) ? 'embroidered' : 'printed',
  category: ({tee:'tees',hoodie:'layers',crew:'layers',polo:'polos',cap:'accessories',tote:'accessories'})[shape],
  sizes: ['cap','tote'].includes(shape) ? ['OS'] : ['S','M','L','XL','XXL']
}));

const categories = [
  ['polos', /polo/],
  ['layers', /hoodie|hooded|crewneck|sweatshirt|pullover/],
  ['tees', /t[ -]?shirt|\btee\b/],
  ['bottoms', /pants?|shorts?|jeans?|joggers?|trousers?/],
  ['accessories', /cap|hat|tote|accessor/]
];
const localCatalog = new Map(products.map(product => [product.id, product]));

export function liveProduct(product) {
  const local = localCatalog.get(product.handle);
  const featuredSlot = Number(product.tags?.find(tag => /^NIMBA_FEATURED:[1-4]$/i.test(tag))?.slice(-1) || 0);
  const color = product.tags?.find(tag => /^NIMBA_COLOR:/i.test(tag))?.slice('NIMBA_COLOR:'.length);
  const type = product.productType || product.title;
  const variants = Object.fromEntries(product.variants.nodes.map(variant => {
    const sizeOption = variant.selectedOptions.find(option => /^(size|taille)$/i.test(option.name));
    const simpleSize = variant.selectedOptions.length === 1 && sizeOption;
    const size = simpleSize ? sizeOption.value : variant.title === 'Default Title' ? 'OS' : variant.title;
    return [size, {...variant, amount: Number(variant.price.amount), currency: variant.price.currencyCode}];
  }));
  const sizes = Object.keys(variants);
  const displayed = Object.values(variants).filter(variant => variant.availableForSale);
  const price = (displayed.length ? displayed : Object.values(variants)).reduce((lowest, variant) =>
    !lowest || variant.amount < lowest.amount ? variant : lowest, null);
  const image = product.featuredImage?.url;
  return {
    ...local,
    id:product.handle,
    name:{en:product.title, fr:local?.name.fr ?? product.title},
    color:color ? {en:color,fr:color} : local?.color,
    category:categories.find(([,pattern]) => pattern.test(type.toLowerCase()))?.[0] ?? local?.category ?? 'accessories',
    image:typeof image === 'string' && /^https:\/\/(?:cdn\.shopify\.com|[a-z\d-]+\.myshopify\.com)\//i.test(image) ? image : null,
    featuredSlot,
    price:price?.amount ?? null,
    currency:price?.currency,
    sizes,
    variants
  };
}

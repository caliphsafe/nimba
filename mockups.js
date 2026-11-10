// Positions are percentages of each studio photograph. Artwork stays separate
// from the blanks so the supplied profiles remain exact at every display size.
const placement = {
  'great-mother-tee': [50,29,25],
  'guinee-script-tee': [50,34,46],
  'coastal-tee': [50,25,32],
  'heritage-hoodie': [50,27,18],
  'guinee-hoodie': [50,41,37],
  'harvest-crewneck': [50,31,44],
  'signature-polo': [64,29,5.5],
  'forest-polo': [64,29,5.5],
  'coast-cap': [50,39,10],
  'market-tote': [50,55,53]
};

export function mockup(product, alt) {
  const [x,y,width] = placement[product.id];
  const technique = product.technique==='embroidered' ? 'stitch' : 'ink';
  return `<span class="garment studio" style="--art-x:${x}%;--art-y:${y}%;--art-width:${width}%">
    <img class="blank" src="assets/products/${product.id}.webp" alt="${alt}" width="349" height="437" loading="lazy">
    <span class="artwork ${technique} ${product.mark}" aria-hidden="true">
      <img src="assets/${product.mark}.webp" alt="">
    </span>
  </span>`;
}

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

const campaignPlacement = {
  'great-mother-tee': [50,34,24],
  'heritage-hoodie': [50,51,11],
  'signature-polo': [65,32,6],
  'coast-cap': [47,39,10]
};

export function mockup(product, alt, campaign = false) {
  const hasCampaign = campaign && Object.hasOwn(campaignPlacement,product.id);
  const [x,y,width] = (hasCampaign ? campaignPlacement : placement)[product.id];
  const technique = product.technique==='embroidered' ? 'stitch' : 'ink';
  return `<span class="garment studio${hasCampaign ? " campaign" : ""}" style="--art-x:${x}%;--art-y:${y}%;--art-width:${width}%">
    <img class="blank" src="assets/${hasCampaign ? "campaign" : "products"}/${product.id}.webp" alt="${alt}" width="${hasCampaign ? 410 : 349}" height="${hasCampaign ? 600 : 437}" loading="lazy">
    <span class="artwork ${technique} ${product.mark}" aria-hidden="true">
      <img src="assets/${product.mark}.webp" alt="">
    </span>
  </span>`;
}

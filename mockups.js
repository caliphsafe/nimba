const bodies = {
  tee:'M91 44 55 54 18 91 51 124 73 106 69 220Q122 231 176 220L172 106 194 124 227 91 190 54 154 44Q122 61 91 44Z',
  polo:'M91 44 55 54 18 91 51 124 73 106 69 220Q122 231 176 220L172 106 194 124 227 91 190 54 154 44Z',
  crew:'M92 43 61 51Q44 56 40 75L17 222 56 229 72 133 68 223Q123 234 178 223L173 133 189 229 228 222 205 75Q201 56 184 51L153 43Q122 61 92 43Z',
  hoodie:'M89 52Q84 21 104 11Q123 4 143 11Q162 21 156 52L183 57Q201 63 205 83L229 221 190 229 172 139 177 223Q122 234 68 223L73 139 55 229 16 221 40 83Q44 63 62 57Z',
  cap:'M30 140Q30 95 54 78Q84 54 120 59Q175 59 188 102L196 136Q213 141 225 151Q227 167 188 178Q134 193 96 169Q58 173 30 140Z',
  tote:'M49 85H196L188 223Q122 234 57 223Z'
};
const seams = {
  tee:'M91 45Q96 74 122 74Q148 74 154 45M27 91l28 26m135 0 28-26M72 213q50 8 101 0M73 106l-9-43m108 43 9-43',
  polo:'M95 45 85 55l13 29 24-15 23 15 14-29-9-10M122 69v39m-5-29h11m-11 14h11M27 91l28 26m135 0 28-26M72 213q50 8 101 0',
  crew:'M92 44q4 26 30 26t31-26M71 215q50 10 103 0M19 214l38 8m131 0 38-8M72 133 65 62m108 71 8-71',
  hoodie:'M89 52q11-25 33-31 22 6 34 31m-63-3 29 21 30-21m-38 15-5 34m22-34 5 34m-37 65h46l15 31H84Zm-27 51q51 10 101 0M19 214l38 8m131 0 38-8',
  cap:'M30 140q41 10 66 29m0 0q60-41 100-33m-94 32q52-31 98-28m-92 33q54-30 103-27M98 143q-8-55 20-83m36 81q11-42-8-77',
  tote:'M52 94h141M61 215q61 10 123 0'
};

export function mockup(product, alt) {
  const {shape,placement,fabric,mark} = product;
  const artwork = {
    front:[96,80,54,104], back:[89,63,67,125], chest:[143,80,14,26],
    cap:[110,91,23,41], script:shape==='tote' ? [72,116,100,55] : [70,94,105,56]
  }[placement];
  const [x,y,width,height]=artwork;
  const handle = shape==='tote' ? '<path d="M89 88V60a33 33 0 0 1 66 0v28" fill="none" stroke="#918067" stroke-width="11"/><path d="M89 88V60a33 33 0 0 1 66 0v28" fill="none" stroke="#c7b493" stroke-width="8"/>' : '';
  const backSeam = 'M91 45Q122 62 154 45M27 91l28 26m135 0 28-26M72 213q50 8 101 0';
  return `<svg class="garment" viewBox="0 0 245 245" role="img" aria-label="${alt}">
    <ellipse cx="123" cy="${shape==='cap'?183:231}" rx="82" ry="6" fill="#312516" opacity=".13"/>
    ${handle}<path d="${bodies[shape]}" fill="${fabric}" stroke="#1f1b14" stroke-opacity=".35" stroke-width="1.2"/>
    <path d="${bodies[shape]}" fill="url(#fabric-light)" opacity=".25"/>
    <path d="${placement==='back'?backSeam:seams[shape]}" fill="none" stroke="#16150f" stroke-opacity=".38" stroke-width="1.1"/>
    <image href="assets/${mark}.webp" x="${x}" y="${y}" width="${width}" height="${height}"/>
    ${product.technique==='embroidered' ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#stitches)" opacity=".43" style="mask-image:url(assets/mark.webp);mask-size:contain;mask-repeat:no-repeat;mask-position:center;mask-origin:fill-box;mask-clip:fill-box"/>` : ''}
  </svg>`;
}

// Gera os ícones do navegador a partir de `public/caleido_logox.png`.
//
// ## Por que não um recorte retangular
//
// No arquivo de marca o símbolo e a palavra "caleidoscópio" se sobrepõem na
// horizontal: o "c" começa dentro da faixa do símbolo. Então a separação é por
// **componente conexo** no canal alfa — os cinco blocos do símbolo são peças
// grandes e isoladas, as letras são muitas peças pequenas.
//
// O corte não é "pegue as cinco maiores": é a quebra de área entre os dois
// grupos (o menor bloco tem ~18.500 px², a maior letra ~4.700). Um quarto da
// maior peça separa com folga e continua valendo se a marca mudar de proporção.
//
// ## O que sai
//
//   public/icon.png         256px, transparente — a aba em tema claro
//   public/icon-dark.png    256px, símbolo claro — a aba em tema escuro
//   public/apple-icon.png   180px **com fundo branco**: o iOS não respeita
//                           transparência e pinta o vazio de preto
//   src/app/favicon.ico     16/32/48 embutidos — o caminho que o navegador
//                           pede sozinho, antes de ler qualquer <link>
//
// Os três de `public/` são declarados em `metadata.icons` (layout.tsx), não
// pela convenção de arquivo: declarar `icons` no metadata **substitui** as
// tags que a convenção geraria, e foi assim que o apple-touch-icon sumiu na
// primeira tentativa. Um mecanismo só, sem ambiguidade.
//
// Uso: node tools/gerar-icones.mjs
import sharp from "sharp";
import { writeFileSync } from "fs";

const CLARO = "public/caleido_logox.png"; // símbolo azul, para aba clara
const ESCURO = "public/caleido_logox_dark.png"; // símbolo claro, para aba escura
const DESTINO = "src/app";
const MARGEM = 0.08; // respiro de cada lado, proporcional ao símbolo
const ESCALA_ANALISE = 900;

/* ── 1. Acha os blocos do símbolo ──────────────────────────────────────── */

async function isolarSimbolo(ORIGEM) {
const { data, info } = await sharp(ORIGEM)
  .resize({ width: ESCALA_ANALISE })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const L = info.width;
const A = info.height;
const opaco = new Uint8Array(L * A);
for (let i = 0; i < L * A; i++) opaco[i] = data[i * info.channels + 3] > 40 ? 1 : 0;

const rotulo = new Int32Array(L * A).fill(-1);
const fila = new Int32Array(L * A);
const pecas = [];
for (let p = 0; p < L * A; p++) {
  if (!opaco[p] || rotulo[p] !== -1) continue;
  const id = pecas.length;
  let ini = 0;
  let fim = 0;
  fila[fim++] = p;
  rotulo[p] = id;
  let area = 0;
  let x0 = L;
  let y0 = A;
  let x1 = 0;
  let y1 = 0;
  while (ini < fim) {
    const q = fila[ini++];
    const x = q % L;
    const y = (q / L) | 0;
    area++;
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= L || ny >= A) continue;
      const n = ny * L + nx;
      if (opaco[n] && rotulo[n] === -1) {
        rotulo[n] = id;
        fila[fim++] = n;
      }
    }
  }
  pecas.push({ id, area, x0, y0, x1, y1 });
}

pecas.sort((a, b) => b.area - a.area);
const blocos = pecas.filter((p) => p.area >= pecas[0].area * 0.25);
console.log(`${pecas.length} peças no arquivo; ${blocos.length} são do símbolo`);

const meta = await sharp(ORIGEM).metadata();
const f = meta.width / L;
const recorte = {
  left: Math.max(0, Math.round(Math.min(...blocos.map((p) => p.x0)) * f)),
  top: Math.max(0, Math.round(Math.min(...blocos.map((p) => p.y0)) * f)),
  width: Math.round((Math.max(...blocos.map((p) => p.x1)) - Math.min(...blocos.map((p) => p.x0)) + 1) * f),
  height: Math.round((Math.max(...blocos.map((p) => p.y1)) - Math.min(...blocos.map((p) => p.y0)) + 1) * f),
};
recorte.width = Math.min(recorte.width, meta.width - recorte.left);
recorte.height = Math.min(recorte.height, meta.height - recorte.top);
console.log("recorte:", JSON.stringify(recorte));

/* ── 2. Apaga tudo que não é bloco, depois recorta ─────────────────────── */

// Recortar a caixa não basta: no arquivo de tema escuro a palavra começa
// DENTRO da caixa do símbolo, e vinha junto um fantasma do "cale". Então a
// máscara é feita pelos próprios componentes — fica só o que é bloco.
// A máscara precisa carregar o recorte no **alfa**: `dest-in` olha a
// transparência da entrada, não o brilho dela. Em escala de cinza o composite
// enxergaria tudo opaco e não cortaria nada.
const idsDeBloco = new Set(blocos.map((b) => b.id));
const mascara = Buffer.alloc(L * A * 4);
for (let i = 0; i < L * A; i++) {
  const dentro = idsDeBloco.has(rotulo[i]) ? 255 : 0;
  mascara[i * 4 + 3] = dentro;
}

const mascaraNaOrigem = await sharp(mascara, {
  raw: { width: L, height: A, channels: 4 },
})
  .resize(meta.width, meta.height, { fit: "fill" })
  .png()
  .toBuffer();

const soBlocos = await sharp(ORIGEM)
  .ensureAlpha()
  .composite([{ input: mascaraNaOrigem, blend: "dest-in" }])
  .png()
  .toBuffer();

// Sem `trim` aqui: a caixa dos blocos já veio da rotulagem, e o trim do
// libvips quebra ("bad extract area") quando a imagem mascarada tem o canto
// inteiramente transparente.
const simbolo = await sharp(soBlocos).extract(recorte).png().toBuffer();
const dim = await sharp(simbolo).metadata();
const lado = Math.round(Math.max(dim.width, dim.height) * (1 + MARGEM * 2));
console.log(`símbolo ${dim.width}×${dim.height} → quadrado de ${lado}`);

return sharp({
  create: {
    width: lado,
    height: lado,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: simbolo, gravity: "centre" }])
  .png()
  .toBuffer();
}

const base = await isolarSimbolo(CLARO);
const baseEscuro = await isolarSimbolo(ESCURO);

const png = (tamanho, fundo, origem = base) =>
  sharp(origem)
    .resize(tamanho, tamanho, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten(fundo ? { background: fundo } : false)
    .png({ compressionLevel: 9 })
    .toBuffer();

writeFileSync("public/icon.png", await png(256));
writeFileSync("public/apple-icon.png", await png(180, { r: 255, g: 255, b: 255 }));
// O símbolo azul-marinho some num fundo quase preto — daí a versão clara.
writeFileSync("public/icon-dark.png", await png(256, null, baseEscuro));

/* ── 3. favicon.ico com 16/32/48 embutidos como PNG ────────────────────── */

const tamanhos = [16, 32, 48];
const imagens = await Promise.all(tamanhos.map((t) => png(t)));

const cabecalho = Buffer.alloc(6);
cabecalho.writeUInt16LE(0, 0);
cabecalho.writeUInt16LE(1, 2); // tipo: ícone
cabecalho.writeUInt16LE(imagens.length, 4);

let deslocamento = 6 + imagens.length * 16;
const entradas = imagens.map((img, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(tamanhos[i], 0);
  e.writeUInt8(tamanhos[i], 1);
  e.writeUInt16LE(1, 4); // planos
  e.writeUInt16LE(32, 6); // bits por pixel
  e.writeUInt32LE(img.length, 8);
  e.writeUInt32LE(deslocamento, 12);
  deslocamento += img.length;
  return e;
});

writeFileSync(`${DESTINO}/favicon.ico`, Buffer.concat([cabecalho, ...entradas, ...imagens]));
console.log("public/icon.png · icon-dark.png · apple-icon.png · src/app/favicon.ico");

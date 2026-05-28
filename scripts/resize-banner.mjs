import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "../public/Caleidoscopio_Banner_100x160cm.original.jpg");
const dst = path.resolve(__dirname, "../public/Caleidoscopio_Banner_100x160cm.jpg");

const info = await sharp(src)
  .resize({ width: 1600, withoutEnlargement: true })
  .jpeg({ quality: 82, progressive: true, mozjpeg: true })
  .toFile(dst);

console.log(`✓ resized → ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);

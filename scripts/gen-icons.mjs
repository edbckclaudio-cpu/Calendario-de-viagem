import sharp from "sharp";
import { readFile, mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

async function ensureDir(path) {
  try { await mkdir(path, { recursive: true }); } catch {}
}

async function generate(size) {
  const svgPath = `public/icons/icon-${size}.svg`;
  const pngPath = `public/icons/icon-${size}.png`;
  const svg = await readFile(svgPath);
  const image = sharp(svg, { density: 300 }).resize(size, size).png();
  await ensureDir(dirname(pngPath));
  const buf = await image.toBuffer();
  await writeFile(pngPath, buf);
  console.log(`Generated ${pngPath}`);
}

async function main() {
  await generate(192);
  await generate(512);
}

main().catch((e) => { console.error(e); process.exit(1); });
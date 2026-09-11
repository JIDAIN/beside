import { rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const assetPath = resolve(process.cwd(), "public/illustrations/life/mood-excited.png");
const tempPath = `${assetPath}.fixed.png`;
const alphaThreshold = 1;

const metadata = await sharp(assetPath).metadata();
if (metadata.format !== "png" || metadata.width !== 256 || metadata.height !== 256 || !metadata.hasAlpha) {
  throw new Error(`Unexpected mood-excited metadata: ${JSON.stringify({ format: metadata.format, width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha })}`);
}

const { data, info } = await sharp(assetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const original = Buffer.from(data);
const visited = new Uint8Array(width * height);
const components = [];
const neighbors = [-1, 0, 1];

function alphaAt(index) {
  return original[index * channels + 3];
}

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const start = y * width + x;
    if (visited[start] || alphaAt(start) < alphaThreshold) continue;
    visited[start] = 1;
    const queue = [start];
    const pixels = [];
    let minX = x;
    let maxX = x;
    let minY = y;
    let maxY = y;
    let strongPixels = 0;
    let maxAlpha = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const px = index % width;
      const py = Math.floor(index / width);
      pixels.push(index);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
      const alpha = alphaAt(index);
      if (alpha >= 16) strongPixels += 1;
      maxAlpha = Math.max(maxAlpha, alpha);
      for (const dy of neighbors) {
        for (const dx of neighbors) {
          if (dx === 0 && dy === 0) continue;
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next] || alphaAt(next) < alphaThreshold) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
    }
    components.push({ minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1, count: pixels.length, strongPixels, maxAlpha, pixels });
  }
}

const summary = components
  .map(({ pixels, ...component }) => component)
  .sort((left, right) => right.count - left.count);
console.log("mood-excited connected alpha components before repair:");
console.log(JSON.stringify(summary, null, 2));

const candidates = components.filter((component) => {
  const touchesLeftCanvasEdge = component.minX === 0 && component.count <= 5000;
  const narrowLeftResidue = component.minX <= 40
    && component.width <= 8
    && component.height >= 20
    && component.height / component.width >= 4
    && component.count <= 2000;
  const isolatedSpeck = component.count <= 2 && component.maxX < 54;
  return touchesLeftCanvasEdge || narrowLeftResidue || isolatedSpeck;
});

if (candidates.length === 0) {
  throw new Error("No isolated left-edge residue was detected; refusing to alter the artwork automatically.");
}

const removed = new Set();
for (const component of candidates) {
  for (const index of component.pixels) removed.add(index);
}

for (const index of removed) {
  const offset = index * channels;
  data[offset] = 0;
  data[offset + 1] = 0;
  data[offset + 2] = 0;
  data[offset + 3] = 0;
}

await sharp(data, { raw: { width, height, channels } }).png().toFile(tempPath);
const repairedMetadata = await sharp(tempPath).metadata();
if (repairedMetadata.format !== "png" || repairedMetadata.width !== 256 || repairedMetadata.height !== 256 || !repairedMetadata.hasAlpha) {
  await unlink(tempPath).catch(() => undefined);
  throw new Error("Repaired image lost the required PNG/256x256/alpha contract.");
}

const { data: repaired, info: repairedInfo } = await sharp(tempPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let unexpectedDiffs = 0;
for (let index = 0; index < width * height; index += 1) {
  const offset = index * channels;
  if (removed.has(index)) {
    if (repaired[offset] !== 0 || repaired[offset + 1] !== 0 || repaired[offset + 2] !== 0 || repaired[offset + 3] !== 0) {
      unexpectedDiffs += 1;
    }
    continue;
  }
  for (let channel = 0; channel < channels; channel += 1) {
    if (repaired[offset + channel] !== original[offset + channel]) {
      unexpectedDiffs += 1;
      break;
    }
  }
}
if (unexpectedDiffs !== 0 || repairedInfo.width !== width || repairedInfo.height !== height) {
  await unlink(tempPath).catch(() => undefined);
  throw new Error(`Unexpected pixel changes outside the removed residue: ${unexpectedDiffs}`);
}

console.log("Removed left-edge residue components:");
console.log(JSON.stringify(candidates.map(({ pixels, ...component }) => component), null, 2));
console.log(`Cleared ${removed.size} residue pixels; every other decoded RGBA pixel stayed unchanged.`);
await rename(tempPath, assetPath);

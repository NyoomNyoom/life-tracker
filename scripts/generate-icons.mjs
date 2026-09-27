// Renders public/icons/icon.svg to the PNG sizes iOS and the web manifest need.
// Usage: node scripts/generate-icons.mjs   (needs Playwright's Chromium)
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(`${process.env.NODE_PATH ?? "/opt/node22/lib/node_modules"}/playwright`);
}

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url), "utf8");
const targets = [
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
  { file: "icon-192.png", size: 192, pad: 0 },
  { file: "icon-512.png", size: 512, pad: 0 },
  // Maskable icons keep the glyph inside the central 80% safe zone.
  { file: "icon-maskable-512.png", size: 512, pad: 0.1 },
  { file: "favicon-32.png", size: 32, pad: 0 },
];

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
for (const { file, size, pad } of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<html><body style="margin:0;background:#16a34a;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: new URL(`../public/icons/${file}`, import.meta.url).pathname, omitBackground: false });
  console.log("wrote", file);
}
await browser.close();

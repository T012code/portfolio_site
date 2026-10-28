// Renders each flyer to PNG (4:5 feed and 9:16 status) and PDF.
// Usage: node marketing/ads/flyers/export.cjs
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const dir = __dirname;
const out = path.join(dir, "..", "out");
const flyers = ["flyer-1-i-make-it-work", "flyer-2-i-build-it"];
const sizes = [
  { key: "45", w: 1080, h: 1350, label: "4x5" },
  { key: "916", w: 1080, h: 1920, label: "9x16" },
];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const name of flyers) {
    const html = fs.readFileSync(path.join(dir, `${name}.html`), "utf8");
    const sprite = fs.readFileSync(path.join(dir, "assets", "sprite.html"), "utf8");
    const built = path.join(dir, `.${name}.build.html`);
    fs.writeFileSync(built, html.replace("<!--ICONS-->", sprite));
    for (const s of sizes) {
      const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
      await page.goto(`file://${built}?size=${s.key}`);
      await page.evaluate(() => document.fonts.ready);
      const base = path.join(out, `layothedeveloper-${name}-${s.label}`);
      await page.screenshot({ path: `${base}.png` });
      await page.pdf({ path: `${base}.pdf`, width: `${s.w}px`, height: `${s.h}px`, printBackground: true, pageRanges: "1" });
      await page.close();
      console.log("wrote", path.relative(process.cwd(), base));
    }
    fs.unlinkSync(built);
  }
  await browser.close();
})();

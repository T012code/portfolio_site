// Renders the HTML documents in this folder to print-ready PDFs in ./pdf.
// Usage: node documents/build.mjs   (needs Playwright with Chromium)
import { access, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
// require() also finds a globally installed Playwright (via NODE_PATH); a bare ESM import would not.
const { chromium } = createRequire(import.meta.url)("playwright");
const out = join(here, "pdf");

const docs = [
  { file: "business-card.html", pdf: "Layo-Business-Card.pdf", width: "3.2in", height: "2.2in" },
  { file: "rate-card.html", query: "?currency=NGN", pdf: "Layo-Rate-Card-NGN.pdf" },
  { file: "rate-card.html", query: "?currency=USD", pdf: "Layo-Rate-Card-USD.pdf" },
  { file: "receipt.html", pdf: "Layo-Receipt-Template.pdf" },
  { file: "receipt.html", query: "?sample", pdf: "Layo-Receipt-Sample.pdf" },
  { file: "service-agreement.html", pdf: "Layo-Service-Agreement.pdf" },
];

// Signed copies need private/signature.png, which stays out of git because the repo is public.
// They are written to private/pdf so they never land in the committed pdf folder.
const privateDir = join(here, "private");
const hasSignature = await access(join(privateDir, "signature.png")).then(() => true, () => false);
if (hasSignature) {
  docs.push(
    { file: "receipt.html", query: "?signed", pdf: "Layo-Receipt-Template-Signed.pdf", dir: join(privateDir, "pdf") },
    { file: "receipt.html", query: "?sample&signed", pdf: "Layo-Receipt-Sample-Signed.pdf", dir: join(privateDir, "pdf") },
    { file: "service-agreement.html", query: "?signed", pdf: "Layo-Service-Agreement-Signed.pdf", dir: join(privateDir, "pdf") },
  );
  await mkdir(join(privateDir, "pdf"), { recursive: true });
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
let failed = false;

for (const doc of docs) {
  await page.goto(pathToFileURL(join(here, doc.file)).href + (doc.query ?? ""));
  await page.evaluate(() => document.fonts.ready);

  // Every .page is a fixed sheet; content that spills past it would be clipped in print.
  const overflow = await page.$$eval(".page", (pages) =>
    pages.flatMap((p, i) => (p.scrollHeight > p.clientHeight + 1 ? [`page ${i + 1} (+${p.scrollHeight - p.clientHeight}px)`] : [])),
  );
  if (overflow.length) {
    failed = true;
    console.error(`${doc.pdf}: content overflows ${overflow.join(", ")}`);
  }

  await page.pdf({
    path: join(doc.dir ?? out, doc.pdf),
    printBackground: true,
    preferCSSPageSize: !doc.width,
    width: doc.width,
    height: doc.height,
  });
  console.log(`wrote ${doc.dir ? "private/pdf" : "pdf"}/${doc.pdf}`);
}

await browser.close();
if (failed) process.exitCode = 1;

# Business documents

Print versions of the business card, rate cards, receipt and service agreement, styled to match the site:
cobalt accent, midnight navy, the lime square in the mark, and Archivo type.

| Source | Output in `pdf/` |
| --- | --- |
| `business-card.html` | `Layo-Business-Card.pdf` (front and back, 3.2 × 2.2 in) |
| `rate-card.html?currency=NGN` | `Layo-Rate-Card-NGN.pdf` |
| `rate-card.html?currency=USD` | `Layo-Rate-Card-USD.pdf` |
| `receipt.html` | `Layo-Receipt-Template.pdf` (blank) |
| `receipt.html?sample` | `Layo-Receipt-Sample.pdf` |
| `service-agreement.html` | `Layo-Service-Agreement.pdf` |

`brand.css` holds the shared tokens, copied from the light theme in `src/app/globals.css`. If the site
colours change, update them there too. Prices for both currencies are in the script at the bottom of
`rate-card.html`, and the sample receipt's values are at the bottom of `receipt.html`.

## Rebuild

```bash
node documents/build.mjs
```

This needs Playwright with Chromium. Each page is a fixed A4 sheet, and the build fails with a warning
if any page's content runs past its sheet.

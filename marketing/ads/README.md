# layothedeveloper ads

Two 30-second vertical video ads and two flyers. Finished files are in `out/`.

| File | What it is |
| --- | --- |
| `out/layothedeveloper-ad-1-i-make-it-work.mp4` | Video A, "I make it work": problem to fix, one continuous take |
| `out/layothedeveloper-ad-2-i-build-it.mp4` | Video B, "Need it built? I build it.": services and recent work, one continuous take |
| `out/layothedeveloper-flyer-*-4x5.png` | Feed flyers, 1080×1350 |
| `out/layothedeveloper-flyer-*-9x16.png` | WhatsApp Status / Stories flyers, 1080×1920 |
| `out/*.pdf` | The same flyers as PDF, for print or sending |

## Re-rendering

The videos are [HyperFrames](https://hyperframes.heygen.com) compositions (HTML + GSAP). Each project pins its CLI version.

```bash
cd marketing/ads/video-a && npx hyperframes check && npx hyperframes render -q delivery -o ../out/layothedeveloper-ad-1-i-make-it-work.mp4
cd marketing/ads/video-b && npx hyperframes check && npx hyperframes render -q delivery -o ../out/layothedeveloper-ad-2-i-build-it.mp4
```

Preview and edit in the browser with `npx hyperframes preview` inside either folder.

Flyers render with the repo's Playwright:

```bash
node marketing/ads/flyers/export.cjs
```

## What to change where

- Phone, site and copy are plain text in each `index.html` and flyer HTML. Search for `+234 807 945 1031` to change the number everywhere.
- Colours are the site's tokens from `src/app/globals.css`, copied into each file's `:root`.
- Music in `video-*/assets/music/` was generated locally with MusicGen (facebook/musicgen-small) for these ads. Sound effects in `assets/sfx/` are the Pixabay-licensed set bundled with HyperFrames. Tech logos are from Simple Icons (CC0); the WhatsApp and globe icons are Phosphor, as on the site.

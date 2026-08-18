# Danica & Dan — house and pet sitting

A single static page. No framework, no build step; the justified photo galleries
are CSS alone. The one piece of JavaScript is `docs/lightbox.js`, which opens a
photo full screen — delete the `<script>` tag at the bottom of `index.html` and
the page is exactly what it was without it.

```
docs/          the site itself — this is what GitHub Pages serves
  index.html
  style.css
  lightbox.js  full-screen photo viewer; the page works without it
  images/      generated; do not edit by hand
originals/     full-size photos and review screenshots (not committed)
tools/         image pipeline
```

Open `docs/index.html` in a browser. It works straight off the filesystem.

## Deploying to GitHub Pages

1. Create a **public** repository named **`housesitting`** (lowercase — the name
   becomes part of the URL). Don't let GitHub add a README or .gitignore.
2. From this folder:

   ```
   git remote add origin https://github.com/danicachang/housesitting.git
   git push -u origin main
   ```

3. **Settings → Pages → Source → Deploy from a branch**, branch `main`, folder
   **`/docs`**.

The page appears at `https://danicachang.github.io/housesitting/` within a
minute or two.

## Changing things

**A review.** Every sit is one `<article class="sit">` in the reviews section,
holding a `<div class="sit__body">` with the reviewer and the review, and a
`<div class="sit__gallery">` with that sit's photos. Copy an existing article
and edit it. Reviews are quoted exactly as hosts wrote them, typos included, and
always in full rather than behind a "read more".

**A photo.** Drop the original into `originals/`, add a line to the `photos`
array in `tools/build-images.mjs` with a slug and a caption, then:

```
npm install        # first time only
node tools/build-images.mjs
```

That writes an 800px and a 1600px WebP into `docs/images/`, and prints the three
attributes each photo needs, ready to paste:

```
photo  oakland-dan-trail  4326x2884 -> width="1600" height="1067" style="--ar: 1.5"
```

`--ar` is the aspect ratio the gallery lays out from; CSS can't read it back off
`width`/`height`, which is the only reason it's written out. The build also
lists anything in `originals/` that isn't published — photos left out on purpose
go in the `skipped` map with a reason.

Then add the `<img>` to the `sit__gallery` of the sit it came from. Position
matters only at the top: the first photos in the source land in the short row
that opens the gallery, so the strongest shot belongs first.

**The lightbox.** Adding a photo needs nothing here. It reads two class names
out of `index.html`, and **renaming either breaks it silently**:

- `.gallery` decides which photos are clickable, and each gallery is its own
  slideshow — the arrows stop at the ends of that sit. Photos outside a gallery
  (the hero, the two `split__media` photos, the avatars) don't open.
- `.sit__where` supplies the caption, so each photo is captioned with the place,
  date and duration from its sit card. There are no per-photo captions to keep
  in sync. The "who we are" gallery has no sit card, so those photos show the
  counter alone.

It adds no image files — the viewer reuses the gallery's own `srcset`, painting
the cached thumbnail first and swapping in the 1600 once it decodes. Photos are
never enlarged past their own file: each is capped at its `width` attribute, so
the one small original (`oakland-danica-cat`, 961px) behaves correctly without
being special-cased.

**The email address.** It appears twice in the contact card, as the `mailto:`
and as the visible text of the same link. Both are `dan.goyette@gmail.com`;
change one and change the other. The `href` needs the `mailto:` scheme or the
browser reads it as a relative link.

**The site URL.** `og:url` and `og:image` in the `<head>` hardcode
`https://danicachang.github.io/housesitting/`. If the site moves, they move
with it or link previews break.

**The copyright year** in the footer is written out, not generated. It needs
bumping by hand each January.

**Adding a section.** Sections alternate tone so no two neighbours share a
background — paper, `tint`, the dark band, `tint`, paper, `tint`. Adding or
moving one may mean re-toning the ones after it. `.tint` paints the tone;
`.band` is the width utility to use *instead of* `.wrap` when the tone has to
run to the edge of the window. Section numbers come from a CSS counter, so
`class="numbered"` on a `<section>` numbers its `<h2>` automatically.

## Notes

- **`originals/` is gitignored on purpose.** The full-size photos carry EXIF
  metadata and were taken inside other people's homes. The generated WebP files
  have no EXIF — sharp drops it. Back `originals/` up somewhere other than
  GitHub.
- `tools/build-images.mjs` also crops the reviewer avatars out of the
  TrustedHousesitters screenshots, locating each by scanning the top-left corner
  for non-white pixels. The three Kiwi and Aussie House Sitters reviews have no
  avatars — neither site shows reviewer photos — and use a monogram instead:
  `<div class="avatar avatar--initial">` in place of the `<img>`.
- **Nothing on the page is cropped** except the hero. No `object-fit: cover`, no
  fixed `aspect-ratio`, no `object-position` nudges; the layouts absorb the
  varying shapes instead.
- **The galleries are justified rows in CSS alone.** Each photo's `flex-grow`
  and `flex-basis` are both proportional to its aspect ratio, so every photo in
  a row lands on the same height. Two lines in `style.css` look like mistakes
  and aren't: `min-width: 0` on the images, without which flex won't shrink a
  photo below its intrinsic 800px; and the pair of reversals (`order` counting
  down, `row-reverse` plus `wrap-reverse`) that move the short row to the top
  without disturbing reading or DOM order.
- **`--row-h` is a percentage, not a length.** `flex-basis` percentages resolve
  against the container, so every sit breaks into the same rows at every window
  size. A pixel value can't do that — the column slides from 451px to 945px
  across the breakpoints. 24% was checked against every sit across that range;
  below 40rem it opens to 32%, since three photos to a row is too many on a
  phone.
- **`sizes` describes the column, not the photo.** A photo's width in a
  justified row depends on everything else in its row, so a per-image value goes
  stale as soon as a sit gains a photo. It tracks the column: if the 1.2fr split
  changes, this changes with it.
- **Two fonts load from Google Fonts** — Lora and Raleway. This is the page's
  only external request. Both use `display=swap` behind a `preconnect` and the
  CSS lists full system fallbacks, so deleting the `<link>` tags drops back to
  system fonts with no other changes.
- **The colours are semantic tokens, not raw hex** — `--ink`, `--surface`,
  `--accent` and so on, defined at the top of `style.css` with their measured
  contrast ratio beside each. The lightbox has its own tokens because the ratios
  don't transfer: `--ink-subtle` is 3.1:1 on the dark backdrop and `--accent` is
  2:1 there, below what a focus ring needs. Anything added to the viewer has to
  be checked against `--backdrop`.
- `sharp` is a dev dependency. It runs on your machine to produce image files
  and is never involved in serving the site.

# Danica & Dan — house and pet sitting

A single static page. No framework and no build step, and the justified photo
galleries are CSS alone. The one piece of JavaScript is `docs/lightbox.js`,
which opens a photo full screen; delete the `<script>` tag at the bottom of
`index.html` and the page is exactly what it was without it.

```
docs/          the site itself — this is what GitHub Pages serves
  index.html
  style.css
  lightbox.js  full-screen photo viewer; the page works without it
  images/      generated; do not edit by hand
originals/     full-size photos and review screenshots (not committed)
tools/         one-off image pipeline
```

## Looking at it

Open `docs/index.html` in a browser. It works straight off the filesystem —
there's nothing to serve.

## Deploying to GitHub Pages

1. Create a repository on GitHub named **`housesitting`** (lowercase — the name
   becomes part of the URL), **Public**. Pages needs a paid plan on private
   repositories. Don't let GitHub add a README or .gitignore; this repo already
   has both.
2. From this folder:

   ```
   git remote add origin https://github.com/danicachang/housesitting.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Source → Deploy from a branch**, branch
   `main`, folder **`/docs`**.

The page appears at `https://danicachang.github.io/housesitting/` within a
minute or two.

## Changing things

**A review.** Every sit is one `<article class="sit">` in the reviews section,
holding two things: a `<div class="sit__body">` with the reviewer and the
review, and a `<div class="sit__gallery">` with every photo from that sit.
Copy an existing article and edit it. Reviews are quoted exactly as hosts
wrote them, typos included; that's deliberate, it's what makes them read as
real, and the whole review is always on the page rather than behind a "read
more". Reviewer names are `<h3>`, directly under the section's `<h2>`.

**A photo.** Drop the original into `originals/`, add a line to the `photos`
array in `tools/build-images.mjs` giving it a slug and a caption, then:

```
npm install        # first time only
node tools/build-images.mjs
```

That writes an 800px and a 1600px WebP into `docs/images/`, and prints a list
of anything in `originals/` that isn't published — if a photo shows up there,
it's been added to the folder but not to the array. Photos that are left out
on purpose go in the `skipped` map with the reason.

Then put it on the page, in the `sit__gallery` of the sit it came from. The
build prints the three attributes each photo needs, ready to paste:

```
photo  oakland-dan-trail  4326x2884 -> width="1600" height="1067" style="--ar: 1.5"
```

`width` and `height` reserve the right space while the image loads. `--ar` is
the same ratio as a number, and the gallery lays out from it — CSS can't read
it back off the other two, which is the only reason it's written out. Nothing
is cropped, so there's no frame to fit and no `object-position` to set.

The photo's position in the gallery matters at the top and nowhere else. The
first photos in the source are the ones that land in the short, tall row that
opens the gallery, so the strongest shot of a sit belongs first; the rest can
fall in any order.

**The lightbox.** Adding a photo needs nothing here — that's the point of it.
`docs/lightbox.js` attaches to `.gallery`, so any photo in any gallery is
clickable the moment it's on the page, and each gallery is its own slideshow:
the arrows run to the ends of that sit and stop, and never carry you into the
next one. Nothing else on the page opens — not the hero, not the two large
`split__media` photos, not the reviewer avatars.

It reads two things out of `index.html`, and **renaming either breaks it in
silence** — no error, no console warning:

- `.gallery` decides which photos are clickable at all.
- `.sit__where` supplies the caption, so a photo is captioned with the place,
  date and duration its sit card already gives — *Taupō, New Zealand · May 2023
  · 1 month 1 week*. There is no per-photo caption anywhere and nothing to keep
  in sync; edit the sit card and the caption follows. The "who we are" gallery
  has no sit card above it, so those seven photos show the counter alone. The
  shepherd photo beside the contact card isn't in a gallery at all, so it
  doesn't open — the same as the two other photos set beside text.

It adds no image files. The viewer reuses the same `srcset` the gallery already
has, painting the thumbnail out of cache first so the frame is never empty and
swapping in the 1600 once it decodes. On a retina screen that file has usually
been fetched already, and opening a photo costs nothing.

**The email address.** It appears twice in the contact card near the bottom of
`docs/index.html`, as the `mailto:` and as the visible text of the same link —
the address is the action down there, so it has to be both clickable and
readable. Both are `dan.goyette@gmail.com`; change one and change the other.
The `href` needs the `mailto:` scheme on it — without that it reads as a
relative link and the browser goes looking for a file of that name.

**The site URL.** Three `<meta>` tags in the `<head>` — `og:url` and
`og:image`, plus the mailto — hardcode
`https://danicachang.github.io/housesitting/`. If the site ever moves, those
absolute URLs have to move with it, or link previews break.

**Where the button is.** One, under the hero: `<a class="cta" href="#contact">`,
and all it does is jump to the contact card. There was a second directly after
the last review, on the reasoning that a host convinced by review three
shouldn't have to scroll past ten more to act; it was removed. If the reviews
ever feel like they end in mid-air, that's the gap it filled. The card at the
foot has had a button of its own twice now, and both times it came out again:
the address is right there, and a button beside it is a second route to the
same `mailto:`.

**The copyright year** in the footer is written out in the HTML, not generated —
there is no build step, and the only script on the page is the lightbox. It
needs bumping by hand each January.

**Adding a section.** Sections alternate tone so no two neighbours share a
background — paper under the hero, then `tint`, the dark band, `tint`, paper,
`tint` to the foot. A new section has to keep that alternating, which means
adding or moving one may mean re-toning the ones after it. Two classes do it:
`.tint` paints the tone, and `.band` is the width utility to use *instead of*
`.wrap` when the tone has to run to the edge of the window — same content width,
set as padding rather than width, so the box itself is full-bleed. A section
that stays on paper just keeps `.wrap`.

## Notes

- **`originals/` is gitignored on purpose.** The full-size photos carry EXIF
  metadata, and they were taken inside other people's homes. Keeping them out
  of a public repository avoids publishing anything the site itself doesn't
  show. The generated WebP files in `docs/images/` have no EXIF — sharp drops
  it. Back `originals/` up somewhere other than GitHub.
- `tools/build-images.mjs` also crops the reviewer avatars out of the
  TrustedHousesitters screenshots. It locates each one by scanning the top-left
  corner for non-white pixels rather than cropping at a fixed offset — the
  screenshots vary in width, and a proportional crop drifts off the avatar as
  they get wider.
- The three Kiwi and Aussie House Sitters reviews have no avatars, because
  neither site shows reviewer photos. They use a monogram of the same size
  instead — `<div class="avatar avatar--initial">` in place of the `<img>`.
- There is no separate photo gallery. Every photo is attached to the sit it was
  taken on, which is the point: each one is evidence for the review sitting
  next to it. That also means each photo appears exactly once, so adding a
  photo to a sit is the only place it needs to go.
- **Nothing on the page is cropped.** Every image is shown at the proportions
  it was shot at — no `object-fit: cover`, no fixed `aspect-ratio` on a photo,
  no `object-position` nudges. Layouts have to absorb the varying shapes
  instead: the sit galleries justify photos into rows of equal height, and the
  "who we are" trio is aligned to the top of its row.
- **The sit galleries are justified rows, in CSS alone.** Each photo's
  `flex-grow` and `flex-basis` are both proportional to its aspect ratio, so a
  row's leftover space is shared out in proportion to width and every photo in
  it lands on the same height. Two things in `style.css` are load-bearing and
  look like mistakes if you don't know why they're there: `min-width: 0` on the
  images, without which flex refuses to shrink a photo below its intrinsic
  800px and puts one per row; and the pair of reversals — `order` counting
  down, `row-reverse` plus `wrap-reverse` on the container — which move the
  short leftover row from the bottom to the top without disturbing reading or
  DOM order. Both are commented in place.
- **The photo column is the wider half, and it widens again on big screens** —
  `1.2fr` against `1fr` from 58rem (about 55/45), then `1.6fr` from 90rem
  (about 62/38). The review pays nothing for this where it has slack: its
  paragraphs are capped at `--measure` (36rem), so past a point the extra
  column width was going unused anyway. The two tiers exist because that slack
  isn't there at the bottom of the range — `1.6fr` at a 928px window would cut
  the review to 40 characters a line, where at 1440px and up it still leaves
  62 to 72.
- **`--row-h` is tuned to the photos, and it is not a smooth dial.** It sets
  the target row height, which decides how many photos land in that top row.
  What matters up there is the *shape* of what lands in it, not the count: a
  row's height is the column width over the sum of its aspect ratios, so alone
  in an 838px column a landscape is 559px, a square is 838px and a portrait is
  1256px.

  **It is a percentage, not a length, and that is the point.** `flex-basis`
  percentages resolve against the container, so the target is always the same
  fraction of the gallery's own width, and every sit breaks into the same rows
  holding the same photos at every window size — only the size changes. A pixel
  value cannot do that: the column slides from 451px to 945px across the
  breakpoints, and a target giving three good rows at one end gives one row at
  the other. Two rounds of tuning went into chasing that before the units
  turned out to be the problem.

  24% is the value that satisfies everything at once, checked against every sit
  from 451px to 945px: no sit collapses to a single row, nothing worse than a
  landscape ever lands alone on top, and galleries stay near 1.06× the column
  tall so they don't tower over the review. Below 40rem it opens to 32%,
  because three photos to a row is too many on a phone.
- **`sizes` describes the column, not the photo.** A photo's rendered width in
  a justified row depends on everything else in its row, so it changes whenever
  a sit gains a photo and can't be written per-image without going stale. Since
  there are only two candidates in each `srcset`, every value between about
  24vw and the column's own 48vw picks the same file at desktop — so the
  column width is both the honest description and the one that stays true.
  It tracks the column: if the 1.2fr split changes, this changes with it.
- `sharp` is a dev dependency only. It runs on your machine to produce image
  files and is never involved in serving the site.
- **The page loads two fonts from Google Fonts** — Lora for headings and the
  reviews, Raleway for everything else. This is the one external request the
  page makes. Both are requested with `display=swap` behind a `preconnect`, and
  the CSS lists full system fallbacks, so the page reads fine before they
  arrive and fine if they never do. Deleting the `<link>` tags in the `<head>`
  drops back to system fonts with no other changes needed.
- **The colours are semantic tokens, not raw hex.** `--ink`, `--ink-muted`,
  `--ink-subtle`, `--surface`, `--accent` and so on are defined once at the top
  of `style.css` with their measured contrast ratio in a comment beside each.
  Use the tokens in components rather than reintroducing literal hex — the
  ratios are what keep the small grey metadata text legible.
- **The lightbox is the one place JavaScript was worth it, and it buys exactly
  one thing.** Everything else on this page was cheaper in CSS — the justified
  galleries are the proof, and they still are. A full-screen viewer isn't: the
  CSS-only version needs a `:target` panel per photo, which means 92 duplicate
  `<img>` tags in the markup, a Back button that walks backwards through the
  slideshow one photo at a time, and no Esc key. So the rule became *the page is
  static, the viewer is an enhancement* — hence no markup for it in
  `index.html`, and `tabindex`/`role` set from the script rather than typed into
  the page. Without the file nothing advertises a viewer that isn't there.
- **Photos are never enlarged past their own file.** The viewer caps each photo
  at the `width` attribute already on it, so on a very wide screen a 1600px
  photo stops at 1600px and gains backdrop rather than softening. It's the same
  commitment as never cropping, pointing the other way. One original —
  `oakland-danica-cat` — was smaller than the rest and is 961px wide; the cap is
  read per photo rather than special-cased, so the next small original behaves
  correctly without anyone remembering to handle it.
- **The lightbox colours are measured against the backdrop, not the page.** Two
  tokens that look redundant aren't: `--on-backdrop` exists because
  `--ink-subtle`, the colour of every caption on the page, is 3.1:1 on a dark
  panel and fails outright, and the focus ring is restated inside `.lightbox`
  because `--accent` is 8.3:1 on paper but 2:1 there — below the 3:1 a focus
  indicator needs. Anything added to the viewer has to be checked against
  `--backdrop`; the ratios in the main palette don't transfer.
- **The end of a set is said three ways, and each input gets exactly one.** The
  arrow disables, which a mouse user can see — and a disabled button emits no
  click, so that feedback reaches nobody else. A key press gets a 220ms nudge,
  because a keystroke has nothing spatial about it to feel. A drag gets neither:
  it already follows at quarter speed and springs home, which is the rubber band,
  and nudging on top of that moves the photo the same way twice and reads as a
  double bounce. All of it is covered by the existing `prefers-reduced-motion`
  block, which is why the viewer's CSS has no media query of its own.
- **Section numbers are a CSS counter**, not typed into the HTML. Adding
  `class="numbered"` to a `<section>` gives its `<h2>` the next number
  automatically, so inserting or removing a section renumbers the rest.

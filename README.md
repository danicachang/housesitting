# Danica & Dan — house and pet sitting

A single static page. No framework, no build step, no JavaScript.

```
docs/          the site itself — this is what GitHub Pages serves
  index.html
  style.css
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
holding three things: a `<figure class="sit__lead">` with the one photo that
opens the card, a `<div class="sit__body">` with the reviewer and the review,
and — for sits with more than one photo — a `<div class="sit__gallery">` with
all the rest. Copy an existing article and edit it. Reviews are quoted exactly
as hosts wrote them, typos included; that's deliberate, it's what makes them
read as real, and the whole review is always on the page rather than behind a
"read more". Reviewer names are `<h3>`, directly under the section's `<h2>`.

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

Then put it on the page, in the `sit__gallery` of the sit it came from. Copy
the `width` and `height` from the build output; nothing is cropped, so those
numbers are what reserve the right amount of space while the image loads. The
gallery lays out in columns and lets photos of different shapes fall where
they fall, so there's no frame to fit and no `object-position` to set.

**The email address.** It appears twice in the contact section near the bottom
of `docs/index.html`, as the link target and the visible text. It is still the
`REPLACE-WITH-YOUR-ADDRESS@example.com` placeholder — the page can't do its job
until that's a real address.

**The site URL.** Three `<meta>` tags in the `<head>` — `og:url` and
`og:image`, plus the mailto — hardcode
`https://danicachang.github.io/housesitting/`. If the site ever moves, those
absolute URLs have to move with it, or link previews break.

**Where the "Get in touch" buttons are.** Two of them: one under the hero, one
directly after the last review. Both are `<a class="cta" href="#contact">`.
They exist because a host who's convinced by review three shouldn't have to
scroll past ten more to act.

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
  instead: the sit galleries use CSS columns, the "who we are" trio is aligned
  to the top of its row, and a tall lead photo is scaled down by `max-height`
  rather than being trimmed to fit.
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
- **Section numbers are a CSS counter**, not typed into the HTML. Adding
  `class="numbered"` to a `<section>` gives its `<h2>` the next number
  automatically, so inserting or removing a section renumbers the rest.

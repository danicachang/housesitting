// One-time image pipeline. Not part of serving the site — run it only when
// photos are added or replaced.
//
//   npm install sharp
//   node tools/build-images.mjs
//
// Reads the full-size photos and the review screenshots from originals/, and
// writes web-sized WebP into docs/images/. originals/ is deliberately not
// committed — see .gitignore — so this script only runs on a machine that has
// the source files locally.

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'originals');
const out = path.join(root, 'docs', 'images');

// Photos worth publishing, with the slug they get on the site. Order here is
// the order they appear in the gallery. 20210414 is deliberately excluded:
// Dan is wearing a covid mask and the dogs aren't from a sit.
const photos = [
  // Nico, the standard poodle from Gill's sit in Taupo, May 2023. All three
  // were taken on the same day; the lake in the background is Taupo itself.
  ['20230523-04-43-53.jpg', 'nz-danica-poodle', 'Nico — Taupō, New Zealand, 2023'],
  ['20230523-06-39-55.jpg', 'nz-dan-poodle-lake', 'Nico — Taupō, New Zealand, 2023'],
  ['20230523-04-35-30.jpg', 'nz-dan-poodle-maple', 'Nico — Taupō, New Zealand, 2023'],

  ['20240705-04-31-26.jpg', 'denver-three-dogs', 'Denver, Colorado, 2024'],

  ['20220626-08-57-51.jpg', 'sheffield-cockers-gate', 'Sheffield, England, 2022'],
  ['20220626-08-38-19.jpg', 'sheffield-cockers-walk', 'Sheffield, England, 2022'],
  ['20220713-02-43-44.jpg', 'sheffield-cockers-woods', 'Sheffield, England, 2022'],

  ['20220805-13-33-55.jpg', 'leeds-ginger-cat', 'Leeds, England, 2022'],
  ['20220610-08-02-41.jpg', 'richmond-terrier', 'Richmond, England, 2022'],

  ['20211215-20-54-17.jpg', 'estes-danica-fireside', 'Estes Park, Colorado, 2021'],
  ['20211213-16-00-33.jpg', 'estes-dan-trail', 'Estes Park, Colorado, 2021'],

  ['2022-01-31(1).jpeg', 'oakland-danica-cat', 'Oakland, California, 2022'],
  ['20220129-21-37-43.jpg', 'oakland-cat-and-dog', 'Oakland, California, 2022'],
  ['20220203-13-31-31.jpg', 'oakland-dog-window', 'Oakland, California, 2022'],
  ['20220205-17-32-12.jpg', 'oakland-dog-floor', 'Oakland, California, 2022'],

  ['20211010-18-12-36.jpg', 'tuxedo-cat', '2021'],
  ['20200131-09-47-50.jpg', 'trail-dogs', '2020'],

  // Older, personal photos. These predate the sitting and are used in the
  // "who we are" section rather than the gallery, so they aren't captioned
  // as sits.
  ['20170924-12-57-45.jpg', 'about-hiking', 'Colorado, 2017'],
  ['20140202-705.JPG', 'about-shepherd', '2014'],
  ['20130106-211.jpg', 'about-danica-puppy', '2013'],
  ['20130106-254.jpg', 'about-danica-cat', '2013'],
];

// Reviewer avatars live in the top-left of each screenshot. The screenshots
// were taken at slightly different zoom levels, so the crop is expressed as a
// fraction of image width rather than in pixels.
const avatars = [
  ['Screenshot 2025-04-11 194927.png', 'jeff'],
  ['Screenshot 2025-04-11 195012.png', 'cassio'],
  ['Screenshot 2025-04-11 195035.png', 'julie'],
  ['Screenshot 2025-04-11 195044.png', 'jane'],
  ['Screenshot 2025-04-11 195056.png', 'sandra'],
  ['Screenshot 2025-04-11 195106.png', 'alison'],
  ['Screenshot 2025-04-11 195113.png', 'lyn'],
  ['Screenshot 2025-04-11 195121.png', 'mary'],
  ['Screenshot 2025-04-11 195130.png', 'elizabeth'],
  ['Screenshot 2025-04-11 195141.png', 'lillian'],
];

const WIDTHS = [1600, 800];

// The screenshots differ in width because the browser window was resized
// between them, but the avatar is a constant 58px in all of them — so it can't
// be cropped at a fixed fraction of the image width. Find it instead: it's the
// only non-white thing in the top-left corner, so scan for pixels that differ
// from the page background and square the bounding box off around its centre.
async function findAvatar(image, width) {
  // The avatar circle ends around 0.11 of the image width and the reviewer's
  // name starts around 0.145, so search a window between the two.
  const search = Math.round(width * 0.125);
  const { data, info } = await image
    .clone()
    .extract({ left: 0, top: 0, width: search, height: search })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = search, minY = search, maxX = -1, maxY = -1;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      // Anything meaningfully darker or more saturated than the page white.
      if (data[i] > 246 && data[i + 1] > 246 && data[i + 2] > 246) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) throw new Error('no avatar found in top-left corner');

  // Pale avatars can lose a rim of near-white pixels to the threshold, so key
  // the size off the larger axis and re-centre rather than trusting the box.
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const size = Math.max(maxX - minX, maxY - minY) + 1;

  return {
    left: Math.max(0, Math.round(cx - size / 2)),
    top: Math.max(0, Math.round(cy - size / 2)),
    width: size,
    height: size,
  };
}

await mkdir(path.join(out, 'avatars'), { recursive: true });

const manifest = [];

for (const [file, slug, caption] of photos) {
  const image = sharp(path.join(src, file)).rotate();
  const meta = await image.metadata();

  // Every slug gets both sizes even when the original is small, so the
  // srcset in index.html can be written the same way for every photo.
  const sizes = {};
  for (const w of WIDTHS) {
    const info = await image
      .clone()
      .resize({ width: Math.min(w, meta.width) })
      .webp({ quality: 78 })
      .toFile(path.join(out, `${slug}-${w}.webp`));
    sizes[w] = { width: info.width, height: info.height };
  }

  manifest.push({ slug, caption, ...sizes[WIDTHS[0]] });
  console.log(
    `photo  ${slug.padEnd(24)} ${meta.width}x${meta.height}` +
      ` -> ${sizes[WIDTHS[0]].width}x${sizes[WIDTHS[0]].height}`
  );
}

for (const [file, slug] of avatars) {
  const shot = sharp(path.join(src, file));
  const { width } = await shot.metadata();
  const box = await findAvatar(shot, width);

  await shot
    .clone()
    .extract(box)
    .resize(128, 128)
    .webp({ quality: 82 })
    .toFile(path.join(out, 'avatars', `${slug}.webp`));

  console.log(
    `avatar ${slug.padEnd(10)} ${box.width}px at ${box.left},${box.top}`
  );
}

await writeFile(
  path.join(out, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);

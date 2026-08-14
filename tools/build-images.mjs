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
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'originals');
const out = path.join(root, 'docs', 'images');

// Photos worth publishing, with the slug they get on the site. Grouped by the
// sit they came from, in the order the sits appear on the page; every photo in
// a group ends up in that sit's card. 20210414 is the only original left out:
// Dan is wearing a covid mask and the dogs aren't from a sit.
const photos = [
  // Nico, the standard poodle from Gill's sit in Taupo, May 2023. All three
  // were taken on the same day; the lake in the background is Taupo itself.
  ['20230523-04-35-30.jpg', 'nz-dan-poodle-maple', 'Nico — Taupō, New Zealand, 2023'],
  ['20230523-04-43-53.jpg', 'nz-danica-poodle', 'Nico — Taupō, New Zealand, 2023'],
  ['20230523-06-39-55.jpg', 'nz-dan-poodle-lake', 'Nico — Taupō, New Zealand, 2023'],

  // The two cocker spaniels from Alison's sit in Sheffield, Jun–Jul 2022.
  ['20220626-08-57-51.jpg', 'sheffield-cockers-gate', 'Sheffield, England, 2022'],
  ['20220626-08-38-19.jpg', 'sheffield-cockers-walk', 'Sheffield, England, 2022'],
  ['20220701-08-06-03.jpg', 'sheffield-danica-cockers', 'Sheffield, England, 2022'],
  ['20220701-08-33-34.jpg', 'sheffield-dan-cocker', 'Sheffield, England, 2022'],
  ['20220713-02-43-44.jpg', 'sheffield-cockers-woods', 'Sheffield, England, 2022'],
  ['20220713-03-10-29.jpg', 'sheffield-danica-reservoir', 'Sheffield, England, 2022'],

  // Jeff's three dogs in Denver, Jul–Aug 2024. The big tan one is the
  // constant in the trail photos; the foothills are the Green Mountain side.
  ['20240705-04-31-26.jpg', 'denver-three-dogs', 'Denver, Colorado, 2024'],
  ['20240708-16-07-57.jpg', 'denver-dan-scruffy', 'Denver, Colorado, 2024'],
  ['20240710-20-00-32.jpg', 'denver-dog-belly', 'Denver, Colorado, 2024'],
  ['20240714-03-07-38.jpg', 'denver-dan-photo', 'Denver, Colorado, 2024'],
  ['20240717-01-06-19.jpg', 'denver-dan-foothills', 'Denver, Colorado, 2024'],
  ['20240717-01-21-18.jpg', 'denver-danica-trail', 'Denver, Colorado, 2024'],
  ['20240719-02-47-46.jpg', 'denver-dan-sunset', 'Denver, Colorado, 2024'],
  ['20240723-02-44-49.jpg', 'denver-dog-trail', 'Denver, Colorado, 2024'],

  // Millie, the English Staffy from Lee-Ann's sit in Mile End, Jul–Aug 2023.
  ['20230727-18-40-07.jpg', 'adelaide-dan-millie', 'Millie — Mile End, Australia, 2023'],
  ['20230807-14-42-28.jpg', 'adelaide-dan-millie-sofa', 'Millie — Mile End, Australia, 2023'],
  ['20230816-11-41-18.jpg', 'adelaide-millie-table', 'Millie — Mile End, Australia, 2023'],
  ['20230821-14-09-24.jpg', 'adelaide-millie-hose', 'Millie — Mile End, Australia, 2023'],
  ['20230823-21-29-32.jpg', 'adelaide-millie-chest', 'Millie — Mile End, Australia, 2023'],
  ['20230828-23-32-31.jpg', 'adelaide-danica-millie', 'Millie — Mile End, Australia, 2023'],
  ['20230830-12-47-35.jpg', 'adelaide-millie-tug', 'Millie — Mile End, Australia, 2023'],

  // Mary's cat and terrier in Oakland, Jan–Feb 2022.
  ['20220205-17-32-12.jpg', 'oakland-dog-floor', 'Oakland, California, 2022'],
  ['2022-01-31(1).jpeg', 'oakland-danica-cat', 'Oakland, California, 2022'],
  ['20220129-21-37-43.jpg', 'oakland-cat-and-dog', 'Oakland, California, 2022'],
  ['20220203-13-31-31.jpg', 'oakland-dog-window', 'Oakland, California, 2022'],

  ['20220805-13-33-55.jpg', 'leeds-ginger-cat', 'Leeds, England, 2022'],

  // Frankie, the Boston terrier from Bianca's sit in Auckland, Jun–Jul 2023.
  // The city behind the hill shot is the view from Maungawhau.
  ['20230619-11-41-08-2.jpg', 'auckland-frankie-hill', 'Frankie — Auckland, New Zealand, 2023'],
  ['20230615-12-07-25.jpg', 'auckland-frankie-toy', 'Frankie — Auckland, New Zealand, 2023'],
  ['20230618-12-50-08.jpg', 'auckland-danica-frankie', 'Frankie — Auckland, New Zealand, 2023'],
  ['20230619-06-34-30.jpg', 'auckland-dan-frankie', 'Frankie — Auckland, New Zealand, 2023'],
  ['20230619-16-56-10.jpg', 'auckland-dan-frankie-nose', 'Frankie — Auckland, New Zealand, 2023'],
  ['20230713-17-28-34.jpg', 'auckland-dan-frankie-arms', 'Frankie — Auckland, New Zealand, 2023'],

  // Rusty, the cavoodle from Julie's sit in Brisbane, Sep–Oct 2023.
  ['20230922-12-46-46.jpg', 'brisbane-rusty-lap', 'Rusty — Brisbane, Australia, 2023'],
  ['20230908-16-42-00.jpg', 'brisbane-rusty-blossom', 'Rusty — Brisbane, Australia, 2023'],
  ['20230913-21-22-53.jpg', 'brisbane-rusty-chair', 'Rusty — Brisbane, Australia, 2023'],
  ['20230913-21-27-15.jpg', 'brisbane-danica-rusty', 'Rusty — Brisbane, Australia, 2023'],
  ['20230923-21-17-12.jpg', 'brisbane-rusty-belly', 'Rusty — Brisbane, Australia, 2023'],
  ['20230924-11-35-42.jpg', 'brisbane-rusty-deck', 'Rusty — Brisbane, Australia, 2023'],
  ['20230929-15-31-25.jpg', 'brisbane-dan-rusty', 'Rusty — Brisbane, Australia, 2023'],
  ['20231001-16-28-20.jpg', 'brisbane-rusty-pier', 'Rusty — Brisbane, Australia, 2023'],

  // Elizabeth's two dogs in Estes Park, Dec 2021 — a week in the mountains
  // over Christmas.
  ['20211215-20-54-17.jpg', 'estes-danica-fireside', 'Estes Park, Colorado, 2021'],
  ['20211213-16-00-33.jpg', 'estes-dan-trail', 'Estes Park, Colorado, 2021'],
  ['20211215-13-15-01.jpg', 'estes-danica-tree', 'Estes Park, Colorado, 2021'],
  ['20211215-18-27-49.jpg', 'estes-dan-armchair', 'Estes Park, Colorado, 2021'],

  // Lyn's border terriers in Richmond, May–Jun 2022. One of the walks from
  // the house goes past an abbey ruin — that's the background of -abbey.
  ['20220610-08-02-41.jpg', 'richmond-terrier', 'Richmond, England, 2022'],
  ['20220509-03-13-46.jpg', 'richmond-danica-abbey', 'Richmond, England, 2022'],
  ['20220515-04-39-15.jpg', 'richmond-dan-window', 'Richmond, England, 2022'],
  ['20220523-03-50-43.jpg', 'richmond-terrier-table', 'Richmond, England, 2022'],
  ['20220606-05-47-40.jpg', 'richmond-dan-floor', 'Richmond, England, 2022'],
  ['20220608-14-05-03.jpg', 'richmond-dan-arms', 'Richmond, England, 2022'],

  ['20240427-03-02-51-Enhanced-NR.jpg', 'sumida-barney', 'Barney — Sumida, Japan, 2024'],

  // Sandra's ageing cockapoo and cat in Harrogate, Jul 2022.
  ['20220721-07-41-11.jpg', 'harrogate-dog-sofa', 'Harrogate, England, 2022'],
  ['20220724-03-33-41.jpg', 'harrogate-danica-dog', 'Harrogate, England, 2022'],
  ['20220724-08-45-52.jpg', 'harrogate-cat-brush', 'Harrogate, England, 2022'],
  ['20220724-08-52-51-2.jpg', 'harrogate-dan-sofa', 'Harrogate, England, 2022'],
  ['20220726-02-50-55.jpg', 'harrogate-dog-walk', 'Harrogate, England, 2022'],

  ['20211123-19-33-18.jpg', 'longmont-terrier', 'Longmont, Colorado, 2021'],

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

// Originals that are deliberately not published, and why. Anything in
// originals/ listed neither here nor in `photos` above is reported at the end
// of the run — a photo dropped into the folder shouldn't silently miss the
// page just because nobody remembered to add it here.
const skipped = new Map([
  ['20210414-17-34-21.jpg', 'covid mask, and the dogs are strays rather than a sit'],
]);

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

// Screenshots are the review captures, handled by the avatar pass above.
const listed = new Set([...photos.map(([f]) => f), ...skipped.keys()]);
const missing = (await readdir(src)).filter(
  (f) => /\.(jpe?g|png)$/i.test(f) && !/^Screenshot |^nz and aussie/.test(f) && !listed.has(f)
);

if (missing.length) {
  console.log(`\n${missing.length} original(s) not published:`);
  for (const f of missing) console.log(`  ${f}`);
}

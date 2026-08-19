// Fades photos in as they reach the viewport. Nothing on the page depends on
// it: without this file the .js class is never added and every photo renders
// at full opacity, which is also what happens under reduced motion.
//
// Two conditions, not one. An observer alone fades in whatever is on screen,
// which on a slow connection means fading in an empty box and then popping the
// photo into it; a load handler alone never fires a visible fade for anything
// the browser already has. A photo appears when it is both on screen and ready.
//
// One class name comes out of index.html and one out of style.css:
//
//   .gallery img, .split__media img   which photos take part
//   .is-revealed                      the class the fade is keyed off

(() => {
  const root = document.documentElement;

  // The inline script in the head has already hidden these. Anything that
  // stops us revealing them has to unhide them again on the way out.
  const giveUp = () => root.classList.remove('js');

  if (!window.IntersectionObserver ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    giveUp();
    return;
  }

  const photos = document.querySelectorAll('.gallery img, .split__media img');
  if (!photos.length) {
    giveUp();
    return;
  }

  // classList only. Every gallery photo carries an inline style="--ar: N" that
  // drives the justified-row flex maths, so assigning to .style would collapse
  // the layout.
  const reveal = (img) => img.classList.add('is-revealed');

  // An image that will never decode still has to appear, or a broken file
  // leaves a permanent hole in a row.
  const whenReady = (img) => {
    if (img.complete) return reveal(img);   // covers the cached case
    img.addEventListener('load', () => reveal(img), { once: true });
    img.addEventListener('error', () => reveal(img), { once: true });
  };

  // The negative bottom margin holds a photo back until it is a little way in,
  // so nothing fades in a sliver at a time against the bottom edge.
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);   // one fade each, never again
      whenReady(entry.target);
    }
  }, { rootMargin: '0px 0px -5% 0px' });

  for (const img of photos) observer.observe(img);
})();

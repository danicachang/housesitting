// Full-screen photo viewer. Nothing on the page depends on it, and one
// slideshow per .gallery, so the arrows never run from one sit into another.
//
// Two class names come out of index.html; renaming either breaks this silently:
//
//   .gallery      decides which photos are clickable at all
//   .sit__where   supplies the caption. The "who we are" gallery has no sit
//                 card above it, so those photos carry a data-caption each.
//
// data-pets names the animals in front of the place and date. On the <article
// class="sit"> it covers every photo in the sit; on an <img> it overrides that
// for the one photo, which is how a sit with two pets captions the shots that
// only have one of them in. Both are optional — the sits whose pets we never
// learned the names of carry neither.
//
// data-caption on an <img> wins over all of it, so a one-off photo can say
// something other than who the pets were and where and when the sit was.

(() => {
  const galleries = document.querySelectorAll('.gallery');
  if (!galleries.length || !window.HTMLDialogElement) return;

  let dialog, photo, caption, counter, prev, next;
  let photos = [];   // the <img>s of the gallery being viewed
  let at = 0;
  let pushedState = false;
  let closing = false;
  let flinging = false;   // a swipe is in the air; see fling()
  let endFling = null;   // cancels that swipe
  let request = 0;   // guards a slow full-size load against a fast arrow press
  let closeRequest = 0;   // same idea for the fade out; see close()

  /* ---------- the dialog, built on first open ---------- */

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Photo viewer');

    // Lets open() focus the panel; showModal() would otherwise focus the close
    // button.
    dialog.tabIndex = -1;

    // The counter sits inside the <figure> so one aria-live region covers the
    // new alt, caption and position together.
    dialog.innerHTML = `
      <button class="lightbox__close" type="button" aria-label="Close">&times;</button>
      <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous photo">&#8249;</button>
      <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next photo">&#8250;</button>
      <figure class="lightbox__figure" aria-live="polite">
        <p class="lightbox__counter"></p>
        <img class="lightbox__photo" alt="" sizes="100vw" draggable="false">
        <figcaption class="lightbox__caption"></figcaption>
      </figure>`;

    photo = dialog.querySelector('.lightbox__photo');
    caption = dialog.querySelector('.lightbox__caption');
    counter = dialog.querySelector('.lightbox__counter');
    prev = dialog.querySelector('.lightbox__nav--prev');
    next = dialog.querySelector('.lightbox__nav--next');

    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    dialog.querySelector('.lightbox__close').addEventListener('click', () => close());

    // Esc arrives as 'cancel' and would close instantly; route it through
    // close() so every way out fades.
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });

    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      // Unwind the entry pushed on open, unless Back is what closed us.
      if (pushedState) {
        pushedState = false;
        history.back();
      }
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        step(-1);
      }
    });

    // Swipe and drag, every pointer type including the mouse. touch-action in
    // the stylesheet is load-bearing: without it the browser claims the gesture
    // as a pan and sends pointercancel instead of pointerup.
    let startX = null;
    let dragId = null;   // only the pointer that started the drag moves the photo

    dialog.addEventListener('pointerdown', (e) => {
      // A second finger is a pinch, which is left to the browser. Drop the drag
      // rather than measure later moves against the wrong finger.
      if (!e.isPrimary) {
        if (startX !== null) {
          startX = dragId = null;
          release();
        }
        return;
      }

      // No drag from a button (its click would advance a second time) or during
      // a fling (both drive the same transform). e.button is 0 for touch and
      // pen, so this only excludes the right and middle mouse buttons.
      startX = e.button !== 0 || e.target.closest('button') || flinging
        ? null : e.clientX;
      if (startX === null) return;

      dragId = e.pointerId;

      // Keeps the drag alive past the window edge — a mouse released outside
      // the browser delivers neither pointerup nor pointercancel — and stops a
      // release over an arrow from firing it on top of the swipe.
      dialog.setPointerCapture(e.pointerId);
    });

    // The photo tracks the pointer, damped to a quarter at the ends of a set.
    // That damping plus the spring home is the drag's end-of-set feedback,
    // which is why step() doesn't nudge on top of it.
    dialog.addEventListener('pointermove', (e) => {
      if (startX === null || e.pointerId !== dragId) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) < 6) return;   // don't fight an ordinary click
      const dead = (dx < 0 && at === photos.length - 1) || (dx > 0 && at === 0);
      photo.classList.add('is-instant');
      photo.style.transform = `translateX(${dead ? dx * 0.25 : dx}px)`;
    });

    dialog.addEventListener('pointerup', (e) => {
      if (startX === null || e.pointerId !== dragId) return;
      const dx = e.clientX - startX;
      startX = dragId = null;
      // The inline transform stays put, so fling() carries on from where the
      // pointer stopped rather than from centre.
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1, true);
      else release();
    });

    dialog.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== dragId) return;
      startX = dragId = null;
      release();
    });

    // Hands the transition back after the nudge, unless a drag started inside
    // those 220ms and owns is-instant now — its pointerup clears it instead.
    photo.addEventListener('animationend', (e) => {
      if (e.animationName !== 'lightbox-nudge') return;
      photo.classList.remove('is-nudged');
      if (startX === null) photo.classList.remove('is-instant');
    });

    document.body.append(dialog);
  }

  /* ---------- moving through a gallery ---------- */

  // Drops the inline transform so the stylesheet's transition carries the photo
  // home from wherever a drag left it.
  function release() {
    photo.classList.remove('is-instant');
    photo.style.transform = '';
  }

  // slide marks a committed drag, which carries through spatially; an arrow
  // press swaps instantly.
  function step(dir, slide) {
    endFling?.();   // this move supersedes any swipe still in the air

    const to = at + dir;

    if (to < 0 || to >= photos.length) {
      // A drag has already shown the end of the set through the damping and the
      // spring home; nudging as well reads as two bounces.
      if (slide) return release();
      return nudge(dir);
    }
    if (slide) return fling(dir, to);
    show(to);
    release();
  }

  // Two phases, one element: the photo finishes leaving in the direction it was
  // pushed, then the next is placed off the far side with the transition
  // suppressed and released to travel home.
  //
  // Both reflows are load-bearing — they force the position being moved from to
  // compute, without which the transition has no starting point and never runs.
  //
  // CSS transitions rather than element.animate() so the global
  // prefers-reduced-motion block collapses both phases to an instant swap.
  function fling(dir, to) {
    flinging = true;

    // Out, continuing from wherever the pointer left it.
    photo.classList.remove('is-instant');
    void photo.offsetWidth;
    photo.style.transform = `translateX(${dir > 0 ? '-100vw' : '100vw'})`;

    const enter = () => {
      teardown();

      show(to);
      photo.classList.add('is-instant');
      photo.style.transform = `translateX(${dir > 0 ? '100vw' : '-100vw'})`;
      void photo.offsetWidth;
      photo.classList.remove('is-instant');
      photo.style.transform = '';
    };

    const timer = setTimeout(enter, 400);   // in case the transition never fires

    // transitionend and that fallback race, and the winner has to dismantle the
    // loser: a shared flag isn't enough, since the loser's timer outlives its
    // own swipe and fires during the next one.
    const teardown = () => {
      clearTimeout(timer);
      photo.removeEventListener('transitionend', enter);
      flinging = false;
      if (endFling === teardown) endFling = null;
    };

    endFling = teardown;
    photo.addEventListener('transitionend', enter);
  }

  // End-of-set feedback for a key press, which a disabled arrow button can't
  // give — a disabled button doesn't emit a click.
  function nudge(dir) {
    photo.style.setProperty('--nudge', dir > 0 ? '-2rem' : '2rem');

    // The nudge has to own the transform for its 220ms: the drag transition is
    // on the same property and would swallow the bounce.
    photo.classList.add('is-instant');
    photo.style.transform = '';

    photo.classList.remove('is-nudged');
    void photo.offsetWidth;   // restart the animation on a repeated press
    photo.classList.add('is-nudged');
  }

  function show(i) {
    at = i;
    const thumb = photos[i];
    const token = ++request;

    // The thumbnail is already cached, so painting it first means no empty
    // frame; the full-size file replaces it once decoded.
    photo.src = thumb.currentSrc || thumb.src;
    photo.alt = thumb.alt;

    // Never upscaled: the width attribute caps each photo at its own file size.
    const w = thumb.getAttribute('width');
    photo.style.maxWidth = w ? `min(100%, ${w}px)` : '100%';

    const full = new Image();
    full.sizes = '100vw';
    if (thumb.srcset) full.srcset = thumb.srcset;
    full.src = thumb.src;
    const upgrade = () => {
      if (token === request) photo.src = full.currentSrc || full.src;
    };
    if (full.decode) full.decode().then(upgrade, () => {});
    else full.addEventListener('load', upgrade);

    // A hand-written data-caption first; otherwise the sit card, so editing the
    // card updates the caption. The pets lead, since they're what the photo is
    // of, and the photo's own data-pets wins over the sit's — most of a sit is
    // everyone, but the shot of one of the two dogs says only that dog. An
    // empty data-pets is a photo with no animal in it, and names nobody; no
    // data-pets anywhere is the place and date alone.
    const sit = thumb.closest('.sit');
    const where = sit?.querySelector('.sit__where');
    caption.textContent =
      thumb.dataset.caption ??
      [thumb.dataset.pets ?? sit?.dataset.pets,
       where?.textContent.trim().replace(/\s+/g, ' ')]
        .filter(Boolean).join(' · ');
    counter.textContent = `${i + 1} / ${photos.length}`;

    const last = i === photos.length - 1;

    // Disabling the focused element drops focus to <body>, outside the dialog —
    // and the keydown handler is on the dialog, so the arrow keys would go dead.
    if ((i === 0 && document.activeElement === prev) ||
        (last && document.activeElement === next)) dialog.focus();

    prev.disabled = i === 0;
    next.disabled = last;
  }

  /* ---------- opening and closing ---------- */

  function open(list, i) {
    photos = list;
    if (!dialog) build();
    closing = false;
    show(i);

    // One entry per open, so Back leaves the viewer rather than stepping back
    // through it. Keyed on whether an entry is owed rather than on dialog.open:
    // Back starts a 0.5s fade without closing, and a photo clicked inside that
    // window reopens a dialog that is still open with no entry behind it.
    //
    // pushState throws on file://, which the page is meant to open from.
    if (!pushedState) {
      try {
        history.pushState({ lightbox: true }, '');
        pushedState = true;
      } catch {
        pushedState = false;
      }
    }

    if (!dialog.open) {
      document.body.style.overflow = 'hidden';
      dialog.showModal();

      // A dialog is display:none until showModal, so the fade has no starting
      // style and opacity jumps to 1. This forces the opacity:0 state to
      // compute; requestAnimationFrame is not enough, as it can land in the
      // same style recalc as the display change.
      void dialog.offsetWidth;

      // showModal has focused the ×; move to the panel so nothing is
      // preselected. Tab still reaches the controls.
      dialog.focus();
    }
    dialog.classList.add('is-open');
  }

  function close(fromHistory) {
    // Above the guard: Back has consumed the entry whether or not a fade is
    // already running, and a call that returns below still has to record it, or
    // the close handler calls history.back() again and leaves the site.
    if (fromHistory) pushedState = false;

    if (!dialog || !dialog.open || closing) return;
    closing = true;

    dialog.classList.remove('is-open');

    const token = ++closeRequest;

    const finish = (e) => {
      // transitionend bubbles, and the photo transitions its transform — a
      // spring-back arriving here would shut the dialog at full opacity.
      if (e && e.target !== dialog) return;

      dialog.removeEventListener('transitionend', finish);
      clearTimeout(timer);

      // Obsolete two ways: a reopen mid-fade leaves closing false, and a reopen
      // followed by a second close outranks this one, whose part-spent fallback
      // would otherwise cut the newer fade short.
      if (!closing || token !== closeRequest) return;

      closing = false;
      dialog.close();
    };

    // In case the transition never fires. Must stay above the 0.5s opacity
    // transition in style.css; change the two together.
    const timer = setTimeout(finish, 700);

    dialog.addEventListener('transitionend', finish);
  }

  addEventListener('popstate', () => {
    if (dialog && dialog.open) close(true);
  });

  /* ---------- wiring the galleries ---------- */

  for (const gallery of galleries) {
    const list = [...gallery.querySelectorAll('img')];
    if (!list.length) continue;

    // One tab stop per gallery rather than one per photo. Set here rather than
    // in index.html so nothing advertises a viewer that isn't loaded; wrapping
    // the images in buttons would shift the gallery CSS's nth-child targets.
    list.forEach((img, i) => {
      img.setAttribute('role', 'button');
      img.tabIndex = i === 0 ? 0 : -1;
    });

    gallery.addEventListener('click', (e) => {
      const i = list.indexOf(e.target);
      if (i > -1) open(list, i);
    });

    gallery.addEventListener('keydown', (e) => {
      const i = list.indexOf(e.target);
      if (i < 0) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(list, i);
        return;
      }

      // DOM order is reading order even though the CSS reverses the rows.
      const to =
        e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 :
        e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : -1;

      if (to < 0 || to >= list.length) return;
      e.preventDefault();
      list[i].tabIndex = -1;
      list[to].tabIndex = 0;
      list[to].focus();
    });
  }
})();

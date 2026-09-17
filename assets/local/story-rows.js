/* =============================================================================
   story-rows.js — direction D, "editorial rows", for the long store-story block.

   OWNER PICK from the four layouts at
   claude.ai/code/artifact/e47a7b8a-9ea7-4a7d-9479-b9ef8e358f5a — "let's go with D".

   WHAT IT DOES
   Takes the "Learn About Nova Farms <store>" run — today a wall of 15 stacked
   paragraphs — and turns each H2 and the prose under it into an alternating
   image/text row.

   WHY IT IS STRUCTURAL AND NOT A TEMPLATE
   The block is NOT the same section on every store. Measured heading counts in
   the run: New Britain 11, Dracut 10, Woodbury 9, Attleboro 7. The headings
   differ too — Dracut has "Why Shop at Nova Farms?" with three H3 sub-blocks,
   Attleboro has "Why Visit / What Is Our Dispensary Near / Check Out the
   Offers", Woodbury has five including "Local Attractions". Only the closing
   boilerplate is shared. So nothing here matches on heading text: it walks the
   run and starts a new row at every H2, which works for three blocks or five.

   WHICH PAGES: attleboro-ma, dracut-ma, locations-newbritain-ct, woodbury-nj.
   Verified by grep — those are the four that carry the run. framingham-ma and
   greenville-me are stubs on the client's own live site and have none of this
   copy, so this script finds no anchor there and does nothing. index.html has
   no such block either. That is correct behaviour, not a gap in the script.

   ⚠ THE IMAGERY IS MOSTLY NOT OF THE STORE. Inventoried across the whole
   assets tree:
     - every store photo is 800x305 -- a letterbox strip, no retina headroom at
       the ~520px these render at, and there is no higher-resolution master on
       disk (full-library is WordPress srcset derivatives of the same files);
     - Dracut and Woodbury have ONE store photo each;
     - two store photos are 300x300 and are deliberately NOT used here, since
       they would upscale 1.7x;
     - there is NO staff photography anywhere in the bundle. Not one file.
   So of the twelve rows this fills, four use the store's own photo and eight
   fall back to farm, brand or interior imagery. Every row that does is listed
   in FALLBACK below. New store photography is the only real fix.

   NO COPY IS REWRITTEN and no element is deleted — the client's own widgets are
   moved into row containers, so removing the two injected lines from the four
   pages restores the pages exactly.
   ============================================================================= */
(function () {
  'use strict';

  /* Art per store, in row order. Chosen against measured dimensions, not
     filenames. `fallback: true` means "this is not a photograph of this store".
     16:9 is the row aspect (see story-rows.css) because it is near-native for
     BOTH the 800x305 strips and the 1.78 farm imagery. */
  var ART = {
    attleboro: [
      { src: 'assets/in-pages/attleboro-updated-thumbnail.webp' },
      { src: 'assets/in-pages/nova-rebrand-hero-nate-farm-1-scaled.webp', fallback: true },
      { src: 'assets/in-pages/new-attleboro-store-interior.webp' }
    ],
    dracut: [
      { src: 'assets/in-pages/dracut-thumbnail.webp' },
      { src: 'assets/in-pages/farm-nova-2025-bg.webp', fallback: true },
      { src: 'assets/deals/deal-store-interior.jpg', fallback: true }
    ],
    newbritain: [
      { src: 'assets/in-pages/newbritain-thumbnail.webp' },
      { src: 'assets/in-pages/newbritain-ct-rotator-hero-bg.webp', fallback: true },
      { src: 'assets/in-pages/newbritain-interior-2.webp' }
    ],
    woodbury: [
      { src: 'assets/in-pages/woodbury-thumbnail.webp' },
      { src: 'assets/in-pages/nj-rotator-best-dispensary-bg.webp', fallback: true },
      { src: 'assets/in-pages/farm-texture-fullscreen-web-1.webp', fallback: true }
    ]
  };

  function storeId() {
    try {
      var s = window.NovaStores && window.NovaStores.viewing && window.NovaStores.viewing();
      if (s && s.id) return s.id;
    } catch (e) { /* store context absent, or private mode */ }
    return null;
  }

  function headingIn(node) {
    return node.querySelector('h2, h3');
  }

  function build(lead) {
    // the Elementor widget wrapping the "Learn About..." heading
    var widget = lead;
    while (widget && !/elementor-element-[0-9a-f]{6,}/.test(widget.className || '')) {
      widget = widget.parentElement;
    }
    if (!widget) return;
    var run = widget.parentElement;                       // the .e-con-inner
    if (!run || run.getAttribute('data-nf-story')) return;   // idempotent

    var kids = Array.prototype.slice.call(run.children);
    if (kids.length < 3) return;

    /* Group: the first child is the section label and stays full width. After
       that, a child whose first heading is an H2 opens a new group; everything
       until the next H2 belongs to it. */
    var groups = [], cur = null;
    for (var i = 1; i < kids.length; i++) {
      var h = headingIn(kids[i]);
      if (h && h.tagName === 'H2') {
        cur = { head: kids[i], body: [] };
        groups.push(cur);
      } else if (cur) {
        cur.body.push(kids[i]);
      }
    }
    if (groups.length < 2) return;                        // nothing to lay out

    var pool = ART[storeId()] || [];

    groups.forEach(function (g, n) {
      var row = document.createElement('div');
      row.className = 'nf-story__row' + (n % 2 ? ' is-flipped' : '');

      var text = document.createElement('div');
      text.className = 'nf-story__text';

      // Insert the row where the group's heading currently sits, THEN move the
      // widgets in — so document order, and therefore reading order, is
      // unchanged for a screen reader.
      run.insertBefore(row, g.head);

      var art = pool[n];
      if (art) {
        var fig = document.createElement('div');
        fig.className = 'nf-story__art';
        fig.style.backgroundImage = 'url("' + art.src + '")';
        // Decorative: every row's meaning is in the heading and prose beside it,
        // so an alt would only repeat what is about to be read.
        fig.setAttribute('role', 'presentation');
        if (art.fallback) fig.setAttribute('data-nf-fallback', 'true');
        row.appendChild(fig);
      } else {
        row.className += ' is-plain';       // no art left in the pool
      }

      row.appendChild(text);
      text.appendChild(g.head);
      g.body.forEach(function (b) { text.appendChild(b); });
    });

    run.setAttribute('data-nf-story', 'rows');

    // The contrast corrector may already have walked this subtree.
    if (typeof window.a11yBaseRun === 'function') window.a11yBaseRun();
  }

  function init() {
    var heads = document.querySelectorAll('h2');
    for (var i = 0; i < heads.length; i++) {
      if (/^Learn About Nova Farms/i.test((heads[i].textContent || '').trim())) {
        build(heads[i]);
        return;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
  window.addEventListener('load', init);
})();

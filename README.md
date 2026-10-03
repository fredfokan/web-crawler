# Web crawler /[•]\

A wireframe spider that crawls across any web page. Its legs grab onto links,
it shoots silk threads at distant references, and it tears links off the page:
they float away enlarged, recolored and glitching.

Plain JavaScript + CSS, no dependencies, about 7.5 KB. Runs as a **bookmarklet**,
so it works on (almost) any site, including Chrome on Android.

Inspired by [this video by @rybinfx](https://x.com/rybinfx/status/2105700296760688790).

**Live demo:** https://fredfokan.github.io/web-crawler/

## Install

The bookmarklet is the content of [`bookmarklet.txt`](bookmarklet.txt): a
`javascript:` URL you save as a bookmark. The easiest way to copy it is the
**Copy the bookmarklet** button on the [demo page](https://fredfokan.github.io/web-crawler/).

### Desktop (Chrome, Firefox, Edge, Safari)

1. Show the bookmarks bar.
2. Create a new bookmark named `spider`.
3. Paste the bookmarklet code as its URL.

### Chrome on Android

1. Copy the code from the demo page.
2. Bookmark any page (menu `⋮` → ☆).
3. Open menu `⋮` → **Bookmarks**, edit that bookmark: name it `spider` and
   replace its URL with the code you copied.

## Use

- **Desktop:** open a page with lots of links (a Wikipedia article is ideal)
  and click the `spider` bookmark.
- **Android:** on the page, type `spider` in the address bar and tap the
  bookmark in the suggestions. Opening it from the bookmarks list usually
  does nothing; Chrome runs bookmarklets from the address bar.
- **Stop:** run the bookmarklet again, or press `Esc`.

Some sites with a strict Content Security Policy may block bookmarklets;
nothing happens there.

## How it works

- **Holds:** every link, `<cite>`, `<code>` and `<button>` on the page is
  turned into grab points with `getClientRects()`, rescanned every second.
- **Body:** wanders from link to link with smoothed velocity and heading.
- **Legs:** 8 legs, each a two-segment inverse-kinematics chain. A leg steps
  when its foot drifts too far from its rest position, landing on the nearest
  hold. Legs move in two alternating groups, like a real spider gait.
- **Effects:** grabbed elements get a colored `outline`; torn links are cloned
  into a `position: fixed` element animated with CSS keyframes (scale, drift,
  `clip-path` glitch), leaving a colored block behind.
- Everything is drawn on one transparent full-screen `<canvas>` with
  `pointer-events: none`, so the page stays usable.

## Files

| File | Purpose |
| --- | --- |
| `spider.js` | Readable source |
| `spider.min.js` | Minified build |
| `bookmarklet.txt` | Ready-to-paste bookmarklet |
| `index.html` | Demo and install page (GitHub Pages) |
| `page.tpl.html` | Template for `index.html` |
| `build.js` | Rebuilds the three generated files |

## Build

After editing `spider.js` or `page.tpl.html`:

```sh
node build.js
```

It minifies with [terser](https://github.com/terser/terser) through `npx`.

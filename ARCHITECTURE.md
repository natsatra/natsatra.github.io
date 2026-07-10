# Site Architecture

A plain-language map of `src/`: what every file does, how files depend on each
other, and why a "small" change sometimes touches several files.

## The big picture

This is an **Astro** site. Astro builds plain HTML at build time (no React/Vue
runtime needed) from three ingredients:

1. **Content** (`src/content/`) — the actual words: blog posts, project
   write-ups, videos, static pages like About. Written in Markdown.
2. **Components & layouts** (`src/components/`, `src/layouts/`) — reusable
   pieces of HTML/CSS (a button, the nav bar, a footer, a page wrapper).
3. **Pages** (`src/pages/`) — the routing layer. Each file/folder here maps to
   a URL. A page's job is: fetch content, then hand it to a layout and
   components to render.

Two files glue everything together:

- **`src/content.config.ts`** — defines the *shape* (schema) of each content
  type (blog, projects, videos, pages, writing, certifications). If a
  Markdown file is missing a required field, the build fails here.
- **`src/data/site-config.ts`** — the site's single config object: nav links,
  social links, hero text, avatar, pagination size, etc. Almost every
  component/page reads from this instead of hard-coding text.

```
content/*.md  ──schema──▶  content.config.ts
                                   │
                                   ▼
pages/*.astro  ◀──getCollection()──┘
     │
     │ renders using
     ▼
layouts/BaseLayout.astro
     │
     │ assembles
     ▼
components/*.astro  ◀── reads ── data/site-config.ts
                                       │
                                  typed by
                                       ▼
                                  src/types.ts
```

## Folder-by-folder

### `src/content/` — the words
Markdown files. No logic, just frontmatter (title, tags...) + body text.
- `blog/` — blog posts (currently just `sample-post.md`, a `draft: true`
  skeleton that builds nothing until the flag is removed)
- `projects/` — project write-ups (`copythat.md`, `portfolio.md`,
  `telegram-bot.md`)
- `videos/` — video entries (`video-1.md` … `video-3.md`)
- `writing/` — writing samples with a required `category` and a manual
  `order` field (`api-docs.md`, `cve.md`, `kf-docs.md`, `longform.md`,
  `pam-docs.md`, `sdk-docs.md`)
- `certifications/` — certifications/credentials (`outskill.md`), ordered by
  the same manual `order` field
- `pages/` — one-off static pages (`about.md`, `tech-stack.md`) rendered by
  the catch-all page `src/pages/[...id].astro`

### `src/content.config.ts` — content rules
Declares six collections (`blog`, `pages`, `projects`, `videos`, `writing`,
`certifications`) and the Zod schema each Markdown file's frontmatter must
match. This is *why* deleting a page like `contact.md` was safe with no other
changes — nothing else referenced it directly; it was just one more file
matching the `pages` glob.

Not every collection has a date. Only `blog` has a required `publishDate`
(plus an optional `updatedDate`) and sorts via `sortBlogPosts`: by `order`
first, then newest-first by date among posts with the same `order` — since
`order` defaults to 999, posts that don't set it just sort newest-first,
and setting a low `order` pins a post above the date sort. `blog` also has
a `draft` flag (default `false`): every blog fetch site (list, detail,
both tag pages, RSS) filters drafts out with
`getCollection('blog', ({ data }) => !data.draft)`, so a `draft: true`
post builds nothing and ships nowhere until the flag is removed.
`projects`, `videos`, `writing`, and
`certifications` deliberately have **no** date field at all — those entries
aren't dated. Instead, all four are ordered manually: each schema has
`order: z.number().default(999)`, and every page that lists them sorts
ascending via `sortItemsByOrder`. To reorder entries, edit the `order:`
number in each file's frontmatter (lower = earlier; ties and gaps like
10/20/30 are fine) — no file renames needed. A file that omits `order`
falls to the bottom via the 999 default.

`videos` also has no `videoUrl` field anymore, unlike `projects` (which
still declares its own `videoUrl`, `repoUrl`, and `type: 'project' |
'video'` — none of which are actually read by any page or component
either, for what it's worth; they're unused schema fields, not just a
`videos`-only problem). `videoUrl` was removed from `videos` specifically
because nothing read `video.data.videoUrl` — `VideoPreview.astro` and
`videos/[id].astro` only use `title`/`description`/`tags`/`seo`. The video
that actually renders on a video's detail page comes from a raw `<iframe>`
embed hand-written in that post's Markdown body (e.g.
`player.vimeo.com/video/<id>` or a YouTube embed URL), not from any
frontmatter field. This means `projects` and `videos` are no longer the
same shape despite both historically covering "project-like" content —
`certifications` started from `projects`' shape, swapping
`repoUrl`/`videoUrl` for `issuer` + `credentialUrl`, then dropped
`publishDate` in favor of the manual `order` field (see above).
`credentialUrl` is a plain `z.string()` (not `.url()`) on purpose: it can
hold either a full URL to a hosted credential or a root-relative path to a
PDF placed in `public/` (e.g. `/certs/outskill.pdf`).
`certifications/[id].astro` renders it as a "View credential →" link when
present.

`writing` also has a required `category` field, which is a free-form
`z.string()` (not a `z.enum(...)`) so a new category can be introduced by
just typing it into a post's frontmatter, with no matching edit to
`content.config.ts`. The trade-off is no build-time typo guard:
`"Developer Docs"` vs `"Developer docs"` silently produces two distinct
labels instead of failing the build. `category` is no longer used to group
the writing listing page into sections — it only renders as a small eyebrow
label on each `WritingPreview` card (see `writing/[...page].astro` below).

### `src/data/site-config.ts` — the dial board
One big typed object (typed by `src/types.ts`) holding everything that isn't
page content: header/footer nav links, social links, hero copy, avatar image,
`postsPerPage`/`projectsPerPage`. Components don't hard-code "Contact" or
"LinkedIn" — they loop over arrays from this file. That's *why* removing a nav
item or adding a footer icon means editing this file, not the component.

### `src/types.ts` — the shape contract
TypeScript types shared by `site-config.ts` and the components that consume
it (`Link`, `SocialLink`, `Hero`, `SiteConfig`). If a component expects
`link.icon` to exist, `SocialLink` is where that's declared. Change a type
here and TypeScript will flag every file that's now out of sync.

### `src/components/` — reusable building blocks
| File | What it renders | Reads from |
|---|---|---|
| `BaseHead.astro` | `<head>` tag: title, meta tags, Open Graph/Twitter cards, fonts, favicon | `site-config.ts`, page props |
| `Nav.astro` | Top nav bar + mobile hamburger menu | `site-config.headerNavLinks` |
| `NavLink.astro` | A single nav `<a>`, underlines itself if it matches the current URL | called by `Nav.astro` |
| `Header.astro` | Avatar + site title/subtitle block under the nav | `site-config.avatar/headerTitle/subtitle` |
| `Hero.astro` | The big intro section on the homepage (title, image, markdown text, CTA buttons) | `site-config.hero` |
| `Footer.astro` | Footer nav links + social links + copyright | `site-config.footerNavLinks/socialLinks` |
| `Button.astro` | Pill-shaped button/link, used everywhere a CTA is needed | called by `Hero.astro`, pages |
| `IconButton.astro` | Small icon-only button (prev/next arrows) | called by `Pagination.astro` |
| `Pagination.astro` | Prev/Next links for any paginated list | called by blog/projects/videos/writing/certifications/tags index pages |
| `PostPreview.astro` | Blog post card (title, date, excerpt, "Read post →") | called by blog pages, homepage |
| `ProjectPreview.astro` | Project card (title, description, tags) | called by project pages, homepage |
| `VideoPreview.astro` | Video card, same shape as `ProjectPreview.astro` | called by video pages |
| `WritingPreview.astro` | Writing sample card (category eyebrow, title, excerpt, tags), same bordered-card shape as `ProjectPreview.astro`/`VideoPreview.astro`, no date — unlike `PostPreview.astro` | called by writing pages, homepage |
| `CertificationPreview.astro` | Certification card (title, issuer, description, tags), same shape as `ProjectPreview.astro` | called by certifications pages |
| `FormattedDate.astro` | Turns a `Date` into "January 1, 2026" | called by `PostPreview.astro`, post page |
| `CustomImage.astro` | Wraps Astro's `<Image>`/`<img>` so callers don't care if the source is a local optimized image or a plain URL string | called by `Header.astro`, `Hero.astro` |
| `ThemeToggle.astro` | Light/dark toggle button (markup only; behavior lives in `public/theme-toggle.js`) | — |

### `src/layouts/BaseLayout.astro` — the page skeleton
Every page wraps its content in this. It renders `<html><head>` (via
`BaseHead`), then `Nav` → optional `Header` → `<main><slot /></main>` →
`Footer`. This is *why* nav/footer/header changes show up on every page at
once — they're not duplicated per page, they live here.

### `src/pages/` — routing
Astro turns file paths into URLs. Each of these fetches content with
`getCollection()`, then renders it through `BaseLayout` + the relevant
preview/components.

| File | URL(s) | What it does |
|---|---|---|
| `index.astro` | `/` | Homepage: `Hero` + the first featured project (lowest `order`) + featured writing samples |
| `[...id].astro` | `/about`, etc. | Catch-all renderer for the `pages` collection |
| `blog/[id].astro` | `/blog/<post-slug>` | Single blog post + prev/next links |
| `blog/[...page].astro` | `/blog`, `/blog/2` | Paginated blog list |
| `projects/[id].astro` | `/projects/copythat` | Single project page |
| `projects/[...page].astro` | `/projects`, `/projects/2` | Paginated project grid |
| `videos/[id].astro` | `/videos/video-1` | Single video page |
| `videos/[...page].astro` | `/videos`, `/videos/2` | Paginated video grid |
| `writing/[id].astro` | `/writing/api-docs` | Single writing sample + prev/next links |
| `writing/[...page].astro` | `/writing`, `/writing/2` | Paginated writing card grid, structurally identical to `projects/[...page].astro` |
| `writing/tags/[id].astro` | `/writing/tags/sdk` | Writing samples filtered by one tag, rendered as a card grid (not paginated — tag results are usually small) |
| `certifications/[id].astro` | `/certifications/outskill` | Single certification page |
| `certifications/[...page].astro` | `/certifications`, `/certifications/2` | Paginated certification grid |
| `tags/index.astro` | `/tags` | List of all tags used across blog posts |
| `tags/[id]/[...page].astro` | `/tags/web`, `/tags/web/2` | Posts filtered by one tag, paginated |
| `rss.xml.js` | `/rss.xml` | RSS feed (not HTML — generates XML directly) |

The tag system's shared logic (`src/utils/data-utils.ts`'s
`getAllTags`/`getPostsByTag`) is generic — typed over
`'blog' | 'projects' | 'writing' | 'certifications'` — but that doesn't mean
every collection has tag *pages*. Only two collections actually have routes
that call these helpers: `blog` (`src/pages/tags/`, paginated, tag badges are
plain text everywhere blog posts render them) and `writing`
(`src/pages/writing/tags/[id].astro`, not paginated — tag results are
usually small enough that a card grid alone is fine — and
`writing/[id].astro` renders each tag as `<a
href={`/writing/tags/${slugify(tag)}`}>`, unlike blog's static badges).
`projects` and `certifications` declare a `tags` field in their
schema and could reuse the same helpers, but nothing renders their tags as
links or has a `/projects/tags/`- or `/certifications/tags/`-style route —
adding one means copying the `writing/tags/[id].astro` pattern (see "Adding
a new content-collection page" for the general recipe) and swapping in the
preview component and collection name.

`writing/[...page].astro` is structurally identical to
`projects/[...page].astro`: `paginate()` the whole `writing` collection at
`siteConfig.writingPerPage` (default 8) per page, render each entry as a
`WritingPreview` card in a `grid grid-cols-1 sm:grid-cols-2` layout, then
`<Pagination page={page} />` below it. Like `videos`, `writing` still has no
`publishDate`, so there's no `.sort(sortItemsByDateDesc)` call — instead,
every page that lists `writing` (the paginated grid, the tag filter page,
the detail page's prev/next "Read Next" pair, and the homepage's featured
section) applies `.sort(sortItemsByOrder)`, driven by each file's `order:`
frontmatter. The certification pages do the same. The
former per-category "Load more" grouping is gone; `category` now only shows
up as a small eyebrow label on each card (see the `content.config.ts` note
above), not as a page section. `writing/[id].astro`'s "Read Next" block and
`writing/tags/[id].astro`'s filtered results use the same card grid layout
for visual consistency, even though neither of those two is paginated.

### `src/utils/`
- `common-utils.ts` → `slugify()` — turns a tag like "Web Dev" into `web-dev`
  for URLs.
- `data-utils.ts` → `sortBlogPosts()`, `sortItemsByOrder()`,
  `getAllTags()`, `getPostsByTag()` — shared logic so every page that
  lists/sorts/filters posts uses the same rules instead of reimplementing
  them. `sortBlogPosts` is the blog sort (manual `order` first, then
  newest-first by `publishDate`); `sortItemsByOrder` is the ascending
  manual sort for `projects`, `videos`, `writing`, and `certifications`
  (compares `data.order`).

### `src/styles/global.css` + `src/assets/`
Tailwind base styles/theme variables, and the actual image/icon files
(`assets/images/*.jpg|png`, `assets/icons/*.svg`) that components import.

## Background: gradient + texture overlay

The dark gradient behind every page is *defined* in CSS —
`--bg-base`/`--bg-gradient` in `src/styles/global.css` — but *applied* via an
inline `<script>` in `src/layouts/BaseLayout.astro`, which forces dark mode
and sets `var(--bg-gradient)` directly on `document.documentElement` and
`document.body`. It's re-applied on `astro:before-swap`/`astro:after-swap` so
it survives client-side page transitions.

The cyan accent color lives next to it in `global.css`: `--accent`, with
three derived shades (`--accent-soft`/`-faint`/`-tint`) computed via
`color-mix()`, so changing `--accent` recolors card borders, tag pills,
buttons, and the active nav link in one edit. Components reference these
variables (inline `style` attributes and hover handlers use `var(--accent…)`,
never a hex). The one exception is `public/texture.svg`, which hardcodes the
accent in its `stroke`/`fill` attributes — CSS variables can't reach inside a
`background-image` URL, so retheming the accent means editing that file too.

On top of that gradient, `BaseLayout.astro` renders a fixed, full-viewport,
tiled SVG texture as a decorative overlay:

```html
<div
    class="pointer-events-none fixed inset-0 z-0 bg-repeat opacity-4"
    style="background-image: url('/texture.svg');"
>
</div>
<div class="relative z-10 flex min-h-screen flex-col px-4 md:px-8">
    <!-- Nav, Header, main, Footer -->
</div>
```

- `pointer-events-none` — so it never blocks clicks/scroll
- `fixed inset-0 z-0` — pinned behind the actual content, which is why the
  content wrapper right below it is explicitly `relative z-10` (otherwise
  stacking order isn't guaranteed)
- `opacity-4` — kept low so it reads as a subtle texture, not a competing
  pattern; the gradient still needs to dominate
- The SVG itself (`public/texture.svg`) has **no background rect** — only
  line/dot shapes with `fill="none"`. A solid background rect in that file
  would tile as opaque blocks and hide the gradient entirely (this happened
  once — removing the rect was the fix).

`public/texture.svg` — the low-poly "network" pattern, lines and node dots
both colored `#22d3ee`:

```svg
<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'><g fill='none' stroke='#22d3ee' stroke-width='1'><path d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/><path d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/><path d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/><path d='M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382'/><path d='M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269'/></g><g fill='#22d3ee'><circle cx='769' cy='229' r='5'/><circle cx='539' cy='269' r='5'/><circle cx='603' cy='493' r='5'/><circle cx='731' cy='737' r='5'/><circle cx='520' cy='660' r='5'/><circle cx='309' cy='538' r='5'/><circle cx='295' cy='764' r='5'/><circle cx='40' cy='599' r='5'/><circle cx='102' cy='382' r='5'/><circle cx='127' cy='80' r='5'/><circle cx='370' cy='105' r='5'/><circle cx='578' cy='42' r='5'/><circle cx='237' cy='261' r='5'/><circle cx='390' cy='382' r='5'/></g></svg>
```
Took this from <a href="https://www.svgbackgrounds.com/set/free-svg-backgrounds-and-patterns/">Free SVG Backgrounds and Patterns by SVGBackgrounds.com</a>
To change it:
- **Gradient colors/shape** — edit `--bg-gradient` (and `--bg-base`, the
  solid fallback) in `src/styles/global.css`; the script in
  `BaseLayout.astro` picks the change up automatically.
- **Accent color** — edit `--accent` in `src/styles/global.css`; the derived
  shades follow. Update `public/texture.svg`'s hardcoded color to match.
- **Texture pattern/color** — edit `public/texture.svg` directly (it's a
  static file, not an imported asset, so no rebuild pipeline/hashing —
  changes show up on refresh).
- **Texture opacity/tiling** — edit the `opacity-*`/`bg-repeat` classes on
  the overlay `<div>` in `BaseLayout.astro`.

## Changing fonts

Fonts are loaded as npm packages (`@fontsource-variable/*`), not linked from
Google Fonts at runtime, so swapping one is a 3-file/3-step change:

1. **Install the package** — `bun add @fontsource-variable/<font-name>`
   (search [fontsource.org](https://fontsource.org) for the exact package
   name; variable fonts ship one file for the whole weight range).
2. **`src/styles/global.css` imports** (top of the file) — replace the
   `@import '@fontsource-variable/<old>'` line with the new package. If the
   font has an italic style you use (Astro's `.prose` content does), also
   swap the `.../wght-italic.css` import.
3. **`src/styles/global.css` `@theme inline` block** — update `--font-sans`
   or `--font-serif` to the new font's CSS name (check the package's
   generated `<font> Variable` name, e.g. `'Lora Variable'`).

There are two font "slots", both Tailwind theme variables consumed via
`font-sans`/`font-serif` utility classes throughout components:
- `--font-sans` → body text (currently Inter Variable)
- `--font-serif` → headings, nav links, post titles (currently Lora Variable)

Renaming only the `--font-*` value without installing/importing the matching
package does nothing useful — the browser has no font file to load and
silently falls back to the generic `serif`/`sans-serif`.

## Why one small change touched 4 files (the Subscribe example)

This is the general pattern for *any* feature that's "wired through" the
config system, not just Subscribe:

1. **`src/types.ts`** — the `Subscribe`/`SubscribeForm` types described the
   *shape* of the feature's config. As long as the type exists, TypeScript
   expects something to use it.
2. **`src/data/site-config.ts`** — held the actual `subscribe: {...}` data.
   This is the "off switch" (`enabled: false`) — but the data itself doesn't
   delete code, just turns it off.
3. **`src/components/Subscribe.astro`** — the component that reads
   `siteConfig.subscribe` and renders the form. This is the file that
   actually *does* something with the config.
4. **4 page files** (`blog/[id].astro`, `blog/[...page].astro`,
   `tags/index.astro`, `tags/[id]/[...page].astro`) — each one individually
   `import`ed `Subscribe.astro` and dropped `<Subscribe />` into its markup.
   Astro components aren't global — a page only renders what it explicitly
   imports and places, so "used in 4 places" really does mean "referenced in
   4 files."

So removing a feature fully means walking backwards along the same chain
content/config flows forward through: **type → config data → component →
every page that imports the component**. A change that *only* edits
`site-config.ts` (like turning `enabled: false`) is a one-file change because
the component already guards on that flag. A full removal touches every link
in the chain.

## Adding a new content-collection page

This is the recipe used to add sections like `writing` and `certifications` —
both are card-grid style, like `projects`/`videos` (`blog`'s list style,
with `PostPreview.astro`'s date-first row layout, is the other shape to
copy if a future collection wants that instead). Pick whichever existing
section is the closer shape match and copy its pattern — don't design a new
layout from scratch.

1. **`src/content.config.ts`** — add a `defineCollection()` block for the new
   type. Copy the schema from the closest existing collection (`blog` for a
   list of writing/posts, `projects`/`videos` for a card grid), rename
   fields that don't fit (e.g. `certifications` swaps `repoUrl`/`videoUrl`
   for `issuer` + `credentialUrl`), and add the new key to the
   `export const collections = { ... }` object at the bottom — a collection
   not listed there is invisible to `getCollection()` even if the folder and
   schema exist.
2. **`src/content/<new-collection>/`** — create the folder and at least one
   sample `.md` file matching the new schema, so the page isn't empty and so
   you can verify the schema against real frontmatter.
3. **`src/types.ts`** + **`src/data/site-config.ts`** — add a
   `<name>PerPage?: number` field to `SiteConfig` and a default value in
   `site-config.ts` (mirrors `postsPerPage`/`projectsPerPage`).
4. **`src/components/<Name>Preview.astro`** — copy `PostPreview.astro` (list
   style) or `ProjectPreview.astro`/`VideoPreview.astro` (card style)
   verbatim, then: change the `Props` type's `CollectionEntry<'...'>` to the
   new collection, change the destructured `post`/`project` prop name and
   its usages, and change the `href` template string to the new URL prefix.
5. **`src/pages/<new-collection>/[...page].astro`** — copy the matching
   list/grid page (`blog/[...page].astro` or `projects/[...page].astro`),
   swap the collection name in `getCollection('...')`, the `siteConfig.*PerPage`
   field, the preview component, and the page title/description strings.
6. **`src/pages/<new-collection>/[id].astro`** — copy the matching detail
   page (`blog/[id].astro` or `projects/[id].astro`/`videos/[id].astro`),
   same swaps as above (collection name, preview component, prop names,
   "Back to X" link, any collection-specific fields like `credentialUrl`).
7. **`src/utils/data-utils.ts`** — decide how the collection is ordered:
   - **Dated content** (like `blog`): give the schema a `publishDate` and
     sort newest-first where you fetch it (see `sortBlogPosts`, which also
     folds in the manual `order` override — copy it, or widen its type
     union if the new collection has the same `publishDate` + `order`
     fields).
   - **Manually curated order** (like `projects`, `videos`, `writing`, and
     `certifications`): give the schema `order: z.number().default(999)`,
     add the collection to `sortItemsByOrder`'s type union, and call
     `.sort(sortItemsByOrder)` in *every* page that lists the collection —
     the paginated grid, the detail page (its prev/next links follow the
     sorted array), any tag-filter page, and any homepage featured section.
     Entries are then reordered by editing `order:` numbers in frontmatter,
     never by renaming files.
   - **Neither**: skip this step entirely and use `getCollection()`'s
     result as-is (file/filename order). No current collection does this —
     `pages` has no order because nothing lists it; each page is its own
     standalone URL.
8. **`src/data/site-config.ts`** — the new page's nav entry goes in
   `headerNavLinks` (or `footerNavLinks`), same as any other nav link — see
   the "Nav bar items" row in the quick reference table below.

What you *don't* need to touch: `BaseLayout.astro`, `Nav.astro`, or (usually)
`data-utils.ts` — `getAllTags`/`getPostsByTag` already accept any of
`blog | projects | writing | certifications`, so a new collection with a
`tags` field can call them as-is. What a new collection *doesn't* get for
free is a tag-filter **page** — `src/pages/tags/` only ever queries `blog`,
and `src/pages/writing/tags/[id].astro` only ever queries `writing`; wiring
up tag links + a filter route for another collection means copying the
`writing/tags/[id].astro` pattern (see that page and the `writing/[id].astro`
tag-link markup) rather than anything in `data-utils.ts`.

## Linting: ESLint (code) + Vale (prose)

Two separate linters cover two separate things — code and content — and
neither substitutes for the other.

1. **ESLint — `.astro`/`.ts`/`.js` code.** Config lives in
   `eslint.config.mjs` (flat config): `@eslint/js` recommended rules +
   `typescript-eslint` recommended rules + `eslint-plugin-astro`'s
   `flat/recommended` (understands `.astro` files) + `eslint-config-prettier`
   last, so formatting rules never fight Prettier. `dist/`, `.astro/`, and
   `node_modules/` are ignored. Two rule tweaks worth knowing about:
   - `@typescript-eslint/no-unused-vars` is on (as a warning) but allows a
     leading-underscore escape hatch (`_foo`) for intentionally-unused
     args/vars, and the base `no-unused-vars` is turned off so it doesn't
     double-report.
   - `no-undef` is off — TypeScript already catches undefined references and
     understands ambient/global types (like Astro's `ImageMetadata`) that
     `no-undef` doesn't know about, so leaving it on just produces false
     positives.
   - Run via `bun run lint` (check) or `bun run lint:fix` (auto-fix).
2. **Vale — Markdown prose in `src/content/`.** Config is `.vale.ini` at the
   repo root: `StylesPath = styles`, vocab set to `Portfolio`, and three style
   packages applied to `*.md`/`*.mdx` — `Google` (style guide), `write-good`
   (weasel words/passive voice), `alex` (inclusive language). One override:
   `Google.FirstPerson = NO`, because this is a first-person bio/blog site,
   not product docs where "I" would be a style violation.
   - `styles/` holds the *downloaded* rule packages (`Google/`, `write-good/`,
     `alex/`) fetched by `vale sync` — gitignored (see `.gitignore`'s
     `/styles/*` + `!/styles/config/` pair) because they're reproducible from
     `.vale.ini`, not hand-authored.
   - `styles/config/vocabularies/Portfolio/accept.txt` is the one hand-authored
     exception: a flat list of words/patterns Vale should stop flagging as
     spelling/style errors (proper nouns like `Mathangi`, `Natsatra`, tech
     terms like `OAuth`, `Flexbox`, `Gzip`). This file **is** committed. Add a
     new word here the same way you'd add one to a spellchecker dictionary —
     one entry per line, regex-capable (e.g. `PWAs?` matches both `PWA` and
     `PWAs`).
   - Vale itself is a standalone binary (not an npm package), so `vale sync`
     must be run once (and after editing `.vale.ini`'s `Packages` list) to
     fetch the style packages into `styles/` before linting works locally.
   - Run via `bun run lint:prose`.

Both are wired into `package.json`'s `scripts`, not into the build — `astro
build`/`bun run build` doesn't run either linter, so a lint failure won't by
itself break a deploy. Run `bun run lint` and `bun run lint:prose` explicitly
(or wire them into CI/a pre-commit hook) if you want them to gate anything.

## CI: deploying to GitHub Pages

The site goes live via GitHub Actions — `.github/workflows/deploy.yml`. Every
push to `main` builds the site and publishes `dist/` to GitHub Pages at
<https://natsatra.github.io>; there's no manual upload step anywhere. The
workflow can also be run by hand from the repo's Actions tab
(`workflow_dispatch`).

How the workflow is put together:

- **Trigger** — `on: push: branches: [main]` plus `workflow_dispatch` for
  manual runs.
- **Permissions** — `pages: write` + `id-token: write` let the workflow
  publish to Pages using GitHub's OIDC deployment flow (no PAT or deploy key
  to manage); `contents: read` is all the checkout needs.
- **`build` job** — `withastro/action@v3` with `package-manager: bun@latest`
  does the whole build (install deps, `astro build`, upload `dist/` as a
  Pages artifact) in one step, matching the Bun-first setup used locally.
- **`deploy` job** — `actions/deploy-pages@v4` takes the artifact from the
  build job (`needs: build`) and publishes it to the `github-pages`
  environment, whose URL shows up on the run page.
- **Concurrency** — `group: pages` with `cancel-in-progress: false` queues
  overlapping deploys instead of cancelling a publish that's mid-flight.

Setting this up from scratch (the one-time steps, if this is ever recreated
or cloned to a new account):

1. **Name the repo `<username>.github.io`** to serve at the root URL
   (`https://<username>.github.io`). Any other repo name works too, but the
   site then lives under `https://<username>.github.io/<repo>/` and needs a
   matching `base` option in `astro.config.mjs`.
2. **Repo Settings → Pages → Build and deployment → Source: "GitHub
   Actions"** (not "Deploy from a branch"). Without this, the workflow's
   deploy step fails because no Pages site exists to receive the artifact.
3. **Add `.github/workflows/deploy.yml`** as described above.
4. **Set the site URL** — `website` in `src/data/site-config.ts`, which
   `astro.config.mjs` reads as `site:`. This doesn't affect where the site
   deploys (the repo name controls that); it's what the sitemap, RSS feed,
   and canonical/Open Graph URLs are generated from, so a mismatch means
   wrong absolute links in those.
5. **Push to `main`** — the first successful run creates the `github-pages`
   environment automatically.

A custom domain would be: repo Settings → Pages → Custom domain (GitHub
writes a `CNAME` file), a DNS record at the registrar pointing at GitHub
Pages, and updating `website` in `site-config.ts` to the new domain.

The lint workflow (`.github/workflows/linting.yml`, see the linting section
above) runs on the same pushes but is **independent** — `deploy.yml` doesn't
wait for it, so a lint failure never blocks a deploy. Gating deploys on lint
would mean merging the two workflows (lint steps before the build job) or
making `deploy` depend on the lint job.

## Quick reference: "If I want to change X, edit Y"

| Want to change... | Edit |
|---|---|
| Nav bar items (header or footer) | `src/data/site-config.ts` (`headerNavLinks`/`footerNavLinks`) |
| Add a whole new content section (like Writing/Certifications) | see "Adding a new content-collection page" |
| Social/footer icons | `src/data/site-config.ts` (`socialLinks`) + `src/components/Footer.astro` if the rendering itself needs to change |
| Homepage hero text/CTA | `src/data/site-config.ts` (`hero`) |
| How many posts/projects/writing samples/certifications per page | `src/data/site-config.ts` (`postsPerPage`/`projectsPerPage`/`writingPerPage`/`certificationsPerPage`) |
| Writing sample categories | just set `category:` in a post's frontmatter — no code change needed, see `src/content.config.ts`. Shows up as a small eyebrow label on each card, not a page section |
| Order of projects, videos, writing samples, or certifications | set `order:` in each file's frontmatter (lower = earlier; omitted = sinks to bottom) — no code change, no file renames. Blog posts too, as a tiebreak override on top of newest-first date sort |
| Keep a blog post unpublished while writing it | `draft: true` in its frontmatter — excluded from the blog list, detail routes, tag pages, and RSS until removed |
| Look of a writing sample card | `src/components/WritingPreview.astro` |
| Where a writing sample's tag links go | `src/pages/writing/[id].astro` (tag markup) → `src/pages/writing/tags/[id].astro` (the filter page they link to) |
| A blog post's content | the matching file in `src/content/blog/` |
| A writing sample's content | the matching file in `src/content/writing/` |
| A certification's content | the matching file in `src/content/certifications/` |
| The About page content | the matching file in `src/content/pages/` |
| What fields a blog/project/video/writing/certification entry can have | `src/content.config.ts` |
| Shared TypeScript shapes | `src/types.ts` |
| Look of post/project/writing/certification cards | `src/components/PostPreview.astro` / `ProjectPreview.astro` / `VideoPreview.astro` / `WritingPreview.astro` / `CertificationPreview.astro` |
| Fonts | `src/styles/global.css` (imports + `--font-sans`/`--font-serif`) — see "Changing fonts" |
| Accent color (cards, tag pills, buttons, active nav link) | `--accent` in `src/styles/global.css` + the hardcoded color in `public/texture.svg` — see "Background: gradient + texture overlay" |
| Background gradient/texture | `--bg-gradient`/`--bg-base` in `src/styles/global.css` (applied by `BaseLayout.astro`; overlay div also lives there) / `public/texture.svg` — see "Background: gradient + texture overlay" |
| Page wrapper (nav+header+footer present on every page) | `src/layouts/BaseLayout.astro` |
| Code lint rules | `eslint.config.mjs` — see "Linting: ESLint (code) + Vale (prose)" |
| How/when the site deploys | `.github/workflows/deploy.yml` — see "CI: deploying to GitHub Pages" |
| The site's canonical URL (sitemap/RSS/OG links) | `website` in `src/data/site-config.ts` |
| Prose lint rules / allowed words | `.vale.ini` / `styles/config/vocabularies/Portfolio/accept.txt` — see "Linting: ESLint (code) + Vale (prose)" |

## Full directory tree

Excludes `node_modules/`, `dist/`, `.git/`, and `.DS_Store` clutter; the
downloaded Vale style packages under `styles/` are collapsed. Depth capped
at 4 levels.

```
.
├── .astro
│   ├── collections
│   │   ├── blog.schema.json
│   │   ├── certifications.schema.json
│   │   ├── pages.schema.json
│   │   ├── projects.schema.json
│   │   ├── videos.schema.json
│   │   └── writing.schema.json
│   ├── content-assets.mjs
│   ├── content-modules.mjs
│   ├── content.d.ts
│   ├── data-store.json
│   ├── settings.json
│   └── types.d.ts
├── .claude
│   └── settings.local.json
├── .github
│   └── workflows
│       ├── deploy.yml
│       └── linting.yml
├── .gitignore
├── .prettierrc
├── .vale.ini
├── .vscode
│   ├── extensions.json
│   ├── launch.json
│   └── settings.json
├── ARCHITECTURE.md
├── LICENSE
├── README.md
├── astro.config.mjs
├── bun.lock
├── eslint.config.mjs
├── package.json
├── public
│   ├── capsuleblue.svg
│   ├── certs
│   │   └── outskill.pdf
│   ├── favicon-old.svg
│   ├── favicon.svg
│   ├── github.png
│   ├── linkedin.png
│   ├── llms.txt
│   ├── texture.svg
│   └── theme-toggle.js
├── src
│   ├── assets
│   │   ├── icons
│   │   │   ├── arrow-left.svg
│   │   │   └── arrow-right.svg
│   │   └── images
│   │       ├── avatarr.jpg
│   │       ├── github-banner.png
│   │       ├── linkedin.png
│   │       ├── round.jpg
│   │       └── white.png
│   ├── components
│   │   ├── BaseHead.astro
│   │   ├── Button.astro
│   │   ├── CertificationPreview.astro
│   │   ├── CustomImage.astro
│   │   ├── Footer.astro
│   │   ├── FormattedDate.astro
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── IconButton.astro
│   │   ├── Nav.astro
│   │   ├── NavLink.astro
│   │   ├── Pagination.astro
│   │   ├── PostPreview.astro
│   │   ├── ProjectPreview.astro
│   │   ├── ThemeToggle.astro
│   │   ├── VideoPreview.astro
│   │   └── WritingPreview.astro
│   ├── content
│   │   ├── blog
│   │   │   └── sample-post.md    (draft skeleton — not published)
│   │   ├── certifications
│   │   │   └── outskill.md
│   │   ├── pages
│   │   │   ├── about.md
│   │   │   └── tech-stack.md
│   │   ├── projects
│   │   │   ├── copythat.md
│   │   │   ├── portfolio.md
│   │   │   └── telegram-bot.md
│   │   ├── videos
│   │   │   ├── video-1.md
│   │   │   ├── video-2.md
│   │   │   └── video-3.md
│   │   └── writing
│   │       ├── api-docs.md
│   │       ├── cve.md
│   │       ├── kf-docs.md
│   │       ├── longform.md
│   │       ├── pam-docs.md
│   │       └── sdk-docs.md
│   ├── content.config.ts
│   ├── data
│   │   └── site-config.ts
│   ├── layouts
│   │   └── BaseLayout.astro
│   ├── pages
│   │   ├── [...id].astro
│   │   ├── blog
│   │   │   ├── [...page].astro
│   │   │   └── [id].astro
│   │   ├── certifications
│   │   │   ├── [...page].astro
│   │   │   └── [id].astro
│   │   ├── index.astro
│   │   ├── projects
│   │   │   ├── [...page].astro
│   │   │   └── [id].astro
│   │   ├── rss.xml.js
│   │   ├── tags
│   │   │   ├── [id]
│   │   │   │   └── [...page].astro
│   │   │   └── index.astro
│   │   ├── videos
│   │   │   ├── [...page].astro
│   │   │   └── [id].astro
│   │   └── writing
│   │       ├── [...page].astro
│   │       ├── [id].astro
│   │       └── tags
│   │           └── [id].astro
│   ├── styles
│   │   └── global.css
│   ├── types.ts
│   └── utils
│       ├── common-utils.ts
│       └── data-utils.ts
├── styles
│   ├── Google          (vale sync output — gitignored)
│   ├── alex            (vale sync output — gitignored)
│   ├── config
│   │   └── vocabularies
│   │       └── Portfolio
│   │           └── accept.txt
│   └── write-good      (vale sync output — gitignored)
└── tsconfig.json
```

## Folder purposes, one sentence each

- **`.astro/`** — Astro's build cache (generated content schemas, type declarations); not source, safe to delete/regenerate.
- **`.astro/collections/`** — auto-generated JSON schemas Astro derives from `content.config.ts` for editor validation/autocomplete.
- **`.vscode/`** — editor config (recommended extensions, debug launch config, workspace settings) shared via git.
- **`eslint.config.mjs`** — ESLint flat config for `.astro`/`.ts`/`.js` code; see "Linting: ESLint (code) + Vale (prose)".
- **`.vale.ini`** — Vale config for prose linting of `src/content/` Markdown; see "Linting: ESLint (code) + Vale (prose)".
- **`styles/`** — Vale's style packages (`Google/`, `write-good/`, `alex/`, gitignored, fetched by `vale sync`) plus the hand-authored `config/vocabularies/Portfolio/accept.txt` allowlist.
- **`public/`** — static files served as-is at the site root, untouched by the build pipeline (favicons, robots-adjacent assets, the texture SVG, icons not run through image optimization).
- **`src/assets/`** — source images/icons that *are* run through Astro's image optimization pipeline because components `import` them.
- **`src/assets/icons/`** — small inline-usable SVG icons (pagination arrows).
- **`src/assets/images/`** — photos/logos referenced by `site-config.ts` and content frontmatter, optimized at build time.
- **`src/components/`** — reusable `.astro` UI building blocks (nav, footer, cards, buttons) composed by pages and layouts.
- **`src/content/`** — the site's actual written content as Markdown, organized by collection type.
- **`.github/workflows/`** — GitHub Actions: `deploy.yml` (build + GitHub Pages deploy) and `linting.yml` (lint checks).
- **`src/content/blog/`** — blog post Markdown files; posts with `draft: true` stay unpublished (currently just a draft skeleton).
- **`src/content/pages/`** — one-off static pages (About, etc.) rendered by the catch-all route.
- **`src/content/projects/`** — project write-up Markdown files, listed by their manual `order` field.
- **`src/content/videos/`** — video entry Markdown files, listed by their manual `order` field.
- **`src/content/writing/`** — writing sample Markdown files; required `category` field plus a manual `order` field that controls listing position.
- **`src/content/certifications/`** — certification/credential Markdown files (`issuer`, `credentialUrl`, manual `order` — no date field).
- **`src/data/`** — the site's single config object (nav links, social links, hero copy) that components read instead of hardcoding text.
- **`src/layouts/`** — page-skeleton wrapper(s) that assemble nav/header/main/footer around every page's content.
- **`src/pages/`** — Astro's file-based router; each file/folder maps to a URL.
- **`src/pages/blog/`** — routes for the blog list and individual posts.
- **`src/pages/projects/`** — routes for the project grid and individual project pages.
- **`src/pages/tags/`** — routes for the tag index and per-tag filtered post lists.
- **`src/pages/tags/[id]/`** — dynamic route matching a single tag slug.
- **`src/pages/videos/`** — routes for the video grid and individual video pages.
- **`src/pages/writing/`** — routes for the paginated writing card grid and individual writing samples.
- **`src/pages/writing/tags/`** — dynamic route matching a single tag slug, filtered to the `writing` collection (not paginated).
- **`src/pages/certifications/`** — routes for the certification grid and individual certification pages.
- **`src/styles/`** — global Tailwind CSS (theme colors, font declarations, prose styling).
- **`src/utils/`** — shared helper functions (slugify, date sorting, tag lookups) used across multiple pages.

**Navbar:** edit `src/data/site-config.ts`'s `headerNavLinks` array to change what shows in the nav; only touch `src/components/Nav.astro` if the nav's behavior/markup itself needs to change.

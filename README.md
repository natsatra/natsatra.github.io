# Mathangi's portfolio — docs as code, demonstrated

My technical writing portfolio, live at [natsatra.github.io](https://natsatra.github.io).

This site is more than a list of work samples — it's a working demonstration of the docs-as-code workflow I use professionally. Every page is Markdown under version control, validated against a schema, linted for prose style, and shipped through CI. The repository itself is part of the portfolio.

## How this demonstrates docs as code

| Practice                     | Where it lives here                                                                                                                                                            |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content as plain text in git | All pages and entries are Markdown/MDX in `src/content/`                                                                                                                       |
| Schema-validated frontmatter | [Astro content collections](https://docs.astro.build/en/guides/content-collections/) with Zod schemas in `src/content.config.ts` — a missing or mistyped field fails the build |
| Prose linting                | [Vale](https://vale.sh/) with the Google, write-good, and alex style packages                                                                                                  |
| Code linting & formatting    | ESLint (flat config) and Prettier                                                                                                                                              |
| CI gates                     | A GitHub Actions workflow lints, builds, and prose-checks every push and pull request                                                                                          |
| Peer-reviewable changes      | Content changes arrive as diffs, same as code                                                                                                                                  |

## Prose linting with Vale

Vale runs against `src/content/` using three style packages — [Google developer documentation style](https://developers.google.com/style), [write-good](https://github.com/btford/write-good), and [alex](https://alexjs.com/) — plus a project vocabulary in `styles/config/vocabularies/Portfolio/`.

### Tradeoffs for a first-person portfolio

Style guides like Google's target product documentation. A portfolio is a different genre: it's personal, voice-forward, and first-person by design. Instead of working against the linter or abandoning it, `.vale.ini` documents deliberate exceptions:

- **`Google.FirstPerson = NO`** — first-person voice is the point of a bio and project write-ups, not a defect.
- **`Google.EmDash = NO` and `Google.Exclamation = NO`** — em dashes for asides and the occasional exclamation suit an informal register.
- **Project vocabulary** — the vocabulary accepts terms like _Kissflow_, _OAuth_, _CLI_, and _agentic_ so the linter flags real issues instead of domain language.
<!-- vale Google.WordList = NO -->
- **Inline exemptions where rules misfire** — for example, an official CVE advisory title isn't mine to reword, and "get in touch" is an idiom, not a touchscreen instruction. Those spots carry scoped `<!-- vale ... = NO -->` comments with a note explaining why — including this bullet, which had to exempt itself to quote the idiom.
<!-- vale Google.WordList = YES -->

The goal is a linter that catches genuine problems — passive voice, inconsistent capitalization, ableist phrasing — without flattening the writing into product-doc neutrality. Knowing _when to deviate_ from a style guide, and documenting the deviation, is itself a technical writing skill — one this repo sets out to show.

## CI workflow

`.github/workflows/linting.yml` runs on every push and pull request to `main`:

1. **`bun install`** — install dependencies.
2. **`bun run lint`** — ESLint over the Astro/TypeScript source.
3. **`bun run build`** — full Astro build, which also validates every content entry against its collection schema.
4. **Vale via [vale-cli/vale-action](https://github.com/vale-cli/vale-action)** — prose check on `src/content/`, reported through reviewdog as GitHub check annotations.

One nuance worth calling out: reviewdog's `github-check` reporter fails the run if it reports _any_ finding, regardless of severity, and GitHub caps annotations per step. That's why CI runs Vale at `--minAlertLevel=error` — errors block the merge, while the full warning-level feedback stays available locally via `bun run lint:prose`, where it's actually actionable.

## Code linting and formatting

- **ESLint** (`eslint.config.mjs`) — flat config combining `@eslint/js` recommended, `typescript-eslint` recommended, and `eslint-plugin-astro`, with `eslint-config-prettier` last so formatting stays Prettier's job. `no-undef` is off because TypeScript already checks references (and understands Astro's ambient types).
- **Prettier** (`.prettierrc`) — single quotes, 160-character lines, 4-space indent (2 for Markdown and YAML), with `prettier-plugin-astro` for `.astro` files and `prettier-plugin-tailwindcss` for class sorting.

## Docs for machine readers: llms.txt

The site ships an [`llms.txt`](public/llms.txt) at the root, following the [llms.txt proposal](https://llmstxt.org/). AI assistants and agents are now a real audience for any published site, and they read it badly by default — HTML arrives wrapped in navigation, scripts, and markup that waste context-window tokens and bury the content. `llms.txt` is the fix — a curated Markdown map at a predictable path that tells a machine reader what the site is and where the canonical content lives, in a format it can consume directly.

Here it contains:

- A one-line identity and a summary of the portfolio's focus areas
- Annotated links to every page, writing sample, and video — each with a description of what the reader finds there
- Contact details
- An honest scope note flagging which sections are still placeholder content, so an AI summarizing the portfolio doesn't present drafts as finished work

For a technical writer, this is audience analysis applied to a new audience: the same discipline as writing for developers or admins, extended to readers that parse Markdown and count tokens.

## Installation

You need [Bun](https://bun.sh/) (npm works too) and, for local prose linting, the [Vale CLI](https://vale.sh/docs/vale-cli/installation/).

```sh
git clone https://github.com/natsatra/natsatra.github.io.git
cd portfolio
bun install

# Vale style packages aren't committed; fetch them once
vale sync

bun run dev        # dev server at localhost:4321
```

| Command              | Action                                             |
| :------------------- | :------------------------------------------------- |
| `bun run dev`        | Start the local dev server                         |
| `bun run build`      | Build the production site to `./dist/`             |
| `bun run preview`    | Preview the production build locally               |
| `bun run lint`       | Lint code with ESLint                              |
| `bun run lint:fix`   | Lint and auto-fix                                  |
| `bun run lint:prose` | Lint content with Vale (full warning-level output) |

## Folder structure

```text
├── .github/workflows/
│   └── linting.yml          # CI: ESLint → build → Vale
├── .vale.ini                # Vale config and documented style exceptions
├── styles/config/vocabularies/
│   └── Portfolio/           # Project vocabulary (accepted terms)
├── public/                  # Static assets served as-is
│   └── llms.txt             # Curated site map for AI assistants (llmstxt.org)
├── src/
│   ├── assets/              # Images optimized through Astro
│   ├── components/          # Astro components
│   ├── content/             # All site content (Markdown/MDX)
│   │   ├── pages/           # About, tech stack
│   │   ├── projects/        # Project write-ups
│   │   ├── writing/         # Documentation samples
│   │   ├── certifications/  # Certifications
│   │   ├── videos/          # Video walkthroughs
│   │   └── blog/            # Blog posts
│   ├── content.config.ts    # Zod schemas for every collection
│   ├── data/site-config.ts  # Site-wide settings (nav, hero, socials)
│   ├── layouts/             # Page layouts
│   ├── pages/               # Route definitions
│   ├── styles/              # Global CSS (Tailwind)
│   └── utils/               # Helpers
├── eslint.config.mjs
├── .prettierrc
└── astro.config.mjs
```


## Tech stack

[Astro](https://astro.build/) with MDX, [Tailwind CSS 4](https://tailwindcss.com/), TypeScript, and Bun. Static output, hosted on **GitHub Pages**.

## Credits

Built on the [Dante](https://github.com/JustGoodUI/dante-astro-theme) Astro theme by [justgoodui.com](https://justgoodui.com/), heavily customized. Licensed under [GPL-3.0](https://github.com/JustGoodUI/dante-astro-theme/blob/main/LICENSE).

---
title: 'Portfolio site based on Astro JS'
order: 1
description: 'Astro JS based portfolio site as a docs-as-code demonstration'
isFeatured: true
type: 'project'
tags: ['Astro JS', 'CSS', 'Markdown']
---

# Mathangi's portfolio — docs as code, demonstrated

My technical writing portfolio, live at [natsatra.github.io](https://natsatra.github.io).

This site is more than a list of work samples — it's a working demonstration of the docs-as-code workflow I use professionally. Every page is Markdown under version control, validated against a schema, linted for prose style using Vale, and shipped through CI. The repository itself is part of my writing portfolio.

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

As a standard practice, style guides use Google's target product documentation. However, a portfolio is a different genre: it's personal and written in first-person by design. Instead of working against the linter or abandoning it, I have modified `.vale.ini` to document the exceptions:

- **`Google.FirstPerson = NO`** — allows using first-person voice for the bio and project write-ups.
- **`Google.EmDash = NO` and `Google.Exclamation = NO`** — allows use of em dashes for asides and the occasional exclamation mark for the informal register I'm going for.
- **Project vocabulary** — the vocabulary accepts terms like _Kissflow_, _OAuth_, _CLI_, and _agentic_ so the linter doesn't flag them as incorrect.
<!-- vale Google.WordList = NO -->
- **Inline exemptions where rules misfire** — for example, an official CVE advisory title cannot be reworded to suit the linter's rules. For exceptions like those, there are scoped comments `<!-- vale ... = NO -->` with a note explaining why.
<!-- vale Google.WordList = YES -->

The goal for the Vale linter is to catch genuine problems — passive voice, inconsistent capitalization, ableist phrasing — without flattening the writing into product-doc neutrality. Knowing _when to deviate_ from a style guide, and documenting the deviation, is itself a technical writing skill.

## CI workflow

`.github/workflows/linting.yml` runs on every push and pull request to `main`:

1. **`bun install`** — install dependencies.
2. **`bun run lint`** — ESLint over the Astro/TypeScript source.
3. **`bun run build`** — full Astro build, which also validates every content entry against its collection schema.
4. **Vale via [vale-cli/vale-action](https://github.com/vale-cli/vale-action)** — prose check on `src/content/`, reported through reviewdog as GitHub check annotations.

## Code linting and formatting

- **ESLint** (`eslint.config.mjs`) — flat config combining `@eslint/js` recommended, `typescript-eslint` recommended, and `eslint-plugin-astro`, with `eslint-config-prettier` last so Prettier takes care of the formatting.
- `no-undef` is off because TypeScript already checks references (and understands Astro's ambient types).
- **Prettier** (`.prettierrc`) — single quotes, 160-character lines, 4-space indent (2 for Markdown and YAML), with `prettier-plugin-astro` for `.astro` files and `prettier-plugin-tailwindcss` for class sorting.

## Docs for machine readers: llms.txt

The site carries an [`llms.txt`](public/llms.txt) at the root, following the [llms.txt proposal](https://llmstxt.org/). I wanted to include it since AI assistants and agents are now a real audience for any published site. An llms.txt file can provide some direction to the agents by providing curated map at the site's root that tells a machine reader what the site is and where the canonical content lives, in a format they can consume directly.

Here it contains:

- A one-line identity and a summary of the portfolio's focus areas
- Annotated links to every page, writing sample, and video — each with a description of what the reader finds there
- Contact details

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

# Steps to remove Vale and ESLint

Reference procedure for stripping prose linting (Vale) and code linting (ESLint) out of this
repository and its CI.

Baseline: commit `242253d`. Line numbers are accurate as of that commit and will drift as content
changes; treat them as pointers, and confirm with `git grep -ni vale` / `git grep -ni eslint`
before editing.

---

## 0. Read this first: linting does not gate deployment

The most common reason people want the linters gone is the belief that a failing lint blocks the
site from shipping. In this repository it does not.

There are two independent workflows, both triggered by a push to `main`:

| Workflow  | File                            | What it runs                                                                 | Gates the site? |
| :-------- | :------------------------------ | :--------------------------------------------------------------------------- | :-------------- |
| `deploy`  | `.github/workflows/deploy.yml`  | `withastro/action@v3` (install → build → upload) → `actions/deploy-pages@v4` | **Yes**         |
| `linting` | `.github/workflows/linting.yml` | `bun install` → `bun run lint` → `bun run build` → Vale                      | **No**          |

`deploy.yml` never calls `bun run lint` and never invokes Vale. The two workflows do not depend on
each other — there is no `needs:` between them.

This is observable in the run history: on the pushes of 10 and 15 September 2026, `linting` failed
while `deploy` **succeeded on the same commit** and the site published normally.

**Therefore:** removing Vale and ESLint will not make deployment faster, safer, or more reliable.
It will stop the red ✗ on the `linting` check. That may be reason enough — just go in knowing that
is the whole effect.

### Cheaper alternatives, for the record

If the goal is "stop it failing" rather than "stop it existing":

- Vale is **already advisory** as of `242253d` — `continue-on-error: true` on the step means a Vale
  finding annotates the commit but cannot fail the workflow.
- `Vale.Spelling = NO` in `.vale.ini` would end the vocabulary-maintenance treadmill (the recurring
  "Did you really mean…?" errors) while keeping the style rules.
- Deleting the `linting` workflow alone removes the red ✗ without touching a single config file or
  line of content.

---

## 1. What stays behind

Do not remove these while removing the linters — they are separate tools that happen to sit nearby:

- **Prettier** — `.prettierrc`, plus `prettier`, `prettier-plugin-astro`, and
  `prettier-plugin-tailwindcss` in `devDependencies`. Prettier is a formatter, not a linter.
  Note the trap: `eslint-config-prettier` **is** an ESLint package and does go (§3.2), but that is
  not the same thing as removing Prettier.
- **The Astro build** (`bun run build`) — this also validates every content entry against its Zod
  schema in `src/content.config.ts`. It is the only thing checking that your frontmatter is valid.
  Keep it in CI.
- **TypeScript** — `tsconfig.json` and the `typescript` toolchain. Note that `typescript-eslint`
  goes, but TypeScript itself stays.
- **`src/styles/`** — the site's Tailwind/global CSS. Unrelated to the root `styles/` directory,
  which is Vale's. See the warning in §2.1.

---

## 2. Remove Vale

### 2.1 Delete files

```sh
rm .vale.ini
rm -rf styles/
```

> **Warning — two different `styles/` directories.**
> The **root** `styles/` is Vale's `StylesPath`. It contains only `Google/`, `alex/`,
> `write-good/` (gitignored, fetched by `vale sync`) and `config/vocabularies/Portfolio/accept.txt`
> (the only tracked file in there). Deleting it is correct.
> The site's CSS lives at **`src/styles/`** and must not be touched.

### 2.2 `.gitignore`

Remove the now-dead Vale block at lines 9–11:

```gitignore
# Vale style packages (fetched via `vale sync`); keep styles/config/vocabularies (hand-authored)
/styles/*
!/styles/config/
```

### 2.3 `package.json`

Remove the script at line 13:

```json
"lint:prose": "vale src/content"
```

No dependency changes — Vale is a standalone binary, never an npm package here.

### 2.4 CI

In `.github/workflows/linting.yml`, delete the entire Vale step — lines 17–30, comments included
(everything from `# Prose is advisory:` through `vale_flags: "--minAlertLevel=error"`).

### 2.5 Dead inline directives in content

Vale's scoped exemption comments become inert. They are HTML comments, so they never rendered and
removing them changes nothing visually — but they are confusing to leave behind.

| File                                | Lines  |
| :---------------------------------- | :----- |
| `src/content/projects/portfolio.md` | 38, 40 |
| `src/content/pages/about.md`        | 61     |
| `README.md`                         | 29, 31 |

Each is a `<!-- vale Google.WordList = NO -->` / `<!-- vale Google.WordList = YES -->` pair
wrapping one paragraph. Delete the comment lines, keep the paragraph between them.

---

## 3. Remove ESLint

### 3.1 Delete files

```sh
rm eslint.config.mjs
```

There are **no** `eslint-disable` comments anywhere in `src/`, `public/`, or `astro.config.mjs`
(verified at `242253d`), so no source files need cleaning up.

### 3.2 `package.json` — dependencies

```sh
bun remove @eslint/js eslint eslint-config-prettier eslint-plugin-astro globals typescript-eslint
```

All six exist solely to serve `eslint.config.mjs`:

| Package                  | Why it goes                                                     |
| :----------------------- | :-------------------------------------------------------------- |
| `eslint`                 | the linter                                                      |
| `@eslint/js`             | its recommended ruleset                                         |
| `typescript-eslint`      | TS parser and rules (**not** TypeScript itself)                 |
| `eslint-plugin-astro`    | `.astro` support                                                |
| `eslint-config-prettier` | turns off ESLint rules Prettier owns — pointless with no ESLint |
| `globals`                | imported only by `eslint.config.mjs`                            |

This rewrites `bun.lock`. Commit that change.

### 3.3 `package.json` — scripts

Remove lines 11–12:

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
```

### 3.4 CI

In `.github/workflows/linting.yml`, delete line 15:

```yaml
- run: bun run lint
```

> **Sequencing hazard.** If you remove the `lint` script from `package.json` but leave
> `- run: bun run lint` in the workflow, CI fails with a script-not-found error — the opposite of
> the intent. Ship the `package.json` and workflow edits in the **same commit**, or edit the
> workflow first.

---

## 4. The workflow once both are gone

After §2.4 and §3.4, `linting.yml` reduces to `bun install` → `bun run build`. Two sensible ends:

**Option A — keep it as a build check (recommended).** Rename the job and file to something honest
(`build.yml` / `build-check`). You keep schema validation on pull requests, which is the check that
actually catches broken content before it reaches the site.

```yaml
name: build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
```

**Option B — delete it.** `rm .github/workflows/linting.yml`. `deploy.yml` still builds on every
push to `main`, so a broken build is caught there — but only _after_ merge, and pull requests get
no check at all.

If you take Option A, remember to update the renamed path in the two folder-structure diagrams
listed in §5.

---

## 5. Documentation references to watch out for

`README.md` opens by describing the repository as "a working
demonstration of the docs-as-code workflow I use professionally… linted for prose style using
Vale", and `src/content/projects/portfolio.md` is a **published page** making the same argument at
length.

### 5.1 `src/content/projects/portfolio.md` — published page

| Lines      | Content                                                                             |
| :--------- | :---------------------------------------------------------------------------------- |
| 14         | Intro sentence: "…linted for prose style using Vale, and shipped through CI."       |
| 22, 23     | Tech-stack table rows for prose linting (Vale) and code linting (ESLint)            |
| 27–42      | **Entire "Prose linting with Vale" section** — the style-exception rationale        |
| 44–51      | "CI workflow" section; step 2 is ESLint (49), step 4 is Vale (51)                   |
| 53–57      | "Code linting and formatting" — ESLint bullet (55), `no-undef` bullet (56)          |
| 71         | Installation prerequisite: "for local prose linting, the Vale CLI"                  |
| 78–79      | `# Vale style packages aren't committed` / `vale sync` in the setup block           |
| 89, 90, 91 | Command-table rows: `lint`, `lint:fix`, `lint:prose`                                |
| 97, 98, 99 | Folder structure: `linting.yml` comment, `.vale.ini`, `styles/config/vocabularies/` |
| 119        | Folder structure: `eslint.config.mjs`                                               |

### 5.2 `README.md` — mirrors the same material

| Lines          | Content                                                  |
| :------------- | :------------------------------------------------------- |
| 5              | Intro sentence                                           |
| 13, 14         | Tech-stack table rows                                    |
| 18–33          | **Entire "Prose linting with Vale" section**             |
| 40, 42         | CI pipeline steps 2 (ESLint) and 4 (Vale)                |
| 44–48          | "Code linting and formatting" — ESLint bullets at 46, 47 |
| 62             | Installation prerequisite                                |
| 69–70          | `vale sync` in the setup block                           |
| 80, 81, 82     | Command-table rows                                       |
| 88, 89, 90, 91 | Folder structure entries                                 |
| 110            | Folder structure: `eslint.config.mjs`                    |

### 5.3 `src/content/pages/about.md`

Line 39: "…uses Vale and Eslint to keep the prose and the code sharp, deployed like software."
Reword or drop the clause.

### 5.4 Do **not** touch these

> `src/content/projects/copythat.md` lines 121 and 150 mention ESLint — but they describe the
> **CopyThat browser extension's own** dev dependencies, a different project entirely. A blind
> find-and-replace across `src/content/` will corrupt that write-up. Leave both lines alone.

`styles/config/vocabularies/Portfolio/accept.txt:60` also contains the word `ESLint`, but that file
is deleted wholesale in §2.1, so it needs no separate edit.

---

## 6. Verification

```sh
# 1. No references survive outside the CopyThat write-up (§5.4)
git grep -ni vale -- . ':!LINTER-REMOVAL.md'
git grep -ni eslint -- . ':!LINTER-REMOVAL.md'

# 2. Dependencies resolve and the site still builds
bun install
bun run build

# 3. Removed scripts are gone; `dev` and `build` remain
bun run

# 4. Prettier — confirm it survived the cull
bunx prettier --check .
```

Then push to a branch and confirm on GitHub that the `deploy` workflow still succeeds and no
`linting` check appears (or only the renamed build check, under Option A).

---

## 7. Rollback

Every step above is a tracked-file change, so recovery is ordinary git. Do the work on a branch:

```sh
git switch -c remove-linters
# ... apply §2 and §3 ...
```

To abandon it wholesale: `git switch main && git branch -D remove-linters`.

If it has already been merged, `git revert <merge-commit> -m 1` restores everything **except** the
untracked Vale style packages under `styles/Google/`, `styles/alex/`, and `styles/write-good/` —
those are gitignored and were never committed. Restore them with:

```sh
vale sync
```

---

## 8. Complete touchpoint index

Every location referencing either tool at `242253d`.

| #   | File                                | Action                            | Tool   |
| :-- | :---------------------------------- | :-------------------------------- | :----- |
| 1   | `.vale.ini`                         | delete                            | Vale   |
| 2   | `styles/` (root)                    | delete recursively                | Vale   |
| 3   | `eslint.config.mjs`                 | delete                            | ESLint |
| 4   | `.gitignore`                        | edit — remove lines 9–11          | Vale   |
| 5   | `package.json`                      | edit — scripts 11, 12, 13         | both   |
| 6   | `package.json`                      | edit — 6 devDependencies          | ESLint |
| 7   | `bun.lock`                          | regenerated by `bun remove`       | ESLint |
| 8   | `.github/workflows/linting.yml`     | edit — line 15 and lines 17–30    | both   |
| 9   | `README.md`                         | rewrite — see §5.2                | both   |
| 10  | `src/content/projects/portfolio.md` | rewrite — see §5.1                | both   |
| 11  | `src/content/pages/about.md`        | edit — line 39                    | both   |
| 12  | `src/content/projects/portfolio.md` | delete comments 38, 40            | Vale   |
| 13  | `src/content/pages/about.md`        | delete comment 61                 | Vale   |
| 14  | `README.md`                         | delete comments 29, 31            | Vale   |
| 15  | `src/content/projects/copythat.md`  | **no change** — different project | —      |

Confirmed clear, no action needed: `.vscode/` (`extensions.json`, `settings.json`, `launch.json`)
references neither tool; there are no git hooks (no Husky, no Lefthook); `astro.config.mjs` and
`tsconfig.json` reference neither.

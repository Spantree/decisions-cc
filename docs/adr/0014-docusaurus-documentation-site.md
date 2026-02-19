# Docusaurus Documentation Site

- Status: accepted
- Deciders: eitah
- Date: 2026-02-19

## Context and Problem Statement

The project has 13 ADRs in `docs/adr/` and a comprehensive `README.md` but no browsable documentation site. Storybook (port 6006) serves component development needs but isn't suited for prose documentation like ADRs, architecture overviews, or getting-started guides. How should we provide a navigable documentation site for the project?

## Decision Drivers

- Docs should live alongside the code and go through the same PR workflow
- ADRs should be authored once and rendered in both GitHub and the docs site
- The docs toolchain should not conflict with the library's own build, tsconfig, or package.json
- The tech stack should align with the React ecosystem the library already uses
- Interactive component demos (MDX) would be a future benefit

## Considered Options

- Docusaurus in a `website/` subdirectory
- Storybook Docs addon only
- GitHub wiki
- MkDocs

## Decision Outcome

Chosen option: "Docusaurus in a `website/` subdirectory", because it is React-native (matching the library), supports MDX for potential interactive component demos, and has first-class sidebar and versioning support while keeping the docs site isolated from the library build.

### Key Implementation Details

1. **Isolated in `website/`** — separate `package.json`, `tsconfig`, and build pipeline avoid conflicts with the library's own tooling
2. **`docs.path: '../docs'`** — points Docusaurus at the existing `docs/` directory so ADRs are authored once and served in both GitHub and Docusaurus
3. **README sync script** — `docs:sync-readme` copies `README.md` into `docs/getting-started.md` with front matter prepended, because Docusaurus excludes files matching `**/README.{md,mdx}` by default
4. **`adr/index.md` excluded** — the `adr-log` tool's index file is excluded from the Docusaurus docs plugin via `exclude: ['**/index.md']`; a `generated-index` sidebar category provides the ADR listing instead
5. **Blog disabled** — not needed for a component library
6. **Storybook link in navbar** — links out to the deployed Storybook at `decisionapp.pages.dev`
7. **Port 3000** — avoids conflict with Storybook on port 6006

### Positive Consequences

- ADRs and README are browsable with sidebar navigation, search, and dark mode
- Root convenience scripts (`npm run docs`, `docs:build`, `docs:serve`) make it easy to develop and build the site
- Future ability to embed live component demos via MDX
- GitHub Pages deployment is straightforward with Docusaurus's built-in support

### Negative Consequences

- Adds ~1,300 npm dependencies in `website/node_modules` (isolated from the library)
- README content in `docs/getting-started.md` is a build-time copy, not a live reference — requires running `docs:sync-readme` before builds (automated in the `docs` and `docs:build` scripts)

## Pros and Cons of the Options

### Docusaurus in a `website/` subdirectory

- Good, because it is React-native and aligns with the library's ecosystem
- Good, because MDX support enables future interactive component demos
- Good, because first-class sidebar, versioning, and search support
- Good, because isolated `website/` directory avoids build conflicts
- Bad, because it adds a second node_modules tree
- Bad, because README sync requires a build-time copy step

### Storybook Docs addon only

- Good, because already in use for component development
- Good, because no additional tooling needed
- Bad, because not designed for prose documentation (ADRs, guides)
- Bad, because sidebar navigation is component-oriented, not doc-oriented

### GitHub wiki

- Good, because zero setup cost
- Bad, because separate from the codebase (no PR workflow)
- Bad, because no build step means no MDX or interactive demos
- Bad, because limited customization and navigation

### MkDocs

- Good, because excellent markdown documentation support
- Good, because lightweight and fast
- Bad, because Python-based, adding a second language ecosystem
- Bad, because no MDX support for interactive React component demos

## Links

- [ADR-0003](0003-storybook-for-development-and-testing.md) — Storybook handles component development; Docusaurus handles prose docs

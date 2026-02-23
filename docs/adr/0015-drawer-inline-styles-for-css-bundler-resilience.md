# Drawer inline styles for CSS bundler resilience

- Status: accepted
- Deciders: eitah, claude
- Date: 2026-02-23

Technical Story: CellDetailDrawer renders without overlay, background, or positioning when consumed inside Docusaurus/PostCSS pipelines

## Context and Problem Statement

The `CellDetailDrawer` component uses a Radix UI `Dialog` as a right-side drawer. In Storybook (where `@radix-ui/themes` CSS loads unmodified), the drawer renders correctly. However, when the library is consumed inside a Docusaurus site, the consumer's PostCSS pipeline strips critical CSS rules:

1. `:has()` selectors are removed entirely (discovered first)
2. Class-based rules like `.pugh-drawer-overlay` are also stripped (discovered second)
3. Even `!important` overrides on `.pugh-cell-detail-drawer` are removed

The consumer's CSS bundler tree-shakes or transforms imported CSS in ways we cannot control, leaving only basic non-`!important` properties (width, max-width, height, animation) intact. Without the overlay positioning, z-index, background, and box-shadow rules, the drawer is invisible or broken.

## Decision Drivers

- The library must work in any consumer CSS pipeline (PostCSS, Docusaurus, Next.js, Vite, etc.)
- We cannot require consumers to configure their bundlers to preserve our CSS
- The fix must not break the existing Storybook rendering
- Radix Dialog's DOM structure (overlay > scroll > padding > content) requires multiple ancestor elements to be styled

## Considered Options

- CSS `:has()` selectors to style ancestors from the drawer content element
- CSS class-based rules (`.pugh-drawer-overlay`) added via `useEffect` + `classList`
- CSS `!important` overrides on the drawer's own class
- Inline styles applied via JavaScript `Object.assign(element.style, {...})`

## Decision Outcome

Chosen option: "Inline styles via JavaScript", because it is the only approach that completely bypasses CSS bundler pipelines. Inline styles are applied directly to DOM elements and cannot be stripped, transformed, or tree-shaken by any CSS tooling.

### Implementation

A `useEffect` in `CellDetailDrawer` uses `requestAnimationFrame` to:

1. Find the drawer element (`.pugh-cell-detail-drawer`) and apply fixed positioning, z-index 9999, background, box-shadow, and padding
2. Walk up the DOM to find the Radix overlay ancestor (`.rt-DialogOverlay`) and apply fixed positioning, z-index 9998, and semi-transparent background
3. Style the Radix scroll wrapper (`.rt-DialogScroll`) with flex layout for right-alignment
4. Style the padding wrapper (`.rt-DialogScrollPadding`) to prevent height interference

The CSS file retains the equivalent rules as a fallback for environments where CSS loads unmodified (e.g., Storybook), but the JS inline styles are the primary mechanism.

### Positive Consequences

- Works in any consumer bundler pipeline without configuration
- No consumer-side CSS overrides or bundler plugins required
- Storybook continues to work (JS styles and CSS rules are compatible)
- Explicit about what styles are critical for functionality vs. cosmetic

### Negative Consequences

- Styles are duplicated: once in CSS (fallback) and once in JS (primary)
- Harder to discover/modify styles since they live in a `useEffect` rather than a stylesheet
- Couples the component to Radix's internal DOM structure (class names like `rt-DialogOverlay`, `rt-DialogScroll`, `rt-DialogScrollPadding`)
- `requestAnimationFrame` introduces a single-frame delay before styles apply

## Pros and Cons of the Options

### CSS `:has()` selectors

Style ancestors from the content element: `.rt-DialogOverlay:has(.pugh-cell-detail-drawer)`.

- Good, because it's pure CSS with no JavaScript
- Good, because it's the most semantically correct approach
- Bad, because PostCSS strips `:has()` selectors (no browser support detection, just removal)
- Bad, because it's the newest CSS feature and has the least bundler support

### Class-based CSS rules via `useEffect`

Add a `.pugh-drawer-overlay` class to ancestors via JS, with styles defined in the CSS file.

- Good, because styles stay in CSS where they're discoverable
- Good, because the JS is minimal (just `classList.add`)
- Bad, because the consumer's CSS bundler also strips these rules
- Bad, because the rules are not referenced by JSX so bundlers may consider them dead code

### CSS `!important` overrides

Override Radix's styles with `!important` on the drawer's own class.

- Good, because it's CSS-only
- Good, because `!important` should override any specificity conflict
- Bad, because the consumer's bundler strips even `!important` properties
- Bad, because it only works for the drawer element itself, not the overlay ancestors

### Inline styles via JavaScript (chosen)

Apply styles directly to DOM elements via `Object.assign(element.style, {...})`.

- Good, because it completely bypasses all CSS bundler pipelines
- Good, because it works in every environment tested (Storybook, Docusaurus, direct consumption)
- Good, because it's explicit about which styles are functionally critical
- Bad, because it duplicates styles across CSS and JS
- Bad, because it requires knowledge of Radix's internal DOM structure

## Links

- Related: [ADR-0014](0014-docusaurus-documentation-site.md) - Docusaurus documentation site (the consumer that exposed the issue)

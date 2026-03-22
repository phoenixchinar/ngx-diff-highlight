# AGENTS.md

## Purpose

This repository contains two closely related parts:

- `src/`: the Angular library `ngx-diff-highlight`
- `demo/`: the standalone demo application used to exercise and explain library behavior

When making changes, keep the library API, the demo, the tests, and the markdown documentation aligned.

## Repository Layout

- `src/lib/models/`
  Public types for highlight input, structured diff output, and array-matching options.
- `src/lib/utils/`
  Core path and diff logic.
  `diff-utils.ts` is the main diff engine.
- `src/lib/directives/`
  Path-context directives and the field-highlighting directive.
- `src/lib/components/`
  Scope component for isolated highlight state.
- `src/lib/services/`
  Scoped highlight service.
- `src/public-api.ts`
  Public export surface. Keep this in sync with any new public types or helpers.
- `demo/src/app/`
  Live showcase app. This should demonstrate real library behavior, not paper over limitations.
- `docs/`
  Architecture, API, migration, styling, and testing docs.

## Architecture Notes

- Highlighting and diff computation are separate concerns.
- `computeDiff(oldValue, newValue, options)` returns a structured `ComputeDiffResult`.
- `toHighlightPaths(result)` projects the structured diff into the simpler path format consumed by the directives and scope components.
- Array matching is semantic by default when safe:
  - path-based identity rules
  - global identity callback
  - built-in keys such as `id`, `key`, `uuid`, `_id`
  - bounded fingerprint matching in `auto` mode
  - explicit positional comparison in `index` mode
- Array matches are one-to-one. Once an old or new index has been matched, it must not be reused.
- If semantic matching is used for an array segment, unmatched leftovers should be treated as `added` / `deleted`, not pairwise-changed by position.

## Working Rules

- Keep the code simple and easy to reason about. Prefer small helpers and explicit branching over clever abstractions.
- Preserve the distinction between:
  - structured diff entries for semantics
  - flattened highlight paths for UI wiring
- Do not hide library gaps in the demo. If behavior is limited or intentionally conservative, show that clearly.
- If you change public behavior, update:
  - tests
  - demo
  - `README.md`
  - relevant files in `docs/`
- If you add or rename public APIs or types, update `src/public-api.ts`.

## Demo Expectations

- The demo should stay minimal, but it must be accurate.
- Side-by-side comparisons should align the same logical item when demonstrating semantic array moves.
- Row-level and field-level highlighting should both be visible where relevant.
- Notes in the demo should reflect actual current behavior, especially around array matching and fallback behavior.

## Testing Expectations

Run the smallest relevant verification first, then broaden as needed.

Common commands:

```bash
npm test -- --watch=false
npm run test:coverage
npm run ng -- build ngx-diff-highlight --configuration development
npm run ng -- build demo --configuration development
```

Use these expectations:

- Library behavior changes:
  add or update unit tests under `src/lib/**/*.spec.ts`
- Demo behavior changes:
  update `demo/src/app/app.spec.ts`
- Public API or behavior changes:
  update docs in `README.md` and `docs/`

## Coverage Guidance

- Coverage is measured with `npm run test:coverage`.
- Do not hardcode aspirational coverage numbers in docs or badges.
- If the reported coverage changes materially, update any referenced badge or documentation to match the current measured result.

## Review Checklist

Before finishing work, check:

- Does the demo still reflect the actual library behavior?
- Are semantic array cases tested, including moves, move-plus-change, add/delete, and explicit `index` mode?
- Are docs and architecture notes still accurate?
- Is the public API surface exported and documented correctly?

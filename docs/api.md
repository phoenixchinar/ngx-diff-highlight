# Public API Reference

## Core Types

### `DiffFieldPath`
A string representing a canonical field path.
```ts
export type DiffFieldPath = string;
```

### `DiffHighlightMatchEvent`
Emitted by the highlight directive when its highlight state changes.
```ts
export interface DiffHighlightMatchEvent {
  path: DiffFieldPath | null;
  highlighted: boolean;
}
```

### `DiffHighlightConfig`
Configuration for the highlight system.
```ts
export interface DiffHighlightConfig {
  highlightClass?: string;
  secondaryClass?: string;
  pathMatcher?: (resolvedPath: string | null, diffPath: string) => boolean;
}
```

## Injection Tokens

### `DIFF_HIGHLIGHT_CONFIG`
Provides the global or scoped configuration.
```ts
export const DIFF_HIGHLIGHT_CONFIG = new InjectionToken<DiffHighlightConfig>('DIFF_HIGHLIGHT_CONFIG');
```

### `DIFF_HIGHLIGHT_PATH_CONTEXT`
Used internally and by custom directives to provide path segments to descendants.
```ts
export const DIFF_HIGHLIGHT_PATH_CONTEXT = new InjectionToken<DiffHighlightPathContext>('DIFF_HIGHLIGHT_PATH_CONTEXT');
```

## Canonical Path Grammar

The system uses a normalized field-path format:

- Object field: `field`
- Nested field: `parent.child`
- Array index: `items[0]`
- Nested array field: `items[0].name`
- Nested object inside indexed group: `key.sort[0].variable`

### Normalization Rules

1. Trim whitespace from segments and full paths.
2. Remove invalid empty segments.
3. Convert accidental `".[index]"` sequences into `"[index]"`.
4. Numeric path segments from Angular control paths must become bracket indices.

## Match Semantics

Matching works both downward (ancestor match) and upward (descendant match).

- **Exact Match:** `candidate === target`
- **Descendant Match:** `candidate.startsWith(target + '.')` or `candidate.startsWith(target + '[')`
- **Ancestor Match:** `target.startsWith(candidate + '.')` or `target.startsWith(candidate + '[')`

## Public Directives and Components

### `DiffHighlightScopeComponent`
Provides an isolated highlight scope for its subtree.
- **Selector:** `diff-highlight-scope`, `[diffHighlightScope]`
- **Input:** `fields: string[]` (reactive)

### `DiffHighlightFieldDirective`
Primary directive to receive highlight classes.
- **Selector:** `[diffHighlightField]`, `[appHighlightField]` (compatibility)
- **Input:** `diffHighlightField: string` (optional explicit path)
- **Output:** `fieldInDiff: EventEmitter<boolean>`

### `DiffHighlightGroupDirective`
Names an object segment.
- **Selector:** `[diffHighlightGroup]`, `[appHighlightFieldGroup]` (compatibility)

### `DiffHighlightArrayDirective`
Names an array or index segment.
- **Selector:** `[diffHighlightArray]`, `[appHighlightFieldArray]` (compatibility)

### `DiffHighlightNameDirective`
Names a nested field segment.
- **Selector:** `[diffHighlightName]`, `[appHighlightFieldName]` (compatibility)

## Public Service

### `DiffHighlightService`
Scoped service managing the field list.
- `setFields(fields: string[]): void`
- `fields$: Observable<string[]>`
- `clear(): void`

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
  type: DiffType;
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

### `ComputeDiffOptions`
Configuration for structural diffing and array matching.
```ts
export interface ComputeDiffOptions {
  arrayMatching?: {
    mode?: 'auto' | 'identity-only' | 'fingerprint' | 'index';
    identityByPath?: Record<string, string | ComputeDiffArrayIdentityResolver>;
    getIdentity?: ComputeDiffArrayIdentityResolver;
    builtInIdentityKeys?: string[];
    fingerprint?: {
      enabled?: boolean;
      maxAutoSegmentSize?: number;
      maxFingerprintEntries?: number;
    };
  };
}
```

`mode: 'auto'` is the default. It tries path-aware identity rules, then built-in identity keys, then bounded fingerprint matching for smaller object-array reorder segments, and finally falls back to index-based diffing.

### `ComputeDiffResult`
Structured result returned by `computeDiff()`.
```ts
export interface ComputeDiffResult {
  entries: ComputeDiffEntry[];
  highlightFields: DiffFieldPathObject[];
}
```

### `ComputeDiffEntry`
Each diff entry is either a leaf field diff or an array-item diff.
```ts
export type ComputeDiffEntry = ComputeDiffFieldEntry | ComputeDiffArrayItemEntry;
```

`ComputeDiffFieldEntry` represents `added`, `deleted`, or `changed` fields. `ComputeDiffArrayItemEntry` represents `added`, `deleted`, `moved`, or `moved-changed` array items and includes old/new indexes plus the match source.

### `toHighlightPaths(result)`
Projects a structured diff result to the highlight-path format used by `diff-highlight-scope`.
```ts
const diff = computeDiff(oldValue, newValue);
const fields = toHighlightPaths(diff);
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
- **Input:** `fields: DiffHighlightInput[]` (reactive)
- **Input:** `cssPrefix?: string`

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
- `setFields(fields: DiffHighlightInput[]): void`
- `fields$: Observable<DiffFieldPathObject[]>`
- `clear(): void`
- `addField(field: DiffHighlightInput): void`
- `removeField(path: string): void`

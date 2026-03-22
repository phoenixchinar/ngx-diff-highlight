# Architecture

## Scoped Service Pattern

`ngx-diff-highlight` uses a scoped service pattern to manage highlight state.

- `DiffHighlightService` is NOT provided in `root`.
- It is provided by the `DiffHighlightScopeComponent` or `DiffHighlightScopeDirective`.
- This creates a new instance of the service for that specific subtree of the DOM.
- Descendants inject the nearest `DiffHighlightService` instance.

This allows multiple independent diff scopes to exist on the same page (e.g., comparing two different versions of two different entities side-by-side).

## Diff Pipeline

The diff engine and the highlight layer are intentionally separate:

1. `computeDiff(oldValue, newValue, options)` produces a structured `ComputeDiffResult`.
2. The result contains:
   - `entries`: field entries and array-item entries
   - `highlightFields`: flattened highlight paths derived from the structured diff
3. `toHighlightPaths(result)` is the adapter used when a UI only needs highlightable field paths.

This separation lets the library represent richer array behavior such as moves, move-plus-change, and match source without forcing the directives to understand the entire diff model.

## Path Resolution Precedence

The `DiffHighlightFieldDirective` resolves its canonical path using the following precedence:

1. **Explicit Input:** `[diffHighlightField]="'some.path'"` or `[appHighlightField]="'some.path'"`
2. **Element ID:** `<div id="some.path" diffHighlightField>`
3. **NgControl:** If the element has an Angular form control attached (`formControlName`, `formControl`, etc.), it uses `ngControl.path`.
4. **Hierarchical Context:** It composes a path from parent `diffHighlightGroup`, `diffHighlightArray`, and `diffHighlightName` directives.

This precedence means an explicit `id` on a form control can override `NgControl.path`. If you want path-context behavior for nested arrays, apply `diffHighlightField` to a wrapper element instead of the input itself.

## Canonical Path Grammar

Paths are normalized to a consistent format:
- Dots separate object fields: `user.name`
- Brackets wrap array indices: `items[0].name`
- Accidental `.[0]` is normalized to `[0]`.

## Array Matching Logic

Array diffing uses a layered strategy:

1. Trim unchanged prefix and suffix segments.
2. Try path-aware identity rules from `arrayMatching.identityByPath`.
3. Try the global `arrayMatching.getIdentity` callback.
4. Try built-in identity keys such as `id`, `key`, `uuid`, and `_id`.
5. In `auto` mode, try bounded deterministic fingerprint matching for smaller object-array reorder segments.
6. Fall back to index-based comparison.

Matches are one-to-one: once an old index or new index has been matched, it is not reused for a second match.

## Matching Logic

Matching is symmetric (exact, ancestor, or descendant):
- If `user` is in the diff, `user.name` is highlighted (Ancestor match).
- If `user.name` is in the diff, `user` is highlighted (Descendant match).
- If `user.name` is in the diff, `user.name` is highlighted (Exact match).

This is why a row-level path such as `items[0]` can highlight an entire row and its nested cells, while a specific field path such as `items[0].name` can still highlight only the exact field.

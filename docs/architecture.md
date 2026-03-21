# Architecture

## Scoped Service Pattern

`ng-diff-highlight` uses a scoped service pattern to manage diff state. 

- `DiffHighlightService` is NOT provided in `root`.
- It is provided by the `DiffHighlightScopeComponent` or `DiffHighlightScopeDirective`.
- This creates a new instance of the service for that specific subtree of the DOM.
- Descendants inject the nearest `DiffHighlightService` instance.

This allows multiple independent diff scopes to exist on the same page (e.g., comparing two different versions of two different entities side-by-side).

## Path Resolution Precedence

The `DiffHighlightFieldDirective` resolves its canonical path using the following precedence:

1. **Explicit Input:** `[diffHighlightField]="'some.path'"` or `[appHighlightField]="'some.path'"`
2. **Element ID:** `<div id="some.path" diffHighlightField>`
3. **NgControl:** If the element has an Angular form control attached (`formControlName`, `formControl`, etc.), it uses `ngControl.path`.
4. **Hierarchical Context:** It composes a path from parent `diffHighlightGroup`, `diffHighlightArray`, and `diffHighlightName` directives.

## Canonical Path Grammar

Paths are normalized to a consistent format:
- Dots separate object fields: `user.name`
- Brackets wrap array indices: `items[0].name`
- Accidental `.[0]` is normalized to `[0]`.

## Matching Logic

Matching is symmetric (exact, ancestor, or descendant):
- If `user` is in the diff, `user.name` is highlighted (Ancestor match).
- If `user.name` is in the diff, `user` is highlighted (Descendant match).
- If `user.name` is in the diff, `user.name` is highlighted (Exact match).

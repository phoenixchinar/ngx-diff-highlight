# Testing Guide

Testing components that use `ngx-diff-highlight` is simple because it relies on standard Angular patterns.

## Structured Diff Results

`computeDiff()` now returns a structured `ComputeDiffResult`. If a component only needs directive-compatible field paths, project the result with `toHighlightPaths()`:

```ts
import { computeDiff, toHighlightPaths } from 'ngx-diff-highlight';

const diff = computeDiff(oldValue, newValue);
component.diffFields = toHighlightPaths(diff);
```

## Mocking the Service

If you're testing a component that provides a scope, you can usually let the library work as-is. 

If you're testing a component with a `diffHighlightField` directive that needs a service from an ancestor, provide a mock in your test:

```ts
import { DiffHighlightService } from 'ngx-diff-highlight';
import { BehaviorSubject } from 'rxjs';

describe('MyComponent', () => {
  let fields$: BehaviorSubject<string[]>;

  beforeEach(async () => {
    fields$ = new BehaviorSubject<string[]>([]);
    
    await TestBed.configureTestingModule({
      imports: [MyComponent, DiffHighlightModule],
      providers: [
        { provide: DiffHighlightService, useValue: { fields$: fields$.asObservable() } }
      ]
    }).compileComponents();
  });

  it('should react to diff changes', () => {
    const fixture = TestBed.createComponent(MyComponent);
    fixture.detectChanges();

    fields$.next([{ path: 'my.field', type: 'changed' }]);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('#my-field');
    expect(el.classList.contains('diff-highlight')).toBe(true);
  });
});
```

## Waiting for Updates

The `DiffHighlightScopeComponent` updates its service asynchronously (via microtask) to avoid `ExpressionChangedAfterItHasBeenCheckedError`.

When updating the `[fields]` input in your tests, always call `await fixture.whenStable()` before asserting:

```ts
it('should update highlights when fields change', async () => {
  component.diffFields = ['new.path'];
  fixture.detectChanges();
  await fixture.whenStable(); // Wait for deferred service update
  
  // Assert here
});
```

## Testing Structured Array Diffs

If you are testing diff logic directly, assert against `result.entries` for move/add/delete semantics and `toHighlightPaths(result)` for directive-facing paths:

```ts
const result = computeDiff(oldValue, newValue);

expect(result.entries).toEqual([
  expect.objectContaining({
    kind: 'array-item',
    type: 'moved',
    oldIndex: 1,
    newIndex: 0,
  }),
]);

expect(toHighlightPaths(result)).toEqual([
  { path: 'items[0]', type: 'changed' },
]);
```

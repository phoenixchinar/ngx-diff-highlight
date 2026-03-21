# ngx-diff-highlight

Angular library for resolving canonical diff field paths, scoping those paths to a subtree, and applying deterministic highlight behavior for both editable and read-only UIs.

[![Build Status](https://github.com/phoenixchinar/ngx-diff-highlight/actions/workflows/ci.yml/badge.svg)](https://github.com/phoenixchinar/ngx-diff-highlight/actions)
![Code Coverage](https://img.shields.io/badge/coverage-97%25-brightgreen)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

- **Scoped diff state management:** Each `diff-highlight-scope` is isolated, allowing multiple independent diffs on the same page.
- **Precedence-based path resolution:** Automatic path resolution from DOM, Angular forms, or hierarchical context.
- **Deterministic highlighting:** Symmetric matching for exact, ancestor, and descendant matches.
- **Seamless integration:** Built-in support for Angular Reactive Forms.
- **Compatibility:** Aliases for legacy `appHighlightField*` selectors.

## Compatibility

`ngx-diff-highlight` is compatible with Angular **v18.0.0** and above. It uses standard Angular standalone APIs and the `inject()` function.

### External Dependencies

- **RxJS**: `^7.8.0` (Standard Angular dependency)
- **tslib**: `^2.3.0` (Standard TypeScript runtime)

## Installation

```bash
npm install ngx-diff-highlight
```

## Quick Start

### 1. Register the library

```ts
import { DiffHighlightModule } from 'ngx-diff-highlight';

@Component({
  standalone: true,
  imports: [DiffHighlightModule],
  ...
})
export class AppComponent {}
```

### 2. Define a scope and highlighted fields

```html
<diff-highlight-scope [fields]="['user.firstName']">
  <form [formGroup]="userForm">
    <!-- Automagically resolves path from NgControl -->
    <input formControlName="firstName" diffHighlightField>
    
    <!-- Manual path resolution -->
    <div [diffHighlightField]="'user.lastName'">Last Name: Doe</div>
  </form>
</diff-highlight-scope>
```

## Documentation

- [API Reference](docs/api.md)
- [Architecture](docs/architecture.md)
- [Migration Guide](docs/migration.md)
- [Styling](docs/styling.md)
- [Testing](docs/testing.md)

## Live Demo

Check out the [Live Demo Showcase](https://phoenixchinar.github.io/ngx-diff-highlight/) to see the library in action.

### Visual Diff & side-by-side Example

You can use `computeDiff()` to automatically find differences between two objects and highlight them in a side-by-side view using the `cssPrefix` feature.

```ts
// Component logic
const leftObj = { user: { name: 'Jane', bio: 'Text' } };
const rightObj = { user: { name: 'John', lastName: 'Doe' } };

// Computes: [{path: 'user.name', type: 'changed'}, {path: 'user.bio', type: 'deleted'}, {path: 'user.lastName', type: 'added'}]
this.diffs = computeDiff(leftObj, rightObj);
```

```html
<div class="comparison-container">
  <!-- Left Version -->
  <diff-highlight-scope [fields]="diffs" cssPrefix="left">
    <div [diffHighlightField]="'user.name'">Name: Jane</div>
    <div [diffHighlightField]="'user.bio'">Bio: Text</div>
  </diff-highlight-scope>

  <!-- Right Version -->
  <diff-highlight-scope [fields]="diffs" cssPrefix="right">
    <div [diffHighlightField]="'user.name'">Name: John</div>
    <div [diffHighlightField]="'user.lastName'">Last Name: Doe</div>
  </diff-highlight-scope>
</div>
```

Corresponding CSS:
```css
/* Styling for 'changed' fields in the left scope */
.left-changed { background-color: #ffe0b2; border-left: 4px solid #f57c00; }

/* Styling for 'changed' fields in the right scope */
.right-changed { background-color: #e3f2fd; border-left: 4px solid #1976d2; }

/* Styling for 'added' fields in the right scope */
.right-added   { background-color: #e8f5e9; border-left: 4px solid #388e3c; }

/* Styling for 'deleted' fields in the left scope */
.left-deleted  { background-color: #ffebee; text-decoration: line-through; }
```

## Development

- `npm run build`: Build the library and demo app.
- `npm test`: Run all unit and integration tests.
- `npm run lint`: Run ESLint.

## License

MIT © [Imran](LICENSE)

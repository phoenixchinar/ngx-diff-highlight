# ngx-diff-highlight

Angular library for resolving canonical diff field paths, scoping those paths to a subtree, and applying deterministic highlight behavior for both editable and read-only UIs.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://github.com/imran/ngx-diff-highlight/actions/workflows/ci.yml/badge.svg)](https://github.com/imran/ngx-diff-highlight/actions)

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

## Development

- `npm run build`: Build the library and demo app.
- `npm test`: Run all unit and integration tests.
- `npm run lint`: Run ESLint.

## License

MIT © [Imran](LICENSE)

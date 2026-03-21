# Migration Guide

`ngx-diff-highlight` is designed to be a drop-in replacement for the legacy highlight system in many cases.

## From `app-highlight-fields` to `diff-highlight-scope`

The `app-highlight-fields` selector is preserved for backward compatibility. You can continue using it, or switch to the new name.

```html
<!-- Legacy -->
<app-highlight-fields [fields]="diffFields">
  ...
</app-highlight-fields>

<!-- New -->
<diff-highlight-scope [fields]="diffFields">
  ...
</diff-highlight-scope>
```

## From `appHighlightField` to `diffHighlightField`

All `appHighlightField*` selectors are available as aliases. You do not need to rename them immediately, but we recommend using the new names for new code.

| Legacy Selector | New Selector |
|-----------------|--------------|
| `[appHighlightField]` | `[diffHighlightField]` |
| `[appHighlightFieldGroup]` | `[diffHighlightGroup]` |
| `[appHighlightFieldArray]` | `[diffHighlightArray]` |
| `[appHighlightFieldName]` | `[diffHighlightName]` |

## Integration with Reactive Forms

If you previously used manual `[appHighlightField]="'path'"` on form controls, you can now remove the path entirely if the control is part of a standard Angular form structure. The directive will automatically resolve the path from `NgControl`.

```html
<!-- Before -->
<input formControlName="firstName" [appHighlightField]="'user.firstName'">

<!-- After -->
<input formControlName="firstName" diffHighlightField>
```

# Styling Guide

The library does not provide any default styles. It only applies CSS classes to the elements that match a field in the diff.

## Default CSS Classes

By default, the `DiffHighlightFieldDirective` applies the following classes when a match is found:

- `diff-highlight`: Primary class applied to the element.
- `diff-highlight-secondary`: Secondary class applied to the element.

If a scope sets `cssPrefix`, the directive also applies prefixed classes such as:

- `left-diff-highlight`
- `left-changed`
- `right-added`

## Customizing Classes

You can customize these classes globally or per-scope by providing a `DIFF_HIGHLIGHT_CONFIG`.

```ts
import { provideDiffHighlightConfig } from 'ngx-diff-highlight';

// In your app bootstrap
bootstrapApplication(AppComponent, {
  providers: [
    provideDiffHighlightConfig({
      highlightClass: 'my-custom-highlight',
      secondaryClass: 'is-modified'
    })
  ]
});
```

## Example Styles

Add these to your global `styles.css` to see the highlights:

```css
.diff-highlight {
  background-color: #fff3cd; /* Light yellow background */
  border: 1px solid #ffeeba;
  transition: background-color 0.3s ease;
}

/* Optional: change input behavior */
input.diff-highlight {
  color: #856404;
  font-weight: bold;
}

/* Optional: scope-specific classes for visual diffs */
.left-changed {
  border-left: 4px solid #d97706;
}

.right-added {
  border-left: 4px solid #15803d;
}
```

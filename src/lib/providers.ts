import { Provider } from '@angular/core';
import { DiffHighlightConfig } from './models/diff-highlight.models';
import { DIFF_HIGHLIGHT_CONFIG } from './tokens/diff-highlight.tokens';
import { pathsMatch } from './utils/path-utils';

/**
 * Provides a configuration for the DiffHighlight system.
 * This can be used globally in `app.config.ts` or scoped within components.
 * 
 * @param config Custom configuration that overrides defaults.
 */
export function provideDiffHighlightConfig(config: Partial<DiffHighlightConfig>): Provider {
  return {
    provide: DIFF_HIGHLIGHT_CONFIG,
    useValue: {
      highlightClass: 'diff-highlight',
      secondaryClass: 'diff-highlight-secondary',
      pathMatcher: pathsMatch,
      ...config,
    },
  };
}

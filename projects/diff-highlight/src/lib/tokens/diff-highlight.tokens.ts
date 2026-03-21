import { InjectionToken } from '@angular/core';
import { DiffHighlightConfig, DiffHighlightPathContext } from '../models/diff-highlight.models';
import { pathsMatch } from '../utils/path-utils';

export const DIFF_HIGHLIGHT_CONFIG = new InjectionToken<DiffHighlightConfig>('DIFF_HIGHLIGHT_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    highlightClass: 'diff-highlight',
    secondaryClass: 'diff-highlight-secondary',
    pathMatcher: pathsMatch,
  }),
});

export const DIFF_HIGHLIGHT_PATH_CONTEXT = new InjectionToken<DiffHighlightPathContext>('DIFF_HIGHLIGHT_PATH_CONTEXT');

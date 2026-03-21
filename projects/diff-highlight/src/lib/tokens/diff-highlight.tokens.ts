import { InjectionToken } from '@angular/core';
import { DiffHighlightConfig, DiffHighlightPathContext } from '../models/diff-highlight.models';

export const DIFF_HIGHLIGHT_CONFIG = new InjectionToken<DiffHighlightConfig>('DIFF_HIGHLIGHT_CONFIG');

export const DIFF_HIGHLIGHT_PATH_CONTEXT = new InjectionToken<DiffHighlightPathContext>('DIFF_HIGHLIGHT_PATH_CONTEXT');

export type DiffFieldPath = string;

export interface DiffHighlightMatchEvent {
  path: DiffFieldPath | null;
  highlighted: boolean;
}

export interface DiffHighlightConfig {
  highlightClass?: string;
  secondaryClass?: string;
  pathMatcher?: (resolvedPath: string | null, diffPath: string) => boolean;
}

export interface DiffHighlightPathContext {
  getPath(): DiffFieldPath | null;
}

export type DiffType = 'added' | 'deleted' | 'changed' | 'none';

export interface DiffFieldPathObject {
  path: string;
  type?: DiffType;
}

/**
 * A canonical field path string.
 */
export type DiffFieldPath = string;

/**
 * Input type for the scope component/directive.
 * Can be simple strings or objects with type information.
 */
export type DiffHighlightInput = string | DiffFieldPathObject;

export interface DiffHighlightMatchEvent {
  path: string | null;
  highlighted: boolean;
  type: DiffType;
}

export interface DiffHighlightConfig {
  highlightClass?: string;
  secondaryClass?: string;
  pathMatcher?: (resolvedPath: string | null, diffPath: string) => boolean;
}

export interface DiffHighlightPathContext {
  getPath(): string | null;
}

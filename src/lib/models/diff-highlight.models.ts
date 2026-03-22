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

export type ComputeDiffArrayMode = 'auto' | 'identity-only' | 'fingerprint' | 'index';

export interface ComputeDiffArrayIdentityContext {
  arrayPath: string | null;
  wildcardArrayPath: string;
  side: 'old' | 'new';
  index: number;
}

export type ComputeDiffArrayIdentityResolver =
  | string
  | ((item: unknown, context: ComputeDiffArrayIdentityContext) => string | number | boolean | bigint | null | undefined);

export interface ComputeDiffFingerprintOptions {
  enabled?: boolean;
  maxAutoSegmentSize?: number;
  maxFingerprintEntries?: number;
}

export interface ComputeDiffArrayMatchingOptions {
  mode?: ComputeDiffArrayMode;
  identityByPath?: Record<string, ComputeDiffArrayIdentityResolver>;
  getIdentity?: (item: unknown, context: ComputeDiffArrayIdentityContext) => string | number | boolean | bigint | null | undefined;
  builtInIdentityKeys?: string[];
  fingerprint?: ComputeDiffFingerprintOptions;
}

export interface ComputeDiffOptions {
  arrayMatching?: ComputeDiffArrayMatchingOptions;
}

export type ComputeDiffMatchSource = 'path-rule' | 'callback' | 'built-in' | 'fingerprint' | 'index';

export interface ComputeDiffFieldEntry {
  kind: 'field';
  path: string;
  type: Exclude<DiffType, 'none'>;
}

export interface ComputeDiffArrayItemEntry {
  kind: 'array-item';
  path: string;
  type: 'added' | 'deleted' | 'moved' | 'moved-changed';
  oldIndex: number | null;
  newIndex: number | null;
  matchSource: ComputeDiffMatchSource;
  highlightFields: DiffFieldPathObject[];
}

export type ComputeDiffEntry = ComputeDiffFieldEntry | ComputeDiffArrayItemEntry;

export interface ComputeDiffResult {
  entries: ComputeDiffEntry[];
  highlightFields: DiffFieldPathObject[];
}

export interface DiffHighlightPathContext {
  getPath(): string | null;
}

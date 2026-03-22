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

export interface DiffHighlightPathContext {
  getPath(): string | null;
}

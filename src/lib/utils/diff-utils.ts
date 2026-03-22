import {
  ComputeDiffArrayIdentityContext,
  ComputeDiffArrayIdentityResolver,
  ComputeDiffArrayMatchingOptions,
  ComputeDiffArrayItemEntry,
  ComputeDiffEntry,
  ComputeDiffFieldEntry,
  ComputeDiffMatchSource,
  ComputeDiffOptions,
  ComputeDiffResult,
  DiffFieldPathObject,
} from '../models/diff-highlight.models';
import { joinDiffPath } from './path-utils';

const DEFAULT_IDENTITY_KEYS = ['id', 'key', 'uuid', '_id'] as const;
const DEFAULT_ARRAY_MODE = 'auto';
const DEFAULT_MAX_AUTO_SEGMENT_SIZE = 32;
const DEFAULT_MAX_FINGERPRINT_ENTRIES = 2048;

interface Collector {
  entries: ComputeDiffEntry[];
  highlightFields: DiffFieldPathObject[];
}

interface DiffRuntime {
  options: RequiredComputeDiffOptions;
  oldAncestors: Set<object>;
  newAncestors: Set<object>;
  fingerprintCache: WeakMap<object, string | null>;
}

interface RequiredComputeDiffOptions {
  arrayMatching: RequiredComputeDiffArrayMatchingOptions;
}

interface RequiredComputeDiffArrayMatchingOptions {
  mode: 'auto' | 'identity-only' | 'fingerprint' | 'index';
  identityByPath: Record<string, ComputeDiffArrayIdentityResolver>;
  getIdentity: ((item: unknown, context: ComputeDiffArrayIdentityContext) => string | number | boolean | bigint | null | undefined) | null;
  builtInIdentityKeys: string[];
  fingerprint: {
    enabled: boolean;
    maxAutoSegmentSize: number;
    maxFingerprintEntries: number;
  };
}

interface ArrayMatch {
  oldIndex: number;
  newIndex: number;
  source: Exclude<ComputeDiffMatchSource, 'index'>;
}

/**
 * Computes a structured diff between two values.
 */
export function computeDiff(oldObj: unknown, newObj: unknown, options: ComputeDiffOptions = {}): ComputeDiffResult {
  const collector = createCollector();
  const runtime: DiffRuntime = {
    options: normalizeComputeDiffOptions(options),
    oldAncestors: new Set<object>(),
    newAncestors: new Set<object>(),
    fingerprintCache: new WeakMap<object, string | null>(),
  };

  compare(oldObj, newObj, null, collector, runtime);

  return {
    entries: collector.entries,
    highlightFields: dedupeHighlightFields(collector.highlightFields),
  };
}

/**
 * Projects a structured diff result to the highlight-path format used by the directives.
 */
export function toHighlightPaths(result: ComputeDiffResult): DiffFieldPathObject[] {
  return dedupeHighlightFields(result.highlightFields);
}

function normalizeComputeDiffOptions(options: ComputeDiffOptions): RequiredComputeDiffOptions {
  const arrayMatching: ComputeDiffArrayMatchingOptions = options.arrayMatching ?? {};

  return {
    arrayMatching: {
      mode: arrayMatching.mode ?? DEFAULT_ARRAY_MODE,
      identityByPath: arrayMatching.identityByPath ?? {},
      getIdentity: arrayMatching.getIdentity ?? null,
      builtInIdentityKeys: arrayMatching.builtInIdentityKeys ?? [...DEFAULT_IDENTITY_KEYS],
      fingerprint: {
        enabled: arrayMatching.fingerprint?.enabled ?? true,
        maxAutoSegmentSize: arrayMatching.fingerprint?.maxAutoSegmentSize ?? DEFAULT_MAX_AUTO_SEGMENT_SIZE,
        maxFingerprintEntries: arrayMatching.fingerprint?.maxFingerprintEntries ?? DEFAULT_MAX_FINGERPRINT_ENTRIES,
      },
    },
  };
}

function createCollector(): Collector {
  return {
    entries: [],
    highlightFields: [],
  };
}

function compare(
  oldVal: unknown,
  newVal: unknown,
  path: string | null,
  collector: Collector,
  runtime: DiffRuntime
): void {
  if (oldVal === newVal) return;

  if (oldVal == null || newVal == null || typeof oldVal !== typeof newVal || Array.isArray(oldVal) !== Array.isArray(newVal)) {
    if (path) {
      addFieldEntry(path, 'changed', collector);
    }
    return;
  }

  if (!enterTraversal(oldVal, newVal, runtime)) {
    if (path) {
      addFieldEntry(path, 'changed', collector);
    }
    return;
  }

  try {
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      compareArrays(oldVal, newVal, path, collector, runtime);
      return;
    }

    if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
      compareObjects(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, path, collector, runtime);
      return;
    }

    if (path) {
      addFieldEntry(path, 'changed', collector);
    }
  } finally {
    leaveTraversal(oldVal, newVal, runtime);
  }
}

function compareObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  path: string | null,
  collector: Collector,
  runtime: DiffRuntime
): void {
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  keys.forEach((key) => {
    const currentPath = joinDiffPath(path, key);
    if (!currentPath) return;

    if (!(key in oldObj)) {
      addFieldEntry(currentPath, 'added', collector);
    } else if (!(key in newObj)) {
      addFieldEntry(currentPath, 'deleted', collector);
    } else {
      compare(oldObj[key], newObj[key], currentPath, collector, runtime);
    }
  });
}

function compareArrays(
  oldArr: unknown[],
  newArr: unknown[],
  path: string | null,
  collector: Collector,
  runtime: DiffRuntime
): void {
  let start = 0;
  while (start < oldArr.length && start < newArr.length && isDeepEqual(oldArr[start], newArr[start])) {
    start++;
  }

  let oldEnd = oldArr.length - 1;
  let newEnd = newArr.length - 1;
  while (oldEnd >= start && newEnd >= start && isDeepEqual(oldArr[oldEnd], newArr[newEnd])) {
    oldEnd--;
    newEnd--;
  }

  if (start > oldEnd) {
    for (let index = start; index <= newEnd; index++) {
      emitArrayItemPresence(joinDiffPath(path, index)!, null, index, 'added', 'index', collector);
    }
    return;
  }

  if (start > newEnd) {
    for (let index = start; index <= oldEnd; index++) {
      emitArrayItemPresence(joinDiffPath(path, index)!, index, null, 'deleted', 'index', collector);
    }
    return;
  }

  const oldMiddle = oldArr.slice(start, oldEnd + 1);
  const newMiddle = newArr.slice(start, newEnd + 1);
  const matches = getArrayMatches(oldMiddle, newMiddle, path, runtime);

  if (matches.length === 0) {
    diffArrayByIndex(oldMiddle, newMiddle, path, start, collector, runtime);
    return;
  }

  const matchedOld = new Set(matches.map((match) => match.oldIndex));
  const matchedNew = new Set(matches.map((match) => match.newIndex));

  const unmatchedOld = collectUnmatchedIndices(oldMiddle.length, matchedOld);
  const unmatchedNew = collectUnmatchedIndices(newMiddle.length, matchedNew);

  for (const oldIndex of unmatchedOld) {
    emitArrayItemPresence(joinDiffPath(path, start + oldIndex)!, start + oldIndex, null, 'deleted', 'index', collector);
  }

  for (const newIndex of unmatchedNew) {
    emitArrayItemPresence(joinDiffPath(path, start + newIndex)!, null, start + newIndex, 'added', 'index', collector);
  }

  const matchesByNewIndex = new Map(matches.map((match) => [match.newIndex, match]));
  for (let newIndex = 0; newIndex < newMiddle.length; newIndex++) {
    const match = matchesByNewIndex.get(newIndex);
    if (!match) continue;

    const entryPath = joinDiffPath(path, start + match.newIndex)!;
    const subtreeCollector = createCollector();
    compare(oldMiddle[match.oldIndex], newMiddle[match.newIndex], entryPath, subtreeCollector, runtime);

    const moved = match.oldIndex !== match.newIndex;
    const subtreeHighlights = dedupeHighlightFields(subtreeCollector.highlightFields);

    if (moved) {
      addArrayItemEntry({
        kind: 'array-item',
        path: entryPath,
        type: subtreeHighlights.length > 0 ? 'moved-changed' : 'moved',
        oldIndex: start + match.oldIndex,
        newIndex: start + match.newIndex,
        matchSource: match.source,
        highlightFields: subtreeHighlights,
      }, collector);
    }

    appendCollector(collector, subtreeCollector);
  }
}

function diffArrayByIndex(
  oldArr: unknown[],
  newArr: unknown[],
  path: string | null,
  startIndex: number,
  collector: Collector,
  runtime: DiffRuntime
): void {
  const overlap = Math.min(oldArr.length, newArr.length);
  for (let index = 0; index < overlap; index++) {
    compare(oldArr[index], newArr[index], joinDiffPath(path, startIndex + index), collector, runtime);
  }

  if (newArr.length > oldArr.length) {
    for (let index = oldArr.length; index < newArr.length; index++) {
      emitArrayItemPresence(joinDiffPath(path, startIndex + index)!, null, startIndex + index, 'added', 'index', collector);
    }
  } else if (oldArr.length > newArr.length) {
    for (let index = newArr.length; index < oldArr.length; index++) {
      emitArrayItemPresence(joinDiffPath(path, startIndex + index)!, startIndex + index, null, 'deleted', 'index', collector);
    }
  }
}

function getArrayMatches(
  oldArr: unknown[],
  newArr: unknown[],
  path: string | null,
  runtime: DiffRuntime
): ArrayMatch[] {
  const { arrayMatching } = runtime.options;
  if (arrayMatching.mode === 'index') {
    return [];
  }

  const wildcardArrayPath = toWildcardArrayPath(path);
  const pathRule = arrayMatching.identityByPath[wildcardArrayPath];
  if (pathRule) {
    const matches = getUniqueMatchesByResolver(oldArr, newArr, pathRule, path, wildcardArrayPath, 'path-rule');
    if (matches.length > 0) return matches;
  }

  if (arrayMatching.getIdentity) {
    const matches = getUniqueMatchesByResolver(oldArr, newArr, arrayMatching.getIdentity, path, wildcardArrayPath, 'callback');
    if (matches.length > 0) return matches;
  }

  for (const key of arrayMatching.builtInIdentityKeys) {
    const matches = getUniqueMatchesByResolver(oldArr, newArr, key, path, wildcardArrayPath, 'built-in');
    if (matches.length > 0) return matches;
  }

  if (arrayMatching.mode === 'identity-only') {
    return [];
  }

  if (!arrayMatching.fingerprint.enabled) {
    return [];
  }

  if (arrayMatching.mode === 'auto' && !shouldAutoFingerprint(oldArr, newArr, runtime)) {
    return [];
  }

  return getUniqueMatchesByFingerprint(oldArr, newArr, runtime);
}

function getUniqueMatchesByResolver(
  oldArr: unknown[],
  newArr: unknown[],
  resolver: ComputeDiffArrayIdentityResolver,
  path: string | null,
  wildcardArrayPath: string,
  source: Exclude<ComputeDiffMatchSource, 'fingerprint' | 'index'>
): ArrayMatch[] {
  const oldMap = new Map<string, number[]>();
  const newMap = new Map<string, number[]>();

  for (let index = 0; index < oldArr.length; index++) {
    const identity = resolveIdentityKey(oldArr[index], resolver, {
      arrayPath: path,
      wildcardArrayPath,
      side: 'old',
      index,
    });
    if (!identity) continue;
    pushMappedIndex(oldMap, identity, index);
  }

  for (let index = 0; index < newArr.length; index++) {
    const identity = resolveIdentityKey(newArr[index], resolver, {
      arrayPath: path,
      wildcardArrayPath,
      side: 'new',
      index,
    });
    if (!identity) continue;
    pushMappedIndex(newMap, identity, index);
  }

  return collectUniqueMatches(oldMap, newMap, source);
}

function getUniqueMatchesByFingerprint(
  oldArr: unknown[],
  newArr: unknown[],
  runtime: DiffRuntime
): ArrayMatch[] {
  const oldMap = new Map<string, number[]>();
  const newMap = new Map<string, number[]>();

  for (let index = 0; index < oldArr.length; index++) {
    const fingerprint = fingerprintValue(oldArr[index], runtime);
    if (!fingerprint) return [];
    pushMappedIndex(oldMap, fingerprint, index);
  }

  for (let index = 0; index < newArr.length; index++) {
    const fingerprint = fingerprintValue(newArr[index], runtime);
    if (!fingerprint) return [];
    pushMappedIndex(newMap, fingerprint, index);
  }

  return collectUniqueMatches(oldMap, newMap, 'fingerprint');
}

function collectUniqueMatches(
  oldMap: Map<string, number[]>,
  newMap: Map<string, number[]>,
  source: Exclude<ComputeDiffMatchSource, 'index'>
): ArrayMatch[] {
  const matches: ArrayMatch[] = [];
  const usedOld = new Set<number>();
  const usedNew = new Set<number>();

  for (const [key, oldIndices] of oldMap.entries()) {
    const newIndices = newMap.get(key);
    if (!newIndices || oldIndices.length !== 1 || newIndices.length !== 1) {
      continue;
    }

    const oldIndex = oldIndices[0];
    const newIndex = newIndices[0];
    if (usedOld.has(oldIndex) || usedNew.has(newIndex)) {
      continue;
    }

    usedOld.add(oldIndex);
    usedNew.add(newIndex);
    matches.push({ oldIndex, newIndex, source });
  }

  return matches.sort((a, b) => a.newIndex - b.newIndex);
}

function resolveIdentityKey(
  item: unknown,
  resolver: ComputeDiffArrayIdentityResolver,
  context: ComputeDiffArrayIdentityContext
): string | null {
  const resolved = typeof resolver === 'string'
    ? readNamedIdentity(item, resolver)
    : resolver(item, context);

  if (resolved === null || resolved === undefined) {
    return null;
  }

  if (typeof resolved === 'string' || typeof resolved === 'number' || typeof resolved === 'boolean' || typeof resolved === 'bigint') {
    return `${typeof resolved}:${String(resolved)}`;
  }

  return null;
}

function readNamedIdentity(item: unknown, key: string): string | number | boolean | bigint | null | undefined {
  if (!isPlainObject(item)) {
    return null;
  }

  const value = item[key];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }

  return null;
}

function shouldAutoFingerprint(oldArr: unknown[], newArr: unknown[], runtime: DiffRuntime): boolean {
  const maxSegmentSize = runtime.options.arrayMatching.fingerprint.maxAutoSegmentSize;
  if (oldArr.length > maxSegmentSize || newArr.length > maxSegmentSize) {
    return false;
  }

  return oldArr.every(isAutoFingerprintCandidate) && newArr.every(isAutoFingerprintCandidate);
}

function isAutoFingerprintCandidate(value: unknown): boolean {
  return isPlainObject(value) || Array.isArray(value) || value instanceof Date;
}

function fingerprintValue(value: unknown, runtime: DiffRuntime): string | null {
  return serializeFingerprint(value, {
    entries: 0,
    maxEntries: runtime.options.arrayMatching.fingerprint.maxFingerprintEntries,
    ancestors: new Set<object>(),
  }, runtime);
}

function serializeFingerprint(
  value: unknown,
  state: { entries: number; maxEntries: number; ancestors: Set<object> },
  runtime: DiffRuntime
): string | null {
  state.entries++;
  if (state.entries > state.maxEntries) {
    return null;
  }

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  switch (typeof value) {
    case 'string':
      return `str(${value.length}):${value}`;
    case 'number':
      if (Number.isNaN(value)) return 'num:NaN';
      if (Object.is(value, -0)) return 'num:-0';
      return `num:${String(value)}`;
    case 'boolean':
      return `bool:${String(value)}`;
    case 'bigint':
      return `bigint:${String(value)}`;
    case 'symbol':
    case 'function':
      return null;
    case 'object':
      break;
    default:
      return null;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 'date:invalid' : `date:${time}`;
  }

  if (Array.isArray(value)) {
    if (state.ancestors.has(value)) return null;
    state.ancestors.add(value);
    try {
      const parts: string[] = [];
      for (const item of value) {
        const child = serializeFingerprint(item, state, runtime);
        if (child === null) return null;
        parts.push(child);
      }
      return `arr[${parts.join('$$$')}]`;
    } finally {
      state.ancestors.delete(value);
    }
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const cached = runtime.fingerprintCache.get(value);
  if (cached !== undefined && !state.ancestors.has(value)) {
    return cached;
  }

  if (state.ancestors.has(value)) return null;
  state.ancestors.add(value);
  try {
    const parts: string[] = [];
    for (const key of Object.keys(value).sort()) {
      const child = serializeFingerprint((value as Record<string, unknown>)[key], state, runtime);
      if (child === null) {
        runtime.fingerprintCache.set(value, null);
        return null;
      }
      parts.push(`key:${key}$$$${child}`);
    }
    const fingerprint = `obj{${parts.join('$$$')}}`;
    runtime.fingerprintCache.set(value, fingerprint);
    return fingerprint;
  } finally {
    state.ancestors.delete(value);
  }
}

function emitArrayItemPresence(
  path: string,
  oldIndex: number | null,
  newIndex: number | null,
  type: 'added' | 'deleted',
  source: ComputeDiffMatchSource,
  collector: Collector
): void {
  addArrayItemEntry({
    kind: 'array-item',
    path,
    type,
    oldIndex,
    newIndex,
    matchSource: source,
    highlightFields: [],
  }, collector);
}

function addFieldEntry(path: string, type: Exclude<DiffFieldPathObject['type'], 'none' | undefined>, collector: Collector): void {
  const entry: ComputeDiffFieldEntry = {
    kind: 'field',
    path,
    type,
  };
  collector.entries.push(entry);
  collector.highlightFields.push({ path, type });
}

function addArrayItemEntry(entry: ComputeDiffArrayItemEntry, collector: Collector): void {
  collector.entries.push(entry);

  const highlightType = entry.type === 'added'
    ? 'added'
    : entry.type === 'deleted'
      ? 'deleted'
      : 'changed';
  collector.highlightFields.push({ path: entry.path, type: highlightType });

  entry.highlightFields.forEach((field) => collector.highlightFields.push(field));
}

function appendCollector(target: Collector, source: Collector): void {
  target.entries.push(...source.entries);
  target.highlightFields.push(...source.highlightFields);
}

function dedupeHighlightFields(fields: DiffFieldPathObject[]): DiffFieldPathObject[] {
  const map = new Map<string, DiffFieldPathObject>();
  for (const field of fields) {
    map.set(field.path, field);
  }
  return Array.from(map.values());
}

function pushMappedIndex(map: Map<string, number[]>, key: string, index: number): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(index);
  } else {
    map.set(key, [index]);
  }
}

function collectUnmatchedIndices(length: number, matched: Set<number>): number[] {
  const indices: number[] = [];
  for (let index = 0; index < length; index++) {
    if (!matched.has(index)) {
      indices.push(index);
    }
  }
  return indices;
}

function toWildcardArrayPath(path: string | null): string {
  if (!path) {
    return '[]';
  }

  return `${path.replace(/\[\d+\]/g, '[]')}[]`;
}

function enterTraversal(oldVal: unknown, newVal: unknown, runtime: DiffRuntime): boolean {
  if (!isObjectLike(oldVal) || !isObjectLike(newVal)) {
    return true;
  }

  if (runtime.oldAncestors.has(oldVal) || runtime.newAncestors.has(newVal)) {
    return false;
  }

  runtime.oldAncestors.add(oldVal);
  runtime.newAncestors.add(newVal);
  return true;
}

function leaveTraversal(oldVal: unknown, newVal: unknown, runtime: DiffRuntime): void {
  if (!isObjectLike(oldVal) || !isObjectLike(newVal)) {
    return;
  }

  runtime.oldAncestors.delete(oldVal);
  runtime.newAncestors.delete(newVal);
}

function isObjectLike(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value instanceof Date) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key) || !isDeepEqual(objA[key], objB[key])) return false;
    }
    return true;
  }

  return false;
}

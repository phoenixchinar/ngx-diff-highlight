import {
  ComputeDiffArrayIdentityContext,
  ComputeDiffArrayIdentityResolver,
  ComputeDiffArrayMatchingOptions,
  ComputeDiffOptions,
  DiffFieldPathObject,
} from '../models/diff-highlight.models';
import { joinDiffPath } from './path-utils';

const DEFAULT_IDENTITY_KEYS = ['id', 'key', 'uuid', '_id'] as const;
const DEFAULT_ARRAY_MODE = 'auto';
const DEFAULT_MAX_AUTO_SEGMENT_SIZE = 32;
const DEFAULT_MAX_FINGERPRINT_ENTRIES = 2048;

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

/**
 * Computes the difference between two objects and returns an array of path objects
 * compatible with the DiffHighlightService.
 */
export function computeDiff(oldObj: unknown, newObj: unknown, options: ComputeDiffOptions = {}): DiffFieldPathObject[] {
  const diffs: DiffFieldPathObject[] = [];
  const runtime: DiffRuntime = {
    options: normalizeComputeDiffOptions(options),
    oldAncestors: new Set<object>(),
    newAncestors: new Set<object>(),
    fingerprintCache: new WeakMap<object, string | null>(),
  };

  compare(oldObj, newObj, null, diffs, runtime);
  return diffs;
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

function compare(
  oldVal: unknown,
  newVal: unknown,
  path: string | null,
  diffs: DiffFieldPathObject[],
  runtime: DiffRuntime
): void {
  if (oldVal === newVal) return;

  if (oldVal == null || newVal == null || typeof oldVal !== typeof newVal || Array.isArray(oldVal) !== Array.isArray(newVal)) {
    if (path) diffs.push({ path, type: 'changed' });
    return;
  }

  if (!enterTraversal(oldVal, newVal, runtime)) {
    return;
  }

  try {
    if (Array.isArray(newVal) && Array.isArray(oldVal)) {
      compareArrays(oldVal, newVal, path, diffs, runtime);
    } else if (typeof newVal === 'object' && newVal !== null && oldVal !== null) {
      compareObjects(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, path, diffs, runtime);
    } else {
      if (path) diffs.push({ path, type: 'changed' });
    }
  } finally {
    leaveTraversal(oldVal, newVal, runtime);
  }
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

function compareObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  path: string | null,
  diffs: DiffFieldPathObject[],
  runtime: DiffRuntime
): void {
  const oldKeys = Object.keys(oldObj);
  const newKeys = Object.keys(newObj);
  const allKeys = new Set([...oldKeys, ...newKeys]);

  allKeys.forEach((key) => {
    const currentPath = joinDiffPath(path, key);
    if (!currentPath) return;

    if (!(key in oldObj)) {
      diffs.push({ path: currentPath, type: 'added' });
    } else if (!(key in newObj)) {
      diffs.push({ path: currentPath, type: 'deleted' });
    } else {
      compare(oldObj[key], newObj[key], currentPath, diffs, runtime);
    }
  });
}

function compareArrays(
  oldArr: unknown[],
  newArr: unknown[],
  path: string | null,
  diffs: DiffFieldPathObject[],
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
    for (let i = start; i <= newEnd; i++) {
      diffs.push({ path: joinDiffPath(path, i)!, type: 'added' });
    }
    return;
  }

  if (start > newEnd) {
    for (let i = start; i <= oldEnd; i++) {
      diffs.push({ path: joinDiffPath(path, i)!, type: 'deleted' });
    }
    return;
  }

  const oldMiddle = oldArr.slice(start, oldEnd + 1);
  const newMiddle = newArr.slice(start, newEnd + 1);
  const matches = getArrayMatches(oldMiddle, newMiddle, path, runtime);

  if (matches.length === 0) {
    diffArrayByIndex(oldMiddle, newMiddle, path, start, diffs, runtime);
    return;
  }

  const matchedOldIndices = new Set<number>();
  const matchedNewIndices = new Set<number>();
  const matchByNewIndex = new Map<number, number>();

  matches.forEach(([oldIndex, newIndex]) => {
    matchedOldIndices.add(oldIndex);
    matchedNewIndices.add(newIndex);
    matchByNewIndex.set(newIndex, oldIndex);
  });

  const unmatchedOldIndices = collectUnmatchedIndices(oldMiddle.length, matchedOldIndices);
  const unmatchedNewIndices = collectUnmatchedIndices(newMiddle.length, matchedNewIndices);

  let oldCursor = 0;
  let newCursor = 0;
  while (oldCursor < unmatchedOldIndices.length && newCursor < unmatchedNewIndices.length) {
    const oldIndex = unmatchedOldIndices[oldCursor];
    const newIndex = unmatchedNewIndices[newCursor];
    compare(oldMiddle[oldIndex], newMiddle[newIndex], joinDiffPath(path, start + newIndex), diffs, runtime);
    oldCursor++;
    newCursor++;
  }

  while (oldCursor < unmatchedOldIndices.length) {
    diffs.push({ path: joinDiffPath(path, start + unmatchedOldIndices[oldCursor])!, type: 'deleted' });
    oldCursor++;
  }

  while (newCursor < unmatchedNewIndices.length) {
    diffs.push({ path: joinDiffPath(path, start + unmatchedNewIndices[newCursor])!, type: 'added' });
    newCursor++;
  }

  for (let newIndex = 0; newIndex < newMiddle.length; newIndex++) {
    const oldIndex = matchByNewIndex.get(newIndex);
    if (oldIndex === undefined) continue;
    compare(oldMiddle[oldIndex], newMiddle[newIndex], joinDiffPath(path, start + newIndex), diffs, runtime);
  }
}

function diffArrayByIndex(
  oldArr: unknown[],
  newArr: unknown[],
  path: string | null,
  startIndex: number,
  diffs: DiffFieldPathObject[],
  runtime: DiffRuntime
): void {
  const minEnd = Math.min(oldArr.length, newArr.length);
  for (let i = 0; i < minEnd; i++) {
    compare(oldArr[i], newArr[i], joinDiffPath(path, startIndex + i), diffs, runtime);
  }

  if (newArr.length > oldArr.length) {
    for (let i = oldArr.length; i < newArr.length; i++) {
      diffs.push({ path: joinDiffPath(path, startIndex + i)!, type: 'added' });
    }
  } else if (oldArr.length > newArr.length) {
    for (let i = newArr.length; i < oldArr.length; i++) {
      diffs.push({ path: joinDiffPath(path, startIndex + i)!, type: 'deleted' });
    }
  }
}

function collectUnmatchedIndices(length: number, matched: Set<number>): number[] {
  const indices: number[] = [];
  for (let i = 0; i < length; i++) {
    if (!matched.has(i)) {
      indices.push(i);
    }
  }
  return indices;
}

function getArrayMatches(
  oldArr: unknown[],
  newArr: unknown[],
  path: string | null,
  runtime: DiffRuntime
): Array<readonly [number, number]> {
  const { arrayMatching } = runtime.options;
  if (arrayMatching.mode === 'index') {
    return [];
  }

  const wildcardArrayPath = toWildcardArrayPath(path);
  const explicitRule = arrayMatching.identityByPath[wildcardArrayPath];

  if (explicitRule) {
    const explicitMatches = getUniqueMatchesByResolver(oldArr, newArr, explicitRule, path, wildcardArrayPath);
    if (explicitMatches.length > 0) {
      return explicitMatches;
    }
  }

  if (arrayMatching.getIdentity) {
    const globalMatches = getUniqueMatchesByResolver(oldArr, newArr, arrayMatching.getIdentity, path, wildcardArrayPath);
    if (globalMatches.length > 0) {
      return globalMatches;
    }
  }

  const builtInMatches = getUniqueMatchesByBuiltInKeys(oldArr, newArr, path, wildcardArrayPath, runtime);
  if (builtInMatches.length > 0) {
    return builtInMatches;
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

function toWildcardArrayPath(path: string | null): string {
  if (!path) {
    return '[]';
  }

  return `${path.replace(/\[\d+\]/g, '[]')}[]`;
}

function getUniqueMatchesByBuiltInKeys(
  oldArr: unknown[],
  newArr: unknown[],
  path: string | null,
  wildcardArrayPath: string,
  runtime: DiffRuntime
): Array<readonly [number, number]> {
  for (const key of runtime.options.arrayMatching.builtInIdentityKeys) {
    const matches = getUniqueMatchesByResolver(oldArr, newArr, key, path, wildcardArrayPath);
    if (matches.length > 0) {
      return matches;
    }
  }

  return [];
}

function getUniqueMatchesByResolver(
  oldArr: unknown[],
  newArr: unknown[],
  resolver: ComputeDiffArrayIdentityResolver,
  path: string | null,
  wildcardArrayPath: string
): Array<readonly [number, number]> {
  const oldMap = new Map<string, number[]>();
  const newMap = new Map<string, number[]>();

  for (let index = 0; index < oldArr.length; index++) {
    const key = resolveIdentityKey(oldArr[index], resolver, {
      arrayPath: path,
      wildcardArrayPath,
      side: 'old',
      index,
    });
    if (!key) continue;
    const existing = oldMap.get(key);
    if (existing) {
      existing.push(index);
    } else {
      oldMap.set(key, [index]);
    }
  }

  for (let index = 0; index < newArr.length; index++) {
    const key = resolveIdentityKey(newArr[index], resolver, {
      arrayPath: path,
      wildcardArrayPath,
      side: 'new',
      index,
    });
    if (!key) continue;
    const existing = newMap.get(key);
    if (existing) {
      existing.push(index);
    } else {
      newMap.set(key, [index]);
    }
  }

  return collectUniqueMatches(oldMap, newMap);
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

function collectUniqueMatches(
  oldMap: Map<string, number[]>,
  newMap: Map<string, number[]>
): Array<readonly [number, number]> {
  const matches: Array<readonly [number, number]> = [];

  for (const [key, oldIndices] of oldMap.entries()) {
    const newIndices = newMap.get(key);
    if (!newIndices || oldIndices.length !== 1 || newIndices.length !== 1) {
      continue;
    }
    matches.push([oldIndices[0], newIndices[0]]);
  }

  return matches;
}

function shouldAutoFingerprint(oldArr: unknown[], newArr: unknown[], runtime: DiffRuntime): boolean {
  const { maxAutoSegmentSize } = runtime.options.arrayMatching.fingerprint;

  if (oldArr.length > maxAutoSegmentSize || newArr.length > maxAutoSegmentSize) {
    return false;
  }

  return oldArr.every(isAutoFingerprintCandidate) && newArr.every(isAutoFingerprintCandidate);
}

function isAutoFingerprintCandidate(value: unknown): boolean {
  return isPlainObject(value) || Array.isArray(value) || value instanceof Date;
}

function getUniqueMatchesByFingerprint(
  oldArr: unknown[],
  newArr: unknown[],
  runtime: DiffRuntime
): Array<readonly [number, number]> {
  const oldMap = new Map<string, number[]>();
  const newMap = new Map<string, number[]>();

  for (let index = 0; index < oldArr.length; index++) {
    const fingerprint = fingerprintValue(oldArr[index], runtime);
    if (!fingerprint) {
      return [];
    }
    const existing = oldMap.get(fingerprint);
    if (existing) {
      existing.push(index);
    } else {
      oldMap.set(fingerprint, [index]);
    }
  }

  for (let index = 0; index < newArr.length; index++) {
    const fingerprint = fingerprintValue(newArr[index], runtime);
    if (!fingerprint) {
      return [];
    }
    const existing = newMap.get(fingerprint);
    if (existing) {
      existing.push(index);
    } else {
      newMap.set(fingerprint, [index]);
    }
  }

  return collectUniqueMatches(oldMap, newMap);
}

function fingerprintValue(value: unknown, runtime: DiffRuntime): string | null {
  const state = {
    entries: 0,
    maxEntries: runtime.options.arrayMatching.fingerprint.maxFingerprintEntries,
    ancestors: new Set<object>(),
  };

  return serializeFingerprint(value, state, runtime);
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
        const serialized = serializeFingerprint(item, state, runtime);
        if (serialized === null) return null;
        parts.push(serialized);
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
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const serialized = serializeFingerprint(record[key], state, runtime);
      if (serialized === null) {
        runtime.fingerprintCache.set(value, null);
        return null;
      }
      parts.push(`key:${key}$$$${serialized}`);
    }
    const result = `obj{${parts.join('$$$')}}`;
    runtime.fingerprintCache.set(value, result);
    return result;
  } finally {
    state.ancestors.delete(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value instanceof Date) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

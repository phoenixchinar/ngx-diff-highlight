import { DiffFieldPathObject } from '../models/diff-highlight.models';
import { joinDiffPath } from './path-utils';

const ARRAY_IDENTITY_KEYS = ['id', 'key', 'uuid', '_id'] as const;

/**
 * Computes the difference between two objects and returns an array of path objects
 * compatible with the DiffHighlightService.
 */
export function computeDiff(oldObj: unknown, newObj: unknown): DiffFieldPathObject[] {
  const diffs: DiffFieldPathObject[] = [];
  compare(oldObj, newObj, null, diffs);
  return diffs;
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

function compare(oldVal: unknown, newVal: unknown, path: string | null, diffs: DiffFieldPathObject[]): void {
  if (oldVal === newVal) return;

  if (oldVal == null || newVal == null || typeof oldVal !== typeof newVal || Array.isArray(oldVal) !== Array.isArray(newVal)) {
    if (path) diffs.push({ path, type: 'changed' });
    return;
  }

  if (Array.isArray(newVal) && Array.isArray(oldVal)) {
    compareArrays(oldVal, newVal, path, diffs);
  } else if (typeof newVal === 'object' && newVal !== null && oldVal !== null) {
    compareObjects(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, path, diffs);
  } else {
    if (path) diffs.push({ path, type: 'changed' });
  }
}

function compareObjects(oldObj: Record<string, unknown>, newObj: Record<string, unknown>, path: string | null, diffs: DiffFieldPathObject[]): void {
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
      compare(oldObj[key], newObj[key], currentPath, diffs);
    }
  });
}

function getArrayElementIdentity(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value !== 'object') {
    return `${typeof value}:${String(value)}`;
  }

  if (Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ARRAY_IDENTITY_KEYS) {
    const candidate = record[key];
    if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
      return `${key}:${String(candidate)}`;
    }
  }

  return null;
}

function getUniqueIdentityMatches(oldArr: unknown[], newArr: unknown[]): Array<readonly [number, number]> {
  const oldMap = new Map<string, number[]>();
  const newMap = new Map<string, number[]>();

  oldArr.forEach((item, index) => {
    const identity = getArrayElementIdentity(item);
    if (!identity) return;
    oldMap.set(identity, [...(oldMap.get(identity) ?? []), index]);
  });

  newArr.forEach((item, index) => {
    const identity = getArrayElementIdentity(item);
    if (!identity) return;
    newMap.set(identity, [...(newMap.get(identity) ?? []), index]);
  });

  const matches: Array<readonly [number, number]> = [];
  for (const [identity, oldIndices] of oldMap.entries()) {
    const newIndices = newMap.get(identity);
    if (!newIndices || oldIndices.length !== 1 || newIndices.length !== 1) {
      continue;
    }
    matches.push([oldIndices[0], newIndices[0]]);
  }

  return matches;
}

/**
 * Stable array diffing.
 * Tries to identify if elements were added or removed in the middle.
 * When array elements expose a stable identity such as `id` or `uuid`,
 * moved items are matched semantically before falling back to index-based comparison.
 */
function compareArrays(oldArr: unknown[], newArr: unknown[], path: string | null, diffs: DiffFieldPathObject[]): void {
  // Find the first index where they differ
  let start = 0;
  while (start < oldArr.length && start < newArr.length && isDeepEqual(oldArr[start], newArr[start])) {
    start++;
  }

  // Find the last index where they differ from the end
  let oldEnd = oldArr.length - 1;
  let newEnd = newArr.length - 1;
  while (oldEnd >= start && newEnd >= start && isDeepEqual(oldArr[oldEnd], newArr[newEnd])) {
    oldEnd--;
    newEnd--;
  }

  // The range [start, oldEnd] in oldArr and [start, newEnd] in newArr contains the differences.
  
  // If old range is empty, everything in new range is added
  if (start > oldEnd) {
    for (let i = start; i <= newEnd; i++) {
      diffs.push({ path: joinDiffPath(path, i)!, type: 'added' });
    }
  } 
  // If new range is empty, everything in old range is deleted
  else if (start > newEnd) {
    for (let i = start; i <= oldEnd; i++) {
      diffs.push({ path: joinDiffPath(path, i)!, type: 'deleted' });
    }
  }
  // Otherwise, fallback to index-based comparison for the middle section
  else {
    const oldMiddle = oldArr.slice(start, oldEnd + 1);
    const newMiddle = newArr.slice(start, newEnd + 1);
    const semanticMatches = getUniqueIdentityMatches(oldMiddle, newMiddle);

    if (semanticMatches.length === 0) {
      const minEnd = Math.min(oldEnd, newEnd);
      for (let i = start; i <= minEnd; i++) {
        compare(oldArr[i], newArr[i], joinDiffPath(path, i), diffs);
      }
      if (newEnd > oldEnd) {
        for (let i = oldEnd + 1; i <= newEnd; i++) {
          diffs.push({ path: joinDiffPath(path, i)!, type: 'added' });
        }
      } else if (oldEnd > newEnd) {
        for (let i = newEnd + 1; i <= oldEnd; i++) {
          diffs.push({ path: joinDiffPath(path, i)!, type: 'deleted' });
        }
      }
      return;
    }

    const matchedOldIndices = new Set<number>();
    const matchedNewIndices = new Set<number>();
    const matchByNewIndex = new Map<number, number>();

    semanticMatches.forEach(([oldIndex, newIndex]) => {
      matchedOldIndices.add(oldIndex);
      matchedNewIndices.add(newIndex);
      matchByNewIndex.set(newIndex, oldIndex);
    });

    const unmatchedOldIndices = oldMiddle
      .map((_, index) => index)
      .filter((index) => !matchedOldIndices.has(index));
    const unmatchedNewIndices = newMiddle
      .map((_, index) => index)
      .filter((index) => !matchedNewIndices.has(index));

    let oldCursor = 0;
    let newCursor = 0;

    while (newCursor < unmatchedNewIndices.length && oldCursor < unmatchedOldIndices.length) {
      const oldIndex = unmatchedOldIndices[oldCursor];
      const newIndex = unmatchedNewIndices[newCursor];
      compare(
        oldMiddle[oldIndex],
        newMiddle[newIndex],
        joinDiffPath(path, start + newIndex),
        diffs
      );
      matchedOldIndices.add(oldIndex);
      matchedNewIndices.add(newIndex);
      oldCursor++;
      newCursor++;
    }

    while (oldCursor < unmatchedOldIndices.length) {
      const oldIndex = unmatchedOldIndices[oldCursor];
      diffs.push({ path: joinDiffPath(path, start + oldIndex)!, type: 'deleted' });
      oldCursor++;
    }

    while (newCursor < unmatchedNewIndices.length) {
      const newIndex = unmatchedNewIndices[newCursor];
      diffs.push({ path: joinDiffPath(path, start + newIndex)!, type: 'added' });
      newCursor++;
    }

    for (let newIndex = 0; newIndex < newMiddle.length; newIndex++) {
      const oldIndex = matchByNewIndex.get(newIndex);
      if (oldIndex === undefined) {
        continue;
      }
      compare(
        oldMiddle[oldIndex],
        newMiddle[newIndex],
        joinDiffPath(path, start + newIndex),
        diffs
      );
    }
  }
}

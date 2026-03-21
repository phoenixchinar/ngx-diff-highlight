import { DiffFieldPathObject } from '../models/diff-highlight.models';
import { joinDiffPath } from './path-utils';

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

/**
 * Stable array diffing.
 * Tries to identify if elements were added or removed in the middle.
 */
function compareArrays(oldArr: unknown[], newArr: unknown[], path: string | null, diffs: DiffFieldPathObject[]): void {
  // Simple heuristic: if lengths match, just compare elements
  if (oldArr.length === newArr.length) {
    for (let i = 0; i < oldArr.length; i++) {
      compare(oldArr[i], newArr[i], joinDiffPath(path, i), diffs);
    }
    return;
  }

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
  }
}

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DiffHighlightInput, DiffFieldPathObject } from '../models/diff-highlight.models';
import { normalizeDiffPath } from '../utils/path-utils';

/**
 * Service to manage highlighted fields.
 * Scoped to a specific component or context.
 */
@Injectable()
export class DiffHighlightService implements OnDestroy {
  private readonly _fields$ = new BehaviorSubject<DiffFieldPathObject[]>([]);
  public readonly fields$ = this._fields$.asObservable();

  /**
   * Optional CSS prefix for this scope.
   */
  public cssPrefix: string | null | undefined = '';

  /**
   * Replaces current highlighted fields with a new set.
   * Normalizes each path and filters out empty results.
   */
  setFields(fields: DiffHighlightInput[] | null | undefined): void {
    const normalized = (fields ?? [])
      .map((f) => {
        const path = typeof f === 'string' ? f : f.path;
        const type = typeof f === 'string' ? 'none' : f.type || 'none';
        const normPath = normalizeDiffPath(path);
        return normPath ? { path: normPath, type } : null;
      })
      .filter((f) => f !== null) as DiffFieldPathObject[];

    // Ensure uniqueness by path
    const uniqueMap = new Map<string, DiffFieldPathObject>();
    normalized.forEach(item => {
      if (item) {
        uniqueMap.set(item.path, item);
      }
    });
    
    this._fields$.next(Array.from(uniqueMap.values()));
  }

  /**
   * Resets the highlighted fields to an empty array.
   */
  clear(): void {
    this._fields$.next([]);
  }

  /**
   * Adds a single field to the highlighted set if not already present.
   * Path is normalized before addition.
   */
  addField(field: DiffHighlightInput | null | undefined): void {
    if (!field) return;

    const path = typeof field === 'string' ? field : field.path;
    const type = typeof field === 'string' ? 'none' : field.type || 'none';
    const normPath = normalizeDiffPath(path);

    if (!normPath) return;

    const current = this._fields$.value;
    if (!current.some(f => f.path === normPath)) {
      this._fields$.next([...current, { path: normPath, type }]);
    }
  }

  /**
   * Removes a single field from the highlighted set if present.
   * Path is normalized before removal.
   */
  removeField(path: string | null | undefined): void {
    const normalized = normalizeDiffPath(path);
    if (!normalized) return;

    const current = this._fields$.value;
    const filtered = current.filter((f) => f.path !== normalized);
    if (filtered.length !== current.length) {
      this._fields$.next(filtered);
    }
  }

  ngOnDestroy(): void {
    this._fields$.complete();
  }
}

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { normalizeDiffPath } from '../utils/path-utils';

/**
 * Service to manage highlighted fields.
 * Scoped to a specific component or context.
 */
@Injectable()
export class DiffHighlightService implements OnDestroy {
  private readonly _fields$ = new BehaviorSubject<string[]>([]);
  public readonly fields$ = this._fields$.asObservable();

  /**
   * Replaces current highlighted fields with a new set.
   * Normalizes each path and filters out empty results.
   */
  setFields(fields: string[] | null | undefined): void {
    const normalized = (fields ?? [])
      .map((f) => normalizeDiffPath(f))
      .filter((f): f is string => !!f);

    // Using a Set to ensure uniqueness after normalization
    const unique = [...new Set(normalized)];
    this._fields$.next(unique);
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
  addField(path: string | null | undefined): void {
    const normalized = normalizeDiffPath(path);
    if (!normalized) return;

    const current = this._fields$.value;
    if (!current.includes(normalized)) {
      this._fields$.next([...current, normalized]);
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
    const filtered = current.filter((f) => f !== normalized);
    if (filtered.length !== current.length) {
      this._fields$.next(filtered);
    }
  }

  ngOnDestroy(): void {
    this._fields$.complete();
  }
}

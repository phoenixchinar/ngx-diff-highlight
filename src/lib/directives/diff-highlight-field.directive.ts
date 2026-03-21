import {
  Directive,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DiffHighlightService } from '../services/diff-highlight.service';
import { DIFF_HIGHLIGHT_PATH_CONTEXT, DIFF_HIGHLIGHT_CONFIG } from '../tokens/diff-highlight.tokens';
import { pathsMatch, normalizeDiffPath } from '../utils/path-utils';
import { DiffType, DiffHighlightMatchEvent } from '../models/diff-highlight.models';

@Directive({
  selector: '[diffHighlightField], [appHighlightField]',
  standalone: true,
})
export class DiffHighlightFieldDirective implements OnInit, OnDestroy {
  /**
   * Explicit path to match. If provided, takes precedence over other sources.
   */
  @Input('diffHighlightField') fieldPath: string | null = null;

  /**
   * Alias for diffHighlightField input.
   */
  @Input('appHighlightField') set appFieldPath(val: string | null) {
    this.fieldPath = val;
  }

  /**
   * Emits whenever the highlighted fields list updates.
   */
  @Output() fieldInDiff = new EventEmitter<boolean>();

  /**
   * Emits detailed match information including diff type.
   */
  @Output() highlightMatch = new EventEmitter<DiffHighlightMatchEvent>();

  private readonly destroy$ = new Subject<void>();

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private config = inject(DIFF_HIGHLIGHT_CONFIG);
  private service = inject(DiffHighlightService, { optional: true });
  private pathContext = inject(DIFF_HIGHLIGHT_PATH_CONTEXT, { optional: true });
  private ngControl = inject(NgControl, { optional: true });

  private lastAppliedClasses: string[] = [];

  ngOnInit(): void {
    if (!this.service) {
      return;
    }

    this.service.fields$.pipe(takeUntil(this.destroy$)).subscribe((fields) => {
      const path = this.resolvePath();
      if (!path) {
        this.updateState(false, 'none', null);
        return;
      }

      const matcher = this.config.pathMatcher || pathsMatch;
      const matchingField = fields.find((f) => matcher(path, f.path));

      if (matchingField) {
        this.updateState(true, matchingField.type || 'none', path);
      } else {
        this.updateState(false, 'none', path);
      }
    });
  }

  /**
   * Resolves the canonical path based on precedence rules.
   */
  private resolvePath(): string | null {
    // 1. Explicit input
    if (this.fieldPath !== null && this.fieldPath !== '') {
      return normalizeDiffPath(this.fieldPath);
    }

    // 2. Element id
    const id = this.el.nativeElement.id;
    if (id) {
      return normalizeDiffPath(id);
    }

    // 3. NgControl.path
    if (this.ngControl && this.ngControl.path) {
      return normalizeDiffPath(this.ngControl.path.join('.'));
    }

    // 4. Inherited DIFF_HIGHLIGHT_PATH_CONTEXT.getPath()
    if (this.pathContext) {
      return this.pathContext.getPath();
    }

    return null;
  }

  /**
   * Toggles highlight classes and emits match status.
   */
  private updateState(isMatch: boolean, type: DiffType, path: string | null): void {
    // Remove old classes
    this.lastAppliedClasses.forEach(cls => this.renderer.removeClass(this.el.nativeElement, cls));
    this.lastAppliedClasses = [];

    if (isMatch) {
      const highlightClass = this.config.highlightClass || 'highlight-diff';
      const secondaryClass = this.config.secondaryClass || 'draggable-field';
      const cssPrefix = this.service?.cssPrefix;
      const prefix = cssPrefix ? `${cssPrefix}-` : '';

      const classesToAdd = [
        highlightClass,
        secondaryClass,
        `${prefix}${highlightClass}`,
        `${prefix}${type}`
      ].filter(cls => !!cls && cls !== '-');

      classesToAdd.forEach(cls => {
        this.renderer.addClass(this.el.nativeElement, cls);
        this.lastAppliedClasses.push(cls);
      });
    }

    this.fieldInDiff.emit(isMatch);
    this.highlightMatch.emit({ path, highlighted: isMatch, type });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

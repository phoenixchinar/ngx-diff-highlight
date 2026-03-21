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
   * Value is true if the resolved path is considered "in the diff".
   */
  @Output() fieldInDiff = new EventEmitter<boolean>();

  private readonly destroy$ = new Subject<void>();

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private config = inject(DIFF_HIGHLIGHT_CONFIG);
  private service = inject(DiffHighlightService, { optional: true });
  private pathContext = inject(DIFF_HIGHLIGHT_PATH_CONTEXT, { optional: true });
  private ngControl = inject(NgControl, { optional: true });

  ngOnInit(): void {
    if (!this.service) {
      return;
    }

    this.service.fields$.pipe(takeUntil(this.destroy$)).subscribe((fields) => {
      const path = this.resolvePath();
      if (!path) {
        this.updateState(false);
        return;
      }

      const matcher = this.config.pathMatcher || pathsMatch;
      const isMatch = fields.some((f) => matcher(path, f));

      this.updateState(isMatch);
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
  private updateState(isMatch: boolean): void {
    const highlightClass = this.config.highlightClass || 'highlight-diff';
    const secondaryClass = this.config.secondaryClass || 'draggable-field';

    if (isMatch) {
      this.renderer.addClass(this.el.nativeElement, highlightClass);
      this.renderer.addClass(this.el.nativeElement, secondaryClass);
    } else {
      this.renderer.removeClass(this.el.nativeElement, highlightClass);
      this.renderer.removeClass(this.el.nativeElement, secondaryClass);
    }

    this.fieldInDiff.emit(isMatch);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

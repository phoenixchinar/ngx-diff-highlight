import { Component, Directive, Input, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { DiffHighlightService } from '../services/diff-highlight.service';
import { DiffHighlightInput } from '../models/diff-highlight.models';

/**
 * Component to provide a new DiffHighlightService instance to its children.
 */
@Component({
  selector: 'diff-highlight-scope, app-highlight-fields',
  standalone: true,
  providers: [DiffHighlightService],
  template: '<ng-content />',
})
export class DiffHighlightScopeComponent implements OnChanges {
  private readonly service = inject(DiffHighlightService);

  /**
   * Fields to highlight within this scope.
   */
  @Input() fields: DiffHighlightInput[] | null | undefined;

  /**
   * Optional CSS prefix to apply to highlight classes (e.g. 'left', 'right').
   */
  @Input() cssPrefix: string | null | undefined;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cssPrefix']) {
      this.service.cssPrefix = this.cssPrefix;
    }
    if (changes['fields'] || changes['cssPrefix']) {
      // Defer to next microtask to avoid ExpressionChangedAfterItHasBeenCheckedError
      Promise.resolve().then(() => {
        this.service.setFields(this.fields);
        this.cdr.markForCheck();
      });
    }
  }
}

/**
 * Directive to provide a new DiffHighlightService instance to its children.
 */
@Directive({
  selector: '[diffHighlightScope]',
  standalone: true,
  providers: [DiffHighlightService],
})
export class DiffHighlightScopeDirective implements OnChanges {
  private readonly service = inject(DiffHighlightService);

  /**
   * Fields to highlight within this scope.
   */
  @Input('diffHighlightScope') fields: DiffHighlightInput[] | null | undefined;

  /**
   * Optional CSS prefix to apply to highlight classes.
   */
  @Input() cssPrefix: string | null | undefined;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cssPrefix']) {
      this.service.cssPrefix = this.cssPrefix;
    }
    if (changes['fields'] || changes['cssPrefix']) {
      // Defer to next microtask to avoid ExpressionChangedAfterItHasBeenCheckedError
      Promise.resolve().then(() => {
        this.service.setFields(this.fields);
        this.cdr.markForCheck();
      });
    }
  }
}

import { Component, Directive, Input, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { DiffHighlightService } from '../services/diff-highlight.service';

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
  @Input() fields: string[] | null | undefined;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
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
  @Input('diffHighlightScope') fields: string[] | null | undefined;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      // Defer to next microtask to avoid ExpressionChangedAfterItHasBeenCheckedError
      Promise.resolve().then(() => {
        this.service.setFields(this.fields);
        this.cdr.markForCheck();
      });
    }
  }
}

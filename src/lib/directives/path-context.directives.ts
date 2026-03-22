import { Directive, Input, forwardRef, inject } from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { DIFF_HIGHLIGHT_PATH_CONTEXT } from '../tokens/diff-highlight.tokens';
import { DiffHighlightPathContext, DiffFieldPath } from '../models/diff-highlight.models';
import { joinDiffPath } from '../utils/path-utils';

/**
 * Abstract base class for directives that provide path context.
 * Handles parent path composition.
 */
@Directive()
export abstract class DiffHighlightPathDirective implements DiffHighlightPathContext {
  protected parentContext = inject(DIFF_HIGHLIGHT_PATH_CONTEXT, {
    optional: true,
    skipSelf: true,
  }) as DiffHighlightPathContext | null;

  abstract get segment(): string | number | null;

  getPath(): DiffFieldPath | null {
    const parentPath = this.parentContext ? this.parentContext.getPath() : null;
    return joinDiffPath(parentPath, this.segment);
  }
}

/**
 * Directive for grouping fields, e.g., in a nested object.
 */
@Directive({
  selector: '[diffHighlightGroup], [appHighlightFieldGroup]',
  providers: [
    {
      provide: DIFF_HIGHLIGHT_PATH_CONTEXT,
      useExisting: forwardRef(() => DiffHighlightGroupDirective),
    },
  ],
  standalone: true,
})
export class DiffHighlightGroupDirective extends DiffHighlightPathDirective {
  @Input('diffHighlightGroup') groupName: string | null = null;
  @Input('appHighlightFieldGroup') set appGroupName(val: string | null) {
    this.groupName = val;
  }

  private controlContainer = inject(ControlContainer, { optional: true });

  get segment(): string | number | null {
    if (this.groupName !== null && this.groupName !== '') {
      return this.groupName;
    }
    if (this.controlContainer) {
      const controlName = this.controlContainer.name;
      if (controlName !== null && controlName !== undefined && controlName !== '') {
        return controlName;
      }
      return this.controlContainer.path ? this.controlContainer.path.join('.') : null;
    }
    return null;
  }
}

/**
 * Directive for array elements.
 */
@Directive({
  selector: '[diffHighlightArray], [appHighlightFieldArray]',
  providers: [
    {
      provide: DIFF_HIGHLIGHT_PATH_CONTEXT,
      useExisting: forwardRef(() => DiffHighlightArrayDirective),
    },
  ],
  standalone: true,
})
export class DiffHighlightArrayDirective extends DiffHighlightPathDirective {
  @Input('diffHighlightArray') arraySegment: string | number | null = null;
  @Input('appHighlightFieldArray') set appArraySegment(val: string | number | null) {
    this.arraySegment = val;
  }

  get segment(): string | number | null {
    return this.arraySegment;
  }
}

/**
 * Directive for individual field names.
 */
@Directive({
  selector: '[diffHighlightName], [appHighlightFieldName]',
  providers: [
    {
      provide: DIFF_HIGHLIGHT_PATH_CONTEXT,
      useExisting: forwardRef(() => DiffHighlightNameDirective),
    },
  ],
  standalone: true,
})
export class DiffHighlightNameDirective extends DiffHighlightPathDirective {
  @Input('diffHighlightName') name: string | number | null = null;
  @Input('appHighlightFieldName') set appName(val: string | number | null) {
    this.name = val;
  }

  get segment(): string | number | null {
    return this.name;
  }
}

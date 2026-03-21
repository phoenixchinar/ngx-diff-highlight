import { NgModule } from '@angular/core';
import { DiffHighlightScopeComponent, DiffHighlightScopeDirective } from './components/diff-highlight-scope.component';
import { DiffHighlightFieldDirective } from './directives/diff-highlight-field.directive';
import {
  DiffHighlightGroupDirective,
  DiffHighlightArrayDirective,
  DiffHighlightNameDirective,
} from './directives/path-context.directives';

const COMPONENTS = [DiffHighlightScopeComponent];
const DIRECTIVES = [
  DiffHighlightScopeDirective,
  DiffHighlightFieldDirective,
  DiffHighlightGroupDirective,
  DiffHighlightArrayDirective,
  DiffHighlightNameDirective,
];

@NgModule({
  imports: [...COMPONENTS, ...DIRECTIVES],
  exports: [...COMPONENTS, ...DIRECTIVES],
})
export class DiffHighlightModule {}

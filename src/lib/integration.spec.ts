import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormGroup, FormArray, FormControl } from '@angular/forms';
import { describe, it, expect, beforeEach } from 'vitest';
import { DiffHighlightModule } from './diff-highlight.module';
import { provideDiffHighlightConfig } from './providers';

// Scenario 1: Nested FormArray
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DiffHighlightModule],
  template: `
    <div [diffHighlightScope]="diffFields">
      <form [formGroup]="form">
        <div diffHighlightGroup="items" formArrayName="items">
          @for (item of items.controls; track i; let i = $index) {
            <div [formGroupName]="i" [diffHighlightArray]="i">
              <input formControlName="name" diffHighlightName="name" diffHighlightField>
            </div>
          }
        </div>
      </form>
    </div>
  `
})
class FormArrayTestComponent {
  diffFields: string[] = [];
  form = new FormGroup({
    items: new FormArray([
      new FormGroup({ name: new FormControl('item 0') }),
      new FormGroup({ name: new FormControl('item 1') })
    ])
  });
  get items() { return this.form.get('items') as FormArray; }
}

// Scenario 2: Scope isolation
@Component({
  standalone: true,
  imports: [DiffHighlightModule],
  template: `
    <diff-highlight-scope [fields]="scopeAFields">
      <div id="fieldA" diffHighlightField="fieldA"></div>
    </diff-highlight-scope>
    <diff-highlight-scope [fields]="scopeBFields">
      <div id="fieldB" diffHighlightField="fieldB"></div>
    </diff-highlight-scope>
  `
})
class ScopeIsolationTestComponent {
  scopeAFields: string[] = [];
  scopeBFields: string[] = [];
}

// Scenario 3: Nested Scope
@Component({
  standalone: true,
  imports: [DiffHighlightModule],
  template: `
    <diff-highlight-scope [fields]="parentFields">
      <div id="parentField" diffHighlightField="sharedField"></div>
      <diff-highlight-scope [fields]="childFields">
        <div id="childField" diffHighlightField="sharedField"></div>
      </diff-highlight-scope>
    </diff-highlight-scope>
  `
})
class NestedScopeTestComponent {
  parentFields: string[] = ['sharedField'];
  childFields: string[] = [];
}

// Scenario 4: Compatibility selectors
@Component({
  standalone: true,
  imports: [DiffHighlightModule],
  template: `
    <app-highlight-fields [fields]="fields">
      <div appHighlightFieldGroup="user">
        <div appHighlightFieldArray="0">
          <div appHighlightFieldName="email">
            <input appHighlightField>
          </div>
        </div>
      </div>
    </app-highlight-fields>
  `
})
class CompatibilityTestComponent {
  fields: string[] = [];
}

describe('DiffHighlight Integration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideDiffHighlightConfig({
          highlightClass: 'diff-highlight'
        })
      ]
    }).compileComponents();
  });

  describe('Nested FormArray scenario', () => {
    it('should highlight fields correctly when parent paths are in diff', async () => {
      const fixture = TestBed.createComponent(FormArrayTestComponent);
      const component = fixture.componentInstance;
      component.diffFields = [];
      fixture.detectChanges();
      await fixture.whenStable();

      const inputs = fixture.nativeElement.querySelectorAll('input');
      const input0 = inputs[0];
      const input1 = inputs[1];

      // Initially no highlight
      expect(input0.classList.contains('diff-highlight')).toBe(false);

      // 1. Exact match: items[0].name
      component.diffFields = ['items[0].name'];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(input0.classList.contains('diff-highlight')).toBe(true);
      expect(input1.classList.contains('diff-highlight')).toBe(false);

      // 2. Parent match: items[0]
      component.diffFields = ['items[0]'];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(input0.classList.contains('diff-highlight')).toBe(true);
      expect(input1.classList.contains('diff-highlight')).toBe(false);

      // 3. Root match: items
      component.diffFields = ['items'];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(input0.classList.contains('diff-highlight')).toBe(true);
      expect(input1.classList.contains('diff-highlight')).toBe(true);
    });
  });

  describe('Scope isolation scenario', () => {
    it('should isolate fields between sibling scopes', async () => {
      const fixture = TestBed.createComponent(ScopeIsolationTestComponent);
      const component = fixture.componentInstance;
      component.scopeAFields = [];
      component.scopeBFields = [];
      fixture.detectChanges();
      await fixture.whenStable();

      const fieldA = fixture.nativeElement.querySelector('#fieldA');
      const fieldB = fixture.nativeElement.querySelector('#fieldB');

      component.scopeAFields = ['fieldA'];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fieldA.classList.contains('diff-highlight')).toBe(true);
      expect(fieldB.classList.contains('diff-highlight')).toBe(false);

      component.scopeAFields = [];
      component.scopeBFields = ['fieldB'];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fieldA.classList.contains('diff-highlight')).toBe(false);
      expect(fieldB.classList.contains('diff-highlight')).toBe(true);
    });
  });

  describe('Nested Scope scenario', () => {
    it('should allow inner scope to override parent scope', async () => {
      const fixture = TestBed.createComponent(NestedScopeTestComponent);
      const component = fixture.componentInstance;
      component.parentFields = ['sharedField'];
      component.childFields = [];
      fixture.detectChanges();
      await fixture.whenStable();

      const parentField = fixture.nativeElement.querySelector('#parentField');
      const childField = fixture.nativeElement.querySelector('#childField');

      // parentFields = ['sharedField'], childFields = []
      expect(parentField.classList.contains('diff-highlight')).toBe(true);
      expect(childField.classList.contains('diff-highlight')).toBe(false);

      component.childFields = ['sharedField'];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(parentField.classList.contains('diff-highlight')).toBe(true);
      expect(childField.classList.contains('diff-highlight')).toBe(true);
      
      component.parentFields = [];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(parentField.classList.contains('diff-highlight')).toBe(false);
      expect(childField.classList.contains('diff-highlight')).toBe(true);
    });
  });

  describe('Compatibility selectors scenario', () => {
    it('should work with app- prefix selectors', async () => {
      const fixture = TestBed.createComponent(CompatibilityTestComponent);
      const component = fixture.componentInstance;
      component.fields = [];
      fixture.detectChanges();
      await fixture.whenStable();

      const emailInput = fixture.nativeElement.querySelector('input');

      component.fields = ['user[0].email'];
      fixture.detectChanges();
      await fixture.whenStable();
      expect(emailInput.classList.contains('diff-highlight')).toBe(true);
    });
  });
});

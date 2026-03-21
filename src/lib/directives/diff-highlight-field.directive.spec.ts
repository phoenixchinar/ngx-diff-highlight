import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgControl } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { DiffHighlightFieldDirective } from './diff-highlight-field.directive';
import { DiffHighlightService } from '../services/diff-highlight.service';
import { DIFF_HIGHLIGHT_CONFIG, DIFF_HIGHLIGHT_PATH_CONTEXT } from '../tokens/diff-highlight.tokens';
import { DiffHighlightPathContext, DiffFieldPathObject } from '../models/diff-highlight.models';

// Mock Component for basic tests
@Component({
  selector: 'app-test-basic-cmp',
  template: `
    <div id="field1" diffHighlightField (fieldInDiff)="onFieldInDiff($event)"></div>
    <div [diffHighlightField]="'explicit.path'" id="ignore-id"></div>
    <div [appHighlightField]="'app.path'" id="app-path-id"></div>
  `,
  standalone: true,
  imports: [DiffHighlightFieldDirective],
})
class TestComponent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFieldInDiff = (_val: boolean) => {
    // Mock method
  };
}

// Mock for NgControl precedence
@Component({
  selector: 'app-test-ngcontrol-cmp',
  template: `<div diffHighlightField></div>`,
  standalone: true,
  imports: [DiffHighlightFieldDirective],
})
class NgControlTestComponent {}

// Mock for Context precedence
@Component({
  selector: 'app-test-context-cmp',
  template: `<div diffHighlightField></div>`,
  standalone: true,
  imports: [DiffHighlightFieldDirective],
})
class ContextTestComponent {}

describe('DiffHighlightFieldDirective', () => {
  let fields$: BehaviorSubject<DiffFieldPathObject[]>;
  let mockService: { fields$: Observable<DiffFieldPathObject[]>, cssPrefix?: string };

  beforeEach(() => {
    fields$ = new BehaviorSubject<DiffFieldPathObject[]>([]);
    mockService = { 
      fields$: fields$.asObservable(),
      cssPrefix: ''
    };
  });

  it('should use explicit input over ID (Precedence 1 & 2)', async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        { provide: DiffHighlightService, useValue: mockService },
        { provide: DIFF_HIGHLIGHT_CONFIG, useValue: { highlightClass: 'hl', secondaryClass: 'sec' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const explicitEl = fixture.debugElement.query(By.css('#ignore-id')).nativeElement;
    
    fields$.next([{ path: 'explicit.path', type: 'none' }]);
    fixture.detectChanges();
    expect(explicitEl.classList.contains('hl')).toBe(true);

    fields$.next([{ path: 'ignore-id', type: 'none' }]);
    fixture.detectChanges();
    expect(explicitEl.classList.contains('hl')).toBe(false);
  });

  it('should use ID if no input is provided (Precedence 2)', async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        { provide: DiffHighlightService, useValue: mockService },
        { provide: DIFF_HIGHLIGHT_CONFIG, useValue: { highlightClass: 'hl', secondaryClass: 'sec' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const idEl = fixture.debugElement.query(By.css('#field1')).nativeElement;
    
    fields$.next([{ path: 'field1', type: 'none' }]);
    fixture.detectChanges();
    expect(idEl.classList.contains('hl')).toBe(true);
  });

  it('should use NgControl.path if no input/ID (Precedence 3)', async () => {
    const mockNgControl = { path: ['form', 'control'] };

    await TestBed.configureTestingModule({
      imports: [NgControlTestComponent],
      providers: [
        { provide: DiffHighlightService, useValue: mockService },
        { provide: NgControl, useValue: mockNgControl },
        { provide: DIFF_HIGHLIGHT_CONFIG, useValue: { highlightClass: 'hl', secondaryClass: 'sec' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NgControlTestComponent);
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.directive(DiffHighlightFieldDirective)).nativeElement;
    
    fields$.next([{ path: 'form.control', type: 'none' }]);
    fixture.detectChanges();
    expect(el.classList.contains('hl')).toBe(true);
  });

  it('should use DIFF_HIGHLIGHT_PATH_CONTEXT if others missing (Precedence 4)', async () => {
    const mockContext: DiffHighlightPathContext = {
      getPath: () => 'context.path'
    };

    await TestBed.configureTestingModule({
      imports: [ContextTestComponent],
      providers: [
        { provide: DiffHighlightService, useValue: mockService },
        { provide: DIFF_HIGHLIGHT_PATH_CONTEXT, useValue: mockContext },
        { provide: DIFF_HIGHLIGHT_CONFIG, useValue: { highlightClass: 'hl', secondaryClass: 'sec' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContextTestComponent);
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.directive(DiffHighlightFieldDirective)).nativeElement;
    
    fields$.next([{ path: 'context.path', type: 'none' }]);
    fixture.detectChanges();
    expect(el.classList.contains('hl')).toBe(true);
  });

  it('should apply cssPrefix and type classes', async () => {
    mockService.cssPrefix = 'left';

    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        { provide: DiffHighlightService, useValue: mockService },
        { provide: DIFF_HIGHLIGHT_CONFIG, useValue: { highlightClass: 'hl', secondaryClass: 'sec' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.css('#field1')).nativeElement;
    
    fields$.next([{ path: 'field1', type: 'added' }]);
    fixture.detectChanges();
    
    expect(el.classList.contains('hl')).toBe(true);
    expect(el.classList.contains('sec')).toBe(true);
    expect(el.classList.contains('left-hl')).toBe(true);
    expect(el.classList.contains('left-added')).toBe(true);
  });

  it('should be inert if no DiffHighlightService is provided', () => {
    @Component({
      template: `<div id="field1" diffHighlightField></div>`,
      standalone: true,
      imports: [DiffHighlightFieldDirective],
    })
    class NoServiceComponent {}

    const fixture = TestBed.createComponent(NoServiceComponent);
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.css('#field1')).nativeElement;
    expect(el.classList.contains('highlight-diff')).toBe(false);
  });
});

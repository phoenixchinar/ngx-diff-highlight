import { Component, ElementRef, Renderer2, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgControl } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { DiffHighlightFieldDirective } from './diff-highlight-field.directive';
import { DiffHighlightService } from '../services/diff-highlight.service';
import { DIFF_HIGHLIGHT_CONFIG, DIFF_HIGHLIGHT_PATH_CONTEXT } from '../tokens/diff-highlight.tokens';
import { DiffHighlightPathContext } from '../models/diff-highlight.models';

// Mock Component for basic tests
@Component({
  selector: 'test-basic-cmp',
  template: `
    <div id="field1" diffHighlightField (fieldInDiff)="onFieldInDiff($event)"></div>
    <div [diffHighlightField]="'explicit.path'" id="ignore-id"></div>
    <div [appHighlightField]="'app.path'" id="app-path-id"></div>
  `,
  standalone: true,
  imports: [DiffHighlightFieldDirective],
})
class TestComponent {
  onFieldInDiff = (val: boolean) => {};
}

// Mock for NgControl precedence
@Component({
  selector: 'test-ngcontrol-cmp',
  template: `<div diffHighlightField></div>`,
  standalone: true,
  imports: [DiffHighlightFieldDirective],
})
class NgControlTestComponent {}

// Mock for Context precedence
@Component({
  selector: 'test-context-cmp',
  template: `<div diffHighlightField></div>`,
  standalone: true,
  imports: [DiffHighlightFieldDirective],
})
class ContextTestComponent {}

describe('DiffHighlightFieldDirective', () => {
  let fields$: BehaviorSubject<string[]>;
  let mockService: any;

  beforeEach(() => {
    fields$ = new BehaviorSubject<string[]>([]);
    mockService = { fields$: fields$.asObservable() };
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
    
    fields$.next(['explicit.path']);
    fixture.detectChanges();
    expect(explicitEl.classList.contains('hl')).toBe(true);

    fields$.next(['ignore-id']);
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
    
    fields$.next(['field1']);
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
    
    fields$.next(['form.control']);
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
    
    fields$.next(['context.path']);
    fixture.detectChanges();
    expect(el.classList.contains('hl')).toBe(true);
  });

  it('should handle matching scenarios (exact, ancestor, descendant)', async () => {
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
    
    // Exact match
    fields$.next(['explicit.path']);
    fixture.detectChanges();
    expect(explicitEl.classList.contains('hl')).toBe(true);

    // Ancestor match (field is descendant of highlighted)
    fields$.next(['explicit']);
    fixture.detectChanges();
    expect(explicitEl.classList.contains('hl')).toBe(true);

    // Descendant match (field is ancestor of highlighted)
    fields$.next(['explicit.path.child']);
    fixture.detectChanges();
    expect(explicitEl.classList.contains('hl')).toBe(true);

    // No match
    fields$.next(['other.path']);
    fixture.detectChanges();
    expect(explicitEl.classList.contains('hl')).toBe(false);
  });

  it('should emit fieldInDiff and toggle classes correctly', async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        { provide: DiffHighlightService, useValue: mockService },
        { provide: DIFF_HIGHLIGHT_CONFIG, useValue: { highlightClass: 'custom-hl', secondaryClass: 'custom-sec' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComponent);
    const component = fixture.componentInstance;
    const spy = vi.spyOn(component, 'onFieldInDiff');
    fixture.detectChanges();

    const idEl = fixture.debugElement.query(By.css('#field1')).nativeElement;
    
    fields$.next(['field1']);
    fixture.detectChanges();
    expect(idEl.classList.contains('custom-hl')).toBe(true);
    expect(idEl.classList.contains('custom-sec')).toBe(true);
    expect(spy).toHaveBeenCalledWith(true);

    fields$.next([]);
    fixture.detectChanges();
    expect(idEl.classList.contains('custom-hl')).toBe(false);
    expect(idEl.classList.contains('custom-sec')).toBe(false);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should be inert if no service is provided', async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        { provide: DiffHighlightService, useValue: null },
        { provide: DIFF_HIGHLIGHT_CONFIG, useValue: { highlightClass: 'hl', secondaryClass: 'sec' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const idEl = fixture.debugElement.query(By.css('#field1')).nativeElement;
    // Since no service, no subscription, no classes added even if we somehow knew fields
    expect(idEl.classList.contains('hl')).toBe(false);
  });
});

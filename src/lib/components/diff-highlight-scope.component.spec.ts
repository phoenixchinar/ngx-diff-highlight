import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DiffHighlightScopeComponent, DiffHighlightScopeDirective } from './diff-highlight-scope.component';
import { DiffHighlightService } from '../services/diff-highlight.service';

@Component({
  selector: 'app-child-component',
  template: '',
  standalone: true,
})
class ChildComponent {
  service = inject(DiffHighlightService);
}

describe('DiffHighlightScopeComponent', () => {
  let fixture: ComponentFixture<DiffHighlightScopeComponent>;
  let component: DiffHighlightScopeComponent;
  let service: DiffHighlightService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffHighlightScopeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiffHighlightScopeComponent);
    component = fixture.componentInstance;
    service = fixture.debugElement.injector.get(DiffHighlightService);
  });

  it('should provide DiffHighlightService', () => {
    expect(service).toBeTruthy();
  });

  it('should update service fields when input changes', async () => {
    component.fields = ['user.name'];
    component.ngOnChanges({
      fields: {
        currentValue: ['user.name'],
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    await fixture.whenStable();

    let fields: string[] = [];
    const sub = service.fields$.subscribe((f: string[]) => (fields = f));
    expect(fields).toEqual(['user.name']);

    component.fields = ['other.path'];
    component.ngOnChanges({
      fields: {
        currentValue: ['other.path'],
        previousValue: ['user.name'],
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    await fixture.whenStable();
    expect(fields).toEqual(['other.path']);
    sub.unsubscribe();
  });

  it('should handle multiple selectors', async () => {
    @Component({
      template: `
        <diff-highlight-scope [fields]="['a']"></diff-highlight-scope>
        <app-highlight-fields [fields]="['b']"></app-highlight-fields>
      `,
      standalone: true,
      imports: [DiffHighlightScopeComponent],
    })
    class HostComponent {}

    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    const scopes = hostFixture.debugElement.queryAll(By.directive(DiffHighlightScopeComponent));
    expect(scopes.length).toBe(2);

    const serviceA = scopes[0].injector.get(DiffHighlightService);
    const serviceB = scopes[1].injector.get(DiffHighlightService);

    expect(serviceA).not.toBe(serviceB);

    let fieldsA: string[] = [];
    const subA = serviceA.fields$.subscribe((f: string[]) => (fieldsA = f));
    expect(fieldsA).toEqual(['a']);

    let fieldsB: string[] = [];
    const subB = serviceB.fields$.subscribe((f: string[]) => (fieldsB = f));
    expect(fieldsB).toEqual(['b']);
    
    subA.unsubscribe();
    subB.unsubscribe();
  });
});

describe('DiffHighlightScopeDirective', () => {
  @Component({
    template: `
      <div [diffHighlightScope]="fields">
        <app-child-component></app-child-component>
      </div>
    `,
    standalone: true,
    imports: [DiffHighlightScopeDirective, ChildComponent],
  })
  class HostComponent {
    fields: string[] | null | undefined = ['initial'];
  }

  let fixture: ComponentFixture<HostComponent>;
  let component: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
  });

  it('should provide DiffHighlightService to children', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const child = fixture.debugElement.query(By.directive(ChildComponent)).componentInstance as ChildComponent;
    expect(child.service).toBeTruthy();

    let fields: string[] = [];
    const sub = child.service.fields$.subscribe((f: string[]) => (fields = f));
    expect(fields).toEqual(['initial']);
    sub.unsubscribe();
  });

  it('should update service fields when input changes', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const child = fixture.debugElement.query(By.directive(ChildComponent)).componentInstance as ChildComponent;

    component.fields = ['updated'];
    fixture.detectChanges();
    await fixture.whenStable();

    let fields: string[] = [];
    const sub = child.service.fields$.subscribe((f: string[]) => (fields = f));
    expect(fields).toEqual(['updated']);
    sub.unsubscribe();
  });

  it('should isolate nested scopes', async () => {
    @Component({
      template: `
        <div [diffHighlightScope]="['parent']">
          <app-child-component #child1></app-child-component>
          <div [diffHighlightScope]="['child']">
            <app-child-component #child2></app-child-component>
          </div>
        </div>
      `,
      standalone: true,
      imports: [DiffHighlightScopeDirective, ChildComponent],
    })
    class NestedHostComponent {}

    const nestedFixture = TestBed.createComponent(NestedHostComponent);
    nestedFixture.detectChanges();
    await nestedFixture.whenStable();

    const children = nestedFixture.debugElement.queryAll(By.directive(ChildComponent));
    const service1 = children[0].componentInstance.service;
    const service2 = children[1].componentInstance.service;

    expect(service1).not.toBe(service2);

    let fields1: string[] = [];
    const sub1 = service1.fields$.subscribe((f: string[]) => (fields1 = f));
    expect(fields1).toEqual(['parent']);

    let fields2: string[] = [];
    const sub2 = service2.fields$.subscribe((f: string[]) => (fields2 = f));
    expect(fields2).toEqual(['child']);
    
    sub1.unsubscribe();
    sub2.unsubscribe();
  });
});

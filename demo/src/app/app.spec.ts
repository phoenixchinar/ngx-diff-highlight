import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // Trigger initial change detection
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('ngx-diff-highlight Showcase');
  });

  it('should use the library default highlight classes in the demo', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.diff-highlight')).toBeTruthy();
    expect(compiled.querySelector('.left-changed')).toBeTruthy();
    expect(compiled.querySelector('.left-deleted')).toBeTruthy();
    expect(compiled.querySelector('.right-added')).toBeTruthy();
  });

  it('should highlight form array inputs', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-role-path="roles[0]"].diff-highlight')).toBeTruthy();
    expect(compiled.querySelector('[data-role-path="roles[1]"].diff-highlight')).toBeTruthy();
  });

  it('should show the current computeDiff gap note and handle invalid json', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Current library gap:');
    expect(compiled.querySelector('[data-live-row="team"]')?.textContent).toContain('UNCHANGED');
    expect(compiled.querySelector('[data-live-row="roles[1]"]')).toBeTruthy();
    expect(compiled.querySelector('[data-item-right="items[2].name"]')).toBeTruthy();
    expect(compiled.querySelector('[data-item-right="items[0].id"]')?.textContent).toContain('UNCHANGED');

    app.newJson.set('{');
    fixture.detectChanges();
    await fixture.whenStable();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="json-error"]')).toBeTruthy();
  });
});

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
    expect(compiled.querySelector('[data-basic-active="contact.email"]')).toBeTruthy();
    expect(compiled.querySelector('[data-basic-path="contact.email"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.querySelector('[data-basic-path="address"]')?.classList.contains('diff-highlight')).toBe(false);
    expect(compiled.querySelector('.diff-highlight')).toBeTruthy();
    expect(compiled.querySelector('.left-changed')).toBeTruthy();
    expect(compiled.querySelector('.left-deleted')).toBeTruthy();
    expect(compiled.querySelector('.right-added')).toBeTruthy();
    expect(compiled.querySelector('[data-path="user.team"]')?.textContent).toContain('UNCHANGED');
    expect(compiled.querySelector('[data-path="user.team"]')?.classList.contains('diff-highlight')).toBe(false);
  });

  it('should show parent and child path matching in the basic detail view', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.showBasicFields(['address']);
    fixture.detectChanges();
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-basic-path="address"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.querySelector('[data-basic-path="address.city"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.querySelector('[data-basic-path="address.zip"]')?.classList.contains('diff-highlight')).toBe(true);

    app.showBasicFields([]);
    fixture.detectChanges();
    await fixture.whenStable();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-basic-empty]')).toBeTruthy();
    expect(compiled.querySelector('[data-basic-path="contact.email"]')?.classList.contains('diff-highlight')).toBe(false);
  });

  it('should highlight form array inputs', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-role-path="roles[0]"].diff-highlight')).toBeTruthy();
    expect(compiled.querySelector('[data-role-path="roles[1]"].diff-highlight')).toBeTruthy();
  });

  it('should show the current computeDiff array behavior note and handle invalid json', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Current library behavior:');
    expect(compiled.textContent).toContain('automatic fingerprint matching');
    expect(compiled.querySelector('[data-live-row="team"]')?.textContent).toContain('UNCHANGED');
    expect(compiled.querySelector('[data-live-row="roles[1]"]')).toBeTruthy();
    expect(compiled.querySelector('[data-item-right-row="items[0]"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.querySelector('[data-item-right="items[0].name"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.querySelector('[data-item-right-row="items[1]"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.textContent).toContain('Previous Items');
    expect(compiled.textContent).toContain('Current Items');
    expect(compiled.textContent).toContain('enabled');
    expect(compiled.textContent).toContain('Moved from items[1]');
    expect(compiled.textContent).toContain('Moved from items[0]');
    expect(compiled.querySelector('[data-item-right="items[2].name"]')).toBeTruthy();
    expect(compiled.querySelector('[data-item-right-row="items[1]"] .table-status')?.textContent).toContain('UNCHANGED');
    expect(compiled.querySelector('[data-fallback-index="users[0].name"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.querySelector('[data-fallback-auto="users[0].name"]')?.classList.contains('diff-highlight')).toBe(true);
    expect(compiled.textContent).toContain('Forced Index Mode');
    expect(compiled.textContent).toContain('Default Auto Matching');
    expect(compiled.textContent).toContain('Auto fingerprint matched');

    app.newJson.set('{');
    fixture.detectChanges();
    await fixture.whenStable();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="json-error"]')).toBeTruthy();
  });
});

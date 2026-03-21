import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiffHighlight } from './diff-highlight';

describe('DiffHighlight', () => {
  let component: DiffHighlight;
  let fixture: ComponentFixture<DiffHighlight>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffHighlight],
    }).compileComponents();

    fixture = TestBed.createComponent(DiffHighlight);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

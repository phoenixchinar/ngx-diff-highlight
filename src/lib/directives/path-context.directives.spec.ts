import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlContainer, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { 
  DiffHighlightGroupDirective, 
  DiffHighlightArrayDirective, 
  DiffHighlightNameDirective 
} from './path-context.directives';

@Component({
  template: `
    <div [diffHighlightGroup]="'user'">
      <div [diffHighlightArray]="0" #arrayDir>
        <span [diffHighlightName]="'firstName'" #nameDir></span>
      </div>
      <div [diffHighlightGroup]="'address'">
         <span [diffHighlightName]="'city'" #cityDir></span>
      </div>
    </div>
    <div [appHighlightFieldGroup]="'settings'">
       <span [appHighlightFieldName]="'theme'" #themeDir></span>
    </div>
  `,
  standalone: true,
  imports: [
    DiffHighlightGroupDirective,
    DiffHighlightArrayDirective,
    DiffHighlightNameDirective
  ]
})
class TestComponent {
  @ViewChild('arrayDir', { read: DiffHighlightArrayDirective }) arrayDir!: DiffHighlightArrayDirective;
  @ViewChild('nameDir', { read: DiffHighlightNameDirective }) nameDir!: DiffHighlightNameDirective;
  @ViewChild('cityDir', { read: DiffHighlightNameDirective }) cityDir!: DiffHighlightNameDirective;
  @ViewChild('themeDir', { read: DiffHighlightNameDirective }) themeDir!: DiffHighlightNameDirective;
}

@Component({
  template: `
    <form [formGroup]="form">
      <div formGroupName="profile" diffHighlightGroup #groupDir>
        <span diffHighlightName="username" #nameDir></span>
      </div>
    </form>
  `,
  standalone: true,
  imports: [ReactiveFormsModule, DiffHighlightGroupDirective, DiffHighlightNameDirective]
})
class ControlContainerTestComponent {
  form = new FormGroup({
    profile: new FormGroup({
      username: new FormControl('')
    })
  });
  @ViewChild('groupDir', { read: DiffHighlightGroupDirective }) groupDir!: DiffHighlightGroupDirective;
  @ViewChild('nameDir', { read: DiffHighlightNameDirective }) nameDir!: DiffHighlightNameDirective;
}

describe('PathContextDirectives', () => {
  describe('Basic Composition', () => {
    let fixture: ComponentFixture<TestComponent>;
    let component: TestComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should compose paths correctly for nested directives', () => {
      expect(component.arrayDir.getPath()).toBe('user[0]');
      expect(component.nameDir.getPath()).toBe('user[0].firstName');
      expect(component.cityDir.getPath()).toBe('user.address.city');
    });

    it('should support alias selectors', () => {
      expect(component.themeDir.getPath()).toBe('settings.theme');
    });
  });

  describe('ControlContainer Fallback', () => {
    let fixture: ComponentFixture<ControlContainerTestComponent>;
    let component: ControlContainerTestComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ControlContainerTestComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(ControlContainerTestComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should resolve segment from ControlContainer if groupName is not provided', () => {
      expect(component.groupDir.getPath()).toBe('profile');
      expect(component.nameDir.getPath()).toBe('profile.username');
    });
  });
});

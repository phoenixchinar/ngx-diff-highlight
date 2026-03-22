import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, FormControl, ReactiveFormsModule, ControlContainer } from '@angular/forms';
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


@Component({
  template: `
    <div diffHighlightGroup #emptyGroup></div>
    <div [appHighlightFieldArray]="2" #aliasArray></div>
  `,
  standalone: true,
  imports: [DiffHighlightGroupDirective, DiffHighlightArrayDirective],
})
class NullPathTestComponent {
  @ViewChild('emptyGroup', { read: DiffHighlightGroupDirective }) emptyGroup!: DiffHighlightGroupDirective;
  @ViewChild('aliasArray', { read: DiffHighlightArrayDirective }) aliasArray!: DiffHighlightArrayDirective;
}

@Component({
  template: `<div diffHighlightGroup #groupDir></div>`,
  standalone: true,
  imports: [DiffHighlightGroupDirective],
  providers: [
    {
      provide: ControlContainer,
      useValue: {
        name: '',
        path: ['profile', 'address']
      }
    }
  ]
})
class MockControlContainerPathComponent {
  @ViewChild('groupDir', { read: DiffHighlightGroupDirective }) groupDir!: DiffHighlightGroupDirective;
}

@Component({
  template: `<div diffHighlightGroup #groupDir></div>`,
  standalone: true,
  imports: [DiffHighlightGroupDirective],
  providers: [
    {
      provide: ControlContainer,
      useValue: {
        name: 0,
        path: ['items', '0']
      }
    }
  ]
})
class MockNumericControlContainerComponent {
  @ViewChild('groupDir', { read: DiffHighlightGroupDirective }) groupDir!: DiffHighlightGroupDirective;
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

    it('should prefer an explicit group name over ControlContainer', () => {
      component.groupDir.groupName = 'override';
      expect(component.groupDir.segment).toBe('override');
      expect(component.groupDir.getPath()).toBe('override');
    });
  });

  describe('Null and Alias Segments', () => {
    let fixture: ComponentFixture<NullPathTestComponent>;
    let component: NullPathTestComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [NullPathTestComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(NullPathTestComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should return null when no parent and no segment are available', () => {
      expect(component.emptyGroup.segment).toBeNull();
      expect(component.emptyGroup.getPath()).toBeNull();
    });

    it('should support the array alias input', () => {
      expect(component.aliasArray.segment).toBe(2);
      expect(component.aliasArray.getPath()).toBe('[2]');
    });

    it('should use ControlContainer.path when name is empty', async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [MockControlContainerPathComponent]
      }).compileComponents();

      const mockFixture = TestBed.createComponent(MockControlContainerPathComponent);
      const mockComponent = mockFixture.componentInstance;
      mockFixture.detectChanges();

      expect(mockComponent.groupDir.segment).toBe('profile.address');
      expect(mockComponent.groupDir.getPath()).toBe('profile.address');
    });

    it('should preserve numeric control names such as array index 0', async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [MockNumericControlContainerComponent]
      }).compileComponents();

      const mockFixture = TestBed.createComponent(MockNumericControlContainerComponent);
      const mockComponent = mockFixture.componentInstance;
      mockFixture.detectChanges();

      expect(mockComponent.groupDir.segment).toBe(0);
      expect(mockComponent.groupDir.getPath()).toBe('[0]');
    });
  });
});

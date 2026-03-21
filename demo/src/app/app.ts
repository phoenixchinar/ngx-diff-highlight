import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { DiffHighlightModule, DiffHighlightInput } from 'ngx-diff-highlight';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DiffHighlightModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private fb = inject(FormBuilder);

  // Scenario 1: Basic Detail View
  basicFieldsInput = signal('name, address.city');
  basicFields = computed<DiffHighlightInput[]>(() => this.basicFieldsInput().split(',').map(s => s.trim()).filter(s => !!s));
  
  // Scenario 2: Reactive Form
  form: FormGroup;
  formFieldsInput = signal('user.firstName, user.lastName, roles.0, roles.1');
  formFields = computed<DiffHighlightInput[]>(() => this.formFieldsInput().split(',').map(s => s.trim()).filter(s => !!s));

  // Scenario 3: Multiple Scopes
  scope1Fields = signal<DiffHighlightInput[]>(['title', 'description']);
  scope2Fields = signal<DiffHighlightInput[]>(['title', 'status']);

  // Scenario 4: Visual Diff (Added, Changed, Deleted)
  diffFields = signal<DiffHighlightInput[]>([
    { path: 'user.firstName', type: 'changed' },
    { path: 'user.lastName', type: 'added' },
    { path: 'user.bio', type: 'deleted' }
  ]);

  constructor() {
    this.form = this.fb.group({
      user: this.fb.group({
        firstName: ['John'],
        lastName: ['Doe']
      }),
      roles: this.fb.array([
        this.fb.control('Admin'),
        this.fb.control('User'),
        this.fb.control('Editor')
      ])
    });
  }

  get roles() {
    return this.form.get('roles') as FormArray;
  }

  updateBasicFields(val: string) {
    this.basicFieldsInput.set(val);
  }

  updateFormFields(val: string) {
    this.formFieldsInput.set(val);
  }

  toggleScope1Field(field: string) {
    const current = this.scope1Fields();
    if (current.includes(field)) {
      this.scope1Fields.set(current.filter(f => f !== field));
    } else {
      this.scope1Fields.set([...current, field]);
    }
  }

  toggleScope2Field(field: string) {
    const current = this.scope2Fields();
    if (current.includes(field)) {
      this.scope2Fields.set(current.filter(f => f !== field));
    } else {
      this.scope2Fields.set([...current, field]);
    }
  }
}

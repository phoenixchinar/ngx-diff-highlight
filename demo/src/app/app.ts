import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { DiffHighlightModule, DiffHighlightInput, computeDiff, DiffType } from 'ngx-diff-highlight';

interface ComparisonRow {
  path: string;
  leftValue: string;
  rightValue: string;
  type: DiffType;
}

interface ParsedJsonState {
  oldValue: unknown | null;
  newValue: unknown | null;
  error: string | null;
}

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
  leftObj = {
    user: {
      firstName: 'Jane',
      bio: 'Original bio text.'
    }
  };
  rightObj = {
    user: {
      firstName: 'John',
      lastName: 'Doe'
    }
  };
  diffFields = computed(() => computeDiff(this.leftObj, this.rightObj));

  // Scenario 5: Real-time Object Diffing
  oldJson = signal('{\n  "name": "Jane",\n  "roles": ["Admin"]\n}');
  newJson = signal('{\n  "name": "John",\n  "roles": ["Admin", "Editor"],\n  "active": true\n}');

  readonly visualRows = computed(() => this.buildComparisonRows(this.leftObj, this.rightObj, this.diffFields()));

  readonly parsedJsonState = computed<ParsedJsonState>(() => {
    try {
      return {
        oldValue: JSON.parse(this.oldJson()),
        newValue: JSON.parse(this.newJson()),
        error: null,
      };
    } catch {
      return {
        oldValue: null,
        newValue: null,
        error: 'Invalid JSON',
      };
    }
  });

  readonly computedDiff = computed(() => {
    const state = this.parsedJsonState();
    if (state.error) {
      return [];
    }
    return computeDiff(state.oldValue, state.newValue);
  });

  readonly liveRows = computed(() => {
    const state = this.parsedJsonState();
    if (state.error) {
      return [];
    }
    return this.buildComparisonRows(state.oldValue, state.newValue, this.computedDiff());
  });

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

  private buildComparisonRows(left: unknown, right: unknown, diffs: DiffHighlightInput[]): ComparisonRow[] {
    const diffMap = new Map<string, DiffType>(
      diffs.map((diff) => {
        const path = typeof diff === 'string' ? diff : diff.path;
        const type = typeof diff === 'string' ? 'none' : (diff.type || 'none');
        return [path, type];
      })
    );
    
    const allPaths = Array.from(new Set([
      ...this.collectLeafPaths(left),
      ...this.collectLeafPaths(right),
    ])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return allPaths.map((path) => ({
      path,
      leftValue: this.formatValue(this.readPath(left, path)),
      rightValue: this.formatValue(this.readPath(right, path)),
      type: diffMap.get(path) ?? 'none',
    }));
  }

  private collectLeafPaths(value: unknown, path: string | null = null): string[] {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return path ? [path] : [];
      }

      return value.flatMap((item, index) => {
        const nextPath = path ? `${path}[${index}]` : `[${index}]`;
        return this.collectLeafPaths(item, nextPath);
      });
    }

    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return path ? [path] : [];
      }

      return entries.flatMap(([key, item]) => {
        const nextPath = path ? `${path}.${key}` : key;
        return this.collectLeafPaths(item, nextPath);
      });
    }

    return path ? [path] : [];
  }

  private readPath(value: unknown, path: string): unknown {
    const segments = path.match(/[^.[\]]+|\[\d+\]/g) ?? [];
    let current = value;

    for (const segment of segments) {
      const key = segment.startsWith('[') ? Number(segment.slice(1, -1)) : segment;
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string | number, unknown>)[key];
    }

    return current;
  }

  private formatValue(value: unknown): string {
    if (value === undefined) {
      return 'Not present';
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }
}

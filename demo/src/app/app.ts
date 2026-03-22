import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import {
  ComputeDiffArrayItemEntry,
  ComputeDiffResult,
  DiffHighlightModule,
  DiffHighlightInput,
  computeDiff,
  DiffType,
  toHighlightPaths,
} from 'ngx-diff-highlight';

interface ComparisonRow {
  path: string;
  leftValue: string;
  rightValue: string;
  type: DiffType;
}

interface ItemComparisonGroup {
  index: number;
  path: string;
  leftPath: string | null;
  rightPath: string | null;
  summary: string;
  movement: string;
  fields: ComparisonRow[];
}

type ComparisonSide = 'left' | 'right';

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
  basicFields = signal<DiffHighlightInput[]>(['contact.email']);
  readonly basicFieldLabels = computed(() => this.basicFields().map((field) => typeof field === 'string' ? field : field.path));
  
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
      bio: 'Original bio text.',
      team: 'Platform'
    }
  };
  rightObj = {
    user: {
      firstName: 'John',
      lastName: 'Doe',
      team: 'Platform'
    }
  };
  diffResult = computed(() => computeDiff(this.leftObj, this.rightObj));
  diffFields = computed(() => toHighlightPaths(this.diffResult()));

  // Scenario 5: Real-time Object Diffing
  oldJson = signal('{\n  "name": "Jane",\n  "team": "Platform",\n  "roles": ["Admin"]\n}');
  newJson = signal('{\n  "name": "John",\n  "team": "Platform",\n  "roles": ["Admin", "Editor"],\n  "active": true\n}');

  // Scenario 6: Arrays of objects
  leftItems = {
    items: [
      { id: 1, name: 'Alpha', enabled: true },
      { id: 2, name: 'Beta', enabled: false }
    ]
  };
  rightItems = {
    items: [
      { id: 2, name: 'Beta v2', enabled: true },
      { id: 1, name: 'Alpha', enabled: true },
      { id: 3, name: 'Gamma', enabled: true }
    ]
  };
  itemDiffResult = computed(() => computeDiff(this.leftItems, this.rightItems));
  itemDiffFields = computed(() => toHighlightPaths(this.itemDiffResult()));
  readonly itemRows = computed(() => this.buildComparisonRows(this.leftItems, this.rightItems, this.itemDiffFields()));
  readonly itemGroups = computed(() => this.buildItemGroups(this.itemRows(), this.itemDiffResult(), this.leftItems, this.rightItems));
  readonly itemColumns = ['id', 'name', 'enabled'];

  // Scenario 7: Deterministic content fallback for arrays without ids
  fallbackLeftItems = {
    users: [
      { name: 'Alice', role: 'Admin' },
      { name: 'Bob', role: 'Editor' }
    ]
  };
  fallbackRightItems = {
    users: [
      { role: 'Editor', name: 'Bob' },
      { role: 'Admin', name: 'Alice' }
    ]
  };
  fallbackAutoResult = computed(() => computeDiff(this.fallbackLeftItems, this.fallbackRightItems));
  fallbackIndexResult = computed(() => computeDiff(this.fallbackLeftItems, this.fallbackRightItems, {
    arrayMatching: { mode: 'index' }
  }));
  fallbackAutoDiff = computed(() => toHighlightPaths(this.fallbackAutoResult()));
  fallbackIndexDiff = computed(() => toHighlightPaths(this.fallbackIndexResult()));
  readonly fallbackAutoRows = computed(() =>
    this.buildComparisonRows(this.fallbackLeftItems, this.fallbackRightItems, this.fallbackAutoDiff())
  );
  readonly fallbackIndexRows = computed(() =>
    this.buildComparisonRows(this.fallbackLeftItems, this.fallbackRightItems, this.fallbackIndexDiff())
  );

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
    return toHighlightPaths(computeDiff(state.oldValue, state.newValue));
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

  showBasicFields(fields: DiffHighlightInput[]) {
    this.basicFields.set(fields);
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

  private buildItemGroups(
    rows: ComparisonRow[],
    diffResult: ComputeDiffResult,
    left: { items?: unknown[] },
    right: { items?: unknown[] }
  ): ItemComparisonGroup[] {
    const groups = new Map<number, ComparisonRow[]>();
    const moveEntries = new Map<number, ComputeDiffArrayItemEntry>();
    const itemCount = Math.max(left.items?.length ?? 0, right.items?.length ?? 0);

    rows
      .filter((row) => row.path.startsWith('items['))
      .forEach((row) => {
        const match = row.path.match(/^items\[(\d+)\]/);
        if (!match) return;

        const index = Number(match[1]);
        groups.set(index, [...(groups.get(index) ?? []), row]);
      });

    diffResult.entries.forEach((entry) => {
      if (entry.kind !== 'array-item' || !entry.path.startsWith('items[')) {
        return;
      }

      const match = entry.path.match(/^items\[(\d+)\]/);
      if (!match) return;
      moveEntries.set(Number(match[1]), entry);
    });

    return Array.from({ length: itemCount }, (_, index) => {
      const fields = groups.get(index) ?? [];
      const moveEntry = moveEntries.get(index);
      const leftPath = this.resolveItemPath(index, 'left', moveEntry, left.items?.length ?? 0);
      const rightPath = this.resolveItemPath(index, 'right', moveEntry, right.items?.length ?? 0);

      return {
        index,
        path: `items[${index}]`,
        leftPath,
        rightPath,
        summary: this.summarizeItemGroup(fields),
        movement: this.describeItemMovement(moveEntry),
        fields,
      };
    });
  }

  private resolveItemPath(
    index: number,
    side: ComparisonSide,
    entry: ComputeDiffArrayItemEntry | undefined,
    sideLength: number
  ): string | null {
    if (entry?.type === 'added' && side === 'left') {
      return null;
    }

    if (entry?.type === 'deleted' && side === 'right') {
      return null;
    }

    if (side === 'left' && entry?.oldIndex !== null && entry?.oldIndex !== undefined) {
      return `items[${entry.oldIndex}]`;
    }

    if (side === 'right' && entry?.newIndex !== null && entry?.newIndex !== undefined) {
      return `items[${entry.newIndex}]`;
    }

    return index < sideLength ? `items[${index}]` : null;
  }

  private summarizeItemGroup(fields: ComparisonRow[]): string {
    const activeTypes = Array.from(new Set(fields.map((field) => field.type).filter((type) => type !== 'none')));
    if (activeTypes.length === 0) {
      return 'UNCHANGED';
    }

    return activeTypes.map((type) => type.toUpperCase()).join(' + ');
  }

  private describeItemMovement(entry: ComputeDiffArrayItemEntry | undefined): string {
    if (!entry) {
      return 'Same index';
    }

    if (entry.type === 'added') {
      return 'New row';
    }

    if (entry.type === 'deleted') {
      return 'Removed row';
    }

    if (entry.oldIndex !== null && entry.newIndex !== null && entry.oldIndex !== entry.newIndex) {
      return `Moved from items[${entry.oldIndex}]`;
    }

    return 'Same index';
  }

  countChangedRows(rows: ComparisonRow[]): number {
    return rows.filter((row) => row.type !== 'none').length;
  }

  getItemFieldValue(group: ItemComparisonGroup, key: string, side: ComparisonSide): string {
    const path = side === 'left' ? group.leftPath : group.rightPath;
    if (!path) {
      return 'Not present';
    }

    const field = group.fields.find((row) => row.path === `${group.path}.${key}`);
    if (!field) {
      return 'Not present';
    }

    return side === 'left'
      ? this.formatValue(this.readPath(this.leftItems, `${path}.${key}`))
      : this.formatValue(this.readPath(this.rightItems, `${path}.${key}`));
  }

  getItemTooltip(group: ItemComparisonGroup, side: ComparisonSide): string {
    const sourcePath = side === 'left' ? group.leftPath : group.rightPath;
    return [
      `Comparison row: ${group.path}`,
      `Rendered source: ${sourcePath ?? 'Not present'}`,
      `Status: ${group.summary}`,
      `Movement: ${group.movement}`,
    ].join(' | ');
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

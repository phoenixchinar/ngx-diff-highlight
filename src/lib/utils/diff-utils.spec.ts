import { describe, it, expect } from 'vitest';
import { computeDiff, toHighlightPaths } from './diff-utils';

describe('diff-utils', () => {
  describe('computeDiff', () => {
    it('returns an empty result for identical objects', () => {
      const result = computeDiff({ a: 1 }, { a: 1 });
      expect(result.entries).toEqual([]);
      expect(result.highlightFields).toEqual([]);
      expect(toHighlightPaths(result)).toEqual([]);
    });

    it('detects simple field changes', () => {
      const result = computeDiff({ a: 1, b: 2 }, { a: 1, b: 3 });
      expect(result.entries).toEqual([
        { kind: 'field', path: 'b', type: 'changed' },
      ]);
      expect(toHighlightPaths(result)).toEqual([
        { path: 'b', type: 'changed' },
      ]);
    });

    it('detects additions and deletions in objects', () => {
      expect(computeDiff({ a: 1 }, { a: 1, b: 2 }).entries).toEqual([
        { kind: 'field', path: 'b', type: 'added' },
      ]);

      expect(computeDiff({ a: 1, b: 2 }, { a: 1 }).entries).toEqual([
        { kind: 'field', path: 'b', type: 'deleted' },
      ]);
    });

    it('handles deep nesting', () => {
      const result = computeDiff(
        { user: { profile: { name: 'Jane' } } },
        { user: { profile: { name: 'John' } } }
      );

      expect(result.entries).toEqual([
        { kind: 'field', path: 'user.profile.name', type: 'changed' },
      ]);
    });

    it('treats nested nullish or type-shape changes as field changes', () => {
      expect(computeDiff({ value: null }, { value: 'x' }).entries).toEqual([
        { kind: 'field', path: 'value', type: 'changed' },
      ]);

      expect(computeDiff({ value: ['x'] }, { value: { 0: 'x' } }).entries).toEqual([
        { kind: 'field', path: 'value', type: 'changed' },
      ]);
    });

    it('returns an empty result for root-level primitive or shape changes without a path', () => {
      expect(computeDiff(null, 'x')).toEqual({ entries: [], highlightFields: [] });
      expect(computeDiff(['a'], { 0: 'a' })).toEqual({ entries: [], highlightFields: [] });
    });

    it('supports root arrays with wildcard identity rules', () => {
      const result = computeDiff(
        [
          { id: 1, name: 'Alpha' },
          { id: 2, name: 'Beta' },
        ],
        [
          { id: 2, name: 'Beta' },
          { id: 1, name: 'Alpha' },
        ],
        {
          arrayMatching: {
            identityByPath: {
              '[]': 'id',
            },
          },
        }
      );

      expect(result.entries).toEqual([
        {
          kind: 'array-item',
          path: '[0]',
          type: 'moved',
          oldIndex: 1,
          newIndex: 0,
          matchSource: 'path-rule',
          highlightFields: [],
        },
        {
          kind: 'array-item',
          path: '[1]',
          type: 'moved',
          oldIndex: 0,
          newIndex: 1,
          matchSource: 'path-rule',
          highlightFields: [],
        },
      ]);
    });

    describe('array diffing', () => {
      it('detects primitive changes by index', () => {
        const result = computeDiff({ tags: ['a', 'b'] }, { tags: ['a', 'c'] });
        expect(result.entries).toEqual([
          { kind: 'field', path: 'tags[1]', type: 'changed' },
        ]);
      });

      it('detects primitive additions and deletions as array-item entries', () => {
        expect(computeDiff({ tags: ['a'] }, { tags: ['a', 'b'] }).entries).toEqual([
          {
            kind: 'array-item',
            path: 'tags[1]',
            type: 'added',
            oldIndex: null,
            newIndex: 1,
            matchSource: 'index',
            highlightFields: [],
          },
        ]);

        expect(computeDiff({ tags: ['a', 'b'] }, { tags: ['a'] }).entries).toEqual([
          {
            kind: 'array-item',
            path: 'tags[1]',
            type: 'deleted',
            oldIndex: 1,
            newIndex: null,
            matchSource: 'index',
            highlightFields: [],
          },
        ]);
      });

      it('matches keyed array objects and records pure moves', () => {
        const result = computeDiff(
          {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
              { id: 3, name: 'Charlie' },
            ],
          },
          {
            users: [
              { id: 2, name: 'Bob' },
              { id: 1, name: 'Alice' },
              { id: 3, name: 'Charlie' },
            ],
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'users[0]',
            type: 'moved',
            oldIndex: 1,
            newIndex: 0,
            matchSource: 'built-in',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'built-in',
            highlightFields: [],
          },
        ]);

        expect(toHighlightPaths(result)).toEqual([
          { path: 'users[0]', type: 'changed' },
          { path: 'users[1]', type: 'changed' },
        ]);
      });

      it('records move plus changed field for keyed objects', () => {
        const result = computeDiff(
          {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
          },
          {
            users: [
              { id: 2, name: 'Bobby' },
              { id: 1, name: 'Alice' },
            ],
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'users[0]',
            type: 'moved-changed',
            oldIndex: 1,
            newIndex: 0,
            matchSource: 'built-in',
            highlightFields: [{ path: 'users[0].name', type: 'changed' }],
          },
          { kind: 'field', path: 'users[0].name', type: 'changed' },
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'built-in',
            highlightFields: [],
          },
        ]);

        expect(toHighlightPaths(result)).toEqual([
          { path: 'users[0]', type: 'changed' },
          { path: 'users[0].name', type: 'changed' },
          { path: 'users[1]', type: 'changed' },
        ]);
      });

      it('treats unmatched remainder as added and deleted once built-in identity matching is used', () => {
        const result = computeDiff(
          {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
          },
          {
            users: [
              { id: 3, name: 'Carol' },
              { id: 1, name: 'Alice' },
            ],
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'deleted',
            oldIndex: 1,
            newIndex: null,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[0]',
            type: 'added',
            oldIndex: null,
            newIndex: 0,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'built-in',
            highlightFields: [],
          },
        ]);
      });

      it('supports nested identity rules by wildcard path', () => {
        const result = computeDiff(
          {
            orders: [
              {
                orderId: 'o1',
                lines: [
                  { lineId: 'l1', sku: 'A', qty: 1 },
                  { lineId: 'l2', sku: 'B', qty: 1 },
                ],
              },
            ],
          },
          {
            orders: [
              {
                orderId: 'o1',
                lines: [
                  { lineId: 'l2', sku: 'B', qty: 2 },
                  { lineId: 'l1', sku: 'A', qty: 1 },
                ],
              },
            ],
          },
          {
            arrayMatching: {
              identityByPath: {
                'orders[]': 'orderId',
                'orders[].lines[]': 'lineId',
              },
            },
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'orders[0].lines[0]',
            type: 'moved-changed',
            oldIndex: 1,
            newIndex: 0,
            matchSource: 'path-rule',
            highlightFields: [{ path: 'orders[0].lines[0].qty', type: 'changed' }],
          },
          { kind: 'field', path: 'orders[0].lines[0].qty', type: 'changed' },
          {
            kind: 'array-item',
            path: 'orders[0].lines[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'path-rule',
            highlightFields: [],
          },
        ]);
      });

      it('treats unmatched remainder as added and deleted once path-rule matching is used', () => {
        const result = computeDiff(
          {
            orders: [
              {
                orderId: 'o1',
                lines: [
                  { lineId: 'l1', sku: 'A' },
                  { lineId: 'l2', sku: 'B' },
                ],
              },
            ],
          },
          {
            orders: [
              {
                orderId: 'o1',
                lines: [
                  { lineId: 'l3', sku: 'C' },
                  { lineId: 'l1', sku: 'A' },
                ],
              },
            ],
          },
          {
            arrayMatching: {
              identityByPath: {
                'orders[]': 'orderId',
                'orders[].lines[]': 'lineId',
              },
            },
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'orders[0].lines[1]',
            type: 'deleted',
            oldIndex: 1,
            newIndex: null,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'orders[0].lines[0]',
            type: 'added',
            oldIndex: null,
            newIndex: 0,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'orders[0].lines[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'path-rule',
            highlightFields: [],
          },
        ]);
      });

      it('supports a global identity callback', () => {
        const result = computeDiff(
          {
            groups: [
              {
                members: [
                  { code: 'a', name: 'Alpha' },
                  { code: 'b', name: 'Beta' },
                ],
              },
            ],
          },
          {
            groups: [
              {
                members: [
                  { code: 'b', name: 'Beta v2' },
                  { code: 'a', name: 'Alpha' },
                ],
              },
            ],
          },
          {
            arrayMatching: {
              getIdentity: (item, context) => {
                if (context.wildcardArrayPath === 'groups[].members[]' && item && typeof item === 'object' && 'code' in item) {
                  return (item as { code: string }).code;
                }
                return null;
              },
            },
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'groups[0].members[0]',
            type: 'moved-changed',
            oldIndex: 1,
            newIndex: 0,
            matchSource: 'callback',
            highlightFields: [{ path: 'groups[0].members[0].name', type: 'changed' }],
          },
          { kind: 'field', path: 'groups[0].members[0].name', type: 'changed' },
          {
            kind: 'array-item',
            path: 'groups[0].members[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'callback',
            highlightFields: [],
          },
        ]);
      });

      it('treats unmatched remainder as added and deleted once callback matching is used', () => {
        const result = computeDiff(
          {
            groups: [
              {
                members: [
                  { code: 'a', name: 'Alpha' },
                  { code: 'b', name: 'Beta' },
                ],
              },
            ],
          },
          {
            groups: [
              {
                members: [
                  { code: 'c', name: 'Gamma' },
                  { code: 'a', name: 'Alpha' },
                ],
              },
            ],
          },
          {
            arrayMatching: {
              getIdentity: (item, context) => {
                if (context.wildcardArrayPath === 'groups[].members[]' && item && typeof item === 'object' && 'code' in item) {
                  return (item as { code: string }).code;
                }
                return null;
              },
            },
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'groups[0].members[1]',
            type: 'deleted',
            oldIndex: 1,
            newIndex: null,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'groups[0].members[0]',
            type: 'added',
            oldIndex: null,
            newIndex: 0,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'groups[0].members[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'callback',
            highlightFields: [],
          },
        ]);
      });

      it('uses automatic fingerprint matching for smaller non-keyed object arrays', () => {
        const result = computeDiff(
          {
            users: [
              { name: 'Alice', role: 'Admin' },
              { name: 'Bob', role: 'Editor' },
            ],
          },
          {
            users: [
              { role: 'Editor', name: 'Bob' },
              { role: 'Admin', name: 'Alice' },
            ],
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'users[0]',
            type: 'moved',
            oldIndex: 1,
            newIndex: 0,
            matchSource: 'fingerprint',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'fingerprint',
            highlightFields: [],
          },
        ]);
      });

      it('treats unmatched remainder as added and deleted once fingerprint matching is used', () => {
        const result = computeDiff(
          {
            users: [
              { name: 'Alice', role: 'Admin' },
              { name: 'Bob', role: 'Editor' },
            ],
          },
          {
            users: [
              { name: 'Carol', role: 'Viewer' },
              { role: 'Admin', name: 'Alice' },
            ],
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'deleted',
            oldIndex: 1,
            newIndex: null,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[0]',
            type: 'added',
            oldIndex: null,
            newIndex: 0,
            matchSource: 'index',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'fingerprint',
            highlightFields: [],
          },
        ]);
      });

      it('falls back to index mode when explicitly requested', () => {
        const result = computeDiff(
          {
            users: [
              { name: 'Alice' },
              { name: 'Bob' },
            ],
          },
          {
            users: [
              { name: 'Bob' },
              { name: 'Alice' },
            ],
          },
          {
            arrayMatching: {
              mode: 'index',
            },
          }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'users[0].name', type: 'changed' },
          { kind: 'field', path: 'users[1].name', type: 'changed' },
        ]);
      });

      it('keeps positional compare for replacements in explicit index mode', () => {
        const result = computeDiff(
          {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
          },
          {
            users: [
              { id: 3, name: 'Carol' },
              { id: 1, name: 'Alice' },
            ],
          },
          {
            arrayMatching: {
              mode: 'index',
            },
          }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'users[0].id', type: 'changed' },
          { kind: 'field', path: 'users[0].name', type: 'changed' },
          { kind: 'field', path: 'users[1].id', type: 'changed' },
          { kind: 'field', path: 'users[1].name', type: 'changed' },
        ]);
      });

      it('limits automatic fingerprint matching for larger arrays', () => {
        const oldObj = {
          users: Array.from({ length: 40 }, (_, i) => ({ name: `User ${i}` })),
        };
        const newObj = {
          users: [oldObj.users[39], ...oldObj.users.slice(0, 39)],
        };

        const result = computeDiff(oldObj, newObj);
        expect(result.entries).toHaveLength(40);
        expect(result.entries[0]).toEqual({ kind: 'field', path: 'users[0].name', type: 'changed' });
      });

      it('allows forcing fingerprint mode beyond the auto threshold', () => {
        const oldObj = {
          users: Array.from({ length: 40 }, (_, i) => ({ name: `User ${i}` })),
        };
        const newObj = {
          users: [oldObj.users[39], ...oldObj.users.slice(0, 39)],
        };

        const result = computeDiff(oldObj, newObj, {
          arrayMatching: {
            mode: 'fingerprint',
          },
        });

        expect(result.entries.filter((entry) => entry.kind === 'array-item')).toHaveLength(40);
      });

      it('enforces one-to-one matching when duplicate identities exist', () => {
        const result = computeDiff(
          {
            users: [
              { code: 'dup', name: 'Alice A' },
              { code: 'dup', name: 'Alice B' },
            ],
          },
          {
            users: [
              { code: 'dup', name: 'Alice B' },
              { code: 'dup', name: 'Alice A' },
            ],
          }
          ,
          {
            arrayMatching: {
              mode: 'identity-only',
              getIdentity: (item) => item && typeof item === 'object' && 'code' in item ? (item as { code: string }).code : null,
            },
          }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'users[0].name', type: 'changed' },
          { kind: 'field', path: 'users[1].name', type: 'changed' },
        ]);
      });

      it('uses built-in identity keys beyond id', () => {
        const result = computeDiff(
          {
            users: [
              { uuid: 'u1', name: 'Alice' },
              { uuid: 'u2', name: 'Bob' },
            ],
          },
          {
            users: [
              { uuid: 'u2', name: 'Bob' },
              { uuid: 'u1', name: 'Alice' },
            ],
          }
        );

        expect(result.entries.filter((entry) => entry.kind === 'array-item')).toEqual([
          {
            kind: 'array-item',
            path: 'users[0]',
            type: 'moved',
            oldIndex: 1,
            newIndex: 0,
            matchSource: 'built-in',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'built-in',
            highlightFields: [],
          },
        ]);
      });

      it('can fall through built-in identity keys until one matches', () => {
        const result = computeDiff(
          {
            users: [
              { uuid: 'u1', name: 'Alice' },
              { uuid: 'u2', name: 'Bob' },
            ],
          },
          {
            users: [
              { uuid: 'u2', name: 'Bob' },
              { uuid: 'u1', name: 'Alice' },
            ],
          },
          {
            arrayMatching: {
              builtInIdentityKeys: ['missing', 'uuid'],
            },
          }
        );

        expect(result.entries.filter((entry) => entry.kind === 'array-item')).toHaveLength(2);
      });

      it('does not use built-in identity keys on non-plain objects', () => {
        class Row {
          constructor(public id: number, public name: string) {}
        }

        const result = computeDiff(
          { rows: [new Row(1, 'Alpha'), new Row(2, 'Beta')] },
          { rows: [new Row(2, 'Beta'), new Row(1, 'Alpha')] }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'rows[0].id', type: 'changed' },
          { kind: 'field', path: 'rows[0].name', type: 'changed' },
          { kind: 'field', path: 'rows[1].id', type: 'changed' },
          { kind: 'field', path: 'rows[1].name', type: 'changed' },
        ]);
      });

      it('treats non-primitive resolver outputs as no identity and falls back according to mode', () => {
        const result = computeDiff(
          {
            users: [{ value: 'a' }, { value: 'b' }],
          },
          {
            users: [{ value: 'b' }, { value: 'a' }],
          },
          {
            arrayMatching: {
              mode: 'identity-only',
              getIdentity: () => ({ invalid: true }) as unknown as string,
            },
          }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'users[0].value', type: 'changed' },
          { kind: 'field', path: 'users[1].value', type: 'changed' },
        ]);
      });

      it('supports boolean, number, and bigint identities', () => {
        const numberResult = computeDiff(
          { rows: [{ code: 1 }, { code: 2 }] },
          { rows: [{ code: 2 }, { code: 1 }] },
          {
            arrayMatching: {
              mode: 'identity-only',
              getIdentity: (item) => (item as { code: number }).code,
            },
          }
        );
        expect(numberResult.entries.filter((entry) => entry.kind === 'array-item')).toHaveLength(2);

        const booleanResult = computeDiff(
          { rows: [{ code: true }, { code: false }] },
          { rows: [{ code: false }, { code: true }] },
          {
            arrayMatching: {
              mode: 'identity-only',
              getIdentity: (item) => (item as { code: boolean }).code,
            },
          }
        );
        expect(booleanResult.entries.filter((entry) => entry.kind === 'array-item')).toHaveLength(2);

        const bigintResult = computeDiff(
          { rows: [{ code: 1n }, { code: 2n }] },
          { rows: [{ code: 2n }, { code: 1n }] },
          {
            arrayMatching: {
              mode: 'identity-only',
              getIdentity: (item) => (item as { code: bigint }).code,
            },
          }
        );
        expect(bigintResult.entries.filter((entry) => entry.kind === 'array-item')).toHaveLength(2);
      });

      it('can disable fingerprint matching explicitly', () => {
        const result = computeDiff(
          {
            users: [
              { name: 'Alice' },
              { name: 'Bob' },
            ],
          },
          {
            users: [
              { name: 'Bob' },
              { name: 'Alice' },
            ],
          },
          {
            arrayMatching: {
              fingerprint: {
                enabled: false,
              },
            },
          }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'users[0].name', type: 'changed' },
          { kind: 'field', path: 'users[1].name', type: 'changed' },
        ]);
      });

      it('does not auto-fingerprint primitive arrays', () => {
        const result = computeDiff(
          { tags: ['a', 'b'] },
          { tags: ['b', 'a'] }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'tags[0]', type: 'changed' },
          { kind: 'field', path: 'tags[1]', type: 'changed' },
        ]);
      });

      it('falls back when fingerprinting encounters unsupported values', () => {
        const result = computeDiff(
          {
            users: [
              { fn: () => 'a' },
              { fn: () => 'b' },
            ],
          },
          {
            users: [
              { fn: () => 'b' },
              { fn: () => 'a' },
            ],
          },
          {
            arrayMatching: {
              mode: 'fingerprint',
            },
          }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'users[0].fn', type: 'changed' },
          { kind: 'field', path: 'users[1].fn', type: 'changed' },
        ]);
      });

      it('falls back when fingerprint work exceeds the configured budget', () => {
        const result = computeDiff(
          {
            users: [
              { nested: { name: 'Alice' } },
              { nested: { name: 'Bob' } },
            ],
          },
          {
            users: [
              { nested: { name: 'Bob' } },
              { nested: { name: 'Alice' } },
            ],
          },
          {
            arrayMatching: {
              mode: 'fingerprint',
              fingerprint: {
                maxFingerprintEntries: 1,
              },
            },
          }
        );

        expect(result.entries).toEqual([
          { kind: 'field', path: 'users[0].nested.name', type: 'changed' },
          { kind: 'field', path: 'users[1].nested.name', type: 'changed' },
        ]);
      });

      it('fingerprints nested array items when forced', () => {
        const result = computeDiff(
          { rows: [[1, 2], [3, 4]] },
          { rows: [[3, 4], [1, 2]] },
          {
            arrayMatching: {
              mode: 'fingerprint',
            },
          }
        );

        expect(result.entries.filter((entry) => entry.kind === 'array-item')).toEqual([
          {
            kind: 'array-item',
            path: 'rows[0]',
            type: 'moved',
            oldIndex: 1,
            newIndex: 0,
            matchSource: 'fingerprint',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'rows[1]',
            type: 'moved',
            oldIndex: 0,
            newIndex: 1,
            matchSource: 'fingerprint',
            highlightFields: [],
          },
        ]);
      });

      it('fingerprints special primitive tokens inside objects', () => {
        const result = computeDiff(
          {
            rows: [
              { value: NaN, label: 'nan' },
              { value: -0, label: 'negzero' },
              { value: true, label: 'bool' },
              { value: 1n, label: 'big' },
            ],
          },
          {
            rows: [
              { value: 1n, label: 'big' },
              { value: true, label: 'bool' },
              { value: -0, label: 'negzero' },
              { value: NaN, label: 'nan' },
            ],
          },
          {
            arrayMatching: {
              mode: 'fingerprint',
            },
          }
        );

        expect(result.entries.filter((entry) => entry.kind === 'array-item')).toHaveLength(4);
      });

      it('returns empty root-array presence entries using bracket paths', () => {
        expect(computeDiff([], ['x']).entries).toEqual([
          {
            kind: 'array-item',
            path: '[0]',
            type: 'added',
            oldIndex: null,
            newIndex: 0,
            matchSource: 'index',
            highlightFields: [],
          },
        ]);

        expect(computeDiff(['x'], []).entries).toEqual([
          {
            kind: 'array-item',
            path: '[0]',
            type: 'deleted',
            oldIndex: 0,
            newIndex: null,
            matchSource: 'index',
            highlightFields: [],
          },
        ]);
      });

      it('returns empty highlight paths for deeply duplicated entries after flattening', () => {
        const result = computeDiff(
          {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
          },
          {
            users: [
              { id: 2, name: 'Bobby' },
              { id: 1, name: 'Alice' },
            ],
          }
        );

        expect(toHighlightPaths(result)).toEqual([
          { path: 'users[0]', type: 'changed' },
          { path: 'users[0].name', type: 'changed' },
          { path: 'users[1]', type: 'changed' },
        ]);
      });

      it('considers identical nested arrays deeply equal', () => {
        const result = computeDiff(
          { rows: [[1, 2], [3, 4]] },
          { rows: [[1, 2], [3, 4]] }
        );

        expect(result.entries).toEqual([]);
      });

      it('treats cyclic compared objects conservatively without recursing forever', () => {
        const oldNode: { self?: unknown } = {};
        oldNode.self = oldNode;
        const newNode: { self?: unknown } = {};
        newNode.self = newNode;

        const result = computeDiff({ node: oldNode }, { node: newNode });
        expect(result.entries).toEqual([
          { kind: 'field', path: 'node.self', type: 'changed' },
        ]);
      });

      it('handles arrays with unchanged prefixes and suffixes around a moved middle segment', () => {
        const result = computeDiff(
          {
            users: [
              { id: 10, name: 'Keep 1' },
              { id: 1, name: 'Alpha' },
              { id: 2, name: 'Beta' },
              { id: 20, name: 'Keep 2' },
            ],
          },
          {
            users: [
              { id: 10, name: 'Keep 1' },
              { id: 2, name: 'Beta' },
              { id: 1, name: 'Alpha' },
              { id: 20, name: 'Keep 2' },
            ],
          }
        );

        expect(result.entries).toEqual([
          {
            kind: 'array-item',
            path: 'users[1]',
            type: 'moved',
            oldIndex: 2,
            newIndex: 1,
            matchSource: 'built-in',
            highlightFields: [],
          },
          {
            kind: 'array-item',
            path: 'users[2]',
            type: 'moved',
            oldIndex: 1,
            newIndex: 2,
            matchSource: 'built-in',
            highlightFields: [],
          },
        ]);
      });
    });
  });
});

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
    });
  });
});

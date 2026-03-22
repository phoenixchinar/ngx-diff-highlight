import { describe, it, expect } from 'vitest';
import { computeDiff } from './diff-utils';

describe('diff-utils', () => {
  describe('computeDiff', () => {
    it('should return empty array for identical objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      expect(computeDiff(obj, obj)).toEqual([]);
    });

    it('should detect simple changes', () => {
      const oldObj = { a: 1, b: 2 };
      const newObj = { a: 1, b: 3 };
      expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'b', type: 'changed' }]);
    });

    it('should detect additions', () => {
      const oldObj = { a: 1 };
      const newObj = { a: 1, b: 2 };
      expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'b', type: 'added' }]);
    });

    it('should detect deletions', () => {
      const oldObj = { a: 1, b: 2 };
      const newObj = { a: 1 };
      expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'b', type: 'deleted' }]);
    });

    it('should handle deep nesting', () => {
      const oldObj = { user: { profile: { name: 'Jane' } } };
      const newObj = { user: { profile: { name: 'John' } } };
      expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'user.profile.name', type: 'changed' }]);
    });

    describe('Array diffing', () => {
      it('should detect simple array changes', () => {
        const oldObj = { tags: ['a', 'b'] };
        const newObj = { tags: ['a', 'c'] };
        expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'tags[1]', type: 'changed' }]);
      });

      it('should detect array additions at the end', () => {
        const oldObj = { tags: ['a'] };
        const newObj = { tags: ['a', 'b'] };
        expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'tags[1]', type: 'added' }]);
      });

      it('should detect array deletions at the end', () => {
        const oldObj = { tags: ['a', 'b'] };
        const newObj = { tags: ['a'] };
        expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'tags[1]', type: 'deleted' }]);
      });

      it('should detect insertions in the middle', () => {
        const oldObj = { items: [1, 3] };
        const newObj = { items: [1, 2, 3] };
        // Our current implementation detects the difference at index 1 and 2
        // start=1, newEnd=1, oldEnd=0
        // It will see items[1] as added.
        expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'items[1]', type: 'added' }]);
      });

      it('should detect deletions in the middle', () => {
        const oldObj = { items: [1, 2, 3] };
        const newObj = { items: [1, 3] };
        // start=1, oldEnd=1, newEnd=0
        // It will see items[1] as deleted.
        expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'items[1]', type: 'deleted' }]);
      });

      it('should handle complex object arrays with stable diffing', () => {
        const oldObj = { 
          users: [
            { id: 1, name: 'Alice' },
            { id: 3, name: 'Charlie' }
          ] 
        };
        const newObj = { 
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Charlie' }
          ] 
        };
        // It should identify that {id: 2} was inserted at index 1
        expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'users[1]', type: 'added' }]);
      });

      it('should ignore pure moves for keyed array objects', () => {
        const oldObj = {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Charlie' }
          ]
        };
        const newObj = {
          users: [
            { id: 2, name: 'Bob' },
            { id: 1, name: 'Alice' },
            { id: 3, name: 'Charlie' }
          ]
        };

        expect(computeDiff(oldObj, newObj)).toEqual([]);
      });

      it('should detect renamed fields after keyed items move', () => {
        const oldObj = {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
          ]
        };
        const newObj = {
          users: [
            { id: 2, name: 'Bobby' },
            { id: 1, name: 'Alice' }
          ]
        };

        expect(computeDiff(oldObj, newObj)).toEqual([{ path: 'users[0].name', type: 'changed' }]);
      });

      it('should auto-match reordered arrays by deterministic fingerprints when identities are absent', () => {
        const oldObj = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
        const newObj = { users: [{ name: 'Bob' }, { name: 'Alice' }] };

        expect(computeDiff(oldObj, newObj)).toEqual([]);
      });

      it('should allow forcing index-based comparison when identities are absent', () => {
        const oldObj = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
        const newObj = { users: [{ name: 'Bob' }, { name: 'Alice' }] };

        expect(computeDiff(oldObj, newObj, { arrayMatching: { mode: 'index' } })).toEqual([
          { path: 'users[0].name', type: 'changed' },
          { path: 'users[1].name', type: 'changed' }
        ]);
      });

      it('should support nested array identity rules by wildcard path', () => {
        const oldObj = {
          orders: [
            {
              orderId: 'o1',
              lines: [
                { lineId: 'l1', sku: 'A', qty: 1 },
                { lineId: 'l2', sku: 'B', qty: 1 }
              ]
            }
          ]
        };
        const newObj = {
          orders: [
            {
              orderId: 'o1',
              lines: [
                { lineId: 'l2', sku: 'B', qty: 2 },
                { lineId: 'l1', sku: 'A', qty: 1 }
              ]
            }
          ]
        };

        expect(computeDiff(oldObj, newObj, {
          arrayMatching: {
            identityByPath: {
              'orders[]': 'orderId',
              'orders[].lines[]': 'lineId',
            },
          },
        })).toEqual([{ path: 'orders[0].lines[0].qty', type: 'changed' }]);
      });

      it('should support a global identity callback for nested arrays', () => {
        const oldObj = {
          groups: [
            {
              members: [
                { code: 'a', name: 'Alpha' },
                { code: 'b', name: 'Beta' }
              ]
            }
          ]
        };
        const newObj = {
          groups: [
            {
              members: [
                { code: 'b', name: 'Beta v2' },
                { code: 'a', name: 'Alpha' }
              ]
            }
          ]
        };

        expect(computeDiff(oldObj, newObj, {
          arrayMatching: {
            getIdentity: (item, context) => {
              if (context.wildcardArrayPath === 'groups[].members[]' && item && typeof item === 'object' && 'code' in item) {
                return (item as { code: string }).code;
              }
              return null;
            },
          },
        })).toEqual([{ path: 'groups[0].members[0].name', type: 'changed' }]);
      });

      it('should avoid auto fingerprint matching on larger arrays and stay index-based', () => {
        const oldObj = {
          users: Array.from({ length: 40 }, (_, i) => ({ name: `User ${i}` })),
        };
        const newObj = {
          users: [oldObj.users[39], ...oldObj.users.slice(0, 39)],
        };

        const diff = computeDiff(oldObj, newObj);
        expect(diff).toHaveLength(40);
        expect(diff[0]).toEqual({ path: 'users[0].name', type: 'changed' });
        expect(diff[39]).toEqual({ path: 'users[39].name', type: 'changed' });
      });

      it('should let fingerprint mode force semantic matching beyond the auto threshold', () => {
        const oldObj = {
          users: Array.from({ length: 40 }, (_, i) => ({ name: `User ${i}` })),
        };
        const newObj = {
          users: [oldObj.users[39], ...oldObj.users.slice(0, 39)],
        };

        expect(computeDiff(oldObj, newObj, { arrayMatching: { mode: 'fingerprint' } })).toEqual([]);
      });

      it('should treat default fingerprint matching as exact-content only', () => {
        const oldObj = {
          users: [
            { name: 'Alice', role: 'Admin' },
            { name: 'Bob', role: 'Editor' }
          ]
        };
        const newObj = {
          users: [
            { role: 'Owner', name: 'Bob' },
            { role: 'Admin', name: 'Alice' }
          ]
        };

        expect(computeDiff(oldObj, newObj)).toEqual([
          { path: 'users[0].role', type: 'changed' }
        ]);
      });
    });
  });
});

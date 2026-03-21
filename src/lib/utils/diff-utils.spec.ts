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
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  normalizeDiffSegment,
  normalizeDiffPath,
  joinDiffPath,
  buildDiffPath,
  pathsMatch
} from './path-utils';

describe('PathUtils', () => {

  describe('normalizeDiffSegment', () => {
    it('should trim whitespace', () => {
      expect(normalizeDiffSegment('  name  ')).toBe('name');
    });

    it('should convert numbers to strings', () => {
      expect(normalizeDiffSegment(0)).toBe('0');
      expect(normalizeDiffSegment(42)).toBe('42');
    });

    it('should return null for empty or nullish values', () => {
      expect(normalizeDiffSegment('')).toBe(null);
      expect(normalizeDiffSegment('   ')).toBe(null);
      expect(normalizeDiffSegment(null)).toBe(null);
      expect(normalizeDiffSegment(undefined)).toBe(null);
    });
  });

  describe('normalizeDiffPath', () => {
    it('should trim whitespace', () => {
      expect(normalizeDiffPath('  items[0].name  ')).toBe('items[0].name');
    });

    it('should convert ".[index]" to "[index]"', () => {
      expect(normalizeDiffPath('items.[0].name')).toBe('items[0].name');
    });

    it('should remove spaces around separators', () => {
      expect(normalizeDiffPath('items[0] . name')).toBe('items[0].name');
      expect(normalizeDiffPath('items [ 0 ] . name')).toBe('items[0].name');
    });

    it('should remove leading and trailing dots', () => {
      expect(normalizeDiffPath('.items.0.')).toBe('items[0]');
    });

    it('should convert dot-numeric segments to bracket segments', () => {
      expect(normalizeDiffPath('items.0.name')).toBe('items[0].name');
      expect(normalizeDiffPath('items.0.1.name')).toBe('items[0][1].name');
      expect(normalizeDiffPath('0.items')).toBe('[0].items');
    });

    it('should return null for empty or nullish values', () => {
      expect(normalizeDiffPath('')).toBe(null);
      expect(normalizeDiffPath(null)).toBe(null);
    });
  });

  describe('joinDiffPath', () => {
    it('should join with a dot if child is not an index', () => {
      expect(joinDiffPath('items', 'name')).toBe('items.name');
    });

    it('should join without a dot if child starts with "["', () => {
      expect(joinDiffPath('items', '[0]')).toBe('items[0]');
    });

    it('should wrap numeric strings in brackets', () => {
      expect(joinDiffPath('items', '0')).toBe('items[0]');
    });

    it('should wrap numbers in brackets', () => {
      expect(joinDiffPath('items', 0)).toBe('items[0]');
    });

    it('should handle nested indices', () => {
      expect(joinDiffPath('items[0]', 'tags')).toBe('items[0].tags');
      expect(joinDiffPath('key.sort', 2)).toBe('key.sort[2]');
    });

    it('should handle null/empty parents', () => {
      expect(joinDiffPath(null, 'items')).toBe('items');
      expect(joinDiffPath(null, 0)).toBe('[0]');
      expect(joinDiffPath('', 'name')).toBe('name');
    });

    it('should handle null/empty children', () => {
      expect(joinDiffPath('items', null)).toBe('items');
      expect(joinDiffPath('items', '')).toBe('items');
    });
  });

  describe('buildDiffPath', () => {
    it('should build a path from segments', () => {
      expect(buildDiffPath(['items', '0', 'name'])).toBe('items[0].name');
      expect(buildDiffPath(['user', 'profile', 'email'])).toBe('user.profile.email');
    });

    it('should handle numeric segments', () => {
      expect(buildDiffPath(['items', 0])).toBe('items[0]');
      expect(buildDiffPath([0, 'items'])).toBe('[0].items');
    });

    it('should handle null segments', () => {
      expect(buildDiffPath(['items', null, 'name'])).toBe('items.name');
    });

    it('should return null for empty input', () => {
      expect(buildDiffPath([])).toBe(null);
    });
  });

  describe('pathsMatch', () => {
    it('should match exact paths', () => {
      expect(pathsMatch('items[0].name', 'items[0].name')).toBe(true);
    });

    it('should match descendants', () => {
      expect(pathsMatch('items[0].name', 'items[0]')).toBe(true);
      expect(pathsMatch('items[0].name', 'items')).toBe(true);
    });

    it('should match ancestors', () => {
      expect(pathsMatch('items[0]', 'items[0].name')).toBe(true);
      expect(pathsMatch('items', 'items[0].name')).toBe(true);
    });

    it('should match with brackets', () => {
      expect(pathsMatch('items[0]', 'items')).toBe(true);
      expect(pathsMatch('items', 'items[0]')).toBe(true);
    });

    it('should not match unrelated paths', () => {
      expect(pathsMatch('items[0].name', 'items[1].name')).toBe(false);
      expect(pathsMatch('user.name', 'admin.name')).toBe(false);
      expect(pathsMatch('item', 'items')).toBe(false);
    });

    it('should return false for null/empty paths', () => {
      expect(pathsMatch(null, 'items')).toBe(false);
      expect(pathsMatch('items', null)).toBe(false);
      expect(pathsMatch(null, null)).toBe(false);
    });
  });

});

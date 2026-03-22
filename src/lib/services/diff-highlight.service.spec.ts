import { TestBed } from '@angular/core/testing';
import { DiffHighlightService } from './diff-highlight.service';
import { firstValueFrom } from 'rxjs';

describe('DiffHighlightService', () => {
  let service: DiffHighlightService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DiffHighlightService],
    });
    service = TestBed.inject(DiffHighlightService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have an initial empty array of fields', async () => {
    const fields = await firstValueFrom(service.fields$);
    expect(fields).toEqual([]);
  });

  describe('setFields', () => {
    it('should set and normalize fields from strings', async () => {
      service.setFields(['  user.name  ', 'items.0.id', 'items[1].name']);
      const fields = await firstValueFrom(service.fields$);
      expect(fields).toEqual([
        { path: 'user.name', type: 'none' },
        { path: 'items[0].id', type: 'none' },
        { path: 'items[1].name', type: 'none' }
      ]);
    });

    it('should handle structured objects', async () => {
      service.setFields([
        { path: 'added.field', type: 'added' },
        { path: 'changed.field', type: 'changed' },
        'simple.field'
      ]);
      const fields = await firstValueFrom(service.fields$);
      expect(fields).toEqual([
        { path: 'added.field', type: 'added' },
        { path: 'changed.field', type: 'changed' },
        { path: 'simple.field', type: 'none' }
      ]);
    });

    it('should handle null/undefined fields array', async () => {
      service.setFields(null);
      expect(await firstValueFrom(service.fields$)).toEqual([]);

      service.setFields(undefined);
      expect(await firstValueFrom(service.fields$)).toEqual([]);
    });

    it('should ensure uniqueness by path', async () => {
      service.setFields([
        'user.name',
        { path: '  user.name  ', type: 'changed' },
        'items.0',
        'items[0]'
      ]);
      const fields = await firstValueFrom(service.fields$);
      // Last one wins due to Map.set in implementation
      expect(fields).toEqual([
        { path: 'user.name', type: 'changed' },
        { path: 'items[0]', type: 'none' }
      ]);
    });

    it('should default structured fields without a type to none', async () => {
      service.setFields([{ path: 'user.name' }]);
      expect(await firstValueFrom(service.fields$)).toEqual([{ path: 'user.name', type: 'none' }]);
    });
  });

  describe('clear', () => {
    it('should clear fields', async () => {
      service.setFields(['user.name']);
      service.clear();
      expect(await firstValueFrom(service.fields$)).toEqual([]);
    });
  });

  describe('addField', () => {
    it('should add a normalized field if not present', async () => {
      service.addField('  user.name  ');
      expect(await firstValueFrom(service.fields$)).toEqual([{ path: 'user.name', type: 'none' }]);

      service.addField({ path: 'user.name', type: 'added' }); // Duplicate path
      expect(await firstValueFrom(service.fields$)).toEqual([{ path: 'user.name', type: 'none' }]);

      service.addField('items.0');
      expect(await firstValueFrom(service.fields$)).toEqual([
        { path: 'user.name', type: 'none' },
        { path: 'items[0]', type: 'none' }
      ]);
    });

    it('should ignore null and invalid fields', async () => {
      service.addField(null);
      service.addField(undefined);
      service.addField('   ');
      service.addField({ path: '', type: 'changed' });

      expect(await firstValueFrom(service.fields$)).toEqual([]);
    });

    it('should default structured additions without a type to none', async () => {
      service.addField({ path: 'user.email' });
      expect(await firstValueFrom(service.fields$)).toEqual([{ path: 'user.email', type: 'none' }]);
    });
  });

  describe('removeField', () => {
    it('should remove a normalized field if present', async () => {
      service.setFields(['user.name', 'items[0]']);
      
      service.removeField('  user.name  ');
      expect(await firstValueFrom(service.fields$)).toEqual([{ path: 'items[0]', type: 'none' }]);

      service.removeField('items.0');
      expect(await firstValueFrom(service.fields$)).toEqual([]);
    });

    it('should ignore null, invalid, and missing paths', async () => {
      service.setFields(['user.name']);

      service.removeField(null);
      service.removeField(undefined);
      service.removeField('   ');
      service.removeField('user.email');

      expect(await firstValueFrom(service.fields$)).toEqual([{ path: 'user.name', type: 'none' }]);
    });
  });

  it('should expose a mutable cssPrefix for scoped consumers', () => {
    service.cssPrefix = 'left';
    expect(service.cssPrefix).toBe('left');
  });

  describe('ngOnDestroy', () => {
    it('should complete the fields$ observable on destroy', () => {
      return new Promise<void>((resolve) => {
        service.fields$.subscribe({
          complete: () => {
            resolve();
          },
        });
        service.ngOnDestroy();
      });
    });
  });
});

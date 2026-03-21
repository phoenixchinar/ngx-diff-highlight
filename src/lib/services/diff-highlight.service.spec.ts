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
    it('should set and normalize fields', async () => {
      service.setFields(['  user.name  ', 'items.0.id', null as any, 'items[1].name']);
      const fields = await firstValueFrom(service.fields$);
      expect(fields).toEqual(['user.name', 'items[0].id', 'items[1].name']);
    });

    it('should handle null/undefined fields array', async () => {
      service.setFields(null);
      expect(await firstValueFrom(service.fields$)).toEqual([]);

      service.setFields(undefined);
      expect(await firstValueFrom(service.fields$)).toEqual([]);
    });

    it('should filter out invalid paths after normalization', async () => {
      service.setFields(['', '  ', '.', 'user.name']);
      expect(await firstValueFrom(service.fields$)).toEqual(['user.name']);
    });

    it('should ensure uniqueness', async () => {
      service.setFields(['user.name', '  user.name  ', 'items.0', 'items[0]']);
      expect(await firstValueFrom(service.fields$)).toEqual(['user.name', 'items[0]']);
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
      expect(await firstValueFrom(service.fields$)).toEqual(['user.name']);

      service.addField('user.name'); // Duplicate
      expect(await firstValueFrom(service.fields$)).toEqual(['user.name']);

      service.addField('items.0');
      expect(await firstValueFrom(service.fields$)).toEqual(['user.name', 'items[0]']);
    });

    it('should do nothing if path is invalid', async () => {
      service.addField(null);
      service.addField('');
      expect(await firstValueFrom(service.fields$)).toEqual([]);
    });
  });

  describe('removeField', () => {
    it('should remove a normalized field if present', async () => {
      service.setFields(['user.name', 'items[0]']);
      
      service.removeField('  user.name  ');
      expect(await firstValueFrom(service.fields$)).toEqual(['items[0]']);

      service.removeField('items.0');
      expect(await firstValueFrom(service.fields$)).toEqual([]);
    });

    it('should do nothing if path is not present', async () => {
      service.setFields(['user.name']);
      service.removeField('other.path');
      expect(await firstValueFrom(service.fields$)).toEqual(['user.name']);
    });
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

import { createEvents, updateEvents } from '@/EventCoordinator';
import { ItemProperties } from '@fjell/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('EventCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEvents', () => {
    it('should add all events if none are present', async () => {
      const item: ItemProperties<'S1'> = { prop1: 'value1' };
      const result = createEvents(item);
      expect(result.events).toBeDefined();
      expect(result.events?.created?.at).toBeInstanceOf(Date);
      expect(result.events?.updated?.at).toBeInstanceOf(Date);
      expect(result.events?.deleted?.at).toBeNull();
      expect(result.prop1).toBe('value1');
    });

    it('should add missing events if some are present', () => {
      const now = new Date();
      const item: ItemProperties<'S1'> = {
        prop1: 'value1',
        events: { created: { at: now } },
      };
      const result = createEvents(item);
      expect(result.events?.created?.at).toEqual(now);
      expect(result.events?.updated?.at).toBeInstanceOf(Date);
      expect(result.events?.deleted?.at).toBeNull();
    });

    it('should not overwrite existing events', () => {
      const now = new Date();
      const item: ItemProperties<'S1'> = {
        prop1: 'value1',
        events: {
          created: { at: now },
          updated: { at: now },
          deleted: { at: null },
        },
      };
      const result = createEvents(item);
      expect(result.events?.created?.at).toEqual(now);
      expect(result.events?.updated?.at).toEqual(now);
      expect(result.events?.deleted?.at).toBeNull();
    });
  });

  describe('updateEvents', () => {
    it('should update the updated event and add created if missing', () => {
      const item: ItemProperties<'S1'> = { prop1: 'value1' };
      const result = updateEvents(item);
      expect(result.events?.updated?.at).toBeInstanceOf(Date);
      expect(result.events?.created?.at).toBeInstanceOf(Date);
    });

    it('should update the updated event and preserve created if present', () => {
      const createdDate = new Date('2020-01-01T00:00:00Z');
      const item: ItemProperties<'S1'> = {
        prop1: 'value1',
        events: { created: { at: createdDate } },
      };
      const result = updateEvents(item);
      expect(result.events?.updated?.at).toBeInstanceOf(Date);
      expect(result.events?.created?.at).toEqual(createdDate);
    });

    it('should only update the updated event if created is present and valid', () => {
      const createdDate = new Date('2020-01-01T00:00:00Z');
      const item: ItemProperties<'S1'> = {
        prop1: 'value1',
        events: {
          created: { at: createdDate },
          updated: { at: new Date('2021-01-01T00:00:00Z') },
        },
      };
      const result = updateEvents(item);
      expect(result.events?.updated?.at).toBeInstanceOf(Date);
      expect(result.events?.created?.at).toEqual(createdDate);
    });
  });
});

import {
  Evented,
  ItemProperties
} from '@fjell/core';
import deepmerge from 'deepmerge';
  
import LibLogger from '@/logger';
  
const logger = LibLogger.get('firestore', 'EventCoordinator');

//#region Event Managmeent Methods
export const createEvents = <
S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never
>(item: ItemProperties<S, L1, L2, L3, L4, L5>):
      ItemProperties<S, L1, L2, L3, L4, L5> => {
  logger.default('Creating Events', { item });
  const currentDate = new Date();
  
  let events = item.events;
  
  if (events) {
    if (!events.created) {
      events = deepmerge(events, { created: { at: currentDate } });
    }
    if (!events.updated) {
      events = deepmerge(events, { updated: { at: currentDate } });
    }
    if (!events.deleted) {
      events = deepmerge(events, { deleted: { at: null } });
    }
  
  } else {
    events = {
      created: { at: currentDate },
      updated: { at: currentDate },
      deleted: { at: null },
    };
  }
  
  return deepmerge(item, { events }) as
        ItemProperties<S, L1, L2, L3, L4, L5>;
}
  
export const updateEvents = <
    S extends string,
    L1 extends string = never,
    L2 extends string = never,
    L3 extends string = never,
    L4 extends string = never,
    L5 extends string = never
  >(item: ItemProperties<S, L1, L2, L3, L4, L5>):
      ItemProperties<S, L1, L2, L3, L4, L5> => {
  logger.default('Updating Events', { item });
  const currentDate = new Date();
  const events: Evented = {
    updated: { at: currentDate },
  };
  
  // TODO: This is clean-up code, we should remove it
  // If the event lacks a created data, let's just insert it here...
  if (!item.events || !item.events.created || !item.events.created.at) {
    events.created = { at: currentDate };
  }
  
  return deepmerge(item, { events }) as ItemProperties<S, L1, L2, L3, L4, L5>;
}
//#endregion

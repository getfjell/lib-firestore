import { AllItemTypeArrays, Item, ItemEvent, RecursivePartial } from "@fjell/core";
import { addKey } from "./KeyMaster";

import LibLogger from "@/logger";
import { DocumentSnapshot, Timestamp } from "@google-cloud/firestore";

const logger = LibLogger.get('firestore', 'DocProcessor');

const convertDates = <S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never>(
    item: RecursivePartial<Item<S, L1, L2, L3, L4, L5>>
  ): void => {
  const events = item.events as Record<string, ItemEvent>;
  logger.default('Converting Dates', { item });
  if (events) {
    Object.keys(events).forEach((key: string) => {

      const at = events[key].at;
      if (at) {
        if (at instanceof Timestamp) {
          logger.default('Converting Date', { key, events });
          events[key].at = at.toDate();
        }
      }
    });
  }
  Object.assign(item, { events });
};

export const processDoc = <S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never>(
    doc: DocumentSnapshot,
    keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>,
  ): Item<S, L1, L2, L3, L4, L5> => {
  logger.default('Processing Doc', { doc });
  const item = doc.data() as any;
  addKey(item, doc, keyTypes);
  convertDates(item);
  logger.default('Processed Doc: ' + JSON.stringify(item));
  return item as Item<S, L1, L2, L3, L4, L5>;
};

import { AllItemTypeArrays, Item, ItemEvent, RecursivePartial } from "@fjell/core";
import { addKey } from "./KeyMaster";
import * as Library from "@fjell/lib";
import {
  AggregationDefinition,
  buildAggregation,
  contextManager,
  createOperationContext,
  OperationContext
} from "@fjell/lib";

import LibLogger from "./logger";
import { DocumentSnapshot, Timestamp } from "@google-cloud/firestore";
import { buildFirestoreReference, FirestoreReferenceDefinition } from "./processing/ReferenceBuilder";

const logger = LibLogger.get('DocProcessor');

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

export const processDoc = async <S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never>(
  doc: DocumentSnapshot,
  keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>,
  referenceDefinitions: FirestoreReferenceDefinition[],
  aggregationDefinitions: AggregationDefinition[],
  registry: Library.Registry,
  context?: OperationContext
): Promise<Item<S, L1, L2, L3, L4, L5>> => {
  logger.default('Processing Doc', { doc });
  const itemData = doc.data();
  if (!itemData) {
    logger.error('Document data is undefined', { docId: doc.id });
    throw new Error(`Document data for doc.id='${doc.id}' is undefined.`);
  }

  // Use provided context or create new one
  const operationContext = context || createOperationContext();

  // Process the doc within the context to ensure all operations share the same context
  return contextManager.withContext(operationContext, async () => {
    let item = itemData as any;
    addKey(item, doc, keyTypes);
    convertDates(item);
    logger.default('Key Added to Item', { key: item.key });

    // Mark this item as in progress to detect circular references
    operationContext.markInProgress(item.key);

    try {
      // Process references if defined
      if (referenceDefinitions && referenceDefinitions.length > 0) {
        for (const referenceDefinition of referenceDefinitions) {
          logger.default('Processing Reference', {
            keyType: item.key.kt,
            referenceName: referenceDefinition.name
          });
          item = await buildFirestoreReference(item, referenceDefinition, registry, operationContext);
        }
      }

      // Process aggregations if defined
      if (aggregationDefinitions && aggregationDefinitions.length > 0) {
        for (const aggregationDefinition of aggregationDefinitions) {
          logger.default('Processing Aggregation', {
            keyType: item.key.kt,
            aggregationKta: aggregationDefinition.kta
          });
          item = await buildAggregation(item, aggregationDefinition, registry, operationContext);
        }
      }

      // Cache the fully processed item
      operationContext.setCached(item.key, item);
    } finally {
      // Mark this item as complete
      operationContext.markComplete(item.key);
    }

    logger.default('Processed Doc: ' + JSON.stringify(item));
    return item as Item<S, L1, L2, L3, L4, L5>;
  });
};

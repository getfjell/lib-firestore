/* eslint-disable no-undefined */

import {
  ComKey,
  CompoundCondition,
  Condition,
  EventQuery,
  isComKey,
  isCondition,
  isPriKey,
  ItemQuery,
  LocKey,
  OrderBy,
  PriKey,
  References
} from '@fjell/core';
import {
  CollectionGroup,
  CollectionReference,
  Query
} from '@google-cloud/firestore';

import LibLogger from './logger';

const logger = LibLogger.get('QueryBuilder');

const addDeleteQuery = (query: Query): Query => {
  logger.default('Adding Delete Query', { query });
  return query.where('events.deleted.at', '==', null);
}

const addEventQueries = (query: Query, events: Record<string, EventQuery>): Query => {
  logger.default('Adding Event Queries', { query, events });
  let retQuery = query;
  Object.keys(events).forEach((key: string) => {
    const event = events[key];
    if (event.start) {
      retQuery = retQuery.where(`events.${key}.at`, '>=', new Date(event.start));
    }
    if (event.end) {
      retQuery = retQuery.where(`events.${key}.at`, '<', new Date(event.end));
    }
    if (event.by) {
      retQuery = retQuery.where(`events.${key}.by.pk`, '==', event.by);
    }
  });
  return retQuery;
}

// Add the references to the query
const addReferenceQueries = (query: Query, references: References): Query => {
  logger.default('Adding Reference Queries', { query, references });
  let retQuery = query;
  Object.keys(references).forEach((key: string) => {
    logger.default('Adding Reference Query', { key, references });
    const refValue = references[key];
    const keyValue = (refValue as any).key || refValue;
    
    if (isComKey(keyValue)) {
      const ComKey: ComKey<string, string, string | never, string | never, string | never, string | never> =
        keyValue as ComKey<string, string, string | never, string | never, string | never, string | never>;
      retQuery = retQuery.where(`refs.${key}.key.pk`, '==', ComKey.pk);
      if (ComKey.kt) {
        retQuery = retQuery.where(`refs.${key}.key.kt`, '==', ComKey.kt);
      }
      ComKey.loc.forEach((
        loc: LocKey<string>,
        index: number) => {
        retQuery = retQuery.where(`refs.${key}.key.loc.${index}.lk`, '==', loc.lk);
        if (loc.kt) {
          retQuery = retQuery.where(`refs.${key}.key.loc.${index}.kt`, '==', loc.kt);
        }
      });
    } else if (isPriKey(keyValue)) {
      const PriKey: PriKey<string> = keyValue as PriKey<string>;
      retQuery = retQuery.where(`refs.${key}.key.pk`, '==', PriKey.pk);
      if (PriKey.kt) {
        retQuery = retQuery.where(`refs.${key}.key.kt`, '==', PriKey.kt);
      }
    }
  });
  return retQuery;
}
 
const applyAndConditions = (query: Query, compoundCondition: CompoundCondition): Query => {
  logger.default('Applying AND conditions', { compoundCondition });
  const conditions: Array<Condition | CompoundCondition> = compoundCondition.conditions;
  
  let resultQuery = query;
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    if (isCondition(condition)) {
      const cond: Condition = condition as Condition;
      
      logger.default('Applying condition', {
        column: cond.column,
        operator: cond.operator,
        value: cond.value,
        conditionKeys: Object.keys(cond),
        fullCondition: JSON.stringify(cond)
      });

      // Validate field path - this is the most common source of Firestore errors
      if (cond.column === undefined || cond.column === null) {
        logger.default('Invalid field path detected - undefined/null', { column: cond.column, type: typeof cond.column, fullCondition: cond });
        throw new Error(`Invalid field path: column is ${cond.column}. Field paths must be non-empty strings.`);
      }

      if (typeof cond.column !== 'string') {
        logger.default('Invalid field path detected - not a string', { column: cond.column, type: typeof cond.column, fullCondition: cond });
        throw new Error(`Invalid field path: "${JSON.stringify(cond.column)}" (type: ${typeof cond.column}). Field paths must be strings.`);
      }

      if (cond.column.trim() === '') {
        logger.default('Invalid field path detected - empty string', { column: cond.column, fullCondition: cond });
        throw new Error(`Invalid field path: empty string. Field paths must be non-empty strings.`);
      }

      logger.default('Applying where clause', {
        column: cond.column,
        columnType: typeof cond.column,
        columnLength: cond.column?.length,
        operator: cond.operator || '==',
        value: cond.value,
        valueType: typeof cond.value
      });
      
      // Apply the condition using the traditional three-argument form
      resultQuery = resultQuery.where(cond.column, cond.operator || '==', cond.value);
    } else {
      // Nested compound conditions
      if ((condition as CompoundCondition).compoundType === 'AND') {
        resultQuery = applyAndConditions(resultQuery, condition as CompoundCondition);
      } else {
        throw new Error('OR conditions within AND are not supported in Firestore v7');
      }
    }
  }
  
  return resultQuery;
}

export const buildQuery = (
  itemQuery: ItemQuery,
  collectionReference: CollectionReference | CollectionGroup
): Query => {
  logger.default('buildQuery', { itemQuery, collectionReference });

  let itemsQuery: Query = collectionReference;
  itemsQuery = addDeleteQuery(itemsQuery);
  if (itemQuery.refs) {
    itemsQuery = addReferenceQueries(itemsQuery, itemQuery.refs);
  }
  if (itemQuery.events) {
    itemsQuery = addEventQueries(itemsQuery, itemQuery.events);
  }

  // TODO: Once we start to support Aggs on the server-side, we'll need to parse agg queries

  if (itemQuery.compoundCondition) {
    logger.default('Adding Conditions', { compoundCondition: itemQuery.compoundCondition });
    // For v7 compatibility, we need to apply conditions differently
    if (itemQuery.compoundCondition.compoundType === 'AND') {
      // AND conditions can be applied sequentially
      itemsQuery = applyAndConditions(itemsQuery, itemQuery.compoundCondition);
    } else {
      // OR conditions are not supported in Firestore v7 without composite indexes
      logger.default('OR conditions are not directly supported in Firestore v7');
      throw new Error('OR conditions require Firestore SDK v10+ or composite indexes. Consider upgrading @google-cloud/firestore to v10.1.0 or higher.');
    }
  }

  // Apply a limit to the result set
  if (itemQuery.limit) {
    logger.default('Limiting to', { limit: itemQuery.limit });
    itemsQuery = itemsQuery.limit(itemQuery.limit);
  }

  // Apply an offset to the result set
  if (itemQuery.offset) {
    itemsQuery = itemsQuery.offset(itemQuery.offset);
  }

  // Add orderBy to the query
  if (itemQuery.orderBy) {
    itemQuery.orderBy.forEach((orderBy: OrderBy) => {
      // Use dot notation for field paths - Firestore supports this natively
      itemsQuery = itemsQuery.orderBy(orderBy.field, orderBy.direction);
    });
  }

  return itemsQuery;
}

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
  Filter,
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
    if (isComKey(references[key])) {
      const ComKey: ComKey<string, string, string | never, string | never, string | never, string | never> =
        references[key] as ComKey<string, string, string | never, string | never, string | never, string | never>;
      retQuery = retQuery.where(`refs.${key}.pk`, '==', ComKey.pk);
      if (ComKey.kt) {
        retQuery = retQuery.where(`refs.${key}.kt`, '==', ComKey.kt);
      }
      ComKey.loc.forEach((
        loc: LocKey<string>,
        index: number) => {
        retQuery = retQuery.where(`refs.${key}.loc.${index}.lk`, '==', loc.lk);
        if (loc.kt) {
          retQuery = retQuery.where(`refs.${key}.loc.${index}.kt`, '==', loc.kt);
        }
      });
    } else if (isPriKey(references[key])) {
      const PriKey: PriKey<string> = references[key] as PriKey<string>;
      retQuery = retQuery.where(`refs.${key}.pk`, '==', PriKey.pk);
      if (PriKey.kt) {
        retQuery = retQuery.where(`refs.${key}.kt`, '==', PriKey.kt);
      }
    }
  });
  return retQuery;
}
 
const createFilter = (compoundCondition: CompoundCondition): Filter => {
  logger.default('Adding Compound Condition', { compoundCondition });
  const compoundType = compoundCondition.compoundType;
  const conditions: Array<Condition | CompoundCondition> = compoundCondition.conditions;

  const filters: Filter[] = [];
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    if (isCondition(condition)) {
      const cond: Condition = condition as Condition;
      // Use dot notation for field paths - Firestore supports this natively
      logger.default('Creating filter with column', { column: cond.column, operator: cond.operator, value: cond.value });

      // Validate field path - this is the most common source of Firestore errors
      if (cond.column === undefined || cond.column === null) {
        logger.error('Invalid field path detected - undefined/null', { column: cond.column, type: typeof cond.column, fullCondition: cond });
        throw new Error(`Invalid field path: column is ${cond.column}. Field paths must be non-empty strings.`);
      }

      if (typeof cond.column !== 'string') {
        logger.error('Invalid field path detected - not a string', { column: cond.column, type: typeof cond.column, fullCondition: cond });
        throw new Error(`Invalid field path: "${JSON.stringify(cond.column)}" (type: ${typeof cond.column}). Field paths must be strings.`);
      }

      if (cond.column.trim() === '') {
        logger.error('Invalid field path detected - empty string', { column: cond.column, fullCondition: cond });
        throw new Error(`Invalid field path: empty string. Field paths must be non-empty strings.`);
      }

      logger.default('About to call Filter.where', {
        column: cond.column,
        columnType: typeof cond.column,
        columnLength: cond.column?.length,
        operator: cond.operator || '==',
        value: cond.value,
        valueType: typeof cond.value
      });
      filters.push(Filter.where(cond.column, cond.operator || '==', cond.value));
    } else {
      filters.push(createFilter(condition as CompoundCondition));
    }
  }

  let filter: Filter;
  if (compoundType === 'AND') {
    filter = Filter.and(...filters);
  } else {
    filter = Filter.or(...filters);
  }
  return filter;
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
    // Use proper Filter.or() and Filter.and() implementation for compound conditions
    const filter = createFilter(itemQuery.compoundCondition);
    // Pass the filter directly as a single argument to where()
    itemsQuery = (itemsQuery as any).where(filter);
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

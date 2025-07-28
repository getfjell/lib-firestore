
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
  logger.debug('Adding Delete Query', { query });
  return query.where('events.deleted.at', '==', null);
}
  
const addEventQueries = (query: Query, events: Record<string, EventQuery>): Query => {
  logger.debug('Adding Event Queries', { query, events });
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
  logger.debug('Adding Reference Queries', { query, references });
  let retQuery = query;
  Object.keys(references).forEach((key: string) => {
    logger.debug('Adding Reference Query', { key, references });
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
        retQuery = retQuery.where(`refs.${key}.loc[${index}].lk`, '==', loc.lk);
        if (loc.kt) {
          retQuery = retQuery.where(`refs.${key}.loc[${index}].kt`, '==', loc.kt);
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
  logger.debug('Adding Compound Condition', { compoundCondition });
  const compoundType = compoundCondition.compoundType;
  const conditions: Array<Condition | CompoundCondition> = compoundCondition.conditions;
  
  const filters: Filter[] = [];
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    if (isCondition(condition)) {
      const cond: Condition = condition as Condition;
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
  logger.debug('buildQuery', { itemQuery, collectionReference });

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
    logger.debug('Adding Conditions', { compoundCondition: itemQuery.compoundCondition });
    itemsQuery = itemsQuery.where(createFilter(itemQuery.compoundCondition));
  }
  
  // Apply a limit to the result set
  if (itemQuery.limit) {
    logger.debug('Limiting to', { limit: itemQuery.limit });
    itemsQuery = itemsQuery.limit(itemQuery.limit);
  }
  
  // Apply an offset to the result set
  if (itemQuery.offset) {
    itemsQuery = itemsQuery.offset(itemQuery.offset);
  }
  
  // Add orderBy to the query
  if (itemQuery.orderBy) {
    itemQuery.orderBy.forEach((orderBy: OrderBy) => {
      itemsQuery = itemsQuery.orderBy(orderBy.field, orderBy.direction);
    });
  }

  return itemsQuery;
}
  
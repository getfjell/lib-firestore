/**
 * AggsAdapter: Transparent wrapper for aggregations
 *
 * This module provides transparent conversion between direct aggregation properties
 * and a unified aggs structure pattern. The wrapper is completely confined to the
 * library boundaries - items are automatically wrapped when leaving libraries and
 * unwrapped when entering.
 *
 * Key Principles:
 * - Transparency: Users never need to think about wrapping/unwrapping
 * - Boundary Confinement: All complexity stays within library boundaries
 * - Automatic: Wrapping happens on output, unwrapping happens on input
 * - Unified API: External code always sees aggs structure, regardless of backend
 */

import { Item } from "@fjell/types";
import { AggregationDefinition } from "@fjell/lib";
import LibLogger from "../logger";

const logger = LibLogger.get('firestore', 'processing', 'AggsAdapter');

/**
 * Converts an item to include an aggs structure.
 * Aggregation properties are moved from direct properties to aggs[name].
 *
 * This is called automatically when items leave libraries (e.g., returned
 * from operations). The aggs structure is added transparently - external
 * code always sees items with aggs structure.
 *
 * @param item - The item (plain object)
 * @param aggregationDefinitions - Array of AggregationDefinition configs
 * @returns The item with an aggs structure added
 */
export function addAggsToItem<T extends Item<any, any, any, any, any, any>>(
  item: T,
  aggregationDefinitions: AggregationDefinition[]
): T & { aggs: Record<string, any> } {
  if (!aggregationDefinitions || aggregationDefinitions.length === 0) {
    return item as T & { aggs: Record<string, any> };
  }

  const aggs: Record<string, any> = {};
  const result = { ...item } as any;

  for (const aggDef of aggregationDefinitions) {
    const aggregationValue = item[aggDef.property as keyof T];
    
    if (typeof aggregationValue !== 'undefined') {
      // Move aggregation from direct property to aggs structure
      aggs[aggDef.property] = aggregationValue;
      // Remove from direct properties
      delete result[aggDef.property];
      logger.debug(`Moved aggregation '${aggDef.property}' to aggs structure`, {
        property: aggDef.property,
        hasValue: typeof aggregationValue !== 'undefined',
        valueType: Array.isArray(aggregationValue) ? 'array' : typeof aggregationValue
      });
    } else {
      logger.debug(`Aggregation '${aggDef.property}' is undefined, skipping`, {
        property: aggDef.property
      });
    }
  }

  // Only add aggs property if there are aggregations
  if (Object.keys(aggs).length > 0) {
    return {
      ...result,
      aggs
    } as T & { aggs: Record<string, any> };
  }

  return item as T & { aggs: Record<string, any> };
}

/**
 * Removes the aggs structure from an item, converting it back to
 * direct properties. This is mainly for consistency since aggregations
 * are read-only and typically not written back.
 *
 * This is called automatically when items enter libraries (e.g., passed
 * to create/update operations). The aggs structure is removed transparently.
 *
 * @param item - The item with aggs structure
 * @param aggregationDefinitions - Array of AggregationDefinition configs
 * @returns The item without aggs structure, with aggregations as direct properties
 */
export function removeAggsFromItem<T extends Partial<Item<any, any, any, any, any, any>> & { aggs?: Record<string, any> }>(
  item: T,
  aggregationDefinitions: AggregationDefinition[]
): T {
  if (!aggregationDefinitions || aggregationDefinitions.length === 0) {
    return item;
  }

  const result = { ...item } as any;

  // If item has aggs structure, move aggregations back to direct properties
  if (result.aggs && typeof result.aggs === 'object') {
    for (const aggDef of aggregationDefinitions) {
      if (typeof result.aggs[aggDef.property] !== 'undefined') {
        result[aggDef.property] = result.aggs[aggDef.property];
        logger.debug(`Moved aggregation '${aggDef.property}' from aggs to direct property`, {
          property: aggDef.property
        });
      }
    }
    // Remove aggs property
    delete result.aggs;
  }
  // If no aggs structure, preserve original aggregation values (no change needed)

  return result as T;
}


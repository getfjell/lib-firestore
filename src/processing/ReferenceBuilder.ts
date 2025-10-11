import { ComKey, Item, PriKey } from "@fjell/core";
import type { ReferenceDefinition, Registry } from "@fjell/lib";
import { OperationContext } from "@fjell/lib";
import logger from "../logger";

// Type alias for the Reference structure
type ItemReference = { key: PriKey<any> | ComKey<any, any, any, any, any, any>, item?: Item<any, any, any, any, any, any> };

/**
 * Firestore-specific definition for a reference relationship.
 * References in Firestore are stored in the `refs` property of an item.
 * Extends the base ReferenceDefinition to ensure type compatibility.
 */
export interface FirestoreReferenceDefinition extends ReferenceDefinition {
  /** Name of the reference in the refs object */
  name: string;
  /**
   * Key type array of the referenced item (optional).
   * If not provided, it will be derived from refs[name].kt
   */
  kta?: string[];
  /**
   * Primary key value (optional).
   * If not provided, it will be derived from refs[name].pk
   */
  pk?: string;
}

/**
 * Build a reference by looking up a related item by its key from the refs property.
 * The referenced item will be populated at refs[name].item
 *
 * @param item - The item to populate with reference data
 * @param referenceDefinition - Firestore-specific definition of what to reference
 * @param registry - Registry to look up library instances
 * @param context - Optional operation context for caching and cycle detection
 * @returns The item with the reference populated at refs[name].item
 */
export const buildFirestoreReference = async (
  item: any,
  referenceDefinition: FirestoreReferenceDefinition,
  registry: Registry,
  context?: OperationContext
) => {
  const libLogger = logger.get('processing', 'ReferenceBuilder');
  
  // Initialize refs if it doesn't exist
  if (!item.refs) {
    item.refs = {};
  }

  // Get or initialize the reference object
  if (!item.refs[referenceDefinition.name]) {
    libLogger.default(`Reference "${referenceDefinition.name}" not found in item.refs`, { item });
    return item;
  }

  const ref = item.refs[referenceDefinition.name];
  
  // Check if the reference is null or undefined - if so, skip
  if (ref == null) {
    return item;
  }

  // Extract the key from the reference structure
  // Handle both legacy format (direct key) and new format (key wrapped in 'key' property)
  let refKey;
  if (ref.key) {
    // New format: ref.key exists
    refKey = ref.key;
  } else if (ref.kt && ref.pk) {
    // Legacy format: ref is the key itself
    refKey = ref;
  } else {
    libLogger.error('Invalid reference format', { ref, referenceName: referenceDefinition.name });
    throw new Error(
      `Invalid reference format for "${referenceDefinition.name}". ` +
      `Expected either { key: { kt, pk } } or { kt, pk } format.`
    );
  }
  
  // Check if the reference key is null or undefined - if so, skip
  if (refKey == null) {
    return item;
  }

  // Derive the key type array and primary key from the reference or definition
  let kta: string[];
  let pk: string | number;

  if (typeof refKey === 'object' && 'kt' in refKey && 'pk' in refKey) {
    // It's a PriKey or ComKey
    kta = referenceDefinition.kta || [refKey.kt];
    pk = refKey.pk;
  } else {
    libLogger.error('Invalid reference key format', { refKey, referenceName: referenceDefinition.name });
    throw new Error(
      `Invalid reference key format for "${referenceDefinition.name}". ` +
      `Expected a PriKey or ComKey with kt and pk properties.`
    );
  }

  // For multikey references, we assume that the primary key of the first key type is unique
  const primaryKeyType = kta[0];

  if (kta.length > 1) {
    libLogger.debug(
      'Using multikey reference with PriKey assumption',
      {
        kta,
        primaryKeyType,
        name: referenceDefinition.name
      }
    );
  }

  // Check if dependencies exist
  if (!registry) {
    throw new Error(
      `This model definition has a reference definition, but the registry is not present. ` +
      `Reference name: '${referenceDefinition.name}', ` +
      `key types: [${kta.join(', ')}]`
    );
  }

  // Find the Library instance for the key type
  const library: any = registry.get(kta as any);
  if (!library) {
    throw new Error(
      `This model definition has a reference definition, but the dependency is not present in registry. ` +
      `Reference name: '${referenceDefinition.name}', ` +
      `missing key type: '${primaryKeyType}'`
    );
  }

  // Create a PriKey using the primary key value
  const priKey: PriKey<string> = {
    kt: primaryKeyType,
    pk: pk
  };

  let referencedItem;

  if (context) {
    // Check if we already have this item cached
    if (context.isCached(priKey)) {
      libLogger.debug('Using cached reference', { priKey, name: referenceDefinition.name });
      referencedItem = context.getCached(priKey);
    }
    // Check if this item is currently being loaded (circular dependency)
    else if (context.isInProgress(priKey)) {
      libLogger.debug('Circular dependency detected, creating reference placeholder', {
        priKey,
        name: referenceDefinition.name
      });

      // Create a minimal reference object with just the key to break the cycle
      referencedItem = {
        key: priKey,
        // This prevents infinite loops while still providing the key for identification
      };
    }
    else {
      // Mark this key as in progress before loading
      context.markInProgress(priKey);
      try {
        // Get the referenced item using the Library.Operations get method
        referencedItem = await library!.operations.get(priKey);

        // Cache the result
        context.setCached(priKey, referencedItem);
      } catch (error: any) {
        throw error; // Re-throw to maintain original behavior
      } finally {
        // Always mark as complete, even if there was an error
        context.markComplete(priKey);
      }
    }
  } else {
    // Fallback to original behavior if no context provided
    referencedItem = await library!.operations.get(priKey);
  }

  // Store the referenced item at refs[name].item
  // Preserve the key structure by converting the simple key to a ReferenceItem structure
  item.refs[referenceDefinition.name] = {
    key: refKey,
    item: referencedItem
  };

  return item;
};

/**
 * Strip populated reference items from refs before writing to Firestore.
 * This ensures we only store the keys, not the full populated items.
 *
 * @param item - The item to strip references from
 * @returns The item with only reference keys (no populated items)
 */
export const stripReferenceItems = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>): Partial<Item<S, L1, L2, L3, L4, L5>> => {
  if (!item.refs) {
    return item;
  }

  // Create a new refs object with only the keys (no populated items)
  const strippedRefs: Record<string, ItemReference> = {};
  
  for (const [name, value] of Object.entries(item.refs)) {
    if (value && typeof value === 'object' && 'key' in value) {
      // It's a Reference with key and possibly item - keep only the key
      strippedRefs[name] = {
        key: (value as any).key as PriKey<any> | ComKey<any, any, any, any, any, any>
      };
    } else {
      // Legacy format: It's just a key (PriKey or ComKey) - wrap it in the new structure
      const keyValue = (value as any).key || value;
      strippedRefs[name] = {
        key: keyValue as PriKey<any> | ComKey<any, any, any, any, any, any>
      };
    }
  }

  return {
    ...item,
    refs: strippedRefs as any // Type cast needed due to Record<string, ItemReference> compatibility
  };
};


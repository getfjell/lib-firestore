# Firestore Reference Implementation

## Overview

This document describes the Firestore-specific implementation of references, which differs from the Sequelize-based approach used in `@fjell/lib`.

## Key Differences from Sequelize

### Sequelize Approach (lib)
- Uses `column` property to identify the foreign key column (e.g., "authorId")
- Foreign keys are stored directly as properties on the item
- Referenced items are populated directly into a property (e.g., `item.author`)

### Firestore Approach (lib-firestore)
- Uses `name` property to identify the reference in the `refs` object
- References are stored in a `refs` property as key objects (PriKey or ComKey)
- Referenced items are populated at `refs[name].item`

## Structure

### Reference Definition

```typescript
export interface FirestoreReferenceDefinition {
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
```

### Item Structure

```typescript
{
  key: { kt: 'post', pk: '1' },
  title: 'My Post',
  content: 'Post content',
  refs: {
    author: { kt: 'user', pk: 'user123' },  // Before population
    // After population:
    author: {
      key: { kt: 'user', pk: 'user123' },
      item: {
        key: { kt: 'user', pk: 'user123' },
        name: 'John Doe',
        email: 'john@example.com'
        // ... other user properties
      }
    }
  }
}
```

## Implementation

### 1. Reference Builder (`buildFirestoreReference`)

Located in: `src/processing/ReferenceBuilder.ts`

This function:
- Reads the reference key from `item.refs[name]`
- Looks up the referenced item using the library from the registry
- Populates the result at `item.refs[name].item`
- Supports caching and circular reference detection via `OperationContext`

### 2. Reference Stripper (`stripReferenceItems`)

Located in: `src/processing/ReferenceBuilder.ts`

This function:
- Strips populated items from `refs[name].item` before writing to Firestore
- Ensures only the key structure is persisted to the database
- Used in create and update operations

### 3. Integration Points

#### DocProcessor
- Uses `buildFirestoreReference` to populate references when reading documents
- Processes all references defined in options

#### Create Operation
- Uses `stripReferenceItems` before writing to Firestore
- Ensures populated reference items are not persisted

#### Update Operation
- Uses `stripReferenceItems` before writing to Firestore
- Ensures populated reference items are not persisted

## Usage Example

```typescript
import { createFirestoreLibrary, FirestoreReferenceDefinition } from '@fjell/lib-firestore';

// Define options with references
const options = {
  references: [
    {
      name: 'author',
      kta: ['user']
    },
    {
      name: 'category',
      kta: ['category']
    }
  ]
};

// Create library
const postLibrary = createFirestoreLibrary(
  ['post'],
  ['posts'],
  firestore,
  options,
  [],
  registry
);

// When you get a post, references will be populated
const post = await postLibrary.operations.get({ kt: 'post', pk: '1' });
console.log(post.refs.author.item.name); // 'John Doe'

// When you create/update a post with populated references, they will be stripped
await postLibrary.operations.create({
  title: 'New Post',
  refs: {
    author: {
      key: { kt: 'user', pk: 'user123' },
      item: { /* populated user */ }  // This will be stripped before write
    }
  }
});
```

## Testing

Comprehensive tests are available in:
- `tests/processing/ReferenceBuilder.test.ts` - Tests for the Firestore-specific reference builder
- `tests/DocProcessor.test.ts` - Tests for reference processing during document reads
- `tests/Options.test.ts` - Tests for Firestore-specific options

## Migration from Sequelize References

If migrating from `@fjell/lib` (Sequelize) to `@fjell/lib-firestore`, you need to:

1. Change `column` to `name` in reference definitions
2. Move foreign key values from direct properties to `refs[name]`
3. Update code that accesses referenced items from `item.property` to `item.refs[name].item`

Example migration:

```typescript
// Before (Sequelize)
{
  column: 'authorId',
  kta: ['user'],
  property: 'author'
}
// Access: item.author.name

// After (Firestore)
{
  name: 'author',
  kta: ['user']
}
// Access: item.refs.author.item.name
```

## Architecture Notes

- The Firestore implementation maintains separation from the generic `@fjell/lib` implementation
- Both implementations share the same registry and operation context infrastructure
- The `Options` type in lib-firestore extends the base library but uses `FirestoreReferenceDefinition` instead of `ReferenceDefinition`
- This allows for implementation-specific reference handling while maintaining compatibility with the rest of the Fjell ecosystem


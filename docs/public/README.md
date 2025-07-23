# @fjell/lib-firestore

Firestore integration for the Fjell ecosystem providing NoSQL database implementations for Google Cloud Firestore.

## New Architecture (v4.4.12+)

This library now uses the new **FirestoreLibrary** architecture that extends `@fjell/lib`:

```
fjell-registry.Instance
  ↓ extends
fjell-lib.Library
  ↓ extends
fjell-lib-firestore.FirestoreLibrary
```

## Installation

```bash
npm install @fjell/lib-firestore @fjell/lib @fjell/registry firebase-admin
```

## Quick Start

### New FirestoreLibrary API (v4.4.12+)

```typescript
import { createRegistry } from '@fjell/registry';
import { createFirestoreLibrary, FirestoreLibrary } from '@fjell/lib-firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firestore
const app = initializeApp();
const firestore = getFirestore(app);

// Create a FirestoreLibrary
const userLibrary: FirestoreLibrary<UserItem, 'user'> = createFirestoreLibrary(
  ['user'], // Key type array
  ['users'], // Collection names
  firestore,
  {
    validators: {
      email: (email) => email.includes('@')
    },
    hooks: {
      beforeCreate: async (user) => {
        user.createdAt = new Date();
        return user;
      }
    }
  },
  [], // Scopes
  registry
);

// Use the library
const users = await userLibrary.operations.all({});
const newUser = await userLibrary.operations.create({
  name: 'Alice Johnson',
  email: 'alice@example.com'
});

// Access Firestore-specific features
console.log('Firestore project:', userLibrary.firestore.projectId);
```



## Features

### FirestoreLibrary Extends Library

The `FirestoreLibrary` interface adds:
- **firestore**: Firestore database instance
- **All Library features**: operations, options, coordinate, registry

```typescript
interface FirestoreLibrary<T, S> extends Library<T, S> {
  firestore: FirebaseFirestore.Firestore;
}
```

### NoSQL Operations

Built-in operations automatically use Firestore collections:

```typescript
// CRUD operations use Firestore under the hood
await userLibrary.operations.create(userData);
await userLibrary.operations.find({ filter: { email: 'alice@example.com' } });
await userLibrary.operations.update(['user-123'], { name: 'Alice Smith' });
await userLibrary.operations.remove(['user-123']);

// Advanced queries with Firestore features
await userLibrary.operations.all({
  filter: {
    status: 'active',
    createdAt: { '>=': new Date('2024-01-01') }
  },
  sort: { createdAt: 'desc' },
  limit: 10
});
```

### Collection Integration

Your Firestore collections are automatically managed:

```typescript
// Create FirestoreLibrary with collection configuration
const userLibrary = createFirestoreLibrary(
  ['user'],
  ['users'], // Collection name in Firestore
  firestore,
  options
);

// Operations automatically use the 'users' collection
const users = await userLibrary.operations.all({}); // Query users collection
```

## Advanced Usage

### Multiple Collections

```typescript
// User library with multiple related collections
const userLibrary = createFirestoreLibrary(
  ['user'],
  ['users', 'user_profiles', 'user_settings'], // Multiple collections
  firestore,
  {
    hooks: {
      afterCreate: async (user) => {
        // Automatically create profile and settings documents
        await firestore.collection('user_profiles').doc(user.id).set({
          userId: user.id,
          displayName: user.name
        });
        await firestore.collection('user_settings').doc(user.id).set({
          userId: user.id,
          theme: 'light'
        });
      }
    }
  }
);
```

### Custom Operations

```typescript
import { createOperations } from '@fjell/lib-firestore';

const customOperations = createOperations(firestore, definition, registry, {
  // Custom business logic
  actions: {
    activate: async (keys, params) => {
      const userRef = firestore.collection('users').doc(keys[0]);
      await userRef.update({
        status: 'active',
        activatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    }
  },

  // Custom analytics using Firestore aggregation
  facets: {
    userStats: async (query, options) => {
      const snapshot = await firestore.collection('users').get();
      const users = snapshot.docs.map(doc => doc.data());
      return {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        byRegion: groupBy(users, 'region')
      };
    }
  }
});
```

### Hierarchical Data with Subcollections

Support for contained items with Firestore subcollections:

```typescript
// Order library with location hierarchy
const orderItemLibrary = createFirestoreLibrary(
  ['orderItem', 'order', 'customer'], // Nested hierarchy
  ['customers/{customerId}/orders/{orderId}/items'], // Subcollection path
  firestore,
  options
);

// Query order items with location context
const orderItems = await orderItemLibrary.operations.all({}, ['order-123', 'customer-456']);
```

### Real-time Updates

Firestore real-time capabilities:

```typescript
// Set up real-time listener (custom implementation)
const unsubscribe = firestore
  .collection('users')
  .where('status', '==', 'active')
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        console.log('New user:', change.doc.data());
      }
    });
  });
```

## Migration Guide

### From v4.4.11 and earlier

1. **No breaking changes** - existing code continues to work
2. **Optional migration** to new naming:

```typescript
// Clean Library architecture
import { createFirestoreLibrary, FirestoreLibrary } from '@fjell/lib-firestore';
```

3. **Benefits of the new architecture**:
   - Clear naming that shows inheritance hierarchy
   - Better TypeScript autocomplete and documentation
   - Future-proof as the ecosystem evolves

### Simple Setup

Use the FirestoreLibrary for all new development:

```typescript
// Clean, consistent API
const userLibrary = createFirestoreLibrary(kta, collections, firestore, options);
const orderLibrary = createFirestoreLibrary(orderKta, orderCollections, firestore, orderOptions);
```

## Architecture Benefits

1. **Clear Inheritance**: Shows how FirestoreLibrary extends Library
2. **Type Safety**: Full TypeScript support throughout the hierarchy
3. **NoSQL Focus**: FirestoreLibrary is clearly Firestore-specific
4. **Real-time Ready**: Built for Firestore's real-time capabilities
5. **Clean API**: Consistent naming and patterns across all libraries

## Firestore-Specific Features

### Document References

```typescript
// Working with document references
const userRef = firestore.collection('users').doc('user-123');
const user = await userLibrary.operations.get(['user-123']);

// Batch operations
const batch = firestore.batch();
batch.set(userRef, userData);
batch.update(profileRef, profileData);
await batch.commit();
```

### Transactions

```typescript
// Firestore transactions
await firestore.runTransaction(async (transaction) => {
  const userDoc = await transaction.get(userRef);
  if (userDoc.exists) {
    transaction.update(userRef, { lastLogin: new Date() });
  }
});
```

### Security Rules Integration

```typescript
// Design your data model to work with Firestore security rules
const orderLibrary = createFirestoreLibrary(
  ['order'],
  ['orders'],
  firestore,
  {
    // Operations automatically include user context for security rules
    hooks: {
      beforeCreate: async (order) => {
        order.ownerId = getCurrentUserId(); // For security rules
        return order;
      }
    }
  }
);
```

## Examples

See the `examples/` directory for complete working examples:
- Basic Firestore integration
- Real-time data sync
- Subcollection management
- Security rules patterns

## TypeScript Support

Full TypeScript support with proper type inference:

```typescript
import { Item } from '@fjell/core';

interface User extends Item<'user'> {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const userLibrary: FirestoreLibrary<User, 'user'> = createFirestoreLibrary(
  ['user'],
  ['users'],
  firestore,
  options
);

// Full type safety
const user: User = await userLibrary.operations.create({
  name: 'Alice',
  email: 'alice@example.com',
  status: 'active'
});
```

## Performance Considerations

### Indexing

```typescript
// Design operations with Firestore indexing in mind
await userLibrary.operations.find({
  filter: {
    status: 'active',        // Simple field index
    region: 'us-west',      // Composite index needed
    createdAt: { '>=': date } // for this combination
  }
});
```

### Pagination

```typescript
// Efficient pagination with Firestore cursors
let lastDoc = null;
const pageSize = 20;

const getNextPage = async () => {
  const query = lastDoc
    ? firestore.collection('users').startAfter(lastDoc).limit(pageSize)
    : firestore.collection('users').limit(pageSize);

  const snapshot = await query.get();
  lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return snapshot.docs.map(doc => doc.data());
};
```

## Next Steps

- Check out `@fjell/lib-sequelize` for SQL database integration
- See `@fjell/lib` for core Library functionality
- Read `@fjell/registry` for base coordination features
- Review Firestore documentation for advanced features

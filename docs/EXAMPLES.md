# Fjell Lib Firestore Examples

This directory contains example code demonstrating how to use `@fjell/lib-firestore` with Google Cloud Firestore.

## Basic Usage

The examples show different patterns for integrating Firestore with the Fjell ecosystem:

### FirestoreLibrary Architecture

The new `FirestoreLibrary` extends `@fjell/lib` to provide Firestore-specific implementations:

```typescript
import { createFirestoreLibrary } from '@fjell/lib-firestore';
import { getFirestore } from 'firebase-admin/firestore';

const library = createFirestoreLibrary(
  ['user'],
  ['users'],
  firestore
);
```

### Key Features

- **Collection Management**: Automatic collection mapping and document handling
- **Validation**: Built-in validators for data integrity
- **Hooks**: Lifecycle hooks for custom business logic
- **Query Building**: Advanced querying capabilities
- **Performance**: Optimized read/write operations

## Getting Started

1. Install dependencies:
   ```bash
   npm install @fjell/lib-firestore @fjell/lib @fjell/registry firebase-admin
   ```

2. Initialize Firestore and create your library
3. Define your data models and validation rules
4. Start building with type-safe Firestore operations

For complete examples, see the source files in this directory.

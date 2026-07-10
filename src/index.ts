export * from './Coordinate';
export * from './Definition';
export * from './FirestoreLibrary';
export * from './FirestoreLibraryFactory';
export * from './Options';
export * from './Operations';
export * from './Registry';
export * as Contained from './contained';
export * as Primary from './primary';

// DocProcessor is exported for client applications that subscribe to Firestore updates
// and need to convert Firestore Timestamps to JavaScript Date objects.
export * from './DocProcessor';

// Export Firestore-specific reference handling
export * from './processing/ReferenceBuilder';

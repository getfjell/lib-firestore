#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const containedFile = 'src/contained/FirestoreLibrary.ts';
const primaryFile = 'src/primary/FirestoreLibrary.ts';

// Backup original files
const containedOriginal = readFileSync(containedFile, 'utf-8');
const primaryOriginal = readFileSync(primaryFile, 'utf-8');

try {
  console.log('Temporarily modifying interfaces for type generation...');

  // Modify contained interface
  const containedModified = containedOriginal
    .replace(
      /> extends AbstractFirestoreLibrary<V, S, L1, L2, L3, L4, L5> \{\s*operations: Contained\.Operations<V, S, L1, L2, L3, L4, L5>;\s*\}/,
      `> {\n  operations: any;\n  coordinate: any;\n  options: any;\n  firestore: any;\n  registry: any;\n}`
    );

  // Modify primary interface
  const primaryModified = primaryOriginal
    .replace(
      /> extends AbstractFirestoreLibrary<V, S> \{\s*operations: Primary\.Operations<V, S>;\s*\}/,
      `> {\n  operations: any;\n  coordinate: any;\n  options: any;\n  firestore: any;\n  registry: any;\n}`
    );

  writeFileSync(containedFile, containedModified);
  writeFileSync(primaryFile, primaryModified);

  console.log('Generating TypeScript declarations...');

  // Create temporary tsconfig for build
  const tempTsConfig = {
    extends: './tsconfig.json',
    compilerOptions: {
      emitDeclarationOnly: true,
      skipLibCheck: true,
      noImplicitAny: false,
      strict: false,
      noImplicitReturns: false,
      noImplicitThis: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
      exactOptionalPropertyTypes: false,
      noImplicitOverride: false,
      noPropertyAccessFromIndexSignature: false,
      noUncheckedIndexedAccess: false,
      noEmitOnError: false,
      outDir: './dist'
    },
    include: ['./src/**/*.ts'],
    exclude: ['./tests/**/*.ts', 'node_modules']
  }

  writeFileSync('./tsconfig.build.json', JSON.stringify(tempTsConfig, null, 2))

  try {
    execSync('tsc --project tsconfig.build.json', { stdio: 'inherit' })
  } finally {
    // Clean up temp config
    execSync('rm -f tsconfig.build.json', { stdio: 'ignore' })
  }

  console.log('Type generation complete!');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} finally {
  console.log('Restoring original interfaces...');
  writeFileSync(containedFile, containedOriginal);
  writeFileSync(primaryFile, primaryOriginal);
}

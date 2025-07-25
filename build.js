import buildLibrary from '@fjell/eslint-config/esbuild/library';

// Build JS only - custom type generation handled by scripts/build-with-types.js
buildLibrary({
  generateTypes: false // Disable auto type generation
});

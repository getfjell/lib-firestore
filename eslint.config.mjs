import libraryConfig from "@fjell/eslint-config/library";

export default [
  ...libraryConfig,
  {
    // Relax undefined rule for tests
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "no-undefined": "off",
    },
  },
];

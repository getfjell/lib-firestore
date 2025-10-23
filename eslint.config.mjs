import libraryConfig from "@fjell/common-config/library";

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
